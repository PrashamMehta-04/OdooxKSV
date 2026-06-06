package domain

import "time"

type User struct {
	ID             string    `json:"id"`
	FullName       string    `json:"full_name"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	Country        string    `json:"country,omitempty"`
	PhoneNumber    string    `json:"phone_number,omitempty"`
	PhotoURL       string    `json:"photo_url,omitempty"`
	AdditionalInfo string    `json:"additional_info,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Vendor struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	GSTNumber     string    `json:"gst_number,omitempty"`
	Category      string    `json:"category,omitempty"`
	ContactNumber string    `json:"contact_number,omitempty"`
	Email         string    `json:"email,omitempty"`
	Country       string    `json:"country,omitempty"`
	Status        string    `json:"status"`
	Notes         string    `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type RFQLineItem struct {
	ID        string    `json:"id"`
	RFQID     string    `json:"rfq_id"`
	ItemName  string    `json:"item_name"`
	Quantity  float64   `json:"quantity"`
	Unit      string    `json:"unit"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RFQAttachment struct {
	ID        string    `json:"id"`
	RFQID     string    `json:"rfq_id"`
	FileName  string    `json:"file_name"`
	FileURL   string    `json:"file_url"`
	CreatedAt time.Time `json:"created_at"`
}

type RFQ struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Category    string    `json:"category,omitempty"`
	Deadline    *time.Time `json:"deadline,omitempty"`
	Status      string    `json:"status"`
	CreatedBy   string    `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type QuotationLineItem struct {
	ID          string    `json:"id"`
	QuotationID string    `json:"quotation_id"`
	ItemName    string    `json:"item_name"`
	Quantity    float64   `json:"quantity"`
	UnitPrice   float64   `json:"unit_price"`
	TotalAmount float64   `json:"total_amount"`
	CreatedAt   time.Time `json:"created_at"`
}

type Quotation struct {
	ID           string    `json:"id"`
	RFQID        string    `json:"rfq_id"`
	VendorID     string    `json:"vendor_id"`
	TotalAmount  float64   `json:"total_amount"`
	DeliveryDays int       `json:"delivery_days,omitempty"`
	Rating       float64   `json:"rating,omitempty"`
	PaymentTerms string    `json:"payment_terms,omitempty"`
	GSTPercent   float64   `json:"gst_percent,omitempty"`
	Status       string    `json:"status"`
	Selected     bool      `json:"selected"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Approval struct {
	ID          string     `json:"id"`
	QuotationID string     `json:"quotation_id"`
	RFQTitle    string     `json:"rfq_title,omitempty"`
	VendorName  string     `json:"vendor_name,omitempty"`
	ApproverID  string     `json:"approver_id,omitempty"`
	Level       string     `json:"level"`
	Status      string     `json:"status"`
	Remarks     string     `json:"remarks,omitempty"`
	ApprovedAt  *time.Time `json:"approved_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type PurchaseOrder struct {
	ID          string     `json:"id"`
	PONumber    string     `json:"po_number"`
	RFQID       string     `json:"rfq_id,omitempty"`
	RFQTitle    string     `json:"rfq_title,omitempty"`
	QuotationID string     `json:"quotation_id,omitempty"`
	VendorID    string     `json:"vendor_id,omitempty"`
	VendorName  string     `json:"vendor_name,omitempty"`
	Status      string     `json:"status"`
	Subtotal    float64    `json:"subtotal"`
	GSTAmount   float64    `json:"gst_amount"`
	GrandTotal  float64    `json:"grand_total"`
	PODate      *time.Time `json:"po_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Invoice struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	POID          string     `json:"po_id"`
	RFQTitle      string     `json:"rfq_title,omitempty"`
	VendorID      string     `json:"vendor_id,omitempty"`
	VendorName    string     `json:"vendor_name,omitempty"`
	InvoiceDate   *time.Time `json:"invoice_date,omitempty"`
	DueDate       *time.Time `json:"due_date,omitempty"`
	Subtotal      float64    `json:"subtotal"`
	GSTAmount     float64    `json:"gst_amount"`
	GrandTotal    float64    `json:"grand_total"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type ActivityLog struct {
	ID         string         `json:"id"`
	ActorID    string         `json:"actor_id,omitempty"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id,omitempty"`
	Action     string         `json:"action"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  time.Time      `json:"created_at"`
}

type DashboardMetrics struct {
	TotalSpend       float64 `json:"total_spend"`
	ActiveRFQs       int     `json:"active_rfqs"`
	PendingApprovals int     `json:"pending_approvals"`
	POsThisMonth     int     `json:"pos_this_month"`
	OverdueInvoices  int     `json:"overdue_invoices"`
}

type SpendTrendPoint struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type CategorySpend struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

type VendorStats struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	QuotesCount  int     `json:"quotes_count"`
	AwardedCount int     `json:"awarded_count"`
	AvgDelivery  float64 `json:"avg_delivery_days"`
	TotalRevenue float64 `json:"total_revenue"`
}

type ProcurementStats struct {
	TotalRFQs        int             `json:"total_rfqs"`
	TotalQuotations  int             `json:"total_quotations"`
	TotalPOs         int             `json:"total_pos"`
	TotalSpend       float64         `json:"total_spend"`
	AvgQuoteAmount   float64         `json:"avg_quote_amount"`
	CategorySpend    []CategorySpend `json:"category_spend"`
	VendorPerformance []VendorStats   `json:"vendor_performance"`
}

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Link      string    `json:"link,omitempty"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthClaims struct {
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	IssuedAt  time.Time `json:"issued_at"`
	ExpiresAt time.Time `json:"expires_at"`
}
