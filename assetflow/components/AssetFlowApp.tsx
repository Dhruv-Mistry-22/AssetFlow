'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useAppState } from '../context/StateContext';
import { 
  seedUsers, 
  User, 
  Asset, 
  Department, 
  AssetCategory, 
  Allocation, 
  Booking, 
  MaintenanceRequest, 
  AuditCycle, 
  AuditItem 
} from '../lib/mockData';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  FileSpreadsheet,
  CalendarDays,
  Wrench,
  ShieldCheck,
  BarChart3,
  Bell,
  LogOut,
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileDown,
  UserCheck,
  RefreshCw,
  QrCode,
  Check,
  X,
  History,
  AlertCircle
} from 'lucide-react';

type TabType = 
  | 'dashboard'
  | 'org-setup'
  | 'assets'
  | 'allocation'
  | 'booking'
  | 'maintenance'
  | 'audit'
  | 'reports'
  | 'logs';

export default function AssetFlowApp() {
  const {
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
    clearAllState
  } = useAppState();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  
  // Real-time Notification Toast State
  const [toast, setToast] = useState<{ title: string; message: string; type: string } | null>(null);

  // Modal / Form States
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Input States
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ asset: Asset; currentHolder: string } | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string>('');

  // Search & Filter States
  const [assetSearch, setAssetSearch] = useState('');
  const [assetCatFilter, setAssetCatFilter] = useState('ALL');
  const [assetStatusFilter, setAssetStatusFilter] = useState('ALL');

  // Register Form State
  const [newAssetData, setNewAssetData] = useState({
    name: '',
    serialNumber: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    condition: 'NEW' as Asset['condition'],
    location: '',
    isBookable: false,
    categoryId: ''
  });

  // Allocation Form State
  const [allocData, setAllocData] = useState({
    assetId: '',
    userId: '',
    departmentId: '',
    expectedReturnDate: '',
    mode: 'employee' as 'employee' | 'department'
  });

  // Transfer Request State
  const [transferData, setTransferData] = useState({
    allocationId: '',
    toUserId: '',
    reason: ''
  });

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    assetId: '',
    startTime: '',
    endTime: ''
  });
  const [bookingConflictMsg, setBookingConflictMsg] = useState<string | null>(null);
  const [bookingRecs, setBookingRecs] = useState<{
    nextSlot: { startTime: string; endTime: string };
    alternativeResources: { id: string; name: string; tag: string }[];
  } | null>(null);

  // Maintenance Form State
  const [maintData, setMaintData] = useState({
    assetId: '',
    description: '',
    priority: 'MEDIUM' as MaintenanceRequest['priority']
  });

  // Audit Form State
  const [newAuditData, setNewAuditData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    departmentScope: '',
    locationScope: '',
    auditorIds: [] as string[]
  });

  // Promotion Form State
  const [promotionData, setPromotionData] = useState({
    userId: '',
    role: 'EMPLOYEE' as User['role'],
    departmentId: ''
  });
  const [promoModalOpen, setPromoModalOpen] = useState(false);

  // Monitor custom toast events
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast(customEvent.detail);
      setTimeout(() => {
        setToast(null);
      }, 5000);
    };

    window.addEventListener('af_toast', handleToast);
    return () => {
      window.removeEventListener('af_toast', handleToast);
    };
  }, []);

  // Generate QR Code for Modal
  const showQrCode = (asset: Asset) => {
    setSelectedAsset(asset);
    QRCode.toDataURL(asset.assetTag, { width: 250, margin: 2 }, (err, url) => {
      if (!err) {
        setGeneratedQr(url);
        setQrModalOpen(true);
      }
    });
  };

  // Close Audit Cycle Action
  const handleCloseAudit = (cycleId: string) => {
    closeAuditCycle(cycleId);
    showToast('Audit Cycle Closed', 'Locked audit cycle and transitioned missing assets to Lost.', 'AUDIT');
  };

  // Download QR Code image
  const downloadQr = () => {
    if (!selectedAsset || !generatedQr) return;
    const link = document.createElement('a');
    link.href = generatedQr;
    link.download = `QR_${selectedAsset.assetTag}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Exporter for Department Allocation Summary
  const handleExportExcel = () => {
    // Generate allocation summary per department
    const summaryData = departments.map((d) => {
      const deptAssets = assets.filter((a) => {
        const activeAlloc = allocations.find((al) => al.assetId === a.id && al.status === 'ACTIVE');
        return activeAlloc?.departmentId === d.id || 
               (activeAlloc?.userId && users.find((u) => u.id === activeAlloc.userId)?.departmentId === d.id);
      });

      const totalCost = deptAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);

      return {
        'Department Name': d.name,
        'Status': d.status,
        'Head of Department': d.headName || 'Not Assigned',
        'Allocated Assets Count': deptAssets.length,
        'Total Cost of Assets ($)': totalCost
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Department Allocation');
    XLSX.writeFile(workbook, 'Department_Asset_Allocation_Summary.xlsx');

    showToast('Excel Exported', 'Department allocation summary report downloaded.', 'ALERT');
  };

  // PDF Exporter for Reports Dashboard using programmatic jspdf-autotable
  const handleExportPDF = () => {
    // Gather same department summary data
    const summaryData = departments.map((d) => {
      const deptAssets = assets.filter((a) => {
        const activeAlloc = allocations.find((al) => al.assetId === a.id && al.status === 'ACTIVE');
        return activeAlloc?.departmentId === d.id || 
               (activeAlloc?.userId && users.find((u) => u.id === activeAlloc.userId)?.departmentId === d.id);
      });

      const totalCost = deptAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);

      return {
        name: d.name,
        status: d.status,
        head: d.headName || 'Not Assigned',
        count: deptAssets.length,
        cost: totalCost
      };
    });

    // Initialize jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Document Branding & Header
    pdf.setFillColor(15, 23, 42); // bg-slate-900 (#0f172a)
    pdf.rect(0, 0, 210, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('AssetFlow ERP System', 14, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('EXECUTIVE REPORTS CENTER', 14, 25);
    pdf.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Report Metadata Title
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Department Asset Allocation Summary', 14, 52);

    // Draw a thin accent line
    pdf.setDrawColor(226, 232, 240); // border-slate-200
    pdf.line(14, 55, 196, 55);

    // Draw the vector Table using jspdf-autotable
    const tableHeaders = [['Department Name', 'Status', 'Head of Department', 'Allocated Assets Count', 'Total Cost of Assets']];
    const tableRows = summaryData.map(d => [
      d.name,
      d.status,
      d.head,
      d.count.toString(),
      `$${d.cost.toLocaleString()}`
    ]);

    // Add summary row
    const totalCount = summaryData.reduce((sum, d) => sum + d.count, 0);
    const totalCostSum = summaryData.reduce((sum, d) => sum + d.cost, 0);
    tableRows.push([
      'TOTAL SUMMARY',
      '-',
      '-',
      totalCount.toString(),
      `$${totalCostSum.toLocaleString()}`
    ]);

    autoTable(pdf, {
      startY: 60,
      head: tableHeaders,
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      columnStyles: {
        3: { halign: 'right' }, // count
        4: { halign: 'right' }  // cost
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      didParseCell: (data: any) => {
        // Highlight totals row
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // bg-slate-100
        }
      }
    });

    // Save the document
    pdf.save('AssetFlow_Department_Allocation_Summary.pdf');
    showToast('PDF Exported', 'Department allocation summary report downloaded.', 'ALERT');
  };

  // Switch demo roles
  const handleRoleChange = (role: User['role']) => {
    const matchedUser = users.find((u) => u.role === role);
    if (matchedUser) {
      setCurrentUser(matchedUser);
      setRoleMenuOpen(false);
      showToast('Switched User Role', `Now simulating system as ${matchedUser.name} (${role})`, 'ALERT');
    }
  };

  const showToast = (title: string, message: string, type: string) => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Allocation Submission
  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocData.assetId) return;

    const res = allocateAsset(
      allocData.assetId,
      allocData.mode === 'employee' ? allocData.userId : null,
      allocData.mode === 'department' ? allocData.departmentId : null,
      allocData.expectedReturnDate
    );

    if (res.success) {
      setAllocateModalOpen(false);
      showToast('Allocation Successful', 'Asset was successfully allocated.', 'ALLOCATION');
      // Reset form
      setAllocData({ assetId: '', userId: '', departmentId: '', expectedReturnDate: '', mode: 'employee' });
    } else {
      // Conflict Modal trigger (Polished Conflict UX Differentiator)
      if (res.currentHolder) {
        const conflictAsset = assets.find((a) => a.id === allocData.assetId);
        if (conflictAsset) {
          setConflictInfo({ asset: conflictAsset, currentHolder: res.currentHolder });
          setConflictModalOpen(true);
        }
      } else {
        alert(res.error);
      }
    }
  };

  // Submit transfer request from conflict modal
  const handleConflictTransferRequest = () => {
    if (!conflictInfo) return;
    const activeAlloc = allocations.find((al) => al.assetId === conflictInfo.asset.id && al.status === 'ACTIVE');
    if (activeAlloc) {
      requestTransfer(activeAlloc.id, currentUser?.id || 'u4', 'Auto-requested transfer due to allocation conflict.');
      setConflictModalOpen(false);
      setAllocateModalOpen(false);
      showToast('Transfer Requested', `Transfer request sent to current holder: ${conflictInfo.currentHolder}`, 'TRANSFER');
    }
  };

  // Submit booking and check overlap
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.assetId || !bookingData.startTime || !bookingData.endTime) return;

    const res = bookResource(
      bookingData.assetId,
      currentUser?.id || 'u4',
      bookingData.startTime,
      bookingData.endTime
    );

    if (res.success) {
      setBookingData({ assetId: '', startTime: '', endTime: '' });
      setBookingConflictMsg(null);
      setBookingRecs(null);
      showToast('Resource Booked', 'Successfully scheduled room booking.', 'BOOKING');
    } else {
      setBookingConflictMsg(res.error || 'Conflict detected.');
      if (res.recommendations) {
        setBookingRecs(res.recommendations);
      } else {
        setBookingRecs(null);
      }
    }
  };

  // Seed check-in return note
  const [returnNotes, setReturnNotes] = useState('');
  const [returnAssetId, setReturnAssetId] = useState('');
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    returnAsset(returnAssetId, returnNotes);
    setReturnModalOpen(false);
    setReturnNotes('');
    showToast('Asset Returned', 'Asset is now Available in directory.', 'ALLOCATION');
  };

  // Filter assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch = 
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase());
      
    const matchesCategory = assetCatFilter === 'ALL' || a.categoryId === assetCatFilter;
    const matchesStatus = assetStatusFilter === 'ALL' || a.status === assetStatusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Real-time Notification Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 w-96 p-4 rounded-xl border border-blue-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-100">{toast.title}</h4>
            <p className="text-xs text-slate-400 mt-1">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
            AF
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AssetFlow
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">ERP Resource</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          {/* Org Setup (Admin Only) */}
          {(currentUser?.role === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('org-setup')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'org-setup' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 size={18} />
              Organization Setup
            </button>
          )}

          <button
            onClick={() => setActiveTab('assets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'assets' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderTree size={18} />
            Assets Directory
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'allocation' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ArrowRightLeft size={18} />
            Allocations & Transfers
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'booking' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CalendarDays size={18} />
            Resource Bookings
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'maintenance' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wrench size={18} />
            Maintenance
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'audit' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck size={18} />
            Asset Audit
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'reports' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 size={18} />
            Reports & Analytics
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet size={18} />
            Activity Logs
          </button>
        </nav>

        {/* Demo Controls - Role Simulator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">
              Simulate Role
            </span>
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    currentUser?.role === 'ADMIN' ? 'bg-red-500' :
                    currentUser?.role === 'ASSET_MANAGER' ? 'bg-orange-500' :
                    currentUser?.role === 'DEPARTMENT_HEAD' ? 'bg-indigo-500' : 'bg-green-500'
                  }`} />
                  {currentUser?.name} ({currentUser?.role})
                </div>
                <RefreshCw size={12} className="text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-20 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl p-1 space-y-0.5">
                  {(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] as User['role'][]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold transition-colors ${
                        currentUser?.role === r 
                          ? 'bg-blue-600/10 text-blue-400' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={clearAllState}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 border border-dashed border-red-500/30 hover:bg-red-500/5 text-red-400 rounded-lg transition-colors font-medium"
          >
            Reset Seed Data
          </button>
        </div>
      </aside>

      {/* Main Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-400">Current Scope:</span>
            <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
              Global Organization
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Menu */}
            <div className="relative">
              <button 
                onClick={() => {
                  setNotifMenuOpen(!notifMenuOpen);
                  markNotificationsRead();
                }}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 transition-all"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[9px] font-bold text-white">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 z-20 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-semibold text-xs text-slate-200">Alert Center</h3>
                    <button onClick={() => setNotifMenuOpen(false)} className="text-slate-500 hover:text-slate-300">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No recent notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 transition-colors">
                          <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              n.type === 'ALERT' ? 'bg-red-500' :
                              n.type === 'TRANSFER' ? 'bg-purple-500' : 'bg-blue-500'
                            }`} />
                            {n.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-slate-600 block mt-1.5">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-semibold text-sm text-blue-400">
                {currentUser?.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{currentUser?.role.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: "/" })} 
                className="ml-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Tab Router */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 max-w-[1400px] w-full mx-auto">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">System Dashboard</h2>
                  <p className="text-xs text-slate-400 mt-1">Real-time status snapshot of assets, resource bookings, and active maintenance.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setAllocateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg shadow-lg shadow-blue-600/10 transition-all"
                  >
                    <ArrowRightLeft size={14} />
                    Allocate Asset
                  </button>
                  <button 
                    onClick={() => setRegisterModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-xs text-slate-200 rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Register Asset
                  </button>
                </div>
              </div>

              {/* Overdue Items Banner */}
              {assets.some(a => allocations.some(al => al.assetId === a.id && al.status === 'ACTIVE' && al.expectedReturnDate && new Date(al.expectedReturnDate) < new Date())) && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">
                  <AlertCircle size={20} className="text-red-400 shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-bold">Overdue Return Warning:</span> There are currently assets held past their expected return dates. See the logs or allocation history.
                  </div>
                  <button 
                    onClick={() => setActiveTab('allocation')}
                    className="text-xs font-bold underline hover:text-white"
                  >
                    View Overdues
                  </button>
                </div>
              )}

              {/* KPI Ribbon */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Available Assets</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{assets.filter(a => a.status === 'Available').length}</span>
                    <span className="text-xs text-green-500 font-bold">In Depot</span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Allocated Assets</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{assets.filter(a => a.status === 'Allocated').length}</span>
                    <span className="text-xs text-blue-500 font-bold">In Use</span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Active Bookings</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{bookings.filter(b => b.status === 'UPCOMING' || b.status === 'ONGOING').length}</span>
                    <span className="text-xs text-indigo-500 font-bold">Upcoming</span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Under Repair</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{assets.filter(a => a.status === 'Under_Maintenance').length}</span>
                    <span className="text-xs text-yellow-500 font-bold">Maintenance</span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Audit Discrepancies</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{auditItems.filter(ai => ai.status === 'MISSING' || ai.status === 'DAMAGED').length}</span>
                    <span className="text-xs text-red-500 font-bold">Flagged</span>
                  </div>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <History size={16} className="text-blue-500" />
                    Recent Operations Log
                  </h3>
                  <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-4 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition-colors">
                        <div className="w-1.5 bg-blue-600 rounded-full" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-200 font-medium">{log.action}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-500">By {log.userName}</span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <span className="text-[10px] text-slate-600">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overdue & Alerts Panel */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    Attention Items
                  </h3>
                  <div className="space-y-3">
                    {allocations
                      .filter((al) => al.status === 'ACTIVE' && al.expectedReturnDate && new Date(al.expectedReturnDate) < new Date())
                      .map((al) => (
                        <div key={al.id} className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-slate-200">{al.assetName} ({al.assetTag})</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Held by {al.userName || al.departmentName}</p>
                            <p className="text-[9px] text-red-400 font-semibold mt-1.5">
                              Overdue since: {al.expectedReturnDate}
                            </p>
                          </div>
                        </div>
                    ))}
                    {allocations.filter((al) => al.status === 'ACTIVE' && al.expectedReturnDate && new Date(al.expectedReturnDate) < new Date()).length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-8">All active allocations within due date</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION SETUP (ADMIN ONLY) */}
          {activeTab === 'org-setup' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Organization Master Data</h2>
                  <p className="text-xs text-slate-400 mt-1">Manage corporate hierarchy, employee roles, and custom asset categories.</p>
                </div>
                <button 
                  onClick={() => setPromoModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg transition-all"
                >
                  <UserCheck size={14} />
                  Simulate Role Promotion
                </button>
              </div>

              {/* Tab Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Department Hierarchy */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Department Directory</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                          <th className="py-3">Name</th>
                          <th className="py-3">Department Head</th>
                          <th className="py-3">Parent Dept</th>
                          <th className="py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {departments.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 font-bold text-slate-200">{d.name}</td>
                            <td className="py-3.5 text-slate-300">{d.headName || '--'}</td>
                            <td className="py-3.5 text-slate-400">{d.parentDepartmentName || '--'}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                d.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Categories & Schema definitions */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Asset Categories</h3>
                  <div className="space-y-4">
                    {categories.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-2">
                        <h4 className="font-bold text-xs text-slate-200">{c.name}</h4>
                        <div className="text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-400">Custom Fields:</span>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {c.customFields?.map((cf: any, idx: number) => (
                              <li key={idx}>
                                {cf.name} ({cf.type}) {cf.required && <span className="text-red-400">*</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Employee Directory list */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">Employee Directory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Name</th>
                        <th className="py-3">Email</th>
                        <th className="py-3">Assigned Department</th>
                        <th className="py-3">System Role</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {users.map((u) => {
                        const dept = departments.find((d) => d.id === u.departmentId);
                        return (
                          <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 font-bold text-slate-200">{u.name}</td>
                            <td className="py-3.5 text-slate-400">{u.email}</td>
                            <td className="py-3.5 text-slate-300">{dept ? dept.name : 'Unassigned'}</td>
                            <td className="py-3.5 font-semibold text-blue-400">{u.role}</td>
                            <td className="py-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400">
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSET DIRECTORY */}
          {activeTab === 'assets' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Assets Registry</h2>
                  <p className="text-xs text-slate-400 mt-1">Search, register, and inspect physical corporate assets and print QR codes.</p>
                </div>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                  <button 
                    onClick={() => setRegisterModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Register New Asset
                  </button>
                )}
              </div>

              {/* Filters Panel */}
              <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search by tag, name, or serial number..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div className="flex gap-4">
                  <select
                    value={assetCatFilter}
                    onChange={(e) => setAssetCatFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-300 font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={assetStatusFilter}
                    onChange={(e) => setAssetStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-300 font-medium"
                  >
                    <option value="ALL">All States</option>
                    <option value="Available">Available</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Under_Maintenance">Under Maintenance</option>
                    <option value="Lost">Lost</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>

              {/* Asset Grid Table */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Asset Tag</th>
                        <th className="py-3">Name</th>
                        <th className="py-3">Category</th>
                        <th className="py-3">Condition</th>
                        <th className="py-3">Location</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Holder</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {filteredAssets.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 font-bold text-blue-400 flex items-center gap-2">
                            <span className="p-1 rounded bg-blue-500/10 text-blue-400">
                              <QrCode size={12} />
                            </span>
                            {a.assetTag}
                          </td>
                          <td className="py-3.5 font-semibold text-slate-200">{a.name}</td>
                          <td className="py-3.5 text-slate-400">{a.categoryName}</td>
                          <td className="py-3.5 text-slate-300">{a.condition}</td>
                          <td className="py-3.5 text-slate-300">{a.location}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              a.status === 'Available' ? 'bg-green-500/10 text-green-400' :
                              a.status === 'Allocated' ? 'bg-blue-500/10 text-blue-400' :
                              a.status === 'Under_Maintenance' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {a.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-400">{a.currentHolderName || '--'}</td>
                          <td className="py-3.5 text-right space-x-2">
                            <button
                              onClick={() => showQrCode(a)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded border border-slate-700"
                            >
                              Show QR
                            </button>
                            {a.status === 'Allocated' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                              <button
                                onClick={() => {
                                  setReturnAssetId(a.id);
                                  setReturnModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-red-400 rounded border border-red-500/20"
                              >
                                Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALLOCATION & TRANSFER */}
          {activeTab === 'allocation' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Allocation & Transfers</h2>
                  <p className="text-xs text-slate-400 mt-1">Allocate available assets or approve peer-to-peer transfer requests.</p>
                </div>
              </div>

              {/* Transfer Requests List */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-indigo-500" />
                  Peer-to-Peer Transfer Requests
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Asset</th>
                        <th className="py-3">From Holder</th>
                        <th className="py-3">To Recipient</th>
                        <th className="py-3">Reason</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {transferRequests.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 font-bold text-slate-200">{tr.assetName} ({tr.assetTag})</td>
                          <td className="py-3.5 text-slate-300">{tr.fromUserName}</td>
                          <td className="py-3.5 text-slate-300">{tr.toUserName}</td>
                          <td className="py-3.5 text-slate-400 max-w-xs truncate">{tr.reason}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              tr.status === 'REQUESTED' ? 'bg-yellow-500/10 text-yellow-400' :
                              tr.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {tr.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            {tr.status === 'REQUESTED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER' || currentUser?.name === tr.fromUserName) && (
                              <button
                                onClick={() => approveTransfer(tr.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white rounded shadow"
                              >
                                Approve Transfer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {transferRequests.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">No active transfer requests</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allocations History */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">Active Allocations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Asset</th>
                        <th className="py-3">Assigned To</th>
                        <th className="py-3">Department</th>
                        <th className="py-3">Allocated Date</th>
                        <th className="py-3">Due Date</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {allocations.map((al) => {
                        const isOverdue = al.status === 'ACTIVE' && al.expectedReturnDate && new Date(al.expectedReturnDate) < new Date();
                        return (
                          <tr key={al.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 font-bold text-slate-200">{al.assetName} ({al.assetTag})</td>
                            <td className="py-3.5 text-slate-300">{al.userName || 'Unassigned'}</td>
                            <td className="py-3.5 text-slate-400">{al.departmentName || '--'}</td>
                            <td className="py-3.5 text-slate-300">{al.allocatedAt}</td>
                            <td className={`py-3.5 font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-300'}`}>
                              {al.expectedReturnDate || 'Permanent'}
                              {isOverdue && <span className="text-[9px] block text-red-500">OVERDUE</span>}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                al.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {al.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {al.status === 'ACTIVE' && (
                                <button
                                  onClick={() => {
                                    setTransferData({ ...transferData, allocationId: al.id });
                                    setTransferModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-indigo-400 rounded border border-indigo-500/20"
                                >
                                  Transfer
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RESOURCE BOOKING */}
          {activeTab === 'booking' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Resource Bookings</h2>
                  <p className="text-xs text-slate-400 mt-1">Book shared resources (meeting rooms, projectors, company cars) with overlap validation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Booking Form with Overlap checks */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Schedule Time Slot</h3>
                  <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Resource</label>
                      <select
                        required
                        value={bookingData.assetId}
                        onChange={(e) => setBookingData({ ...bookingData, assetId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                      >
                        <option value="">Choose asset...</option>
                        {assets.filter(a => a.isBookable).map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingData.startTime}
                        onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingData.endTime}
                        onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                      />
                    </div>

                    {bookingConflictMsg && (
                      <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 font-medium space-y-3">
                        <p>{bookingConflictMsg}</p>
                        
                        {bookingRecs && (
                          <div className="border-t border-red-500/10 pt-2.5 mt-2 space-y-2.5 text-xs">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                              System Recommendations:
                            </span>
                            
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-400 font-bold">Closest Available Slot (Same Resource):</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingData({
                                    ...bookingData,
                                    startTime: bookingRecs.nextSlot.startTime,
                                    endTime: bookingRecs.nextSlot.endTime
                                  });
                                  setBookingConflictMsg(null);
                                  setBookingRecs(null);
                                }}
                                className="w-full text-left p-2 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors font-semibold"
                              >
                                {new Date(bookingRecs.nextSlot.startTime).toLocaleString()} ➔ {new Date(bookingRecs.nextSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </button>
                            </div>

                            {bookingRecs.alternativeResources.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-400 font-bold">Alternative Resources (Same Category):</p>
                                <div className="space-y-1.5">
                                  {bookingRecs.alternativeResources.map((alt) => (
                                    <button
                                      key={alt.id}
                                      type="button"
                                      onClick={() => {
                                        setBookingData({
                                          ...bookingData,
                                          assetId: alt.id
                                        });
                                        setBookingConflictMsg(null);
                                        setBookingRecs(null);
                                      }}
                                      className="w-full text-left p-2 rounded bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition-colors font-semibold"
                                    >
                                      Switch to {alt.name} ({alt.tag})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow-lg shadow-blue-600/10 transition-colors"
                    >
                      Book Slot
                    </button>
                  </form>
                </div>

                {/* Booking Timeline Grid */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Existing Calendar Bookings</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                          <th className="py-3">Resource</th>
                          <th className="py-3">Booked By</th>
                          <th className="py-3">Start</th>
                          <th className="py-3">End</th>
                          <th className="py-3">Status</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 font-bold text-slate-200">{b.assetName}</td>
                            <td className="py-3.5 text-slate-300">{b.userName}</td>
                            <td className="py-3.5 text-slate-400">{new Date(b.startTime).toLocaleString()}</td>
                            <td className="py-3.5 text-slate-400">{new Date(b.endTime).toLocaleString()}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                b.status === 'UPCOMING' ? 'bg-blue-500/10 text-blue-400' :
                                b.status === 'ONGOING' ? 'bg-indigo-500/10 text-indigo-400' :
                                b.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {b.status === 'UPCOMING' && (currentUser?.name === b.userName || currentUser?.role === 'ADMIN') && (
                                <button
                                  onClick={() => cancelBooking(b.id)}
                                  className="px-2 py-1 hover:bg-red-500/10 text-[10px] font-bold text-red-400 rounded border border-red-500/20"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {bookings.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500">No active bookings scheduled</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MAINTENANCE KANBAN BOARD */}
          {activeTab === 'maintenance' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Maintenance Pipeline</h2>
                  <p className="text-xs text-slate-400 mt-1">Route repairs through approval boards. Approving transitions assets to Under Maintenance.</p>
                </div>
                <button
                  onClick={() => setMaintModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg transition-all"
                >
                  <Plus size={14} />
                  Raise Maintenance Ticket
                </button>
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                
                {/* Column 1: Pending */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
                    Pending ({maintenanceRequests.filter(r => r.status === 'PENDING').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'PENDING').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-blue-400">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-200">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2">{r.description}</p>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMaintenanceStatus(r.id, 'APPROVED')}
                              className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-[9px] font-bold text-white rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateMaintenanceStatus(r.id, 'REJECTED')}
                              className="py-1 px-2 hover:bg-red-500/10 text-[9px] font-bold text-red-400 rounded border border-red-500/20"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Approved */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
                    Approved ({maintenanceRequests.filter(r => r.status === 'APPROVED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'APPROVED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-blue-400">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-200">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-400">{r.description}</p>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                          <button
                            onClick={() => updateMaintenanceStatus(r.id, 'TECHNICIAN_ASSIGNED', undefined, undefined, 'u6')}
                            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-[9px] font-bold text-white rounded transition-colors"
                          >
                            Assign Tech (Varma)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Assigned */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
                    Assigned ({maintenanceRequests.filter(r => r.status === 'TECHNICIAN_ASSIGNED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'TECHNICIAN_ASSIGNED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-blue-400">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-200">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-400">Assignee: <span className="text-slate-300 font-semibold">{r.technicianName}</span></p>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER' || currentUser?.id === r.technicianId) && (
                          <button
                            onClick={() => updateMaintenanceStatus(r.id, 'IN_PROGRESS')}
                            className="w-full py-1 bg-yellow-600 hover:bg-yellow-700 text-[9px] font-bold text-white rounded transition-colors"
                          >
                            Start Repair
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 4: In Progress */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
                    In Progress ({maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-blue-400">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-200">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-400">Tech: {r.technicianName}</p>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER' || currentUser?.id === r.technicianId) && (
                          <button
                            onClick={() => updateMaintenanceStatus(r.id, 'RESOLVED', 'Completed structural check', 150)}
                            className="w-full py-1 bg-green-600 hover:bg-green-700 text-[9px] font-bold text-white rounded transition-colors"
                          >
                            Mark Resolved ($150)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 5: Resolved */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
                    Resolved ({maintenanceRequests.filter(r => r.status === 'RESOLVED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'RESOLVED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 opacity-70 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-slate-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400">RESOLVED</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-300">{r.assetName}</h4>
                        <p className="text-[9px] text-slate-500">Cost: ${r.cost || 0} • resolved {r.resolvedAt}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: STRUCTURED AUDIT CYCLES */}
          {activeTab === 'audit' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Structured Asset Audit</h2>
                  <p className="text-xs text-slate-400 mt-1">Scope audit cycles, assign auditors, and auto-generate discrepancy reports.</p>
                </div>
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => setAuditModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Schedule Audit Cycle
                  </button>
                )}
              </div>

              {/* Active Audit Cycles lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* List of cycles */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Audit Cycles</h3>
                  <div className="space-y-4">
                    {auditCycles.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-slate-200">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.status === 'OPEN' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-1">
                          <p>Auditors: {c.auditors.join(', ')}</p>
                          <p>Scope: {c.departmentScope ? `Dept: ${c.departmentScope}` : ''} {c.locationScope ? `Loc: ${c.locationScope}` : ''}</p>
                          <p>Duration: {c.startDate} to {c.endDate}</p>
                        </div>
                        {c.status === 'OPEN' && (currentUser?.role === 'ADMIN' || c.auditors.includes(currentUser?.name || '')) && (
                          <button
                            onClick={() => handleCloseAudit(c.id)}
                            className="w-full py-1.5 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-[10px] font-bold text-red-400 rounded transition-colors"
                          >
                            Close Cycle & Lock Assets
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Checklist & Items */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Verification Checklist</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                          <th className="py-3">Asset</th>
                          <th className="py-3">Expected Location</th>
                          <th className="py-3">Verification</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {auditItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3.5 font-bold text-slate-200">{item.assetName} ({item.assetTag})</td>
                            <td className="py-3.5 text-slate-400">{item.expectedLocation}</td>
                            <td className="py-3.5">
                              {item.status ? (
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  item.status === 'VERIFIED' ? 'bg-green-500/10 text-green-400' :
                                  item.status === 'MISSING' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'
                                }`}>
                                  {item.status}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[10px]">Unchecked</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right space-x-1.5">
                              {/* Action buttons to mark verified/missing/damaged */}
                              {(!item.status || auditCycles.find(c => c.id === item.auditCycleId)?.status === 'OPEN') && (
                                <>
                                  <button
                                    onClick={() => updateAuditItem(item.id, 'VERIFIED')}
                                    className="px-2 py-0.5 bg-green-600/10 text-green-400 hover:bg-green-600/20 text-[9px] font-bold rounded border border-green-500/20"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => updateAuditItem(item.id, 'MISSING')}
                                    className="px-2 py-0.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 text-[9px] font-bold rounded border border-red-500/20"
                                  >
                                    Missing
                                  </button>
                                  <button
                                    onClick={() => updateAuditItem(item.id, 'DAMAGED')}
                                    className="px-2 py-0.5 bg-orange-600/10 text-orange-400 hover:bg-orange-600/20 text-[9px] font-bold rounded border border-orange-500/20"
                                  >
                                    Damage
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 8: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Reports & Insights</h2>
                  <p className="text-xs text-slate-400 mt-1">Export raw reports or review usage, maintenance, and asset statistics.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg shadow-lg shadow-blue-600/10 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    Export Allocations (Excel)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 font-semibold text-xs text-white rounded-lg shadow-lg shadow-purple-600/10 transition-all"
                  >
                    <FileDown size={14} />
                    Export Executive Summary (PDF)
                  </button>
                </div>
              </div>

              {/* Wrap container to export to PDF cleanly */}
              <div id="reports-page-content" className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-8">
                {/* Metrics visual summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Utilization list */}
                  <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                    <h3 className="font-bold text-sm text-slate-200">Department Asset Counts</h3>
                    <div className="space-y-3.5">
                      {departments.map((d) => {
                        const count = assets.filter((a) => {
                          const activeAlloc = allocations.find((al) => al.assetId === a.id && al.status === 'ACTIVE');
                          return activeAlloc?.departmentId === d.id || 
                                 (activeAlloc?.userId && users.find((u) => u.id === activeAlloc.userId)?.departmentId === d.id);
                        }).length;
                        return (
                          <div key={d.id} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-300">{d.name}</span>
                              <span className="text-slate-400">{count} active assets</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.min(count * 8, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Most Used & Idle lists */}
                  <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-200 uppercase tracking-widest text-slate-400">Most Booked shared Resources</h4>
                      <div className="text-xs space-y-2 text-slate-300">
                        <div className="flex justify-between p-2 rounded bg-slate-900/40">
                          <span>Conference Room B2</span>
                          <span className="font-bold text-blue-400">34 Bookings</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-900/40">
                          <span>Projector AF-0062</span>
                          <span className="font-bold text-blue-400">18 Bookings</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-200 uppercase tracking-widest text-slate-400">Flagged Idle Assets (60+ days unused)</h4>
                      <div className="text-xs space-y-2 text-slate-300">
                        <div className="flex justify-between p-2 rounded border border-yellow-500/20 bg-yellow-500/5">
                          <span>Camera AF-0301</span>
                          <span className="font-bold text-yellow-400">60 days idle</span>
                        </div>
                        <div className="flex justify-between p-2 rounded border border-yellow-500/20 bg-yellow-500/5">
                          <span>Ergonomic Chair AF-0410</span>
                          <span className="font-bold text-yellow-400">45 days idle</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DETAILED LOGS & NOTIFICATIONS */}
          {activeTab === 'logs' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">System Audit logs</h2>
                  <p className="text-xs text-slate-400 mt-1">Full immutable timeline tracking employee and admin actions.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Timestamp</th>
                        <th className="py-3">User</th>
                        <th className="py-3">Action Details</th>
                        <th className="py-3">Entity Group</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {logs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="py-3.5 font-semibold text-slate-300">{l.userName}</td>
                          <td className="py-3.5 text-slate-200">{l.action}</td>
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400">
                              {l.entityType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL WINDOWS & SLIDE OVERS */}
      {/* ============================================================== */}

      {/* Modal 1: Register Asset */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Register Asset</h3>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                registerAsset({
                  name: newAssetData.name,
                  serialNumber: newAssetData.serialNumber,
                  acquisitionDate: newAssetData.acquisitionDate,
                  acquisitionCost: parseFloat(newAssetData.acquisitionCost) || 0,
                  condition: newAssetData.condition,
                  location: newAssetData.location,
                  isBookable: newAssetData.isBookable,
                  categoryId: newAssetData.categoryId
                });
                setRegisterModalOpen(false);
                showToast('Asset Registered', `Created new record with auto tag.`, 'ALERT');
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={newAssetData.name}
                    onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={newAssetData.serialNumber}
                    onChange={(e) => setNewAssetData({ ...newAssetData, serialNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Acquisition Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={newAssetData.acquisitionCost}
                    onChange={(e) => setNewAssetData({ ...newAssetData, acquisitionCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={newAssetData.acquisitionDate}
                    onChange={(e) => setNewAssetData({ ...newAssetData, acquisitionDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Condition</label>
                  <select
                    value={newAssetData.condition}
                    onChange={(e) => setNewAssetData({ ...newAssetData, condition: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Category</label>
                  <select
                    required
                    value={newAssetData.categoryId}
                    onChange={(e) => setNewAssetData({ ...newAssetData, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="">Choose category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Location / Site</label>
                <input
                  type="text"
                  required
                  value={newAssetData.location}
                  onChange={(e) => setNewAssetData({ ...newAssetData, location: e.target.value })}
                  placeholder="e.g. Warehouse, Bengaluru, HQ Floor 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/40">
                <input
                  type="checkbox"
                  id="isBookable"
                  checked={newAssetData.isBookable}
                  onChange={(e) => setNewAssetData({ ...newAssetData, isBookable: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="isBookable" className="font-semibold text-slate-300">Mark as shared bookable resource (meeting room, projector, etc.)</label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Register Asset Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Allocate Asset */}
      {allocateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Allocate Asset</h3>
              <button onClick={() => setAllocateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Asset</label>
                <select
                  required
                  value={allocData.assetId}
                  onChange={(e) => setAllocData({ ...allocData, assetId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                >
                  <option value="">Choose asset...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetTag}) - [{a.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 p-1 rounded-lg bg-slate-950/60 text-center">
                <button
                  type="button"
                  onClick={() => setAllocData({ ...allocData, mode: 'employee' })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                    allocData.mode === 'employee' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Allocate to Employee
                </button>
                <button
                  type="button"
                  onClick={() => setAllocData({ ...allocData, mode: 'department' })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                    allocData.mode === 'department' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Allocate to Department
                </button>
              </div>

              {allocData.mode === 'employee' ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Employee</label>
                  <select
                    required
                    value={allocData.userId}
                    onChange={(e) => setAllocData({ ...allocData, userId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                  >
                    <option value="">Choose employee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Department</label>
                  <select
                    required
                    value={allocData.departmentId}
                    onChange={(e) => setAllocData({ ...allocData, departmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                  >
                    <option value="">Choose department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Expected Return Date (Optional)</label>
                <input
                  type="date"
                  value={allocData.expectedReturnDate}
                  onChange={(e) => setAllocData({ ...allocData, expectedReturnDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Submit Allocation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Polished Conflict UX Modal (Differentiator) */}
      {conflictModalOpen && conflictInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl border border-red-500/30 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={16} />
                Asset Allocation Collision!
              </h3>
              <button onClick={() => setConflictModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-slate-300">
                <p className="font-semibold text-slate-100">Asset double-allocation blocked at schema level.</p>
                <p className="mt-2 text-xs">
                  Asset <span className="font-bold text-red-400">{conflictInfo.asset.name} ({conflictInfo.asset.assetTag})</span> is currently held by:
                </p>
                <p className="mt-1 font-bold text-slate-100 text-sm">👤 {conflictInfo.currentHolder}</p>
              </div>

              <p className="text-xs text-slate-400">
                To move this asset, please submit a transfer request. The current holder will be notified to release the asset.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleConflictTransferRequest}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-white rounded-lg shadow transition-colors"
                >
                  Trigger Transfer Request
                </button>
                <button
                  type="button"
                  onClick={() => setConflictModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: QR Code Display & Print */}
      {qrModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-left">
              <h3 className="font-bold text-sm text-slate-100">Asset Label: {selectedAsset.assetTag}</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-200">
                <img src={generatedQr} alt="Asset QR Code" className="w-48 h-48" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-100">{selectedAsset.name}</h4>
                <p className="text-xs text-slate-400">Serial: {selectedAsset.serialNumber}</p>
                <p className="text-xs text-slate-500 mt-1">Location: {selectedAsset.location} • Status: {selectedAsset.status}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadQr}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg transition-colors"
              >
                Download Label Image
              </button>
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Asset Transfer Form */}
      {transferModalOpen && transferData.allocationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Submit Transfer Request</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestTransfer(transferData.allocationId, transferData.toUserId, transferData.reason);
                setTransferModalOpen(false);
                setTransferData({ allocationId: '', toUserId: '', reason: '' });
                showToast('Request Submitted', 'Transfer request created successfully.', 'TRANSFER');
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Recipient</label>
                <select
                  required
                  value={transferData.toUserId}
                  onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                >
                  <option value="">Choose employee...</option>
                  {users.filter(u => u.id !== currentUser?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Reason for Transfer</label>
                <textarea
                  required
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Submit Transfer Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Raise Maintenance */}
      {maintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Raise Maintenance Ticket</h3>
              <button onClick={() => setMaintModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                raiseMaintenance(maintData);
                setMaintModalOpen(false);
                setMaintData({ assetId: '', description: '', priority: 'MEDIUM' });
                showToast('Ticket Raised', 'Maintenance request is now Pending review.', 'MAINTENANCE');
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Asset</label>
                <select
                  required
                  value={maintData.assetId}
                  onChange={(e) => setMaintData({ ...maintData, assetId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                >
                  <option value="">Choose asset...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Priority</label>
                <select
                  value={maintData.priority}
                  onChange={(e) => setMaintData({ ...maintData, priority: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Description of Issue</label>
                <textarea
                  required
                  value={maintData.description}
                  onChange={(e) => setMaintData({ ...maintData, description: e.target.value })}
                  placeholder="Describe the issue, noise, or malfunction in detail..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Submit Maintenance Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Schedule Audit Cycle */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Schedule Audit Cycle</h3>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAuditCycle(newAuditData);
                setAuditModalOpen(false);
                setNewAuditData({ name: '', startDate: '', endDate: '', departmentScope: '', locationScope: '', auditorIds: [] });
                showToast('Audit Cycle Created', 'Auditors assigned and assets scoped.', 'AUDIT');
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Audit Name</label>
                <input
                  type="text"
                  required
                  value={newAuditData.name}
                  onChange={(e) => setNewAuditData({ ...newAuditData, name: e.target.value })}
                  placeholder="e.g. Q3 Audit: Engineering dept"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newAuditData.startDate}
                    onChange={(e) => setNewAuditData({ ...newAuditData, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">End Date</label>
                  <input
                    type="date"
                    required
                    value={newAuditData.endDate}
                    onChange={(e) => setNewAuditData({ ...newAuditData, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Department Scope</label>
                  <select
                    value={newAuditData.departmentScope}
                    onChange={(e) => setNewAuditData({ ...newAuditData, departmentScope: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Location Scope</label>
                  <input
                    type="text"
                    value={newAuditData.locationScope}
                    onChange={(e) => setNewAuditData({ ...newAuditData, locationScope: e.target.value })}
                    placeholder="All locations"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Assign Auditors</label>
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2.5 max-h-36 overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`auditor_${u.id}`}
                        checked={newAuditData.auditorIds.includes(u.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...newAuditData.auditorIds, u.id]
                            : newAuditData.auditorIds.filter(id => id !== u.id);
                          setNewAuditData({ ...newAuditData, auditorIds: ids });
                        }}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <label htmlFor={`auditor_${u.id}`} className="font-semibold text-slate-300">
                        {u.name} ({u.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow animate-all"
              >
                Schedule & Assign Auditors
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 8: Simulate Role Promotion (Admin Only) */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Simulate Employee Role Promotion</h3>
              <button onClick={() => setPromoModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                promoteEmployee(promotionData.userId, promotionData.role, promotionData.departmentId || undefined);
                setPromoModalOpen(false);
                setPromotionData({ userId: '', role: 'EMPLOYEE', departmentId: '' });
                showToast('Role Updated', 'Modified user roles in master employee directory.', 'ALERT');
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Employee</label>
                <select
                  required
                  value={promotionData.userId}
                  onChange={(e) => setPromotionData({ ...promotionData, userId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300 font-medium"
                >
                  <option value="">Choose employee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Promote to Role</label>
                <select
                  value={promotionData.role}
                  onChange={(e) => setPromotionData({ ...promotionData, role: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="EMPLOYEE">Employee (Base)</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Assign to Department</label>
                <select
                  value={promotionData.departmentId}
                  onChange={(e) => setPromotionData({ ...promotionData, departmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="">No Change</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Promote Employee Role
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 9: Return Asset notes */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Asset Check-In Notes</h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Check-In Notes / Asset Condition</label>
                <textarea
                  required
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Returned in perfect condition, power cable included."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-lg shadow"
              >
                Complete Return Check-In
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// JSDoc: Main layout rendering and conflict UX modal coordination.
