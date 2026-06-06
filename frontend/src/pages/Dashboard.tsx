import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Building2,
  ShoppingCart,
  Receipt,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import { DashboardData, PurchaseOrder, Invoice } from "../types";
import { getInvoiceVendor, getPurchaseOrderVendor } from "../utils/procurement";
import { StatCard } from "../components/ui/Card";
import { getStatusBadge } from "../components/ui/Badge";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<
    Array<{
      month: string;
      purchaseOrders: number;
      invoices: number;
      spend: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchTrends();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get("/reports/monthly-trends");
      if (res.data.success) {
        setTrends(res.data.data || []);
      }
    } catch {
      // silent
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), "MMM d, yyyy");
    } catch {
      return d;
    }
  };

  const poColumns = [
    {
      header: "PO Number",
      render: (row: PurchaseOrder) => (
        <Link
          to={`/purchase-orders/${row.id}`}
          className="font-medium text-primary-600 hover:underline"
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      header: "Vendor",
      render: (row: PurchaseOrder) => (
        <span>{getPurchaseOrderVendor(row)?.name || "-"}</span>
      ),
    },
    {
      header: "Total",
      render: (row: PurchaseOrder) => formatCurrency(row.totalAmount),
    },
    {
      header: "Status",
      render: (row: PurchaseOrder) => getStatusBadge(row.status),
    },
    {
      header: "Date",
      render: (row: PurchaseOrder) => formatDate(row.createdAt),
    },
  ];

  const invoiceColumns = [
    {
      header: "Invoice #",
      render: (row: Invoice) => (
        <Link
          to={`/invoices/${row.id}`}
          className="font-medium text-primary-600 hover:underline"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      header: "Vendor",
      render: (row: Invoice) => (
        <span>{getInvoiceVendor(row)?.name || "-"}</span>
      ),
    },
    {
      header: "Total",
      render: (row: Invoice) => formatCurrency(row.totalAmount),
    },
    { header: "Status", render: (row: Invoice) => getStatusBadge(row.status) },
    { header: "Date", render: (row: Invoice) => formatDate(row.createdAt) },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of your procurement operations
          </p>
        </div>
        {/* Quick actions by role */}
        <div className="flex gap-2">
          {(user?.role === "procurement_officer" || user?.role === "admin") && (
            <Link to="/rfqs/new">
              <Button size="sm" leftIcon={<Plus size={14} />}>
                Create RFQ
              </Button>
            </Link>
          )}
          {user?.role === "vendor" && (
            <Link to="/quotations/new">
              <Button size="sm" leftIcon={<Plus size={14} />}>
                New Quotation
              </Button>
            </Link>
          )}
          {user?.role === "manager" && (
            <Link to="/approvals">
              <Button size="sm" leftIcon={<ClipboardList size={14} />}>
                View Approvals
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Pending Approvals"
          value={data?.pendingApprovals ?? 0}
          icon={<ClipboardList size={20} />}
          colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Active RFQs"
          value={data?.activeRFQs ?? 0}
          icon={<FileText size={20} />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Vendors"
          value={data?.totalVendors ?? 0}
          icon={<Building2 size={20} />}
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard
          title="Purchase Orders"
          value={data?.totalPOs ?? 0}
          icon={<ShoppingCart size={20} />}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Total Invoices"
          value={data?.totalInvoices ?? 0}
          icon={<Receipt size={20} />}
          colorClass="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Total Spend"
          value={formatCurrency(data?.totalSpend ?? 0)}
          icon={<DollarSign size={20} />}
          colorClass="bg-primary-50 text-primary-600"
        />
      </div>

      {/* Monthly trends chart */}
      {trends.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Monthly Procurement Trends
            </h3>
            {(user?.role === "admin" || user?.role === "manager") && (
              <Link
                to="/reports"
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                Full report <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={trends}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
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
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="invoices"
                name="Invoices"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent POs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Purchase Orders
            </h3>
            <Link
              to="/purchase-orders"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <Table
            columns={poColumns}
            data={data?.recentPOs || []}
            keyExtractor={(r) => r.id}
            emptyMessage="No purchase orders yet"
          />
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Invoices
            </h3>
            <Link
              to="/invoices"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <Table
            columns={invoiceColumns}
            data={data?.recentInvoices || []}
            keyExtractor={(r) => r.id}
            emptyMessage="No invoices yet"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
