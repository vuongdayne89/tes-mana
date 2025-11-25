
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Ticket, CheckInLog, Branch } from '../types';
import { 
  getDashboardStats, getHourlyChartData, getCheckInLogs, getBranches, getTicketsByPhone,
  exportData
} from '../services/mockDb';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  Activity, Users, AlertTriangle, XCircle, Download, FileSpreadsheet, Printer,
  LayoutDashboard, User, Package, QrCode, MapPin, FileText, Settings
} from 'lucide-react';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
             <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
                {icon}
            </div>
             {/* Optional Badge/Trend could go here */}
        </div>
        <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<CheckInLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  const loadData = async () => {
    const b = await getBranches();
    setBranches(b);
    
    const s = await getDashboardStats(selectedBranch || undefined);
    setStats(s);
    
    const h = await getHourlyChartData();
    setHourlyData(h);

    // Get logs and we'd ideally join with user/ticket info here or fetch ticket details for each log
    // For this UI demo, we'll use the log info directly and assume some data
    const logs = await getCheckInLogs(); 
    setRecentLogs(logs.slice(0, 10)); // Top 10 recent
  };

  const NavTab = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
        ${activeTab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
          {icon}
          <span className="ml-2">{label}</span>
      </button>
  );

  if (!stats) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <Layout role={UserRole.OWNER} title="Quản Lý Thương Hiệu">
       
       {/* 1. TOP NAVIGATION (MATCHING WIREFRAME) */}
       <div className="bg-white border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
           <div className="flex">
               <NavTab id="dashboard" label="Dashboard" icon={<LayoutDashboard size={18}/>} />
               <NavTab id="customers" label="Khách hàng" icon={<Users size={18}/>} />
               <NavTab id="packages" label="Gói dịch vụ" icon={<Package size={18}/>} />
               <NavTab id="qr" label="QR" icon={<QrCode size={18}/>} />
               <NavTab id="staff" label="NV" icon={<User size={18}/>} />
               <NavTab id="branches" label="Chi nhánh" icon={<MapPin size={18}/>} />
               <NavTab id="reports" label="Báo cáo" icon={<FileText size={18}/>} />
               <NavTab id="settings" label="Cài đặt" icon={<Settings size={18}/>} />
           </div>
       </div>

       {/* MAIN DASHBOARD CONTENT */}
       {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* Branch Filter */}
               <div className="flex justify-end">
                   <select 
                    className="p-2 border rounded-lg bg-white text-sm shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                   >
                       <option value="">Tất cả chi nhánh</option>
                       {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
               </div>

               {/* 2. STAT CARDS */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <StatCard 
                        icon={<Activity size={24}/>} 
                        label="Tổng Check-in" 
                        value={`${stats.todayCheckins} lượt`} 
                        color="bg-blue-600 text-blue-600"
                    />
                   <StatCard 
                        icon={<Users size={24}/>} 
                        label="Khách đang HD" 
                        value={`${stats.activeTickets} khách`} 
                        color="bg-green-600 text-green-600"
                    />
                   <StatCard 
                        icon={<AlertTriangle size={24}/>} 
                        label="Gói sắp hết" 
                        value={`${stats.expiringSoon} khách`} 
                        color="bg-orange-500 text-orange-500"
                    />
                   <StatCard 
                        icon={<XCircle size={24}/>} 
                        label="Hết hạn" 
                        value={`${stats.expiredTickets} khách`} 
                        color="bg-red-500 text-red-500"
                    />
               </div>

               {/* 3. CHART SECTION */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                   <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Biểu đồ Check-in theo giờ</h3>
                   <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="v" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
               </div>

               {/* 4. RECENT ACTIVITY TABLE */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                       <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Khách gần đây</h3>
                       <button className="text-sm text-brand-600 font-bold hover:underline">Xem tất cả</button>
                   </div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                               <tr>
                                   <th className="px-6 py-4">Tên KH</th>
                                   <th className="px-6 py-4">SĐT</th>
                                   <th className="px-6 py-4">Gói</th>
                                   <th className="px-6 py-4">Thời gian</th>
                                   <th className="px-6 py-4">Trạng thái</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {recentLogs.length === 0 ? (
                                   <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Chưa có dữ liệu check-in hôm nay</td></tr>
                               ) : (
                                   recentLogs.map(log => (
                                       <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                           <td className="px-6 py-4 font-bold text-gray-900">{log.user_name}</td>
                                           <td className="px-6 py-4 font-mono text-gray-500">{log.user_phone}</td>
                                           <td className="px-6 py-4">
                                                {/* Normally we'd join Ticket Type here, simplifying for UI demo */}
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">Vé Tập</span>
                                           </td>
                                           <td className="px-6 py-4 text-gray-600">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</td>
                                           <td className="px-6 py-4">
                                               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                   log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                               }`}>
                                                   {log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                                               </span>
                                           </td>
                                       </tr>
                                   ))
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>

               {/* 5. ACTIONS FOOTER */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                   <button onClick={() => exportData('logs', 'owner1')} className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-bold shadow-sm transition-all">
                       <Download className="mr-2 text-brand-600" size={20}/> Xuất dữ liệu (JSON)
                   </button>
                   <button className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-bold shadow-sm transition-all">
                       <FileSpreadsheet className="mr-2 text-green-600" size={20}/> Tải Excel
                   </button>
                   <button onClick={() => window.print()} className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-bold shadow-sm transition-all">
                       <Printer className="mr-2 text-gray-600" size={20}/> In Báo Cáo PDF
                   </button>
               </div>
           </div>
       )}

       {/* Placeholder for other tabs */}
       {activeTab !== 'dashboard' && (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Settings size={48} className="mb-4 opacity-20"/>
               <h3 className="text-lg font-bold">Đang phát triển module: {activeTab}</h3>
               <p>Tính năng này sẽ sớm được cập nhật.</p>
           </div>
       )}
    </Layout>
  );
};

export default OwnerDashboard;
