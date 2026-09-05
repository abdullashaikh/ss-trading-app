import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Plus, Search, Calendar, Filter, Building2, CreditCard,
  ShoppingCart, Loader2, Edit, Trash2, AlertTriangle, ArrowUpRight, Scale
} from 'lucide-react';

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

  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [deleteConfirmPurchase, setDeleteConfirmPurchase] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    company_id: '',
    total_chicken_qty: '',
    total_kg: '',
    price_per_kg: '',
    amount_paid: '0',
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

  // Overall aggregate summaries for the current filtered list
  const summaryTotals = purchases.reduce(
    (acc, p) => {
      acc.totalBirds += Number(p.total_chicken_qty) || 0;
      acc.totalKg += Number(p.total_kg) || 0;
      acc.totalAmount += Number(p.total_amount) || 0;
      acc.totalPaid += Number(p.amount_paid) || 0;
      acc.totalPending += Number(p.pending_amount) || 0;
      return acc;
    },
    { totalBirds: 0, totalKg: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 }
  );

  const handleOpenAdd = () => {
    setEditingPurchase(null);
    setFormData({
      purchase_date: new Date().toISOString().split('T')[0],
      company_id: selectedCompanyId || (companies[0]?.company_id?.toString() || ''),
      total_chicken_qty: '',
      total_kg: '',
      price_per_kg: '',
      amount_paid: '0',
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingPurchase(p);
    setFormData({
      purchase_date: p.purchase_date,
      company_id: p.company_id.toString(),
      total_chicken_qty: p.total_chicken_qty.toString(),
      total_kg: p.total_kg.toString(),
      price_per_kg: p.price_per_kg.toString(),
      amount_paid: p.amount_paid?.toString() || '0',
      notes: p.notes || ''
    });
    setIsAddOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id || !formData.total_chicken_qty || !formData.total_kg || !formData.price_per_kg) {
      toast.error('Please fill in all required purchase fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.savePurchase({
        purchase_id: editingPurchase?.purchase_id || 0,
        purchase_date: formData.purchase_date,
        company_id: parseInt(formData.company_id, 10),
        total_chicken_qty: parseInt(formData.total_chicken_qty, 10),
        total_kg: parseFloat(formData.total_kg),
        price_per_kg: parseFloat(formData.price_per_kg),
        total_amount: totalAmountCalculated,
        amount_paid: amountPaidNum,
        pending_amount: pendingAmountCalculated,
        cr_br_reference: null,
        notes: formData.notes || null
      });

      setIsAddOpen(false);
      setEditingPurchase(null);
      toast.success(editingPurchase ? 'Purchase entry updated successfully!' : 'Purchase entry saved successfully!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!deleteConfirmPurchase) return;
    setIsDeleting(true);
    try {
      await api.deletePurchase(deleteConfirmPurchase.purchase_id);
      toast.success('Purchase entry deleted successfully!');
      setDeleteConfirmPurchase(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete purchase entry');
    } finally {
      setIsDeleting(false);
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
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Record live bird purchases, weight in KG, supplier payments, and pending balances
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      {/* Summary KPI Cards — Prominently featuring TOTAL PENDING AMOUNT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Purchases</span>
            <ShoppingCart className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {formatCurrency(summaryTotals.totalAmount)}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">
              {purchases.length} Entries Recorded
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Paid</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-emerald-700 block">
              {formatCurrency(summaryTotals.totalPaid)}
            </strong>
            <span className="text-[11px] text-emerald-600 font-semibold">
              Supplier Payments Cleared
            </span>
          </div>
        </div>

        {/* PROMINENT TOTAL PENDING AMOUNT CARD */}
        <div className="p-4 bg-rose-50/80 rounded-2xl border-2 border-rose-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-2 opacity-10">
            <ArrowUpRight className="w-20 h-20 text-rose-800" />
          </div>
          <div className="flex items-center justify-between text-rose-800 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider">Total Pending Amount</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800">
              Payable
            </span>
          </div>
          <div className="mt-2 relative z-10">
            <strong className="text-xl sm:text-2xl font-black text-rose-700 block">
              {formatCurrency(summaryTotals.totalPending)}
            </strong>
            <span className="text-[11px] text-rose-600 font-bold">
              Outstanding Supplier Balance
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Weight & Birds</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {summaryTotals.totalKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })} KG
            </strong>
            <span className="text-[11px] text-gray-500 font-semibold">
              {summaryTotals.totalBirds.toLocaleString('en-IN')} Live Birds
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm text-xs">
        <div className="min-w-0">
          <label className="block text-gray-500 font-bold mb-1">Filter by Supplier</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full min-w-0 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Suppliers</option>
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.company_name} {c.cr_br ? `(${c.cr_br})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-gray-500 font-bold mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full min-w-0 max-w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-gray-500 font-bold mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full min-w-0 max-w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Mobile Purchases Cards / Boxes (md:hidden) */}
      <div className="md:hidden space-y-3">
        {purchases.length > 0 ? (
          purchases.map((p) => (
            <div
              key={p.purchase_id}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header: Date & Actions */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <Calendar className="w-3.5 h-3.5 text-brand-700" />
                  <span>{p.purchase_date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmPurchase(p)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Supplier & Notes */}
              <div className="py-2.5">
                <h4 className="font-extrabold text-gray-900 text-sm leading-tight">
                  {p.company_name}
                </h4>
                {p.notes && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{p.notes}</p>
                )}
              </div>

              {/* Birds, Weight, Rate (3-Col Grid) */}
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-gray-100 text-center">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold block uppercase">Birds Qty</span>
                  <strong className="text-xs font-extrabold text-gray-800 block mt-0.5">
                    {Number(p.total_chicken_qty).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold block uppercase">Weight</span>
                  <strong className="text-xs font-extrabold text-gray-800 block mt-0.5">
                    {Number(p.total_kg).toFixed(2)} KG
                  </strong>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold block uppercase">Rate / KG</span>
                  <strong className="text-xs font-extrabold text-gray-800 block mt-0.5">
                    ₹{Number(p.price_per_kg).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Financial Breakdown (Total, Paid, Pending) */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center mt-1">
                <div className="p-1">
                  <span className="text-[10px] text-gray-500 font-semibold block">Total Bill</span>
                  <strong className="text-xs font-black text-gray-900 block mt-0.5">
                    {formatCurrency(p.total_amount)}
                  </strong>
                </div>
                <div className="p-1 border-x border-gray-200">
                  <span className="text-[10px] text-emerald-700 font-semibold block">Paid</span>
                  <strong className="text-xs font-black text-emerald-700 block mt-0.5">
                    {formatCurrency(p.amount_paid)}
                  </strong>
                </div>
                <div className="p-1 bg-rose-50/80 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold block">Pending</span>
                  <strong className="text-xs font-black text-rose-600 block mt-0.5">
                    {formatCurrency(p.pending_amount)}
                  </strong>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
            <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold">No purchase records found</p>
          </div>
        )}
      </div>

      {/* Desktop Purchases List Table (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.length > 0 ? (
                purchases.map((p) => (
                  <tr key={p.purchase_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-800">
                      {p.purchase_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 block">{p.company_name}</span>
                      {p.notes && (
                        <span className="inline-block text-[10px] text-gray-500 font-medium">
                          {p.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {Number(p.total_chicken_qty).toLocaleString('en-IN')} Birds
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {Number(p.total_kg).toLocaleString('en-IN', { minimumFractionDigits: 2 })} KG
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">
                      ₹{Number(p.price_per_kg).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-black text-gray-900">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600">
                      {formatCurrency(p.pending_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Purchase Entry"
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmPurchase(p)}
                          title="Delete Purchase Entry"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">No purchase records found</p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer with Column Totals */}
            {purchases.length > 0 && (
              <tfoot className="bg-gray-100/80 border-t-2 border-gray-300 text-gray-900 font-bold text-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-left font-black uppercase tracking-wider">
                    Total Summary ({purchases.length} entries)
                  </td>
                  <td className="py-3 px-4">
                    {summaryTotals.totalBirds.toLocaleString('en-IN')} Birds
                  </td>
                  <td className="py-3 px-4">
                    {summaryTotals.totalKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })} KG
                  </td>
                  <td className="py-3 px-4">—</td>
                  <td className="py-3 px-4 font-black text-gray-900">
                    {formatCurrency(summaryTotals.totalAmount)}
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-700">
                    {formatCurrency(summaryTotals.totalPaid)}
                  </td>
                  <td className="py-3 px-4 font-black text-rose-600">
                    {formatCurrency(summaryTotals.totalPending)}
                  </td>
                  <td className="py-3 px-4 text-right">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Purchase Entry Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingPurchase(null);
        }}
        title={editingPurchase ? 'Edit Purchase Entry' : 'Record Daily Chicken Purchase'}
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold text-gray-700 mb-1">Supplier / Company *</label>
              <select
                required
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="">Select Supplier</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
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
                step="0.01"
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

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional comments or reference #"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setEditingPurchase(null);
              }}
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
              <span>{isSubmitting ? 'Saving...' : editingPurchase ? 'Update Purchase Entry' : 'Save Purchase Entry'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmPurchase}
        onClose={() => setDeleteConfirmPurchase(null)}
        title="Delete Purchase Entry"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete the purchase entry from{' '}
            <strong>{deleteConfirmPurchase?.company_name}</strong> on{' '}
            <strong>{deleteConfirmPurchase?.purchase_date}</strong> for{' '}
            <strong>{formatCurrency(deleteConfirmPurchase?.total_amount)}</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmPurchase(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeletePurchase}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
