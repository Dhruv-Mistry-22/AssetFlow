export const mockStats = {
  totalAssets: 142,
  activeAllocations: 45,
  pendingMaintenance: 3,
  overdueReturns: 1,
};

export const mockRecentActivity = [
  {
    id: "1",
    action: "ASSET_ALLOCATED",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    details: JSON.stringify({ assetTag: "MAC-2023-01" }),
    user: { name: "Alice Smith" }
  },
  {
    id: "2",
    action: "MAINTENANCE_REQUESTED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    details: JSON.stringify({ reason: "Screen cracked" }),
    user: { name: "Bob Jones" }
  },
  {
    id: "3",
    action: "ASSET_RETURNED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    details: JSON.stringify({ assetTag: "MON-4K-02" }),
    user: { name: "Charlie Brown" }
  }
];

export const mockAssets = [
  {
    id: "a1",
    assetTag: "AF-0001",
    name: "MacBook Pro M2",
    status: "ALLOCATED",
    condition: "EXCELLENT",
    location: "NY Office",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    category: { name: "Laptops" },
  },
  {
    id: "a2",
    assetTag: "AF-0002",
    name: "Dell UltraSharp 27\"",
    status: "AVAILABLE",
    condition: "GOOD",
    location: "Remote",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    category: { name: "Monitors" },
  },
  {
    id: "a3",
    assetTag: "AF-0003",
    name: "Conference Room Projector",
    status: "UNDER_MAINTENANCE",
    condition: "POOR",
    location: "Room A",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    category: { name: "A/V Equipment" },
  },
];

export const mockCategories = [
  { id: "c1", name: "Laptops" },
  { id: "c2", name: "Monitors" },
  { id: "c3", name: "A/V Equipment" },
];

export const mockRequests = [
  {
    id: "req1",
    name: "John Doe",
    email: "john@example.com",
    department: "Marketing",
    reason: "Need access to book AV equipment for upcoming campaign shoots.",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  }
];

export const mockAllocations = [
  {
    id: "al1",
    assetId: "a1",
    employeeId: "emp1",
    expectedReturnDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    status: "ACTIVE",
    asset: mockAssets[0],
    employee: { name: "Alice Smith", email: "alice@example.com" }
  }
];

export const mockBookings = [
  {
    id: "b1",
    assetId: "a3",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(),
    status: "UPCOMING",
    asset: mockAssets[2],
    employee: { name: "Bob Jones", email: "bob@example.com" }
  }
];

export const mockMaintenanceRequests = [
  {
    id: "m1",
    assetId: "a3",
    priority: "HIGH",
    description: "Bulb burnt out",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    asset: mockAssets[2],
    requestedByUser: { name: "Alice Smith", email: "alice@example.com" }
  }
];

export const mockAuditCycles = [
  {
    id: "aud1",
    cycleNumber: "CYC-2023-Q4",
    scope: "All NY Office Equipment",
    status: "IN_PROGRESS",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    createdByUser: { name: "Admin", email: "admin@example.com" }
  }
];
