import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { VendorPerformance, SpendingByCategory, MonthlyTrend, ProcurementStats } from '../../types';
import Card, { StatCard } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import {
  ShoppingCart, Receipt, FileText, DollarSign, ClipboardList, CheckSquare, Download,
} from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const Reports: React.FC = () => {
  const [vendorPerf, setVendorPerf] = useState<VendorPerformance[]>([]);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [perfRes, spendRes, trendRes, statsRes] = await Promise.allSettled([
        api.get('/reports/vendor-performance'),
        api.get('/reports/spending-summary'),
        api.get('/reports/monthly-trends'),
        api.get('/reports/procurement-stats'),
      ]);

      if (perfRes.status === 'fulfilled' && perfRes.value.data.success)
        setVendorPerf(perfRes.value.data.data || []);
      if (spendRes.status === 'fulfilled' && spendRes.value.data.success)
        setSpending(spendRes.value.data.data || []);
      if (trendRes.status === 'fulfilled' && trendRes.value.data.success)
        setTrends(trendRes.value.data.data || []);
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success)
        setStats(statsRes.value.data.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Procurement performance overview</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={() => exportToCSV([...vendorPerf, ...spending, ...trends], 'procurement_report')}>
          Export Global Report
        </Button>
      </div>

      {/* Section 1: Procurement Stats */}
      {stats && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Procurement Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total RFQs"
              value={stats.totalRFQs}
              icon={<FileText size={18} />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard
              title="Total Quotations"
              value={stats.totalQuotations}
              icon={<ClipboardList size={18} />}
              colorClass="bg-purple-50 text-purple-600"
            />
            <StatCard
              title="Total POs"
              value={stats.totalPOs}
              icon={<ShoppingCart size={18} />}
              colorClass="bg-green-50 text-green-600"
            />
            <StatCard
              title="Total Invoices"
              value={stats.totalInvoices}
              icon={<Receipt size={18} />}
              colorClass="bg-orange-50 text-orange-600"
            />
            <StatCard
              title="Total Approvals"
              value={stats.totalApprovals}
              icon={<CheckSquare size={18} />}
              colorClass="bg-yellow-50 text-yellow-600"
            />
            <StatCard
              title="Pending Approvals"
              value={stats.pendingApprovals}
              icon={<ClipboardList size={18} />}
              colorClass="bg-red-50 text-red-600"
            />
            <StatCard
              title="Avg PO Value"
              value={formatCurrency(stats.avgPOValue || 0)}
              icon={<DollarSign size={18} />}
              colorClass="bg-primary-50 text-primary-600"
            />
            <StatCard
              title="Total Spend"
              value={formatCurrency(stats.totalSpend || 0)}
              icon={<DollarSign size={18} />}
              colorClass="bg-primary-50 text-primary-600"
            />
          </div>
        </div>
      )}

      {/* Section 2: Vendor Performance */}
      {vendorPerf.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Vendor Performance
            </h2>
            <Button variant="outline" size="sm" leftIcon={<Download size={12} />} onClick={() => exportToCSV(vendorPerf, 'vendor_performance')}>
              Export CSV
            </Button>
          </div>
          <Card>
            <p className="text-xs text-gray-500 mb-4">Win rate per vendor (% of quotations selected)</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorPerf} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="vendorName"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Win Rate']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="winRate" name="Win Rate (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Section 3: Spending by Category */}
      {spending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Spending by Category
            </h2>
            <Button variant="outline" size="sm" leftIcon={<Download size={12} />} onClick={() => exportToCSV(spending, 'spending_by_category')}>
              Export CSV
            </Button>
          </div>
          <Card>
            <p className="text-xs text-gray-500 mb-4">Distribution of procurement spend across vendor categories</p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={spending}
                    dataKey="totalSpend"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {spending.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Section 4: Monthly Trends */}
      {trends.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Monthly Trends
          </h2>
          <Card>
            <p className="text-xs text-gray-500 mb-4">Purchase orders and invoices generated per month</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="purchaseOrders"
                  name="Purchase Orders"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoices"
                  name="Invoices"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {vendorPerf.length === 0 && spending.length === 0 && trends.length === 0 && !stats && (
        <Card>
          <div className="py-12 text-center text-gray-500">
            <p>No report data available yet. Start creating RFQs and purchase orders to see analytics.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;
