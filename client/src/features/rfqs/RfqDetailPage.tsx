import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileText, Package, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface RfqDetails {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  deadline: string;
  attachmentUrl: string | null;
  createdByName: string;
  createdAt: string;
  invitations: Array<{
    id: string;
    status: string;
    invitedAt: string;
    vendorId: string;
    companyName: string;
  }>;
}

interface Quotation {
  id: string;
  rfqId: string;
  vendorId: string;
  unitPrice: string;
  totalPrice: string;
  deliveryDays: number;
  notes: string | null;
  status: string;
  submittedAt: string;
  companyName: string;
}

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    unitPrice: "",
    deliveryDays: "",
    notes: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  const rfqQuery = useQuery({
    queryKey: ["rfqs", id],
    queryFn: () =>
      apiRequest<RfqDetails>(`/rfqs/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }),
    enabled: Boolean(accessToken && id)
  });

  const quotationsQuery = useQuery({
    queryKey: ["quotations", "rfq", id],
    queryFn: () =>
      apiRequest<Quotation[]>(`/quotations/rfq/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }),
    enabled: Boolean(accessToken && id)
  });

  const quoteMutation = useMutation({
    mutationFn: (data: any) => {
      if (myQuote && isEditing) {
        return apiRequest(`/quotations/${myQuote.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest("/quotations", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ ...data, rfqId: id })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations", "rfq", id] });
      queryClient.invalidateQueries({ queryKey: ["rfqs", id] });
      setIsEditing(false);
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to submit quotation");
    }
  });

  const rfq = rfqQuery.data;
  const quotes = quotationsQuery.data ?? [];
  const myQuote = quotes[0]; // For vendors, it will only return their quote

  if (rfqQuery.isLoading || quotationsQuery.isLoading) {
    return (
      <AppShell title="RFQ Details" eyebrow="Procurement">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Loading RFQ details...
        </div>
      </AppShell>
    );
  }

  if (!rfq) {
    return (
      <AppShell title="RFQ Details" eyebrow="Procurement">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          RFQ not found.
        </div>
      </AppShell>
    );
  }

  const isProcurement = user?.role === "PROCUREMENT_OFFICER" || user?.role === "ADMIN";
  const deadlinePassed = new Date() > new Date(rfq.deadline);

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (deadlinePassed) {
      setError("Deadline has passed. Cannot submit/edit quotation.");
      return;
    }
    quoteMutation.mutate({
      unitPrice: Number(form.unitPrice),
      deliveryDays: Number(form.deliveryDays),
      notes: form.notes || null
    });
  };

  const handleEditClick = () => {
    if (myQuote) {
      setForm({
        unitPrice: myQuote.unitPrice,
        deliveryDays: myQuote.deliveryDays.toString(),
        notes: myQuote.notes || ""
      });
      setIsEditing(true);
    }
  };

  return (
    <AppShell title="RFQ Details" eyebrow="Procurement">
      <div className="mx-auto max-w-5xl">
        <Link
          to={isProcurement ? "/procurement/rfqs" : "/vendor/rfqs"}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFQs
        </Link>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {/* Main Info */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{rfq.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created by {rfq.createdByName} on {formatDate(rfq.createdAt)}
                  </p>
                </div>
                <StatusBadge status={rfq.status} />
              </div>
              
              <div className="prose prose-sm max-w-none text-foreground">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
                <p className="whitespace-pre-wrap">{rfq.description}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Required Quantity</p>
                    <p className="font-semibold">{rfq.quantity} {rfq.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className={`rounded-md p-2 ${deadlinePassed ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Submission Deadline</p>
                    <p className={`font-semibold ${deadlinePassed ? "text-destructive" : ""}`}>
                      {formatDate(rfq.deadline)} {deadlinePassed && "(Passed)"}
                    </p>
                  </div>
                </div>
              </div>

              {rfq.attachmentUrl && (
                <div className="mt-6">
                  <a
                    href={rfq.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Submitted Quotations (For Procurement) */}
            {isProcurement && (
              <div className="rounded-md border border-border bg-card shadow-sm">
                <div className="border-b border-border p-4">
                  <h2 className="text-lg font-semibold">Submitted Quotations ({quotes.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Vendor</th>
                        <th className="px-4 py-3 font-medium">Unit Price</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Delivery</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No quotations submitted yet.
                          </td>
                        </tr>
                      ) : (
                        quotes.map((q) => (
                          <tr key={q.id} className="transition-colors hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{q.companyName}</td>
                            <td className="px-4 py-3">₹{Number(q.unitPrice).toLocaleString()}</td>
                            <td className="px-4 py-3 font-semibold">₹{Number(q.totalPrice).toLocaleString()}</td>
                            <td className="px-4 py-3">{q.deliveryDays} days</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={q.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Vendor Invitations (Only visible to procurement/admin) */}
            {isProcurement && (
              <div className="rounded-md border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Invited Vendors</h2>
                </div>
                
                <div className="space-y-3">
                  {rfq.invitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vendors invited.</p>
                  ) : (
                    rfq.invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="truncate pr-4">
                          <p className="truncate text-sm font-medium">{inv.companyName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(inv.invitedAt)}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Vendor Actions */}
            {user?.role === "VENDOR" && (
              <div className="rounded-md border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Your Quotation</h2>
                
                {error && (
                  <div className="mb-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {!myQuote || isEditing ? (
                  <form onSubmit={handleSubmitQuote} className="space-y-4">
                    {deadlinePassed && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                        The deadline has passed. You cannot submit or edit quotations.
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit Price (₹)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={deadlinePassed}
                        value={form.unitPrice}
                        onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Total will be: ₹{Number(form.unitPrice || 0) * rfq.quantity}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Time (Days)</label>
                      <input
                        required
                        type="number"
                        min="1"
                        disabled={deadlinePassed}
                        value={form.deliveryDays}
                        onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (Optional)</label>
                      <textarea
                        disabled={deadlinePassed}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                        rows={3}
                        placeholder="Warranty info, delivery terms..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => { setIsEditing(false); setError(""); }}
                          className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={quoteMutation.isPending || deadlinePassed}
                        className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {quoteMutation.isPending ? "Saving..." : myQuote ? "Update Quote" : "Submit Quote"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <StatusBadge status={myQuote.status} />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Unit Price</p>
                        <p className="font-semibold">₹{Number(myQuote.unitPrice).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Price</p>
                        <p className="font-semibold">₹{Number(myQuote.totalPrice).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delivery</p>
                        <p className="font-semibold">{myQuote.deliveryDays} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted On</p>
                        <p className="font-semibold">{formatDate(myQuote.submittedAt)}</p>
                      </div>
                    </div>
                    
                    {myQuote.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{myQuote.notes}</p>
                      </div>
                    )}

                    {!deadlinePassed && myQuote.status !== "SELECTED" && (
                      <button
                        onClick={handleEditClick}
                        className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                      >
                        Edit Quotation
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Procurement Actions */}
            {isProcurement && (
              <div className="rounded-md border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Actions</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Compare submitted quotations and advance the workflow.
                </p>
                {quotes.length > 0 ? (
                  <Link
                    to={`/procurement/rfqs/${rfq.id}/compare`}
                    className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Compare Quotations
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
                  >
                    Compare Quotations
                  </button>
                )}
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Select the best offer from the comparison view.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
