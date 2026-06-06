import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, FileText, Download } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface PoDetails {
  id: string;
  poNumber: string;
  status: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  issuedAt: string;
  rfqTitle: string;
  rfqDescription: string;
  quantity: number;
  unit: string;
  vendorName: string;
  vendorEmail: string;
  vendorAddress: string;
  unitPrice: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  createdAt: string;
  poNumber: string;
  vendorName: string;
}

export function PoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const poQuery = useQuery({
    queryKey: ["pos", id],
    queryFn: () =>
      apiRequest<PoDetails>(`/pos/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken && id)
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () =>
      apiRequest<Invoice[]>("/invoices", {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const invoiceMutation = useMutation({
    mutationFn: () => {
      return apiRequest(`/invoices`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ purchaseOrderId: id })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to submit invoice.");
    }
  });

  const payMutation = useMutation({
    mutationFn: (invoiceId: string) => {
      return apiRequest(`/invoices/${invoiceId}/pay`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: "PAID" })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  const po = poQuery.data;
  // Find invoices for this PO
  const poInvoices = invoicesQuery.data?.filter(inv => inv.poNumber === po?.poNumber) ?? [];
  const latestInvoice = poInvoices[0]; // Assuming they are sorted by created_at DESC

  if (poQuery.isLoading || invoicesQuery.isLoading) {
    return (
      <AppShell title="Purchase Order" eyebrow={user?.role === "VENDOR" ? "Vendor" : "Procurement"}>
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Loading PO details...
        </div>
      </AppShell>
    );
  }

  if (!po) {
    return (
      <AppShell title="Purchase Order" eyebrow={user?.role === "VENDOR" ? "Vendor" : "Procurement"}>
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Purchase Order not found.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Purchase Order ${po.poNumber}`} eyebrow={user?.role === "VENDOR" ? "Vendor" : "Procurement"}>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {/* Printable Document View */}
            <div className="rounded-md border border-border bg-white text-black p-8 shadow-sm">
              <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PURCHASE ORDER</h1>
                  <p className="text-sm text-gray-500 mt-1">VendorBridge Inc.</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg text-gray-900">{po.poNumber}</p>
                  <p className="text-sm text-gray-500">Date: {formatDate(po.issuedAt)}</p>
                  <div className="mt-2 inline-block">
                    <StatusBadge status={po.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Vendor Details</h3>
                  <p className="font-medium text-gray-900">{po.vendorName}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{po.vendorAddress}</p>
                  <p className="text-sm text-gray-600 mt-1">{po.vendorEmail}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Billing Address</h3>
                  <p className="font-medium text-gray-900">VendorBridge Finance</p>
                  <p className="text-sm text-gray-600 mt-1">123 Corporate Ave, Mumbai, India</p>
                  <p className="text-sm text-gray-600 mt-1">finance@vendorbridge.local</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Order Summary</h3>
                <p className="font-medium text-gray-900">{po.rfqTitle}</p>
                <p className="text-sm text-gray-600 mt-1">{po.rfqDescription}</p>
              </div>

              <table className="w-full text-left mb-8 border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-sm font-semibold text-gray-900">
                    <th className="py-3 px-2">Item Description</th>
                    <th className="py-3 px-2 text-right">Qty</th>
                    <th className="py-3 px-2 text-right">Unit Price</th>
                    <th className="py-3 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="text-sm text-gray-800">
                    <td className="py-4 px-2 font-medium">{po.rfqTitle}</td>
                    <td className="py-4 px-2 text-right">{po.quantity} {po.unit}</td>
                    <td className="py-4 px-2 text-right">₹{Number(po.unitPrice).toLocaleString()}</td>
                    <td className="py-4 px-2 text-right font-medium">₹{Number(po.subtotal).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-1/2 space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between px-2">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">₹{Number(po.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between px-2">
                    <span>Tax ({po.taxRate}%)</span>
                    <span className="font-medium text-gray-900">₹{Number(po.taxAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-gray-900 pt-3 px-2 text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{Number(po.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Vendor/Procurement Action Box */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Invoice Status</h2>
              
              {!latestInvoice ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No invoice has been submitted for this Purchase Order yet.
                  </p>
                  
                  {user?.role === "VENDOR" ? (
                    <button
                      onClick={() => invoiceMutation.mutate()}
                      disabled={invoiceMutation.isPending || po.status === 'CANCELLED'}
                      className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      {invoiceMutation.isPending ? "Submitting..." : "Submit Invoice for Payment"}
                    </button>
                  ) : (
                    <button disabled className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
                      Awaiting Vendor Invoice
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border border-border p-4 bg-muted/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{latestInvoice.invoiceNumber}</span>
                      <StatusBadge status={latestInvoice.status} />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">₹{Number(latestInvoice.total).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span>{formatDate(latestInvoice.createdAt)}</span>
                    </div>
                  </div>

                  {user?.role === "PROCUREMENT_OFFICER" && latestInvoice.status === "SENT" && (
                    <div className="pt-2">
                      <button
                        onClick={() => payMutation.mutate(latestInvoice.id)}
                        disabled={payMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {payMutation.isPending ? "Processing..." : "Process Payment"}
                      </button>
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        Marks the invoice as PAID and completes the PO.
                      </p>
                    </div>
                  )}

                  {latestInvoice.status === "PAID" && (
                    <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <div>
                        <strong>Payment Completed.</strong> The transaction for this PO is fully resolved.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
