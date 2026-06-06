import { useQuery } from "@tanstack/react-query";
import { Activity, User, FileText, CheckCircle, Clock } from "lucide-react";
import { AppShell, formatDate } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface ActivityLog {
  id: string;
  action: string;
  message: string;
  entityType: string;
  date: string;
  actorName: string | null;
}

export function ActivityPage() {
  const { accessToken, user } = useAuth();

  const activityQuery = useQuery({
    queryKey: ["activity"],
    queryFn: () =>
      apiRequest<ActivityLog[]>("/activity", {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const getIconForAction = (action: string) => {
    if (action.includes("APPROVED") || action.includes("PAID") || action.includes("COMPLETED")) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (action.includes("CREATED") || action.includes("SUBMITTED") || action.includes("SENT")) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <Clock className="h-5 w-5 text-gray-500" />;
  };

  return (
    <AppShell title="Activity Logs" eyebrow={user?.role === "ADMIN" ? "Admin" : user?.role === "MANAGER" ? "Manager" : "Procurement"}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Activity</h1>
            <p className="text-sm text-muted-foreground">Comprehensive timeline of all procurement events.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {activityQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading activity...</div>
          ) : activityQuery.data?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No activity logs found.</div>
          ) : (
            <div className="space-y-8">
              {activityQuery.data?.map((log, index) => (
                <div key={log.id} className="relative flex gap-4">
                  {/* Timeline connecting line */}
                  {index !== activityQuery.data.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-[-2rem] w-[2px] bg-border" />
                  )}
                  
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 border-muted shadow-sm shrink-0">
                    {getIconForAction(log.action)}
                  </div>
                  
                  <div className="flex-1 pt-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.message}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded-sm text-foreground">
                            {log.action}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.actorName || "System"}
                          </span>
                        </div>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatDate(log.date)}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
