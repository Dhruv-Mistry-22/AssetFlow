const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'AssetFlowApp.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update Imports
content = content.replace(
  "import { RevenueAreaChart, OrdersBarChart } from './AnimatedCharts';",
  "import { WeeklySalesBarChart, RevenueMinimalBarChart } from './AnimatedCharts';"
);

// 2. Wrap Outer Layout
const rootRegex = /<div className="flex flex-col min-h-screen[^"]*">/;
content = content.replace(rootRegex, `<div className="flex flex-col min-h-screen bg-slate-200 text-slate-800 font-sans selection:bg-orange-500/30 overflow-x-hidden relative p-2 md:p-6 lg:p-10">
  <div className="flex flex-col flex-1 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative">`);

// 3. Fix the closing tag for the outer wrapper.
// Find the last </div>
const lastDivIndex = content.lastIndexOf('</div>');
if (lastDivIndex !== -1) {
  content = content.substring(0, lastDivIndex) + '</div>\n    </div>\n  );\n}';
}

// 4. Update Header
const oldHeader = /<header className="h-20 bg-white\/70[^"]*">/;
content = content.replace(oldHeader, '<header className="h-24 bg-transparent px-10 pt-6 flex items-center justify-between z-30 sticky top-0">');

// 5. Replace Dashboard content
const dashboardStart = content.indexOf('<AnimatePresence mode="wait">');
const dashboardEndString = '{activeTab === \'assets\' && (';
const dashboardEnd = content.indexOf(dashboardEndString);

if (dashboardStart !== -1 && dashboardEnd !== -1) {
  const newDashboardCode = `<AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full relative"
            >
              {/* Background watermark image ONLY for dashboard */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{ backgroundImage: "url('/warehouse-bg.png')", backgroundSize: '70%', backgroundPosition: '120% 30%', backgroundRepeat: 'no-repeat' }}
              />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-[1600px] mx-auto pt-4">
                
                {/* LEFT COLUMN: Overview, Orders, Inventory */}
                <div className="lg:col-span-4 space-y-12">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <h2 className="text-6xl font-thin tracking-tight text-slate-900 mb-2">Overview</h2>
                    <p className="text-sm text-slate-500 font-medium">Track inventory and <span className="font-bold text-slate-800">make faster stock decisions</span></p>
                  </motion.div>

                  <div className="space-y-6 pt-10">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.02 }}
                      className="p-6 rounded-3xl bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)] cursor-pointer w-[80%]"
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
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      className="p-6 rounded-3xl bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)] cursor-pointer w-[80%]"
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
                      initial={{ opacity: 0, scale: 0.9, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring' }}
                      className="absolute right-10 top-40 p-6 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-slate-100 w-80 z-20"
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
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="lg:col-span-5 p-8 rounded-[2rem] bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex flex-col"
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
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      className="p-8 rounded-[2rem] bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex-1 relative overflow-hidden"
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
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                      className="p-8 rounded-[2rem] bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)]"
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
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                    className="lg:col-span-4 p-8 rounded-[2rem] bg-white shadow-[0_10px_40px_rgb(0,0,0,0.04)]"
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
          
          `;
  
  content = content.substring(0, dashboardStart) + newDashboardCode + content.substring(dashboardEnd);
}

// 6. Remove <Background3D /> if it's there
content = content.replace('<Background3D />', '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Pixel perfect redesign applied successfully (V2).');
