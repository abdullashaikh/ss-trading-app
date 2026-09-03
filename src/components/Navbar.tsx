import React from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'companies', label: 'Suppliers' },
    { id: 'customers', label: 'Customers' },
    { id: 'delivery', label: 'Box Allocation' },
    { id: 'bills', label: 'Bills & Invoices' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'workers', label: 'Workers' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-700/20 tracking-wider">
              SS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-gray-900 text-lg leading-tight tracking-tight">SS TRADING</span>
              </div>
              <span className="text-xs text-gray-500 font-medium block">Management System</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
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
  );
};
