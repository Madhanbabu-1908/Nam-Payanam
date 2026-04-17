import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, calculateAllDistances, hotelAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Spinner, SkeletonCard, formatCurrency, BottomSheet } from '../components/ui/index.jsx';
import LocationInput from '../components/ui/LocationInput.jsx';

const STEPS = ['Route & Info', 'Travel Details', 'AI Plans', 'Review & Create'];

function getSessionId() {
  let id = localStorage.getItem('np_session_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('np_session_id', id); }
  return id;
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { setSession } = useTripStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [creating, setCreating] = useState(false);

  const [startLoc, setStartLoc] = useState(null);
  const [endLoc, setEndLoc] = useState(null);
  const [stopInputLoc, setStopInputLoc] = useState(null);
  const [routeDistances, setRouteDistances] = useState([]);
  const [calcingDist, setCalcingDist] = useState(false);

  // Step 0 — basic info
  const [form, setForm] = useState({
    organizerName: '', title: '',
    stops: [], startDate: '', endDate: '', groupSize: 4,
  });

  // Step 1 — travel details (the new planning questions)
  const [travel, setTravel] = useState({
    transportType: 'own_vehicle', // 'own_vehicle' | 'public'
    vehicleType: 'car',           // 'car' | 'bike'
    budget: 'moderate',
    budgetAmount: '',             // specific ₹ amount
    dayAssignments: {},           // { '1': 'Chennai, Kanchipuram', '2': 'Vellore' }
    stayPreferences: [],          // [{ location, day, preference }]
    stayInput: { location: '', day: '1', preference: 'budget' },
    preferences: '',
    planMode: 'ai',
  });

  function setT(k, v) { setTravel(p => ({ ...p, [k]: v })); }

  function addStayPref() {
    if (!travel.stayInput.location.trim()) return;
    setTravel(p => ({ ...p, stayPreferences: [...p.stayPreferences, { ...p.stayInput }], stayInput: { location: '', day: String(parseInt(p.stayInput.day)+1), preference: p.stayInput.preference } }));
  }
  function removeStay(i) { setTravel(p => ({ ...p, stayPreferences: p.stayPreferences.filter((_,idx)=>idx!==i) })); }

  function updateF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  const recalc = useCallback(async (start, end, stops) => {
    if (!start || !end) return;
    setCalcingDist(true);
    const dists = await calculateAllDistances([start, ...stops, end]);
    setRouteDistances(dists);
    setCalcingDist(false);
  }, []);

  function onStart(loc) { setStartLoc(loc); recalc(loc, endLoc, form.stops); }
  function onEnd(loc) { setEndLoc(loc); recalc(startLoc, loc, form.stops); }
  function addStop(loc) {
    if (!loc) return toast.error('Select from dropdown');
    const ns = [...form.stops, loc];
    updateF('stops', ns);
    recalc(startLoc, endLoc, ns);
    setStopInputLoc(null);
  }
  function removeStop(i) {
    const ns = form.stops.filter((_,idx)=>idx!==i);
    updateF('stops', ns);
    recalc(startLoc, endLoc, ns);
  }

  const totalKm = routeDistances.reduce((s,d)=>s+(d.distance_km||0), 0);
  const totalMin = routeDistances.reduce((s,d)=>s+(d.duration_minutes||0), 0);
  const tripDays = form.startDate && form.endDate ? Math.max(1, Math.round((new Date(form.endDate)-new Date(form.startDate))/86400000)) : 1;

  function canProceedStep0() {
    return form.organizerName.trim() && startLoc && endLoc && form.startDate && form.endDate;
  }

  async function generatePlans() {
    setLoading(true);
    setStep(2);
    try {
      const res = await tripAPI.generatePlans({
        startLocation: startLoc.short_name, endLocation: endLoc.short_name,
        stops: form.stops.map(s=>s.short_name||s.name),
        startDate: form.startDate, endDate: form.endDate,
        groupSize: form.groupSize,
        budget: travel.budget, budgetAmount: travel.budgetAmount || null,
        preferences: `${travel.preferences}. Transport: ${travel.transportType==='public'?'public transport':travel.vehicleType==='bike'?'two-wheeler':'car'}`,
        routeDistances,
        transportType: travel.transportType, vehicleType: travel.vehicleType,
        stayPreferences: travel.stayPreferences,
        dayAssignments: travel.dayAssignments,
        planningAnswers: travel,
      });
      setPlans(res.plans || []);
    } catch (err) {
      toast.error('AI plan failed: '+err.message);
      setStep(1);
    } finally { setLoading(false); }
  }

  async function createTrip() {
    if (!selectedPlan) return toast.error('Select a plan');
    setCreating(true);
    try {
      const title = form.title.trim() || `${startLoc.short_name} → ${endLoc.short_name}`;
      const sessionId = getSessionId();
      const res = await tripAPI.create({
        ...form, title,
        startLocation: startLoc.short_name, endLocation: endLoc.short_name,
        stops: form.stops.map(s=>s.short_name||s.name),
        selectedPlan, planIndex: plans.findIndex(p=>p.planName===selectedPlan.planName),
        sessionId, routeDistances,
        transportType: travel.transportType, vehicleType: travel.vehicleType,
        budgetAmount: travel.budgetAmount || null,
        stayPreferences: travel.stayPreferences,
        dayAssignments: travel.dayAssignments,
      });
      setSession({ memberId: res.organizerId, memberRowId: res.memberId, nickname: form.organizerName, tripId: res.tripId, tripCode: res.tripCode, isOrganizer: true, sessionId });
      toast.success('🎉 Trip created!');
      navigate(`/trip/${res.tripCode}`);
    } catch (err) { toast.error('Failed: '+err.message); }
    finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => step === 0 ? navigate('/') : setStep(s=>s-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <h1 className="font-display font-extrabold text-slate-900 text-lg">Plan Your Trip</h1>
            <p className="text-xs text-slate-400">{STEPS[step]} · Step {step+1}/{STEPS.length}</p>
          </div>
        </div>
        <div className="flex px-4 pb-3 gap-1.5">
          {STEPS.map((_,i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i<=step?'bg-[#FF6B35]':'bg-slate-100'}`}/>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">

        {/* ── STEP 0: Route & Basic Info ── */}
        {step === 0 && (
          <div className="p-4 space-y-4 animate-fade-in">
            {/* Organiser */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">👤</span>Your Info</h2>
              <div className="space-y-3">
                <div><label className="label">Your Name *</label><input className="input" placeholder="e.g. Arun Kumar" value={form.organizerName} onChange={e=>updateF('organizerName',e.target.value)}/></div>
                <div><label className="label">Trip Title (optional)</label><input className="input" placeholder="e.g. Ooty Weekend (auto-filled if blank)" value={form.title} onChange={e=>updateF('title',e.target.value)}/></div>
              </div>
            </div>

            {/* Route */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">🗺️</span>Route</h2>
              <div className="space-y-3">
                <LocationInput label="Starting Point *" placeholder="e.g. Chennai" icon="🏠" value={startLoc} onSelect={onStart}/>
                <div>
                  <label className="label">Middle Stops (optional)</label>
                  <div className="flex gap-2">
                    <div className="flex-1"><LocationInput placeholder="Add a stop..." icon="📍" value={stopInputLoc} onSelect={setStopInputLoc}/></div>
                    <button onClick={()=>addStop(stopInputLoc)} className="w-12 h-[48px] bg-[#FF6B35] text-white rounded-xl font-bold text-xl flex-shrink-0 flex items-center justify-center active:scale-95">+</button>
                  </div>
                  {form.stops.length>0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.stops.map((s,i)=>(
                        <span key={i} className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                          📍{s.short_name||s.name}<button onClick={()=>removeStop(i)} className="text-orange-400 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <LocationInput label="Destination *" placeholder="e.g. Coimbatore" icon="🏁" value={endLoc} onSelect={onEnd}/>
              </div>

              {/* Distance panel */}
              {(calcingDist || routeDistances.length>0) && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  {calcingDist ? (
                    <div className="flex items-center gap-2 text-blue-600 text-sm"><Spinner size="sm" color="ocean"/>Calculating real distances...</div>
                  ) : (
                    <>
                      <div className="font-bold text-blue-700 text-xs mb-2">📏 Real Route (OSRM)</div>
                      {routeDistances.map((d,i)=>(
                        <div key={i} className="flex items-center gap-2 text-xs mb-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"/>
                          <span className="text-slate-600 flex-1 truncate">{d.from} → {d.to}</span>
                          <span className="font-bold text-blue-700">{d.distance_km}km</span>
                          <span className="text-slate-400">~{Math.floor(d.duration_minutes/60)}h{d.duration_minutes%60}m</span>
                        </div>
                      ))}
                      {routeDistances.length>1 && <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-xs font-extrabold text-blue-800"><span>Total</span><span>{totalKm.toFixed(1)}km · ~{Math.floor(totalMin/60)}h{totalMin%60}m</span></div>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dates & Group */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">📅</span>Schedule</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className="label">Start Date *</label><input type="date" className="input" value={form.startDate} onChange={e=>updateF('startDate',e.target.value)} min={new Date().toISOString().split('T')[0]}/></div>
                <div><label className="label">End Date *</label><input type="date" className="input" value={form.endDate} onChange={e=>updateF('endDate',e.target.value)} min={form.startDate||new Date().toISOString().split('T')[0]}/></div>
              </div>
              <label className="label">Group Size</label>
              <div className="flex items-center gap-4">
                <button onClick={()=>updateF('groupSize',Math.max(1,form.groupSize-1))} className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 text-2xl font-bold active:bg-slate-200">−</button>
                <div className="flex-1 text-center"><span className="font-display font-extrabold text-3xl text-[#FF6B35]">{form.groupSize}</span><span className="text-slate-400 text-sm ml-1">people</span></div>
                <button onClick={()=>updateF('groupSize',Math.min(25,form.groupSize+1))} className="w-11 h-11 rounded-xl bg-orange-100 text-[#FF6B35] text-2xl font-bold active:bg-orange-200">+</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Travel Details (Planning Questions) ── */}
        {step === 1 && (
          <div className="p-4 space-y-4 animate-fade-in">
            <div className="bg-gradient-to-r from-[#FF6B35]/10 to-orange-50 border border-orange-100 rounded-2xl p-4">
              <h2 className="font-display font-extrabold text-slate-900 text-lg">🎯 Help AI Plan Better</h2>
              <p className="text-sm text-slate-500 mt-1">Answer a few questions for a smarter, real-cost plan</p>
            </div>

            {/* Transport */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="text-lg">🚗</span>How are you travelling?</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[['own_vehicle','🚘','Own Vehicle','Car or bike'],['public','🚌','Public Transport','Bus or train']].map(([v,icon,title,desc])=>(
                  <button key={v} onClick={()=>setT('transportType',v)} className={`p-4 rounded-xl border-2 text-left transition-all ${travel.transportType===v?'border-[#FF6B35] bg-orange-50':'border-slate-200'}`}>
                    <div className="text-2xl mb-1.5">{icon}</div>
                    <div className={`font-bold text-sm ${travel.transportType===v?'text-[#FF6B35]':'text-slate-700'}`}>{title}</div>
                    <div className="text-xs text-slate-400">{desc}</div>
                  </button>
                ))}
              </div>
              {travel.transportType==='own_vehicle' && (
                <div className="animate-slide-down">
                  <label className="label">Vehicle Type</label>
                  <div className="flex gap-3">
                    {[['car','🚗','Car/SUV'],['bike','🏍️','Two-Wheeler']].map(([v,icon,label])=>(
                      <button key={v} onClick={()=>setT('vehicleType',v)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2 ${travel.vehicleType===v?'border-[#FF6B35] bg-orange-50 text-[#FF6B35]':'border-slate-200 text-slate-600'}`}>
                        <span className="text-lg">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                  {totalKm>0 && (
                    <div className="mt-2 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600">
                      ⛽ Estimated fuel: <strong>₹{Math.round(totalKm/(travel.vehicleType==='bike'?45:12)*(travel.vehicleType==='bike'?105:100))}</strong> total · ₹{Math.round(totalKm/(travel.vehicleType==='bike'?45:12)*(travel.vehicleType==='bike'?105:100)/form.groupSize)}/person
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="text-lg">💰</span>Budget Expectation</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[['budget','💰','Budget','₹800-1500/day'],['moderate','⚖️','Moderate','₹1500-3000/day'],['premium','💎','Premium','₹3000+/day']].map(([v,icon,label,range])=>(
                  <button key={v} onClick={()=>setT('budget',v)} className={`py-3 px-2 rounded-xl text-center transition-all flex flex-col items-center gap-1 border-2 ${travel.budget===v?'bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white border-transparent shadow-md':'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs font-extrabold">{label}</span>
                    <span className={`text-[10px] ${travel.budget===v?'text-white/70':'text-slate-400'}`}>{range}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="label">My total budget per person (₹) — optional</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input type="number" className="input pl-8" placeholder="e.g. 5000" value={travel.budgetAmount} onChange={e=>setT('budgetAmount',e.target.value)}/>
                </div>
                {travel.budgetAmount && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">AI will plan within ₹{Number(travel.budgetAmount).toLocaleString('en-IN')}/person for {tripDays} days</p>
                )}
              </div>
            </div>

            {/* Day assignments */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="font-display font-bold text-slate-800 mb-1 flex items-center gap-2"><span className="text-lg">📅</span>Day-wise Plan (optional)</h3>
              <p className="text-xs text-slate-500 mb-3">Tell AI which places to cover on which day</p>
              <div className="space-y-2">
                {Array.from({length: tripDays}, (_,i)=>i+1).map(day=>(
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-14 flex-shrink-0 bg-[#FF6B35] text-white text-xs font-extrabold px-2 py-2 rounded-lg text-center">Day {day}</span>
                    <input className="input flex-1" placeholder={`Places for day ${day}...`}
                      value={travel.dayAssignments[day]||''}
                      onChange={e=>setT('dayAssignments',{...travel.dayAssignments,[day]:e.target.value})}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Stay preferences */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="font-display font-bold text-slate-800 mb-1 flex items-center gap-2"><span className="text-lg">🏨</span>Where will you stay?</h3>
              <p className="text-xs text-slate-500 mb-3">AI will suggest real hotels at these stops</p>
              <div className="space-y-2 mb-3">
                {travel.stayPreferences.map((s,i)=>(
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-purple-50 border border-purple-100 rounded-xl">
                    <span className="text-sm">🏨</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-purple-800">{s.location}</span>
                      <span className="text-xs text-purple-600 ml-1">· Day {s.day} · {s.preference}</span>
                    </div>
                    <button onClick={()=>removeStay(i)} className="text-purple-400 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input className="input col-span-1" placeholder="Location" value={travel.stayInput.location} onChange={e=>setT('stayInput',{...travel.stayInput,location:e.target.value})}/>
                <select className="input" value={travel.stayInput.day} onChange={e=>setT('stayInput',{...travel.stayInput,day:e.target.value})}>
                  {Array.from({length:tripDays},(_,i)=>i+1).map(d=><option key={d} value={d}>Day {d}</option>)}
                </select>
                <select className="input" value={travel.stayInput.preference} onChange={e=>setT('stayInput',{...travel.stayInput,preference:e.target.value})}>
                  <option value="budget">Budget</option><option value="moderate">Mid-range</option><option value="premium">Premium</option>
                </select>
              </div>
              <button onClick={addStayPref} className="w-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-sm py-2.5 rounded-xl active:scale-95">+ Add Stay Location</button>
              <p className="text-xs text-slate-400 mt-2">Leave empty if you'll decide en-route — AI will still suggest options</p>
            </div>

            {/* Planning mode + notes */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="text-lg">🧭</span>Planning Mode</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[['ai','🤖','AI Suggestions','3 smart plans for me'],['manual','✏️','My Own Plan','I have it in mind']].map(([v,icon,title,desc])=>(
                  <button key={v} onClick={()=>setT('planMode',v)} className={`p-4 rounded-xl border-2 text-left transition-all ${travel.planMode===v?'border-[#FF6B35] bg-orange-50':'border-slate-200'}`}>
                    <div className="text-2xl mb-1.5">{icon}</div>
                    <div className={`font-bold text-sm ${travel.planMode===v?'text-[#FF6B35]':'text-slate-700'}`}>{title}</div>
                    <div className="text-xs text-slate-400">{desc}</div>
                  </button>
                ))}
              </div>
              <label className="label">{travel.planMode==='manual'?'Describe your plan':'Additional preferences'}</label>
              <textarea className="input resize-none" rows={3}
                placeholder={travel.planMode==='manual'
                  ? 'e.g. Day 1: Chennai → Kanchipuram temples. Day 2: Vellore Fort...'
                  : 'e.g. prefer scenic roads, need vegetarian food, avoid toll roads...'}
                value={travel.preferences} onChange={e=>setT('preferences',e.target.value)}/>
            </div>
          </div>
        )}

        {/* ── STEP 2: AI Plans ── */}
        {step === 2 && (
          <div className="p-4 pb-10 animate-fade-in">
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">🤖</span><span className="font-bold text-blue-800 text-sm">AI Cost Research</span></div>
              <p className="text-xs text-blue-600">
                Researching real prices for {[startLoc?.short_name,...form.stops.map(s=>s.short_name||s.name),endLoc?.short_name].filter(Boolean).join(' → ')}
                {totalKm>0&&` · ${totalKm.toFixed(0)}km`}
                {travel.budgetAmount&&` · ₹${Number(travel.budgetAmount).toLocaleString('en-IN')} budget`}
              </p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i=><SkeletonCard key={i}/>)}
                <div className="flex flex-col items-center py-6 gap-3">
                  <Spinner size="lg"/>
                  <p className="text-sm text-slate-500 font-semibold">Researching real hotel prices & costs...</p>
                  <p className="text-xs text-slate-400">This may take 15-20 seconds</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-slate-800 text-lg">Choose Your Plan</h2>
                {plans.map((plan,i)=><PlanCard key={i} plan={plan} selected={selectedPlan?.planName===plan.planName} onSelect={()=>setSelectedPlan(plan)} groupSize={form.groupSize}/>)}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Review & Create ── */}
        {step === 3 && selectedPlan && (
          <ReviewStep
            plan={selectedPlan} form={form} travel={travel}
            startLoc={startLoc} endLoc={endLoc}
            routeDistances={routeDistances} totalKm={totalKm} totalMin={totalMin}
          />
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {step===0 && (
          <button onClick={()=>{if(!canProceedStep0())return toast.error('Fill all required fields');setStep(1);}} className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2">
            Next: Travel Details →
          </button>
        )}
        {step===1 && (
          <button onClick={generatePlans} className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2">
            🤖 Generate Smart Plans
          </button>
        )}
        {step===2 && !loading && (
          <button onClick={()=>{if(!selectedPlan)return toast.error('Select a plan');setStep(3);}} disabled={!selectedPlan} className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
            {selectedPlan?`Review: ${selectedPlan.planName} →`:'Select a plan above'}
          </button>
        )}
        {step===3 && (
          <button onClick={createTrip} disabled={creating} className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2">
            {creating?<Spinner size="sm" color="white"/>:'🚀'}
            {creating?'Creating...':'Create Trip & Get Code'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect, groupSize }) {
  const [exp, setExp] = useState(false);
  const [showHotels, setShowHotels] = useState(false);
  const COLORS = ['#FF6B35','#0066CC','#10b981'];
  const idx = ['Budget','Comfort','Premium'].findIndex(n=>plan.planName?.includes(n));
  const color = COLORS[Math.max(0,idx)]||'#FF6B35';

  return (
    <div onClick={onSelect} className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm ${selected?'ring-2 ring-[#FF6B35] shadow-[0_4px_20px_rgba(255,107,53,0.2)]':'border border-slate-100'}`}>
      <div className="h-1.5" style={{background:color}}/>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {selected&&<span className="w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-[10px]">✓</span>}
              <h3 className="font-display font-extrabold text-slate-900 text-base">{plan.planName}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{plan.summary}</p>
          </div>
          <div className="flex-shrink-0 bg-slate-50 rounded-xl p-2 text-right">
            <div className="font-display font-extrabold text-xl" style={{color}}>{formatCurrency(plan.estimatedCost?.perPerson)}</div>
            <div className="text-[11px] text-slate-400 font-semibold">per person</div>
            {groupSize>1&&<div className="text-[10px] text-slate-300">{formatCurrency(plan.estimatedCost?.total)} total</div>}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-2">
          {plan.totalDistance&&<span className="badge badge-slate">📏 {plan.totalDistance}</span>}
          {plan.estimatedDriveTime&&<span className="badge badge-blue">🚗 {plan.estimatedDriveTime}</span>}
          {plan.bestFor&&<span className="badge badge-green">🎯 {plan.bestFor}</span>}
        </div>

        {/* Cost justification */}
        {plan.estimatedCost?.priceJustification && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-2">
            <p className="text-xs text-emerald-700 font-semibold">💡 {plan.estimatedCost.priceJustification}</p>
          </div>
        )}

        <button onClick={e=>{e.stopPropagation();setExp(!exp);}} className="w-full text-xs font-bold text-slate-400 py-1 flex items-center justify-center gap-1">
          {exp?'▲ Less detail':'▼ Cost breakdown & hotels'}
        </button>

        {exp && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {/* Breakdown */}
            {plan.estimatedCost?.breakdown && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="font-bold text-xs text-slate-500 mb-2">COST BREAKDOWN (per person)</div>
                {Object.entries(plan.estimatedCost.breakdown).map(([k,v])=>(
                  <div key={k} className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(v)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Hotels */}
            {plan.hotels?.length>0 && (
              <div>
                <div className="font-bold text-xs text-slate-500 mb-1.5">🏨 HOTEL OPTIONS</div>
                {plan.hotels.map((h,i)=>(
                  <div key={i} className="mb-2">
                    <div className="text-xs font-bold text-slate-700 mb-1">📍 {h.location} (Day {h.day})</div>
                    <div className="space-y-1">
                      {h.options?.map((o,j)=>(
                        <div key={j} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${o.type==='budget'?'bg-slate-50':o.type==='premium'?'bg-purple-50':'bg-blue-50'}`}>
                          <div>
                            <span className="font-bold text-slate-800">{o.name}</span>
                            {o.notes&&<span className="text-slate-400 ml-1">· {o.notes}</span>}
                          </div>
                          <span className="font-extrabold text-[#FF6B35]">{formatCurrency(o.pricePerNight)}/night</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Review Step ───────────────────────────────────────────────────────────────
function ReviewStep({ plan, form, travel, startLoc, endLoc, routeDistances, totalKm, totalMin }) {
  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-2xl p-5 text-white">
        <div className="text-white/70 text-xs font-bold mb-1">SELECTED PLAN</div>
        <h2 className="font-display font-extrabold text-xl mb-1">{plan.planName}</h2>
        <p className="text-white/80 text-sm">{plan.summary}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h3 className="font-display font-bold text-slate-800 mb-3">📋 Trip Summary</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            {l:'From',v:startLoc?.short_name},{l:'To',v:endLoc?.short_name},
            {l:'Dates',v:`${form.startDate} → ${form.endDate}`},{l:'Group',v:`${form.groupSize} people`},
            {l:'Distance',v:plan.totalDistance||`~${totalKm.toFixed(0)}km`},{l:'Drive Time',v:plan.estimatedDriveTime||`~${Math.floor(totalMin/60)}h`},
            {l:'Transport',v:travel.transportType==='public'?'🚌 Public':`${travel.vehicleType==='bike'?'🏍️':'🚗'} Own`},
            {l:'Per Person',v:formatCurrency(plan.estimatedCost?.perPerson)},
          ].map(({l,v})=>(
            <div key={l} className="bg-slate-50 rounded-xl p-3">
              <div className="text-[11px] text-slate-400 font-bold uppercase">{l}</div>
              <div className="text-sm font-bold text-slate-800 truncate mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        {travel.budgetAmount&&<div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold">✅ Plan fits within your ₹{Number(travel.budgetAmount).toLocaleString('en-IN')}/person budget</div>}
      </div>

      {plan.days?.length>0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="font-display font-bold text-slate-800 mb-3">📅 Day-by-Day</h3>
          <div className="space-y-2">
            {plan.days.map((day,i)=>(
              <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-14 flex-shrink-0 bg-[#FF6B35] text-white text-xs font-extrabold px-2 py-2 rounded-lg text-center">Day {day.dayNumber}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800">{day.title}</div>
                  {day.route&&<div className="text-xs text-blue-600 font-semibold mt-0.5">🛣️ {day.route}</div>}
                  <div className="text-xs text-slate-400 mt-0.5">{day.stops?.length} stops · {formatCurrency(day.dailyBudget)}/person</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.hotels?.length>0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="font-display font-bold text-slate-800 mb-3">🏨 Planned Stays</h3>
          {plan.hotels.map((h,i)=>(
            <div key={i} className="mb-3">
              <div className="text-xs font-extrabold text-slate-600 mb-1.5">📍 {h.location} · Day {h.day}</div>
              {h.options?.slice(0,2).map((o,j)=>(
                <div key={j} className="flex justify-between items-center px-3 py-2 bg-purple-50 rounded-xl mb-1">
                  <span className="text-xs font-bold text-purple-800">{o.name}</span>
                  <span className="text-xs font-extrabold text-[#FF6B35]">{formatCurrency(o.pricePerNight)}/night</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {plan.tips?.length>0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-display font-bold text-amber-800 mb-2">💡 Pro Tips</h3>
          {plan.tips.map((t,i)=><p key={i} className="text-sm text-amber-700 flex gap-2 mb-1"><span>→</span>{t}</p>)}
        </div>
      )}
    </div>
  );
}
