import { FormEvent, useState, useEffect } from 'react';
import { TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { navigate } from '../lib/router';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const emailParam = params.get('email');
    if (emailParam) setEmail(emailParam);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const resp = await apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      setMessage(resp.message);
      setTimeout(() => {
        navigate('login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout--simple">
      <div className="centered-container">
        <div className="logo-large">
          <img src="/logo.svg" alt="VB" className="brand-mark" style={{ width: '80px', height: '80px' }} />
          <h1>Set New Password</h1>
          <p className="muted">Enter the 6-digit OTP sent to your email</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="OTP Code" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="6-digit code" maxLength={6} />
          <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          
          {error ? <div className="form-error">{error}</div> : null}
          {message ? <div className="badge badge--success" style={{ padding: '10px', fontSize: '0.9rem' }}>{message}</div> : null}
          
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="row-actions">
          <button className="button button--ghost" type="button" onClick={() => navigate('forgot-password')}>
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}
