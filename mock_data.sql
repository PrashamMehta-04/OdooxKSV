DO $$ 
DECLARE
    v1_id UUID := gen_random_uuid();
    v2_id UUID := gen_random_uuid();
    v3_id UUID := gen_random_uuid();
    
    rfq1_id UUID := gen_random_uuid();
    rfq2_id UUID := gen_random_uuid();
    
    q1_id UUID := gen_random_uuid();
    q2_id UUID := gen_random_uuid();
    
    po1_id UUID := gen_random_uuid();
    po2_id UUID := gen_random_uuid();
    po3_id UUID := gen_random_uuid();
    po4_id UUID := gen_random_uuid();
    po5_id UUID := gen_random_uuid();
BEGIN

-- Insert Vendors
INSERT INTO vendors (id, name, category, status, email) VALUES 
(v1_id, 'TechCorp Supplies', 'IT Equipment', 'approved', 'techcorp@example.com'),
(v2_id, 'Global Furnishings', 'Furniture', 'approved', 'globalfurn@example.com'),
(v3_id, 'OfficeMart', 'Stationary', 'approved', 'officemart@example.com')
ON CONFLICT (email) DO NOTHING;

-- Retrieve actual IDs in case they already existed or just use the generated ones (assuming clean slate for these emails)
SELECT id INTO v1_id FROM vendors WHERE email = 'techcorp@example.com';
SELECT id INTO v2_id FROM vendors WHERE email = 'globalfurn@example.com';
SELECT id INTO v3_id FROM vendors WHERE email = 'officemart@example.com';

-- Insert RFQs
INSERT INTO rfqs (id, title, category, status, created_at) VALUES 
(rfq1_id, 'Q1 IT Hardware Refresh', 'IT Equipment', 'approved', NOW() - INTERVAL '5 months'),
(rfq2_id, 'New Office Furniture', 'Furniture', 'approved', NOW() - INTERVAL '2 months');

-- Assign Vendors
INSERT INTO rfq_vendor_assignments (rfq_id, vendor_id) VALUES 
(rfq1_id, v1_id),
(rfq2_id, v2_id);

-- Insert Quotations
INSERT INTO quotations (id, rfq_id, vendor_id, total_amount, status, selected, created_at) VALUES 
(q1_id, rfq1_id, v1_id, 150000, 'approved', true, NOW() - INTERVAL '5 months'),
(q2_id, rfq2_id, v2_id, 75000, 'approved', true, NOW() - INTERVAL '2 months');

-- Insert POs
INSERT INTO purchase_orders (id, po_number, rfq_id, quotation_id, vendor_id, status, subtotal, gst_amount, grand_total, po_date, created_at) VALUES 
(po1_id, 'PO-2026-001', rfq1_id, q1_id, v1_id, 'approved', 150000, 15000, 165000, CURRENT_DATE - INTERVAL '5 months', NOW() - INTERVAL '5 months'),
(po2_id, 'PO-2026-002', rfq2_id, q2_id, v2_id, 'approved', 75000, 7500, 82500, CURRENT_DATE - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(po3_id, 'PO-2026-003', NULL, NULL, v3_id, 'approved', 20000, 2000, 22000, CURRENT_DATE - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(po4_id, 'PO-2026-004', NULL, NULL, v1_id, 'approved', 45000, 4500, 49500, CURRENT_DATE - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(po5_id, 'PO-2026-005', NULL, NULL, v3_id, 'approved', 12000, 1200, 13200, CURRENT_DATE - INTERVAL '1 month', NOW() - INTERVAL '1 month');

-- Insert Invoices to populate the chart spanning the last 6 months
INSERT INTO invoices (invoice_number, po_id, vendor_id, invoice_date, due_date, subtotal, gst_amount, grand_total, status, created_at) VALUES 
('INV-2026-001', po1_id, v1_id, CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '4 months', 150000, 15000, 165000, 'paid', NOW() - INTERVAL '5 months'),
('INV-2026-002', po3_id, v3_id, CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '3 months', 20000, 2000, 22000, 'paid', NOW() - INTERVAL '4 months'),
('INV-2026-003', po4_id, v1_id, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '2 months', 45000, 4500, 49500, 'paid', NOW() - INTERVAL '3 months'),
('INV-2026-004', po2_id, v2_id, CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '1 month', 75000, 7500, 82500, 'paid', NOW() - INTERVAL '2 months'),
('INV-2026-005', po5_id, v3_id, CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE, 12000, 1200, 13200, 'issued', NOW() - INTERVAL '1 month'),
('INV-2026-006', po1_id, v1_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 35000, 3500, 38500, 'issued', NOW());

END $$;
