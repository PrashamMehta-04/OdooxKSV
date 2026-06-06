import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { AppShell, StatusBadge } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface Vendor {
  id: string;
  companyName: string;
  category: string;
  gstNumber: string | null;
  contactName: string;
  email: string;
  phone: string;
  address: string | null;
  status: string;
  rating: string;
  createdAt: string;
}

export function VendorsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

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

  const vendors = vendorsQuery.data ?? [];
  const filteredVendors = vendors.filter((v) =>
    v.companyName.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingVendor(null);
  };

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      apiRequest(`/vendors/${data.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: data.status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    }
  });

  return (
    <AppShell title="Vendors" eyebrow="Module">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search vendors..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </button>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendorsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading vendors...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{vendor.companyName}</p>
                        <p className="text-xs text-muted-foreground">{vendor.gstNumber || "No GST"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p>{vendor.contactName}</p>
                        <p className="text-xs text-muted-foreground">{vendor.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={vendor.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(vendor)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Edit
                          </button>
                          {vendor.status === "PENDING" && (
                            <button
                              onClick={() => statusMutation.mutate({ id: vendor.id, status: "ACTIVE" })}
                              className="text-sm font-medium text-green-600 hover:underline"
                            >
                              Approve
                            </button>
                          )}
                          {vendor.status === "ACTIVE" && (
                            <button
                              onClick={() => statusMutation.mutate({ id: vendor.id, status: "SUSPENDED" })}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              Suspend
                            </button>
                          )}
                          {vendor.status === "SUSPENDED" && (
                            <button
                              onClick={() => statusMutation.mutate({ id: vendor.id, status: "ACTIVE" })}
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <VendorFormModal
          vendor={editingVendor}
          onClose={handleClose}
        />
      )}
    </AppShell>
  );
}

function VendorFormModal({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    companyName: vendor?.companyName || "",
    category: vendor?.category || "",
    gstNumber: vendor?.gstNumber || "",
    contactName: vendor?.contactName || "",
    email: vendor?.email || "",
    phone: vendor?.phone || "",
    address: vendor?.address || ""
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const isEditing = Boolean(vendor);
      return apiRequest(isEditing ? `/vendors/${vendor!.id}` : "/vendors", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "An error occurred");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-md border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{vendor ? "Edit Vendor" : "Add Vendor"}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Company Name</label>
              <input
                required
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <input
                required
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GST Number</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Name</label>
              <input
                required
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Phone</label>
              <input
                required
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
