export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  departmentId?: string | null;
}

export interface Department {
  id: string;
  name: string;
  headId?: string | null;
  headName?: string | null;
  parentDepartmentId?: string | null;
  parentDepartmentName?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AssetCategory {
  id: string;
  name: string;
  customFields?: any; // JSON representation
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  serialNumber: string;
  acquisitionDate: string;
  acquisitionCost: number;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  location: string;
  isBookable: boolean;
  status: 'Available' | 'Allocated' | 'Reserved' | 'Under_Maintenance' | 'Lost' | 'Retired' | 'Disposed';
  categoryId: string;
  categoryName: string;
  currentHolderName?: string | null;
  currentHolderId?: string | null;
}

export interface Allocation {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  userId?: string | null;
  userName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  allocatedAt: string;
  expectedReturnDate?: string | null;
  returnedAt?: string | null;
  checkInNotes?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'TRANSFERRED';
}

export interface TransferRequest {
  id: string;
  allocationId: string;
  assetTag: string;
  assetName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
}

export interface Booking {
  id: string;
  assetId: string;
  assetName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  raisedById: string;
  raisedByName: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'TECHNICIAN_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string | null;
  cost?: number | null;
  technicianId?: string | null;
  technicianName?: string | null;
  resolutionNotes?: string | null;
}

export interface AuditCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  departmentScope?: string | null;
  locationScope?: string | null;
  status: 'OPEN' | 'CLOSED';
  auditors: string[]; // names of auditors
}

export interface AuditItem {
  id: string;
  auditCycleId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  expectedLocation: string;
  status?: 'VERIFIED' | 'MISSING' | 'DAMAGED' | null; // null = pending
  auditedAt?: string | null;
  notes?: string | null;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// SEED DATA DUMP MATCHING THE EXCALIDRAW Blueprint EXACTLY
export const seedUsers: User[] = [
  { id: 'u1', email: 'aditi@company.com', name: 'Aditi Rao', role: 'ADMIN', status: 'ACTIVE', departmentId: 'd1' },
  { id: 'u2', email: 'rohan@company.com', name: 'Rohan Mehta', role: 'ASSET_MANAGER', status: 'ACTIVE', departmentId: 'd2' },
  { id: 'u3', email: 'sana@company.com', name: 'Sana Iqbal', role: 'DEPARTMENT_HEAD', status: 'ACTIVE', departmentId: 'd3' },
  { id: 'u4', email: 'priya@company.com', name: 'Priya Shah', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: 'd1' },
  { id: 'u5', email: 'arjun@company.com', name: 'Arjun Nair', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: 'd2' },
  { id: 'u6', email: 'varma@company.com', name: 'R. Varma', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: 'd3' }
];

export const seedDepartments: Department[] = [
  { id: 'd1', name: 'Engineering', headId: 'u1', headName: 'Aditi Rao', parentDepartmentId: null, status: 'ACTIVE' },
  { id: 'd2', name: 'Facilities', headId: 'u2', headName: 'Rohan Mehta', parentDepartmentId: null, status: 'ACTIVE' },
  { id: 'd3', name: 'Field ops (east)', headId: 'u3', headName: 'Sana Iqbal', parentDepartmentId: 'd4', parentDepartmentName: 'Field Ops', status: 'INACTIVE' },
  { id: 'd4', name: 'Field Ops', headId: null, headName: null, parentDepartmentId: null, status: 'ACTIVE' }
];

export const seedCategories: AssetCategory[] = [
  { id: 'c1', name: 'Electronics', customFields: [{ name: 'Warranty Period (Months)', type: 'number', required: true }] },
  { id: 'c2', name: 'Furniture', customFields: [{ name: 'Material', type: 'text', required: false }] },
  { id: 'c3', name: 'Vehicles', customFields: [{ name: 'License Plate', type: 'text', required: true }, { name: 'Fuel Type', type: 'text', required: true }] }
];

export const seedAssets: Asset[] = [
  { id: 'a1', assetTag: 'AF-0012', name: 'Dell Laptop', serialNumber: 'SN-0012', acquisitionDate: '2025-01-10', acquisitionCost: 1200, condition: 'NEW', location: 'Bengaluru', isBookable: false, status: 'Allocated', categoryId: 'c1', categoryName: 'Electronics', currentHolderName: 'Priya Shah', currentHolderId: 'u4' },
  { id: 'a2', assetTag: 'AF-0062', name: 'Projector', serialNumber: 'SN-0062', acquisitionDate: '2024-06-15', acquisitionCost: 800, condition: 'GOOD', location: 'HQ Floor 2', isBookable: true, status: 'Under_Maintenance', categoryId: 'c1', categoryName: 'Electronics' },
  { id: 'a3', assetTag: 'AF-0201', name: 'Office Chair', serialNumber: 'SN-0201', acquisitionDate: '2024-11-20', acquisitionCost: 250, condition: 'GOOD', location: 'Warehouse', isBookable: false, status: 'Available', categoryId: 'c2', categoryName: 'Furniture' },
  { id: 'a4', assetTag: 'AF-0114', name: 'Dell Laptop', serialNumber: 'SN-0114', acquisitionDate: '2025-03-01', acquisitionCost: 1300, condition: 'NEW', location: 'Bengaluru', isBookable: false, status: 'Allocated', categoryId: 'c1', categoryName: 'Electronics', currentHolderName: 'Priya Shah', currentHolderId: 'u4' },
  { id: 'a5', assetTag: 'AF-0003', name: 'AC Unit', serialNumber: 'SN-0003', acquisitionDate: '2023-05-12', acquisitionCost: 900, condition: 'POOR', location: 'Desk E12', isBookable: false, status: 'Under_Maintenance', categoryId: 'c1', categoryName: 'Electronics' },
  { id: 'a6', assetTag: 'AF-9921', name: 'Office Chair', serialNumber: 'SN-9921', acquisitionDate: '2024-01-18', acquisitionCost: 150, condition: 'FAIR', location: 'Desk E14', isBookable: false, status: 'Lost', categoryId: 'c2', categoryName: 'Furniture' },
  { id: 'a7', assetTag: 'AF-9838', name: 'Monitor', serialNumber: 'SN-9838', acquisitionDate: '2024-03-24', acquisitionCost: 350, condition: 'GOOD', location: 'Desk E15', isBookable: false, status: 'Available', categoryId: 'c1', categoryName: 'Electronics' },
  { id: 'a8', assetTag: 'AF-0078', name: 'Forklift', serialNumber: 'SN-0078', acquisitionDate: '2022-09-01', acquisitionCost: 15000, condition: 'GOOD', location: 'Warehouse', isBookable: false, status: 'Allocated', categoryId: 'c3', categoryName: 'Vehicles', currentHolderName: 'R. Varma', currentHolderId: 'u6' },
  { id: 'a9', assetTag: 'AF-0897', name: 'Printer', serialNumber: 'SN-0897', acquisitionDate: '2023-10-10', acquisitionCost: 500, condition: 'FAIR', location: 'HQ Floor 1', isBookable: false, status: 'Under_Maintenance', categoryId: 'c1', categoryName: 'Electronics' },
  { id: 'a10', assetTag: 'AF-0873', name: 'Office Desk', serialNumber: 'SN-0873', acquisitionDate: '2024-07-07', acquisitionCost: 400, condition: 'GOOD', location: 'Warehouse', isBookable: false, status: 'Available', categoryId: 'c2', categoryName: 'Furniture' },
  { id: 'a11', assetTag: 'AF-0301', name: 'Camera', serialNumber: 'SN-0301', acquisitionDate: '2023-01-15', acquisitionCost: 1500, condition: 'GOOD', location: 'Media Room', isBookable: true, status: 'Available', categoryId: 'c1', categoryName: 'Electronics' },
  { id: 'a12', assetTag: 'AF-0410', name: 'Ergonomic Chair', serialNumber: 'SN-0410', acquisitionDate: '2024-04-10', acquisitionCost: 300, condition: 'GOOD', location: 'HR Office', isBookable: false, status: 'Available', categoryId: 'c2', categoryName: 'Furniture' },
  { id: 'a13', assetTag: 'AF-0087', name: 'Forklift (Ops)', serialNumber: 'SN-0087', acquisitionDate: '2021-05-15', acquisitionCost: 18000, condition: 'FAIR', location: 'Warehouse', isBookable: false, status: 'Available', categoryId: 'c3', categoryName: 'Vehicles' },
  { id: 'a14', assetTag: 'AF-0020', name: 'Developer Laptop', serialNumber: 'SN-0020', acquisitionDate: '2022-03-20', acquisitionCost: 2000, condition: 'GOOD', location: 'Bengaluru', isBookable: false, status: 'Allocated', categoryId: 'c1', categoryName: 'Electronics', currentHolderName: 'Arjun Nair', currentHolderId: 'u5' }
];

export const seedAllocations: Allocation[] = [
  { id: 'al1', assetId: 'a1', assetTag: 'AF-0012', assetName: 'Dell Laptop', userId: 'u4', userName: 'Priya Shah', departmentId: 'd1', departmentName: 'Engineering', allocatedAt: '2025-03-12', status: 'ACTIVE' },
  { id: 'al2', assetId: 'a4', assetTag: 'AF-0114', assetName: 'Dell Laptop', userId: 'u4', userName: 'Priya Shah', departmentId: 'd1', departmentName: 'Engineering', allocatedAt: '2025-03-12', expectedReturnDate: '2026-08-30', status: 'ACTIVE' },
  { id: 'al3', assetId: 'a8', assetTag: 'AF-0078', assetName: 'Forklift', userId: 'u6', userName: 'R. Varma', departmentId: 'd3', departmentName: 'Field ops (east)', allocatedAt: '2025-02-15', status: 'ACTIVE' },
  { id: 'al4', assetId: 'a14', assetTag: 'AF-0020', assetName: 'Developer Laptop', userId: 'u5', userName: 'Arjun Nair', departmentId: 'd2', departmentName: 'Facilities', allocatedAt: '2024-04-10', expectedReturnDate: '2026-07-09', status: 'ACTIVE' } // Overdue
];

export const seedBookings: Booking[] = [
  { id: 'b1', assetId: 'a2', assetName: 'Conference room B2', userId: 'u5', userName: 'Arjun Nair', startTime: '2026-07-07T09:00:00', endTime: '2026-07-07T10:00:00', status: 'COMPLETED', createdAt: '2026-07-06T15:00:00' }
];

export const seedMaintenance: MaintenanceRequest[] = [
  { id: 'm1', assetId: 'a2', assetTag: 'AF-0062', assetName: 'Projector', raisedById: 'u4', raisedByName: 'Priya Shah', description: 'Projector bulb not turning on', priority: 'MEDIUM', status: 'PENDING', createdAt: '2026-07-08T10:00:00' },
  { id: 'm2', assetId: 'a5', assetTag: 'AF-0003', assetName: 'AC Unit', raisedById: 'u5', raisedByName: 'Arjun Nair', description: 'AC unit noisy compressor', priority: 'HIGH', status: 'APPROVED', createdAt: '2026-07-09T11:00:00' },
  { id: 'm3', assetId: 'a8', assetTag: 'AF-0078', assetName: 'Forklift', raisedById: 'u6', raisedByName: 'R. Varma', description: 'Forklift engine oil leak', priority: 'CRITICAL', status: 'TECHNICIAN_ASSIGNED', createdAt: '2026-07-10T09:30:00', technicianId: 'u6', technicianName: 'R. Varma' },
  { id: 'm4', assetId: 'a9', assetTag: 'AF-0897', assetName: 'Printer', raisedById: 'u5', raisedByName: 'Arjun Nair', description: 'Printer Jam', priority: 'LOW', status: 'IN_PROGRESS', createdAt: '2026-07-11T14:00:00' },
  { id: 'm5', assetId: 'a10', assetTag: 'AF-0873', assetName: 'Office Desk', raisedById: 'u5', raisedByName: 'Arjun Nair', description: 'Chair leg repair', priority: 'LOW', status: 'RESOLVED', createdAt: '2026-07-05T09:00:00', resolvedAt: '2026-07-07T16:00:00', cost: 50 }
];

export const seedAudits: AuditCycle[] = [
  { id: 'au1', name: 'Q3 audit: Engineering dept', startDate: '2026-07-01', endDate: '2026-07-15', departmentScope: 'Engineering', locationScope: 'Bengaluru', status: 'OPEN', auditors: ['Aditi Rao', 'Sana Iqbal'] }
];

export const seedAuditItems: AuditItem[] = [
  { id: 'ai1', auditCycleId: 'au1', assetId: 'a5', assetTag: 'AF-0003', assetName: 'AC Unit', expectedLocation: 'Desk E12', status: 'VERIFIED', auditedAt: '2026-07-02T10:00:00', notes: 'AC compressor was noisy but unit is verified' },
  { id: 'ai2', auditCycleId: 'au1', assetId: 'a6', assetTag: 'AF-9921', assetName: 'Office Chair', expectedLocation: 'Desk E14', status: 'MISSING', auditedAt: '2026-07-03T11:30:00', notes: 'Desk is empty, chair nowhere in the bay' },
  { id: 'ai3', auditCycleId: 'au1', assetId: 'a7', assetTag: 'AF-9838', assetName: 'Monitor', expectedLocation: 'Desk E15', status: 'DAMAGED', auditedAt: '2026-07-04T13:00:00', notes: 'Screen has horizontal color lines' }
];

export const seedLogs: ActivityLog[] = [
  { id: 'l1', userId: 'u1', userName: 'Aditi Rao', action: 'Laptop AF-0014 assigned to Priya Shah', entityType: 'ALLOCATION', entityId: 'al2', createdAt: '2026-07-12T10:57:00' },
  { id: 'l2', userId: 'u2', userName: 'Rohan Mehta', action: 'Maintenance request AF-0055 approved', entityType: 'MAINTENANCE', entityId: 'm2', createdAt: '2026-07-12T10:41:00' },
  { id: 'l3', userId: 'u4', userName: 'Priya Shah', action: 'Booking confirmed: Room B2 (2:00 to 3:00 PM)', entityType: 'BOOKING', entityId: 'b1', createdAt: '2026-07-12T09:59:00' },
  { id: 'l4', userId: 'u2', userName: 'Rohan Mehta', action: 'Transfer approved: AF-0033 to Facilities dept', entityType: 'TRANSFER', entityId: 't1', createdAt: '2026-07-12T07:59:00' }
];

export const seedNotifications: Notification[] = [
  { id: 'n1', userId: 'u1', title: 'Asset Assigned', message: 'Laptop AF-0014 has been successfully assigned to Priya Shah.', type: 'ALLOCATION', isRead: false, createdAt: '2026-07-12T10:57:00' },
  { id: 'n2', userId: 'u1', title: 'Maintenance Approved', message: 'Maintenance request AF-0055 for AC Unit has been approved.', type: 'MAINTENANCE', isRead: false, createdAt: '2026-07-12T10:41:00' },
  { id: 'n3', userId: 'u1', title: 'Booking Confirmed', message: 'Booking confirmed for Room B2 from 2:00 to 3:00 PM.', type: 'BOOKING', isRead: true, createdAt: '2026-07-12T09:59:00' },
  { id: 'n4', userId: 'u1', title: 'Overdue Return Alert', message: 'Asset Developer Laptop AF-0020 was due 3 days ago from Arjun Nair.', type: 'ALERT', isRead: false, createdAt: '2026-07-11T09:00:00' }
];
