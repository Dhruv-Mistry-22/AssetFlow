'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Department,
  AssetCategory,
  Asset,
  Allocation,
  TransferRequest,
  Booking,
  MaintenanceRequest,
  AuditCycle,
  AuditItem,
  ActivityLog,
  Notification,
  seedUsers,
  seedDepartments,
  seedCategories,
  seedAssets,
  seedAllocations,
  seedBookings,
  seedMaintenance,
  seedAudits,
  seedAuditItems,
  seedLogs,
  seedNotifications,
} from '../lib/mockData';

interface StateContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  departments: Department[];
  categories: AssetCategory[];
  assets: Asset[];
  allocations: Allocation[];
  transferRequests: TransferRequest[];
  bookings: Booking[];
  maintenanceRequests: MaintenanceRequest[];
  auditCycles: AuditCycle[];
  auditItems: AuditItem[];
  logs: ActivityLog[];
  notifications: Notification[];
  
  // Actions
  promoteEmployee: (userId: string, role: User['role'], deptId?: string) => void;
  registerAsset: (data: Omit<Asset, 'id' | 'assetTag' | 'status' | 'categoryName'>) => Asset;
  allocateAsset: (
    assetId: string,
    userId: string | null,
    departmentId: string | null,
    expectedReturnDate?: string
  ) => { success: boolean; error?: string; currentHolder?: string };
  requestTransfer: (allocationId: string, toUserId: string, reason: string) => void;
  approveTransfer: (requestId: string) => void;
  returnAsset: (assetId: string, notes: string) => void;
  bookResource: (
    assetId: string,
    userId: string,
    startTime: string,
    endTime: string
  ) => {
    success: boolean;
    error?: string;
    recommendations?: {
      nextSlot: { startTime: string; endTime: string };
      alternativeResources: { id: string; name: string; tag: string }[];
    };
  };
  cancelBooking: (bookingId: string) => void;
  raiseMaintenance: (data: { assetId: string; description: string; priority: MaintenanceRequest['priority'] }) => void;
  updateMaintenanceStatus: (
    requestId: string,
    status: MaintenanceRequest['status'],
    notes?: string,
    cost?: number,
    techId?: string
  ) => void;
  createAuditCycle: (data: {
    name: string;
    startDate: string;
    endDate: string;
    departmentScope?: string;
    locationScope?: string;
    auditorIds: string[];
  }) => void;
  updateAuditItem: (itemId: string, status: 'VERIFIED' | 'MISSING' | 'DAMAGED', notes?: string) => void;
  closeAuditCycle: (cycleId: string) => void;
  markNotificationsRead: () => void;
  clearAllState: () => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [auditCycles, setAuditCycles] = useState<AuditCycle[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Fetch live data from PostgreSQL database via API
    const loadState = async () => {
      try {
        const response = await fetch('/api/sync');
        const dbData = await response.json();
        
        if (dbData.users) setUsers(dbData.users);
        if (dbData.departments) setDepartments(dbData.departments);
        if (dbData.categories) setCategories(dbData.categories);
        if (dbData.assets) setAssets(dbData.assets);
        if (dbData.allocations) setAllocations(dbData.allocations);
        if (dbData.bookings) setBookings(dbData.bookings);
        if (dbData.maintenanceRequests) setMaintenanceRequests(dbData.maintenanceRequests);
        
        // Mock data for the rest since seed didn't cover everything
        setTransferRequests(seedAllocations.length ? [] : []);
        setAuditCycles(seedAudits);
        setAuditItems(seedAuditItems);
        setLogs(seedLogs);
        setNotifications(seedNotifications);

        // Set default current user to Admin if available
        if (dbData.users && dbData.users.length > 0) {
          const admin = dbData.users.find((u: any) => u.role === "ADMIN") || dbData.users[0];
          setCurrentUserState(admin);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error("Failed to fetch DB state:", error);
      }
    };

    loadState();
  }, []);

  // Helper to persist state
  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      saveToStorage('af_current_user', user);
    } else {
      localStorage.removeItem('af_current_user');
    }
  };

  // 1. Promote Employee (Admin Only)
  const promoteEmployee = (userId: string, role: User['role'], deptId?: string) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const updated = { ...u, role, departmentId: deptId || u.departmentId };
        // If they become head of a department, update that department
        return updated;
      }
      return u;
    });

    setUsers(updatedUsers);
    saveToStorage('af_users', updatedUsers);

    // If role is promoted, add log and notification
    const employee = users.find((u) => u.id === userId);
    if (employee) {
      logAction(`Promoted ${employee.name} to ${role}`, 'USER', userId);
      pushNotification(
        'Role Promoted',
        `You have been promoted to ${role} role by Admin.`,
        'ALERT',
        userId
      );
    }
  };

  // Helper to generate a tag: AF-0001, etc.
  const generateAssetTag = (allAssets: Asset[]): string => {
    const tags = allAssets
      .map((a) => {
        const num = parseInt(a.assetTag.replace('AF-', ''));
        return isNaN(num) ? 0 : num;
      });
    const maxNum = tags.length > 0 ? Math.max(...tags) : 0;
    const nextNum = maxNum + 1;
    return `AF-${nextNum.toString().padStart(4, '0')}`;
  };

  // 2. Register Asset (Asset Manager Only)
  const registerAsset = async (data: Omit<Asset, 'id' | 'assetTag' | 'status' | 'categoryName'>) => {
    const newTag = generateAssetTag(assets);
    const category = categories.find((c) => c.id === data.categoryId);
    const newAsset: Asset = {
      ...data,
      id: `a_${Date.now()}`, // Temporary local ID
      assetTag: newTag,
      status: 'Available',
      categoryName: category ? category.name : 'Unknown',
    };

    const updatedAssets = [newAsset, ...assets];
    setAssets(updatedAssets);
    
    // Fire-and-forget sync to DB
    fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        categoryId: data.categoryId,
        serialNumber: data.serialNumber || `SN-${newTag}`,
        condition: data.condition,
        location: data.location,
        acquisitionCost: data.acquisitionCost,
        acquisitionDate: data.acquisitionDate || new Date().toISOString()
      })
    }).catch(console.error);

    logAction(`Registered new asset ${newAsset.name} (${newAsset.assetTag})`, 'ASSET', newAsset.id);
    return newAsset;
  };

  // 3. Allocate Asset (Asset Manager Only)
  // Constraint: One active allocation per asset. Returns conflict details if asset is already allocated.
  const allocateAsset = (
    assetId: string,
    userId: string | null,
    departmentId: string | null,
    expectedReturnDate?: string
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return { success: false, error: 'Asset not found' };

    // Constraint Check: Is the asset currently allocated or reserved or in maintenance?
    if (asset.status !== 'Available') {
      const activeAlloc = allocations.find((al) => al.assetId === assetId && al.status === 'ACTIVE');
      const holderName = activeAlloc ? activeAlloc.userName || activeAlloc.departmentName : 'Someone';
      return {
        success: false,
        error: 'Conflict: This asset is currently allocated.',
        currentHolder: holderName || 'Unknown User',
      };
    }

    const assignedUser = users.find((u) => u.id === userId);
    const assignedDept = departments.find((d) => d.id === departmentId);

    const newAlloc: Allocation = {
      id: `al_${Date.now()}`,
      assetId,
      assetTag: asset.assetTag,
      assetName: asset.name,
      userId,
      userName: assignedUser ? assignedUser.name : null,
      departmentId,
      departmentName: assignedDept ? assignedDept.name : null,
      allocatedAt: new Date().toISOString().split('T')[0],
      expectedReturnDate: expectedReturnDate || null,
      status: 'ACTIVE',
    };

    // Update asset status
    const updatedAssets = assets.map((a) => {
      if (a.id === assetId) {
        return {
          ...a,
          status: 'Allocated' as const,
          currentHolderName: newAlloc.userName || newAlloc.departmentName,
          currentHolderId: userId,
        };
      }
      return a;
    });

    const updatedAllocs = [newAlloc, ...allocations];

    setAssets(updatedAssets);
    setAllocations(updatedAllocs);
    
    // Fire-and-forget API sync
    fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: asset.id,
        employeeId: userId,
        department: assignedDept?.name || null,
        expectedReturnDate: expectedReturnDate || null,
        notes: "Allocated via Client UI"
      })
    }).catch(console.error);

    logAction(
      `Allocated asset ${asset.assetTag} to ${newAlloc.userName || newAlloc.departmentName}`,
      'ALLOCATION',
      newAlloc.id
    );

    if (userId) {
      pushNotification(
        'Asset Assigned',
        `Asset ${asset.name} (${asset.assetTag}) has been assigned to you.`,
        'ALLOCATION',
        userId
      );
    }

    return { success: true };
  };

  // 4. Request Transfer (Employee Only)
  const requestTransfer = (allocationId: string, toUserId: string, reason: string) => {
    const alloc = allocations.find((al) => al.id === allocationId);
    if (!alloc) return;

    const fromUser = users.find((u) => u.id === alloc.userId);
    const toUser = users.find((u) => u.id === toUserId);

    if (!toUser) return;

    const newRequest: TransferRequest = {
      id: `tr_${Date.now()}`,
      allocationId,
      assetTag: alloc.assetTag,
      assetName: alloc.assetName,
      fromUserId: alloc.userId || '',
      fromUserName: fromUser ? fromUser.name : 'Unknown',
      toUserId,
      toUserName: toUser.name,
      reason,
      status: 'REQUESTED',
      createdAt: new Date().toISOString(),
    };

    const updatedTransfers = [newRequest, ...transferRequests];
    setTransferRequests(updatedTransfers);
    saveToStorage('af_transfers', updatedTransfers);

    logAction(
      `Submitted transfer request for asset ${alloc.assetTag} from ${newRequest.fromUserName} to ${newRequest.toUserName}`,
      'TRANSFER',
      newRequest.id
    );

    // Notify target user and asset managers
    pushNotification(
      'Transfer Requested',
      `${newRequest.fromUserName} requested to transfer ${alloc.assetName} (${alloc.assetTag}) to you.`,
      'TRANSFER',
      toUserId
    );
  };

  // 5. Approve Transfer (Asset Manager / Dept Head Only)
  const approveTransfer = (requestId: string) => {
    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) return;

    const alloc = allocations.find((al) => al.id === request.allocationId);
    if (!alloc) return;

    // Mark request as approved/completed
    const updatedTransfers = transferRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'APPROVED' as const, resolvedAt: new Date().toISOString() } : r
    );

    // Mark previous allocation as Transferred
    const updatedAllocs = allocations.map((al) =>
      al.id === alloc.id ? { ...al, status: 'TRANSFERRED' as const, returnedAt: new Date().toISOString().split('T')[0] } : al
    );

    // Create a new allocation for the target user
    const toUser = users.find((u) => u.id === request.toUserId);
    const targetDept = toUser ? departments.find((d) => d.id === toUser.departmentId) : null;

    const newAlloc: Allocation = {
      id: `al_${Date.now()}`,
      assetId: alloc.assetId,
      assetTag: alloc.assetTag,
      assetName: alloc.assetName,
      userId: request.toUserId,
      userName: request.toUserName,
      departmentId: targetDept ? targetDept.id : null,
      departmentName: targetDept ? targetDept.name : null,
      allocatedAt: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    };

    // Update asset details
    const updatedAssets = assets.map((a) => {
      if (a.id === alloc.assetId) {
        return {
          ...a,
          currentHolderName: request.toUserName,
          currentHolderId: request.toUserId,
        };
      }
      return a;
    });

    const finalAllocs = [newAlloc, ...updatedAllocs];

    setTransferRequests(updatedTransfers);
    setAllocations(finalAllocs);
    setAssets(updatedAssets);

    saveToStorage('af_transfers', updatedTransfers);
    saveToStorage('af_allocations', finalAllocs);
    saveToStorage('af_assets', updatedAssets);

    logAction(
      `Approved transfer of asset ${alloc.assetTag} to ${request.toUserName}`,
      'TRANSFER',
      request.id
    );

    // Notify both users
    pushNotification(
      'Transfer Approved',
      `Transfer of ${alloc.assetName} (${alloc.assetTag}) to you has been approved.`,
      'TRANSFER',
      request.toUserId
    );
    if (request.fromUserId) {
      pushNotification(
        'Transfer Completed',
        `Transfer of ${alloc.assetName} (${alloc.assetTag}) has been completed.`,
        'TRANSFER',
        request.fromUserId
      );
    }
  };

  // 6. Return Asset (Asset Manager Only)
  const returnAsset = (assetId: string, notes: string) => {
    const activeAlloc = allocations.find((al) => al.assetId === assetId && al.status === 'ACTIVE');
    
    // Update allocation
    const updatedAllocs = allocations.map((al) => {
      if (activeAlloc && al.id === activeAlloc.id) {
        return {
          ...al,
          status: 'RETURNED' as const,
          returnedAt: new Date().toISOString().split('T')[0],
          checkInNotes: notes,
        };
      }
      return al;
    });

    // Update asset status
    const updatedAssets = assets.map((a) => {
      if (a.id === assetId) {
        return {
          ...a,
          status: 'Available' as const,
          currentHolderName: null,
          currentHolderId: null,
        };
      }
      return a;
    });

    setAllocations(updatedAllocs);
    setAssets(updatedAssets);

    saveToStorage('af_allocations', updatedAllocs);
    saveToStorage('af_assets', updatedAssets);

    logAction(
      `Returned asset ${activeAlloc ? activeAlloc.assetTag : assetId}. Notes: ${notes}`,
      'ALLOCATION',
      activeAlloc ? activeAlloc.id : 'unknown'
    );
  };

  // 7. Resource Booking (Collision Overlap Validation)
  // Constraint Check: existingStart < newEnd AND existingEnd > newStart
  const bookResource = (
    assetId: string,
    userId: string,
    startTime: string,
    endTime: string
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return { success: false, error: 'Asset not found' };

    const newStart = new Date(startTime).getTime();
    const newEnd = new Date(endTime).getTime();

    if (newStart >= newEnd) {
      return { success: false, error: 'End time must be after start time.' };
    }

    // Check overlaps
    const conflict = bookings.find((b) => {
      if (b.assetId !== assetId || b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return bStart < newEnd && bEnd > newStart; // range overlap logic
    });

    if (conflict) {
      // 1. Calculate next available time slot for the SAME resource
      const duration = newEnd - newStart;
      let t = newStart;
      const activeBookings = bookings
        .filter(b => b.assetId === assetId && b.status !== 'CANCELLED')
        .map(b => ({
          start: new Date(b.startTime).getTime(),
          end: new Date(b.endTime).getTime()
        }))
        .sort((a, b) => a.start - b.start);

      // Iterate to find a gap of at least 'duration'
      let foundSlot = false;
      while (!foundSlot) {
        const overlap = activeBookings.find(b => b.start < t + duration && b.end > t);
        if (overlap) {
          t = overlap.end; // Push past the overlapping booking
        } else {
          foundSlot = true;
        }
      }

      const nextStartStr = new Date(t).toISOString();
      const nextEndStr = new Date(t + duration).toISOString();

      // Convert to local datetime-local format: 'YYYY-MM-DDTHH:MM'
      const formatLocalDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const pad = (num: number) => num.toString().padStart(2, '0');
        // adjust for timezone offset to match input
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - userTimezoneOffset);
        return localDate.toISOString().slice(0, 16);
      };

      // 2. Find alternative resources in the same category available at the requested time
      const alternativeAssets = assets.filter(a => 
        a.id !== assetId && 
        a.isBookable && 
        a.categoryId === asset.categoryId &&
        a.status === 'Available'
      ).filter(altAsset => {
        // Ensure no overlapping booking exists for this alt asset
        const altConflict = bookings.find(b => {
          if (b.assetId !== altAsset.id || b.status === 'CANCELLED') return false;
          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();
          return bStart < newEnd && bEnd > newStart;
        });
        return !altConflict;
      });

      return {
        success: false,
        error: `Conflict: This asset is already booked by ${conflict.userName} during that time slot.`,
        recommendations: {
          nextSlot: {
            startTime: formatLocalDateTime(nextStartStr),
            endTime: formatLocalDateTime(nextEndStr)
          },
          alternativeResources: alternativeAssets.map(a => ({ id: a.id, name: a.name, tag: a.assetTag }))
        }
      };
    }

    const user = users.find((u) => u.id === userId);
    const newBooking: Booking = {
      id: `bk_${Date.now()}`,
      assetId,
      assetName: asset.name,
      userId,
      userName: user ? user.name : 'Unknown',
      startTime,
      endTime,
      status: 'UPCOMING',
      createdAt: new Date().toISOString(),
    };

    const updatedBookings = [newBooking, ...bookings];
    setBookings(updatedBookings);
    
    // Fire-and-forget API sync
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId,
        employeeId: userId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        purpose: "Booked via Client UI"
      })
    }).catch(console.error);

    logAction(
      `Booked resource ${asset.name} from ${startTime} to ${endTime}`,
      'BOOKING',
      newBooking.id
    );

    return { success: true };
  };

  const cancelBooking = (bookingId: string) => {
    const updatedBookings = bookings.map((b) =>
      b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b
    );
    setBookings(updatedBookings);
    saveToStorage('af_bookings', updatedBookings);

    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      logAction(`Cancelled booking for ${booking.assetName}`, 'BOOKING', bookingId);
    }
  };

  // 8. Raise Maintenance (Employee Only)
  const raiseMaintenance = (data: {
    assetId: string;
    description: string;
    priority: MaintenanceRequest['priority'];
  }) => {
    const asset = assets.find((a) => a.id === data.assetId);
    if (!asset) return;

    const newRequest: MaintenanceRequest = {
      id: `mt_${Date.now()}`,
      assetId: data.assetId,
      assetTag: asset.assetTag,
      assetName: asset.name,
      raisedById: currentUser?.id || '',
      raisedByName: currentUser?.name || 'Unknown',
      description: data.description,
      priority: data.priority,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const updatedMaint = [newRequest, ...maintenanceRequests];
    setMaintenanceRequests(updatedMaint);

    // Fire-and-forget sync
    fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: data.assetId,
        requestedByUserId: currentUser?.id,
        issueDescription: data.description,
        priority: data.priority
      })
    }).catch(console.error);

    logAction(
      `Raised maintenance request for asset ${asset.assetTag} (${data.priority} priority)`,
      'MAINTENANCE',
      newRequest.id
    );

    // Notify Asset Managers
    pushNotification(
      'New Maintenance Request',
      `New maintenance request raised for ${asset.name} (${asset.assetTag}) by ${newRequest.raisedByName}.`,
      'MAINTENANCE',
      'u2' // Rohan Mehta (Asset Manager)
    );
  };

  // 9. Update Maintenance (Asset Manager Only)
  const updateMaintenanceStatus = (
    requestId: string,
    status: MaintenanceRequest['status'],
    notes?: string,
    cost?: number,
    techId?: string
  ) => {
    const request = maintenanceRequests.find((r) => r.id === requestId);
    if (!request) return;

    const technician = users.find((u) => u.id === techId);

    const updatedMaint = maintenanceRequests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status,
          resolutionNotes: notes || r.resolutionNotes,
          cost: cost !== undefined ? cost : r.cost,
          technicianId: techId || r.technicianId,
          technicianName: technician ? technician.name : r.technicianName,
          resolvedAt: status === 'COMPLETED' || status === 'RESOLVED' ? new Date().toISOString().split('T')[0] : r.resolvedAt,
        };
      }
      return r;
    });

    // Automatically transition Asset state
    const updatedAssets = assets.map((a) => {
      if (a.id === request.assetId) {
        if (status === 'APPROVED' || status === 'IN_PROGRESS') {
          return { ...a, status: 'Under_Maintenance' as const };
        } else if (status === 'COMPLETED' || status === 'RESOLVED') {
          return { ...a, status: 'Available' as const }; // Reverts to Available on resolution
        }
      }
      return a;
    });

    setMaintenanceRequests(updatedMaint);
    setAssets(updatedAssets);

    // Fire-and-forget sync
    fetch(`/api/maintenance/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status === 'RESOLVED' ? 'COMPLETED' : status,
        resolutionNotes: notes,
        cost: cost !== undefined ? cost : undefined
      })
    }).catch(console.error);

    logAction(
      `Updated maintenance request for ${request.assetTag} to status ${status}`,
      'MAINTENANCE',
      requestId
    );

    // Notify the user who raised it
    if (request.raisedById) {
      pushNotification(
        'Maintenance Update',
        `Maintenance request status for ${request.assetName} is now ${status}.`,
        'MAINTENANCE',
        request.raisedById
      );
    }
  };

  // 10. Audit Cycle (Auditor / Admin Only)
  const createAuditCycle = (data: {
    name: string;
    startDate: string;
    endDate: string;
    departmentScope?: string;
    locationScope?: string;
    auditorIds: string[];
  }) => {
    const newCycleId = `au_${Date.now()}`;
    const auditors = users.filter((u) => data.auditorIds.includes(u.id)).map((u) => u.name);

    const newCycle: AuditCycle = {
      id: newCycleId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      departmentScope: data.departmentScope || null,
      locationScope: data.locationScope || null,
      status: 'OPEN',
      auditors,
    };

    // Auto-scope assets
    const scopedAssets = assets.filter((a) => {
      let match = true;
      if (data.departmentScope) {
        const alloc = allocations.find((al) => al.assetId === a.id && al.status === 'ACTIVE');
        match = match && alloc?.departmentName === data.departmentScope;
      }
      if (data.locationScope) {
        match = match && a.location === data.locationScope;
      }
      return match;
    });

    const newAuditItems: AuditItem[] = scopedAssets.map((a) => ({
      id: `ai_${Math.random().toString(36).substr(2, 9)}`,
      auditCycleId: newCycleId,
      assetId: a.id,
      assetTag: a.assetTag,
      assetName: a.name,
      expectedLocation: a.location,
      status: null, // Pending
    }));

    const updatedCycles = [newCycle, ...auditCycles];
    const updatedItems = [...newAuditItems, ...auditItems];

    setAuditCycles(updatedCycles);
    setAuditItems(updatedItems);

    saveToStorage('af_audits', updatedCycles);
    saveToStorage('af_audit_items', updatedItems);

    logAction(`Created audit cycle: ${newCycle.name}`, 'AUDIT', newCycleId);

    // Notify auditors
    data.auditorIds.forEach((auditorId) => {
      pushNotification(
        'Audit Cycle Assigned',
        `You have been assigned as auditor for ${newCycle.name}.`,
        'AUDIT',
        auditorId
      );
    });
  };

  const updateAuditItem = (itemId: string, status: 'VERIFIED' | 'MISSING' | 'DAMAGED', notes?: string) => {
    const updatedItems = auditItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          status,
          notes: notes || null,
          auditedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    setAuditItems(updatedItems);
    saveToStorage('af_audit_items', updatedItems);
  };

  const closeAuditCycle = (cycleId: string) => {
    const updatedCycles = auditCycles.map((c) =>
      c.id === cycleId ? { ...c, status: 'CLOSED' as const } : c
    );

    // Lock audit and transition affected asset states (e.g., mark Missing items as Lost)
    const itemsInCycle = auditItems.filter((item) => item.auditCycleId === cycleId);
    
    const updatedAssets = assets.map((a) => {
      const auditItem = itemsInCycle.find((item) => item.assetId === a.id);
      if (auditItem) {
        if (auditItem.status === 'MISSING') {
          return { ...a, status: 'Lost' as const };
        } else if (auditItem.status === 'DAMAGED') {
          return { ...a, condition: 'POOR' as const }; // Downgrade condition
        }
      }
      return a;
    });

    setAuditCycles(updatedCycles);
    setAssets(updatedAssets);

    saveToStorage('af_audits', updatedCycles);
    saveToStorage('af_assets', updatedAssets);

    logAction(`Closed audit cycle ${cycleId} and locked history`, 'AUDIT', cycleId);
  };

  const markNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveToStorage('af_notifications', updated);
  };

  const clearAllState = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Helper log action
  const logAction = (action: string, entityType: string, entityId: string) => {
    const newLog: ActivityLog = {
      id: `l_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System',
      action,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    saveToStorage('af_logs', updated);
  };

  // Helper push notification
  const pushNotification = (title: string, message: string, type: string, targetUserId: string) => {
    const newNotif: Notification = {
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: targetUserId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveToStorage('af_notifications', updated);

    // Dynamic notification badge trigger / toast alert
    if (typeof window !== 'undefined' && targetUserId === currentUser?.id) {
      const event = new CustomEvent('af_toast', { detail: { title, message, type } });
      window.dispatchEvent(event);
    }

    // Server-side Slack dispatch with Redis rate-limiting
    if (typeof window !== 'undefined') {
      let priority = 'INFO';
      if (type === 'ALERT') priority = 'HIGH';
      if (title.toLowerCase().includes('critical') || message.toLowerCase().includes('critical') || message.toLowerCase().includes('missing')) {
        priority = 'CRITICAL';
      }

      fetch('/api/slack-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, priority })
      })
      .then(async (res) => {
        if (!res.ok && res.status === 429) {
          const data = await res.json();
          // Dispatch custom toast warning about Redis rate limit
          const limitEvent = new CustomEvent('af_toast', {
            detail: {
              title: 'Slack Rate Limited',
              message: data.error || 'Rate limit exceeded.',
              type: 'ALERT'
            }
          });
          window.dispatchEvent(limitEvent);
        }
      })
      .catch((err) => console.error('Slack alert dispatch failed:', err));
    }
  };

  if (!initialized) {
    return null;
  }

  return (
    <StateContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        departments,
        categories,
        assets,
        allocations,
        transferRequests,
        bookings,
        maintenanceRequests,
        auditCycles,
        auditItems,
        logs,
        notifications,
        
        promoteEmployee,
        registerAsset,
        allocateAsset,
        requestTransfer,
        approveTransfer,
        returnAsset,
        bookResource,
        cancelBooking,
        raiseMaintenance,
        updateMaintenanceStatus,
        createAuditCycle,
        updateAuditItem,
        closeAuditCycle,
        markNotificationsRead,
        clearAllState,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}
