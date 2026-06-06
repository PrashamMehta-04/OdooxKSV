import { FormEvent, useState } from 'react';
import { TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { navigate } from '../lib/router';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const resp = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(resp.message);
      setTimeout(() => {
        navigate('reset-password');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout--simple">
      <div className="centered-container">
        <div className="logo-large">
          <div className="brand-mark">VB</div>
          <h1>Reset Password</h1>
          <p className="muted">Enter your email to receive an OTP</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          
          {error ? <div className="form-error">{error}</div> : null}
          {message ? <div className="badge badge--success" style={{ padding: '10px', fontSize: '0.9rem' }}>{message}</div> : null}
          
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>

        <div className="row-actions">
          <button className="button button--ghost" type="button" onClick={() => navigate('login')}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
