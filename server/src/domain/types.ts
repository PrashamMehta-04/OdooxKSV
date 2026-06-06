export const roles = ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"] as const;
export type Role = (typeof roles)[number];

export const userStatuses = ["ACTIVE", "INVITED", "SUSPENDED"] as const;
export type UserStatus = (typeof userStatuses)[number];

export const vendorStatuses = ["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED"] as const;
export type VendorStatus = (typeof vendorStatuses)[number];

export const rfqStatuses = [
  "DRAFT",
  "SENT",
  "QUOTING",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "REJECTED",
  "CLOSED"
] as const;
export type RfqStatus = (typeof rfqStatuses)[number];

export const invitationStatuses = ["SENT", "VIEWED", "QUOTED", "DECLINED"] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const quotationStatuses = ["DRAFT", "SUBMITTED", "REVISED", "SELECTED", "REJECTED"] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];

export const approvalStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

export const purchaseOrderStatuses = [
  "DRAFT",
  "ISSUED",
  "ACKNOWLEDGED",
  "FULFILLED",
  "CANCELLED"
] as const;
export type PurchaseOrderStatus = (typeof purchaseOrderStatuses)[number];

export const invoiceStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const notificationTypes = [
  "RFQ_INVITATION",
  "APPROVAL_ALERT",
  "INVOICE_UPDATE",
  "STATUS_UPDATE"
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorRecord {
  id: string;
  companyName: string;
  category: string;
  gstNumber: string | null;
  contactName: string;
  email: string;
  phone: string;
  address: string | null;
  status: VendorStatus;
  rating: string;
  createdAt: Date;
  updatedAt: Date;
}
