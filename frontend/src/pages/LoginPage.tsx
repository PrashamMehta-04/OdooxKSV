import { FormEvent, useState } from 'react';
import { TextField } from '../components/Field';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@vendorbridge.local');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      navigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout--simple">
      <div className="centered-container">
        <div className="logo-large">
          <div className="brand-mark">VB</div>
          <h1>VendorBridge</h1>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <TextField label="Email / Username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: '-10px' }}>
            <button className="button button--ghost small" type="button" onClick={() => navigate('forgot-password')}>
              Forgot Password?
            </button>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="row-actions">
          <button className="button button--ghost" type="button" onClick={() => navigate('register')}>
            Register New Account
          </button>
        </div>
      </div>
    </div>
  );
}

