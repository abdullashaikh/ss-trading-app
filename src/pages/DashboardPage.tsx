import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Truck,
  PlusCircle, ShoppingCart, Receipt, UserPlus, RefreshCw, AlertCircle
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenAddPurchase: () => void;
  onOpenCreateBill: () => void;
  onOpenVehicleEntry: () => void;
  onOpenWorkerPayment: () => void;
  onOpenAddCustomer: () => void;
  onOpenAddCompany: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({
  setActiveTab,
  onOpenAddPurchase,
  onOpenCreateBill,
  onOpenVehicleEntry,
  onOpenWorkerPayment,
  onOpenAddCustomer,
  onOpenAddCompany
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getDashboard();
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Today's Overview</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Live business performance and outstanding balances</p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center gap-1 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-700' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-sm text-rose-700 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Actions Grid (Mobile-first Touch Targets) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <button
            onClick={onOpenAddPurchase}
            className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-rose-200 text-center"
          >
            <ShoppingCart className="w-5 h-5 text-rose-700" />
            <span className="text-xs font-bold leading-tight">+ Add Purchase</span>
          </button>

          <button
            onClick={onOpenCreateBill}
            className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-200 text-center"
          >
            <Receipt className="w-5 h-5 text-emerald-700" />
            <span className="text-xs font-bold leading-tight">+ Create Bill</span>
          </button>

          <button
            onClick={onOpenVehicleEntry}
            className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-blue-200 text-center"
          >
            <Truck className="w-5 h-5 text-blue-700" />
            <span className="text-xs font-bold leading-tight">+ Vehicle Entry</span>
          </button>

          <button
            onClick={onOpenWorkerPayment}
            className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-amber-200 text-center"
          >
            <Users className="w-5 h-5 text-amber-700" />
            <span className="text-xs font-bold leading-tight">+ Worker Pay</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-purple-200 text-center"
          >
            <UserPlus className="w-5 h-5 text-purple-700" />
            <span className="text-xs font-bold leading-tight">+ Add Customer</span>
          </button>

          <button
            onClick={onOpenAddCompany}
            className="p-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border border-teal-200 text-center"
          >
            <PlusCircle className="w-5 h-5 text-teal-700" />
            <span className="text-xs font-bold leading-tight">+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Sales Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              Today's Sales
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.today_sales_amount)}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-600">
              <span>Weight: <strong className="text-gray-900">{Number(data?.today_sales_kg || 0).toFixed(2)} KG</strong></span>
              <span>•</span>
              <span>Birds: <strong className="text-gray-900">{data?.today_sales_qty || 0} Qty</strong></span>
            </div>
          </div>
        </div>

        {/* Today's Purchase Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
              Today's Purchase
            </span>
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.today_purchase_amount)}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-600">
              <span>Weight: <strong className="text-gray-900">{Number(data?.today_purchase_kg || 0).toFixed(2)} KG</strong></span>
              <span>•</span>
              <span>Birds: <strong className="text-gray-900">{data?.today_purchase_qty || 0} Qty</strong></span>
            </div>
          </div>
        </div>

        {/* Today's Cash Collection */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Today's Cash Collection
            </span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.today_collection)}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-2">Received from customer bills & payments today</p>
          </div>
        </div>

        {/* Customer Outstanding Total */}
        <div
          onClick={() => setActiveTab('customers')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-brand-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
              Customer Outstanding
            </span>
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.customer_outstanding)}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-2">Total pending receivables from all customers</p>
          </div>
        </div>

        {/* Supplier Outstanding Total */}
        <div
          onClick={() => setActiveTab('companies')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-brand-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
              Supplier Outstanding
            </span>
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.supplier_outstanding)}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-2">Total payable to suppliers and hatcheries</p>
          </div>
        </div>

        {/* Today's Vehicle & Labor Expenses */}
        <div
          onClick={() => setActiveTab('vehicles')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-brand-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
              Daily Vehicle & Labor Expense
            </span>
            <Truck className="w-5 h-5 text-gray-700" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
              {formatCurrency(data?.today_vehicle_expense)}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-600">
              <span>Worker Wages: <strong className="text-gray-900">{formatCurrency(data?.today_worker_payments)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
