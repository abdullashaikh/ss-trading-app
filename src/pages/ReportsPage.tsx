import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { BarChart3, TrendingUp, TrendingDown, Truck, Users, Calendar, Download } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'overall' | 'purchases' | 'sales' | 'vehicles' | 'workers'>('overall');
  const [filterMode, setFilterMode] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [overallData, setOverallData] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (filterMode === 'today') {
      return { start: todayStr, end: todayStr };
    } else if (filterMode === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start: firstDay, end: todayStr };
    } else if (filterMode === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { start: firstDay, end: todayStr };
    } else {
      return { start: customStart || undefined, end: customEnd || undefined };
    }
  };

  const loadReport = async () => {
    setIsLoading(true);
    const { start, end } = getDateRange();

    try {
      if (reportType === 'overall') {
        const res = await api.getOverallReport(start, end);
        setOverallData(res.data);
      } else if (reportType === 'purchases') {
        const res = await api.getPurchaseReport(undefined, start, end);
        setTableData(res.data || []);
      } else if (reportType === 'sales') {
        const res = await api.getSalesReport(undefined, start, end);
        setTableData(res.data || []);
      } else if (reportType === 'vehicles') {
        const res = await api.getVehicleReport(undefined, start, end);
        setTableData(res.data || []);
      } else if (reportType === 'workers') {
        const res = await api.getWorkerReport(undefined, start, end);
        setTableData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, filterMode]);

  const formatCurrency = (val: any) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Central Reports & Business Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">Daily, monthly, and yearly summaries for purchases, sales, vehicles & labor</p>
      </div>

      {/* Report Types Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overall', label: 'Overall Business Summary', icon: BarChart3 },
          { id: 'purchases', label: 'Supplier Purchases', icon: TrendingDown },
          { id: 'sales', label: 'Customer Sales', icon: TrendingUp },
          { id: 'vehicles', label: 'Vehicle Expenses', icon: Truck },
          { id: 'workers', label: 'Worker Wages', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Date Range:</span>
          {(['today', 'month', 'year', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${
                filterMode === mode
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode === 'today' ? 'Today' : mode === 'month' ? 'This Month' : mode === 'year' ? 'This Year' : 'Custom'}
            </button>
          ))}
        </div>

        {filterMode === 'custom' && (
          <div className="flex items-center gap-2">
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
              onClick={loadReport}
              className="px-3 py-1 bg-brand-700 text-white rounded-lg font-bold"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading reports...</div>
      ) : reportType === 'overall' ? (
        /* Overall Business Report Card */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales / Inflow Section */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
                Sales & Inflow
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Chicken Distributed:</span>
                  <strong className="text-gray-900">{overallData?.total_sales_quantity || 0} Birds / {Number(overallData?.total_sales_kg || 0).toFixed(2)} KG</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Customer Invoiced:</span>
                  <strong className="text-gray-900 font-bold text-sm">{formatCurrency(overallData?.total_sales)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cash Received (Collection):</span>
                  <strong className="text-emerald-700 font-bold">{formatCurrency(overallData?.total_collection)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-rose-700">
                  <span className="font-bold">Total Customer Outstanding:</span>
                  <strong className="font-black text-sm">{formatCurrency(overallData?.customer_outstanding)}</strong>
                </div>
              </div>
            </div>

            {/* Purchases / Outflow Section */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2 text-rose-700">
                <TrendingDown className="w-4 h-4" />
                Purchases & Expenses
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Live Birds Purchased:</span>
                  <strong className="text-gray-900">{overallData?.total_purchase_quantity || 0} Birds / {Number(overallData?.total_purchase_kg || 0).toFixed(2)} KG</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Purchase Amount:</span>
                  <strong className="text-gray-900 font-bold text-sm">{formatCurrency(overallData?.total_purchase)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Paid to Suppliers:</span>
                  <strong className="text-emerald-700 font-bold">{formatCurrency(overallData?.total_purchase_paid)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-purple-700">
                  <span className="font-bold">Total Supplier Outstanding:</span>
                  <strong className="font-black text-sm">{formatCurrency(overallData?.supplier_outstanding)}</strong>
                </div>
              </div>
            </div>

            {/* Operational Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 col-span-1 md:col-span-2">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                <Truck className="w-4 h-4 text-gray-700" />
                Fleet & Labor Expenses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Vehicle Trips & Diesel Expenses:</span>
                  <strong className="text-gray-900 font-black text-sm">{formatCurrency(overallData?.total_vehicle_expenses)}</strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Worker & Labor Wages Paid:</span>
                  <strong className="text-gray-900 font-black text-sm">{formatCurrency(overallData?.total_worker_payments)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Detailed Report Cards (block md:hidden) - Zero Horizontal Scroll */}
          <div className="block md:hidden space-y-3">
            {tableData.length > 0 ? (
              tableData.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2.5"
                >
                  {reportType === 'purchases' && (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <strong className="text-sm font-bold text-gray-900">{row.company_name}</strong>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-md">
                          {row.total_purchases} Purchases
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Birds & Weight</span>
                          <span className="font-semibold text-gray-800">{row.total_chicken_qty} Birds • {Number(row.total_kg || 0).toFixed(2)} KG</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Total Purchase</span>
                          <span className="font-bold text-gray-900">{formatCurrency(row.total_purchase_amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Paid</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(row.total_paid)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Pending Due</span>
                          <span className="font-extrabold text-rose-600">{formatCurrency(row.total_pending)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {reportType === 'sales' && (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <strong className="text-sm font-bold text-gray-900">{row.customer_name}</strong>
                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[11px] font-bold rounded-md">
                          {row.total_bills} Bills
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Birds & Weight</span>
                          <span className="font-semibold text-gray-800">{row.total_qty} Birds • {Number(row.total_kg || 0).toFixed(2)} KG</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Total Sales</span>
                          <span className="font-bold text-gray-900">{formatCurrency(row.total_sales)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Paid</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(row.total_paid)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Pending Due</span>
                          <span className="font-extrabold text-rose-600">{formatCurrency(row.total_pending)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {reportType === 'vehicles' && (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <strong className="text-sm font-bold text-gray-900">{row.vehicle_number}</strong>
                        <span className="text-xs text-gray-500 font-medium">{row.vehicle_name} ({row.total_trips_or_days} Trips)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Diesel</span>
                          <span className="font-medium text-gray-800">{formatCurrency(row.total_diesel)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Maintenance</span>
                          <span className="font-medium text-gray-800">{formatCurrency(row.total_maintenance)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Worker Pay</span>
                          <span className="font-bold text-amber-700">{formatCurrency(row.total_worker_payments)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Total Expense</span>
                          <span className="font-extrabold text-rose-700">{formatCurrency(row.grand_total_expense)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {reportType === 'workers' && (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div>
                          <strong className="text-sm font-bold text-gray-900 block">{row.worker_name}</strong>
                          <span className="text-[11px] text-gray-500">{row.role} • {row.total_entries} Entries</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block">Total Paid</span>
                          <strong className="text-sm font-extrabold text-gray-900">{formatCurrency(row.total_paid)}</strong>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Daily Wages</span>
                          <span className="font-medium text-gray-800">{formatCurrency(row.total_daily_payments)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Advances</span>
                          <span className="font-medium text-amber-700">{formatCurrency(row.total_advances)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="py-10 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-xs">
                No report records for the selected period
              </div>
            )}
          </div>

          {/* Desktop Tabular Report (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  {reportType === 'purchases' && (
                    <tr>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Purchases Count</th>
                      <th className="py-3 px-4">Total Qty (Birds)</th>
                      <th className="py-3 px-4">Total Weight (KG)</th>
                      <th className="py-3 px-4">Total Purchase (₹)</th>
                      <th className="py-3 px-4">Total Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Pending (₹)</th>
                    </tr>
                  )}
                  {reportType === 'sales' && (
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Bills Count</th>
                      <th className="py-3 px-4">Total Qty (Birds)</th>
                      <th className="py-3 px-4">Total Weight (KG)</th>
                      <th className="py-3 px-4">Total Sales (₹)</th>
                      <th className="py-3 px-4">Total Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Pending (₹)</th>
                    </tr>
                  )}
                  {reportType === 'vehicles' && (
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Trips / Days</th>
                      <th className="py-3 px-4">Diesel (₹)</th>
                      <th className="py-3 px-4">Maintenance (₹)</th>
                      <th className="py-3 px-4">Labor Wages (₹)</th>
                      <th className="py-3 px-4">Other (₹)</th>
                      <th className="py-3 px-4 text-right">Total Expense (₹)</th>
                    </tr>
                  )}
                  {reportType === 'workers' && (
                    <tr>
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Days / Entries</th>
                      <th className="py-3 px-4">Daily Wages (₹)</th>
                      <th className="py-3 px-4">Advances (₹)</th>
                      <th className="py-3 px-4">Other (₹)</th>
                      <th className="py-3 px-4 text-right">Total Paid (₹)</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.length > 0 ? (
                    tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70">
                        {reportType === 'purchases' && (
                          <>
                            <td className="py-3 px-4 font-bold text-gray-900">{row.company_name}</td>
                            <td className="py-3 px-4 font-semibold">{row.total_purchases}</td>
                            <td className="py-3 px-4">{row.total_chicken_qty} Birds</td>
                            <td className="py-3 px-4 font-medium">{Number(row.total_kg || 0).toFixed(2)} KG</td>
                            <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(row.total_purchase_amount)}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(row.total_paid)}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-600">{formatCurrency(row.total_pending)}</td>
                          </>
                        )}
                        {reportType === 'sales' && (
                          <>
                            <td className="py-3 px-4 font-bold text-gray-900">{row.customer_name}</td>
                            <td className="py-3 px-4 font-semibold">{row.total_bills}</td>
                            <td className="py-3 px-4">{row.total_qty} Birds</td>
                            <td className="py-3 px-4 font-medium">{Number(row.total_kg || 0).toFixed(2)} KG</td>
                            <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(row.total_sales)}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(row.total_paid)}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-600">{formatCurrency(row.total_pending)}</td>
                          </>
                        )}
                        {reportType === 'vehicles' && (
                          <>
                            <td className="py-3 px-4 font-bold text-gray-900">{row.vehicle_number} ({row.vehicle_name})</td>
                            <td className="py-3 px-4 font-semibold">{row.total_trips_or_days}</td>
                            <td className="py-3 px-4">{formatCurrency(row.total_diesel)}</td>
                            <td className="py-3 px-4">{formatCurrency(row.total_maintenance)}</td>
                            <td className="py-3 px-4 font-bold text-amber-700">{formatCurrency(row.total_worker_payments)}</td>
                            <td className="py-3 px-4">{formatCurrency(row.total_other_expense)}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-700">{formatCurrency(row.grand_total_expense)}</td>
                          </>
                        )}
                        {reportType === 'workers' && (
                          <>
                            <td className="py-3 px-4 font-bold text-gray-900">{row.worker_name}</td>
                            <td className="py-3 px-4 font-semibold">{row.role}</td>
                            <td className="py-3 px-4">{row.total_entries}</td>
                            <td className="py-3 px-4 font-medium">{formatCurrency(row.total_daily_payments)}</td>
                            <td className="py-3 px-4 font-medium text-amber-700">{formatCurrency(row.total_advances)}</td>
                            <td className="py-3 px-4">{formatCurrency(row.total_other_payments)}</td>
                            <td className="py-3 px-4 text-right font-black text-gray-900">{formatCurrency(row.total_paid)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-400">
                        No report records for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
