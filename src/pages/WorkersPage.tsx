import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import { Plus, Users, Search, BookOpen, CreditCard, Phone, Calendar, Loader2 } from 'lucide-react';

interface WorkersPageProps {
  isAddPaymentOpen?: boolean;
  setIsAddPaymentOpen?: (open: boolean) => void;
}

export const WorkersPage: React.FC<WorkersPageProps> = ({
  isAddPaymentOpen: externalOpen,
  setIsAddPaymentOpen: setExternalOpen
}) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [internalPayOpen, setInternalPayOpen] = useState(false);
  const isPayOpen = externalOpen !== undefined ? externalOpen : internalPayOpen;
  const setIsPayOpen = setExternalOpen || setInternalPayOpen;

  const [ledgerWorker, setLedgerWorker] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<{ summary: any; history: any[] } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const toast = useToast();

  // Add Worker Form
  const [workerForm, setWorkerForm] = useState({
    worker_name: '',
    mobile: '',
    role: 'Worker',
    opening_balance: '0',
    notes: ''
  });

  // Worker Payment Form
  const [paymentForm, setPaymentForm] = useState({
    worker_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'Daily Wage',
    amount: '',
    notes: ''
  });

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getWorkers(search);
      setWorkers(res.data || []);
      if (res.data?.length > 0 && !paymentForm.worker_id) {
        setPaymentForm((prev) => ({ ...prev, worker_id: res.data[0].worker_id.toString() }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [search]);

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.worker_name) return;
    setIsSubmittingWorker(true);
    try {
      await api.saveWorker({
        worker_name: workerForm.worker_name,
        mobile: workerForm.mobile,
        role: workerForm.role,
        opening_balance: parseFloat(workerForm.opening_balance) || 0,
        notes: workerForm.notes
      });
      setAddWorkerModalOpen(false);
      setWorkerForm({ worker_name: '', mobile: '', role: 'Worker', opening_balance: '0', notes: '' });
      toast.success('Worker added successfully!');
      loadWorkers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add worker');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.worker_id || !paymentForm.amount) {
      toast.error('Worker and amount are required');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      await api.saveWorkerPayment({
        worker_id: parseInt(paymentForm.worker_id, 10),
        payment_date: paymentForm.payment_date,
        payment_type: paymentForm.payment_type,
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes
      });
      setIsPayOpen(false);
      setPaymentForm({
        worker_id: workers[0]?.worker_id?.toString() || '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'Daily Wage',
        amount: '',
        notes: ''
      });
      toast.success('Worker payment recorded successfully!');
      loadWorkers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record worker payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const loadLedger = async (worker: any, filterType = ledgerFilter) => {
    setLedgerWorker(worker);
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
      const res = await api.getWorkerLedger(worker.worker_id, start, end);
      setLedgerData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load worker ledger');
    }
  };

  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Daily Workers & Drivers</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Daily wage payments, advances, and worker balance ledgers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddWorkerModalOpen(true)}
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-bold text-xs shadow-sm"
          >
            + Add Worker
          </button>
          <button
            onClick={() => setIsPayOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-700/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Pay Daily Wage / Advance</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search worker by name or role (Driver, Worker, Helper)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Worker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {workers.map((w) => (
          <div
            key={w.worker_id}
            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-gray-900 text-base">{w.worker_name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  w.role === 'Driver' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {w.role}
                </span>
              </div>
              {w.mobile && (
                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{w.mobile}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Total Wages Paid</span>
                <strong className="text-gray-900 font-black text-sm">{formatCurrency(w.total_paid)}</strong>
              </div>
              <button
                onClick={() => loadLedger(w)}
                className="py-1.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Worker Ledger Modal */}
      <Modal
        isOpen={!!ledgerWorker}
        onClose={() => setLedgerWorker(null)}
        title={`Worker Ledger — ${ledgerWorker?.worker_name} (${ledgerWorker?.role})`}
        maxWidth="max-w-3xl"
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
                    loadLedger(ledgerWorker, mode);
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
                  onClick={() => loadLedger(ledgerWorker, 'custom')}
                  className="px-2.5 py-1 bg-brand-700 text-white rounded-lg font-bold"
                >
                  Filter
                </button>
              </div>
            )}
          </div>

          {/* Ledger Summary */}
          {ledgerData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block">Total Entries</span>
                <strong className="text-gray-900 font-bold">{ledgerData.summary.total_entries} Days/Trips</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Daily Wages</span>
                <strong className="text-gray-900 font-bold">{formatCurrency(ledgerData.summary.total_daily_wages)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Advances Paid</span>
                <strong className="text-amber-700 font-bold">{formatCurrency(ledgerData.summary.total_advances)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Grand Total Paid</span>
                <strong className="text-brand-700 font-black text-sm">{formatCurrency(ledgerData.summary.total_paid)}</strong>
              </div>
            </div>
          )}

          {/* History Rows */}
          <div className="overflow-x-auto max-h-80 rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Payment Type</th>
                  <th className="py-2.5 px-3">Trip / Vehicle / Notes</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerData?.history?.length ? (
                  ledgerData.history.map((h: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium">{h.payment_date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.payment_type === 'Daily Wage' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {h.payment_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {h.vehicle_number ? `Vehicle: ${h.vehicle_number} ` : ''}
                        {h.notes || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        {formatCurrency(h.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">No payment records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Add Worker Modal */}
      <Modal
        isOpen={addWorkerModalOpen}
        onClose={() => setAddWorkerModalOpen(false)}
        title="Add New Daily Wage Worker"
      >
        <form onSubmit={handleSaveWorker} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Worker Name *</label>
            <input
              type="text"
              required
              value={workerForm.worker_name}
              onChange={(e) => setWorkerForm({ ...workerForm, worker_name: e.target.value })}
              placeholder="e.g. Ahmed, Rakesh"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
              <input
                type="text"
                value={workerForm.mobile}
                onChange={(e) => setWorkerForm({ ...workerForm, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Role *</label>
              <select
                value={workerForm.role}
                onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              >
                <option value="Driver">Driver</option>
                <option value="Worker">Worker</option>
                <option value="Helper">Helper</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Opening Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              value={workerForm.opening_balance}
              onChange={(e) => setWorkerForm({ ...workerForm, opening_balance: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">Starting balance (if worker has an advance or outstanding wage)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={workerForm.notes}
              onChange={(e) => setWorkerForm({ ...workerForm, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddWorkerModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingWorker}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingWorker && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingWorker ? 'Saving Worker...' : 'Save Worker'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Worker Modal */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title="Record Worker Daily Wage or Advance Payment"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Worker *</label>
              <select
                required
                value={paymentForm.worker_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, worker_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              >
                <option value="">Select Worker</option>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.worker_name} ({w.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Payment Type</label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
              >
                <option value="Daily Wage">Daily Wage</option>
                <option value="Advance">Advance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="50"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="e.g. 800"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none font-bold text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="e.g. Full day loading & delivery wage"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPayOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
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
