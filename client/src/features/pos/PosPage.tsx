import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  total: string;
  issuedAt: string;
  rfqTitle: string;
  vendorName: string;
}

export function PosPage() {
  const { accessToken, user } = useAuth();
  const [search, setSearch] = useState("");

  const posQuery = useQuery({
    queryKey: ["pos"],
    queryFn: () =>
      apiRequest<PurchaseOrder[]>("/pos", {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const pos = posQuery.data ?? [];
  const filteredPos = pos.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.rfqTitle.toLowerCase().includes(search.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      po.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Orders & Invoices" eyebrow={user?.role === "VENDOR" ? "Vendor" : "Procurement"}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search POs..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posQuery.isLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading orders...</div>
          ) : filteredPos.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">No Purchase Orders found.</div>
          ) : (
            filteredPos.map((po) => (
              <Link
                key={po.id}
                to={`/pos/${po.id}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <StatusBadge status={po.status} />
                </div>
                
                <h3 className="mb-1 text-lg font-semibold truncate">{po.poNumber}</h3>
                <p className="text-sm text-muted-foreground truncate mb-1">RFQ: {po.rfqTitle}</p>
                <p className="mb-4 text-sm font-medium truncate">Vendor: {po.vendorName}</p>
                
                <div className="mt-auto border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold">₹{Number(po.total).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    Issued {formatDate(po.issuedAt)}
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
