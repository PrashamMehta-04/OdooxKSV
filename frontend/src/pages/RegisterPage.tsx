import { FormEvent, useState } from 'react';
import { SelectField, TextField } from '../components/Field';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'officer',
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
    <div className="auth-layout auth-layout--register">
      <section className="auth-hero auth-hero--compact">
        <p className="eyebrow">VendorBridge onboarding</p>
        <h1>Register the procurement team and start tracking workflows.</h1>
        <p>The role determines what each user can create, approve, and inspect.</p>
      </section>

      <section className="auth-card auth-card--wide">
        <h2>Create account</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <TextField label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <SelectField label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="officer">Officer</option>
            <option value="procurement_head">Procurement Head</option>
            <option value="finance_manager">Finance Manager</option>
            <option value="vendor">Vendor</option>
          </SelectField>
          <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <TextField label="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <TextField label="Photo URL" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
          <TextField label="Additional info" value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} />
          {error ? <div className="form-error form-error--full">{error}</div> : null}
          <button className="button button--primary button--wide form-grid__submit" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <button className="button button--ghost button--wide" type="button" onClick={() => navigate('login')}>
          Back to login
        </button>
      </section>
    </div>
  );
}

