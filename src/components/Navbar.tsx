import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { usePWA } from '../hooks/usePWA.js';
import {
  LogOut,
  User as UserIcon,
  Menu,
  X,
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Users,
  Package,
  Receipt,
  Truck,
  UserCheck,
  BarChart3,
  ChevronRight,
  Download
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen: externalMenuOpen,
  setIsMobileMenuOpen: setExternalMenuOpen
}) => {
  const { user, logout } = useAuth();
  const { canInstall, installApp } = usePWA();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const isMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;
  const setIsMenuOpen = setExternalMenuOpen || setInternalMenuOpen;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', sublabel: 'Overview & Quick Stats', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases', sublabel: 'Poultry Inward & Lots', icon: ShoppingCart },
    { id: 'companies', label: 'Suppliers', sublabel: 'Poultry Companies', icon: Building2 },
    { id: 'customers', label: 'Customers', sublabel: 'Party Outstanding & Ledger', icon: Users },
    { id: 'delivery', label: 'Truck Matrix (108)', sublabel: 'Crate Allocation & Dispatch', icon: Package, highlight: true },
    { id: 'bills', label: 'Customer Bills', sublabel: 'Billing, Invoices & Balance', icon: Receipt },
    { id: 'vehicles', label: 'Vehicles', sublabel: 'Daily Expenses & Trips', icon: Truck },
    { id: 'workers', label: 'Workers', sublabel: 'Daily Wages & Advances', icon: UserCheck },
    { id: 'reports', label: 'Reports', sublabel: 'Profit & Loss / Audits', icon: BarChart3 },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left Brand & Mobile Menu Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="xl:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? <X className="w-6 h-6 text-brand-700" /> : <Menu className="w-6 h-6" />}
              </button>

              <div
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
                onClick={() => handleSelectTab('dashboard')}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-brand-700/20 tracking-wider">
                  SS
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-gray-900 text-base sm:text-lg leading-tight tracking-tight">
                      SS TRADING
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium block leading-none">
                    Management System
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-700 text-white shadow-2xs'
                        : item.highlight
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Profile, Install & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {canInstall && (
                <button
                  onClick={installApp}
                  title="Install SS Trading App"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-brand-700" />
                  <span>Install App</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 text-right">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm border border-gray-200">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 leading-none">{user?.userName || 'Admin'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'Administrator'}</p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors border border-transparent hover:border-brand-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Sidebar Drawer */}
      {isMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-700/20">
                  SS
                </div>
                <div>
                  <span className="font-extrabold text-gray-900 text-base leading-tight block">
                    SS TRADING
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">All Modules</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile PWA Install Banner */}
            {canInstall && (
              <div className="p-3 border-b border-gray-100 bg-brand-50/70">
                <button
                  type="button"
                  onClick={() => {
                    installApp();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white rounded-xl shadow-sm text-xs font-bold transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4" />
                    <span>Install SS Trading App</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md uppercase font-semibold">
                    Install
                  </span>
                </button>
              </div>
            )}

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-brand-700 text-white shadow-sm font-bold'
                        : item.highlight
                        ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 border border-emerald-200/60'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.highlight
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block leading-tight">
                          {item.label}
                        </span>
                        <span
                          className={`text-[11px] block leading-tight mt-0.5 ${
                            isActive ? 'text-white/80' : 'text-gray-400'
                          }`}
                        >
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs">
                  {user?.userName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-none">{user?.userName || 'Admin'}</p>
                  <p className="text-[10px] text-gray-500 capitalize mt-0.5">{user?.role || 'Administrator'}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
