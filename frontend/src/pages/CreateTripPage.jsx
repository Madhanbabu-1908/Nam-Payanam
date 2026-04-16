import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, calculateAllDistances } from '../utils/api';
import toast from 'react-hot-toast';
import { Spinner, SkeletonCard, formatCurrency } from '../components/ui/index.jsx';
import LocationInput from '../components/ui/LocationInput.jsx';

const STEPS = ['Route & Details', 'AI Plans', 'Confirm & Create'];

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

  // Resolved location objects { short_name, lat, lon }
  const [startLoc, setStartLoc] = useState(null);
  const [endLoc, setEndLoc] = useState(null);
  const [stopInputLoc, setStopInputLoc] = useState(null);
  const [stopInput, setStopInput] = useState('');

  // Route distances computed after all locations selected
  const [routeDistances, setRouteDistances] = useState([]);
  const [calcingDist, setCalcingDist] = useState(false);

  const [form, setForm] = useState({
    organizerName: '',
    title: '',
    stops: [], // [{name, lat, lon}]
    startDate: '',
    endDate: '',
    groupSize: 4,
    budget: 'moderate',
    preferences: '',
    planMode: 'ai', // 'ai' | 'manual'
  });

  function updateForm(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  function addStop() {
    if (!stopInputLoc) return toast.error('Select a location from the dropdown');
    setForm(prev => ({ ...prev, stops: [...prev.stops, stopInputLoc] }));
    setStopInput('');
    setStopInputLoc(null);
  }

  function removeStop(i) { setForm(prev => ({ ...prev, stops: prev.stops.filter((_, idx) => idx !== i) })); }

  // Recalculate distances whenever route changes
  const recalcDistances = useCallback(async (start, end, stops) => {
    if (!start || !end) return;
    setCalcingDist(true);
    const allLocs = [start, ...stops, end];
    const dists = await calculateAllDistances(allLocs);
    setRouteDistances(dists);
    setCalcingDist(false);
  }, []);

  function handleStartSelect(loc) {
    setStartLoc(loc);
    recalcDistances(loc, endLoc, form.stops);
  }
  function handleEndSelect(loc) {
    setEndLoc(loc);
    recalcDistances(startLoc, loc, form.stops);
  }
  function handleStopSelect(loc) {
    setStopInputLoc(loc);
    setStopInput(loc.short_name);
  }
  function handleStopAdd() {
    if (!stopInputLoc) return toast.error('Pick a location from dropdown');
    const newStops = [...form.stops, stopInputLoc];
    setForm(prev => ({ ...prev, stops: newStops }));
    setStopInput('');
    setStopInputLoc(null);
    recalcDistances(startLoc, endLoc, newStops);
  }

  const totalDist = routeDistances.reduce((s, d) => s + (d.distance_km || 0), 0);
  const totalDrive = routeDistances.reduce((s, d) => s + (d.duration_minutes || 0), 0);

  async function generatePlans() {
    if (!form.organizerName) return toast.error('Enter your name');
    if (!startLoc) return toast.error('Pick a starting location');
    if (!endLoc) return toast.error('Pick a destination');
    if (!form.startDate || !form.endDate) return toast.error('Select trip dates');
    if (new Date(form.endDate) < new Date(form.startDate)) return toast.error('End date must be after start date');
    if (!form.title) updateForm('title', `${startLoc.short_name} to ${endLoc.short_name}`);

    setLoading(true);
    setStep(1);
    try {
      const res = await tripAPI.generatePlans({
        startLocation: startLoc.short_name,
        endLocation: endLoc.short_name,
        stops: form.stops.map(s => s.short_name || s.name),
        startDate: form.startDate,
        endDate: form.endDate,
        groupSize: form.groupSize,
        budget: form.budget,
        preferences: form.preferences,
        routeDistances,
      });
      setPlans(res.plans || []);
    } catch (err) {
      toast.error('AI plan generation failed: ' + err.message);
      setStep(0);
    } finally { setLoading(false); }
  }

  async function createTrip() {
    if (!selectedPlan) return toast.error('Please select a plan');
    setCreating(true);
    try {
      const planIndex = plans.findIndex(p => p.planName === selectedPlan.planName);
      const tripTitle = form.title || `${startLoc.short_name} → ${endLoc.short_name}`;
      const sessionId = getSessionId();
      const res = await tripAPI.create({
        ...form,
        title: tripTitle,
        startLocation: startLoc.short_name,
        endLocation: endLoc.short_name,
        stops: form.stops.map(s => s.short_name || s.name),
        selectedPlan,
        planIndex,
        sessionId,
        routeDistances,
      });
      setSession({
        memberId: res.organizerId,
        memberRowId: res.memberId,
        nickname: form.organizerName,
        tripId: res.tripId,
        tripCode: res.tripCode,
        isOrganizer: true,
        sessionId,
      });
      toast.success('🎉 Trip created! Share your trip code.');
      navigate(`/trip/${res.tripCode}`);
    } catch (err) {
      toast.error('Failed to create trip: ' + err.message);
    } finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => step === 0 ? navigate('/') : setStep(s => s - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-display font-extrabold text-slate-900 text-lg">Plan Your Trip</h1>
            <p className="text-xs text-slate-400">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="flex px-4 pb-3 gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#FF6B35]' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── STEP 0: Details ── */}
        {step === 0 && (
          <div className="p-4 space-y-4 animate-fade-in">
            {/* Organiser info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-sm">👤</span>
                Organiser Info
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Your Name *</label>
                  <input className="input" placeholder="e.g. Arun Kumar" value={form.organizerName}
                    onChange={e => updateForm('organizerName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Trip Title</label>
                  <input className="input" placeholder="e.g. Ooty Weekend Escape (auto-filled if blank)"
                    value={form.title} onChange={e => updateForm('title', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">🗺️</span>
                Route
              </h2>

              <div className="space-y-3">
                <LocationInput
                  label="Starting Point *"
                  placeholder="e.g. Chennai"
                  icon="🏠"
                  value={startLoc}
                  onSelect={handleStartSelect}
                />

                {/* Stop adder */}
                <div>
                  <label className="label">Middle Stops (optional)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <LocationInput
                        placeholder="Add a stop..."
                        icon="📍"
                        value={stopInputLoc}
                        onSelect={handleStopSelect}
                      />
                    </div>
                    <button
                      onClick={handleStopAdd}
                      className="w-12 h-[48px] bg-[#FF6B35] text-white rounded-xl font-bold text-xl flex-shrink-0 flex items-center justify-center active:scale-95"
                    >+</button>
                  </div>
                  {form.stops.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.stops.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                          📍 {s.short_name || s.name}
                          <button onClick={() => removeStop(i)} className="text-orange-400 hover:text-orange-700 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <LocationInput
                  label="Destination *"
                  placeholder="e.g. Coimbatore"
                  icon="🏁"
                  value={endLoc}
                  onSelect={handleEndSelect}
                />
              </div>

              {/* Route distance summary */}
              {(calcingDist || routeDistances.length > 0) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  {calcingDist ? (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <Spinner size="sm" color="ocean" /> Calculating real route distances...
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600 font-bold text-sm">📏 Real Route</span>
                        <span className="text-xs text-blue-500">via OSRM</span>
                      </div>
                      <div className="space-y-1.5">
                        {routeDistances.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                            <span className="text-xs text-slate-600 flex-1 truncate">{d.from} → {d.to}</span>
                            <span className="text-xs font-bold text-blue-700 flex-shrink-0">{d.distance_km} km</span>
                            <span className="text-xs text-slate-400 flex-shrink-0">~{Math.floor(d.duration_minutes/60)}h{d.duration_minutes%60}m</span>
                          </div>
                        ))}
                      </div>
                      {routeDistances.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-xs font-bold text-blue-800">
                          <span>Total Distance</span>
                          <span>{totalDist.toFixed(1)} km · ~{Math.floor(totalDrive/60)}h{totalDrive%60}m driving</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates & Group */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">📅</span>
                Schedule
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" className="input" value={form.startDate}
                    onChange={e => updateForm('startDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input type="date" className="input" value={form.endDate}
                    onChange={e => updateForm('endDate', e.target.value)}
                    min={form.startDate || new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div>
                <label className="label">Group Size</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => updateForm('groupSize', Math.max(1, form.groupSize - 1))}
                    className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 text-2xl font-bold active:bg-slate-200">−</button>
                  <div className="flex-1 text-center">
                    <span className="font-display font-extrabold text-3xl text-[#FF6B35]">{form.groupSize}</span>
                    <span className="text-slate-400 text-sm ml-1">people</span>
                  </div>
                  <button onClick={() => updateForm('groupSize', Math.min(25, form.groupSize + 1))}
                    className="w-11 h-11 rounded-xl bg-orange-100 text-[#FF6B35] text-2xl font-bold active:bg-orange-200">+</button>
                </div>
              </div>
            </div>

            {/* Plan Mode */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-sm">🧭</span>
                Planning Mode
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'ai', icon: '🤖', title: 'AI Suggest', desc: '3 smart plans generated for me' },
                  { id: 'manual', icon: '✏️', title: 'I Know My Plan', desc: 'I\'ll describe my own itinerary' },
                ].map(m => (
                  <button key={m.id} onClick={() => updateForm('planMode', m.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.planMode === m.id ? 'border-[#FF6B35] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                    <div className="text-2xl mb-2">{m.icon}</div>
                    <div className={`font-bold text-sm ${form.planMode === m.id ? 'text-[#FF6B35]' : 'text-slate-700'}`}>{m.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-sm">⚙️</span>
                Preferences
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Budget</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['budget','💰','Budget'],['moderate','⚖️','Moderate'],['premium','💎','Premium']].map(([v, icon, label]) => (
                      <button key={v} onClick={() => updateForm('budget', v)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1
                          ${form.budget === v ? 'bg-[#FF6B35] text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                        <span className="text-base">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">{form.planMode === 'manual' ? 'Describe your plan' : 'Special preferences'}</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder={form.planMode === 'manual'
                      ? "e.g. Day 1: Chennai to Vellore, visit fort. Day 2: Vellore to Ooty via Krishnagiri..."
                      : "e.g. nature lover, avoid highways, prefer hill stations, family-friendly..."}
                    value={form.preferences}
                    onChange={e => updateForm('preferences', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: AI Plans ── */}
        {step === 1 && (
          <div className="p-4 pb-10 animate-fade-in">
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🤖</span>
                <span className="font-bold text-blue-800 text-sm">AI-Powered Planning</span>
              </div>
              <p className="text-xs text-blue-600">
                Using real route data · {startLoc?.short_name} → {endLoc?.short_name}
                {totalDist > 0 && ` · ${totalDist.toFixed(0)} km total`}
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
                <div className="flex flex-col items-center py-6 gap-3">
                  <Spinner size="lg" />
                  <p className="text-sm text-slate-500 font-semibold">Crafting 3 personalized plans...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-slate-800 text-lg">Choose Your Plan</h2>
                {plans.map((plan, i) => (
                  <PlanCard key={i} plan={plan} selected={selectedPlan?.planName === plan.planName} onSelect={() => setSelectedPlan(plan)} />
                ))}
                {plans.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No plans generated. Please go back and try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === 2 && selectedPlan && (
          <div className="p-4 pb-28 space-y-4 animate-fade-in">
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-2xl p-5 text-white">
              <div className="text-sm font-semibold text-white/70 mb-1">Selected Plan</div>
              <h2 className="font-display font-extrabold text-xl mb-2">{selectedPlan.planName}</h2>
              <p className="text-white/80 text-sm">{selectedPlan.summary}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <h3 className="font-display font-bold text-slate-800 mb-3">📋 Trip Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'From', value: startLoc?.short_name },
                  { label: 'To', value: endLoc?.short_name },
                  { label: 'Dates', value: `${form.startDate} → ${form.endDate}` },
                  { label: 'Group', value: `${form.groupSize} people` },
                  { label: 'Distance', value: selectedPlan.totalDistance || `~${totalDist.toFixed(0)} km` },
                  { label: 'Drive Time', value: selectedPlan.estimatedDriveTime || `~${Math.floor(totalDrive/60)}h drive` },
                  { label: 'Per Person', value: formatCurrency(selectedPlan.estimatedCost?.perPerson) },
                  { label: 'Total Est.', value: formatCurrency(selectedPlan.estimatedCost?.total) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">{label}</div>
                    <div className="text-sm font-bold text-slate-800 truncate">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {selectedPlan.amenities && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <h3 className="font-display font-bold text-slate-800 mb-3">🏨 Amenities & Info</h3>
                <div className="space-y-3">
                  {[
                    { key: 'accommodation', icon: '🏨', label: 'Stay' },
                    { key: 'dining', icon: '🍽️', label: 'Food' },
                    { key: 'facilities', icon: '⛽', label: 'Facilities' },
                    { key: 'activities', icon: '🎯', label: 'Activities' },
                  ].map(({ key, icon, label }) => selectedPlan.amenities[key]?.length > 0 && (
                    <div key={key}>
                      <div className="text-xs font-bold text-slate-500 mb-1.5">{icon} {label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPlan.amenities[key].slice(0, 4).map((item, i) => (
                          <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg">{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day Plan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <h3 className="font-display font-bold text-slate-800 mb-3">📅 Day-by-Day ({selectedPlan.days?.length} days)</h3>
              <div className="space-y-2">
                {selectedPlan.days?.map((day, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl">
                    <div className="w-14 flex-shrink-0 bg-[#FF6B35] text-white text-xs font-bold px-2 py-2 rounded-lg text-center">
                      Day {day.dayNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">{day.title}</div>
                      {day.route && <div className="text-xs text-blue-600 font-semibold mt-0.5">🛣️ {day.route}</div>}
                      <div className="text-xs text-slate-400 mt-0.5">{day.stops?.length} stops · {formatCurrency(day.dailyBudget)}/person</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            {selectedPlan.prerequisites?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <h3 className="font-display font-bold text-slate-800 mb-3">✅ Before You Go</h3>
                <ul className="space-y-2">
                  {selectedPlan.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-[#FF6B35] font-bold mt-0.5">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips & Warnings */}
            {selectedPlan.tips?.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <h3 className="font-display font-bold text-amber-800 mb-2">💡 Pro Tips</h3>
                <ul className="space-y-1.5">
                  {selectedPlan.tips.map((t, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="mt-0.5">→</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {step === 0 && (
          <button onClick={generatePlans} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base font-extrabold">
            <span>🤖</span> Generate AI Trip Plans
          </button>
        )}
        {step === 1 && !loading && (
          <div className="space-y-2">
            <button
              onClick={() => { if (!selectedPlan) return toast.error('Select a plan first'); setStep(2); }}
              disabled={!selectedPlan}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2"
            >
              Continue: {selectedPlan?.planName || 'Select a plan'} →
            </button>
            {!selectedPlan && <p className="text-center text-xs text-slate-400">Tap a plan above to select it</p>}
          </div>
        )}
        {step === 2 && (
          <button onClick={createTrip} disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base font-extrabold">
            {creating ? <Spinner size="sm" color="white" /> : <span>🚀</span>}
            {creating ? 'Creating...' : 'Create Trip & Get Code'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const PLAN_COLORS = ['#FF6B35', '#0066CC', '#10b981'];
  const idx = ['Budget Express', 'Comfort Explorer', 'Premium Experience'].findIndex(n => plan.planName?.includes(n.split(' ')[0]));
  const color = PLAN_COLORS[Math.max(0, idx)] || '#FF6B35';

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm
        ${selected ? 'ring-2 ring-[#FF6B35] shadow-[0_4px_20px_rgba(255,107,53,0.2)]' : 'border border-slate-100'}`}
    >
      {/* Color top bar */}
      <div className="h-1.5" style={{ background: color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {selected && <span className="w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-[10px]">✓</span></span>}
              <h3 className="font-display font-extrabold text-slate-900 text-base">{plan.planName}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{plan.summary}</p>
          </div>
          <div className="flex-shrink-0 text-right bg-slate-50 rounded-xl p-2">
            <div className="font-display font-extrabold text-xl" style={{ color }}>{formatCurrency(plan.estimatedCost?.perPerson)}</div>
            <div className="text-[11px] text-slate-400 font-semibold">per person</div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {plan.totalDistance && <span className="badge badge-slate">📏 {plan.totalDistance}</span>}
          {plan.estimatedDriveTime && <span className="badge badge-blue">🚗 {plan.estimatedDriveTime}</span>}
          {plan.bestFor && <span className="badge badge-green">🎯 {plan.bestFor}</span>}
        </div>

        {plan.highlights?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {plan.highlights.map((h, i) => (
              <span key={i} className="text-xs bg-orange-50 border border-orange-100 text-orange-700 px-2 py-1 rounded-lg font-semibold">✨ {h}</span>
            ))}
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-full text-xs font-bold text-slate-500 flex items-center justify-center gap-1 py-1"
        >
          {expanded ? '▲ Hide details' : '▼ Cost breakdown & amenities'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {plan.estimatedCost?.breakdown && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="font-bold text-xs text-slate-500 mb-2">COST BREAKDOWN</div>
                {Object.entries(plan.estimatedCost.breakdown).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500 capitalize">{key}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(val)}</span>
                  </div>
                ))}
              </div>
            )}
            {plan.amenities?.accommodation?.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">🏨 ACCOMMODATION</div>
                <div className="flex flex-wrap gap-1">
                  {plan.amenities.accommodation.slice(0, 3).map((a, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
