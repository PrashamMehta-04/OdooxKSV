export const apiRouteMap = {
  auth: {
    signup: "POST /api/auth/signup",
    login: "POST /api/auth/login",
    refresh: "POST /api/auth/refresh",
    forgotPassword: "POST /api/auth/forgot-password",
    me: "GET /api/auth/me",
    logout: "POST /api/auth/logout"
  },
  users: {
    list: "GET /api/users",
    create: "POST /api/users",
    update: "PATCH /api/users/:id",
    deactivate: "PATCH /api/users/:id/deactivate"
  },
  vendors: {
    list: "GET /api/vendors",
    create: "POST /api/vendors",
    detail: "GET /api/vendors/:id",
    update: "PATCH /api/vendors/:id",
    status: "PATCH /api/vendors/:id/status"
  },
  rfqs: {
    list: "GET /api/rfqs",
    create: "POST /api/rfqs",
    detail: "GET /api/rfqs/:id",
    update: "PATCH /api/rfqs/:id",
    inviteVendors: "POST /api/rfqs/:id/invitations"
  },
  quotations: {
    listForRfq: "GET /api/rfqs/:rfqId/quotations",
    submit: "POST /api/rfqs/:rfqId/quotations",
    update: "PATCH /api/quotations/:id",
    compare: "GET /api/rfqs/:rfqId/quotation-comparison",
    selectForApproval: "POST /api/quotations/:id/approval-request"
  },
  approvals: {
    list: "GET /api/approvals",
    detail: "GET /api/approvals/:id",
    approve: "POST /api/approvals/:id/approve",
    reject: "POST /api/approvals/:id/reject"
  },
  purchaseOrders: {
    list: "GET /api/purchase-orders",
    createFromApproval: "POST /api/approvals/:id/purchase-order",
    detail: "GET /api/purchase-orders/:id",
    updateStatus: "PATCH /api/purchase-orders/:id/status"
  },
  invoices: {
    list: "GET /api/invoices",
    createFromPurchaseOrder: "POST /api/purchase-orders/:id/invoice",
    detail: "GET /api/invoices/:id",
    downloadPdf: "GET /api/invoices/:id/pdf",
    email: "POST /api/invoices/:id/email",
    updateStatus: "PATCH /api/invoices/:id/status"
  },
  activity: {
    list: "GET /api/activity-logs",
    byEntity: "GET /api/activity-logs/:entityType/:entityId"
  },
  notifications: {
    list: "GET /api/notifications",
    markRead: "PATCH /api/notifications/:id/read"
  },
  reports: {
    summary: "GET /api/reports/summary",
    vendorPerformance: "GET /api/reports/vendor-performance",
    monthlyTrends: "GET /api/reports/monthly-trends",
    export: "GET /api/reports/export"
  }
} as const;
