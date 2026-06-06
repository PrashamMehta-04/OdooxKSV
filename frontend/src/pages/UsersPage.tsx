import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { SelectField, TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { statusTone } from '../lib/format';
import type { AuthUser } from '../lib/types';

export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    role: '',
    country: '',
    phone_number: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuthUser[]>('/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onEdit(user: AuthUser) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name,
      role: user.role,
      country: user.country || '',
      phone_number: user.phone_number || '',
    });
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    try {
      await apiFetch(`/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setEditingId(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="User Management" description="Control system access and assign roles to registered members." />
      
      {error && <div className="form-error mb-4">{error}</div>}

      <div className="two-col two-col--wide">
        <SectionCard 
          title={editingId ? 'Edit Permissions' : 'User Security'} 
          subtitle={editingId ? `Context: ${form.full_name}` : 'Select a user to modify their role.'}
        >
          {editingId ? (
            <form className="modern-form" onSubmit={onUpdate}>
              <div className="form-sections-grid">
                <div className="form-group-section">
                  <h4 className="section-header">Access Control</h4>
                  <div className="field-grid">
                    <TextField label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    <SelectField label="System Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="pending">Pending (Guest)</option>
                      <option value="admin">Administrator</option>
                      <option value="officer">Procurement Officer</option>
                      <option value="procurement_head">Procurement Head</option>
                      <option value="finance_manager">Finance Manager</option>
                      <option value="vendor">Vendor (External)</option>
                    </SelectField>
                  </div>
                </div>

                <div className="form-group-section">
                  <h4 className="section-header">Profile Details</h4>
                  <div className="field-grid">
                    <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    <TextField label="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-actions-bar">
                <button className="button button--primary" type="submit">Update User</button>
                <button className="button button--ghost" type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="empty-state">Choose an account from the directory to manage access levels.</div>
          )}
        </SectionCard>

        <SectionCard title="Registered Users" subtitle="System access directory.">
          <div className="data-grid">
            {loading ? (
              <div className="empty-state">Loading users...</div>
            ) : users.length > 0 ? (
              users.map((u) => (
                <div key={u.id} className={`data-card ${editingId === u.id ? 'row-highlight' : ''}`}>
                  <div className="data-card__header">
                    <div className="activity-row">
                      <div className="vendor-avatar-mini">{u.full_name.charAt(0)}</div>
                      <div>
                        <strong className="data-card__title">{u.full_name}</strong>
                        <div className="muted small">{u.email}</div>
                      </div>
                    </div>
                    <Badge tone={statusTone(u.role === 'admin' ? 'approved' : u.role === 'pending' ? 'pending' : 'info')}>{u.role}</Badge>
                  </div>

                  <div className="data-card__stats">
                    <div className="data-stat-row">
                      <span className="label">Access</span>
                      <span className="value text-uppercase">{u.role}</span>
                    </div>
                  </div>

                  <div className="data-card__footer">
                    <button className="button button--ghost small" onClick={() => onEdit(u)}>Manage Role</button>
                    <button className="button button--ghost small text-danger" onClick={() => onDelete(u.id)}>Delete</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No users registered yet.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
