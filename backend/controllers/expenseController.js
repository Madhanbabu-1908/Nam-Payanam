const supabase = require('../db/supabase');

// Add expense to a trip
async function addExpense(req, res) {
  try {
    const {
      tripId, dayNumber, title, amount, category,
      paidByMemberId, paidByNickname, splitType, splits, note
    } = req.body;

    if (!tripId || !title || !amount || !paidByNickname) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If equal split, auto-calculate from members
    let finalSplits = splits;
    if (splitType === 'equal' && (!splits || splits.length === 0)) {
      const { data: members } = await supabase
        .from('trip_members')
        .select('id, nickname')
        .eq('trip_id', tripId);

      const perPerson = parseFloat(amount) / members.length;
      finalSplits = members.map(m => ({
        memberId: m.id,
        nickname: m.nickname,
        amount: Math.round(perPerson * 100) / 100
      }));
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        day_number: dayNumber || 0,
        title: title.trim(),
        amount: parseFloat(amount),
        category: category || 'other',
        paid_by_member_id: paidByMemberId || null,
        paid_by_nickname: paidByNickname,
        split_type: splitType || 'equal',
        splits: finalSplits || [],
        note: note?.trim() || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ expense });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
}

// Get all expenses for a trip
async function getTripExpenses(req, res) {
  try {
    const { tripId } = req.params;

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at');

    if (error) throw error;
    res.json({ expenses: expenses || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get expenses' });
  }
}

// Update expense
async function updateExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const updates = req.body;

    const { data: expense, error } = await supabase
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    res.json({ expense });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
}

// Delete expense
async function deleteExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

// Calculate settlements - who owes whom (minimum transactions algorithm)
async function calculateSettlements(req, res) {
  try {
    const { tripId } = req.params;

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId);

    const { data: members, error: memError } = await supabase
      .from('trip_members')
      .select('id, nickname')
      .eq('trip_id', tripId);

    if (expError || memError) throw expError || memError;

    // Build balance map: nickname -> net balance (positive = owed money, negative = owes money)
    const balances = {};
    members.forEach(m => { balances[m.nickname] = 0; });

    expenses.forEach(exp => {
      // Person who paid gets credit
      balances[exp.paid_by_nickname] = (balances[exp.paid_by_nickname] || 0) + parseFloat(exp.amount);
      
      // Each person in splits gets debited
      if (exp.splits && exp.splits.length > 0) {
        exp.splits.forEach(split => {
          balances[split.nickname] = (balances[split.nickname] || 0) - parseFloat(split.amount);
        });
      }
    });

    // Minimum cash flow algorithm
    const settlements = minimizeCashFlow(balances);

    // Summary per person
    const summary = members.map(m => {
      const memberExpenses = expenses.filter(e => e.paid_by_nickname === m.nickname);
      const totalPaid = memberExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      const totalOwed = expenses.reduce((sum, e) => {
        const split = e.splits?.find(s => s.nickname === m.nickname);
        return sum + (split ? parseFloat(split.amount) : 0);
      }, 0);

      return {
        nickname: m.nickname,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        netBalance: Math.round(balances[m.nickname] * 100) / 100
      };
    });

    res.json({ settlements, summary, totalExpenses: expenses.reduce((s, e) => s + parseFloat(e.amount), 0) });
  } catch (err) {
    console.error('Settlement error:', err);
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
}

// Greedy algorithm to minimize number of transactions
function minimizeCashFlow(balances) {
  const transactions = [];
  
  const creditors = []; // people who are owed money (positive balance)
  const debtors = [];   // people who owe money (negative balance)

  Object.entries(balances).forEach(([name, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) creditors.push({ name, amount: rounded });
    else if (rounded < -0.01) debtors.push({ name, amount: Math.abs(rounded) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = Math.min(credit.amount, debt.amount);

    transactions.push({
      from: debt.name,
      to: credit.name,
      amount: Math.round(amount * 100) / 100
    });

    credit.amount -= amount;
    debt.amount -= amount;

    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }

  return transactions;
}

// Generate full trip report data
async function generateReport(req, res) {
  try {
    const { tripId } = req.params;

    const [
      { data: trip },
      { data: members },
      { data: expenses },
      { data: days },
      { data: progress }
    ] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_members').select('*').eq('trip_id', tripId).order('joined_at'),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_days').select('*').eq('trip_id', tripId).order('day_number'),
      supabase.from('trip_progress').select('*').eq('trip_id', tripId).single()
    ]);

    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const totalAmount = expenses?.reduce((s, e) => s + parseFloat(e.amount), 0) || 0;

    // Per-member expense breakdown
    const memberBreakdown = members?.map(m => {
      const paid = expenses?.filter(e => e.paid_by_nickname === m.nickname)
        .reduce((s, e) => s + parseFloat(e.amount), 0) || 0;
      const owes = expenses?.reduce((s, e) => {
        const split = e.splits?.find(sp => sp.nickname === m.nickname);
        return s + (split ? parseFloat(split.amount) : 0);
      }, 0) || 0;
      return { nickname: m.nickname, isOrganizer: m.is_organizer, totalPaid: Math.round(paid * 100) / 100, totalShare: Math.round(owes * 100) / 100 };
    });

    // Day-wise expenses
    const dayExpenses = days?.map(day => ({
      dayNumber: day.day_number,
      title: day.title,
      stops: day.stops,
      expenses: expenses?.filter(e => e.day_number === day.day_number) || [],
      dayTotal: expenses?.filter(e => e.day_number === day.day_number)
        .reduce((s, e) => s + parseFloat(e.amount), 0) || 0
    }));

    // Category breakdown
    const categoryBreakdown = {};
    expenses?.forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + parseFloat(e.amount);
    });

    res.json({
      trip, members, days, progress,
      totalAmount: Math.round(totalAmount * 100) / 100,
      perPersonAverage: Math.round((totalAmount / (members?.length || 1)) * 100) / 100,
      memberBreakdown,
      dayExpenses,
      categoryBreakdown,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

module.exports = { addExpense, getTripExpenses, updateExpense, deleteExpense, calculateSettlements, generateReport };
