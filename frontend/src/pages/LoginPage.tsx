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
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">VendorBridge</p>
        <h1>Procurement that reads like a workflow, not a spreadsheet.</h1>
        <p>
          Manage vendors, RFQs, quotations, approvals, purchase orders, invoices, and the audit trail in one structured system.
        </p>
        <div className="hero-grid">
          <div>
            <span className="hero-grid__label">One source</span>
            <strong>Vendors, RFQs, POs</strong>
          </div>
          <div>
            <span className="hero-grid__label">Immutable</span>
            <strong>Audit logs</strong>
          </div>
          <div>
            <span className="hero-grid__label">Workflow</span>
            <strong>L1 to L2 approval</strong>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <h2>Login</h2>
        <p>Use your procurement workspace credentials.</p>
        <form className="form-stack" onSubmit={onSubmit}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button button--primary button--wide" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <button className="button button--ghost button--wide" type="button" onClick={() => navigate('register')}>
          Create account
        </button>
      </section>
    </div>
  );
}

