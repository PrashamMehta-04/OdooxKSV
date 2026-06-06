import { Invoice, InvoiceItem, POItem, PurchaseOrder, QuotationItem, Vendor } from '../types';

export function getPurchaseOrderVendor(po: PurchaseOrder): Vendor | null {
  const directVendor = po.vendorId;
  if (typeof directVendor === 'object') return directVendor;
  return po.approval?.quotation?.vendor ?? null;
}

export function getPurchaseOrderItems(po: PurchaseOrder): POItem[] {
  if (po.items?.length) return po.items;
  return quotationItemsToOrderItems(po.approval?.quotation?.items ?? []);
}

export function getPurchaseOrderSubtotal(po: PurchaseOrder): number {
  return po.subtotal ?? po.approval?.quotation?.totalAmount ?? Math.max(po.totalAmount - po.taxAmount, 0);
}

export function getPurchaseOrderTax(po: PurchaseOrder): number {
  return po.tax ?? po.taxAmount ?? 0;
}

export function getInvoiceVendor(invoice: Invoice): Vendor | null {
  const directVendor = invoice.vendorId;
  if (typeof directVendor === 'object') return directVendor;
  return getInvoicePurchaseOrder(invoice)?.approval?.quotation?.vendor ?? null;
}

export function getInvoicePurchaseOrder(invoice: Invoice): PurchaseOrder | null {
  if (typeof invoice.purchaseOrderId === 'object') return invoice.purchaseOrderId;
  return invoice.purchaseOrder ?? null;
}

export function getInvoiceItems(invoice: Invoice): InvoiceItem[] {
  if (invoice.items?.length) return invoice.items;
  const po = getInvoicePurchaseOrder(invoice);
  return quotationItemsToOrderItems(po?.approval?.quotation?.items ?? []);
}

export function getInvoiceSubtotal(invoice: Invoice): number {
  return invoice.subtotal ?? getInvoicePurchaseOrder(invoice)?.approval?.quotation?.totalAmount ?? Math.max(invoice.totalAmount - invoice.taxAmount, 0);
}

export function getInvoiceTax(invoice: Invoice): number {
  return invoice.tax ?? invoice.taxAmount ?? 0;
}

function quotationItemsToOrderItems(items: QuotationItem[]): POItem[] {
  return items.map((item) => {
    const rfqItem = typeof item.rfqItemId === 'object' ? item.rfqItemId : item.rfqItem;
    return {
      id: item.id,
      productName: rfqItem?.productName ?? 'Unknown item',
      quantity: rfqItem?.quantity ?? 0,
      unit: rfqItem?.unit ?? '',
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice ?? 0,
    };
  });
}
