import { FormEvent, useState } from 'react';
import { TextField } from '../components/Field';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'pending',
    country: 'India',
    phone_number: '',
    photo_url: '',
    additional_info: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      navigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout--simple">
      <div className="centered-container" style={{ maxWidth: '800px' }}>
        <div className="logo-large">
          <img src="/logo.svg" alt="VB" className="brand-mark" style={{ width: '80px', height: '80px' }} />
          <h1>VendorBridge Registration</h1>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <TextField label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <TextField label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          
          <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <TextField label="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <TextField label="Photo URL" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
          <div className="full-width">
            <TextField label="Additional Information ...." value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} />
          </div>
          
          {error ? <div className="form-error form-error--full">{error}</div> : null}
          
          <button className="button button--primary form-grid__submit" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <button className="button button--ghost" type="button" onClick={() => navigate('login')}>
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}

