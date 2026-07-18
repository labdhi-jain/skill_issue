import { useState, useRef, useEffect } from 'react';
import './Auth.css';

const API = 'http://localhost:3001';

// ─── Sign In ──────────────────────────────────────────────────────────────────
function SignIn({ onAuth }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password)
      return setError('Please fill in both fields.');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      localStorage.setItem('skill_issue_token', data.token);
      localStorage.setItem('skill_issue_user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-heading">welcome back</h2>
      <p className="auth-desc">sign in with your email or username + password</p>

      <div className="auth-field">
        <label className="auth-label">email or username</label>
        <input
          id="signin-identifier"
          type="text"
          className="auth-input"
          placeholder="you@gmail.com or absolute_npc"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          autoFocus
          autoComplete="username"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">password</label>
        <div className="auth-pass-wrap">
          <input
            id="signin-password"
            type={showPass ? 'text' : 'password'}
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-pass-toggle"
            onClick={() => setShowPass(v => !v)}
            tabIndex={-1}
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button id="signin-btn" type="submit" className="auth-btn" disabled={loading}>
        {loading ? 'SIGNING IN...' : 'SIGN IN →'}
      </button>
    </form>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
function SignUp({ onAuth }) {
  // step: 'email' | 'otp' | 'details'
  const [step, setStep]                   = useState('email');
  const [email, setEmail]                 = useState('');
  const [otp, setOtp]                     = useState(['', '', '', '', '', '']);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [showPass, setShowPass]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [successMsg, setSuccessMsg]       = useState('');
  const [resendTimer, setResendTimer]     = useState(0);

  const otpRefs   = useRef([]);
  const resendRef = useRef(null);

  useEffect(() => {
    if (resendTimer > 0) {
      resendRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(resendRef.current);
  }, [resendTimer]);

  // Step 1: send OTP
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('otp');
      setResendTimer(60);
      setSuccessMsg(`Code sent to ${email}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // OTP box handlers
  function handleOtpChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (val && next.every(d => d !== '') && i === 5) handleVerifyOtp(next.join(''));
  }
  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }
  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(pasted), 50);
    }
  }

  // Step 2: verify OTP
  async function handleVerifyOtp(codeOverride) {
    const code = codeOverride || otp.join('');
    if (code.length < 6) return setError('Enter all 6 digits.');
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerifiedToken(data.verifiedToken);
      setStep('details');
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: create account
  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || username.trim().length < 2)
      return setError('Username must be at least 2 characters.');
    if (password.length < 6)
      return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedToken, username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('skill_issue_token', data.token);
      localStorage.setItem('skill_issue_user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = { email: 0, otp: 1, details: 2 };

  return (
    <div className="auth-form">
      {/* Progress dots */}
      <div className="signup-steps">
        {['email', 'otp', 'details'].map((s, i) => (
          <div key={s} className={`signup-step ${stepIndex[step] > i ? 'done' : stepIndex[step] === i ? 'active' : ''}`}>
            <div className="signup-step-dot">{stepIndex[step] > i ? '✓' : i + 1}</div>
            <div className="signup-step-label">{s === 'email' ? 'Email' : s === 'otp' ? 'Verify' : 'Details'}</div>
          </div>
        ))}
        <div className="signup-step-line" style={{ '--progress': `${stepIndex[step] * 50}%` }} />
      </div>

      {/* Step 1: Email */}
      {step === 'email' && (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <h2 className="auth-heading">create account</h2>
          <p className="auth-desc">enter your email — we'll send a code to verify it's real</p>

          <div className="auth-field">
            <label className="auth-label">email address</label>
            <input
              id="signup-email"
              type="email"
              className="auth-input"
              placeholder="you@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button id="signup-send-btn" type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'SENDING...' : 'SEND CODE →'}
          </button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === 'otp' && (
        <div>
          <h2 className="auth-heading">verify email</h2>
          {successMsg && <div className="auth-success">{successMsg}</div>}
          <p className="auth-desc">enter the 6-digit code sent to <strong>{email}</strong></p>

          <div className="otp-boxes" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => otpRefs.current[i] = el}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`otp-box ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
              />
            ))}
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            id="signup-verify-btn"
            className="auth-btn"
            onClick={() => handleVerifyOtp()}
            disabled={loading || otp.some(d => !d)}
          >
            {loading ? 'VERIFYING...' : 'VERIFY →'}
          </button>

          <div className="auth-resend">
            {resendTimer > 0
              ? <span className="auth-resend-timer">resend in {resendTimer}s</span>
              : <button className="auth-resend-btn" onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); }}>
                  ← change email / resend
                </button>
            }
          </div>
        </div>
      )}

      {/* Step 3: Username + Password */}
      {step === 'details' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <h2 className="auth-heading">set up account</h2>
          <p className="auth-desc">pick a username and password to finish</p>

          <div className="auth-field">
            <label className="auth-label">username <span className="auth-label-hint">(shows on leaderboard)</span></label>
            <input
              id="signup-username"
              type="text"
              className="auth-input"
              placeholder="e.g. absolute_npc"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
              autoComplete="off"
            />
            <div className="auth-field-count">{username.length}/20</div>
          </div>

          <div className="auth-field">
            <label className="auth-label">password <span className="auth-label-hint">(min 6 chars)</span></label>
            <div className="auth-pass-wrap">
              <input
                id="signup-password"
                type={showPass ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            id="signup-register-btn"
            type="submit"
            className="auth-btn"
            disabled={loading || username.trim().length < 2 || password.length < 6}
          >
            {loading ? 'CREATING...' : "LET'S GO →"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main Auth screen ─────────────────────────────────────────────────────────
export default function Auth({ onAuth }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'

  return (
    <div className="auth-screen">
      <div className="auth-bg-grid" />
      <div className="auth-vignette" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-title">SKILL ISSUE</div>
          <div className="auth-logo-sub">// A TYPING GAME WITH TRUST ISSUES</div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            id="tab-signin"
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => setTab('signin')}
          >
            SIGN IN
          </button>
          <button
            id="tab-signup"
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => setTab('signup')}
          >
            SIGN UP
          </button>
          <div className="auth-tab-slider" style={{ transform: `translateX(${tab === 'signin' ? '0' : '100%'})` }} />
        </div>

        {/* Content */}
        <div className="auth-content">
          {tab === 'signin'
            ? <SignIn onAuth={onAuth} />
            : <SignUp onAuth={onAuth} />
          }
        </div>
      </div>
    </div>
  );
}
