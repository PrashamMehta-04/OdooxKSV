import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Clock, FileText } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { AppShell } from "../../App";
import { useAuth } from "../../auth/auth-context";
import { apiRequest } from "../../lib/api";

interface ReportsData {
  spending: { month: string; amount: number }[];
  vendors: { name: string; orderCount: number; totalSpend: number }[];
  avgTurnaroundDays: number;
  rfqDistribution: { name: string; value: number }[];
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

export function ReportsPage() {
  const { accessToken, user } = useAuth();

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () =>
      apiRequest<ReportsData>("/reports", {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    enabled: Boolean(accessToken)
  });

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  return (
    <AppShell title="Reports & Analytics" eyebrow={user?.role === "ADMIN" ? "Admin" : "Manager"}>
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend (6m)</p>
                <p className="text-2xl font-bold">
                  {currency.format(reportsQuery.data?.spending.reduce((acc, curr) => acc + curr.amount, 0) || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. RFQ Turnaround</p>
                <p className="text-2xl font-bold">
                  {reportsQuery.data?.avgTurnaroundDays ? Math.round(reportsQuery.data.avgTurnaroundDays) : 0} days
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-green-100 p-2 text-green-600 dark:bg-green-900/50 dark:text-green-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total RFQs</p>
                <p className="text-2xl font-bold">
                  {reportsQuery.data?.rfqDistribution.reduce((acc, curr) => acc + curr.value, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {reportsQuery.isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading reports...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Spending Trend Chart */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Spending Trend (Last 6 Months)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportsQuery.data?.spending}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                    <XAxis dataKey="month" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis 
                      tickFormatter={(value) => `$${value >= 1000 ? (value/1000) + 'k' : value}`}
                      tick={{fill: '#888', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      formatter={(value: any) => currency.format(Number(value) || 0)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vendor Performance Chart */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Top Vendors by Order Volume
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportsQuery.data?.vendors} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#888" opacity={0.2} />
                    <XAxis type="number" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} width={100} />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="orderCount" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} name="Total Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RFQ Status Distribution */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                RFQ Status Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportsQuery.data?.rfqDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {reportsQuery.data?.rfqDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
