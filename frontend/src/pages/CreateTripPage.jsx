import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI } from '../utils/api';
import { getSessionId } from '../utils/session';
import toast from 'react-hot-toast';
import LocationSearch from '../components/location/LocationSearch.jsx';
import { Spinner, SkeletonCard, formatCurrency, PageHeader } from '../components/ui/index.jsx';

const STEPS = ['Route','Preferences','Plans','Confirm'];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { setSession } = useTripStore();
  const [step, setStep] = useState(0);
  const [planMode, setPlanMode] = useState('ai'); // 'ai' | 'manual'
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [calcRoute, setCalcRoute] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiAnswers, setAiAnswers] = useState({});
  const [stopInput, setStopInput] = useState('');
  const [manualDays, setManualDays] = useState([{ dayNumber:1, title:'', stops:[], notes:'', dailyBudgetPerPerson:0, date:'' }]);

  const [form, setForm] = useState({
    organizerName:'', title:'', groupSize:4, budget:'moderate',
    startDate:'', endDate:'', preferences:'',
    startLocation:null, endLocation:null, stops:[],
    mileageKmpl:15, petrolPrice:103,
  });

  function upd(k,v) { setForm(p=>({...p,[k]:v})); }

  function addStop(loc) {
    if (!loc) return;
    setForm(p=>({...p, stops:[...p.stops, loc]}));
    setStopInput('');
  }
  function removeStop(i) { setForm(p=>({...p, stops:p.stops.filter((_,x)=>x!==i)})); }

  // Calculate OSRM route
  async function handleCalcRoute() {
    if (!form.startLocation || !form.endLocation) return toast.error('Set start and end locations first');
    setCalcRoute(true);
    try {
      const waypoints = [
        { name: form.startLocation.label, lat: form.startLocation.lat, lng: form.startLocation.lng },
        ...form.stops.map(s => ({ name: s.label, lat: s.lat, lng: s.lng })),
        { name: form.endLocation.label, lat: form.endLocation.lat, lng: form.endLocation.lng },
      ];
      const res = await tripAPI.calculateRoute(waypoints);
      setRouteData(res.routeData);
      toast.success(`Route: ${res.routeData.totalDistanceKm}km · ${res.routeData.totalDurationText}`);
    } catch (err) {
      toast.error('Route calculation failed: ' + err.message);
    } finally { setCalcRoute(false); }
  }

  async function goToPreferences() {
    if (!form.organizerName || !form.startLocation || !form.endLocation || !form.startDate || !form.endDate || !form.title)
      return toast.error('Please fill all required fields');
    if (new Date(form.endDate) < new Date(form.startDate)) return toast.error('End date must be after start date');
    if (planMode === 'manual') { setStep(2); return; }
    setLoading(true);
    try {
      const days = Math.max(1, Math.round((new Date(form.endDate)-new Date(form.startDate))/86400000));
      const res = await tripAPI.getAIQuestions({ startLocation:form.startLocation.label, endLocation:form.endLocation.label, groupSize:form.groupSize, days });
      setAiQuestions(res.questions || []);
      setStep(1);
    } catch {
      setAiQuestions([]);
      setStep(1);
    } finally { setLoading(false); }
  }

  async function generatePlans() {
    setLoading(true);
    setStep(2);
    try {
      const waypoints = [
        { name:form.startLocation.label, lat:form.startLocation.lat, lng:form.startLocation.lng },
        ...form.stops.map(s=>({ name:s.label, lat:s.lat, lng:s.lng })),
        { name:form.endLocation.label, lat:form.endLocation.lat, lng:form.endLocation.lng },
      ];
      const res = await tripAPI.generatePlans({
        startLocation: form.startLocation.label, endLocation: form.endLocation.label,
        stops: form.stops.map(s=>s.label), startDate:form.startDate, endDate:form.endDate,
        groupSize:form.groupSize, budget:form.budget, preferences:form.preferences,
        travelMode:aiAnswers.travel_mode, accommodation:aiAnswers.accommodation,
        foodPref:aiAnswers.food_pref, departureTime:aiAnswers.departure_time,
        waypoints,
      });
      setPlans(res.plans||[]);
      if (res.routeData) setRouteData(res.routeData);
    } catch (err) {
      toast.error(err.message);
      setStep(1);
    } finally { setLoading(false); }
  }

  async function createTrip() {
    setCreating(true);
    try {
      const sid = getSessionId();
      const planIdx = plans.findIndex(p=>p.planName===selectedPlan?.planName);
      const fuelData = routeData ? {
        distanceKm: routeData.totalDistanceKm,
        mileageKmpl: form.mileageKmpl,
        litres: routeData.totalDistanceKm / form.mileageKmpl,
        cost: Math.round((routeData.totalDistanceKm / form.mileageKmpl) * form.petrolPrice),
        perPerson: Math.round(((routeData.totalDistanceKm / form.mileageKmpl) * form.petrolPrice) / form.groupSize),
      } : null;

      const res = await tripAPI.create({
        title:form.title, organizerName:form.organizerName,
        startLocation:form.startLocation.label, startLat:form.startLocation.lat, startLng:form.startLocation.lng,
        endLocation:form.endLocation.label, endLat:form.endLocation.lat, endLng:form.endLocation.lng,
        stops:form.stops, startDate:form.startDate, endDate:form.endDate, groupSize:form.groupSize,
        selectedPlan: planMode==='ai' ? selectedPlan : null,
        planIndex: planIdx>=0 ? planIdx : 0,
        planMode, manualDays: planMode==='manual' ? manualDays : null,
        routeData, sessionId:sid, fuelData, preferences:aiAnswers,
      });
      setSession({ memberId:res.organizerId, memberRowId:res.memberId, nickname:form.organizerName, tripId:res.tripId, tripCode:res.tripCode, isOrganizer:true });
      toast.success('🎉 Trip created!');
      navigate(`/trip/${res.tripCode}`);
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  }

  // Manual day helpers
  function addManualDay() {
    setManualDays(p=>[...p,{ dayNumber:p.length+1, title:'', stops:[], notes:'', dailyBudgetPerPerson:0, date:'' }]);
  }
  function updDay(i,k,v) { setManualDays(p=>p.map((d,x)=>x===i?{...d,[k]:v}:d)); }
  function addManualStop(dayIdx, stopName) {
    if (!stopName.trim()) return;
    setManualDays(p=>p.map((d,x)=>x===dayIdx ? {...d, stops:[...d.stops,{ name:stopName, type:'stop', duration:'1 hour', description:'', estimatedCost:0 }]} : d));
  }
  function removeManualStop(dayIdx, sIdx) {
    setManualDays(p=>p.map((d,x)=>x===dayIdx ? {...d, stops:d.stops.filter((_,si)=>si!==sIdx)} : d));
  }

  const daysCount = form.startDate && form.endDate ? Math.max(1, Math.round((new Date(form.endDate)-new Date(form.startDate))/86400000)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20 shadow-sm">
        <PageHeader title="Plan Trip" subtitle="Nam Payanam"
          back={() => step===0 ? navigate('/') : setStep(s=>s-1)}
          action={
            <div className="flex items-center gap-2">
              <button onClick={() => setPlanMode(planMode==='ai'?'manual':'ai')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${planMode==='manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {planMode==='ai' ? '🤖 AI' : '✏️ Manual'}
              </button>
            </div>
          }
        />
        {/* Step pills */}
        <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto">
          {(planMode==='ai' ? STEPS : ['Route','—','Manual Plan','Confirm']).map((s,i)=>(
            <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all
                ${i<step?'bg-emerald-100 text-emerald-700':i===step?'bg-indigo-600 text-white':'bg-slate-100 text-slate-400'}`}>
                {i<step?'✓':i+1} {s}
              </div>
              {i<STEPS.length-1 && <div className={`w-4 h-0.5 rounded-full ${i<step?'bg-indigo-400':'bg-slate-200'}`}/>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── STEP 0: Route Details ── */}
        {step===0 && (
          <div className="p-4 space-y-4 animate-fade-in">
            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800 flex items-center gap-2">👤 About You</h2>
              <div><label className="label">Your Name (Organizer) *</label>
                <input className="input" placeholder="e.g. Arun Kumar" value={form.organizerName} onChange={e=>upd('organizerName',e.target.value)}/></div>
              <div><label className="label">Trip Title *</label>
                <input className="input" placeholder="e.g. Ooty Weekend Escape 🏔️" value={form.title} onChange={e=>upd('title',e.target.value)}/></div>
            </div>

            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800 flex items-center gap-2">🛣️ Route</h2>
              <LocationSearch label="Starting Point *" value={form.startLocation} placeholder="Search start city..." icon="🟢"
                onChange={v=>upd('startLocation',v)}/>
              {/* Intermediate stops */}
              <div>
                <label className="label">Middle Stops (Optional)</label>
                <div className="space-y-2">
                  {form.stops.map((s,i)=>(
                    <div key={i} className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                      <span className="text-indigo-500">📍</span>
                      <span className="flex-1 text-sm font-semibold text-indigo-700">{s.label}</span>
                      <button onClick={()=>removeStop(i)} className="text-slate-400 hover:text-red-500 text-lg">×</button>
                    </div>
                  ))}
                  <StopAdder onAdd={addStop}/>
                </div>
              </div>
              <LocationSearch label="Destination (End) *" value={form.endLocation} placeholder="Search destination city..." icon="🔴"
                onChange={v=>upd('endLocation',v)}/>

              {/* Calculate route button */}
              {form.startLocation && form.endLocation && (
                <button onClick={handleCalcRoute} disabled={calcRoute}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold py-3 rounded-xl text-sm active:bg-indigo-100 transition-colors">
                  {calcRoute ? <Spinner size="sm" color="indigo"/> : '🛣️'}
                  {calcRoute ? 'Calculating route...' : 'Calculate Real Distance & Time'}
                </button>
              )}

              {/* Route result */}
              {routeData && (aiAnswers.travel_mode==="car" || aiAnswers.travel_mode==="bike" || (!aiAnswers.travel_mode)) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2"><span className="text-emerald-600 font-bold text-sm">✅ Route Calculated (OSRM)</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center"><div className="font-display font-bold text-emerald-700">{routeData.totalDistanceKm} km</div><div className="text-[10px] text-slate-400">Total Distance</div></div>
                    <div className="bg-white rounded-lg p-2 text-center"><div className="font-display font-bold text-emerald-700">{routeData.totalDurationText}</div><div className="text-[10px] text-slate-400">Driving Time</div></div>
                  </div>
                  {routeData.segments?.map((seg,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs text-slate-600 mt-1.5 px-1">
                      <span>{seg.from} → {seg.to}</span>
                      <span className="font-semibold">{seg.distanceKm}km · {seg.durationText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800">📅 Schedule & Group</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Start Date *</label>
                  <input type="date" className="input" value={form.startDate} min={new Date().toISOString().split('T')[0]} onChange={e=>upd('startDate',e.target.value)}/></div>
                <div><label className="label">End Date *</label>
                  <input type="date" className="input" value={form.endDate} min={form.startDate||new Date().toISOString().split('T')[0]} onChange={e=>upd('endDate',e.target.value)}/></div>
              </div>
              {daysCount>0 && <div className="badge badge-indigo text-xs">{daysCount} day{daysCount>1?'s':''} trip</div>}
              <div>
                <label className="label">Group Size *</label>
                <div className="flex items-center gap-4">
                  <button onClick={()=>upd('groupSize',Math.max(1,form.groupSize-1))} className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 text-2xl font-bold active:bg-slate-200">−</button>
                  <span className="font-display font-black text-3xl text-indigo-700 w-10 text-center">{form.groupSize}</span>
                  <button onClick={()=>upd('groupSize',Math.min(20,form.groupSize+1))} className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 text-2xl font-bold active:bg-indigo-200">+</button>
                  <span className="text-xs text-slate-400">incl. you</span>
                </div>
              </div>
              <div>
                <label className="label">Budget Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['budget','💰 Budget'],['moderate','⚖️ Moderate'],['premium','💎 Premium']].map(([v,l])=>(
                    <button key={v} onClick={()=>upd('budget',v)} className={`py-3 rounded-xl text-xs font-bold transition-all ${form.budget===v?'bg-indigo-600 text-white shadow-indigo':'bg-slate-100 text-slate-600'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fuel calculator */}
            {routeData && (aiAnswers.travel_mode==="car" || aiAnswers.travel_mode==="bike" || (!aiAnswers.travel_mode)) && (
              <div className="card p-4 space-y-3">
                <h2 className="font-display font-bold text-slate-800">⛽ Fuel Estimator</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Mileage (km/l)</label>
                    <input type="number" className="input" value={form.mileageKmpl} onChange={e=>upd('mileageKmpl',parseFloat(e.target.value)||15)}/></div>
                  <div><label className="label">Petrol Price (₹/l)</label>
                    <input type="number" className="input" value={form.petrolPrice} onChange={e=>upd('petrolPrice',parseFloat(e.target.value)||100)}/></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="font-bold text-amber-700">{(routeData.totalDistanceKm/form.mileageKmpl).toFixed(1)}L</div><div className="text-[10px] text-slate-400">Fuel needed</div></div>
                    <div><div className="font-bold text-amber-700">{formatCurrency(Math.round((routeData.totalDistanceKm/form.mileageKmpl)*form.petrolPrice))}</div><div className="text-[10px] text-slate-400">Total fuel cost</div></div>
                    <div><div className="font-bold text-amber-700">{formatCurrency(Math.round(((routeData.totalDistanceKm/form.mileageKmpl)*form.petrolPrice)/form.groupSize))}</div><div className="text-[10px] text-slate-400">Per person</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual plan builder */}
            {planMode==='manual' && step===0 && (
              <ManualPlanBuilder days={manualDays} onAddDay={addManualDay} onUpdateDay={updDay} onAddStop={addManualStop} onRemoveStop={removeManualStop}/>
            )}
          </div>
        )}

        {/* ── STEP 1: AI Preferences ── */}
        {step===1 && planMode==='ai' && (
          <div className="p-4 space-y-4 animate-fade-in">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <p className="font-bold text-indigo-800 text-sm mb-1">🤖 Help AI plan better</p>
              <p className="text-xs text-indigo-600">Answer a few questions so the AI can create the most personalized plans for your group.</p>
            </div>
            {aiQuestions.map((q,i) => (
              <div key={q.id} className="card p-4">
                <p className="font-display font-bold text-slate-800 text-sm mb-3">{i+1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => setAiAnswers(p=>({...p,[q.id]:opt}))}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border transition-all
                        ${aiAnswers[q.id]===opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo' : 'bg-slate-50 text-slate-700 border-slate-200 active:bg-indigo-50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="card p-4">
              <label className="label">Any other preferences?</label>
              <textarea className="input resize-none" rows={2} placeholder="e.g. avoid toll roads, need veg food, senior citizens..." value={form.preferences} onChange={e=>upd('preferences',e.target.value)}/>
            </div>
          </div>
        )}

        {/* ── STEP 2: AI Plans ── */}
        {step===2 && (
          <div className="p-4 space-y-4 animate-fade-in">
            {loading ? (
              <>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
                  <Spinner size="md" color="indigo"/>
                  <div><p className="font-bold text-indigo-800 text-sm">Generating your plans...</p>
                    <p className="text-xs text-indigo-500">AI is analyzing {routeData?.totalDistanceKm||'~'}km route</p></div>
                </div>
                {[1,2,3].map(i=><SkeletonCard key={i}/>)}
              </>
            ) : (
              <>
                {routeData && (aiAnswers.travel_mode==="car" || aiAnswers.travel_mode==="bike" || (!aiAnswers.travel_mode)) && (
                  <div className="card-indigo p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2"><span className="text-lg">🛣️</span><span className="font-bold text-white">Verified Route</span></div>
                    <div className="flex gap-4">
                      <div><div className="font-display font-black text-saffron-400 text-2xl">{routeData.totalDistanceKm}km</div><div className="text-white/60 text-xs">Distance</div></div>
                      <div className="w-px bg-white/20"/><div><div className="font-display font-black text-saffron-400 text-2xl">{routeData.totalDurationText}</div><div className="text-white/60 text-xs">Drive time</div></div>
                    </div>
                  </div>
                )}
                <h2 className="font-display font-bold text-slate-900">Choose Your Plan</h2>
                {plans.map((plan,i)=>(
                  <PlanCard key={i} plan={plan} selected={selectedPlan?.planName===plan.planName} onSelect={()=>setSelectedPlan(plan)}/>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step===3 && (
          <div className="p-4 space-y-4 animate-fade-in pb-8">
            <div className="card-indigo p-5 rounded-2xl">
              <div className="badge badge-saffron mb-2 text-xs">Ready to create</div>
              <h2 className="font-display font-bold text-white text-xl">{form.title}</h2>
              <p className="text-white/70 text-sm mt-1">{planMode==='ai' ? selectedPlan?.summary : 'Your custom plan'}</p>
            </div>
            <div className="card p-4">
              <h3 className="font-display font-bold text-slate-700 mb-3">Trip Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {l:'Route', v:`${form.startLocation?.label} → ${form.endLocation?.label}`},
                  {l:'Dates', v:`${form.startDate} → ${form.endDate}`},
                  {l:'Group', v:`${form.groupSize} people`},
                  {l:'Distance', v:routeData?`${routeData.totalDistanceKm}km`:planMode==='ai'?selectedPlan?.totalDistanceKm||'—':'—'},
                  ...(planMode==='ai'?[
                    {l:'Cost/Person', v:formatCurrency(selectedPlan?.estimatedCost?.perPerson)},
                    {l:'Total Cost', v:formatCurrency(selectedPlan?.estimatedCost?.total)},
                  ]:[]),
                ].map(({l,v})=>(
                  <div key={l} className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{l}</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {planMode==='ai' && selectedPlan?.days && (
              <div className="card p-4">
                <h3 className="font-display font-bold text-slate-700 mb-3">Day Plan</h3>
                <div className="space-y-2">
                  {selectedPlan.days.map((day,i)=>(
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-12 flex-shrink-0 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1.5 rounded-lg text-center">Day {day.dayNumber}</div>
                      <div><div className="text-sm font-bold text-slate-800">{day.title}</div><div className="text-xs text-slate-400">{day.stops?.length} stops · {formatCurrency(day.dailyBudgetPerPerson||day.dailyBudget)}/person</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 p-4 pb-safe shadow-lg">
        {step===0 && (
          <button onClick={goToPreferences} disabled={loading}
            className="btn-primary w-full py-4 text-base">
            {loading ? <Spinner size="sm" color="white"/> : null}
            {loading ? 'Loading...' : planMode==='ai' ? '🤖 Get AI Suggestions →' : '📝 Review My Plan →'}
          </button>
        )}
        {step===1 && (
          <button onClick={generatePlans}
            className="btn-primary w-full py-4 text-base">
            🚀 Generate Smart Plans →
          </button>
        )}
        {step===2 && !loading && (
          <button onClick={()=>{if(!selectedPlan)return toast.error('Select a plan first');setStep(3);}}
            className="btn-primary w-full py-4 text-base" disabled={!selectedPlan}>
            Continue with: {selectedPlan?.planName||'Select a plan'} →
          </button>
        )}
        {(step===3 || (planMode==='manual' && step===0 && manualDays.length>0)) && step===3 && (
          <button onClick={createTrip} disabled={creating}
            className="btn-primary w-full py-4 text-base">
            {creating?<Spinner size="sm" color="white"/>:null}
            {creating?'Creating...':'🎉 Create Trip & Get Code'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Stop adder ──────────────────────────────────────────────
function StopAdder({ onAdd }) {
  const [loc, setLoc] = useState(null);
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <LocationSearch value={loc} onChange={setLoc} placeholder="Add a stop..." icon="📍"/>
      </div>
      <button onClick={()=>{ if(loc){ onAdd(loc); setLoc(null); } }} disabled={!loc}
        className="btn-indigo px-4 py-3 flex-shrink-0 self-end mb-[2px] disabled:opacity-40">+</button>
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={onSelect}
      className={`card cursor-pointer transition-all duration-200 overflow-hidden
        ${selected?'ring-2 ring-indigo-500 shadow-indigo':'hover:shadow-md'}`}>
      {selected && <div className="bg-indigo-600 text-white text-center text-xs font-bold py-1.5">✓ SELECTED</div>}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display font-bold text-slate-900 text-base">{plan.planName}</h3>
          <div className="text-right flex-shrink-0">
            <div className="font-display font-black text-saffron-600 text-xl">{formatCurrency(plan.estimatedCost?.perPerson)}</div>
            <div className="text-[10px] text-slate-400">per person</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{plan.summary}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="badge badge-slate">📏 {plan.totalDistanceKm||plan.totalDistance}km</span>
          <span className="badge badge-saffron">💰 {formatCurrency(plan.estimatedCost?.total)} total</span>
          <span className="badge badge-indigo">🎯 {plan.bestFor}</span>
        </div>
        {plan.highlights?.map((h,i)=>(
          <div key={i} className="text-xs text-slate-600 flex items-start gap-1.5 mb-1">
            <span className="text-saffron-500 font-bold">✦</span>{h}
          </div>
        ))}
        <button onClick={e=>{e.stopPropagation();setExpanded(!expanded)}}
          className="w-full text-xs text-indigo-600 font-bold mt-3 flex items-center justify-center gap-1">
          {expanded?'▲ Less':'▼ Cost breakdown'}
        </button>
        {expanded && plan.estimatedCost?.breakdown && (
          <div className="mt-3 bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 animate-fade-in">
            {Object.entries(plan.estimatedCost.breakdown).map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500 capitalize">{k}</span>
                <span className="font-bold text-slate-700">{formatCurrency(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manual Plan Builder ──────────────────────────────────────
function ManualPlanBuilder({ days, onAddDay, onUpdateDay, onAddStop, onRemoveStop }) {
  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-display font-bold text-slate-800">✏️ Your Day Plan</h2>
      {days.map((day,i)=>(
        <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="badge badge-indigo">Day {day.dayNumber}</span>
          </div>
          <input className="input bg-white" placeholder="Day title e.g. 'Drive to Ooty'" value={day.title} onChange={e=>onUpdateDay(i,'title',e.target.value)}/>
          <input type="date" className="input bg-white text-sm" value={day.date} onChange={e=>onUpdateDay(i,'date',e.target.value)}/>
          <div className="space-y-1.5">
            {day.stops.map((s,si)=>(
              <div key={si} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                <span className="text-indigo-500">📍</span>
                <span className="flex-1 text-sm font-semibold">{s.name}</span>
                <button onClick={()=>onRemoveStop(i,si)} className="text-slate-300 hover:text-red-400 text-lg">×</button>
              </div>
            ))}
            <ManualStopInput onAdd={name=>onAddStop(i,name)}/>
          </div>
          <input type="number" className="input bg-white text-sm" placeholder="Daily budget per person (₹)" value={day.dailyBudgetPerPerson||''} onChange={e=>onUpdateDay(i,'dailyBudgetPerPerson',parseFloat(e.target.value)||0)}/>
          <textarea className="input bg-white resize-none text-sm" rows={2} placeholder="Day notes..." value={day.notes} onChange={e=>onUpdateDay(i,'notes',e.target.value)}/>
        </div>
      ))}
      <button onClick={onAddDay} className="btn-ghost w-full">+ Add Day {days.length+1}</button>
    </div>
  );
}

function ManualStopInput({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input className="input bg-white text-sm flex-1" placeholder="Add stop name..." value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&val.trim()){onAdd(val.trim());setVal('');} }}/>
      <button onClick={()=>{ if(val.trim()){onAdd(val.trim());setVal('');} }} className="btn-indigo px-3 py-2.5 text-sm">+</button>
    </div>
  );
}
