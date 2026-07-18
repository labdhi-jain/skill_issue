import { useState, useRef, useEffect } from 'react';
import './Auth.css';

const API = 'http://localhost:3001';

export default function Auth({ onAuth }) {
  // step: 'email' | 'otp' | 'username'
  const [step, setStep]           = useState('email');
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [username, setUsername]   = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [successMsg, setSuccessMsg]   = useState('');

  const otpRefs = useRef([]);
  const resendRef = useRef(null);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      resendRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(resendRef.current);
  }, [resendTimer]);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setIsNewUser(data.isNewUser);
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

  // ── OTP input handling ──────────────────────────────────────────────────────
  function handleOtpChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    // Auto-submit when all 6 filled
    if (val && next.every(d => d !== '') && i === 5) {
      handleVerifyOtp(next.join(''));
    }
  }

  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.every(d => d !== '')) {
      handleVerifyOtp(otp.join(''));
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(pasted), 50);
    }
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp(codeOverride) {
    const code = codeOverride || otp.join('');
    if (code.length < 6) return setError('Enter all 6 digits.');
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code,
          // If returning user, no username needed at verify step
          username: isNewUser ? undefined : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // If new user and missing username, go to username step
        if (isNewUser) {
          setStep('username');
          return;
        }
        throw new Error(data.error || 'Verification failed.');
      }

      if (isNewUser) {
        // Need username before finalising
        setStep('username');
      } else {
        // Existing user — done!
        localStorage.setItem('skill_issue_token', data.token);
        localStorage.setItem('skill_issue_user', JSON.stringify(data.user));
        onAuth(data.user);
      }
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Pick username + final verify ───────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    if (!username.trim() || username.trim().length < 2) {
      return setError('Username must be at least 2 characters.');
    }
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp.join(''), username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

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
    <div className="auth-screen">
      {/* Background grid */}
      <div className="auth-bg-grid" />
      <div className="auth-vignette" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-title">SKILL ISSUE</div>
          <div className="auth-logo-sub">// A TYPING GAME WITH TRUST ISSUES</div>
        </div>

        {/* ── Step 1: Email ── */}
        {step === 'email' && (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="auth-step-label">create account / log in</div>
            <h2 className="auth-heading">enter your email</h2>
            <p className="auth-desc">
              We'll send a 6-digit code to verify it's real. No password needed.
            </p>

            <div className="auth-field">
              <input
                id="auth-email-input"
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

            <button
              id="auth-send-btn"
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? 'SENDING...' : 'SEND CODE →'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 'otp' && (
          <div className="auth-form">
            <div className="auth-step-label">step 2 of {isNewUser ? '3' : '2'}</div>
            <h2 className="auth-heading">enter the code</h2>
            {successMsg && <div className="auth-success">{successMsg}</div>}
            <p className="auth-desc">
              Sent to <strong>{email}</strong>. Check your inbox (and spam).
            </p>

            <div className="otp-boxes" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  id={`otp-box-${i}`}
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
              id="auth-verify-btn"
              className="auth-btn"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.some(d => !d)}
            >
              {loading ? 'VERIFYING...' : 'VERIFY →'}
            </button>

            <div className="auth-resend">
              {resendTimer > 0 ? (
                <span className="auth-resend-timer">resend in {resendTimer}s</span>
              ) : (
                <button
                  className="auth-resend-btn"
                  onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); }}
                >
                  ← change email / resend
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Username (new users only) ── */}
        {step === 'username' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-step-label">step 3 of 3 · almost there</div>
            <h2 className="auth-heading">pick a username</h2>
            <p className="auth-desc">
              This is what appears on the leaderboard. Make it embarrassing.
            </p>

            <div className="auth-field">
              <input
                id="auth-username-input"
                type="text"
                className="auth-input"
                placeholder="e.g. absolute_npc"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={20}
                autoFocus
                autoComplete="off"
              />
              <div className="auth-field-hint">{username.length}/20</div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              id="auth-register-btn"
              type="submit"
              className="auth-btn"
              disabled={loading || username.trim().length < 2}
            >
              {loading ? 'CREATING...' : "LET'S GO →"}
            </button>
          </form>
        )}

        {/* Step dots */}
        <div className="auth-dots">
          {['email', 'otp', ...(isNewUser ? ['username'] : [])].map((s, i) => (
            <div
              key={s}
              className={`auth-dot ${step === s ? 'active' : (
                ['email','otp','username'].indexOf(step) > i ? 'done' : ''
              )}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
