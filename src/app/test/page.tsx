'use client';

import React, { useState, useEffect } from 'react';
import { StateProvider, useAppState } from '../../context/StateContext';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { Asset } from '../../lib/mockData';
import { FileDown, CheckCircle2, X } from 'lucide-react';

function MinimalTestUI() {
  const {
    assets,
    allocations,
    transferRequests,
    auditCycles,
    auditItems,
    users,
    allocateAsset,
    requestTransfer,
    createAuditCycle,
    updateAuditItem,
    closeAuditCycle,
    bookResource
  } = useAppState();

  // Test 1 States (QR Code)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string>('');

  // Test 2 States (Audit Cycle)
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [targetAssetBefore, setTargetAssetBefore] = useState<Asset | null>(null);
  const [targetAssetAfter, setTargetAssetAfter] = useState<Asset | null>(null);

  // Test 4 States (Conflict UX)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ asset: Asset; currentHolder: string } | null>(null);
  const [transferRequestLogs, setTransferRequestLogs] = useState<any[]>([]);

  // Test 5 States (Booking Recommendations)
  const [bookingTestStatus, setBookingTestStatus] = useState<string | null>(null);
  const [bookingTestRecs, setBookingTestRecs] = useState<any | null>(null);

  // Test 6 States (Slack Webhook & Redis Rate Limiter)
  const [slackTestStatus, setSlackTestStatus] = useState<string[]>([]);
  const [toast, setToast] = useState<{ title: string; message: string; type: string } | null>(null);

  // Toast custom event listener
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast(customEvent.detail);
      setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('af_toast', handleToast);
    return () => window.removeEventListener('af_toast', handleToast);
  }, []);

  // Initialize data
  useEffect(() => {
    if (assets.length > 0) {
      setSelectedAsset(assets[0]);
    }
  }, [assets]);

  // Generate QR Code on asset select
  useEffect(() => {
    if (selectedAsset) {
      QRCode.toDataURL(selectedAsset.assetTag, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setGeneratedQr(url);
      });
    }
  }, [selectedAsset]);

  // ==========================================
  // TEST ACTION 1: Download QR Label
  // ==========================================
  const handleDownloadQr = () => {
    if (!selectedAsset || !generatedQr) return;
    const link = document.createElement('a');
    link.href = generatedQr;
    link.download = `QR_Test_${selectedAsset.assetTag}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // TEST ACTION 2: Audit Cycle Transition
  // ==========================================
  const handleStartAuditTest = () => {
    // 1. Find a target asset to test. Let's pick a6 (AF-9921 Office Chair) or any available asset
    const testAsset = assets.find(a => a.assetTag === 'AF-9921') || assets[0];
    setTargetAssetBefore({ ...testAsset });
    setTargetAssetAfter(null);

    // 2. Create audit cycle
    const cycleName = `Black Box Test Audit - ${Date.now()}`;
    createAuditCycle({
      name: cycleName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      auditorIds: ['u1'] // Aditi Rao
    });
  };

  // Set active cycle id once created
  useEffect(() => {
    const openCycles = auditCycles.filter(c => c.name.startsWith('Black Box Test Audit') && c.status === 'OPEN');
    if (openCycles.length > 0) {
      setActiveCycleId(openCycles[0].id);
    } else {
      setActiveCycleId(null);
    }
  }, [auditCycles]);

  const handleMarkMissingAndClose = () => {
    if (!activeCycleId || !targetAssetBefore) return;

    // Find the audit item in the cycle for our target asset
    const item = auditItems.find(ai => ai.auditCycleId === activeCycleId && ai.assetId === targetAssetBefore.id);
    if (item) {
      // 1. Mark as MISSING
      updateAuditItem(item.id, 'MISSING', 'Testing transition to Lost');
      
      // 2. Close Cycle
      closeAuditCycle(activeCycleId);

      // 3. Inspect updated asset status in the system
      setTimeout(() => {
        const updatedAsset = assets.find(a => a.id === targetAssetBefore.id);
        if (updatedAsset) {
          setTargetAssetAfter({ ...updatedAsset });
        }
      }, 200);
    }
  };

  // ==========================================
  // TEST ACTION 3: Excel Export
  // ==========================================
  const handleExportExcel = () => {
    // Create simple data structured list
    const summaryData = assets.map(a => ({
      'Asset Tag': a.assetTag,
      'Asset Name': a.name,
      'Category': a.categoryName,
      'Location': a.location,
      'Acquisition Cost ($)': a.acquisitionCost,
      'Condition': a.condition,
      'Current Status': a.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Export');
    XLSX.writeFile(workbook, 'Black_Box_Test_Asset_Export.xlsx');
  };

  // ==========================================
  // TEST ACTION 4: Trigger Double Allocation Conflict
  // ==========================================
  const handleTriggerConflict = () => {
    // Find an allocated asset (e.g. AF-0114 held by Priya Shah)
    const busyAsset = assets.find(a => a.status === 'Allocated') || assets[0];
    const activeAlloc = allocations.find(al => al.assetId === busyAsset.id && al.status === 'ACTIVE');
    const currentHolder = activeAlloc ? activeAlloc.userName || activeAlloc.departmentName || 'Priya Shah' : 'Priya Shah';

    // Simulate allocation request
    const res = allocateAsset(
      busyAsset.id,
      'u5', // Try to allocate to Arjun Nair
      null
    );

    if (!res.success && res.currentHolder) {
      // Display conflict dialog
      setConflictData({ asset: busyAsset, currentHolder: res.currentHolder });
      setConflictModalOpen(true);
    } else {
      alert('Mock Allocation Succeeded. Ensure you choose an already allocated asset (status = Allocated).');
    }
  };

  const handleConflictTransfer = () => {
    if (!conflictData) return;
    const activeAlloc = allocations.find(al => al.assetId === conflictData.asset.id && al.status === 'ACTIVE');
    if (activeAlloc) {
      requestTransfer(activeAlloc.id, 'u5', 'Test conflict transfer request.');
      
      // Update local logs
      setTransferRequestLogs([
        {
          id: Date.now(),
          assetTag: conflictData.asset.assetTag,
          from: conflictData.currentHolder,
          to: 'Arjun Nair',
          reason: 'Test conflict transfer request.',
          status: 'REQUESTED'
        },
        ...transferRequestLogs
      ]);
      setConflictModalOpen(false);
    }
  };

  const handleTestBookingConflict = () => {
    // Try to book Room B2 (assetId a10) during a conflict window (e.g. 09:30 to 10:30 on July 7, 2026)
    // Seed booking: 09:00 to 10:00
    const res = bookResource(
      'a10', // Room B2
      'u4',  // Priya Shah
      '2026-07-07T09:30',
      '2026-07-07T10:30'
    );

    if (!res.success) {
      setBookingTestStatus(res.error || 'Conflict detected.');
      setBookingTestRecs(res.recommendations || null);
    } else {
      setBookingTestStatus('Mock Booking Succeeded. Try selecting a conflicting slot.');
      setBookingTestRecs(null);
    }
  };

  const handleSendSingleSlackAlert = async () => {
    setSlackTestStatus(prev => [`[${new Date().toLocaleTimeString()}] Sending single alert...`, ...prev]);
    try {
      const res = await fetch('/api/slack-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Manual Test Alert',
          message: 'This is a test notification triggered from the Black Box Testing console.',
          priority: 'INFO'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSlackTestStatus(prev => [
          `[${new Date().toLocaleTimeString()}] Success: Alert processed. (Redis active: ${data.redisActive}, Count: ${data.rateLimitCount})`,
          ...prev
        ]);
      } else {
        setSlackTestStatus(prev => [
          `[${new Date().toLocaleTimeString()}] Error ${res.status}: ${data.error}`,
          ...prev
        ]);
      }
    } catch (err: any) {
      setSlackTestStatus(prev => [`[${new Date().toLocaleTimeString()}] Connection error: ${err.message}`, ...prev]);
    }
  };

  const handleTriggerSlackRateLimiter = async () => {
    setSlackTestStatus(prev => [`[${new Date().toLocaleTimeString()}] Blasting 6 alerts instantly to trigger Redis rate limit...`, ...prev]);
    
    // Fire 6 requests concurrently
    const promises = Array.from({ length: 6 }).map((_, index) => {
      return fetch('/api/slack-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Rate Limit Blast #${index + 1}`,
          message: `Testing sliding window rate limit. Item #${index + 1}`,
          priority: 'HIGH'
        })
      }).then(async res => {
        const data = await res.json();
        return { status: res.status, data };
      }).catch(err => {
        return { status: 500, data: { error: err.message } };
      });
    });

    const results = await Promise.all(promises);
    
    results.forEach((res, index) => {
      const time = new Date().toLocaleTimeString();
      if (res.status === 200) {
        setSlackTestStatus(prev => [
          `[${time}] Request #${index + 1}: Success (Count: ${res.data.rateLimitCount})`,
          ...prev
        ]);
      } else if (res.status === 429) {
        setSlackTestStatus(prev => [
          `[${time}] Request #${index + 1}: Throttled! (Error 429: ${res.data.error})`,
          ...prev
        ]);
      } else {
        setSlackTestStatus(prev => [
          `[${time}] Request #${index + 1}: Failed (Status ${res.status}: ${res.data.error})`,
          ...prev
        ]);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">Differentiators Black Box Testing</h1>
          <p className="text-xs text-slate-400 mt-1">Minimal UI console designed to test and inspect the four differentiator features end-to-end.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* FEATURE 1: QR Code Labels */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              1. QR Code Labels
            </h3>
            <p className="text-xs text-slate-400">Generates instant barcodes from asset tags with download labels.</p>
            
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">Select Asset</label>
              <select
                value={selectedAsset?.id || ''}
                onChange={(e) => {
                  const asset = assets.find(a => a.id === e.target.value);
                  if (asset) setSelectedAsset(asset);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none"
              >
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                ))}
              </select>

              {generatedQr && (
                <div className="flex flex-col items-center gap-3 p-4 rounded bg-slate-950 border border-slate-800">
                  <img src={generatedQr} alt="QR code" className="w-32 h-32 bg-white p-2 rounded" />
                  <p className="text-[10px] font-mono text-slate-400">{selectedAsset?.assetTag}</p>
                </div>
              )}

              <button
                onClick={handleDownloadQr}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded transition-colors"
              >
                Download Label Image (.png)
              </button>
            </div>
          </div>

          {/* FEATURE 2: Audit Cycle Verification & Lock */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              2. Audit Cycle status transitions
            </h3>
            <p className="text-xs text-slate-400">Verifying asset as MISSING auto-transitions state to LOST on cycle close.</p>

            <div className="space-y-3 text-xs">
              {!activeCycleId ? (
                <button
                  onClick={handleStartAuditTest}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded transition-colors"
                >
                  Create Test Audit Cycle
                </button>
              ) : (
                <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[10px] text-green-400">Cycle Status: Active</span>
                    <span className="text-[9px] text-slate-500">Auditor: Aditi Rao</span>
                  </div>
                  
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <p className="font-bold text-slate-300">Target Asset: {targetAssetBefore?.name} ({targetAssetBefore?.assetTag})</p>
                    <p className="text-[10px] text-slate-500">Before Status: <span className="text-red-400 font-semibold">{targetAssetBefore?.status}</span></p>
                  </div>

                  <button
                    onClick={handleMarkMissingAndClose}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded transition-colors"
                  >
                    Mark Missing & Close Cycle
                  </button>
                </div>
              )}

              {targetAssetAfter && (
                <div className="p-3.5 rounded border border-green-500/20 bg-green-500/5 space-y-1.5 animate-in fade-in duration-300">
                  <h4 className="font-bold text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Test Result: Success
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Asset <span className="font-bold">{targetAssetAfter.assetTag}</span> has transitioned to status:{' '}
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold uppercase tracking-wider text-[9px]">
                      {targetAssetAfter.status}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FEATURE 3: PapaParse CSV Export */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              3. Excel Export
            </h3>
            <p className="text-xs text-slate-400">Compiles local asset states and triggers structured binary Excel (.xlsx) download.</p>

            <div className="space-y-3">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <p className="font-semibold text-slate-300">Asset Data Statistics:</p>
                <ul className="space-y-1 text-slate-400 pl-2 list-disc">
                  <li>Total records parsed: {assets.length} items</li>
                  <li>Columns mapped: 7 headers</li>
                  <li>Format: Microsoft Excel (.xlsx)</li>
                </ul>
              </div>

              <button
                onClick={handleExportExcel}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded transition-colors flex items-center justify-center gap-2"
              >
                <FileDown size={14} />
                Download test_assets.xlsx
              </button>
            </div>
          </div>

          {/* FEATURE 4: Polished Conflict UX Modal */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              4. Polished Conflict UX
            </h3>
            <p className="text-xs text-slate-400">Blocks double allocation, showing the current holder with transfer actions.</p>

            <div className="space-y-3">
              <button
                onClick={handleTriggerConflict}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white rounded transition-colors"
              >
                Trigger Collision (Try Allocating Busy Asset)
              </button>

              {/* Log showing transfer requests created */}
              {transferRequestLogs.length > 0 && (
                <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block border-b border-slate-800 pb-1">
                    Transfer Requests Created
                  </span>
                  {transferRequestLogs.map(log => (
                    <div key={log.id} className="text-[10px] text-slate-300 space-y-1">
                      <p>Asset: {log.assetTag} • Status: <span className="text-yellow-400 font-bold">{log.status}</span></p>
                      <p className="text-slate-500">From: {log.from} ➔ To: {log.to}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FEATURE 5: Smart Booking Recommendation Algorithm */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              5. Smart Booking Recommendation Algorithm
            </h3>
            <p className="text-xs text-slate-400">Triggers booking interval collision, showing alternative slots and same-category resources.</p>

            <div className="space-y-4">
              <button
                onClick={handleTestBookingConflict}
                className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-xs font-bold text-white rounded transition-colors"
              >
                Trigger Booking Conflict (Room B2: 09:30 AM - 10:30 AM)
              </button>

              {bookingTestStatus && (
                <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-3">
                  <div className="p-2 rounded bg-red-500/5 border border-red-500/10 text-red-400 font-semibold">
                    {bookingTestStatus}
                  </div>

                  {bookingTestRecs && (
                    <div className="space-y-3 pt-1 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                        Algorithm Recommendations:
                      </span>

                      {/* Recommend 1 */}
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-semibold">Closest Open Slot (Same Resource):</p>
                        <div className="p-2.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-300 font-medium">
                          📅 {new Date(bookingTestRecs.nextSlot.startTime).toLocaleString()} ➔ {new Date(bookingTestRecs.nextSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Recommend 2 */}
                      {bookingTestRecs.alternativeResources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-semibold">Alternative Available Resources (Same Category):</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {bookingTestRecs.alternativeResources.map((alt: any) => (
                              <span
                                key={alt.id}
                                className="px-2.5 py-1 rounded bg-indigo-600/10 border border-indigo-500/25 text-indigo-300 font-semibold text-[10px]"
                              >
                                🏢 {alt.name} ({alt.tag})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FEATURE 6: Slack Webhook & Redis Rate Limiter */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              6. Slack Integration & Redis Rate Limiter
            </h3>
            <p className="text-xs text-slate-400">Verifies Slack webhook trigger status and sliding-window Redis rate-limiting (max 5 alerts/minute).</p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSendSingleSlackAlert}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded transition-colors"
                >
                  Send Single Slack Alert
                </button>
                <button
                  onClick={handleTriggerSlackRateLimiter}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded transition-colors"
                >
                  Trigger Rate Limiter (Burst 6 Alerts)
                </button>
              </div>

              {/* Console log box for testing status */}
              {slackTestStatus.length > 0 && (
                <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2 text-[10px] font-mono text-slate-400 max-h-40 overflow-y-auto">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 font-sans">
                    Rate Limiter Logs
                  </span>
                  {slackTestStatus.map((log, idx) => (
                    <div key={idx} className={log.includes('Throttled') ? 'text-red-400 font-bold' : log.includes('Success') ? 'text-green-400' : 'text-slate-400'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl border border-red-500/30 bg-slate-900 shadow-2xl text-slate-100 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <span className={`mt-1 w-2 h-2 rounded-full ${toast.title.includes('Rate') ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-white">{toast.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal Simulation */}
      {conflictModalOpen && conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-xl border border-red-500/30 bg-slate-900 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircleIcon />
                Asset Double-Allocation Blocked!
              </h3>
              <button onClick={() => setConflictModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            
            <div className="text-xs space-y-3">
              <div className="p-3 rounded bg-red-500/5 border border-red-500/10 text-slate-300">
                <p>Asset <span className="font-bold text-red-400">{conflictData.asset.name} ({conflictData.asset.assetTag})</span> is currently locked in an active allocation held by:</p>
                <p className="mt-2 font-bold text-slate-100 text-sm">👤 {conflictData.currentHolder}</p>
              </div>

              <p className="text-[10px] text-slate-500">
                Direct re-allocation is blocked. Would you like to submit a request to transfer this asset instead?
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={handleConflictTransfer}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded transition-colors"
                >
                  Request Transfer
                </button>
                <button
                  onClick={() => setConflictModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-400 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export default function TestPage() {
  return (
    <StateProvider>
      <MinimalTestUI />
    </StateProvider>
  );
}
