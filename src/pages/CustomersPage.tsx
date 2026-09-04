import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Plus, Search, BookOpen, CreditCard, Users, Phone,
  MapPin, Loader2, Edit, Trash2, AlertTriangle, ArrowDownLeft, CheckCircle2
} from 'lucide-react';

interface CustomersPageProps {
  isAddCustomerOpen?: boolean;
  setIsAddCustomerOpen?: (open: boolean) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  isAddCustomerOpen: externalOpen,
  setIsAddCustomerOpen: setExternalOpen
}) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddOpen = externalOpen !== undefined ? externalOpen : internalAddOpen;
  const setIsAddOpen = setExternalOpen || setInternalAddOpen;

  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<any>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<{ summary: any; transactions: any[] } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentCustomer, setPaymentCustomer] = useState<any>(null);

  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    mobile_number: '',
    address: '',
    cr_br_type: 'DR', // For Customers: 'DR' (Debit / Receivable +) or 'CR' (Credit / Advance -)
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

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCustomers(search);
      setCustomers(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  // Aggregate Metrics across all customers
  const aggregateMetrics = customers.reduce(
    (acc, c) => {
      acc.totalSales += Number(c.total_sales) || 0;
      acc.totalPaid += Number(c.total_paid) || 0;
      acc.totalDue += Number(c.current_outstanding) || 0;
      return acc;
    },
    { totalSales: 0, totalPaid: 0, totalDue: 0 }
  );

  // Compute signed opening balance for customer:
  // DR (Receivable) = positive (+), CR (Advance) = negative (-)
  const computeSignedOpeningBalance = (amountStr: string, crBrType: string): number => {
    const rawNum = Math.abs(parseFloat(amountStr) || 0);
    return crBrType === 'CR' ? -rawNum : rawNum;
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.mobile_number) {
      toast.error('Customer name and mobile number are required');
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const signedOpening = computeSignedOpeningBalance(formData.opening_balance_amount, formData.cr_br_type);

      await api.saveCustomer({
        customer_id: editCustomer?.customer_id || 0,
        customer_name: formData.customer_name,
        mobile_number: formData.mobile_number,
        address: formData.address || null,
        cr_br: formData.cr_br_type,
        opening_balance: signedOpening,
        notes: formData.notes || null,
        is_active: formData.is_active
      });

      setIsAddOpen(false);
      setEditCustomer(null);
      setFormData({
        customer_name: '',
        mobile_number: '',
        address: '',
        cr_br_type: 'DR',
        opening_balance_amount: '0',
        notes: '',
        is_active: 1
      });
      toast.success(editCustomer ? 'Customer updated successfully!' : 'Customer added successfully!');
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleOpenAdd = () => {
    setEditCustomer(null);
    setFormData({
      customer_name: '',
      mobile_number: '',
      address: '',
      cr_br_type: 'DR',
      opening_balance_amount: '0',
      notes: '',
      is_active: 1
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cust: any) => {
    setEditCustomer(cust);
    const obNum = parseFloat(cust.opening_balance || 0);
    const crBr = cust.cr_br || (obNum < 0 ? 'CR' : 'DR');
    setFormData({
      customer_name: cust.customer_name,
      mobile_number: cust.mobile_number,
      address: cust.address || '',
      cr_br_type: crBr === 'CR' || obNum < 0 ? 'CR' : 'DR',
      opening_balance_amount: Math.abs(obNum).toString(),
      notes: cust.notes || '',
      is_active: cust.is_active !== undefined ? cust.is_active : 1
    });
    setIsAddOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmCustomer) return;
    setIsDeletingCustomer(true);
    try {
      await api.deleteCustomer(deleteConfirmCustomer.customer_id);
      toast.success('Customer deleted successfully!');
      setDeleteConfirmCustomer(null);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const loadLedger = async (cust: any, filterType = ledgerFilter) => {
    setLedgerCustomer(cust);
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
      const res = await api.getCustomerLedger(cust.customer_id, start, end);
      setLedgerData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customer ledger');
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    setIsSubmittingPayment(true);
    try {
      await api.recordBillPayment({
        customer_id: paymentCustomer.customer_id,
        ...paymentForm
      });
      setPaymentCustomer(null);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_no: '',
        notes: ''
      });
      toast.success('Customer payment recorded successfully!');
      loadCustomers();
      if (ledgerCustomer && ledgerCustomer.customer_id === paymentCustomer.customer_id) {
        loadLedger(ledgerCustomer);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record customer payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteLedgerPayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this customer payment?')) return;
    try {
      await api.deleteBillPayment(paymentId);
      toast.success('Payment deleted successfully!');
      if (ledgerCustomer) {
        loadLedger(ledgerCustomer);
      }
      loadCustomers();
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
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Customers & Parties</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Manage wholesale chicken buyers, DR/CR opening balances, customer pending receivables, and accounts
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Summary Cards featuring TOTAL PENDING RECEIVABLE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {customers.length}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">Active Customer Accounts</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Billed Sales</span>
            <span className="text-[11px] font-bold text-gray-400">All time</span>
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {formatCurrency(aggregateMetrics.totalSales)}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">Total Billed Revenue</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Payments Collected</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-emerald-700 block">
              {formatCurrency(aggregateMetrics.totalPaid)}
            </strong>
            <span className="text-[11px] text-emerald-600 font-semibold">Total Cash Received</span>
          </div>
        </div>

        {/* PROMINENT TOTAL PENDING CUSTOMER RECEIVABLE */}
        <div className="p-4 bg-rose-50/80 rounded-2xl border-2 border-rose-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-black uppercase tracking-wider">Total Pending Balance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800">
              Receivable
            </span>
          </div>
          <div className="mt-2">
            <strong className="text-xl sm:text-2xl font-black text-rose-700 block">
              {formatCurrency(aggregateMetrics.totalDue)}
            </strong>
            <span className="text-[11px] text-rose-600 font-bold">
              Total Due to Collect from Customers
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
          placeholder="Search by customer name, mobile, address, or DR/CR..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((cust) => {
          const currentDue = Number(cust.current_outstanding) || 0;
          const openBal = Number(cust.opening_balance) || 0;
          const isOpenNegative = openBal < 0;

          return (
            <div
              key={cust.customer_id}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                      {cust.customer_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        isOpenNegative
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isOpenNegative ? 'CR / Advance' : 'DR / Receivable'}
                      </span>
                      {cust.cr_br && cust.cr_br !== 'CR' && cust.cr_br !== 'DR' && (
                        <span className="text-[10px] text-gray-500 font-medium">({cust.cr_br})</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    cust.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cust.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cust.mobile_number}</span>
                  </div>
                  {cust.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Opening Bal</span>
                    <strong className={`font-semibold text-xs ${isOpenNegative ? 'text-blue-600' : 'text-gray-800'}`}>
                      {isOpenNegative ? `-${formatCurrency(Math.abs(openBal))} (CR Advance)` : `+${formatCurrency(openBal)} (DR Due)`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Outstanding Due</span>
                    <strong className={`font-bold text-sm ${currentDue > 0 ? 'text-rose-600' : currentDue < 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {currentDue < 0
                        ? `${formatCurrency(Math.abs(currentDue))} (Advance)`
                        : formatCurrency(currentDue)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => loadLedger(cust)}
                  className="flex-1 py-2 px-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-1 border border-gray-200"
                >
                  <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                  <span>Ledger</span>
                </button>

                <button
                  onClick={() => setPaymentCustomer(cust)}
                  className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Receive</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(cust)}
                  title="Edit Customer"
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 font-bold text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeleteConfirmCustomer(cust)}
                  title="Delete Customer"
                  className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditCustomer(null);
        }}
        title={editCustomer ? 'Edit Customer' : 'Add New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Customer / Shop Name *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="e.g. Rahul Chicken Shop"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
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
                Opening Balance & Account Nature (DR / CR)
              </label>
              <span className="text-[10px] text-gray-500 font-semibold">Positive or Negative</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Balance Type</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cr_br_type: 'DR' })}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.cr_br_type === 'DR'
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    DR (Receivable +)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cr_br_type: 'CR' })}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      formData.cr_br_type === 'CR'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    CR (Advance -)
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
              formData.cr_br_type === 'DR'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>
                {formData.cr_br_type === 'DR' ? (
                  <span>
                    <strong>DR / BR (Debit / Receivable):</strong> Customer owes <strong>{formatCurrency(formData.opening_balance_amount)}</strong> to SS Trading (Signed Value: +{formatCurrency(formData.opening_balance_amount)})
                  </span>
                ) : (
                  <span>
                    <strong>CR (Credit / Advance Deposit):</strong> Customer deposited <strong>{formatCurrency(formData.opening_balance_amount)}</strong> advance with SS Trading (Signed Value: -{formatCurrency(formData.opening_balance_amount)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Shop / Delivery Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Market stall, shop address, or route location"
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
                setEditCustomer(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCustomer}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingCustomer && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingCustomer ? 'Saving...' : editCustomer ? 'Update Customer' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Customer Payment Modal */}
      <Modal
        isOpen={!!paymentCustomer}
        onClose={() => setPaymentCustomer(null)}
        title={`Receive Payment from ${paymentCustomer?.customer_name}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block">Current Outstanding Due</span>
              <strong className="text-rose-600 font-black text-sm">
                {formatCurrency(paymentCustomer?.current_outstanding)}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block">Mobile</span>
              <strong className="text-gray-700 font-bold">
                {paymentCustomer?.mobile_number}
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Amount Received (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="e.g. 15000"
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
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reference / Transaction ID</label>
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
              onClick={() => setPaymentCustomer(null)}
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

      {/* Customer Ledger Modal */}
      <Modal
        isOpen={!!ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        title={`Customer Ledger — ${ledgerCustomer?.customer_name}`}
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
                    loadLedger(ledgerCustomer, mode);
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
                  onClick={() => loadLedger(ledgerCustomer, 'custom')}
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
                    ? `-${formatCurrency(Math.abs(ledgerData.summary.opening_balance))} (CR Advance)`
                    : `+${formatCurrency(ledgerData.summary.opening_balance)} (DR Due)`}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 block">Total Sales</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(ledgerData.summary.total_sales)}</strong>
                <span className="text-[10px] text-gray-500 block">({ledgerData.summary.total_kg} KG / {ledgerData.summary.total_chicken_qty} Birds)</span>
              </div>
              <div>
                <span className="text-gray-400 block">Total Received</span>
                <strong className="text-emerald-700 font-bold">{formatCurrency(ledgerData.summary.total_paid)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Current Outstanding</span>
                <strong className={`font-black text-sm ${Number(ledgerData.summary.current_outstanding) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(ledgerData.summary.current_outstanding)}
                </strong>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="overflow-x-auto max-h-96 rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead className="sticky top-0 bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference / Bill #</th>
                  <th className="py-2.5 px-3">Weight (KG)</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3 text-right">Running Due</th>
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
                          tx.tx_type === 'BILL' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {tx.tx_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-gray-900 block">{tx.reference}</span>
                        {tx.notes && <span className="text-gray-400 text-[11px]">{tx.notes}</span>}
                      </td>
                      <td className="py-2 px-3 font-medium">{tx.kg > 0 ? `${tx.kg} KG` : '—'}</td>
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
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No transactions recorded in this date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Delete Customer Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmCustomer}
        onClose={() => setDeleteConfirmCustomer(null)}
        title="Delete Customer"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete customer <strong>{deleteConfirmCustomer?.customer_name}</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmCustomer(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingCustomer}
              onClick={handleDeleteCustomer}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeletingCustomer && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeletingCustomer ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
