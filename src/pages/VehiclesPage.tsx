import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import { Plus, Truck, Calendar, UserCheck, Wrench, Fuel, Users, BarChart2, Loader2, Edit, Trash2, AlertTriangle } from 'lucide-react';

interface VehiclesPageProps {
  isAddEntryOpen?: boolean;
  setIsAddEntryOpen?: (open: boolean) => void;
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({
  isAddEntryOpen: externalOpen,
  setIsAddEntryOpen: setExternalOpen
}) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [vehicleReport, setVehicleReport] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'entries' | 'report' | 'master'>('entries');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddEntryOpen = externalOpen !== undefined ? externalOpen : internalAddOpen;
  const setIsAddEntryOpen = setExternalOpen || setInternalAddOpen;

  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState<any>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<any>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [viewEntryDetails, setViewEntryDetails] = useState<any>(null);

  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const toast = useToast();

  // Add/Edit Vehicle Form
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_name: '',
    notes: ''
  });


  // Vehicle Daily Entry Form
  const [entryForm, setEntryForm] = useState({
    vehicle_daily_entry_id: 0,
    entry_date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    driver_worker_id: '',
    diesel_amount: '',
    maintenance_amount: '',
    other_expense: '',
    notes: '',
    worker_payments: [] as { worker_id: number; worker_name: string; amount: number }[]
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vehRes, wrkRes, entRes, repRes] = await Promise.all([
        api.getVehicles(),
        api.getWorkers(undefined, 1),
        api.getVehicleEntries(),
        api.getVehicleReport()
      ]);
      setVehicles(vehRes.data || []);
      setWorkers(wrkRes.data || []);
      setEntries(entRes.data || []);
      setVehicleReport(repRes.data || []);
      if (vehRes.data?.length > 0 && !entryForm.vehicle_id) {
        setEntryForm((prev) => ({ ...prev, vehicle_id: vehRes.data[0].vehicle_id.toString() }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEditVehicle = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      vehicle_number: vehicle.vehicle_number,
      vehicle_name: vehicle.vehicle_name,
      notes: vehicle.notes || ''
    });
    setAddVehicleModalOpen(true);
  };

  const handleCloseVehicleModal = () => {
    setAddVehicleModalOpen(false);
    setEditingVehicle(null);
    setVehicleForm({ vehicle_number: '', vehicle_name: '', notes: '' });
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.vehicle_number || !vehicleForm.vehicle_name) return;
    setIsSubmittingVehicle(true);
    try {
      await api.saveVehicle({
        vehicle_id: editingVehicle ? editingVehicle.vehicle_id : 0,
        ...vehicleForm
      });
      handleCloseVehicleModal();
      toast.success(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save vehicle');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deleteConfirmVehicle) return;
    setIsDeletingVehicle(true);
    try {
      await api.deleteVehicle(deleteConfirmVehicle.vehicle_id);
      toast.success('Vehicle deleted successfully');
      setDeleteConfirmVehicle(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete vehicle');
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  const handleOpenEditEntry = async (ent: any) => {
    try {
      const res = await api.getVehicleEntryById(ent.vehicle_daily_entry_id);
      const data = res.data;
      setEntryForm({
        vehicle_daily_entry_id: data.vehicle_daily_entry_id,
        entry_date: data.entry_date ? new Date(data.entry_date).toISOString().split('T')[0] : ent.entry_date,
        vehicle_id: data.vehicle_id ? data.vehicle_id.toString() : '',
        driver_worker_id: data.driver_worker_id ? data.driver_worker_id.toString() : '',
        diesel_amount: data.diesel_amount ? data.diesel_amount.toString() : '',
        maintenance_amount: data.maintenance_amount ? data.maintenance_amount.toString() : '',
        other_expense: data.other_expense ? data.other_expense.toString() : '',
        notes: data.notes || '',
        worker_payments: (data.workers || []).map((w: any) => ({
          worker_id: w.worker_id,
          worker_name: w.worker_name,
          amount: Number(w.amount) || 0
        }))
      });
      setIsAddEntryOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load trip details for editing');
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteConfirmEntry) return;
    setIsDeletingEntry(true);
    try {
      await api.deleteVehicleEntry(deleteConfirmEntry.vehicle_daily_entry_id);
      toast.success('Trip entry deleted successfully');
      setDeleteConfirmEntry(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete trip entry');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  // Add worker to entry
  const handleAddWorkerToEntry = (workerIdStr: string) => {
    const workerId = parseInt(workerIdStr, 10);
    if (!workerId || entryForm.worker_payments.some((w) => w.worker_id === workerId)) return;
    const worker = workers.find((w) => w.worker_id === workerId);
    if (worker) {
      setEntryForm({
        ...entryForm,
        worker_payments: [
          ...entryForm.worker_payments,
          { worker_id: worker.worker_id, worker_name: worker.worker_name, amount: 800 }
        ]
      });
    }
  };

  const handleUpdateWorkerAmount = (workerId: number, amount: number) => {
    setEntryForm({
      ...entryForm,
      worker_payments: entryForm.worker_payments.map((w) =>
        w.worker_id === workerId ? { ...w, amount } : w
      )
    });
  };

  const handleRemoveWorkerFromEntry = (workerId: number) => {
    setEntryForm({
      ...entryForm,
      worker_payments: entryForm.worker_payments.filter((w) => w.worker_id !== workerId)
    });
  };

  // Expense calculations
  const dieselVal = parseFloat(entryForm.diesel_amount) || 0;
  const maintVal = parseFloat(entryForm.maintenance_amount) || 0;
  const otherVal = parseFloat(entryForm.other_expense) || 0;
  const totalWorkerPayVal = entryForm.worker_payments.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const totalDailyExpense = dieselVal + maintVal + otherVal + totalWorkerPayVal;

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.vehicle_id || !entryForm.entry_date) {
      toast.error('Date and vehicle are required');
      return;
    }

    setIsSubmittingEntry(true);
    try {
      await api.saveVehicleEntry({
        vehicle_daily_entry_id: entryForm.vehicle_daily_entry_id || 0,
        entry_date: entryForm.entry_date,
        vehicle_id: parseInt(entryForm.vehicle_id, 10),
        driver_worker_id: entryForm.driver_worker_id ? parseInt(entryForm.driver_worker_id, 10) : null,
        diesel_amount: dieselVal,
        maintenance_amount: maintVal,
        other_expense: otherVal,
        notes: entryForm.notes,
        worker_payments: entryForm.worker_payments.map((w) => ({
          worker_id: w.worker_id,
          amount: w.amount
        }))
      });

      setIsAddEntryOpen(false);
      setEntryForm({
        vehicle_daily_entry_id: 0,
        entry_date: new Date().toISOString().split('T')[0],
        vehicle_id: vehicles[0]?.vehicle_id?.toString() || '',
        driver_worker_id: '',
        diesel_amount: '',
        maintenance_amount: '',
        other_expense: '',
        notes: '',
        worker_payments: []
      });
      toast.success('Vehicle daily entry saved and worker payments synchronized!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save vehicle entry');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleViewEntry = async (entryId: number) => {
    try {
      const res = await api.getVehicleEntryById(entryId);
      setViewEntryDetails(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to view entry details');
    }
  };

  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Vehicle Management & Daily Logs</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Track diesel, maintenance, driver & multi-worker wages per trip</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddVehicleModalOpen(true)}
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-bold text-xs transition-colors shadow-sm"
          >
            + Add Vehicle
          </button>
          <button
            onClick={() => setIsAddEntryOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-700/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Daily Vehicle Entry</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setViewTab('entries')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
            viewTab === 'entries'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Daily Trip Entries ({entries.length})
        </button>
        <button
          onClick={() => setViewTab('report')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
            viewTab === 'report'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Vehicle Expense Report
        </button>
        <button
          onClick={() => setViewTab('master')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
            viewTab === 'master'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Registered Vehicles ({vehicles.length})
        </button>
      </div>

      {/* Tab Content: Daily Entries */}
      {viewTab === 'entries' && (
        <>
          {/* Mobile Daily Entries Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {entries.length > 0 ? (
              entries.map((ent) => (
                <div
                  key={ent.vehicle_daily_entry_id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card Header: Date & Vehicle */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-brand-700 text-sm">
                        {ent.vehicle_number}
                      </span>
                      {ent.vehicle_name && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          ({ent.vehicle_name})
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-500">
                      {ent.entry_date}
                    </span>
                  </div>

                  {/* Driver Row */}
                  <div className="py-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Driver:</span>
                    <strong className="text-gray-900 font-bold">{ent.driver_name || '—'}</strong>
                  </div>

                  {/* Expenses Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-gray-100 text-center">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Diesel</span>
                      <strong className="text-xs font-bold text-gray-800 block mt-0.5">
                        {formatCurrency(ent.diesel_amount)}
                      </strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Maintenance</span>
                      <strong className="text-xs font-bold text-gray-800 block mt-0.5">
                        {formatCurrency(ent.maintenance_amount)}
                      </strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Worker Pay</span>
                      <strong className="text-xs font-bold text-amber-700 block mt-0.5">
                        {formatCurrency(ent.total_worker_payments)}
                      </strong>
                    </div>
                  </div>

                  {/* Total Expense & Actions */}
                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Total Expense</span>
                      <strong className="text-sm font-black text-rose-600 block">
                        {formatCurrency(ent.total_daily_expense)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleViewEntry(ent.vehicle_daily_entry_id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleOpenEditEntry(ent)}
                        className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                        title="Edit Trip"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmEntry(ent)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        title="Delete Trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
                <Truck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold">No vehicle daily entries recorded yet</p>
              </div>
            )}
          </div>

          {/* Desktop Daily Entries Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Diesel (₹)</th>
                    <th className="py-3 px-4">Maintenance (₹)</th>
                    <th className="py-3 px-4">Worker Pay (₹)</th>
                    <th className="py-3 px-4">Total Expense</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.length > 0 ? (
                    entries.map((ent) => (
                      <tr key={ent.vehicle_daily_entry_id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-4 font-medium text-gray-800">{ent.entry_date}</td>
                        <td className="py-3 px-4">
                          <strong className="text-gray-900 block font-bold">{ent.vehicle_number}</strong>
                          <span className="text-[10px] text-gray-500">{ent.vehicle_name}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{ent.driver_name || '—'}</td>
                        <td className="py-3 px-4 font-medium text-gray-700">{formatCurrency(ent.diesel_amount)}</td>
                        <td className="py-3 px-4 font-medium text-gray-700">{formatCurrency(ent.maintenance_amount)}</td>
                        <td className="py-3 px-4 font-bold text-amber-700">{formatCurrency(ent.total_worker_payments)}</td>
                        <td className="py-3 px-4 font-black text-rose-600 text-sm">
                          {formatCurrency(ent.total_daily_expense)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewEntry(ent.vehicle_daily_entry_id)}
                              title="View Details"
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-[11px]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEditEntry(ent)}
                              title="Edit Trip Entry"
                              className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmEntry(ent)}
                              title="Delete Trip Entry"
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400">
                        No vehicle daily entries recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Content: Expense Report */}
      {viewTab === 'report' && (
        <>
          {/* Mobile Expense Report Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {vehicleReport.length > 0 ? (
              vehicleReport.map((rep) => (
                <div
                  key={rep.vehicle_id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                    <div>
                      <span className="font-extrabold text-gray-900 text-sm block">
                        {rep.vehicle_number}
                      </span>
                      {rep.vehicle_name && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          {rep.vehicle_name}
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      {rep.total_trips_or_days} Trips
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2.5 text-xs">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block">Total Diesel</span>
                      <strong className="text-gray-900 font-bold block mt-0.5">{formatCurrency(rep.total_diesel)}</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block">Maintenance</span>
                      <strong className="text-gray-900 font-bold block mt-0.5">{formatCurrency(rep.total_maintenance)}</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-amber-700 font-semibold block">Worker Payments</span>
                      <strong className="text-amber-800 font-bold block mt-0.5">{formatCurrency(rep.total_worker_payments)}</strong>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-semibold block">Other Expense</span>
                      <strong className="text-gray-900 font-bold block mt-0.5">{formatCurrency(rep.total_other_expense)}</strong>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Grand Total Expense:</span>
                    <strong className="text-sm font-black text-rose-600">
                      {formatCurrency(rep.grand_total_expense)}
                    </strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
                <p className="font-semibold">No expense data available</p>
              </div>
            )}
          </div>

          {/* Desktop Expense Report Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Days / Trips</th>
                    <th className="py-3 px-4">Total Diesel</th>
                    <th className="py-3 px-4">Total Maintenance</th>
                    <th className="py-3 px-4">Total Worker Pay</th>
                    <th className="py-3 px-4">Other Expense</th>
                    <th className="py-3 px-4 text-right">Grand Total Expense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicleReport.map((rep) => (
                    <tr key={rep.vehicle_id} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {rep.vehicle_number} <span className="text-gray-500 font-normal">({rep.vehicle_name})</span>
                      </td>
                      <td className="py-3 px-4 font-semibold">{rep.total_trips_or_days} Trips</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(rep.total_diesel)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(rep.total_maintenance)}</td>
                      <td className="py-3 px-4 font-bold text-amber-700">{formatCurrency(rep.total_worker_payments)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(rep.total_other_expense)}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-700 text-sm">
                        {formatCurrency(rep.grand_total_expense)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Content: Vehicle Master List */}
      {viewTab === 'master' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <div key={v.vehicle_id} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-gray-900 text-base">{v.vehicle_number}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                  <button
                    onClick={() => handleOpenEditVehicle(v)}
                    title="Edit Vehicle"
                    className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmVehicle(v)}
                    title="Delete Vehicle"
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 font-medium">{v.vehicle_name}</p>
              {v.notes && <p className="text-[11px] text-gray-400 italic">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Daily Vehicle Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => {
          setIsAddEntryOpen(false);
          setEntryForm({
            vehicle_daily_entry_id: 0,
            entry_date: new Date().toISOString().split('T')[0],
            vehicle_id: vehicles[0]?.vehicle_id?.toString() || '',
            driver_worker_id: '',
            diesel_amount: '',
            maintenance_amount: '',
            other_expense: '',
            notes: '',
            worker_payments: []
          });
        }}
        title={entryForm.vehicle_daily_entry_id ? 'Edit Daily Vehicle Trip & Worker Wages' : 'Record Daily Vehicle Trip & Worker Wages'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={entryForm.entry_date}
                onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle *</label>
              <select
                required
                value={entryForm.vehicle_id}
                onChange={(e) => setEntryForm({ ...entryForm, vehicle_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.vehicle_number} ({v.vehicle_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Driver</label>
              <select
                value={entryForm.driver_worker_id}
                onChange={(e) => setEntryForm({ ...entryForm, driver_worker_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Driver</option>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.worker_name} ({w.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Direct Vehicle Expenses */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-rose-600" />
                Diesel (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={entryForm.diesel_amount}
                onChange={(e) => setEntryForm({ ...entryForm, diesel_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Maintenance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={entryForm.maintenance_amount}
                onChange={(e) => setEntryForm({ ...entryForm, maintenance_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Other Expense (₹)</label>
              <input
                type="number"
                step="0.01"
                value={entryForm.other_expense}
                onChange={(e) => setEntryForm({ ...entryForm, other_expense: e.target.value })}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold"
              />
            </div>
          </div>

          {/* Multi-Worker Daily Wage Section (Requirement #12) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-700" />
                Pay Workers Directly From Vehicle Trip
              </label>
              <span className="text-[11px] text-gray-500">Auto-syncs with worker ledger</span>
            </div>

            {/* Quick Worker Selector */}
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  handleAddWorkerToEntry(e.target.value);
                  e.target.value = '';
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">+ Add Worker / Helper to this Trip</option>
                {workers
                  .filter((w) => !entryForm.worker_payments.some((p) => p.worker_id === w.worker_id))
                  .map((w) => (
                    <option key={w.worker_id} value={w.worker_id}>
                      {w.worker_name} ({w.role})
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Workers Wage Inputs */}
            {entryForm.worker_payments.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {entryForm.worker_payments.map((wp) => (
                  <div key={wp.worker_id} className="p-2.5 bg-white flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-gray-900">{wp.worker_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Wage: ₹</span>
                      <input
                        type="number"
                        step="50"
                        value={wp.amount}
                        onChange={(e) => handleUpdateWorkerAmount(wp.worker_id, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-xs font-bold text-brand-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkerFromEntry(wp.worker_id)}
                        className="text-rose-600 font-bold px-1.5 hover:text-rose-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Expense Total Card (Requirement #13) */}
          <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-600 block">Total Daily Vehicle Expense</span>
              <span className="text-[10px] text-gray-500">
                Diesel (₹{dieselVal}) + Maint (₹{maintVal}) + Labor (₹{totalWorkerPayVal}) + Other (₹{otherVal})
              </span>
            </div>
            <strong className="text-base font-black text-brand-800">
              {formatCurrency(totalDailyExpense)}
            </strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Trip Route</label>
            <input
              type="text"
              value={entryForm.notes}
              onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
              placeholder="e.g. Pune - Sangamner live bird delivery run"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddEntryOpen(false);
                setEntryForm({
                  vehicle_daily_entry_id: 0,
                  entry_date: new Date().toISOString().split('T')[0],
                  vehicle_id: vehicles[0]?.vehicle_id?.toString() || '',
                  driver_worker_id: '',
                  diesel_amount: '',
                  maintenance_amount: '',
                  other_expense: '',
                  notes: '',
                  worker_payments: []
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingEntry}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingEntry && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingEntry ? 'Saving Entry...' : (entryForm.vehicle_daily_entry_id ? 'Update Trip Entry' : 'Save Vehicle Entry')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Vehicle Master Modal */}
      <Modal
        isOpen={addVehicleModalOpen}
        onClose={handleCloseVehicleModal}
        title={editingVehicle ? `Edit Vehicle — ${editingVehicle.vehicle_number}` : 'Register New Vehicle'}
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Registration Number *</label>
            <input
              type="text"
              required
              value={vehicleForm.vehicle_number}
              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
              placeholder="e.g. MH12AB1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Name / Description *</label>
            <input
              type="text"
              required
              value={vehicleForm.vehicle_name}
              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_name: e.target.value })}
              placeholder="e.g. Truck 01 (108 Box)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={vehicleForm.notes}
              onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseVehicleModal}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingVehicle}
              className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-800 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmittingVehicle && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingVehicle ? 'Saving Vehicle...' : (editingVehicle ? 'Update Vehicle' : 'Save Vehicle')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Entry Details Modal */}
      <Modal
        isOpen={!!viewEntryDetails}
        onClose={() => setViewEntryDetails(null)}
        title={`Trip Details — ${viewEntryDetails?.vehicle_number}`}
      >
        {viewEntryDetails && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 block">Date</span>
                <strong className="text-gray-900">{viewEntryDetails.entry_date}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Driver</span>
                <strong className="text-gray-900">{viewEntryDetails.driver_name || '—'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Diesel</span>
                <strong className="text-gray-900">{formatCurrency(viewEntryDetails.diesel_amount)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Maintenance</span>
                <strong className="text-gray-900">{formatCurrency(viewEntryDetails.maintenance_amount)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Total Worker Wages</span>
                <strong className="text-amber-700 font-bold">{formatCurrency(viewEntryDetails.total_worker_payments)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Grand Total Expense</span>
                <strong className="text-rose-700 font-extrabold text-sm">{formatCurrency(viewEntryDetails.total_daily_expense)}</strong>
              </div>
            </div>

            {viewEntryDetails.workers?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-900">Workers Paid on this Trip:</h4>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {viewEntryDetails.workers.map((w: any) => (
                    <div key={w.vehicle_daily_worker_id} className="p-2 flex justify-between">
                      <span className="font-medium text-gray-800">{w.worker_name} ({w.role})</span>
                      <strong className="text-brand-700">{formatCurrency(w.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Vehicle Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmVehicle}
        onClose={() => setDeleteConfirmVehicle(null)}
        title="Delete Vehicle"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete vehicle <strong>{deleteConfirmVehicle?.vehicle_number}</strong> ({deleteConfirmVehicle?.vehicle_name})?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmVehicle(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingVehicle}
              onClick={handleDeleteVehicle}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeletingVehicle && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeletingVehicle ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Vehicle Daily Entry Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmEntry}
        onClose={() => setDeleteConfirmEntry(null)}
        title="Delete Trip Entry"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete trip entry for <strong>{deleteConfirmEntry?.vehicle_number}</strong> on <strong>{deleteConfirmEntry?.entry_date}</strong> (Total Expense: {formatCurrency(deleteConfirmEntry?.total_daily_expense)})?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmEntry(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingEntry}
              onClick={handleDeleteEntry}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {isDeletingEntry && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isDeletingEntry ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
