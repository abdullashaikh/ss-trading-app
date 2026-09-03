import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../contexts/ToastContext.js';
import { BoxGrid, BoxItem, SelectedBoxData } from '../components/BoxGrid.js';
import { Truck, Calendar, User, Package, ArrowRight, CheckCircle2, Receipt, Loader2 } from 'lucide-react';

interface DeliveryPageProps {
  onConvertToBill?: (deliveryData: any) => void;
}

export const DeliveryPage: React.FC<DeliveryPageProps> = ({ onConvertToBill }) => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<SelectedBoxData[]>([]);
  const [defaultRate, setDefaultRate] = useState('200');

  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBillPrompt, setPendingBillPrompt] = useState<any>(null);
  const toast = useToast();

  // Load trucks and customers
  useEffect(() => {
    Promise.all([api.getTrucks(), api.getCustomers(undefined, 1)])
      .then(([trucksRes, custRes]) => {
        setTrucks(trucksRes.data || []);
        if (trucksRes.data?.length > 0) {
          setSelectedTruckId(trucksRes.data[0].truck_id.toString());
        }
        setCustomers(custRes.data || []);
        if (custRes.data?.length > 0) {
          setSelectedCustomerId(custRes.data[0].customer_id.toString());
        }
      })
      .catch(console.error);

    loadRecentDeliveries();
  }, []);

  const loadRecentDeliveries = () => {
    api.getDeliveries()
      .then((res) => setRecentDeliveries(res.data || []))
      .catch(console.error);
  };

  // Load boxes for selected truck & date
  useEffect(() => {
    if (selectedTruckId && deliveryDate) {
      setIsLoadingBoxes(true);
      api.getTruckBoxes(parseInt(selectedTruckId, 10), deliveryDate)
        .then((res) => {
          setBoxes(res.data || []);
          // Clear current selection when truck or date changes
          setSelectedBoxes([]);
        })
        .catch(console.error)
        .finally(() => setIsLoadingBoxes(false));
    }
  }, [selectedTruckId, deliveryDate]);

  const handleToggleBox = (box: BoxItem) => {
    if (Number(box.is_allocated) === 1) return;

    const exists = selectedBoxes.some((b) => b.box_id === box.box_id);
    if (exists) {
      setSelectedBoxes(selectedBoxes.filter((b) => b.box_id !== box.box_id));
    } else {
      const rate = parseFloat(defaultRate) || 200;
      setSelectedBoxes([
        ...selectedBoxes,
        {
          box_id: box.box_id,
          box_number: box.box_number,
          chicken_qty: 20,
          total_kg: 25.0,
          price_per_kg: rate,
          amount: parseFloat((25.0 * rate).toFixed(2))
        }
      ]);
    }
  };

  const handleUpdateBoxData = (boxId: number, field: keyof SelectedBoxData, value: number) => {
    setSelectedBoxes(
      selectedBoxes.map((box) => {
        if (box.box_id === boxId) {
          const updated = { ...box, [field]: value };
          if (field === 'total_kg' || field === 'price_per_kg') {
            const kg = field === 'total_kg' ? value : updated.total_kg;
            const rate = field === 'price_per_kg' ? value : updated.price_per_kg;
            updated.amount = parseFloat((kg * rate).toFixed(2));
          }
          return updated;
        }
        return box;
      })
    );
  };

  const handleApplyBatchRate = () => {
    const rate = parseFloat(defaultRate) || 200;
    setSelectedBoxes(
      selectedBoxes.map((box) => ({
        ...box,
        price_per_kg: rate,
        amount: parseFloat((box.total_kg * rate).toFixed(2))
      }))
    );
  };

  const handleSaveDelivery = async () => {
    if (!selectedCustomerId || !selectedTruckId || selectedBoxes.length === 0) {
      toast.error('Please select a customer, truck, and at least one box');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        delivery_date: deliveryDate,
        customer_id: parseInt(selectedCustomerId, 10),
        truck_id: parseInt(selectedTruckId, 10),
        notes,
        boxes: selectedBoxes
      };

      const res = await api.saveCustomerDelivery(payload);
      toast.success('Delivery allocated successfully!');

      // Prompt to create bill immediately via clean in-app modal
      if (onConvertToBill) {
        const cust = customers.find((c) => c.customer_id === parseInt(selectedCustomerId, 10));
        const truck = trucks.find((t) => t.truck_id === parseInt(selectedTruckId, 10));
        setPendingBillPrompt({
          delivery_id: res.data.delivery_id,
          delivery_date: deliveryDate,
          customer_id: parseInt(selectedCustomerId, 10),
          truck_id: parseInt(selectedTruckId, 10),
          customer_name: cust?.customer_name,
          customer_mobile: cust?.mobile_number,
          customer_cr_br: cust?.cr_br,
          customer_address: cust?.address,
          truck_info: `${truck?.truck_name} (${truck?.truck_number})`,
          items: selectedBoxes
        });
      }

      // Reload boxes
      setSelectedBoxes([]);
      const boxesRes = await api.getTruckBoxes(parseInt(selectedTruckId, 10), deliveryDate);
      setBoxes(boxesRes.data || []);
      loadRecentDeliveries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to allocate delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.customer_id === parseInt(selectedCustomerId, 10));
  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Customer Delivery & Box Allocation</h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">Select truck, assign crates from the 108-box grid, and prepare deliveries</p>
      </div>

      {/* Allocation Parameters Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Delivery Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-700" />
              Delivery Date
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Truck Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-brand-700" />
              Select Truck / Load
            </label>
            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {trucks.map((t) => (
                <option key={t.truck_id} value={t.truck_id}>
                  {t.truck_name} — {t.truck_number} ({t.total_box_count} Boxes)
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-700" />
              Customer / Party
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name} {c.cr_br ? `(${c.cr_br})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Customer Info Strip */}
        {selectedCustomer && (
          <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 flex flex-wrap items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900">{selectedCustomer.customer_name}</span>
              <span className="text-gray-500">Phone: {selectedCustomer.mobile_number}</span>
              {selectedCustomer.cr_br && (
                <span className="font-semibold text-brand-700 bg-white px-2 py-0.5 rounded border border-brand-200">
                  CR/BR: {selectedCustomer.cr_br}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-gray-500">Previous Pending Balance: </span>
              <strong className="text-rose-600 font-extrabold">{formatCurrency(selectedCustomer.current_outstanding)}</strong>
            </div>
          </div>
        )}

        {/* Batch Rate Quick Input */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-bold text-gray-600">Default Rate/KG (₹):</span>
          <input
            type="number"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            className="w-24 px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-brand-500 outline-none"
          />
          <button
            type="button"
            onClick={handleApplyBatchRate}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Apply Rate to Selected
          </button>
        </div>
      </div>

      {/* 108-Box Allocation Matrix */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-700" />
            Truck Box Grid Matrix ({boxes.length} Total Boxes)
          </h2>
          <span className="text-xs text-gray-500">Tap boxes to select/deselect for this customer delivery</span>
        </div>

        {isLoadingBoxes ? (
          <div className="py-12 text-center text-gray-400">Loading truck boxes...</div>
        ) : (
          <BoxGrid
            boxes={boxes}
            selectedBoxes={selectedBoxes}
            onToggleBox={handleToggleBox}
            onUpdateBoxData={handleUpdateBoxData}
            defaultPricePerKg={parseFloat(defaultRate) || 200}
          />
        )}

        {/* Action Button */}
        {selectedBoxes.length > 0 && (
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Ready to allocate <strong className="text-gray-900">{selectedBoxes.length} boxes</strong> to <strong className="text-gray-900">{selectedCustomer?.customer_name}</strong>
            </div>

            <button
              onClick={handleSaveDelivery}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-700/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Allocating Delivery...' : 'Confirm Delivery Allocation'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Deliveries List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Recent Customer Deliveries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Truck</th>
                <th className="py-2.5 px-3">Boxes</th>
                <th className="py-2.5 px-3">Weight (KG)</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDeliveries.map((del) => (
                <tr key={del.delivery_id} className="hover:bg-gray-50/70">
                  <td className="py-2.5 px-3 font-medium">{del.delivery_date}</td>
                  <td className="py-2.5 px-3 font-bold text-gray-900">{del.customer_name}</td>
                  <td className="py-2.5 px-3">{del.truck_name}</td>
                  <td className="py-2.5 px-3 font-semibold">{del.total_boxes} Crate(s) ({del.total_qty} Birds)</td>
                  <td className="py-2.5 px-3 font-semibold">{del.total_kg} KG</td>
                  <td className="py-2.5 px-3 font-bold text-gray-900">{formatCurrency(del.total_amount)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      del.status === 'BILLED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {del.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Modal for converting delivery to bill */}
      <Modal
        isOpen={!!pendingBillPrompt}
        onClose={() => setPendingBillPrompt(null)}
        title="Delivery Allocated Successfully!"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            The crates have been successfully allocated to <strong>{pendingBillPrompt?.customer_name}</strong>.
            Would you like to generate the customer bill and PDF invoice right now?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPendingBillPrompt(null)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Later
            </button>
            <button
              onClick={() => {
                const data = pendingBillPrompt;
                setPendingBillPrompt(null);
                if (onConvertToBill) {
                  onConvertToBill(data);
                }
              }}
              className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>Generate Bill Now</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
