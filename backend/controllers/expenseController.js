const supabase = require('../db/supabase');

async function addExpense(req, res) {
  try {
    const { tripId, dayNumber, breakId, title, amount, category,
            paidByMemberId, paidByNickname, splitType, splits, note } = req.body;
    if (!tripId || !title || !amount || !paidByNickname)
      return res.status(400).json({ error: 'Missing required fields' });

    let finalSplits = splits;
    if (splitType === 'equal' && (!splits || splits.length === 0)) {
      const { data: members } = await supabase.from('trip_members').select('id,nickname').eq('trip_id', tripId);
      const pp = parseFloat(amount) / members.length;
      finalSplits = members.map(m => ({ memberId: m.id, nickname: m.nickname, amount: Math.round(pp*100)/100 }));
    }

    const { data: expense, error } = await supabase.from('expenses').insert({
      trip_id: tripId, day_number: dayNumber||0, break_id: breakId||null,
      title: title.trim(), amount: parseFloat(amount), category: category||'other',
      paid_by_member_id: paidByMemberId||null, paid_by_nickname: paidByNickname,
      split_type: splitType||'equal', splits: finalSplits||[], note: note?.trim()||null,
    }).select().single();
    if (error) throw error;
    res.json({ expense });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getTripExpenses(req, res) {
  try {
    const { tripId } = req.params;
    const { data } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at');
    res.json({ expenses: data||[] });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function updateExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const { data, error } = await supabase.from('expenses')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', expenseId).select().single();
    if (error) throw error;
    res.json({ expense: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function deleteExpense(req, res) {
  try {
    await supabase.from('expenses').delete().eq('id', req.params.expenseId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

function minimizeCashFlow(balances) {
  const transactions = [];
  const creditors = [], debtors = [];
  Object.entries(balances).forEach(([name, balance]) => {
    const r = Math.round(balance * 100) / 100;
    if (r > 0.01) creditors.push({ name, amount: r });
    else if (r < -0.01) debtors.push({ name, amount: Math.abs(r) });
  });
  creditors.sort((a,b) => b.amount - a.amount);
  debtors.sort((a,b) => b.amount - a.amount);
  let i=0, j=0;
  while (i < creditors.length && j < debtors.length) {
    const amt = Math.min(creditors[i].amount, debtors[j].amount);
    transactions.push({ from: debtors[j].name, to: creditors[i].name, amount: Math.round(amt*100)/100 });
    creditors[i].amount -= amt; debtors[j].amount -= amt;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }
  return transactions;
}

async function calculateSettlements(req, res) {
  try {
    const { tripId } = req.params;
    const [{ data: expenses }, { data: members }] = await Promise.all([
      supabase.from('expenses').select('*').eq('trip_id', tripId),
      supabase.from('trip_members').select('id,nickname').eq('trip_id', tripId),
    ]);

    const balances = {};
    members.forEach(m => { balances[m.nickname] = 0; });
    expenses.forEach(exp => {
      balances[exp.paid_by_nickname] = (balances[exp.paid_by_nickname]||0) + parseFloat(exp.amount);
      exp.splits?.forEach(s => { balances[s.nickname] = (balances[s.nickname]||0) - parseFloat(s.amount); });
    });

    const settlements = minimizeCashFlow(balances);
    const summary = members.map(m => {
      const paid = expenses.filter(e => e.paid_by_nickname===m.nickname).reduce((s,e)=>s+parseFloat(e.amount),0);
      const owed = expenses.reduce((s,e)=>{ const sp=e.splits?.find(x=>x.nickname===m.nickname); return s+(sp?parseFloat(sp.amount):0); },0);
      return { nickname: m.nickname, totalPaid: Math.round(paid*100)/100, totalOwed: Math.round(owed*100)/100, netBalance: Math.round(balances[m.nickname]*100)/100 };
    });

    res.json({ settlements, summary, totalExpenses: expenses.reduce((s,e)=>s+parseFloat(e.amount),0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function generateReport(req, res) {
  try {
    const { tripId } = req.params;
    const [{ data: trip }, { data: members }, { data: expenses }, { data: days }, { data: progress }, { data: breaks }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_members').select('*').eq('trip_id', tripId).order('joined_at'),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_days').select('*').eq('trip_id', tripId).order('day_number'),
      supabase.from('trip_progress').select('*').eq('trip_id', tripId).single(),
      supabase.from('trip_breaks').select('*').eq('trip_id', tripId).order('checkin_time'),
    ]);

    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const totalAmount = expenses?.reduce((s,e)=>s+parseFloat(e.amount),0)||0;
    const memberBreakdown = members?.map(m => {
      const paid = expenses?.filter(e=>e.paid_by_nickname===m.nickname).reduce((s,e)=>s+parseFloat(e.amount),0)||0;
      const owed = expenses?.reduce((s,e)=>{ const sp=e.splits?.find(x=>x.nickname===m.nickname); return s+(sp?parseFloat(sp.amount):0); },0)||0;
      return { nickname: m.nickname, isOrganizer: m.is_organizer, totalPaid: Math.round(paid*100)/100, totalShare: Math.round(owed*100)/100 };
    });
    const dayExpenses = days?.map(day => ({
      dayNumber: day.day_number, title: day.title, stops: day.stops,
      expenses: expenses?.filter(e=>e.day_number===day.day_number)||[],
      breaks: breaks?.filter(b=>b.day_number===day.day_number)||[],
      dayTotal: expenses?.filter(e=>e.day_number===day.day_number).reduce((s,e)=>s+parseFloat(e.amount),0)||0,
    }));
    const catBreakdown = {};
    expenses?.forEach(e => { catBreakdown[e.category]=(catBreakdown[e.category]||0)+parseFloat(e.amount); });

    res.json({
      trip, members, days, breaks: breaks||[], progress,
      totalAmount: Math.round(totalAmount*100)/100,
      perPersonAverage: Math.round((totalAmount/(members?.length||1))*100)/100,
      memberBreakdown, dayExpenses, categoryBreakdown: catBreakdown,
      totalBreaks: breaks?.length||0,
      totalDistanceKm: trip.route_data?.totalDistanceKm||null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { addExpense, getTripExpenses, updateExpense, deleteExpense, calculateSettlements, generateReport };
