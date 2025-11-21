import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Ticket, AuditLog, TicketType, User } from '../types';
import { 
  getAllTickets, getDashboardStats, createTicket, toggleTicketLock, 
  resetPin, getAuditLogs, exportData, getStaffUsers, addStaff, removeStaff, updateTicket, BRANCHES, generateDayPassToken, generateStaticTicketQR 
} from '../services/mockDb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Users, CreditCard, AlertTriangle, Activity, Lock, Unlock, Key, 
  FileDown, Plus, Search, Briefcase, Trash2, Edit, QrCode, X, Printer 
} from 'lucide-react';

const OwnerDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'tickets' | 'staff' | 'logs'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [qrModalData, setQrModalData] = useState<{token: string, ticket: Ticket, title: string, subtitle?: string} | null>(null);
  
  const [newTicketPhone, setNewTicketPhone] = useState('');
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketType, setNewTicketType] = useState(TicketType.SESSION_12);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('anan1');

  const loadData = async () => {
    getDashboardStats().then(setStats);
    getAllTickets().then(setTickets);
    getAuditLogs().then(setAuditLogs);
    getStaffUsers().then(setStaff);
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  const chartData = [
    { name: 'T2', checkins: 12 },
    { name: 'T3', checkins: 19 },
    { name: 'T4', checkins: 15 },
    { name: 'T5', checkins: 22 },
    { name: 'T6', checkins: 30 },
    { name: 'T7', checkins: 45 },
    { name: 'CN', checkins: 40 },
  ];

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket = await createTicket({ 
        owner_phone: newTicketPhone, 
        owner_name: newTicketName,
        type: newTicketType,
    }, 'owner1');

    setShowCreateModal(false);
    setNewTicketPhone('');
    setNewTicketName('');
    
    if (newTicket) {
        const token = await generateStaticTicketQR(newTicket);
        setQrModalData({
            token,
            ticket: newTicket,
            title: "THẺ THÀNH VIÊN (IN)",
            subtitle: "Mã QR cố định cho khách"
        });
        loadData();
    }
  };

  const handleEditTicketClick = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowEditModal(true);
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    await updateTicket(editingTicket.ticket_id, { 
        remaining_uses: editingTicket.remaining_uses,
        expires_at: editingTicket.expires_at
    }, 'owner1');
    setShowEditModal(false);
    setEditingTicket(null);
    loadData();
  };

  const handleLock = async (id: string) => {
    await toggleTicketLock(id, 'owner1');
    loadData();
  };

  const handleResetPin = async (phone: string) => {
    if(confirm(`Reset PIN của ${phone} về 1234?`)) {
      await resetPin(phone, 'owner1');
      alert('Đã reset PIN thành 1234');
      loadData();
    }
  };
  
  const handleShowDayPass = async (ticket: Ticket) => {
      const token = await generateDayPassToken(ticket.ticket_id);
      setQrModalData({
          token,
          ticket,
          title: "QR TRONG NGÀY",
          subtitle: `Hạn dùng: ${new Date().toLocaleDateString('vi-VN')}`
      });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await addStaff({ name: newStaffName, phone: newStaffPhone, branch_id: newStaffBranch }, 'owner1');
    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffPhone('');
    loadData();
  };

  const handleRemoveStaff = async (id: string) => {
    if(confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      await removeStaff(id, 'owner1');
      loadData();
    }
  };

  if (!stats) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <Layout role={UserRole.OWNER} title="Dashboard Quản Trị">
       <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1 overflow-x-auto">
        <button onClick={() => setActiveView('overview')} className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'overview' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>Tổng quan</button>
        <button onClick={() => setActiveView('tickets')} className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'tickets' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>Quản lý Vé</button>
        <button onClick={() => setActiveView('staff')} className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'staff' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>Nhân viên</button>
        <button onClick={() => setActiveView('logs')} className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'logs' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>Báo cáo</button>
      </div>

      {activeView === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Activity className="text-blue-600" />} label="Lượt check-in" value={stats.totalCheckins} color="bg-blue-50" />
            <StatCard icon={<Users className="text-green-600" />} label="Vé đang hoạt động" value={stats.activeTickets} color="bg-green-50" />
            <StatCard icon={<CreditCard className="text-purple-600" />} label="Khách hôm nay" value={stats.todayCheckins} color="bg-purple-50" />
            <StatCard icon={<AlertTriangle className="text-orange-600" />} label="Sắp hết hạn" value={stats.expiringSoon} color="bg-orange-50" />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Biểu đồ khách tập trong tuần</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="checkins" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      )}

      {activeView === 'tickets' && (
         <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
                 <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input type="text" placeholder="Tìm SĐT..." className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm" />
                 </div>
                 <button onClick={() => setShowCreateModal(true)} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold"><Plus size={16} className="mr-2" /> Tạo Vé Mới</button>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                        <th className="px-6 py-3">ID Vé</th>
                        <th className="px-6 py-3">Khách Hàng</th>
                        <th className="px-6 py-3">Loại</th>
                        <th className="px-6 py-3">Còn lại</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        <th className="px-6 py-3 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map(t => (
                        <tr key={t.ticket_id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{t.ticket_id}</td>
                            <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{t.owner_name}</div>
                                <div className="text-xs text-gray-500">{t.owner_phone}</div>
                            </td>
                            <td className="px-6 py-4 uppercase">{t.type_label || t.type}</td>
                            <td className="px-6 py-4">{t.remaining_uses} / {t.total_uses}</td>
                            <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'locked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                {t.status}
                            </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                                <button onClick={() => handleShowDayPass(t)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded" title="QR Ngày"><QrCode size={16} /></button>
                                <button onClick={() => handleEditTicketClick(t)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded" title="Sửa Vé"><Edit size={16} /></button>
                                <button onClick={() => handleLock(t.ticket_id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">{t.status === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}</button>
                                <button onClick={() => handleResetPin(t.owner_phone)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Reset PIN"><Key size={16} /></button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
         </div>
      )}

      {activeView === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-end">
                 <button onClick={() => setShowAddStaffModal(true)} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold"><Plus size={16} className="mr-2" /> Thêm Nhân Viên</button>
             </div>
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                        <th className="px-6 py-3">Tên</th>
                        <th className="px-6 py-3">SĐT</th>
                        <th className="px-6 py-3">Vai trò</th>
                        <th className="px-6 py-3">Chi nhánh</th>
                        <th className="px-6 py-3 text-right">Xóa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(s => (
                        <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                <div className="p-1 bg-gray-100 rounded-full mr-2"><Briefcase size={14}/></div>
                                {s.name}
                            </td>
                            <td className="px-6 py-4">{s.phone}</td>
                            <td className="px-6 py-4 uppercase">{s.role}</td>
                            <td className="px-6 py-4">{BRANCHES.find(b => b.id === s.branch_id)?.name || s.branch_id}</td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => handleRemoveStaff(s.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
        </div>
      )}
      
       {qrModalData && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-xs relative p-6 text-center">
                    <button onClick={() => setQrModalData(null)} className="absolute top-3 right-3 p-1 bg-gray-100 rounded-full"><X size={20} /></button>
                    <h3 className="font-bold text-lg text-brand-600 mb-1">{qrModalData.title}</h3>
                    <p className="text-sm text-gray-700 mb-4">{qrModalData.subtitle}</p>
                    <div className="bg-white border-2 border-brand-500 p-2 rounded-xl mb-4 inline-block">
                        <QrCode size={150} />
                        <div className="text-[8px] text-gray-400 break-all h-8 overflow-hidden">{qrModalData.token.substring(0,50)}...</div>
                    </div>
                    <button onClick={() => window.print()} className="w-full py-2 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                        <Printer size={16} className="mr-2" /> In Mã
                    </button>
                </div>
            </div>
        )}
    </Layout>
  );
};

const StatCard: React.FC<{icon: React.ReactNode, label: string, value: number, color: string}> = ({ icon, label, value, color }) => (
  <div className={`${color} p-4 rounded-xl border border-transparent hover:border-gray-200 transition-colors`}>
    <div className="flex items-center justify-between mb-2">{icon}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-600 font-medium">{label}</div>
  </div>
);

export default OwnerDashboard;