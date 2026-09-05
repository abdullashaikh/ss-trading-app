import React from 'react';
import { LayoutDashboard, ShoppingCart, Receipt, Truck, Package, Menu } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenMenu }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchase', icon: ShoppingCart },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'vehicles', label: 'Vehicles', icon: Truck, isSpecial: true },
    { id: 'delivery', label: 'Boxes', icon: Package },
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-1 px-1 shadow-lg">
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
                  : item.isSpecial
                  ? 'text-emerald-700 font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50' : item.isSpecial ? 'bg-emerald-50' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-gray-600 hover:text-gray-900 transition-all"
        >
          <div className="p-1 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
};
