import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import { Plus, Search, BookOpen, CreditCard, Users, Phone, MapPin, Loader2 } from 'lucide-react';

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
  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<{ summary: any; transactions: any[] } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentCustomer, setPaymentCustomer] = useState<any>(null);

  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    mobile_number: '',
    address: '',
    cr_br: '',
    opening_balance: '0',
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

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCustomer(true);
    try {
      await api.saveCustomer({
        customer_id: editCustomer?.customer_id || 0,
        ...formData
      });
      setIsAddOpen(false);
      setEditCustomer(null);
      setFormData({
        customer_name: '',
        mobile_number: '',
        address: '',
        cr_br: '',
        opening_balance: '0',
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

  const handleOpenEdit = (cust: any) => {
    setEditCustomer(cust);
    setFormData({
      customer_name: cust.customer_name,
      mobile_number: cust.mobile_number,
      address: cust.address || '',
      cr_br: cust.cr_br || '',
      opening_balance: cust.opening_balance?.toString() || '0',
      notes: cust.notes || '',
      is_active: cust.is_active
    });
    setIsAddOpen(true);
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to record customer payment');
    } finally {
      setIsSubmittingPayment(false);
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
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Manage wholesale customers, CR/BR numbers, and account ledgers</p>
        </div>
        <button
          onClick={() => {
            setEditCustomer(null);
            setFormData({
              customer_name: '',
              mobile_number: '',
              address: '',
              cr_br: '',
              opening_balance: '0',
              notes: '',
              is_active: 1
            });
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, mobile, or CR/BR reference..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((cust) => {
          const currentDue = Number(cust.current_outstanding) || 0;
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
                    {cust.cr_br && (
                      <span className="inline-block text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md mt-1">
                        CR/BR: {cust.cr_br}
                      </span>
                    )}
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
                    <strong className="text-gray-700 font-semibold">{formatCurrency(cust.opening_balance)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Outstanding Due</span>
                    <strong className={`font-bold text-sm ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(currentDue)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => loadLedger(cust)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-200"
                >
                  <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                  <span>Ledger</span>
                </button>

                <button
                  onClick={() => setPaymentCustomer(cust)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Receive Pay</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(cust)}
                  className="py-2 px-3 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 font-bold text-xs"
                >
                  Edit
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
                placeholder="e.g. 9898989801"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CR/BR Reference</label>
              <input
                type="text"
                value={formData.cr_br}
                onChange={(e) => setFormData({ ...formData, cr_br: e.target.value })}
                placeholder="e.g. CR998877"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Opening Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">Starting balance receivable from customer (due amount)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Shop / Delivery Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Market stall, shop number, road address"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Credit terms or remarks"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
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
              disabled={isSubmittingCustomer}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingCustomer && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingCustomer ? 'Saving Customer...' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Customer Payment Modal */}
      <Modal
        isOpen={!!paymentCustomer}
        onClose={() => setPaymentCustomer(null)}
        title={`Record Payment from ${paymentCustomer?.customer_name}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
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
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter collected amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reference No</label>
              <input
                type="text"
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                placeholder="e.g. UPI Ref / Cheque #"
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
              placeholder="Optional remarks"
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
              className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingPayment ? 'Recording Payment...' : 'Record Payment'}</span>
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
                  className="px-2 py-1 border border-gray-300 rounded-lg"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg"
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

          {/* Ledger Summary */}
          {ledgerData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block">Opening Balance</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(ledgerData.summary.opening_balance)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Total Sales</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(ledgerData.summary.total_sales)}</strong>
                <span className="text-[10px] text-gray-500 block">({ledgerData.summary.total_kg} KG / {ledgerData.summary.total_chicken_qty} Birds)</span>
              </div>
              <div>
                <span className="text-gray-400 block">Total Paid</span>
                <strong className="text-emerald-700 font-bold">{formatCurrency(ledgerData.summary.total_paid)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Current Outstanding</span>
                <strong className="text-brand-700 font-black text-sm">{formatCurrency(ledgerData.summary.current_outstanding)}</strong>
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
                  <th className="py-2.5 px-3">Bill / Reference</th>
                  <th className="py-2.5 px-3">Weight (KG)</th>
                  <th className="py-2.5 px-3">Bill Amount</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerData?.transactions?.length ? (
                  ledgerData.transactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-gray-800">{tx.tx_date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.tx_type === 'BILL' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No customer ledger transactions in this date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
