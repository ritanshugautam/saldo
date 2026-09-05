const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { amount, category, description, date } = req.body;

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0 || !category) {
    return res.status(400).json({ error: 'Amount and category are required' });
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([{ user_id: req.userId, amount: parseFloat(amount), category, description, date }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ success: true, expense: data });
});

router.get('/summary', async (req, res) => {
  const { data, error } = await supabase.rpc('get_expense_summary', {
    p_user_id: req.userId
  });

  if (error) {
    const { data: rows, error: qErr } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', req.userId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (qErr) return res.status(500).json({ error: qErr.message });

    const grouped = {};
    for (const row of rows) {
      grouped[row.category] = (grouped[row.category] || 0) + parseFloat(row.amount);
    }
    const summary = Object.entries(grouped).map(([category, total]) => ({ category, total }));
    return res.status(200).json({ summary });
  }

  res.status(200).json({ summary: data });
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ expenses: data });
});

router.put('/:id', async (req, res) => {
  const { amount, category, description, date } = req.body;

  const { data, error } = await supabase
    .from('expenses')
    .update({ amount: parseFloat(amount), category, description, date })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Expense not found' });

  res.status(200).json({ success: true, expense: data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ success: true });
});

module.exports = router;
