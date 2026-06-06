import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Clock, DollarSign, Star, TrendingDown, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface RfqDetails {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  status: string;
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
  companyName: string;
  vendorRating: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export function QuotationComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [error, setError] = useState("");

  const rfqQuery = useQuery({
    queryKey: ["rfqs", id],
    queryFn: () =>
      apiRequest<RfqDetails>(`/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken && id)
  });

  const quotationsQuery = useQuery({
    queryKey: ["quotations", "rfq", id],
    queryFn: () =>
      apiRequest<Quotation[]>(`/quotations/rfq/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken && id)
  });

  const managersQuery = useQuery({
    queryKey: ["users", "managers"],
    queryFn: () =>
      apiRequest<User[]>(`/auth/managers`, { // We'll need to create this endpoint
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const selectMutation = useMutation({
    mutationFn: (quotationId: string) => {
      return apiRequest(`/approvals/request`, { // We'll need to create this endpoint
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rfqId: id, quotationId, approverId: selectedManagerId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs", id] });
      queryClient.invalidateQueries({ queryKey: ["quotations", "rfq", id] });
      toast.success("Quotation selected and sent for approval");
      navigate(`/procurement/rfqs/${id}`);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to select quotation.");
    }
  });

  const rfq = rfqQuery.data;
  const quotes = quotationsQuery.data ?? [];
  const managers = managersQuery.data ?? [];

  if (rfqQuery.isLoading || quotationsQuery.isLoading) {
    return (
      <AppShell title="Compare Quotations" eyebrow="Procurement">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </AppShell>
    );
  }

  if (!rfq || quotes.length === 0) {
    return (
      <AppShell title="Compare Quotations" eyebrow="Procurement">
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          No quotations available for comparison.
        </div>
      </AppShell>
    );
  }

  // Calculate lowest price and fastest delivery
  const validQuotes = quotes.filter(q => q.status !== "REJECTED");
  const lowestPrice = Math.min(...validQuotes.map(q => Number(q.totalPrice)));
  const fastestDelivery = Math.min(...validQuotes.map(q => q.deliveryDays));

  return (
    <AppShell title="Compare Quotations" eyebrow="Procurement">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/procurement/rfqs/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFQ Details
        </Link>

        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comparing Quotes: {rfq.title}</h1>
            <p className="text-muted-foreground">Required: {rfq.quantity} {rfq.unit}</p>
          </div>
          <StatusBadge status={rfq.status} />
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => {
            const isLowestPrice = Number(quote.totalPrice) === lowestPrice;
            const isFastestDelivery = quote.deliveryDays === fastestDelivery;
            
            return (
              <div key={quote.id} className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                <div className="border-b border-border p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{quote.companyName}</h3>
                    <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {quote.vendorRating}
                    </div>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>
                
                <div className="flex-1 p-5 space-y-4">
                  <div className={`rounded-lg p-3 ${isLowestPrice ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Total Price
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">₹{Number(quote.totalPrice).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground mb-1">
                        (₹{Number(quote.unitPrice).toLocaleString()} / {rfq.unit})
                      </span>
                    </div>
                    {isLowestPrice && (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
                        <TrendingDown className="h-3 w-3" />
                        Lowest Price
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg p-3 ${isFastestDelivery ? "bg-blue-50 border border-blue-200" : "bg-muted/50"}`}>
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      Delivery Timeline
                    </div>
                    <div className="text-xl font-semibold">{quote.deliveryDays} Days</div>
                    {isFastestDelivery && (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700">
                        <Clock className="h-3 w-3" />
                        Fastest Delivery
                      </div>
                    )}
                  </div>

                  {quote.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Vendor Notes</p>
                      <p className="text-sm italic text-muted-foreground bg-muted/30 rounded p-2">"{quote.notes}"</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-5 bg-muted/10">
                  {quote.status === "SELECTED" ? (
                    <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 py-2.5 text-sm font-medium text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      Selected for Approval
                    </div>
                  ) : rfq.status === "APPROVAL_PENDING" || rfq.status === "APPROVED" ? (
                    <button disabled className="w-full rounded-md bg-secondary py-2.5 text-sm font-medium text-muted-foreground opacity-50">
                      Selection Closed
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                      >
                        <option value="">Select Manager for Approval...</option>
                        {managers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!selectedManagerId) {
                            setError("Please select a Manager for approval.");
                            return;
                          }
                          selectMutation.mutate(quote.id);
                        }}
                        disabled={selectMutation.isPending}
                        className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {selectMutation.isPending ? "Selecting..." : "Select & Request Approval"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
