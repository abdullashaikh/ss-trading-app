import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { Navbar } from './components/Navbar.js';
import { BottomNav } from './components/BottomNav.js';

import { DashboardPage } from './pages/DashboardPage.js';
import { CompaniesPage } from './pages/CompaniesPage.js';
import { PurchasesPage } from './pages/PurchasesPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { DeliveryPage } from './pages/DeliveryPage.js';
import { BillsPage } from './pages/BillsPage.js';
import { VehiclesPage } from './pages/VehiclesPage.js';
import { WorkersPage } from './pages/WorkersPage.js';
import { ReportsPage } from './pages/ReportsPage.js';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Cross-page quick action states
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddVehicleEntryOpen, setIsAddVehicleEntryOpen] = useState(false);
  const [isAddWorkerPaymentOpen, setIsAddWorkerPaymentOpen] = useState(false);

  // Delivery to Bill conversion data
  const [prefilledBillData, setPrefilledBillData] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
        Loading SS Trading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleConvertToBill = (deliveryData: any) => {
    setPrefilledBillData(deliveryData);
    setActiveTab('bills');
    setIsAddBillOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            setActiveTab={setActiveTab}
            onOpenAddPurchase={() => {
              setActiveTab('purchases');
              setIsAddPurchaseOpen(true);
            }}
            onOpenCreateBill={() => {
              setActiveTab('bills');
              setIsAddBillOpen(true);
            }}
            onOpenVehicleEntry={() => {
              setActiveTab('vehicles');
              setIsAddVehicleEntryOpen(true);
            }}
            onOpenWorkerPayment={() => {
              setActiveTab('workers');
              setIsAddWorkerPaymentOpen(true);
            }}
            onOpenAddCustomer={() => {
              setActiveTab('customers');
              setIsAddCustomerOpen(true);
            }}
            onOpenAddCompany={() => {
              setActiveTab('companies');
              setIsAddCompanyOpen(true);
            }}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesPage
            isAddPurchaseOpen={isAddPurchaseOpen}
            setIsAddPurchaseOpen={setIsAddPurchaseOpen}
          />
        )}

        {activeTab === 'companies' && (
          <CompaniesPage
            isAddCompanyOpen={isAddCompanyOpen}
            setIsAddCompanyOpen={setIsAddCompanyOpen}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersPage
            isAddCustomerOpen={isAddCustomerOpen}
            setIsAddCustomerOpen={setIsAddCustomerOpen}
          />
        )}

        {activeTab === 'delivery' && (
          <DeliveryPage onConvertToBill={handleConvertToBill} />
        )}

        {activeTab === 'bills' && (
          <BillsPage
            isAddBillOpen={isAddBillOpen}
            setIsAddBillOpen={setIsAddBillOpen}
            prefilledBillData={prefilledBillData}
            clearPrefilledBillData={() => setPrefilledBillData(null)}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesPage
            isAddEntryOpen={isAddVehicleEntryOpen}
            setIsAddEntryOpen={setIsAddVehicleEntryOpen}
          />
        )}

        {activeTab === 'workers' && (
          <WorkersPage
            isAddPaymentOpen={isAddWorkerPaymentOpen}
            setIsAddPaymentOpen={setIsAddWorkerPaymentOpen}
          />
        )}

        {activeTab === 'reports' && <ReportsPage />}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
