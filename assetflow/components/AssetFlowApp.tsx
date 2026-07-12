'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence } from 'framer-motion';
import Background3D from './Background3D';
import { WeeklySalesBarChart, RevenueMinimalBarChart } from './AnimatedCharts';
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
  ArrowUpRight,
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
    pdf.setFillColor(15, 23, 42); // bg-white (#0f172a)
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
    <div className="flex flex-col min-h-screen bg-slate-200 text-slate-800 font-sans selection:bg-orange-500/30 overflow-x-hidden relative p-2 md:p-6 lg:p-10">
  <div className="flex flex-col flex-1 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative">
      
      {/* Real-time Notification Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 w-96 p-4 rounded-xl border border-orange-500/30 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-800">{toast.title}</h4>
            <p className="text-xs text-slate-500 mt-1">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      
      {/* Top Navigation */}
      <header className="h-24 bg-transparent px-10 pt-6 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/20">
              AF
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900 hidden sm:block">
              AssetFlow
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'assets', icon: FolderTree, label: 'Directory' },
              { id: 'allocation', icon: ArrowRightLeft, label: 'Allocations' },
              { id: 'booking', icon: CalendarDays, label: 'Bookings' },
              { id: 'maintenance', icon: Wrench, label: 'Maintenance' },
              { id: 'audit', icon: ShieldCheck, label: 'Audit' },
              { id: 'reports', icon: BarChart3, label: 'Reports' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.id ? "text-orange-500" : ""} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotifMenuOpen(!notifMenuOpen);
                markNotificationsRead();
              }}
              className="p-2.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white border-2 border-white">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 z-20 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-xs text-slate-800">Alert Center</h3>
                  <button onClick={() => setNotifMenuOpen(false)} className="text-slate-500 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No recent notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            n.type === 'ALERT' ? 'bg-red-500' :
                            n.type === 'TRANSFER' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />
                          {n.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Simulate Role */}
          <div className="relative">
            <button 
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-3 pl-4 border-l border-slate-200 group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{currentUser?.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-600 group-hover:bg-slate-200 transition-colors">
                {currentUser?.name.charAt(0)}
              </div>
            </button>
            
            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 z-20 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100 mb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Simulate Role</span>
                </div>
                {(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] as User['role'][]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      currentUser?.role === r 
                        ? 'bg-orange-50 text-orange-600' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button 
                    onClick={() => signOut({ callbackUrl: "/" })} 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Panel */}
      <main className="flex-1 relative w-full overflow-y-auto">
        
        <div className="p-8 max-w-[1600px] w-full mx-auto min-h-screen relative z-10">

          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1 }}
              className="h-full relative"
            >
              {/* Immersive 3D Background */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <Background3D />
              </div>
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-[1600px] mx-auto pt-4">
                
                {/* LEFT COLUMN: Overview, Orders, Inventory */}
                <div className="lg:col-span-4 space-y-12">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <h2 className="text-6xl font-thin tracking-tight text-slate-900 mb-2">Overview</h2>
                    <p className="text-sm text-slate-500 font-medium">Track inventory and <span className="font-bold text-slate-800">make faster stock decisions</span></p>
                  </motion.div>

                  <div className="space-y-6 pt-10">
                    <motion.div 
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 15 }}
                      whileHover={{ scale: 1.04, y: -4, boxShadow: '0 30px 60px -15px rgba(249, 115, 22, 0.15)' }}
                      className="p-6 rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/50 cursor-pointer w-[80%] transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-sm text-slate-700 font-bold">Total Orders</p>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
                           <FolderTree size={20}/>
                        </div>
                        <div>
                          <p className="text-3xl font-light text-slate-900">24,744</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">Lifetime</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 100, damping: 15 }}
                      whileHover={{ scale: 1.04, y: -4, boxShadow: '0 30px 60px -15px rgba(249, 115, 22, 0.15)' }}
                      className="p-6 rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/50 cursor-pointer w-[80%] transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-sm text-slate-700 font-bold">Inventory Value</p>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
                           <ShieldCheck size={20}/>
                        </div>
                        <div>
                          <p className="text-3xl font-light text-slate-900">$45.5K</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">Current Stock</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* RIGHT COLUMN: The Floating Total Revenue Card */}
                <div className="lg:col-span-8 relative">
                   <motion.div 
                      initial={{ opacity: 0, scale: 0.85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.6, type: 'spring', stiffness: 80, damping: 12 }}
                      whileHover={{ scale: 1.03, boxShadow: '0 40px 80px -20px rgba(249, 115, 22, 0.2)' }}
                      className="absolute right-10 top-40 p-6 rounded-3xl bg-white/80 backdrop-blur-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] border border-white/60 w-80 z-20 transition-shadow cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-slate-700 font-bold">Total Revenue</p>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      <div className="mb-4">
                        <RevenueMinimalBarChart />
                      </div>
                      <p className="text-3xl font-light text-slate-900">$24,475.00</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Mar, 2026</p>
                   </motion.div>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12 pb-10 max-w-[1600px] mx-auto">
                 {/* Weekly Sales */}
                 <motion.div 
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 80, damping: 15 }}
                    whileHover={{ y: -4, boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12)' }}
                    className="lg:col-span-5 p-8 rounded-[2rem] bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/60 flex flex-col transition-shadow cursor-pointer"
                 >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">Weekly Sales</h3>
                        <p className="text-4xl font-light mt-4 text-slate-900">$12.5M</p>
                      </div>
                      <CalendarDays size={20} className="text-slate-400" />
                    </div>
                    <div className="flex-1 w-full min-h-[200px]">
                      <WeeklySalesBarChart />
                    </div>
                 </motion.div>

                 {/* Alerts & Campaigns */}
                 <div className="lg:col-span-3 space-y-8 flex flex-col">
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, type: 'spring', stiffness: 80, damping: 15 }}
                      whileHover={{ y: -4, boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12)' }}
                      className="p-8 rounded-[2rem] bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/60 flex-1 relative overflow-hidden transition-shadow cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm text-slate-800">Alerts</h3>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      <p className="text-4xl font-light text-slate-900">145</p>
                      
                      {/* Half Gauge Design */}
                      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-48 h-48">
                         <div className="w-full h-full rounded-full border-[2px] border-dashed border-orange-200 border-b-transparent border-r-transparent rotate-45"></div>
                         <motion.div 
                           initial={{ rotate: -90 }} animate={{ rotate: 10 }} transition={{ type: "spring", duration: 2, delay: 0.8 }}
                           className="absolute top-0 left-0 w-full h-full rounded-full border-[3px] border-orange-500 border-b-transparent border-r-transparent border-l-transparent rotate-45 origin-center"
                         >
                            <div className="absolute top-2 left-[50%] transform -translate-x-1/2 -mt-4 text-orange-500">
                               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L6 8H18L12 16Z"/></svg>
                            </div>
                         </motion.div>
                         <div className="absolute bottom-16 w-full text-center text-xs font-bold text-slate-800">Warning</div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, type: 'spring', stiffness: 80, damping: 15 }}
                      whileHover={{ y: -4, boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12)' }}
                      className="p-8 rounded-[2rem] bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/60 transition-shadow cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-sm text-slate-800">Campaigns</h3>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-4xl font-light text-slate-900">14 <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Campaign</span></p>
                        <div className="text-right w-24">
                           <div className="w-full h-1.5 bg-slate-100 rounded-full mb-2"><div className="w-[65%] h-1.5 bg-orange-500 rounded-full" /></div>
                           <p className="text-[10px] text-slate-400">Active <span className="font-bold text-slate-800 ml-1">10</span></p>
                        </div>
                      </div>
                    </motion.div>
                 </div>

                 {/* Best Selling Products / Active Assets */}
                 <motion.div 
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 80, damping: 15 }}
                    whileHover={{ y: -4, boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12)' }}
                    className="lg:col-span-4 p-8 rounded-[2rem] bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgb(0,0,0,0.06)] border border-white/60 transition-shadow cursor-pointer"
                 >
                    <div className="flex justify-between items-start mb-8">
                      <h3 className="font-bold text-sm text-slate-800">Most Active Assets</h3>
                      <ArrowUpRight size={16} className="text-slate-400" />
                    </div>
                    <div className="space-y-6">
                      {[
                        { name: 'MacBook Pro 16"', detail: '32 units allocated', count: '1,245 Uses', icon: '💻' },
                        { name: 'Herman Miller Chair', detail: '14 units allocated', count: '854 Uses', icon: '🪑' },
                        { name: 'Dell UltraSharp 4K', detail: '45 units allocated', count: '632 Uses', icon: '🖥️' },
                        { name: 'Sony A7S III Camera', detail: '2 units allocated', count: '154 Uses', icon: '📷' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl group-hover:bg-orange-50 transition-colors">
                            {item.icon}
                          </div>
                          <div className="flex-1 border-b border-slate-100 pb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">{item.detail}</p>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </motion.div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          
          {activeTab === 'assets' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Assets Registry</h2>
                  <p className="text-xs text-slate-500 mt-1">Search, register, and inspect physical corporate assets and print QR codes.</p>
                </div>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                  <button 
                    onClick={() => setRegisterModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Register New Asset
                  </button>
                )}
              </div>

              {/* Filters Panel */}
              <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-white/20">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search by tag, name, or serial number..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                
                <div className="flex gap-4">
                  <select
                    value={assetCatFilter}
                    onChange={(e) => setAssetCatFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-700 font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={assetStatusFilter}
                    onChange={(e) => setAssetStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-700 font-medium"
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
              <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
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
                        <tr key={a.id} className="hover:bg-white shadow-sm transition-colors">
                          <td className="py-3.5 font-bold text-orange-500 flex items-center gap-2">
                            <span className="p-1 rounded bg-orange-500/10 text-orange-500">
                              <QrCode size={12} />
                            </span>
                            {a.assetTag}
                          </td>
                          <td className="py-3.5 font-semibold text-slate-800">{a.name}</td>
                          <td className="py-3.5 text-slate-500">{a.categoryName}</td>
                          <td className="py-3.5 text-slate-700">{a.condition}</td>
                          <td className="py-3.5 text-slate-700">{a.location}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              a.status === 'Available' ? 'bg-green-500/10 text-green-400' :
                              a.status === 'Allocated' ? 'bg-orange-500/10 text-orange-500' :
                              a.status === 'Under_Maintenance' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {a.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-500">{a.currentHolderName || '--'}</td>
                          <td className="py-3.5 text-right space-x-2">
                            <button
                              onClick={() => showQrCode(a)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-700 rounded border border-slate-200"
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Allocation & Transfers</h2>
                  <p className="text-xs text-slate-500 mt-1">Allocate available assets or approve peer-to-peer transfer requests.</p>
                </div>
              </div>

              {/* Transfer Requests List */}
              <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-indigo-500" />
                  Peer-to-Peer Transfer Requests
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
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
                        <tr key={tr.id} className="hover:bg-white shadow-sm transition-colors">
                          <td className="py-3.5 font-bold text-slate-800">{tr.assetName} ({tr.assetTag})</td>
                          <td className="py-3.5 text-slate-700">{tr.fromUserName}</td>
                          <td className="py-3.5 text-slate-700">{tr.toUserName}</td>
                          <td className="py-3.5 text-slate-500 max-w-xs truncate">{tr.reason}</td>
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
                                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-[10px] font-bold text-white rounded shadow"
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
              <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-800">Active Allocations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
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
                          <tr key={al.id} className="hover:bg-white shadow-sm transition-colors">
                            <td className="py-3.5 font-bold text-slate-800">{al.assetName} ({al.assetTag})</td>
                            <td className="py-3.5 text-slate-700">{al.userName || 'Unassigned'}</td>
                            <td className="py-3.5 text-slate-500">{al.departmentName || '--'}</td>
                            <td className="py-3.5 text-slate-700">{al.allocatedAt}</td>
                            <td className={`py-3.5 font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-700'}`}>
                              {al.expectedReturnDate || 'Permanent'}
                              {isOverdue && <span className="text-[9px] block text-red-500">OVERDUE</span>}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                al.status === 'ACTIVE' ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-500'
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Resource Bookings</h2>
                  <p className="text-xs text-slate-500 mt-1">Book shared resources (meeting rooms, projectors, company cars) with overlap validation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Booking Form with Overlap checks */}
                <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800">Schedule Time Slot</h3>
                  <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Resource</label>
                      <select
                        required
                        value={bookingData.assetId}
                        onChange={(e) => setBookingData({ ...bookingData, assetId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                      >
                        <option value="">Choose asset...</option>
                        {assets.filter(a => a.isBookable).map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingData.startTime}
                        onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingData.endTime}
                        onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                      />
                    </div>

                    {bookingConflictMsg && (
                      <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 font-medium space-y-3">
                        <p>{bookingConflictMsg}</p>
                        
                        {bookingRecs && (
                          <div className="border-t border-red-500/10 pt-2.5 mt-2 space-y-2.5 text-xs">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">
                              System Recommendations:
                            </span>
                            
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-500 font-bold">Closest Available Slot (Same Resource):</p>
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
                                className="w-full text-left p-2 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-blue-500/20 transition-colors font-semibold"
                              >
                                {new Date(bookingRecs.nextSlot.startTime).toLocaleString()} ➔ {new Date(bookingRecs.nextSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </button>
                            </div>

                            {bookingRecs.alternativeResources.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-500 font-bold">Alternative Resources (Same Category):</p>
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
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow-lg shadow-orange-500/20 transition-colors"
                    >
                      Book Slot
                    </button>
                  </form>
                </div>

                {/* Booking Timeline Grid */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800">Existing Calendar Bookings</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
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
                          <tr key={b.id} className="hover:bg-white shadow-sm transition-colors">
                            <td className="py-3.5 font-bold text-slate-800">{b.assetName}</td>
                            <td className="py-3.5 text-slate-700">{b.userName}</td>
                            <td className="py-3.5 text-slate-500">{new Date(b.startTime).toLocaleString()}</td>
                            <td className="py-3.5 text-slate-500">{new Date(b.endTime).toLocaleString()}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                b.status === 'UPCOMING' ? 'bg-orange-500/10 text-orange-500' :
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Maintenance Pipeline</h2>
                  <p className="text-xs text-slate-500 mt-1">Route repairs through approval boards. Approving transitions assets to Under Maintenance.</p>
                </div>
                <button
                  onClick={() => setMaintModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white rounded-lg transition-all"
                >
                  <Plus size={14} />
                  Raise Maintenance Ticket
                </button>
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                
                {/* Column 1: Pending */}
                <div className="p-4 rounded-xl border border-slate-100 bg-white/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                    Pending ({maintenanceRequests.filter(r => r.status === 'PENDING').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'PENDING').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-white/60 hover:border-slate-200 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-orange-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{r.description}</p>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ASSET_MANAGER') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMaintenanceStatus(r.id, 'APPROVED')}
                              className="flex-1 py-1 bg-orange-500 hover:bg-orange-600 text-[9px] font-bold text-white rounded transition-colors"
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
                <div className="p-4 rounded-xl border border-slate-100 bg-white/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                    Approved ({maintenanceRequests.filter(r => r.status === 'APPROVED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'APPROVED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-white/60 hover:border-slate-200 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-orange-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-500">{r.description}</p>
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
                <div className="p-4 rounded-xl border border-slate-100 bg-white/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                    Assigned ({maintenanceRequests.filter(r => r.status === 'TECHNICIAN_ASSIGNED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'TECHNICIAN_ASSIGNED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-white/60 hover:border-slate-200 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-orange-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-500">Assignee: <span className="text-slate-700 font-semibold">{r.technicianName}</span></p>
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
                <div className="p-4 rounded-xl border border-slate-100 bg-white/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                    In Progress ({maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-white/60 hover:border-slate-200 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-orange-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-500">{r.priority}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800">{r.assetName}</h4>
                        <p className="text-[10px] text-slate-500">Tech: {r.technicianName}</p>
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
                <div className="p-4 rounded-xl border border-slate-100 bg-white/5 min-w-[220px] space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                    Resolved ({maintenanceRequests.filter(r => r.status === 'RESOLVED').length})
                  </h3>
                  <div className="space-y-3.5">
                    {maintenanceRequests.filter(r => r.status === 'RESOLVED').map(r => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 opacity-70 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] text-slate-500">{r.assetTag}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-500">RESOLVED</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-700">{r.assetName}</h4>
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Structured Asset Audit</h2>
                  <p className="text-xs text-slate-500 mt-1">Scope audit cycles, assign auditors, and auto-generate discrepancy reports.</p>
                </div>
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => setAuditModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Schedule Audit Cycle
                  </button>
                )}
              </div>

              {/* Active Audit Cycles lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* List of cycles */}
                <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800">Audit Cycles</h3>
                  <div className="space-y-4">
                    {auditCycles.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-slate-800">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.status === 'OPEN' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-1">
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
                <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800">Verification Checklist</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                          <th className="py-3">Asset</th>
                          <th className="py-3">Expected Location</th>
                          <th className="py-3">Verification</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {auditItems.map((item) => (
                          <tr key={item.id} className="hover:bg-white shadow-sm transition-colors">
                            <td className="py-3.5 font-bold text-slate-800">{item.assetName} ({item.assetTag})</td>
                            <td className="py-3.5 text-slate-500">{item.expectedLocation}</td>
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">Reports & Insights</h2>
                  <p className="text-xs text-slate-500 mt-1">Export raw reports or review usage, maintenance, and asset statistics.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white rounded-lg shadow-lg shadow-orange-500/20 transition-all"
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
              <div id="reports-page-content" className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-8">
                {/* Metrics visual summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Utilization list */}
                  <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-slate-800">Department Asset Counts</h3>
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
                              <span className="text-slate-700">{d.name}</span>
                              <span className="text-slate-500">{count} active assets</span>
                            </div>
                            <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.min(count * 8, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Most Used & Idle lists */}
                  <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest text-slate-500">Most Booked shared Resources</h4>
                      <div className="text-xs space-y-2 text-slate-700">
                        <div className="flex justify-between p-2 rounded bg-white/40">
                          <span>Conference Room B2</span>
                          <span className="font-bold text-orange-500">34 Bookings</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/40">
                          <span>Projector AF-0062</span>
                          <span className="font-bold text-orange-500">18 Bookings</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest text-slate-500">Flagged Idle Assets (60+ days unused)</h4>
                      <div className="text-xs space-y-2 text-slate-700">
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-slate-900">System Audit logs</h2>
                  <p className="text-xs text-slate-500 mt-1">Full immutable timeline tracking employee and admin actions.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        <th className="py-3">Timestamp</th>
                        <th className="py-3">User</th>
                        <th className="py-3">Action Details</th>
                        <th className="py-3">Entity Group</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {logs.map((l) => (
                        <tr key={l.id} className="hover:bg-white shadow-sm transition-colors">
                          <td className="py-3.5 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="py-3.5 font-semibold text-slate-700">{l.userName}</td>
                          <td className="py-3.5 text-slate-800">{l.action}</td>
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-500">
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

        </div>
      </main>

      {/* ============================================================== */}
      {/* MODAL WINDOWS & SLIDE OVERS */}
      {/* ============================================================== */}

      {/* Modal 1: Register Asset */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Register Asset</h3>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-500 hover:text-slate-800">
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
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={newAssetData.name}
                    onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={newAssetData.serialNumber}
                    onChange={(e) => setNewAssetData({ ...newAssetData, serialNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Acquisition Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={newAssetData.acquisitionCost}
                    onChange={(e) => setNewAssetData({ ...newAssetData, acquisitionCost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={newAssetData.acquisitionDate}
                    onChange={(e) => setNewAssetData({ ...newAssetData, acquisitionDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Condition</label>
                  <select
                    value={newAssetData.condition}
                    onChange={(e) => setNewAssetData({ ...newAssetData, condition: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-700"
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Category</label>
                  <select
                    required
                    value={newAssetData.categoryId}
                    onChange={(e) => setNewAssetData({ ...newAssetData, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-700"
                  >
                    <option value="">Choose category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Location / Site</label>
                <input
                  type="text"
                  required
                  value={newAssetData.location}
                  onChange={(e) => setNewAssetData({ ...newAssetData, location: e.target.value })}
                  placeholder="e.g. Warehouse, Bengaluru, HQ Floor 1"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/40">
                <input
                  type="checkbox"
                  id="isBookable"
                  checked={newAssetData.isBookable}
                  onChange={(e) => setNewAssetData({ ...newAssetData, isBookable: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="isBookable" className="font-semibold text-slate-700">Mark as shared bookable resource (meeting room, projector, etc.)</label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Allocate Asset</h3>
              <button onClick={() => setAllocateModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Asset</label>
                <select
                  required
                  value={allocData.assetId}
                  onChange={(e) => setAllocData({ ...allocData, assetId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                >
                  <option value="">Choose asset...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetTag}) - [{a.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 p-1 rounded-lg bg-slate-50/60 text-center">
                <button
                  type="button"
                  onClick={() => setAllocData({ ...allocData, mode: 'employee' })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                    allocData.mode === 'employee' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Allocate to Employee
                </button>
                <button
                  type="button"
                  onClick={() => setAllocData({ ...allocData, mode: 'department' })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                    allocData.mode === 'department' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Allocate to Department
                </button>
              </div>

              {allocData.mode === 'employee' ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Employee</label>
                  <select
                    required
                    value={allocData.userId}
                    onChange={(e) => setAllocData({ ...allocData, userId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                  >
                    <option value="">Choose employee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Department</label>
                  <select
                    required
                    value={allocData.departmentId}
                    onChange={(e) => setAllocData({ ...allocData, departmentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                  >
                    <option value="">Choose department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Expected Return Date (Optional)</label>
                <input
                  type="date"
                  value={allocData.expectedReturnDate}
                  onChange={(e) => setAllocData({ ...allocData, expectedReturnDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-red-500/30 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={16} />
                Asset Allocation Collision!
              </h3>
              <button onClick={() => setConflictModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-slate-700">
                <p className="font-semibold text-slate-900">Asset double-allocation blocked at schema level.</p>
                <p className="mt-2 text-xs">
                  Asset <span className="font-bold text-red-400">{conflictInfo.asset.name} ({conflictInfo.asset.assetTag})</span> is currently held by:
                </p>
                <p className="mt-1 font-bold text-slate-900 text-sm">👤 {conflictInfo.currentHolder}</p>
              </div>

              <p className="text-xs text-slate-500">
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
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-200 font-semibold text-slate-700 rounded-lg transition-colors"
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
          <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-left">
              <h3 className="font-bold text-sm text-slate-900">Asset Label: {selectedAsset.assetTag}</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-200">
                <img src={generatedQr} alt="Asset QR Code" className="w-48 h-48" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">{selectedAsset.name}</h4>
                <p className="text-xs text-slate-500">Serial: {selectedAsset.serialNumber}</p>
                <p className="text-xs text-slate-500 mt-1">Location: {selectedAsset.location} • Status: {selectedAsset.status}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadQr}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs text-white rounded-lg transition-colors"
              >
                Download Label Image
              </button>
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition-colors"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Submit Transfer Request</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-500 hover:text-slate-800">
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
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Recipient</label>
                <select
                  required
                  value={transferData.toUserId}
                  onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                >
                  <option value="">Choose employee...</option>
                  {users.filter(u => u.id !== currentUser?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Reason for Transfer</label>
                <textarea
                  required
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  className="w-full h-24 bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Raise Maintenance Ticket</h3>
              <button onClick={() => setMaintModalOpen(false)} className="text-slate-500 hover:text-slate-800">
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
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Asset</label>
                <select
                  required
                  value={maintData.assetId}
                  onChange={(e) => setMaintData({ ...maintData, assetId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                >
                  <option value="">Choose asset...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Priority</label>
                <select
                  value={maintData.priority}
                  onChange={(e) => setMaintData({ ...maintData, priority: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Description of Issue</label>
                <textarea
                  required
                  value={maintData.description}
                  onChange={(e) => setMaintData({ ...maintData, description: e.target.value })}
                  placeholder="Describe the issue, noise, or malfunction in detail..."
                  className="w-full h-24 bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Schedule Audit Cycle</h3>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-500 hover:text-slate-800">
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
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Audit Name</label>
                <input
                  type="text"
                  required
                  value={newAuditData.name}
                  onChange={(e) => setNewAuditData({ ...newAuditData, name: e.target.value })}
                  placeholder="e.g. Q3 Audit: Engineering dept"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newAuditData.startDate}
                    onChange={(e) => setNewAuditData({ ...newAuditData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">End Date</label>
                  <input
                    type="date"
                    required
                    value={newAuditData.endDate}
                    onChange={(e) => setNewAuditData({ ...newAuditData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Department Scope</label>
                  <select
                    value={newAuditData.departmentScope}
                    onChange={(e) => setNewAuditData({ ...newAuditData, departmentScope: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Location Scope</label>
                  <input
                    type="text"
                    value={newAuditData.locationScope}
                    onChange={(e) => setNewAuditData({ ...newAuditData, locationScope: e.target.value })}
                    placeholder="All locations"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assign Auditors</label>
                <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/40 space-y-2.5 max-h-36 overflow-y-auto">
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
                      <label htmlFor={`auditor_${u.id}`} className="font-semibold text-slate-700">
                        {u.name} ({u.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow animate-all"
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
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Simulate Employee Role Promotion</h3>
              <button onClick={() => setPromoModalOpen(false)} className="text-slate-500 hover:text-slate-800">
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
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Employee</label>
                <select
                  required
                  value={promotionData.userId}
                  onChange={(e) => setPromotionData({ ...promotionData, userId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
                >
                  <option value="">Choose employee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Promote to Role</label>
                <select
                  value={promotionData.role}
                  onChange={(e) => setPromotionData({ ...promotionData, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="EMPLOYEE">Employee (Base)</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assign to Department</label>
                <select
                  value={promotionData.departmentId}
                  onChange={(e) => setPromotionData({ ...promotionData, departmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="">No Change</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
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
          <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Asset Check-In Notes</h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Check-In Notes / Asset Condition</label>
                <textarea
                  required
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Returned in perfect condition, power cable included."
                  className="w-full h-24 bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg shadow"
              >
                Complete Return Check-In
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}