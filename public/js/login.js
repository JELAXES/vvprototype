const form      = document.getElementById('login-form');
const pwInput   = document.getElementById('password');
const toggleBtn = document.getElementById('toggle-pw');
const errBox    = document.getElementById('login-error');
const errMsg    = document.getElementById('error-msg');
const loginBtn  = document.getElementById('login-btn');

toggleBtn.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  toggleBtn.innerHTML = isText
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  errBox.classList.remove('show');
  loginBtn.textContent = 'Signing in…';
  loginBtn.disabled = true;

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwInput.value })
    });
    const data = await res.json();

    if (data.success) {
      loginBtn.textContent = '✓ Success!';
      setTimeout(() => location.href = '/dashboard', 500);
    } else {
      errMsg.textContent = data.error || 'Incorrect password.';
      errBox.classList.add('show');
      pwInput.value = '';
      pwInput.focus();
    }
  } catch {
    errMsg.textContent = 'Network error. Please try again.';
    errBox.classList.add('show');
  } finally {
    loginBtn.disabled    = false;
    if (loginBtn.textContent !== '✓ Success!') loginBtn.textContent = 'Sign In';
  }
});
