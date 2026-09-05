import React, { useEffect, useState } from 'react';
import { api, getBillDownloadUrl, downloadBillPdfFile, generateWhatsAppBillShare, formatWhatsAppMobile } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Plus, Search, Receipt, Share2, Download, Eye,
  CheckCircle2, CreditCard, MessageCircle, AlertCircle,
  FileText, Loader2, Edit, Trash2, AlertTriangle, ArrowUpRight, Scale
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
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<any>(null);
  const [wpPromptBill, setWpPromptBill] = useState<any>(null);
  const [customWpPhone, setCustomWpPhone] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
  const toast = useToast();

  // Bill Creation/Editing Form State
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

  // Aggregate Metrics across all bills
  const aggregateMetrics = bills.reduce(
    (acc, b) => {
      acc.totalBilled += Number(b.current_bill_amount) || 0;
      acc.totalPaid += Number(b.amount_paid) || 0;
      acc.totalPending += Number(b.final_pending_amount) || 0;
      acc.totalKg += Number(b.total_kg) || 0;
      acc.totalBirds += Number(b.total_quantity) || 0;
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalPending: 0, totalKg: 0, totalBirds: 0 }
  );

  // Handle prefilled data from Delivery Page
  useEffect(() => {
    if (prefilledBillData) {
      const cust = customers.find((c) => c.customer_id === prefilledBillData.customer_id);
      setEditingBillId(null);
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
        bill_id: editingBillId || undefined,
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
      setEditingBillId(null);
      toast.success(editingBillId ? `Bill updated successfully!` : `Bill ${res.data?.bill_number || ''} generated successfully!`);
      loadBills();

      if (res.data?.bill_id) {
        handleViewBill(res.data.bill_id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create bill');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  const handleOpenEditBill = async (b: any) => {
    try {
      const res = await api.getBillById(b.bill_id);
      const fullBill = res.data;
      const details = fullBill.details || [];

      setEditingBillId(fullBill.bill_id);
      setBillForm({
        bill_date: fullBill.bill_date,
        customer_id: fullBill.customer_id.toString(),
        truck_id: fullBill.truck_id ? fullBill.truck_id.toString() : '',
        delivery_id: fullBill.delivery_id || null,
        customer_name: fullBill.customer_name_snapshot,
        customer_mobile: fullBill.customer_mobile_snapshot,
        customer_cr_br: fullBill.customer_cr_br_snapshot || '',
        customer_address: fullBill.customer_address_snapshot || '',
        truck_info: fullBill.truck_info_snapshot || '',
        previous_pending: Number(fullBill.previous_pending_amount) || 0,
        amount_paid: fullBill.amount_paid?.toString() || '0',
        notes: fullBill.notes || '',
        items: details.length > 0 ? details.map((d: any) => ({
          box_id: d.box_id || d.box_number,
          box_number: d.box_number,
          chicken_quantity: Number(d.chicken_quantity),
          total_kg: Number(d.total_kg),
          price_per_kg: Number(d.price_per_kg),
          amount: Number(d.amount)
        })) : [{ box_id: 1, box_number: 1, chicken_quantity: 20, total_kg: 25.0, price_per_kg: 200, amount: 5000 }]
      });

      if (billModalOpen) setBillModalOpen(false);
      setIsAddOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bill for editing');
    }
  };

  const handleDeleteBill = async () => {
    if (!deleteConfirmBill) return;
    setIsDeletingBill(true);
    try {
      await api.deleteBill(deleteConfirmBill.bill_id);
      toast.success(`Bill ${deleteConfirmBill.bill_number} deleted successfully!`);
      setDeleteConfirmBill(null);
      if (billModalOpen) setBillModalOpen(false);
      loadBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bill');
    } finally {
      setIsDeletingBill(false);
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

  const handleShareWhatsApp = (bill: any, overridePhone?: string) => {
    const rawMobile = overridePhone !== undefined ? overridePhone : (bill.customer_mobile_snapshot || bill.customer_mobile || '');
    const cleanMobile = formatWhatsAppMobile(rawMobile);

    // If no mobile number available, open the quick phone entry modal
    if (!cleanMobile && overridePhone === undefined) {
      setWpPromptBill(bill);
      setCustomWpPhone('');
      return;
    }

    const { url } = generateWhatsAppBillShare({
      customer_name_snapshot: bill.customer_name_snapshot || bill.customer_name,
      customer_mobile_snapshot: cleanMobile,
      bill_number: bill.bill_number,
      total_quantity: bill.total_quantity,
      total_kg: bill.total_kg,
      current_bill_amount: bill.current_bill_amount,
      amount_paid: bill.amount_paid,
      final_pending_amount: bill.final_pending_amount,
      customMobile: cleanMobile
    });

    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening WhatsApp for ${bill.customer_name_snapshot || bill.customer_name || 'customer'}!`);

    if (bill.bill_id) {
      api.updateBillWhatsappStatus(bill.bill_id, 'SENT').catch(console.error);
      setBills((prev) =>
        prev.map((b) => (b.bill_id === bill.bill_id ? { ...b, whatsapp_status: 'SENT' } : b))
      );
      if (selectedBill && selectedBill.bill_id === bill.bill_id) {
        setSelectedBill((prev: any) => ({ ...prev, whatsapp_status: 'SENT' }));
      }
    }

    if (wpPromptBill) setWpPromptBill(null);
  };

  const handleDownloadPdf = async (billNumber: string) => {
    setIsDownloadingPdf(true);
    toast.success(`Downloading invoice ${billNumber}...`);
    try {
      await downloadBillPdfFile(billNumber);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download PDF invoice');
    } finally {
      setIsDownloadingPdf(false);
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
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Generate invoices, manage payments, edit bills, and track total customer pending amounts
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBillId(null);
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

      {/* KPI Summary Cards including TOTAL PENDING RECEIVABLE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invoices</span>
            <Receipt className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {bills.length}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">Billed Orders</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Billed</span>
            <span className="text-[11px] font-bold text-gray-400">Gross</span>
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-gray-900 block">
              {formatCurrency(aggregateMetrics.totalBilled)}
            </strong>
            <span className="text-[11px] text-gray-500 font-medium">Current Invoices Value</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Paid on Bills</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <strong className="text-lg sm:text-xl font-black text-emerald-700 block">
              {formatCurrency(aggregateMetrics.totalPaid)}
            </strong>
            <span className="text-[11px] text-emerald-600 font-semibold">Immediate Payments</span>
          </div>
        </div>

        {/* PROMINENT TOTAL PENDING CUSTOMER BALANCE */}
        <div className="p-4 bg-rose-50/80 rounded-2xl border-2 border-rose-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-black uppercase tracking-wider">Total Pending Due</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800">
              Receivable
            </span>
          </div>
          <div className="mt-2">
            <strong className="text-xl sm:text-2xl font-black text-rose-700 block">
              {formatCurrency(aggregateMetrics.totalPending)}
            </strong>
            <span className="text-[11px] text-rose-600 font-bold">
              Outstanding Final Due on Bills
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
          placeholder="Search by bill number (ST-2026-...), customer name, or CR/BR..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Mobile Bills Card / Box View (md:hidden) - ZERO horizontal scroll */}
      <div className="md:hidden space-y-3">
        {bills.length > 0 ? (
          bills.map((b) => (
            <div
              key={b.bill_id}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header: Bill #, Date, WP Status */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-black text-brand-700 text-sm tracking-tight">
                    {b.bill_number}
                  </span>
                  {b.whatsapp_status === 'SENT' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>WP Sent</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                      WP Pending
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {b.bill_date}
                </span>
              </div>

              {/* Customer & Quantity Info */}
              <div className="py-2.5 flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm leading-snug">
                    {b.customer_name_snapshot}
                  </h4>
                  {b.customer_mobile_snapshot && (
                    <a
                      href={`tel:${b.customer_mobile_snapshot}`}
                      className="text-xs text-brand-700 font-semibold hover:underline mt-0.5 inline-block"
                    >
                      📱 {b.customer_mobile_snapshot}
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                    Weight & Birds
                  </span>
                  <strong className="text-xs font-black text-gray-800 block">
                    {Number(b.total_kg).toFixed(2)} KG
                  </strong>
                  <span className="text-[11px] text-gray-500 block">
                    ({b.total_quantity} Birds)
                  </span>
                </div>
              </div>

              {/* Financial Breakdown Box (3 Columns) */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center my-1.5">
                <div className="p-1">
                  <span className="text-[10px] text-gray-500 font-semibold block">Bill Amount</span>
                  <strong className="text-xs font-extrabold text-gray-900 block mt-0.5">
                    {formatCurrency(b.current_bill_amount)}
                  </strong>
                </div>
                <div className="p-1 border-x border-gray-200">
                  <span className="text-[10px] text-emerald-700 font-semibold block">Paid</span>
                  <strong className="text-xs font-extrabold text-emerald-700 block mt-0.5">
                    {formatCurrency(b.amount_paid)}
                  </strong>
                </div>
                <div className="p-1 bg-rose-50/80 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold block">Final Due</span>
                  <strong className="text-xs font-black text-rose-600 block mt-0.5">
                    {formatCurrency(b.final_pending_amount)}
                  </strong>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    onClick={() => handleShareWhatsApp(b)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(b.bill_number)}
                    className="py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Direct Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleViewBill(b.bill_id)}
                    className="py-1.5 px-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="View Bill Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPaymentModalBill(b)}
                    title="Record Payment"
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEditBill(b)}
                    title="Edit Bill"
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmBill(b)}
                    title="Delete Bill"
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
            <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold">No bills found</p>
          </div>
        )}
      </div>

      {/* Desktop Bills Table View (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                  <tr key={b.bill_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-brand-700 whitespace-nowrap">
                      {b.bill_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-700">
                      {b.bill_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-gray-900 font-bold">{b.customer_name_snapshot}</strong>
                        {b.whatsapp_status === 'SENT' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800" title="WhatsApp sent">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>WP Sent</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">{b.customer_mobile_snapshot || 'No mobile'}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {Number(b.total_kg).toFixed(2)} KG <span className="text-gray-500 font-normal">({b.total_quantity} Birds)</span>
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
                          onClick={() => handleShareWhatsApp(b)}
                          title="Send Bill on WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(b.bill_number)}
                          title="Direct Download PDF"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

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

                        <button
                          onClick={() => handleOpenEditBill(b)}
                          title="Edit Bill"
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmBill(b)}
                          title="Delete Bill"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Bill Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingBillId(null);
        }}
        title={editingBillId ? 'Edit Customer Bill' : 'Create Customer Bill'}
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
                    {c.customer_name}
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

          {/* Customer Snapshot Preview with Positive/Negative Advance detection */}
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
                <span className="text-gray-400 block">Account Nature</span>
                <strong className={billForm.previous_pending < 0 ? 'text-blue-600' : 'text-gray-900'}>
                  {billForm.previous_pending < 0 ? 'CR (Advance Paid)' : 'DR (Receivable)'}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">
                  {billForm.previous_pending < 0 ? 'Advance Adjusted' : 'Previous Pending'}
                </span>
                <strong className={`font-extrabold ${billForm.previous_pending < 0 ? 'text-blue-600' : 'text-rose-700'}`}>
                  {billForm.previous_pending < 0
                    ? `-${formatCurrency(Math.abs(billForm.previous_pending))} (Credit)`
                    : formatCurrency(billForm.previous_pending)}
                </strong>
              </div>
            </div>
          )}

          {/* Line Items Cards (Responsive - Zero Horizontal Scroll) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span>Box Line Items ({billForm.items.length})</span>
                <span className="text-[11px] text-gray-500 font-normal">(બોક્સ વિગતો)</span>
              </h4>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
              >
                + Add Box
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
              {billForm.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-gray-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 font-extrabold text-xs rounded-md border border-brand-200/70">
                        Box #{item.box_number} (બોક્સ)
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="text-[11px]">No:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.box_number}
                          onChange={(e) => handleUpdateLineItem(idx, 'box_number', parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1.5 py-0.5 border border-gray-300 rounded-md font-bold text-center text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-medium leading-none mb-0.5">Amount (રકમ)</span>
                        <span className="font-extrabold text-xs text-brand-800">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors ml-1"
                        title="Remove Box"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Birds (મરઘા)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.chicken_quantity || ''}
                        onChange={(e) => handleUpdateLineItem(idx, 'chicken_quantity', parseInt(e.target.value, 10) || 0)}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Weight (KG/વજન)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={item.total_kg || ''}
                        onChange={(e) => handleUpdateLineItem(idx, 'total_kg', parseFloat(e.target.value) || 0)}
                        placeholder="KG"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Rate/KG (ભાવ/₹)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={item.price_per_kg || ''}
                        onChange={(e) => handleUpdateLineItem(idx, 'price_per_kg', parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Calculation Summary Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* 1. Weight & Birds */}
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block font-semibold text-[11px]">Total Weight & Birds (કુલ વજન અને મરઘા)</span>
                <strong className="text-sm font-extrabold text-gray-900 block mt-0.5">
                  {totalKg.toFixed(2)} KG
                </strong>
                <span className="text-[10px] text-gray-500 font-medium">({totalQty} Birds)</span>
              </div>

              {/* 2. Previous Due / Balance (BEFORE current amount) */}
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block font-semibold text-[11px]">Previous Due (અગાઉની બાકી)</span>
                <strong className={`text-sm font-extrabold block mt-0.5 ${
                  billForm.previous_pending < 0 ? 'text-blue-600' : billForm.previous_pending > 0 ? 'text-rose-600' : 'text-gray-700'
                }`}>
                  {billForm.previous_pending < 0
                    ? `-${formatCurrency(Math.abs(billForm.previous_pending))} (Adv)`
                    : formatCurrency(billForm.previous_pending)}
                </strong>
                <span className="text-[10px] text-gray-400 font-medium">Old Outstanding</span>
              </div>

              {/* 3. Current Bill Amount */}
              <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block font-semibold text-[11px]">(+) Current Bill (હાલનું બિલ)</span>
                <strong className="text-sm font-black text-gray-900 block mt-0.5">
                  {formatCurrency(currentBillAmount)}
                </strong>
                <span className="text-[10px] text-gray-400 font-medium">This Invoice</span>
              </div>

              {/* 4. Total Net Due */}
              <div className="p-2.5 bg-brand-50/70 rounded-xl border border-brand-200 shadow-2xs">
                <span className="text-brand-700 block font-bold text-[11px]">(=) Total Net Due (કુલ બાકી)</span>
                <strong className="text-sm font-black text-brand-800 block mt-0.5">
                  {formatCurrency(totalDueAmount)}
                </strong>
                <span className="text-[10px] text-brand-600 font-medium">Old Due + Current</span>
              </div>

              {/* 5. Amount Paid Now Input */}
              <div className="p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs col-span-2 sm:col-span-1">
                <label className="block text-emerald-800 font-bold mb-1 text-[11px]">(-) Amount Paid (ચૂકવેલ રકમ/₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={billForm.amount_paid}
                  onChange={(e) => setBillForm({ ...billForm, amount_paid: e.target.value })}
                  className="w-full px-2 py-1 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/40"
                  placeholder="0.00"
                />
                <span className="text-[10px] text-emerald-600 font-medium">Received Now</span>
              </div>
            </div>

            {/* Bottom Row: Calculation explanation and Remaining Pending Due */}
            <div className="pt-2.5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">Calculation: </span>
                <span>
                  Previous ({formatCurrency(billForm.previous_pending)}) + Current ({formatCurrency(currentBillAmount)}) − Paid ({formatCurrency(amountPaidNum)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-gray-700">Remaining Pending Due (અંતિમ બાકી):</span>
                <strong className="text-base font-black text-rose-600">
                  {formatCurrency(finalPendingAmount)}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={billForm.notes}
              onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
              placeholder="Optional remarks or discount notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setEditingBillId(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBill}
              className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingBill && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingBill ? 'Saving...' : editingBillId ? 'Update Bill & Invoice' : 'Generate Bill & PDF'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Bill View Modal */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title={`Invoice ${selectedBill?.bill_number || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-gray-900 text-sm sm:text-base truncate">
                  {selectedBill.customer_name_snapshot}
                </h3>
                <span className="text-xs text-gray-500 font-medium block">
                  Mob: {selectedBill.customer_mobile_snapshot || 'N/A'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => handleShareWhatsApp(selectedBill)}
                  className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
                  title="Send Bill on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold">WhatsApp</span>
                </button>

                <button
                  onClick={() => handleDownloadPdf(selectedBill.bill_number)}
                  disabled={isDownloadingPdf}
                  className="p-2 sm:px-3 sm:py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
                  title="Direct Download PDF"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline text-xs font-bold">PDF</span>
                </button>

                <button
                  onClick={() => handleOpenEditBill(selectedBill)}
                  className="p-2 sm:px-3 sm:py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                  title="Edit Bill"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold">Edit</span>
                </button>

                <button
                  onClick={() => {
                    setDeleteConfirmBill(selectedBill);
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                  title="Delete Bill"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold">Delete</span>
                </button>
              </div>
            </div>

            {/* Bill Line Items (Responsive Cards/Rows - Zero Horizontal Scroll) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center justify-between">
                <span>Box Line Items ({selectedBill.details?.length || 0})</span>
                <span className="text-[11px] text-gray-500 font-normal">(બોક્સ વિગતો)</span>
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {(selectedBill.details || []).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white font-extrabold text-brand-700 rounded-md border border-gray-200 shadow-2xs">
                        Box #{item.box_number}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {item.chicken_quantity} Birds (મરઘા)
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="font-semibold text-gray-800">
                        {Number(item.total_kg).toFixed(2)} KG (વજન)
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                      <span className="text-gray-500">
                        @ ₹{Number(item.price_per_kg).toFixed(2)}/KG
                      </span>
                      <span className="font-extrabold text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Previous Balance (અગાઉની બાકી):</span>
                <strong className={Number(selectedBill.previous_pending_amount) < 0 ? 'text-blue-600' : 'text-gray-900'}>
                  {Number(selectedBill.previous_pending_amount) < 0
                    ? `-${formatCurrency(Math.abs(selectedBill.previous_pending_amount))} (Advance)`
                    : formatCurrency(selectedBill.previous_pending_amount)}
                </strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>(+) Current Bill Amount (હાલનું બિલ):</span>
                <strong className="text-gray-900">{formatCurrency(selectedBill.current_bill_amount)}</strong>
              </div>
              <div className="flex justify-between text-brand-700 font-bold border-t border-gray-200/70 pt-1">
                <span>(=) Total Net Due (કુલ બાકી):</span>
                <strong>{formatCurrency(selectedBill.total_due_amount)}</strong>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>(-) Amount Paid (ચૂકવેલ રકમ):</span>
                <strong className="font-bold">{formatCurrency(selectedBill.amount_paid)}</strong>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 text-rose-700">
                <span className="font-bold">(=) Final Pending Balance (અંતિમ બાકી):</span>
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

      {/* Delete Bill Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmBill}
        onClose={() => setDeleteConfirmBill(null)}
        title="Delete Bill"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete invoice <strong>{deleteConfirmBill?.bill_number}</strong> for{' '}
            <strong>{deleteConfirmBill?.customer_name_snapshot}</strong> amounting to{' '}
            <strong>{formatCurrency(deleteConfirmBill?.current_bill_amount)}</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmBill(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingBill}
              onClick={handleDeleteBill}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeletingBill && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeletingBill ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick WhatsApp Send Modal (if phone number is missing or needs updating) */}
      <Modal
        isOpen={!!wpPromptBill}
        onClose={() => setWpPromptBill(null)}
        title="Send Bill via WhatsApp"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Send invoice <strong>{wpPromptBill?.bill_number}</strong> for{' '}
            <strong>{wpPromptBill?.customer_name_snapshot || wpPromptBill?.customer_name}</strong> via WhatsApp.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Recipient WhatsApp Mobile Number *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">+91</span>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={customWpPhone}
                onChange={(e) => setCustomWpPhone(e.target.value)}
                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Enter 10-digit phone number without country code or spaces.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1 text-gray-600">
            <div className="flex justify-between font-semibold">
              <span>Invoice:</span>
              <span className="text-gray-900">{wpPromptBill?.bill_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Bill Amount:</span>
              <strong className="text-gray-900">{formatCurrency(wpPromptBill?.current_bill_amount)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Net Pending:</span>
              <strong className="text-rose-600">{formatCurrency(wpPromptBill?.final_pending_amount)}</strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWpPromptBill(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!customWpPhone.trim()) {
                  toast.error('Please enter a mobile number');
                  return;
                }
                handleShareWhatsApp(wpPromptBill, customWpPhone.trim());
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
