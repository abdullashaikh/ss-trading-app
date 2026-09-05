import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Plus, Search, BookOpen, CreditCard, Building2, Phone,
  MapPin, Loader2, Edit, Trash2, AlertTriangle, ArrowUpRight, CheckCircle2
} from 'lucide-react';

interface CompaniesPageProps {
  isAddCompanyOpen?: boolean;
  setIsAddCompanyOpen?: (open: boolean) => void;
}

export const CompaniesPage: React.FC<CompaniesPageProps> = ({
  isAddCompanyOpen: externalOpen,
  setIsAddCompanyOpen: setExternalOpen
}) => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddOpen = externalOpen !== undefined ? externalOpen : internalAddOpen;
  const setIsAddOpen = setExternalOpen || setInternalAddOpen;

  const [editCompany, setEditCompany] = useState<any>(null);
  const [deleteConfirmCompany, setDeleteConfirmCompany] = useState<any>(null);
  const [ledgerCompany, setLedgerCompany] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<{ summary: any; transactions: any[] } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentCompany, setPaymentCompany] = useState<any>(null);

  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const toast = useToast();

  // Form states
  const [formData, setFormData] = useState({
    company_name: '',
    contact_number: '',
    address: '',
    cr_br_type: 'CR', // 'CR' (Payable / Due) or 'DR' (Advance / Paid)
    opening_balance_amount: '0',
    notes: '',
    is_active: 1
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'Cash',
    reference_no: '',
    notes: ''
  });

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCompanies(search);
      setCompanies(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [search]);

  // Aggregate Metrics across all suppliers
  const aggregateMetrics = companies.reduce(
    (acc, c) => {
      acc.totalPurchases += Number(c.total_purchase) || 0;
      acc.totalPaid += Number(c.total_paid) || 0;
      acc.totalOutstanding += Number(c.current_balance) || 0;
      return acc;
    },
    { totalPurchases: 0, totalPaid: 0, totalOutstanding: 0 }
  );

  // Compute signed opening balance for submission
  const computeSignedOpeningBalance = (amountStr: string, crBrType: string): number => {
    const rawNum = Math.abs(parseFloat(amountStr) || 0);
    return crBrType === 'DR' ? -rawNum : rawNum;
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCompany(true);
    try {
      const signedOpening = computeSignedOpeningBalance(formData.opening_balance_amount, formData.cr_br_type);

      await api.saveCompany({
        company_id: editCompany?.company_id || 0,
        company_name: formData.company_name,
        contact_number: formData.contact_number || null,
        address: formData.address || null,
        cr_br: formData.cr_br_type,
        opening_balance: signedOpening,
        notes: formData.notes || null,
        is_active: formData.is_active
      });

      setIsAddOpen(false);
      setEditCompany(null);
      setFormData({
        company_name: '',
        contact_number: '',
        address: '',
        cr_br_type: 'CR',
        opening_balance_amount: '0',
        notes: '',
        is_active: 1
      });
      toast.success(editCompany ? 'Supplier updated successfully!' : 'Supplier added successfully!');
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const handleOpenAdd = () => {
    setEditCompany(null);
    setFormData({
      company_name: '',
      contact_number: '',
      address: '',
      cr_br_type: 'CR',
      opening_balance_amount: '0',
      notes: '',
      is_active: 1
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (comp: any) => {
    setEditCompany(comp);
    const obNum = parseFloat(comp.opening_balance || 0);
    const crBr = comp.cr_br || (obNum < 0 ? 'DR' : 'CR');
    setFormData({
      company_name: comp.company_name,
      contact_number: comp.contact_number || '',
      address: comp.address || '',
      cr_br_type: crBr === 'DR' || obNum < 0 ? 'DR' : 'CR',
      opening_balance_amount: Math.abs(obNum).toString(),
      notes: comp.notes || '',
      is_active: comp.is_active !== undefined ? comp.is_active : 1
    });
    setIsAddOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!deleteConfirmCompany) return;
    setIsDeletingCompany(true);
    try {
      await api.deleteCompany(deleteConfirmCompany.company_id);
      toast.success('Supplier deleted successfully!');
      setDeleteConfirmCompany(null);
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const loadLedger = async (comp: any, filterType = ledgerFilter) => {
    setLedgerCompany(comp);
    let start: string | undefined;
    let end: string | undefined;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (filterType === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (filterType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = todayStr;
    } else if (filterType === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = todayStr;
    } else if (filterType === 'custom') {
      start = customStart || undefined;
      end = customEnd || undefined;
    }

    try {
      const res = await api.getCompanyLedger(comp.company_id, start, end);
      setLedgerData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load supplier ledger');
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCompany) return;
    setIsSubmittingPayment(true);
    try {
      await api.saveCompanyPayment({
        company_id: paymentCompany.company_id,
        ...paymentForm
      });
      setPaymentCompany(null);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_no: '',
        notes: ''
      });
      toast.success('Payment recorded successfully!');
      loadCompanies();
      if (ledgerCompany && ledgerCompany.company_id === paymentCompany.company_id) {
        loadLedger(ledgerCompany);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteLedgerPayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await api.deleteCompanyPayment(paymentId);
      toast.success('Payment deleted successfully!');
      if (ledgerCompany) {
        loadLedger(ledgerCompany);
      }
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Suppliers & Poultry Farms</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Manage chicken suppliers, accounts, CR/DR opening balances, and ledger settlements
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* KPI Summary Cards including TOTAL PENDING PAYABLE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Suppliers</span>
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {companies.length}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">Registered Companies</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Purchases</span>
            <span className="text-[11px] font-bold text-gray-400">All time</span>
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {formatCurrency(aggregateMetrics.totalPurchases)}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">From All Suppliers</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Paid</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-emerald-700 block">
              {formatCurrency(aggregateMetrics.totalPaid)}
            </strong>
            <span className="text-[11px] text-emerald-600 font-semibold">Payments Disbursed</span>
          </div>
        </div>

        {/* PROMINENT TOTAL PENDING PAYABLE METRIC */}
        <div className="p-4 bg-rose-50/80 rounded-2xl border-2 border-rose-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-black uppercase tracking-wider">Total Pending Balance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800">
              Payable
            </span>
          </div>
          <div className="mt-2">
            <strong className="text-xl sm:text-2xl font-black text-rose-700 block">
              {formatCurrency(aggregateMetrics.totalOutstanding)}
            </strong>
            <span className="text-[11px] text-rose-600 font-bold">
              Net Due to All Suppliers
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company name, CR/BR status, mobile..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Companies List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((comp) => {
          const currentBal = Number(comp.current_balance) || 0;
          const openBal = Number(comp.opening_balance) || 0;
          const isOpenNegative = openBal < 0;

          return (
            <div
              key={comp.company_id}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                      {comp.company_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        isOpenNegative
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-brand-50 text-brand-700 border-brand-200'
                      }`}>
                        {isOpenNegative ? 'DR / Advance' : 'CR / Payable'}
                      </span>
                      {comp.cr_br && comp.cr_br !== 'CR' && comp.cr_br !== 'DR' && (
                        <span className="text-[10px] text-gray-500 font-medium">({comp.cr_br})</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    comp.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {comp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1 pt-1">
                  {comp.contact_number && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{comp.contact_number}</span>
                    </div>
                  )}
                  {comp.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{comp.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Opening Bal</span>
                    <strong className={`font-semibold text-xs ${isOpenNegative ? 'text-blue-600' : 'text-gray-800'}`}>
                      {isOpenNegative ? `-${formatCurrency(Math.abs(openBal))} (DR)` : `+${formatCurrency(openBal)} (CR)`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Current Outstanding</span>
                    <strong className={`font-bold text-sm ${currentBal > 0 ? 'text-rose-600' : currentBal < 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {currentBal < 0
                        ? `${formatCurrency(Math.abs(currentBal))} (Advance)`
                        : formatCurrency(currentBal)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => loadLedger(comp)}
                  className="flex-1 py-2 px-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-1 border border-gray-200"
                >
                  <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                  <span>Ledger</span>
                </button>

                <button
                  onClick={() => setPaymentCompany(comp)}
                  className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pay</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(comp)}
                  title="Edit Supplier"
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 font-bold text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeleteConfirmCompany(comp)}
                  title="Delete Supplier"
                  className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Company Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditCompany(null);
        }}
        title={editCompany ? 'Edit Supplier' : 'Add New Supplier / Company'}
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g. ABC Chicken Ltd"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contact Number</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
              <select
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>

          {/* CR / DR & Bidirectional Opening Balance */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-gray-800">
                Opening Balance & Account Nature (CR / DR)
              </label>
              <span className="text-[10px] text-gray-500 font-semibold">Positive or Negative</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Balance Type</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cr_br_type: 'CR' })}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.cr_br_type === 'CR'
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    CR (Payable +)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cr_br_type: 'DR' })}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.cr_br_type === 'DR'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    DR (Advance -)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Opening Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.opening_balance_amount}
                  onChange={(e) => setFormData({ ...formData, opening_balance_amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                />
              </div>
            </div>

            {/* Explanatory Live Badge */}
            <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
              formData.cr_br_type === 'CR'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>
                {formData.cr_br_type === 'CR' ? (
                  <span>
                    <strong>CR (Credit / Payable):</strong> SS Trading owes <strong>{formatCurrency(formData.opening_balance_amount)}</strong> to this supplier (Signed Value: +{formatCurrency(formData.opening_balance_amount)})
                  </span>
                ) : (
                  <span>
                    <strong>DR / BR (Debit / Advance):</strong> SS Trading has paid <strong>{formatCurrency(formData.opening_balance_amount)}</strong> advance to this supplier (Signed Value: -{formatCurrency(formData.opening_balance_amount)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Supplier warehouse or farm address"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setEditCompany(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCompany}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingCompany && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingCompany ? 'Saving...' : editCompany ? 'Update Supplier' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Supplier Modal */}
      <Modal
        isOpen={!!paymentCompany}
        onClose={() => setPaymentCompany(null)}
        title={`Record Payment to ${paymentCompany?.company_name}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block">Current Outstanding</span>
              <strong className="text-rose-600 font-black text-sm">
                {formatCurrency(paymentCompany?.current_balance)}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block">Opening Balance</span>
              <strong className="text-gray-700 font-bold">
                {formatCurrency(paymentCompany?.opening_balance)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reference No / Chq #</label>
              <input
                type="text"
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                placeholder="Optional ref"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Remarks"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaymentCompany(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingPayment ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Ledger Modal */}
      <Modal
        isOpen={!!ledgerCompany}
        onClose={() => setLedgerCompany(null)}
        title={`Supplier Statement — ${ledgerCompany?.company_name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1.5">
              {(['today', 'month', 'year', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setLedgerFilter(mode);
                    loadLedger(ledgerCompany, mode);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    ledgerFilter === mode
                      ? 'bg-brand-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {ledgerFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs"
                />
                <button
                  onClick={() => loadLedger(ledgerCompany, 'custom')}
                  className="px-2.5 py-1 bg-brand-700 text-white rounded-lg font-bold"
                >
                  Filter
                </button>
              </div>
            )}
          </div>

          {/* Ledger Summary Box */}
          {ledgerData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block">Opening Balance</span>
                <strong className={`font-bold ${Number(ledgerData.summary.opening_balance) < 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                  {Number(ledgerData.summary.opening_balance) < 0
                    ? `-${formatCurrency(Math.abs(ledgerData.summary.opening_balance))} (DR Advance)`
                    : `+${formatCurrency(ledgerData.summary.opening_balance)} (CR Payable)`}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 block">Total Purchases</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(ledgerData.summary.total_purchase)}</strong>
                <span className="text-[10px] text-gray-500 block">({ledgerData.summary.total_kg} KG / {ledgerData.summary.total_chicken_qty} Birds)</span>
              </div>
              <div>
                <span className="text-gray-400 block">Total Paid</span>
                <strong className="text-emerald-700 font-bold">{formatCurrency(ledgerData.summary.total_paid)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Current Outstanding</span>
                <strong className={`font-black text-sm ${Number(ledgerData.summary.total_outstanding) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(ledgerData.summary.total_outstanding)}
                </strong>
              </div>
            </div>
          )}

          {/* Mobile Ledger Transaction Cards (Zero Horizontal Scroll) */}
          <div className="block md:hidden space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
            {ledgerData?.transactions?.length ? (
              ledgerData.transactions.map((tx: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        tx.tx_type === 'PURCHASE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.tx_type}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{tx.tx_date}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block leading-tight">Running Balance</span>
                      <span className="font-extrabold text-xs text-gray-900">
                        {formatCurrency(tx.running_balance)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">{tx.reference}</span>
                      {tx.notes && <span className="text-gray-400 text-[11px] block">{tx.notes}</span>}
                    </div>

                    {tx.tx_type === 'PAYMENT' && (
                      <button
                        onClick={() => handleDeleteLedgerPayment(tx.ref_id)}
                        title="Delete Payment"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Weight</span>
                      <span className="font-semibold text-gray-800">{tx.kg > 0 ? `${tx.kg} KG` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Rate</span>
                      <span className="font-semibold text-gray-800">{tx.rate > 0 ? `₹${tx.rate}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Amount</span>
                      <span className="font-semibold text-gray-800">{tx.amount > 0 ? formatCurrency(tx.amount) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Paid</span>
                      <span className="font-bold text-emerald-700">{tx.paid > 0 ? formatCurrency(tx.paid) : '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                No transactions recorded in this date range
              </div>
            )}
          </div>

          {/* Desktop Ledger Table */}
          <div className="hidden md:block overflow-x-auto max-h-96 rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead className="sticky top-0 bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference / Notes</th>
                  <th className="py-2.5 px-3">Weight (KG)</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3 text-right">Running Balance</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerData?.transactions?.length ? (
                  ledgerData.transactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-gray-800">{tx.tx_date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.tx_type === 'PURCHASE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {tx.tx_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-gray-900 block">{tx.reference}</span>
                        {tx.notes && <span className="text-gray-400 text-[11px]">{tx.notes}</span>}
                      </td>
                      <td className="py-2 px-3 font-medium">{tx.kg > 0 ? `${tx.kg} KG` : '—'}</td>
                      <td className="py-2 px-3 font-medium">{tx.rate > 0 ? `₹${tx.rate}` : '—'}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{tx.amount > 0 ? formatCurrency(tx.amount) : '—'}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">{tx.paid > 0 ? formatCurrency(tx.paid) : '—'}</td>
                      <td className="py-2 px-3 text-right font-black text-gray-900">
                        {formatCurrency(tx.running_balance)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {tx.tx_type === 'PAYMENT' && (
                          <button
                            onClick={() => handleDeleteLedgerPayment(tx.ref_id)}
                            title="Delete Payment"
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No transactions recorded in this date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Delete Supplier Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmCompany}
        onClose={() => setDeleteConfirmCompany(null)}
        title="Delete Supplier"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete supplier <strong>{deleteConfirmCompany?.company_name}</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmCompany(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingCompany}
              onClick={handleDeleteCompany}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeletingCompany && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeletingCompany ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
