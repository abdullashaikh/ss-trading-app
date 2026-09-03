import React from 'react';
import { LayoutDashboard, ShoppingCart, Receipt, Truck, BarChart3, Users } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchase', icon: ShoppingCart },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'delivery', label: 'Boxes', icon: Truck },
    { id: 'customers', label: 'Parties', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-1 px-2 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
