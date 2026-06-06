export type UserRole = 'admin' | 'procurement_officer' | 'vendor' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  vendorId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstNumber?: string;
  category: string;
  contactPerson: string;
  address?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RFQItem {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  description: string;
}

export interface RFQ {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  status: 'draft' | 'sent' | 'closed' | 'cancelled';
  attachmentUrl?: string;
  items: RFQItem[];
  rfqVendors?: Array<{ id: string; vendorId: string; vendor: Vendor }>;
  vendors?: Vendor[] | string[];
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id?: string;
  rfqItemId: string | RFQItem;
  rfqItem?: RFQItem;
  unitPrice: number;
  notes?: string;
  totalPrice?: number;
}

export interface Quotation {
  id: string;
  rfqId: RFQ | string;
  rfq?: RFQ;
  vendorId: Vendor | string;
  vendor?: Vendor;
  items: QuotationItem[];
  totalAmount: number;
  deliveryTimeline: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'selected' | 'rejected';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  quotationId: Quotation | string;
  quotation?: Quotation;
  requestedBy?: User | string;
  approverId?: string;
  approver?: User;
  approvedBy?: User | string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  purchaseOrder?: PurchaseOrder;
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  approvalId: Approval | string;
  approval?: Approval;
  invoice?: Invoice;
  vendorId?: Vendor | string;
  items?: POItem[];
  subtotal?: number;
  tax?: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  createdBy?: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: PurchaseOrder | string;
  purchaseOrder?: PurchaseOrder;
  vendorId?: Vendor | string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  taxAmount: number;
  totalAmount: number;
  status: 'generated' | 'sent' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  pendingApprovals: number;
  activeRFQs: number;
  totalVendors: number;
  totalPOs: number;
  totalInvoices: number;
  totalSpend: number;
  recentPOs: PurchaseOrder[];
  recentInvoices: Invoice[];
  analyticsCards?: Record<string, number>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: User | string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface MonthlyTrend {
  month: string;
  purchaseOrders: number;
  invoices: number;
  spend: number;
}

export interface VendorPerformance {
  vendorName: string;
  totalQuotations: number;
  selectedQuotations: number;
  winRate: number;
  avgDeliveryDays?: number;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
}

export interface ProcurementStats {
  totalRFQs: number;
  totalQuotations: number;
  totalApprovals: number;
  totalPOs: number;
  totalInvoices: number;
  totalSpend: number;
  avgPOValue: number;
  pendingApprovals: number;
}
