import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, TrendingDown, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Quotation, RFQ, Vendor, RFQItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-0.5" title={`Rating: ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={10}
          className={`${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-[10px] font-bold text-amber-600 ml-1">{rating}</span>
    </div>
  );
};

const QuotationComparison: React.FC = () => {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterRating, setFilterRating] = useState<number>(0);

  useEffect(() => {
    if (rfqId) {
      fetchRFQ();
      fetchQuotations();
    }
  }, [rfqId]);

  const fetchRFQ = async () => {
    try {
      const res = await api.get(`/rfqs/${rfqId}`);
      if (res.data.success) setRfq(res.data.data);
    } catch {
      toast.error('Failed to load RFQ');
    }
  };

  const fetchQuotations = async () => {
    try {
      const res = await api.get(`/quotations/rfq/${rfqId}`);
      if (res.data.success) setQuotations(res.data.data || []);
    } catch {
      toast.error('Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const requestApproval = async (quotationId: string) => {
    setRequestingId(quotationId);
    try {
      await api.post('/approvals', { quotationId });
      toast.success('Approval request submitted!');
      fetchQuotations();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request approval';
      toast.error(msg);
    } finally {
      setRequestingId(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const submittedQuotations = quotations.filter((q) => q.status === 'submitted' || q.status === 'selected');

  const filteredQuotations = submittedQuotations
    .filter((q) => {
      const vendor = typeof q.vendorId === 'object' ? q.vendorId as Vendor : null;
      if (filterCategory && vendor?.category !== filterCategory) return false;
      if (filterRating > 0 && (vendor?.rating || 0) < filterRating) return false;
      return true;
    })
    .sort((a, b) => {
      const vendorA = typeof a.vendorId === 'object' ? a.vendorId as Vendor : null;
      const vendorB = typeof b.vendorId === 'object' ? b.vendorId as Vendor : null;
      
      if (sortBy === 'price_asc') {
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortBy === 'price_desc') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      } else if (sortBy === 'rating_desc') {
        return (vendorB?.rating || 0) - (vendorA?.rating || 0);
      }
      return 0;
    });

  const lowestAmount = submittedQuotations.length > 0
    ? Math.min(...submittedQuotations.map((q) => q.totalAmount || 0))
    : 0;

  const canRequestApproval = user?.role === 'procurement_officer' || user?.role === 'admin';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/rfqs')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quotation Comparison</h1>
          <p className="text-sm text-gray-500">{rfq?.title}</p>
        </div>
      </div>

      {submittedQuotations.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500">No submitted quotations yet for this RFQ.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
            <TrendingDown size={16} />
            <span>Lowest bid: <strong>{formatCurrency(lowestAmount)}</strong> — highlighted in green below</span>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-col gap-1 min-w-40 flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Vendor Rating: High to Low</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-40 flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Vendor Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {['IT', 'Manufacturing', 'Logistics', 'Office Supplies', 'Services', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-40 flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Minimum Rating</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="0">All Ratings</option>
                <option value="4">4.0+ Stars</option>
                <option value="3">3.0+ Stars</option>
                <option value="2">2.0+ Stars</option>
              </select>
            </div>
          </div>

          {/* Comparison grid */}
          {filteredQuotations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
              No quotations match the selected filters.
            </div>
          ) : (
            <div className={`grid gap-4 ${filteredQuotations.length === 1 ? 'grid-cols-1 max-w-md' : filteredQuotations.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {filteredQuotations.map((q) => {
              const vendor = typeof q.vendorId === 'object' ? q.vendorId as Vendor : null;
              const isLowest = q.totalAmount === lowestAmount;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border shadow-sm ${isLowest ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-100'}`}
                >
                  <div className={`px-5 py-4 border-b ${isLowest ? 'border-green-100 bg-green-50' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{vendor?.name || 'Unknown Vendor'}</h3>
                        <div className="flex items-center gap-2">
                          {vendor?.category && <p className="text-xs text-gray-500">{vendor.category}</p>}
                          {vendor?.rating !== undefined && <RatingStars rating={vendor.rating} />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLowest && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <TrendingDown size={10} /> Lowest
                          </span>
                        )}
                        {getStatusBadge(q.status)}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total Amount</span>
                      <span className={`text-lg font-bold ${isLowest ? 'text-green-600' : 'text-gray-900'}`}>
                        {formatCurrency(q.totalAmount || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Delivery</span>
                      <span className="text-sm font-medium text-gray-800">{q.deliveryTimeline}</span>
                    </div>

                    {/* Item prices */}
                    {rfq && q.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Per-item Prices</p>
                        <div className="space-y-1.5">
                          {q.items.map((item, i) => {
                            const rfqItem = rfq.items.find(
                              (ri) => ri.id === (typeof item.rfqItemId === 'string' ? item.rfqItemId : (item.rfqItemId as RFQItem)?.id)
                            );
                            return (
                              <div key={item.id || i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{rfqItem?.productName || `Item ${i + 1}`}</span>
                                <span className="font-medium text-gray-800">{formatCurrency(item.unitPrice)}/unit</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {q.notes && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 italic">"{q.notes}"</div>
                    )}

                    {canRequestApproval && q.status === 'submitted' && (
                      <Button
                        className="w-full"
                        size="sm"
                        leftIcon={<CheckCircle size={13} />}
                        isLoading={requestingId === q.id}
                        onClick={() => requestApproval(q.id)}
                      >
                        Select & Request Approval
                      </Button>
                    )}
                    {q.status === 'selected' && (
                      <div className="text-center text-xs font-medium text-green-600 bg-green-50 py-1.5 rounded">
                        ✓ Selected for Approval
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuotationComparison;
