import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface TimelineItem {
  id: string;
  action: string;
  remarks: string | null;
  createdAt: string;
  actorName: string;
}

interface ApprovalDetails {
  id: string;
  status: string;
  remarks: string | null;
  requestedAt: string;
  decidedAt: string | null;
  rfqTitle: string;
  rfqId: string;
  rfqDescription: string;
  quantity: number;
  unit: string;
  vendorName: string;
  vendorRating: string;
  quotationId: string;
  unitPrice: string;
  totalPrice: string;
  deliveryDays: number;
  quotationNotes: string | null;
  requestedByName: string;
  approverName: string;
  timeline: TimelineItem[];
}

export function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const approvalQuery = useQuery({
    queryKey: ["approvals", id],
    queryFn: () =>
      apiRequest<ApprovalDetails>(`/approvals/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken && id)
  });

  const decisionMutation = useMutation({
    mutationFn: (status: "APPROVED" | "REJECTED") => {
      return apiRequest(`/approvals/${id}/decision`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status, remarks })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", id] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      // We stay on the page to view the updated status/timeline
    },
    onError: (err: any) => {
      setError(err.message || "Failed to submit decision.");
    }
  });

  const approval = approvalQuery.data;

  if (approvalQuery.isLoading) {
    return (
      <AppShell title="Approval Request" eyebrow="Management">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Loading approval details...
        </div>
      </AppShell>
    );
  }

  if (!approval) {
    return (
      <AppShell title="Approval Request" eyebrow="Management">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Approval request not found.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Approval Request" eyebrow="Management">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/approvals"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </Link>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {/* RFQ & Quotation Summary */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-bold tracking-tight">Review Request</h1>
                <StatusBadge status={approval.status} />
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">RFQ Details</h3>
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="font-medium">{approval.rfqTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1">Requested: {approval.quantity} {approval.unit}</p>
                    <p className="text-sm mt-2 line-clamp-3">{approval.rfqDescription}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Winning Vendor</h3>
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{approval.vendorName}</p>
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        ★ {approval.vendorRating}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Delivery: {approval.deliveryDays} Days</p>
                    {approval.quotationNotes && (
                      <p className="text-xs italic text-muted-foreground mt-2">"{approval.quotationNotes}"</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Total Contract Value</span>
                  <span className="text-2xl font-bold text-primary">₹{Number(approval.totalPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-end">
                   <span className="text-xs text-muted-foreground mt-1">(₹{Number(approval.unitPrice).toLocaleString()} per {approval.unit})</span>
                </div>
              </div>
            </div>

            {/* Manager Decision Box */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Manager Decision</h2>
              
              {approval.status === 'PENDING' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <textarea
                      required
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter justification for approval or rejection..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => decisionMutation.mutate("REJECTED")}
                      disabled={decisionMutation.isPending || !remarks.trim()}
                      className="flex-1 rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => decisionMutation.mutate("APPROVED")}
                      disabled={decisionMutation.isPending || !remarks.trim()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Note: A decision requires remarks for audit purposes.
                  </p>
                </div>
              ) : (
                <div className={`rounded-md p-4 flex items-start gap-3 ${approval.status === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {approval.status === 'APPROVED' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${approval.status === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}>
                      {approval.status === 'APPROVED' ? 'Request Approved' : 'Request Rejected'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Decided by {approval.approverName} on {formatDate(approval.decidedAt!)}</p>
                    {approval.remarks && (
                      <div className="mt-3 text-sm italic bg-white/50 p-2 rounded border border-black/5">
                        "{approval.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Timeline */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Approval Timeline</h2>
              </div>
              
              <div className="relative border-l border-border ml-3 mt-4 space-y-6 pb-2">
                {approval.timeline.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary"></div>
                    <div>
                      <p className="text-sm font-medium">{item.action === 'PENDING' ? 'Requested' : item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.actorName} • {formatDate(item.createdAt)}</p>
                      {item.remarks && (
                        <p className="mt-1 text-sm text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                          {item.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
              {approval.status === "APPROVED" ? (
                <div>
                   <p className="text-sm text-muted-foreground mb-4">
                     This quotation has been approved! The Procurement Officer can now convert it into a Purchase Order.
                   </p>
                   <Link to="/procurement/invoices" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                     <FileText className="h-4 w-4" /> Go to Purchase Orders
                   </Link>
                </div>
              ) : approval.status === "REJECTED" ? (
                <p className="text-sm text-muted-foreground">
                  This quotation was rejected. The Procurement Officer must select an alternative vendor quotation.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Awaiting your decision. Please review the details carefully.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
