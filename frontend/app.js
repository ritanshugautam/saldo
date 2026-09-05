const BACKEND_URL = 'https://saldo-vacp.onrender.com';

let currentExpenses = [];

function getToken() {
  return localStorage.getItem('saldo_token');
}

function getEmail() {
  return localStorage.getItem('saldo_email');
}

async function authFetch(path, options = {}) {
  const token = getToken();
  const url = BACKEND_URL + path;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('saldo_token');
    localStorage.removeItem('saldo_email');
    window.location.href = 'index.html';
    return { data: null, ok: false, status: 401 };
  }

  const data = await response.json();
  return { data, ok: response.ok, status: response.status };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryBadgeClass(category) {
  return 'badge-' + category.toLowerCase().replace(/\s+/g, '-');
}

function renderExpenseCard(expense) {
  const desc = expense.description || '—';
  const badgeClass = categoryBadgeClass(expense.category);

  return `
    <div class="expense-card" data-id="${expense.id}">
      <div class="expense-main">
        <div class="expense-amount">Rs ${parseFloat(expense.amount).toFixed(2)}</div>
        <span class="badge ${badgeClass}">${expense.category}</span>
      </div>
      <div class="expense-meta">
        <span class="expense-desc">${desc}</span>
        <span class="expense-date">${formatDate(expense.date)}</span>
      </div>
      <div class="expense-actions">
        <button onclick="startEdit('${expense.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteExpense('${expense.id}')">Delete</button>
      </div>
    </div>
  `;
}

async function loadExpenses() {
  const listEl = document.getElementById('expenses-list');
  const emptyEl = document.getElementById('empty-state');

  const { data, ok } = await authFetch('/api/expenses');

  if (!ok) {
    listEl.innerHTML = '<p style="color:var(--danger);font-size:0.875rem;">Failed to load expenses.</p>';
    return;
  }

  currentExpenses = data.expenses || [];

  if (currentExpenses.length === 0) {
    emptyEl.hidden = false;
    listEl.innerHTML = '';
    return;
  }

  emptyEl.hidden = true;
  listEl.innerHTML = currentExpenses.map(renderExpenseCard).join('');
}

async function addExpense() {
  const amount = document.getElementById('input-amount').value;
  const category = document.getElementById('input-category').value;
  const description = document.getElementById('input-description').value.trim();
  const date = document.getElementById('input-date').value;
  const msgEl = document.getElementById('add-message');
  const btn = document.getElementById('add-btn');

  if (!amount || parseFloat(amount) <= 0 || !category) {
    msgEl.textContent = 'Please enter a valid amount and category.';
    msgEl.className = 'add-message error-msg';
    msgEl.hidden = false;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Adding...';
  msgEl.hidden = true;

  const { data, ok } = await authFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({ amount: parseFloat(amount), category, description, date })
  });

  btn.disabled = false;
  btn.textContent = 'Add expense';

  if (!ok) {
    msgEl.textContent = (data && data.error) || 'Failed to add expense.';
    msgEl.className = 'add-message error-msg';
    msgEl.hidden = false;
    return;
  }

  document.getElementById('input-amount').value = '';
  document.getElementById('input-category').value = '';
  document.getElementById('input-description').value = '';
  document.getElementById('input-date').value = new Date().toISOString().split('T')[0];

  msgEl.textContent = 'Expense added!';
  msgEl.className = 'add-message success-msg';
  msgEl.hidden = false;

  setTimeout(() => { msgEl.hidden = true; }, 3000);

  await loadExpenses();
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await authFetch('/api/expenses/' + id, { method: 'DELETE' });
  await loadExpenses();
}

function startEdit(id) {
  const expense = currentExpenses.find(e => e.id === id);
  if (!expense) return;

  const card = document.querySelector(`.expense-card[data-id="${id}"]`);
  if (!card) return;

  card.innerHTML = `
    <div class="edit-form">
      <input type="number" class="edit-amount" step="0.01" min="0" value="${expense.amount}" />
      <select class="edit-category">
        <option value="Food" ${expense.category === 'Food' ? 'selected' : ''}>Food</option>
        <option value="Transport" ${expense.category === 'Transport' ? 'selected' : ''}>Transport</option>
        <option value="Subscriptions" ${expense.category === 'Subscriptions' ? 'selected' : ''}>Subscriptions</option>
        <option value="Night out" ${expense.category === 'Night out' ? 'selected' : ''}>Night out</option>
        <option value="Shopping" ${expense.category === 'Shopping' ? 'selected' : ''}>Shopping</option>
        <option value="Education" ${expense.category === 'Education' ? 'selected' : ''}>Education</option>
        <option value="Health" ${expense.category === 'Health' ? 'selected' : ''}>Health</option>
        <option value="Other" ${expense.category === 'Other' ? 'selected' : ''}>Other</option>
      </select>
      <input type="text" class="edit-desc" placeholder="Description" value="${expense.description || ''}" />
      <input type="date" class="edit-date" value="${expense.date}" />
      <div class="edit-actions">
        <button class="btn-save" onclick="saveEdit('${id}')">Save</button>
        <button class="btn-cancel" onclick="loadExpenses()">Cancel</button>
      </div>
    </div>
  `;
}

async function saveEdit(id) {
  const card = document.querySelector(`.expense-card[data-id="${id}"]`);
  const amount = card.querySelector('.edit-amount').value;
  const category = card.querySelector('.edit-category').value;
  const description = card.querySelector('.edit-desc').value.trim();
  const date = card.querySelector('.edit-date').value;

  await authFetch('/api/expenses/' + id, {
    method: 'PUT',
    body: JSON.stringify({ amount: parseFloat(amount), category, description, date })
  });

  await loadExpenses();
}

async function getInsight() {
  const btn = document.getElementById('insight-btn');
  const spinner = document.getElementById('insight-spinner');
  const box = document.getElementById('insight-box');
  const textEl = document.getElementById('insight-text');
  const breakdownEl = document.getElementById('insight-breakdown');

  btn.disabled = true;
  spinner.hidden = false;
  box.hidden = true;

  const { data, ok } = await authFetch('/api/insights');

  spinner.hidden = true;
  btn.disabled = false;

  if (!ok) {
    textEl.innerHTML = (data && data.error) || 'Could not generate insight. Try again.';
    breakdownEl.innerHTML = '';
    box.hidden = false;
    return;
  }

  textEl.innerHTML = data.insight.replace(/\n/g, '<br>');

  if (data.data) {
    const { weeklyTotal, breakdown, transactionCount } = data.data;
    let html = `<p><strong>This week:</strong> Rs ${parseFloat(weeklyTotal).toFixed(2)} across ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}</p>`;
    if (breakdown && breakdown.length) {
      html += breakdown.map(b =>
        `<div class="breakdown-item">
          <span>${b.category}</span>
          <span>Rs ${parseFloat(b.total).toFixed(2)} &nbsp;(${b.percentage}%)</span>
        </div>`
      ).join('');
    }
    breakdownEl.innerHTML = html;
  } else {
    breakdownEl.innerHTML = '';
  }

  box.hidden = false;
}

window.startEdit = startEdit;
window.deleteExpense = deleteExpense;

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('user-email').textContent = getEmail();
  document.getElementById('input-date').value = new Date().toISOString().split('T')[0];

  document.getElementById('signout-btn').addEventListener('click', () => handleLogout());
  document.getElementById('add-btn').addEventListener('click', addExpense);
  document.getElementById('insight-btn').addEventListener('click', getInsight);

  loadExpenses();
});
