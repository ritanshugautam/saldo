const SUPABASE_URL = 'https://vusetgepxktfbqeuoiyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2V0Z2VweGt0ZmJxZXVvaXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Njk3MzcsImV4cCI6MjEwNDE0NTczN30.G_YeuU5ApbLhfICqAFQmx4NT3XMajDXDAZ9O93xLbsY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function handleSignup(name, email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) return { error: error.message };

  if (!data.session) {
    return { error: 'Account created! Check ' + email + ' for a confirmation link from Supabase, then sign in below.' };
  }

  localStorage.setItem('saldo_token', data.session.access_token);
  localStorage.setItem('saldo_email', email);
  window.location.href = 'dashboard.html';
}

async function handleLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  localStorage.setItem('saldo_token', data.session.access_token);
  localStorage.setItem('saldo_email', email);
  window.location.href = 'dashboard.html';
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('saldo_token');
  localStorage.removeItem('saldo_email');
  window.location.href = 'index.html';
}

window.handleLogout = handleLogout;

document.addEventListener('DOMContentLoaded', () => {
  // Only run auth wiring on index.html
  if (!document.getElementById('signup-btn')) return;

  if (localStorage.getItem('saldo_token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const signupPanel = document.getElementById('signup-panel');
  const loginPanel = document.getElementById('login-panel');

  document.getElementById('show-login').addEventListener('click', () => {
    signupPanel.hidden = true;
    loginPanel.hidden = false;
  });

  document.getElementById('show-signup').addEventListener('click', () => {
    loginPanel.hidden = true;
    signupPanel.hidden = false;
  });

  document.getElementById('signup-btn').addEventListener('click', async () => {
    const btn = document.getElementById('signup-btn');
    const errorDiv = document.getElementById('signup-error');
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    errorDiv.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const result = await handleSignup(name, email, password);

    if (result && result.error) {
      errorDiv.textContent = result.error;
      errorDiv.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  });

  document.getElementById('login-btn').addEventListener('click', async () => {
    const btn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    errorDiv.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const result = await handleLogin(email, password);

    if (result && result.error) {
      errorDiv.textContent = result.error;
      errorDiv.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
});
