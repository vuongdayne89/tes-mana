
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, CheckInLog, Branch, User, Ticket, TicketType } from '../types';
import { 
  getDashboardStats, getHourlyChartData, getCheckInLogs, getBranches, 
  createBranch, deleteBranch, getStaffUsers, addStaff, removeStaff, updateBrandName,
  getAllTickets, createTicket, generateStaticTicketQR, registerCustomer, getSession, getCustomers, deleteTicket
} from '../services/mockDb';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  Activity, Users, AlertTriangle, XCircle, Trash2, Printer,
  LayoutDashboard, User as UserIcon, QrCode, MapPin, Settings, Plus, Save, Ticket as TicketIcon, CheckCircle, AlertCircle, X, Search, Filter, Download
} from 'lucide-react';
import QRCode from "react-qr-code";

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
             <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
                {icon}
            </div>
        </div>
        <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

const OwnerDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Logs Filter States
  const [logs, setLogs] = useState<(CheckInLog & { ticket_type?: string, branch_name?: string, staff_name?: string })[]>([]);
  const [filterLogBranch, setFilterLogBranch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Form States
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddr, setNewBranchAddr] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('staff123');
  const [newStaffBranch, setNewStaffBranch] = useState('');
  const [brandNameInput, setBrandNameInput] = useState('');

  // Ticket Creation Form States
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [ticketMode, setTicketMode] = useState<'existing' | 'new'>('existing');
  const [targetPhone, setTargetPhone] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPin, setNewCustPin] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>(TicketType.SESSION_12);
  const [customSessions, setCustomSessions] = useState(10);
  const [qrModalData, setQrModalData] = useState<{token: string, title: string} | null>(null);

  useEffect(() => {
    const session = getSession();
    if(session) setCurrentUser(session);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  useEffect(() => {
      if(activeTab === 'staff') loadStaff();
      if(activeTab === 'tickets') loadTickets();
      if(activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const showNotify = (message: string, type: 'success' | 'error') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    const b = await getBranches();
    setBranches(b);
    const s = await getDashboardStats(selectedBranch || undefined);
    setStats(s);
    const h = await getHourlyChartData(selectedBranch || undefined);
    setHourlyData(h);
  };

  const loadStaff = async () => {
      const s = await getStaffUsers();
      setStaffList(s);
  };

  const loadTickets = async () => {
      const t = await getAllTickets();
      setTickets(t);
      const c = await getCustomers();
      setCustomers(c);
  };

  const loadLogs = async () => {
      const l = await getCheckInLogs(filterLogBranch, filterStartDate, filterEndDate);
      setLogs(l);
  };

  // Re-load logs when filters change
  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
  }, [filterLogBranch, filterStartDate, filterEndDate]);

  const handleCreateBranch = async (e: React.FormEvent) => {
      e.preventDefault();
      await createBranch(newBranchName, newBranchAddr);
      setNewBranchName(''); setNewBranchAddr('');
      loadData();
      showNotify('Đã tạo chi nhánh mới', 'success');
  };

  const handleDeleteBranch = async (id: string) => {
      if(confirm('Xóa chi nhánh này?')) {
          await deleteBranch(id);
          loadData();
          showNotify('Đã xóa chi nhánh', 'success');
      }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStaffBranch) return showNotify('Vui lòng chọn chi nhánh', 'error');
      await addStaff({ 
          name: newStaffName, phone: newStaffPhone, password: newStaffPass, branch_id: newStaffBranch 
      }, 'owner');
      setNewStaffName(''); setNewStaffPhone(''); 
      loadStaff();
      showNotify('Đã thêm nhân viên thành công', 'success');
  };

  const handleDeleteStaff = async (id: string) => {
      if(confirm('Xóa nhân viên này?')) {
          await removeStaff(id, 'owner');
          loadStaff();
          showNotify('Đã xóa nhân viên', 'success');
      }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      let finalName = newCustName;
      if (ticketMode === 'new') {
          const regRes = await registerCustomer(newCustName, targetPhone, newCustPin, currentUser?.id || 'owner');
          if (!regRes.success && regRes.message !== 'Số điện thoại đã tồn tại') {
              showNotify('Lỗi: ' + regRes.message, 'error');
              return;
          }
      } else {
          // If existing, find name from customers list or just use what we have
          const exist = customers.find(c => c.phone === targetPhone);
          finalName = exist ? exist.name : 'Khách hàng';
      }

      const ticketData = {
          owner_phone: targetPhone, owner_name: finalName, type: ticketType,
          type_label: ticketType === TicketType.CUSTOM ? `Vé Tùy Chọn (${customSessions} buổi)` : undefined,
          custom_sessions: ticketType === TicketType.CUSTOM ? customSessions : undefined
      };

      const newTicket = await createTicket(ticketData, currentUser?.id || 'owner');
      if (newTicket) {
          const staticToken = await generateStaticTicketQR(newTicket);
          setQrModalData({ token: staticToken, title: `VÉ: ${newTicket.owner_name}` });
          setShowCreateTicketModal(false);
          setTargetPhone(''); setNewCustName('');
          loadTickets();
          showNotify('Tạo vé mới thành công!', 'success');
      } else {
          showNotify('Lỗi tạo vé', 'error');
      }
  };

  const handleDeleteTicket = async (id: string) => {
      if(confirm('Bạn có chắc muốn xóa vé này? Hành động này không thể hoàn tác.')) {
          await deleteTicket(id);
          loadTickets();
          showNotify('Đã xóa vé', 'success');
      }
  }

  const handleSaveBrand = async () => {
      if(!brandNameInput) return;
      await updateBrandName(brandNameInput);
      showNotify('Đã cập nhật thương hiệu. Vui lòng đăng nhập lại.', 'success');
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
       
       {/* Notification Toast */}
       {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{notification.message}</span>
        </div>
       )}

       <div className="bg-white border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
           <div className="flex">
               <NavTab id="dashboard" label="Dashboard" icon={<LayoutDashboard size={18}/>} />
               <NavTab id="branches" label="Chi nhánh" icon={<MapPin size={18}/>} />
               <NavTab id="staff" label="Nhân viên" icon={<UserIcon size={18}/>} />
               <NavTab id="tickets" label="Vé" icon={<TicketIcon size={18}/>} />
               <NavTab id="logs" label="Báo Cáo" icon={<CheckCircle size={18}/>} />
               <NavTab id="qr" label="QR Kiosk" icon={<QrCode size={18}/>} />
               <NavTab id="settings" label="Cài đặt" icon={<Settings size={18}/>} />
           </div>
       </div>

       {/* DASHBOARD TAB */}
       {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
               <div className="flex justify-end">
                   <select 
                    className="p-2 border rounded-lg bg-white text-sm shadow-sm"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                   >
                       <option value="">Tất cả chi nhánh</option>
                       {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <StatCard icon={<Activity size={24}/>} label="Tổng Check-in" value={`${stats.totalCheckins} lượt`} color="bg-blue-600 text-blue-600" />
                   <StatCard icon={<Users size={24}/>} label="Khách đang HD" value={`${stats.activeTickets} khách`} color="bg-green-600 text-green-600" />
                   <StatCard icon={<AlertTriangle size={24}/>} label="Gói sắp hết" value={`${stats.expiringSoon} khách`} color="bg-orange-500 text-orange-500" />
                   <StatCard icon={<XCircle size={24}/>} label="Hết hạn" value={`${stats.expiredTickets} khách`} color="bg-red-500 text-red-500" />
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                   <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Biểu đồ Check-in hôm nay</h3>
                   <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="v" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
               </div>
           </div>
       )}

       {/* BRANCHES TAB */}
       {activeTab === 'branches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
               <div className="space-y-4">
                   <h3 className="font-bold text-lg">Danh sách Chi nhánh</h3>
                   {branches.length === 0 && <p className="text-gray-500">Chưa có chi nhánh nào.</p>}
                   {branches.map(b => (
                       <div key={b.id} className="p-4 bg-white border rounded-xl shadow-sm flex justify-between items-center">
                           <div>
                               <div className="font-bold text-brand-600">{b.name}</div>
                               <div className="text-sm text-gray-500">{b.address}</div>
                           </div>
                           <button onClick={() => handleDeleteBranch(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                       </div>
                   ))}
               </div>
               <div className="bg-gray-50 p-6 rounded-xl h-fit">
                   <h3 className="font-bold text-lg mb-4">Thêm Chi nhánh</h3>
                   <form onSubmit={handleCreateBranch} className="space-y-4">
                       <input className="w-full p-2 border rounded" placeholder="Tên chi nhánh (VD: Yoga An An - Q1)" value={newBranchName} onChange={e=>setNewBranchName(e.target.value)} required />
                       <input className="w-full p-2 border rounded" placeholder="Địa chỉ" value={newBranchAddr} onChange={e=>setNewBranchAddr(e.target.value)} required />
                       <button type="submit" className="w-full py-2 bg-brand-600 text-white font-bold rounded">Tạo Chi Nhánh</button>
                   </form>
               </div>
           </div>
       )}

       {/* STAFF TAB */}
       {activeTab === 'staff' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
               <div className="md:col-span-2 space-y-4">
                   <h3 className="font-bold text-lg">Danh sách Nhân viên</h3>
                   <div className="bg-white border rounded-xl overflow-hidden">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 font-bold">
                               <tr><th className="p-3">Tên</th><th className="p-3">SĐT</th><th className="p-3">Chi nhánh</th><th className="p-3 text-right">Thao tác</th></tr>
                           </thead>
                           <tbody className="divide-y">
                               {staffList.map(s => {
                                   const branch = branches.find(b => b.id === s.branch_id);
                                   return (
                                       <tr key={s.id}>
                                           <td className="p-3 font-medium">{s.name}</td>
                                           <td className="p-3">{s.phone}</td>
                                           <td className="p-3 text-gray-500">{branch?.name || 'Chưa phân'}</td>
                                           <td className="p-3 text-right">
                                               <button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:underline">Xóa</button>
                                           </td>
                                       </tr>
                                   )
                               })}
                           </tbody>
                       </table>
                   </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-xl h-fit">
                   <h3 className="font-bold text-lg mb-4">Thêm Nhân viên</h3>
                   <form onSubmit={handleCreateStaff} className="space-y-3">
                       <input className="w-full p-2 border rounded" placeholder="Họ tên" value={newStaffName} onChange={e=>setNewStaffName(e.target.value)} required />
                       <input className="w-full p-2 border rounded" placeholder="Số điện thoại" value={newStaffPhone} onChange={e=>setNewStaffPhone(e.target.value)} required />
                       <input className="w-full p-2 border rounded" placeholder="Mật khẩu" value={newStaffPass} onChange={e=>setNewStaffPass(e.target.value)} required />
                       <select className="w-full p-2 border rounded" value={newStaffBranch} onChange={e=>setNewStaffBranch(e.target.value)} required>
                           <option value="">Chọn chi nhánh làm việc</option>
                           {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                       </select>
                       <button type="submit" className="w-full py-2 bg-brand-600 text-white font-bold rounded">Thêm Nhân Viên</button>
                   </form>
               </div>
           </div>
       )}

       {/* TICKETS TAB */}
       {activeTab === 'tickets' && (
           <div className="space-y-4 animate-in fade-in">
               <div className="flex justify-between items-center">
                   <h3 className="font-bold text-lg">Quản lý Vé ({tickets.length})</h3>
                   <button onClick={() => setShowCreateTicketModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center font-bold text-sm">
                       <Plus size={16} className="mr-2"/> Tạo Vé Mới
                   </button>
               </div>
               <div className="bg-white border rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 font-bold text-gray-600">
                            <tr>
                                <th className="p-3">Mã Vé</th>
                                <th className="p-3">Khách Hàng</th>
                                <th className="p-3">Loại</th>
                                <th className="p-3">Sử Dụng</th>
                                <th className="p-3">Hết Hạn</th>
                                <th className="p-3 text-right">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tickets.map(t => (
                                <tr key={t.ticket_id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono font-bold text-brand-600">{t.ticket_id}</td>
                                    <td className="p-3">
                                        <div className="font-bold">{t.owner_name}</div>
                                        <div className="text-xs text-gray-500">{t.owner_phone}</div>
                                    </td>
                                    <td className="p-3">{t.type_label}</td>
                                    <td className="p-3 font-bold">{t.remaining_uses} / {t.total_uses}</td>
                                    <td className="p-3">{new Date(t.expires_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-right">
                                         <button onClick={() => handleDeleteTicket(t.ticket_id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               </div>
           </div>
       )}

       {/* LOGS TAB (REPORT) */}
       {activeTab === 'logs' && (
           <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Chi nhánh</label>
                            <select 
                                className="w-full p-2 border rounded-lg mt-1"
                                value={filterLogBranch}
                                onChange={e => setFilterLogBranch(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Từ ngày</label>
                             <input type="date" className="w-full p-2 border rounded-lg mt-1" value={filterStartDate} onChange={e=>setFilterStartDate(e.target.value)} />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Đến ngày</label>
                             <input type="date" className="w-full p-2 border rounded-lg mt-1" value={filterEndDate} onChange={e=>setFilterEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={loadLogs} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg flex items-center"><Filter size={16} className="mr-2"/> Lọc</button>
                    </div>
                </div>

                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 font-bold text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-3">Thời gian</th>
                                <th className="p-3">Khách hàng</th>
                                <th className="p-3">Loại Vé</th>
                                <th className="p-3">Chi Nhánh</th>
                                <th className="p-3">Hình thức</th>
                                <th className="p-3">Nhân viên</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Không có dữ liệu check-in nào.</td></tr>
                            )}
                            {logs.map(l => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="font-bold">{new Date(l.timestamp).toLocaleDateString('vi-VN')}</div>
                                        <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleTimeString('vi-VN')}</div>
                                    </td>
                                    <td className="p-3 font-medium">{l.user_name}</td>
                                    <td className="p-3 text-gray-600">{l.ticket_type}</td>
                                    <td className="p-3">{l.branch_name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                            l.method === 'MANUAL' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                            l.method === 'QR_RIENG' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            'bg-green-50 text-green-600 border-green-100'
                                        }`}>
                                            {l.method}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-500">{l.staff_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
           </div>
       )}

       {/* QR KIOSK TAB */}
       {activeTab === 'qr' && (
           <div className="animate-in fade-in">
               <h3 className="font-bold text-lg mb-4">Mã QR Check-in Kiosk</h3>
               <p className="text-gray-500 mb-6">In mã QR này và dán tại quầy lễ tân để khách tự check-in.</p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {branches.map(b => {
                       const link = `${window.location.origin}/#/checkin?shop_id=${b.id}`;
                       return (
                           <div key={b.id} className="bg-white p-6 rounded-xl border shadow-sm text-center">
                               <h4 className="font-bold text-brand-600 mb-4">{b.name}</h4>
                               <div className="bg-white inline-block p-2 border-2 border-black rounded mb-4">
                                   <QRCode value={link} size={150} />
                               </div>
                               <p className="text-xs text-gray-400 break-all mb-4">{link}</p>
                               <button onClick={() => window.print()} className="w-full py-2 bg-gray-100 font-bold rounded hover:bg-gray-200">In QR này</button>
                           </div>
                       )
                   })}
               </div>
           </div>
       )}

       {/* SETTINGS TAB */}
       {activeTab === 'settings' && (
           <div className="max-w-md animate-in fade-in">
               <h3 className="font-bold text-lg mb-4">Cài đặt Thương hiệu</h3>
               <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị thương hiệu</label>
                       <input 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500" 
                            placeholder="VD: Yoga An An"
                            value={brandNameInput}
                            onChange={e => setBrandNameInput(e.target.value)}
                        />
                   </div>
                   <button onClick={handleSaveBrand} className="w-full py-2 bg-brand-600 text-white font-bold rounded flex items-center justify-center">
                       <Save size={18} className="mr-2"/> Lưu Thay Đổi
                   </button>
               </div>
           </div>
       )}

       {/* CREATE TICKET MODAL (OWNER) */}
       {showCreateTicketModal && (
            <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl">{ticketMode === 'new' ? 'Tạo Khách & Vé Mới' : 'Tạo Vé Cho Khách'}</h3>
                        <button onClick={() => setShowCreateTicketModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                        <div className="flex gap-2 mb-4">
                            <button type="button" onClick={() => setTicketMode('existing')} className={`flex-1 py-2 border rounded ${ticketMode === 'existing' ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold' : ''}`}>Khách Cũ</button>
                            <button type="button" onClick={() => setTicketMode('new')} className={`flex-1 py-2 border rounded ${ticketMode === 'new' ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold' : ''}`}>Khách Mới</button>
                        </div>
                        
                        <input type="tel" placeholder="Số điện thoại (*)" required className="w-full p-3 border rounded-lg" value={targetPhone} onChange={e=>setTargetPhone(e.target.value)} />
                        
                        {ticketMode === 'new' && (
                            <div className="space-y-4 animate-in fade-in">
                                <input type="text" placeholder="Họ tên khách (*)" required className="w-full p-3 border rounded-lg" value={newCustName} onChange={e=>setNewCustName(e.target.value)} />
                                <input type="text" placeholder="PIN đăng nhập (4 số)" maxLength={4} required className="w-full p-3 border rounded-lg" value={newCustPin} onChange={e=>setNewCustPin(e.target.value)} />
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <label className="font-bold block mb-2">Loại Vé</label>
                            <select className="w-full p-3 border rounded-lg mb-2" value={ticketType} onChange={e=>setTicketType(e.target.value as TicketType)}>
                                <option value={TicketType.SESSION_12}>Gói 12 Buổi</option>
                                <option value={TicketType.SESSION_20}>Gói 20 Buổi</option>
                                <option value={TicketType.MONTHLY}>Gói Tháng</option>
                                <option value={TicketType.CUSTOM}>Tùy Chọn</option>
                            </select>
                             {ticketType === TicketType.CUSTOM && (
                                <input type="number" placeholder="Số buổi" className="w-full p-3 border rounded-lg mb-2" value={customSessions} onChange={e=>setCustomSessions(Number(e.target.value))} />
                            )}
                        </div>

                        <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg mt-6">Tạo Vé</button>
                    </form>
                </div>
            </div>
       )}

       {/* QR MODAL */}
       {qrModalData && (
             <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm text-center relative">
                    <button onClick={() => setQrModalData(null)} className="absolute top-2 right-2 p-2"><X/></button>
                    <h3 className="font-bold text-xl mb-1">{qrModalData.title}</h3>
                    <div className="bg-white p-2 border-4 border-brand-500 rounded-xl inline-block mb-6 mt-4">
                        <QRCode value={qrModalData.token} size={200} />
                    </div>
                    <button onClick={() => window.print()} className="w-full py-3 bg-gray-100 font-bold rounded-xl flex items-center justify-center"><Printer className="mr-2"/> In Ngay</button>
                </div>
             </div>
       )}

    </Layout>
  );
};

export default OwnerDashboard;
