import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Plus, Search, Receipt, Share2, Download, Eye,
  CheckCircle2, CreditCard, MessageCircle, AlertCircle, FileText, Loader2
} from 'lucide-react';

interface BillsPageProps {
  isAddBillOpen?: boolean;
  setIsAddBillOpen?: (open: boolean) => void;
  prefilledBillData?: any;
  clearPrefilledBillData?: () => void;
}

export const BillsPage: React.FC<BillsPageProps> = ({
  isAddBillOpen: externalOpen,
  setIsAddBillOpen: setExternalOpen,
  prefilledBillData,
  clearPrefilledBillData
}) => {
  const [bills, setBills] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddOpen = externalOpen !== undefined ? externalOpen : internalAddOpen;
  const setIsAddOpen = setExternalOpen || setInternalAddOpen;

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [paymentModalBill, setPaymentModalBill] = useState<any>(null);

  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const toast = useToast();

  // Bill Creation Form State
  const [billForm, setBillForm] = useState({
    bill_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    truck_id: '',
    delivery_id: null as number | null,
    customer_name: '',
    customer_mobile: '',
    customer_cr_br: '',
    customer_address: '',
    truck_info: '',
    previous_pending: 0,
    amount_paid: '0',
    notes: '',
    items: [
      { box_id: 1, box_number: 1, chicken_quantity: 20, total_kg: 25.0, price_per_kg: 200, amount: 5000 }
    ]
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'Cash',
    reference_no: '',
    notes: ''
  });

  const loadBills = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBills(undefined, undefined, undefined, search || undefined);
      setBills(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getCustomers(undefined, 1), api.getTrucks()])
      .then(([custRes, truckRes]) => {
        setCustomers(custRes.data || []);
        setTrucks(truckRes.data || []);
      })
      .catch(console.error);

    loadBills();
  }, [search]);

  // Handle prefilled data from Delivery Page
  useEffect(() => {
    if (prefilledBillData) {
      const cust = customers.find((c) => c.customer_id === prefilledBillData.customer_id);
      setBillForm({
        bill_date: prefilledBillData.delivery_date || new Date().toISOString().split('T')[0],
        customer_id: prefilledBillData.customer_id.toString(),
        truck_id: prefilledBillData.truck_id?.toString() || '',
        delivery_id: prefilledBillData.delivery_id || null,
        customer_name: prefilledBillData.customer_name || cust?.customer_name || '',
        customer_mobile: prefilledBillData.customer_mobile || cust?.mobile_number || '',
        customer_cr_br: prefilledBillData.customer_cr_br || cust?.cr_br || '',
        customer_address: prefilledBillData.customer_address || cust?.address || '',
        truck_info: prefilledBillData.truck_info || '',
        previous_pending: cust ? Number(cust.current_outstanding) || 0 : 0,
        amount_paid: '0',
        notes: '',
        items: (prefilledBillData.items || []).map((b: any) => ({
          box_id: b.box_id,
          box_number: b.box_number,
          chicken_quantity: b.chicken_qty,
          total_kg: b.total_kg,
          price_per_kg: b.price_per_kg,
          amount: b.amount
        }))
      });
      setIsAddOpen(true);
      if (clearPrefilledBillData) clearPrefilledBillData();
    }
  }, [prefilledBillData, customers]);

  // When customer is selected, auto-populate details & previous pending
  const handleCustomerChange = async (customerIdStr: string) => {
    const custId = parseInt(customerIdStr, 10);
    const cust = customers.find((c) => c.customer_id === custId);
    if (cust) {
      let pendingVal = Number(cust.current_outstanding) || 0;
      try {
        const pendingRes = await api.getCustomerPending(custId);
        if (pendingRes.data?.previous_pending !== undefined) {
          pendingVal = Number(pendingRes.data.previous_pending);
        }
      } catch (err) {
        console.warn('Could not fetch exact pending balance, using master balance', err);
      }

      setBillForm((prev) => ({
        ...prev,
        customer_id: customerIdStr,
        customer_name: cust.customer_name,
        customer_mobile: cust.mobile_number,
        customer_cr_br: cust.cr_br || '',
        customer_address: cust.address || '',
        previous_pending: pendingVal
      }));
    } else {
      setBillForm((prev) => ({
        ...prev,
        customer_id: '',
        customer_name: '',
        customer_mobile: '',
        customer_cr_br: '',
        customer_address: '',
        previous_pending: 0
      }));
    }
  };

  // Calculations for current bill form
  const totalQty = billForm.items.reduce((s, i) => s + (Number(i.chicken_quantity) || 0), 0);
  const totalKg = billForm.items.reduce((s, i) => s + (Number(i.total_kg) || 0), 0);
  const currentBillAmount = billForm.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalDueAmount = currentBillAmount + billForm.previous_pending;
  const amountPaidNum = parseFloat(billForm.amount_paid) || 0;
  const finalPendingAmount = totalDueAmount - amountPaidNum;

  // Add box line item
  const handleAddLineItem = () => {
    const nextBoxNum = billForm.items.length + 1;
    setBillForm({
      ...billForm,
      items: [
        ...billForm.items,
        {
          box_id: nextBoxNum,
          box_number: nextBoxNum,
          chicken_quantity: 20,
          total_kg: 25.0,
          price_per_kg: 200,
          amount: 5000
        }
      ]
    });
  };

  const handleUpdateLineItem = (index: number, field: string, value: number) => {
    const newItems = [...billForm.items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'total_kg' || field === 'price_per_kg') {
      item.amount = parseFloat((item.total_kg * item.price_per_kg).toFixed(2));
    }
    newItems[index] = item;
    setBillForm({ ...billForm, items: newItems });
  };

  const handleRemoveLineItem = (index: number) => {
    if (billForm.items.length === 1) {
      toast.error('A bill must contain at least one box');
      return;
    }
    setBillForm({
      ...billForm,
      items: billForm.items.filter((_, i) => i !== index)
    });
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.customer_id || billForm.items.length === 0) {
      toast.error('Please select a customer and specify at least one box');
      return;
    }

    setIsSubmittingBill(true);
    try {
      const truck = trucks.find((t) => t.truck_id === parseInt(billForm.truck_id, 10));
      const truckInfo = truck ? `${truck.truck_name} (${truck.truck_number})` : billForm.truck_info;

      const payload = {
        bill_date: billForm.bill_date,
        customer_id: parseInt(billForm.customer_id, 10),
        truck_id: billForm.truck_id ? parseInt(billForm.truck_id, 10) : null,
        delivery_id: billForm.delivery_id,
        customer_name: billForm.customer_name,
        customer_mobile: billForm.customer_mobile,
        customer_cr_br: billForm.customer_cr_br,
        customer_address: billForm.customer_address,
        truck_info: truckInfo,
        amount_paid: amountPaidNum,
        notes: billForm.notes,
        items: billForm.items
      };

      const res = await api.createBill(payload);
      setIsAddOpen(false);
      toast.success(`Bill ${res.data?.bill_number || ''} generated successfully!`);
      loadBills();

      // View created bill immediately
      if (res.data?.bill_id) {
        handleViewBill(res.data.bill_id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create bill');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  const handleViewBill = async (billId: number) => {
    try {
      const res = await api.getBillById(billId);
      setSelectedBill(res.data);
      setBillModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bill details');
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBill) return;
    setIsSubmittingPayment(true);
    try {
      await api.recordBillPayment({
        customer_id: paymentModalBill.customer_id,
        bill_id: paymentModalBill.bill_id,
        ...paymentForm
      });
      setPaymentModalBill(null);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_no: '',
        notes: ''
      });
      toast.success('Payment recorded against bill!');
      loadBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
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
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Customer Bills & Invoices</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Automatic unique bill numbers, PDF generation & WhatsApp sharing</p>
        </div>
        <button
          onClick={() => {
            setBillForm({
              bill_date: new Date().toISOString().split('T')[0],
              customer_id: '',
              truck_id: '',
              delivery_id: null,
              customer_name: '',
              customer_mobile: '',
              customer_cr_br: '',
              customer_address: '',
              truck_info: '',
              previous_pending: 0,
              amount_paid: '0',
              notes: '',
              items: [{ box_id: 1, box_number: 1, chicken_quantity: 20, total_kg: 25.0, price_per_kg: 200, amount: 5000 }]
            });
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bill</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by bill number (ST-2026-...), customer name, or CR/BR..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Bills Cards / Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Bill Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Weight & Birds</th>
                <th className="py-3 px-4">Bill Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Final Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.length > 0 ? (
                bills.map((b) => (
                  <tr key={b.bill_id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4 font-extrabold text-brand-700 whitespace-nowrap">
                      {b.bill_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-700">
                      {b.bill_date}
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-gray-900 block font-bold">{b.customer_name_snapshot}</strong>
                      <span className="text-[10px] text-gray-500">{b.customer_mobile_snapshot}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {b.total_kg} KG <span className="text-gray-500 font-normal">({b.total_quantity} Birds)</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {formatCurrency(b.current_bill_amount)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatCurrency(b.amount_paid)}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600">
                      {formatCurrency(b.final_pending_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewBill(b.bill_id)}
                          title="View Bill Details & PDF"
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPaymentModalBill(b)}
                          title="Record Payment"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">No bills found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Bill Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Customer Bill"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Bill Date *</label>
              <input
                type="date"
                required
                value={billForm.bill_date}
                onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Customer *</label>
              <select
                required
                value={billForm.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_name} {c.cr_br ? `(${c.cr_br})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Truck / Vehicle</label>
              <select
                value={billForm.truck_id}
                onChange={(e) => setBillForm({ ...billForm, truck_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Truck (Optional)</option>
                {trucks.map((t) => (
                  <option key={t.truck_id} value={t.truck_id}>
                    {t.truck_name} — {t.truck_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Snapshot Preview */}
          {billForm.customer_name && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-gray-400 block">Customer Name</span>
                <strong className="text-gray-900">{billForm.customer_name}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Mobile</span>
                <strong className="text-gray-900">{billForm.customer_mobile || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">CR/BR</span>
                <strong className="text-gray-900">{billForm.customer_cr_br || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold text-rose-700">Previous Pending</span>
                <strong className="text-rose-700 font-extrabold">{formatCurrency(billForm.previous_pending)}</strong>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Box Line Items</h4>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors"
              >
                + Add Box
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Box #</th>
                    <th className="py-2 px-3">Birds Qty</th>
                    <th className="py-2 px-3">Weight (KG)</th>
                    <th className="py-2 px-3">Price / KG (₹)</th>
                    <th className="py-2 px-3">Amount (₹)</th>
                    <th className="py-2 px-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billForm.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={item.box_number}
                          onChange={(e) => handleUpdateLineItem(idx, 'box_number', parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={item.chicken_quantity}
                          onChange={(e) => handleUpdateLineItem(idx, 'chicken_quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.total_kg}
                          onChange={(e) => handleUpdateLineItem(idx, 'total_kg', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          value={item.price_per_kg}
                          onChange={(e) => handleUpdateLineItem(idx, 'price_per_kg', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Summary (Strictly per Prompt Rule #21) */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block font-semibold">Total Chicken Qty</span>
              <strong className="text-gray-900 font-extrabold text-sm">{totalQty} Birds</strong>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Total Weight (KG)</span>
              <strong className="text-gray-900 font-extrabold text-sm">{totalKg.toFixed(2)} KG</strong>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Current Bill Amount</span>
              <strong className="text-gray-900 font-extrabold text-sm">{formatCurrency(currentBillAmount)}</strong>
            </div>

            <div>
              <span className="text-rose-600 block font-semibold">Previous Pending</span>
              <strong className="text-rose-600 font-extrabold text-sm">{formatCurrency(billForm.previous_pending)}</strong>
            </div>

            <div>
              <span className="text-gray-900 block font-bold text-xs uppercase">Total Due Amount</span>
              <strong className="text-gray-900 font-black text-base">{formatCurrency(totalDueAmount)}</strong>
            </div>

            <div>
              <label className="block text-emerald-800 font-bold mb-1">Amount Paid (₹)</label>
              <input
                type="number"
                step="0.01"
                value={billForm.amount_paid}
                onChange={(e) => setBillForm({ ...billForm, amount_paid: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-emerald-300 bg-white rounded-lg text-xs font-bold text-emerald-800 outline-none"
              />
            </div>

            <div className="col-span-2">
              <span className="text-rose-700 block font-bold text-xs uppercase">Final Pending Balance</span>
              <strong className="text-rose-700 font-black text-lg">{formatCurrency(finalPendingAmount)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={billForm.notes}
              onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
              placeholder="Delivery notes or vehicle reference"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
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
              disabled={isSubmittingBill}
              className="px-6 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingBill && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingBill ? 'Generating Bill & PDF...' : 'Generate Bill & PDF'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Bill / Share PDF Modal */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title={`Bill — ${selectedBill?.bill_number || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedBill && (
          <div className="space-y-4">
            {/* Header / Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <span className="text-xs text-gray-500 block">Bill Number</span>
                <span className="font-extrabold text-brand-700 text-base">{selectedBill.bill_number}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* 1-Click WhatsApp Share Button */}
                <a
                  href={selectedBill.whatsapp_share_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>

                {/* Download PDF Button */}
                {selectedBill.pdf_local_path && (
                  <a
                    href={selectedBill.pdf_local_path}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
            </div>

            {/* Bill Details Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block">Date</span>
                <strong className="text-gray-900">{selectedBill.bill_date}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Customer</span>
                <strong className="text-gray-900">{selectedBill.customer_name_snapshot}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Mobile</span>
                <strong className="text-gray-900">{selectedBill.customer_mobile_snapshot}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">CR/BR</span>
                <strong className="text-gray-900">{selectedBill.customer_cr_br_snapshot || 'N/A'}</strong>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Box #</th>
                    <th className="py-2 px-3">Qty (Birds)</th>
                    <th className="py-2 px-3">Weight (KG)</th>
                    <th className="py-2 px-3">Rate / KG</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedBill.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold">Box {item.box_number}</td>
                      <td className="py-2 px-3">{item.chicken_quantity}</td>
                      <td className="py-2 px-3">{item.total_kg} KG</td>
                      <td className="py-2 px-3">₹{item.price_per_kg}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Bill Amount:</span>
                <strong className="text-gray-900">{formatCurrency(selectedBill.current_bill_amount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Previous Pending:</span>
                <strong className="text-gray-900">{formatCurrency(selectedBill.previous_pending_amount)}</strong>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-900 font-bold">Total Due:</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(selectedBill.total_due_amount)}</strong>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid:</span>
                <strong className="font-bold">{formatCurrency(selectedBill.amount_paid)}</strong>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 text-rose-700">
                <span className="font-bold">Final Pending Balance:</span>
                <strong className="font-black text-sm">{formatCurrency(selectedBill.final_pending_amount)}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModalBill}
        onClose={() => setPaymentModalBill(null)}
        title={`Record Payment for Bill ${paymentModalBill?.bill_number}`}
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
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
                placeholder="UTR / Receipt No"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaymentModalBill(null)}
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
              <span>{isSubmittingPayment ? 'Saving Payment...' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
