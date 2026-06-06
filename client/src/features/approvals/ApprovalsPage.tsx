import { useQuery } from "@tanstack/react-query";
import { Clock, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface ApprovalRequest {
  id: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  rfqTitle: string;
  rfqId: string;
  vendorName: string;
  totalPrice: string;
  requestedByName: string;
}

export function ApprovalsPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState("");

  const approvalsQuery = useQuery({
    queryKey: ["approvals"],
    queryFn: () =>
      apiRequest<ApprovalRequest[]>("/approvals", {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const approvals = approvalsQuery.data ?? [];
  const filteredApprovals = approvals.filter(
    (a) =>
      a.rfqTitle.toLowerCase().includes(search.toLowerCase()) ||
      a.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      a.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Approvals" eyebrow="Management">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search approvals..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvalsQuery.isLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading approvals...</div>
          ) : filteredApprovals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">No approval requests found.</div>
          ) : (
            filteredApprovals.map((approval) => (
              <Link
                key={approval.id}
                to={`/approvals/${approval.id}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <StatusBadge status={approval.status} />
                </div>
                
                <h3 className="mb-1 text-lg font-semibold truncate">{approval.rfqTitle}</h3>
                <p className="mb-4 text-sm text-muted-foreground truncate">Vendor: {approval.vendorName}</p>
                
                <div className="mt-auto border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold">₹{Number(approval.totalPrice).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(approval.requestedAt)}
                    </span>
                    <span>By {approval.requestedByName}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
