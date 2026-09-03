import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import { Plus, Search, Calendar, Filter, Building2, CreditCard, ShoppingCart, Loader2 } from 'lucide-react';

interface PurchasesPageProps {
  isAddPurchaseOpen?: boolean;
  setIsAddPurchaseOpen?: (open: boolean) => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  isAddPurchaseOpen: externalOpen,
  setIsAddPurchaseOpen: setExternalOpen
}) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddOpen = externalOpen !== undefined ? externalOpen : internalAddOpen;
  const setIsAddOpen = setExternalOpen || setInternalAddOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    company_id: '',
    total_chicken_qty: '',
    total_kg: '',
    price_per_kg: '',
    amount_paid: '0',
    cr_br_reference: '',
    notes: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [compRes, purchRes] = await Promise.all([
        api.getCompanies(),
        api.getPurchases(
          selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined,
          startDate || undefined,
          endDate || undefined
        )
      ]);
      setCompanies(compRes.data || []);
      setPurchases(purchRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCompanyId, startDate, endDate]);

  // Dynamic calculations
  const totalKgNum = parseFloat(formData.total_kg) || 0;
  const pricePerKgNum = parseFloat(formData.price_per_kg) || 0;
  const totalAmountCalculated = parseFloat((totalKgNum * pricePerKgNum).toFixed(2));
  const amountPaidNum = parseFloat(formData.amount_paid) || 0;
  const pendingAmountCalculated = parseFloat((totalAmountCalculated - amountPaidNum).toFixed(2));

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id || !formData.total_chicken_qty || !formData.total_kg || !formData.price_per_kg) {
      toast.error('Please fill in all required purchase fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.savePurchase({
        purchase_date: formData.purchase_date,
        company_id: parseInt(formData.company_id, 10),
        total_chicken_qty: parseInt(formData.total_chicken_qty, 10),
        total_kg: parseFloat(formData.total_kg),
        price_per_kg: parseFloat(formData.price_per_kg),
        total_amount: totalAmountCalculated,
        amount_paid: amountPaidNum,
        pending_amount: pendingAmountCalculated,
        cr_br_reference: formData.cr_br_reference || null,
        notes: formData.notes || null
      });

      setIsAddOpen(false);
      setFormData({
        purchase_date: new Date().toISOString().split('T')[0],
        company_id: '',
        total_chicken_qty: '',
        total_kg: '',
        price_per_kg: '',
        amount_paid: '0',
        cr_br_reference: '',
        notes: ''
      });
      toast.success('Purchase entry saved successfully!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Daily Purchase Entries</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Record live bird purchases, weight in KG, and supplier accounts</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm text-xs">
        <div>
          <label className="block text-gray-500 font-bold mb-1">Filter by Supplier</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Suppliers</option>
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.company_name} {c.cr_br ? `(${c.cr_br})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-500 font-bold mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-gray-500 font-bold mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Chicken Qty</th>
                <th className="py-3 px-4">Weight (KG)</th>
                <th className="py-3 px-4">Rate / KG</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4 text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.length > 0 ? (
                purchases.map((p) => (
                  <tr key={p.purchase_id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-800">
                      {p.purchase_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 block">{p.company_name}</span>
                      {p.cr_br_reference && (
                        <span className="text-[10px] text-gray-500 font-medium">Ref: {p.cr_br_reference}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {p.total_chicken_qty} Birds
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {p.total_kg} KG
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">
                      ₹{p.price_per_kg}
                    </td>
                    <td className="py-3 px-4 font-black text-gray-900">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600">
                      {formatCurrency(p.pending_amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">No purchase records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Entry Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Daily Chicken Purchase"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Supplier / Company *</label>
              <select
                required
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Supplier</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name} {c.cr_br ? `(${c.cr_br})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Chicken Quantity (Birds) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.total_chicken_qty}
                onChange={(e) => setFormData({ ...formData, total_chicken_qty: e.target.value })}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total Weight (KG) *</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={formData.total_kg}
                onChange={(e) => setFormData({ ...formData, total_kg: e.target.value })}
                placeholder="e.g. 1250.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Price Per KG (₹) *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={formData.price_per_kg}
                onChange={(e) => setFormData({ ...formData, price_per_kg: e.target.value })}
                placeholder="e.g. 180"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Auto Calculation Preview Card */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block font-semibold">Total Purchase Amount</span>
              <strong className="text-sm font-black text-gray-900">{formatCurrency(totalAmountCalculated)}</strong>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Amount Paid Now (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-gray-400 block font-semibold">Pending Amount</span>
              <strong className="text-sm font-black text-rose-600">{formatCurrency(pendingAmountCalculated)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CR/BR Reference</label>
              <input
                type="text"
                value={formData.cr_br_reference}
                onChange={(e) => setFormData({ ...formData, cr_br_reference: e.target.value })}
                placeholder="e.g. Inv # / CR #"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional comments"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving Purchase Entry...' : 'Save Purchase Entry'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
