import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface Vendor {
  id: string;
  companyName: string;
  status: string;
}

export function RfqCreationPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    quantity: 1,
    unit: "pcs",
    deadline: "",
    attachmentUrl: "",
    vendorIds: [] as string[]
  });

  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: () =>
      apiRequest<Vendor[]>("/vendors", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }),
    enabled: Boolean(accessToken)
  });

  const activeVendors = (vendorsQuery.data ?? []).filter(v => v.status === "ACTIVE");

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      // Convert to ISO string for backend
      const payload = {
        ...data,
        deadline: new Date(data.deadline).toISOString()
      };
      return apiRequest("/rfqs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      navigate("/procurement/rfqs");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create RFQ");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.vendorIds.length === 0) {
      setError("Please select at least one vendor.");
      return;
    }
    mutation.mutate(form);
  };

  const handleVendorToggle = (vendorId: string) => {
    setForm(prev => {
      const selected = prev.vendorIds.includes(vendorId);
      return {
        ...prev,
        vendorIds: selected
          ? prev.vendorIds.filter(id => id !== vendorId)
          : [...prev.vendorIds, vendorId]
      };
    });
  };

  return (
    <AppShell title="Create RFQ" eyebrow="Procurement">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/procurement/rfqs"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFQs
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8 rounded-md border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Details</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">RFQ Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Office Laptops Q3"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                required
                placeholder="Provide detailed specifications..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                rows={4}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <input
                  required
                  type="text"
                  placeholder="pcs, kg, liters..."
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline</label>
                <input
                  required
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Attachment URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.attachmentUrl}
                  onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Invite Vendors</h2>
            <p className="text-sm text-muted-foreground">Select active vendors to invite to this RFQ.</p>
            
            {vendorsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading vendors...</p>
            ) : activeVendors.length === 0 ? (
              <p className="text-sm text-amber-600">No active vendors found. Please approve vendors first.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeVendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                      form.vendorIds.includes(vendor.id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.vendorIds.includes(vendor.id)}
                      onChange={() => handleVendorToggle(vendor.id)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{vendor.companyName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border pt-6">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "Creating..." : "Create RFQ"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
