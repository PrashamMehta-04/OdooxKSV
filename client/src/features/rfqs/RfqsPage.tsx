import { useQuery } from "@tanstack/react-query";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, StatusBadge, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface Rfq {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  deadline: string;
  createdByName: string;
  createdAt: string;
}

export function RfqsPage() {
  const { accessToken, user } = useAuth();
  const [search, setSearch] = useState("");

  const rfqsQuery = useQuery({
    queryKey: ["rfqs"],
    queryFn: () =>
      apiRequest<Rfq[]>("/rfqs", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }),
    enabled: Boolean(accessToken)
  });

  const rfqs = rfqsQuery.data ?? [];
  const filteredRfqs = rfqs.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="RFQs" eyebrow="Module">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search RFQs..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {user?.role === "PROCUREMENT_OFFICER" && (
            <Link
              to="/procurement/rfqs/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create RFQ
            </Link>
          )}
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">RFQ Title</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rfqsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading RFQs...
                    </td>
                  </tr>
                ) : filteredRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No RFQs found.
                    </td>
                  </tr>
                ) : (
                  filteredRfqs.map((rfq) => (
                    <tr key={rfq.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <p className="font-medium">{rfq.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {rfq.quantity} {rfq.unit}
                      </td>
                      <td className="px-4 py-3">
                        <p>{formatDate(rfq.deadline)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{rfq.createdByName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(rfq.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rfq.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={user?.role === "VENDOR" ? `/vendor/rfqs/${rfq.id}` : `/procurement/rfqs/${rfq.id}`}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
