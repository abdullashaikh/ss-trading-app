export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/+$/, '');

export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export function getBillDownloadUrl(billNumber: string, download: boolean = true): string {
  const query = download ? '?download=1' : '';
  return `${BACKEND_URL}/bill/${encodeURIComponent(billNumber)}${query}`;
}

export async function downloadBillPdfFile(billNumber: string): Promise<void> {
  const url = getBillDownloadUrl(billNumber, true);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download invoice PDF');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${billNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Direct link fallback
    const link = document.createElement('a');
    link.href = url;
    link.download = `${billNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function formatWhatsAppMobile(mobile: string): string {
  let clean = (mobile || '').replace(/\D/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  return clean;
}

export function generateWhatsAppBillShare(bill: {
  customer_name_snapshot?: string;
  customer_name?: string;
  customer_mobile_snapshot?: string;
  customer_mobile?: string;
  bill_number: string;
  total_quantity?: number | string;
  total_kg?: number | string;
  current_bill_amount?: number | string;
  amount_paid?: number | string;
  final_pending_amount?: number | string;
  customMobile?: string;
}): { url: string; message: string; targetPhone: string } {
  const customerName = bill.customer_name_snapshot || bill.customer_name || 'Customer';
  const rawMobile = bill.customMobile || bill.customer_mobile_snapshot || bill.customer_mobile || '';
  const cleanMobile = formatWhatsAppMobile(rawMobile);
  const downloadUrl = getBillDownloadUrl(bill.bill_number);

  const totalBirds = bill.total_quantity || 0;
  const totalKg = Number(bill.total_kg || 0).toFixed(2);
  const totalAmount = Number(bill.current_bill_amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const amountPaid = Number(bill.amount_paid || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const pendingBal = Number(bill.final_pending_amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const lines = [
    `Hello *${customerName}*,`,
    '',
    `Your SS Trading invoice *#${bill.bill_number}* is ready.`,
    '──────────────────',
    `📦 *Total Qty (કુલ નંગ):* ${totalBirds}`,
    `⚖️ *Total Weight (કુલ વજન):* ${totalKg} KG`,
    `💰 *Bill Amount (બિલ રકમ):* ₹${totalAmount}`,
    `💳 *Amount Paid (ચૂકવેલ રકમ):* ₹${amountPaid}`,
    `⚠️ *Net Pending Due (બાકી રકમ):* ₹${pendingBal}`,
    '──────────────────',
    `📄 *Download Bill PDF:*`,
    downloadUrl,
    '',
    'Thank you for your business!',
    '_SS TRADING_'
  ];

  const message = lines.join('\n');
  const url = cleanMobile
    ? `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    url,
    message,
    targetPhone: cleanMobile
  };
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
  deleteCompany: (id: number) => request(`/companies/${id}`, { method: 'DELETE' }),
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
  deletePurchase: (id: number) => request(`/purchases/${id}`, { method: 'DELETE' }),

  // Supplier Payments
  getCompanyPayments: (companyId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/company-payments?${params.toString()}`);
  },
  saveCompanyPayment: (data: any) => request('/company-payments', { method: 'POST', body: JSON.stringify(data) }),
  deleteCompanyPayment: (id: number) => request(`/company-payments/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/customers?${params.toString()}`);
  },
  getCustomerById: (id: number) => request(`/customers/${id}`),
  saveCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  deleteCustomer: (id: number) => request(`/customers/${id}`, { method: 'DELETE' }),
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
  deleteDelivery: (id: number) => request(`/deliveries/${id}`, { method: 'DELETE' }),

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
  deleteBill: (id: number) => request(`/bills/${id}`, { method: 'DELETE' }),
  recordBillPayment: (data: any) => request('/bills/payment', { method: 'POST', body: JSON.stringify(data) }),
  deleteBillPayment: (id: number) => request(`/bills/payment/${id}`, { method: 'DELETE' }),
  updateBillWhatsappStatus: (id: number, status: string = 'SENT') =>
    request(`/bills/${id}/whatsapp-status`, { method: 'POST', body: JSON.stringify({ status }) }),

  // Workers
  getWorkers: (search?: string, isActive?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return request(`/workers?${params.toString()}`);
  },
  getWorkerById: (id: number) => request(`/workers/${id}`),
  saveWorker: (data: any) => request('/workers', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorker: (id: number) => request(`/workers/${id}`, { method: 'DELETE' }),
  getWorkerPayments: (workerId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (workerId) params.append('worker_id', workerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/worker-payments?${params.toString()}`);
  },
  saveWorkerPayment: (data: any) => request('/worker-payments', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorkerPayment: (id: number) => request(`/worker-payments/${id}`, { method: 'DELETE' }),
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
  deleteVehicle: (id: number) => request(`/vehicles/${id}`, { method: 'DELETE' }),
  getVehicleEntries: (vehicleId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicle_id', vehicleId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/vehicle-entries?${params.toString()}`);
  },
  getVehicleEntryById: (id: number) => request(`/vehicle-entries/${id}`),
  saveVehicleEntry: (data: any) => request('/vehicle-entries', { method: 'POST', body: JSON.stringify(data) }),
  deleteVehicleEntry: (id: number) => request(`/vehicle-entries/${id}`, { method: 'DELETE' }),
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
