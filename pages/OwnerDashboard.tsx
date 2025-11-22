
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Ticket, AuditLog, TicketType, User, CustomerDetail } from '../types';
import { 
  getAllTickets, getDashboardStats, createTicket, toggleTicketLock, 
  resetPin, getAuditLogs, exportData, getStaffUsers, addStaff, removeStaff, updateTicket, BRANCHES, generateDayPassToken, generateStaticTicketQR, getCustomerFullDetails
} from '../services/mockDb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Users, CreditCard, AlertTriangle, Activity, Lock, Unlock, Key, 
  FileDown, Plus, Search, Briefcase, Trash2, Edit, QrCode, X, Printer, Clock 
} from 'lucide-react';
import QRCode from "react-qr-code";

// Define StatCard component
const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-xs uppercase font-bold">{label}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        </div>
    </div>
);

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
  
  const [searchPhone, setSearchPhone] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<CustomerDetail | null>(null);

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

  const handleSearchCustomer = async () => {
      if(!searchPhone) return;
      const details = await getCustomerFullDetails(searchPhone);
      if(details) setViewingCustomer(details);
      else alert('Không tìm thấy khách hàng');
  };

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

      {/* CUSTOMER DETAIL VIEW MODAL */}
      {viewingCustomer && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-xl p-6 max-h-[90vh] overflow-y-auto relative">
                    <button onClick={() => setViewingCustomer(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                    <div className="flex items-center mb-6 border-b pb-4">
                        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mr-4">
                            <Users size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{viewingCustomer.user.name}</h2>
                            <p className="text-gray-500 font-mono">{viewingCustomer.user.phone}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <h3 className="font-bold text-gray-700 mb-3">Danh sách vé</h3>
                            {viewingCustomer.tickets.map(t => (
                                <div key={t.ticket_id} className="border p-3 rounded-lg mb-2 bg-gray-50">
                                    <div className="flex justify-between font-bold">
                                        <span>{t.type_label || t.type}</span>
                                        <span className={t.remaining_uses > 0 ? 'text-green-600' : 'text-red-500'}>{t.remaining_uses > 0 ? 'Active' : 'Expired'}</span>
                                    </div>
                                    <div className="text-sm">Còn: {t.remaining_uses} | Hết hạn: {new Date(t.expires_at).toLocaleDateString('vi-VN')}</div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3">Lịch sử check-in</h3>
                            {viewingCustomer.logs.slice(0, 10).map(l => (
                                <div key={l.id} className="text-sm p-2 border-b flex justify-between">
                                    <span>{new Date(l.timestamp).toLocaleString('vi-VN')}</span>
                                    <span className={l.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      {activeView === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Activity className="text-blue-600"/>} label="Lượt check-in" value={stats.todayCheckins} color="bg-blue-100" />
                <StatCard icon={<Users className="text-green-600"/>} label="Vé Hoạt Động" value={stats.activeTickets} color="bg-green-100" />
                <StatCard icon={<AlertTriangle className="text-orange-600"/>} label="Sắp hết hạn" value={stats.expiringSoon} color="bg-orange-100" />
                <StatCard icon={<CreditCard className="text-purple-600"/>} label="Tổng Lượt" value={stats.totalCheckins} color="bg-purple-100" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-4">Biểu đồ check-in tuần</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="checkins" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {activeView === 'tickets' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-gray-700">Danh sách vé ({tickets.length})</h3>
                      <div className="relative">
                          <input 
                            type="text" placeholder="Tìm SĐT khách..." 
                            className="pl-8 pr-2 py-1 border rounded text-sm"
                            value={searchPhone} onChange={e => setSearchPhone(e.target.value)}
                          />
                          <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                      </div>
                      <button onClick={handleSearchCustomer} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">Xem Chi Tiết</button>
                  </div>
                  <button onClick={() => setShowCreateModal(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-brand-700">
                      <Plus size={18} className="mr-2" /> Tạo Vé Mới
                  </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                          <tr>
                              <th className="p-4">ID</th>
                              <th className="p-4">Khách hàng</th>
                              <th className="p-4">Loại Vé</th>
                              <th className="p-4">Còn lại</th>
                              <th className="p-4">Hết hạn</th>
                              <th className="p-4">Trạng thái</th>
                              <th className="p-4 text-right">Thao tác</th>
                          </tr>
                      </thead>
                      <tbody>
                          {tickets.map(t => (
                              <tr key={t.ticket_id} className="border-b hover:bg-gray-50">
                                  <td className="p-4 font-mono">{t.ticket_id}</td>
                                  <td className="p-4">
                                      <div className="font-bold">{t.owner_name}</div>
                                      <div className="text-gray-400 text-xs">{t.owner_phone}</div>
                                  </td>
                                  <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{t.type_label}</span></td>
                                  <td className="p-4 font-bold">{t.remaining_uses}</td>
                                  <td className="p-4 text-xs">{new Date(t.expires_at).toLocaleDateString('vi-VN')}</td>
                                  <td className="p-4">
                                      {t.status === 'active' 
                                        ? <span className="text-green-600 font-bold text-xs">Hoạt động</span> 
                                        : <span className="text-red-600 font-bold text-xs">Đã khóa</span>
                                      }
                                  </td>
                                  <td className="p-4 flex justify-end space-x-2">
                                      <button onClick={() => handleShowDayPass(t)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="QR Ngày"><QrCode size={16} /></button>
                                      <button onClick={() => handleEditTicketClick(t)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Sửa"><Edit size={16} /></button>
                                      <button onClick={() => handleLock(t.ticket_id)} className={`p-2 rounded ${t.status === 'active' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                          {t.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                                      </button>
                                      <button onClick={() => handleResetPin(t.owner_phone)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reset PIN"><Key size={16} /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeView === 'staff' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Nhân viên ({staff.length})</h3>
                  <button onClick={() => setShowAddStaffModal(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-brand-700">
                      <Plus size={18} className="mr-2" /> Thêm Nhân viên
                  </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                          <tr>
                              <th className="p-4">Tên</th>
                              <th className="p-4">SĐT</th>
                              <th className="p-4">Chi nhánh</th>
                              <th className="p-4 text-right">Thao tác</th>
                          </tr>
                      </thead>
                      <tbody>
                          {staff.map(s => (
                              <tr key={s.id} className="border-b hover:bg-gray-50">
                                  <td className="p-4 font-bold">{s.name}</td>
                                  <td className="p-4">{s.phone}</td>
                                  <td className="p-4">{s.branch_id}</td>
                                  <td className="p-4 text-right">
                                      <button onClick={() => handleRemoveStaff(s.id)} className="text-red-500 hover:underline flex items-center justify-end ml-auto">
                                          <Trash2 size={16} className="mr-1" /> Xóa
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeView === 'logs' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Nhật ký hệ thống</h3>
                  <button className="flex items-center text-gray-500 hover:text-brand-600">
                      <FileDown size={18} className="mr-1" /> Xuất Excel
                  </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-y-auto max-h-[500px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs sticky top-0">
                            <tr>
                                <th className="p-4">Thời gian</th>
                                <th className="p-4">Hành động</th>
                                <th className="p-4">Chi tiết</th>
                                <th className="p-4">Người thực hiện</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(log => (
                                <tr key={log.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-bold">{log.action}</td>
                                    <td className="p-4">{log.details}</td>
                                    <td className="p-4 text-xs bg-gray-50 rounded inline-block m-2">{log.performer_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Tạo vé mới</h3>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                      <input type="text" placeholder="Tên khách hàng" required className="w-full p-2 border rounded" value={newTicketName} onChange={e => setNewTicketName(e.target.value)} />
                      <input type="tel" placeholder="Số điện thoại" required className="w-full p-2 border rounded" value={newTicketPhone} onChange={e => setNewTicketPhone(e.target.value)} />
                      <select className="w-full p-2 border rounded" value={newTicketType} onChange={e => setNewTicketType(e.target.value as TicketType)}>
                          <option value={TicketType.SESSION_12}>Gói 12 Buổi</option>
                          <option value={TicketType.SESSION_20}>Gói 20 Buổi</option>
                          <option value={TicketType.MONTHLY}>Gói Tháng</option>
                      </select>
                      <div className="flex justify-end space-x-2 pt-4">
                          <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Tạo Vé</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showAddStaffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Thêm nhân viên</h3>
                  <form onSubmit={handleAddStaff} className="space-y-4">
                      <input type="text" placeholder="Tên nhân viên" required className="w-full p-2 border rounded" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                      <input type="tel" placeholder="Số điện thoại" required className="w-full p-2 border rounded" value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} />
                      <select className="w-full p-2 border rounded" value={newStaffBranch} onChange={e => setNewStaffBranch(e.target.value)}>
                          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <div className="flex justify-end space-x-2 pt-4">
                          <button type="button" onClick={() => setShowAddStaffModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Thêm</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showEditModal && editingTicket && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Chỉnh sửa vé: {editingTicket.ticket_id}</h3>
                  <form onSubmit={handleUpdateTicket} className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-500">Số buổi còn lại</label>
                          <input 
                            type="number" 
                            className="w-full p-2 border rounded" 
                            value={editingTicket.remaining_uses} 
                            onChange={e => setEditingTicket({...editingTicket, remaining_uses: Number(e.target.value)})} 
                          />
                      </div>
                       <div>
                          <label className="text-xs text-gray-500">Hạn sử dụng</label>
                          <input 
                            type="datetime-local" 
                            className="w-full p-2 border rounded" 
                            value={new Date(editingTicket.expires_at).toISOString().slice(0, 16)} 
                            onChange={e => setEditingTicket({...editingTicket, expires_at: new Date(e.target.value).toISOString()})} 
                          />
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-4">
                          <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Lưu Thay Đổi</button>
                      </div>
                  </form>
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
                        <QRCode value={qrModalData.token} size={150} />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">ID: {qrModalData.ticket.ticket_id}</p>
                    <button onClick={() => window.print()} className="w-full py-2 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                        <Printer size={16} className="mr-2" /> In Mã
                    </button>
                </div>
            </div>
        )}
    </Layout>
  );
};

export default OwnerDashboard;
