export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  country?: string;
  phone_number?: string;
  photo_url?: string;
  additional_info?: string;
  created_at: string;
  updated_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  gst_number?: string;
  category?: string;
  contact_number?: string;
  email?: string;
  country?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type RFQLineItem = {
  id: string;
  rfq_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at?: string;
};

export type RFQAttachment = {
  id: string;
  rfq_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export type RFQ = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  deadline?: string | null;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type QuotationLineItem = {
  id: string;
  quotation_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
};

export type Quotation = {
  id: string;
  rfq_id: string;
  vendor_id: string;
  total_amount: number;
  delivery_days?: number;
  rating?: number;
  payment_terms?: string;
  gst_percent?: number;
  status: string;
  selected: boolean;
  created_at: string;
  updated_at: string;
};

export type Approval = {
  id: string;
  quotation_id: string;
  rfq_title?: string;
  vendor_name?: string;
  approver_id?: string;
  level: string;
  status: string;
  remarks?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  rfq_id?: string;
  rfq_title?: string;
  quotation_id?: string;
  vendor_id?: string;
  vendor_name?: string;
  status: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  po_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  po_id: string;
  rfq_title?: string;
  vendor_id?: string;
  vendor_name?: string;
  invoice_date?: string | null;
  due_date?: string | null;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  actor_id?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
};

export type DashboardMetrics = {
  total_spend: number;
  active_rfqs: number;
  pending_approvals: number;
  pos_this_month: number;
  overdue_invoices: number;
};

export type SpendTrendPoint = {
  month: string;
  amount: number;
};

export type CategorySpend = {
  category: string;
  amount: number;
};

export type VendorStats = {
  id: string;
  name: string;
  quotes_count: number;
  awarded_count: number;
  avg_delivery_days: number;
  total_revenue: number;
};

export type ProcurementStats = {
  total_rfqs: number;
  total_quotations: number;
  total_pos: number;
  total_spend: number;
  avg_quote_amount: number;
  category_spend: CategorySpend[];
  vendor_performance: VendorStats[];
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  role?: string;
  country?: string;
  phone_number?: string;
  photo_url?: string;
  additional_info?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
