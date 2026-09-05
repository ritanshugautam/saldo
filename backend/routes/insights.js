const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.userId)
    .gte('date', sevenDaysAgo);

  if (error) return res.status(500).json({ error: error.message });

  if (!expenses || expenses.length === 0) {
    return res.status(200).json({
      insight: 'No expenses in the last 7 days. Start tracking to get your first insight.',
      data: null
    });
  }

  const weeklyTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const transactionCount = expenses.length;

  const categoryMap = {};
  for (const e of expenses) {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + parseFloat(e.amount);
  }
  const breakdown = Object.entries(categoryMap)
    .map(([category, total]) => ({
      category,
      total,
      percentage: Math.round((total / weeklyTotal) * 100)
    }))
    .sort((a, b) => b.total - a.total);

  const highestExpense = expenses.reduce((max, e) =>
    parseFloat(e.amount) > parseFloat(max.amount) ? e : max
  , expenses[0]);

  const breakdownLines = breakdown
    .map(b => `  - ${b.category}: Rs ${b.total.toFixed(2)} (${b.percentage}% of week)`)
    .join('\n');

  const spendingSummary = `Student spending data for the last 7 days:
Total spent: Rs ${weeklyTotal.toFixed(2)}
Number of transactions: ${transactionCount}
Highest single expense: Rs ${parseFloat(highestExpense.amount).toFixed(2)} on ${highestExpense.category} (${highestExpense.description || 'no description'})
Breakdown by category:
${breakdownLines}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are a brutally honest financial advisor for Indian college students. No fluff. No fake encouragement. Give exactly 3 numbered insights based on this student's spending. Each insight is 2-3 sentences max. Be specific — name the categories, name the amounts. End with one actionable tip for next week. If the spending is bad, say so clearly.

${spendingSummary}`
    });

    const insightText = response.text;

    return res.status(200).json({
      insight: insightText,
      data: { weeklyTotal, breakdown, transactionCount, highestExpense }
    });
  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({
      error: 'Could not generate insight. Try again in a moment.'
    });
  }
});

module.exports = router;
