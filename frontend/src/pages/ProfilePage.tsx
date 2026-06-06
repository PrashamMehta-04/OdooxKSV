import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextField } from '../components/Field';
import { Badge } from '../components/Badge';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { statusTone, formatDateTime } from '../lib/format';

export function ProfilePage() {
  const { user } = useAuth();
  
  const [form, setForm] = useState({
    full_name: '',
    country: '',
    phone_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        country: user.country || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setMessage('Profile updated successfully. Please refresh to see all changes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <PageHeader eyebrow="User Account" title="My Profile" description="Manage your personal information and contact details." />
      
      <div className="two-col two-col--wide">
        <SectionCard title="Personal Information" subtitle="Update your account details.">
          {error && <div className="form-error mb-4">{error}</div>}
          {message && <div className="badge badge--success mb-4" style={{ padding: '12px', fontSize: '0.9rem', width: '100%', marginBottom: '20px' }}>{message}</div>}

          <form className="modern-form" onSubmit={onSubmit}>
            <div className="form-profile-header">
              <div className="vendor-avatar large">{user.full_name.charAt(0)}</div>
              <div className="profile-info">
                <h3>{user.full_name}</h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <Badge tone={statusTone(user.role === 'admin' ? 'approved' : user.role === 'pending' ? 'pending' : 'info')}>
                    {user.role}
                  </Badge>
                  <span className="muted small" style={{ alignSelf: 'center' }}>Member since {formatDateTime(user.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="form-sections-grid">
              <div className="form-group-section">
                <h4 className="section-header">Account Details</h4>
                <div className="field-grid">
                  <TextField label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  <TextField label="Email Address" value={user.email} onChange={() => {}} disabled hint="Email cannot be changed" />
                </div>
              </div>

              <div className="form-group-section">
                <h4 className="section-header">Contact Information</h4>
                <div className="field-grid">
                  <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  <TextField label="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="form-actions-bar">
              <button className="button button--primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </>
  );
}
