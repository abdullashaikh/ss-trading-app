import React from 'react';
import { PackageCheck, AlertCircle } from 'lucide-react';

export interface BoxItem {
  box_id: number;
  box_number: number;
  box_label?: string;
  is_allocated: number; // 1 if already taken on this date, 0 if free
  allocated_to_customer?: string;
}

export interface SelectedBoxData {
  box_id: number;
  box_number: number;
  chicken_qty: number;
  total_kg: number;
  price_per_kg: number;
  amount: number;
}

interface BoxGridProps {
  boxes: BoxItem[];
  selectedBoxes: SelectedBoxData[];
  onToggleBox: (box: BoxItem) => void;
  onUpdateBoxData: (boxId: number, field: keyof SelectedBoxData, value: number) => void;
  defaultPricePerKg?: number;
}

export const BoxGrid: React.FC<BoxGridProps> = ({
  boxes,
  selectedBoxes,
  onToggleBox,
  onUpdateBoxData,
  defaultPricePerKg = 200
}) => {
  const selectedMap = new Map(selectedBoxes.map((b) => [b.box_id, b]));

  const totalSelectedQty = selectedBoxes.reduce((sum, b) => sum + (Number(b.chicken_qty) || 0), 0);
  const totalSelectedKg = selectedBoxes.reduce((sum, b) => sum + (Number(b.total_kg) || 0), 0);
  const totalSelectedAmount = selectedBoxes.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-600 inline-block"></span>
            <span className="text-gray-700 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-brand-600 border border-brand-700 inline-block"></span>
            <span className="text-gray-700 font-medium">Selected ({selectedBoxes.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-200 border border-rose-300 inline-block"></span>
            <span className="text-gray-500 font-medium">Allocated (Taken)</span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-bold text-gray-900 text-sm">
            {selectedBoxes.length} Boxes Selected
          </span>
        </div>
      </div>

      {/* 108-Box Visual Grid */}
      <div className="max-h-60 overflow-y-auto p-2 bg-gray-100 rounded-xl border border-gray-200">
        <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5">
          {boxes.map((box) => {
            const isSelected = selectedMap.has(box.box_id);
            const isAllocated = Number(box.is_allocated) === 1;

            let btnClass = 'bg-white text-gray-800 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50';
            if (isAllocated) {
              btnClass = 'bg-rose-100 text-rose-700 border-rose-200 cursor-not-allowed opacity-75';
            } else if (isSelected) {
              btnClass = 'bg-brand-700 text-white border-brand-800 shadow-sm font-bold ring-2 ring-brand-300';
            }

            return (
              <button
                key={box.box_id}
                type="button"
                disabled={isAllocated}
                onClick={() => onToggleBox(box)}
                title={isAllocated ? `Allocated to ${box.allocated_to_customer}` : `Box ${box.box_number}`}
                className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all border ${btnClass}`}
              >
                {box.box_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Boxes Detail Table */}
      {selectedBoxes.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-brand-700" />
            Enter Details for Selected Boxes:
          </h4>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="py-2 px-3">Box</th>
                  <th className="py-2 px-3">Birds Qty</th>
                  <th className="py-2 px-3">Weight (KG)</th>
                  <th className="py-2 px-3">Rate / KG (₹)</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedBoxes.map((item) => (
                  <tr key={item.box_id} className="hover:bg-gray-50/60">
                    <td className="py-2 px-3 font-bold text-gray-900">
                      Box {item.box_number}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={item.chicken_qty || ''}
                        onChange={(e) => onUpdateBoxData(item.box_id, 'chicken_qty', parseInt(e.target.value, 10) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={item.total_kg || ''}
                        onChange={(e) => onUpdateBoxData(item.box_id, 'total_kg', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        placeholder="KG"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={item.price_per_kg || ''}
                        onChange={(e) => onUpdateBoxData(item.box_id, 'price_per_kg', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        placeholder="Rate"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">
                      ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold text-gray-900 border-t border-gray-300">
                  <td className="py-2.5 px-3">Total ({selectedBoxes.length} Boxes)</td>
                  <td className="py-2.5 px-3">{totalSelectedQty} Birds</td>
                  <td className="py-2.5 px-3">{totalSelectedKg.toFixed(2)} KG</td>
                  <td className="py-2.5 px-3 text-gray-500">—</td>
                  <td className="py-2.5 px-3 text-right text-brand-700 font-black text-sm">
                    ₹{totalSelectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
