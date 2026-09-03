export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/+$/, '');

export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export function getBillDownloadUrl(billNumber: string): string {
  return `${BACKEND_URL}/bill/${encodeURIComponent(billNumber)}`;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('ss_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials: { loginName: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Companies & Suppliers
  getCompanies: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/companies?${params.toString()}`);
  },
  getCompanyById: (id: number) => request(`/companies/${id}`),
  saveCompany: (data: any) => request('/companies', { method: 'POST', body: JSON.stringify(data) }),
  getCompanyLedger: (id: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/companies/${id}/ledger?${params.toString()}`);
  },

  // Purchases
  getPurchases: (companyId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/purchases?${params.toString()}`);
  },
  savePurchase: (data: any) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Supplier Payments
  getCompanyPayments: (companyId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/company-payments?${params.toString()}`);
  },
  saveCompanyPayment: (data: any) => request('/company-payments', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/customers?${params.toString()}`);
  },
  getCustomerById: (id: number) => request(`/customers/${id}`),
  saveCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  getCustomerPending: (id: number) => request(`/customers/${id}/pending`),
  getCustomerLedger: (id: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/customers/${id}/ledger?${params.toString()}`);
  },

  // Trucks & Boxes
  getTrucks: () => request('/trucks'),
  getTruckById: (id: number) => request(`/trucks/${id}`),
  saveTruck: (data: any) => request('/trucks', { method: 'POST', body: JSON.stringify(data) }),
  getTruckBoxes: (truckId: number, date: string) => request(`/trucks/${truckId}/boxes?date=${date}`),

  // Deliveries & Box Allocations
  getDeliveries: (customerId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/deliveries?${params.toString()}`);
  },
  getDeliveryById: (id: number) => request(`/deliveries/${id}`),
  saveCustomerDelivery: (data: any) => request('/deliveries', { method: 'POST', body: JSON.stringify(data) }),

  // Billing
  getBills: (customerId?: number, startDate?: string, endDate?: string, search?: string) => {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (search) params.append('search', search);
    return request(`/bills?${params.toString()}`);
  },
  getBillById: (id: number) => request(`/bills/${id}`),
  createBill: (data: any) => request('/bills', { method: 'POST', body: JSON.stringify(data) }),
  recordBillPayment: (data: any) => request('/bills/payment', { method: 'POST', body: JSON.stringify(data) }),

  // Workers
  getWorkers: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/workers?${params.toString()}`);
  },
  getWorkerById: (id: number) => request(`/workers/${id}`),
  saveWorker: (data: any) => request('/workers', { method: 'POST', body: JSON.stringify(data) }),
  getWorkerPayments: (workerId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (workerId) params.append('worker_id', workerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/worker-payments?${params.toString()}`);
  },
  saveWorkerPayment: (data: any) => request('/worker-payments', { method: 'POST', body: JSON.stringify(data) }),
  getWorkerLedger: (id: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/workers/${id}/ledger?${params.toString()}`);
  },

  // Vehicles
  getVehicles: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/vehicles?${params.toString()}`);
  },
  getVehicleById: (id: number) => request(`/vehicles/${id}`),
  saveVehicle: (data: any) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  getVehicleEntries: (vehicleId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicle_id', vehicleId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/vehicle-entries?${params.toString()}`);
  },
  getVehicleEntryById: (id: number) => request(`/vehicle-entries/${id}`),
  saveVehicleEntry: (data: any) => request('/vehicle-entries', { method: 'POST', body: JSON.stringify(data) }),
  getVehicleReport: (vehicleId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicle_id', vehicleId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/vehicle-report?${params.toString()}`);
  },

  // Reports
  getPurchaseReport: (companyId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/reports/purchases?${params.toString()}`);
  },
  getSalesReport: (customerId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/reports/sales?${params.toString()}`);
  },
  getWorkerReport: (workerId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (workerId) params.append('worker_id', workerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/reports/workers?${params.toString()}`);
  },
  getOverallReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/reports/overall?${params.toString()}`);
  }
};
