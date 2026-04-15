import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Spinner, SkeletonCard, formatCurrency } from '../components/ui/index.jsx';
import { PageHeader } from '../components/ui/index.jsx';

const STEPS = ['Details', 'AI Plans', 'Confirm'];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { setSession } = useTripStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [creating, setCreating] = useState(false);
  const [stopInput, setStopInput] = useState('');

  const [form, setForm] = useState({
    organizerName: '',
    title: '',
    startLocation: '',
    endLocation: '',
    stops: [],
    startDate: '',
    endDate: '',
    groupSize: 4,
    budget: 'moderate',
    preferences: '',
  });

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addStop() {
    if (!stopInput.trim()) return;
    setForm(prev => ({ ...prev, stops: [...prev.stops, stopInput.trim()] }));
    setStopInput('');
  }

  function removeStop(i) {
    setForm(prev => ({ ...prev, stops: prev.stops.filter((_, idx) => idx !== i) }));
  }

  async function generatePlans() {
    if (!form.organizerName || !form.startLocation || !form.endLocation || !form.startDate || !form.endDate) {
      return toast.error('Please fill all required fields');
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return toast.error('End date must be after start date');
    }
    setLoading(true);
    setStep(1);
    try {
      const res = await tripAPI.generatePlans(form);
      setPlans(res.plans || []);
    } catch (err) {
      toast.error('AI plan generation failed: ' + err.message);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  async function createTrip() {
    if (!selectedPlan) return toast.error('Please select a plan');
    setCreating(true);
    try {
      const planIndex = plans.findIndex(p => p.planName === selectedPlan.planName);
      const res = await tripAPI.create({
        ...form,
        selectedPlan,
        planIndex,
      });
      setSession({
        memberId: res.organizerId,
        memberRowId: res.memberId,
        nickname: form.organizerName,
        tripId: res.tripId,
        tripCode: res.tripCode,
        isOrganizer: true,
      });
      toast.success('🎉 Trip created! Share your trip code.');
      navigate(`/trip/${res.tripCode}`);
    } catch (err) {
      toast.error('Failed to create trip: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-10">
        <PageHeader
          title="Plan Your Trip"
          subtitle="AI-powered trip planner"
          back={() => step === 0 ? navigate('/') : setStep(s => s - 1)}
        />
        {/* Step indicator */}
        <div className="flex items-center px-5 pb-3 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                ${i <= step ? 'bg-saffron-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <span>{i + 1}</span>
                <span>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-5 rounded-full transition-all ${i < step ? 'bg-saffron-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* STEP 0: Trip Details */}
        {step === 0 && (
          <div className="p-4 space-y-4 pb-28 animate-fade-in">
            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800">Your Info</h2>
              <div>
                <label className="label">Your Name (Organizer) *</label>
                <input className="input" placeholder="e.g. Arun Kumar" value={form.organizerName}
                  onChange={e => updateForm('organizerName', e.target.value)} />
              </div>
              <div>
                <label className="label">Trip Title *</label>
                <input className="input" placeholder="e.g. Ooty Weekend Escape" value={form.title}
                  onChange={e => updateForm('title', e.target.value)} />
              </div>
            </div>

            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800">Route</h2>
              <div>
                <label className="label">Starting Point *</label>
                <input className="input" placeholder="e.g. Chennai" value={form.startLocation}
                  onChange={e => updateForm('startLocation', e.target.value)} />
              </div>

              <div>
                <label className="label">Middle Stops (optional)</label>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Add a stop..." value={stopInput}
                    onChange={e => setStopInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStop()} />
                  <button onClick={addStop} className="btn-secondary px-4 py-3">+</button>
                </div>
                {form.stops.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.stops.map((s, i) => (
                      <span key={i} className="badge badge-ocean gap-2">
                        📍 {s}
                        <button onClick={() => removeStop(i)} className="text-ocean-400 hover:text-ocean-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Destination (End) *</label>
                <input className="input" placeholder="e.g. Coimbatore" value={form.endLocation}
                  onChange={e => updateForm('endLocation', e.target.value)} />
              </div>
            </div>

            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800">Trip Schedule</h2>
              <div className="grid grid-cols-2 gap-3">
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
                <label className="label">Group Size *</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateForm('groupSize', Math.max(1, form.groupSize - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-xl font-bold active:bg-slate-200">−</button>
                  <span className="font-display font-bold text-2xl text-slate-800 w-8 text-center">{form.groupSize}</span>
                  <button onClick={() => updateForm('groupSize', Math.min(20, form.groupSize + 1))}
                    className="w-10 h-10 rounded-xl bg-saffron-100 text-saffron-600 text-xl font-bold active:bg-saffron-200">+</button>
                  <span className="text-xs text-slate-400">people incl. you</span>
                </div>
              </div>
            </div>

            <div className="card p-4 space-y-4">
              <h2 className="font-display font-bold text-slate-800">Preferences (Optional)</h2>
              <div>
                <label className="label">Budget Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['budget', 'moderate', 'premium'].map(b => (
                    <button key={b} onClick={() => updateForm('budget', b)}
                      className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all
                        ${form.budget === b ? 'bg-saffron-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {b === 'budget' ? '💰 Budget' : b === 'moderate' ? '⚖️ Moderate' : '💎 Premium'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Special Preferences</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="e.g. nature lover, no hill station, prefer road trip..."
                  value={form.preferences}
                  onChange={e => updateForm('preferences', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: AI Plans */}
        {step === 1 && (
          <div className="p-4 pb-10 animate-fade-in">
            <div className="mb-4 p-4 bg-ocean-50 border border-ocean-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span>🤖</span>
                <span className="font-semibold text-ocean-800 text-sm">AI is planning your trip...</span>
              </div>
              <p className="text-xs text-ocean-600">Using Groq LLaMA 3.3 70B to craft 3 personalized plans for {form.startLocation} → {form.endLocation}</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
                <div className="flex flex-col items-center py-6 gap-2">
                  <Spinner size="lg" />
                  <p className="text-sm text-slate-500">Generating your personalized plans...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-slate-800">Choose Your Plan</h2>
                {plans.map((plan, i) => (
                  <PlanCard
                    key={i}
                    plan={plan}
                    selected={selectedPlan?.planName === plan.planName}
                    onSelect={() => setSelectedPlan(plan)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Confirm */}
        {step === 2 && selectedPlan && (
          <div className="p-4 pb-28 animate-fade-in space-y-4">
            <div className="card p-4 bg-gradient-to-r from-saffron-50 to-orange-50 border-saffron-200">
              <h2 className="font-display font-bold text-slate-800 text-lg mb-1">{selectedPlan.planName}</h2>
              <p className="text-sm text-slate-600">{selectedPlan.summary}</p>
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-slate-700 mb-3">Trip Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Route', value: `${form.startLocation} → ${form.endLocation}` },
                  { label: 'Dates', value: `${form.startDate} to ${form.endDate}` },
                  { label: 'Group', value: `${form.groupSize} people` },
                  { label: 'Distance', value: selectedPlan.totalDistance },
                  { label: 'Cost/Person', value: formatCurrency(selectedPlan.estimatedCost?.perPerson) },
                  { label: 'Total Cost', value: formatCurrency(selectedPlan.estimatedCost?.total) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-slate-700 mb-3">Day Plan ({selectedPlan.days?.length} days)</h3>
              <div className="space-y-2">
                {selectedPlan.days?.map((day, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-14 flex-shrink-0 bg-saffron-100 text-saffron-700 text-xs font-bold px-2 py-1.5 rounded-lg text-center">
                      Day {day.dayNumber}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{day.title}</div>
                      <div className="text-xs text-slate-400">{day.stops?.length} stops · {formatCurrency(day.dailyBudget)}/person</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPlan.prerequisites?.length > 0 && (
              <div className="card p-4">
                <h3 className="font-display font-bold text-slate-700 mb-3">✅ Prerequisites</h3>
                <ul className="space-y-1.5">
                  {selectedPlan.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-saffron-500 mt-0.5">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe shadow-lg">
        {step === 0 && (
          <button onClick={generatePlans} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
            <span>🤖</span> Generate AI Plans
          </button>
        )}
        {step === 1 && !loading && (
          <button
            onClick={() => { if (!selectedPlan) return toast.error('Select a plan first'); setStep(2); }}
            className="btn-primary w-full py-4 text-base"
            disabled={!selectedPlan}
          >
            Continue with: {selectedPlan?.planName || 'Select a plan'} →
          </button>
        )}
        {step === 2 && (
          <button onClick={createTrip} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base" disabled={creating}>
            {creating ? <Spinner size="sm" color="white" /> : '🚀'}
            {creating ? 'Creating Trip...' : 'Create Trip & Get Trip Code'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Plan Card Component ───────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={onSelect}
      className={`card p-4 cursor-pointer transition-all duration-200 
        ${selected ? 'border-2 border-saffron-500 shadow-md bg-saffron-50' : 'border border-slate-100'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {selected && <span className="text-saffron-500">✓</span>}
            <h3 className="font-display font-bold text-slate-800">{plan.planName}</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{plan.summary}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-display font-bold text-saffron-600 text-lg">
            {formatCurrency(plan.estimatedCost?.perPerson)}
          </div>
          <div className="text-xs text-slate-400">per person</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className="badge badge-slate">📏 {plan.totalDistance}</span>
        <span className="badge badge-saffron">💰 {formatCurrency(plan.estimatedCost?.total)} total</span>
        <span className="badge badge-green">🎯 {plan.bestFor}</span>
      </div>

      {plan.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.highlights.map((h, i) => (
            <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">✨ {h}</span>
          ))}
        </div>
      )}

      {/* Cost breakdown toggle */}
      <button
        onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full text-xs text-ocean-600 font-semibold mt-3 flex items-center justify-center gap-1"
      >
        {expanded ? '▲ Hide breakdown' : '▼ Show cost breakdown'}
      </button>

      {expanded && plan.estimatedCost?.breakdown && (
        <div className="mt-3 bg-white rounded-xl p-3 space-y-2 border border-slate-100">
          {Object.entries(plan.estimatedCost.breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-slate-500 capitalize">{key}</span>
              <span className="font-semibold text-slate-700">{formatCurrency(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
