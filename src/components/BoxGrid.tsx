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

      {/* Selected Boxes Detail (Responsive Cards - Zero Horizontal Scroll) */}
      {selectedBoxes.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-700" />
              <span>Enter Details for Selected Boxes ({selectedBoxes.length})</span>
            </h4>
            <span className="text-xs text-gray-500 font-medium">(પસંદ કરેલા બોક્સ વિગતો)</span>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
            {selectedBoxes.map((item) => (
              <div
                key={item.box_id}
                className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-brand-200 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-brand-700 text-white font-extrabold text-xs rounded-md shadow-2xs">
                      Box #{item.box_number}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">બોક્સ નં. {item.box_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block leading-tight">Amount (રકમ)</span>
                    <span className="font-bold text-xs text-brand-800">
                      ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                      Birds (મરઘા)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.chicken_qty || ''}
                      onChange={(e) => onUpdateBoxData(item.box_id, 'chicken_qty', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      placeholder="Birds"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                      Weight (KG/વજન)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={item.total_kg || ''}
                      onChange={(e) => onUpdateBoxData(item.box_id, 'total_kg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      placeholder="KG"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                      Rate/KG (ભાવ/₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={item.price_per_kg || ''}
                      onChange={(e) => onUpdateBoxData(item.box_id, 'price_per_kg', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      placeholder="Rate"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal Summary Box */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Selected (પસંદ બોક્સ)</span>
              <strong className="text-gray-900 font-extrabold">{selectedBoxes.length} Boxes</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Total Birds (કુલ મરઘા)</span>
              <strong className="text-gray-900 font-extrabold">{totalSelectedQty} Birds</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Total Weight (કુલ વજન)</span>
              <strong className="text-gray-900 font-extrabold">{totalSelectedKg.toFixed(2)} KG</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Total Amount (કુલ રકમ)</span>
              <strong className="text-brand-700 font-black text-sm">
                ₹{totalSelectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
