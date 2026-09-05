require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');

const expensesRouter = require('./routes/expenses');
const insightsRouter = require('./routes/insights');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/expenses', expensesRouter);
app.use('/api/insights', insightsRouter);

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'Saldo API' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Saldo API running on port ${PORT}`);
});
