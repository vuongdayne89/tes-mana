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
  
  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  
  // QR Modal State (Shared)
  const [qrModalData, setQrModalData] = useState<{token: string, ticket: Ticket, title: string, subtitle?: string} | null>(null);
  
  // Form States
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

  // Mock chart data
  const chartData = [
    { name: 'Mon', checkins: 12 },
    { name: 'Tue', checkins: 19 },
    { name: 'Wed', checkins: 15 },
    { name: 'Thu', checkins: 22 },
    { name: 'Fri', checkins: 30 },
    { name: 'Sat', checkins: 45 },
    { name: 'Sun', checkins: 40 },
  ];

  // --- TICKET ACTIONS ---
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket = await createTicket({ 
        owner_phone: newTicketPhone, 
        owner_name: newTicketName,
        type: newTicketType, 
        total_uses: newTicketType === '12-buoi' ? 12 : 20 
    }, 'owner1');

    setShowCreateModal(false);
    setNewTicketPhone('');
    setNewTicketName('');
    
    if (newTicket) {
        // Show Fixed QR immediately
        const token = await generateStaticTicketQR(newTicket);
        setQrModalData({
            token,
            ticket: newTicket,
            title: "MEMBERSHIP CARD",
            subtitle: "Fixed QR - Print for Customer"
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
    if(confirm(`Reset PIN for ${phone} to 1234?`)) {
      await resetPin(phone, 'owner1');
      alert('PIN reset to 1234');
      loadData();
    }
  };
  
  const handleShowDayPass = async (ticket: Ticket) => {
      const token = await generateDayPassToken(ticket.ticket_id);
      setQrModalData({
          token,
          ticket,
          title: "DAY PASS",
          subtitle: `Valid: ${new Date().toLocaleDateString()}`
      });
  };

  // --- STAFF ACTIONS ---
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await addStaff({ name: newStaffName, phone: newStaffPhone, branch_id: newStaffBranch }, 'owner1');
    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffPhone('');
    loadData();
  };

  const handleRemoveStaff = async (id: string) => {
    if(confirm('Are you sure you want to remove this staff member?')) {
      await removeStaff(id, 'owner1');
      loadData();
    }
  };

  const handleExport = async (type: 'logs' | 'tickets') => {
      const res = await exportData(type, 'owner1');
      alert(`Export generated: ${res.url}`);
      loadData(); // Update logs
  }

  if (!stats) return <div className="p-8 text-center">Loading...</div>;

  return (
    <Layout role={UserRole.OWNER} title="Owner Dashboard">
       {/* Sub Navigation */}
       <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1 overflow-x-auto">
        <button 
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'overview' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}
        >
            Overview
        </button>
        <button 
            onClick={() => setActiveView('tickets')}
            className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'tickets' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}
        >
            Tickets
        </button>
        <button 
            onClick={() => setActiveView('staff')}
            className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'staff' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}
        >
            Staff Management
        </button>
        <button 
            onClick={() => setActiveView('logs')}
            className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeView === 'logs' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}
        >
            Logs & Export
        </button>
      </div>

      {/* OVERVIEW VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Activity className="text-blue-600" />} label="Total Check-ins" value={stats.totalCheckins} color="bg-blue-50" />
            <StatCard icon={<Users className="text-green-600" />} label="Active Tickets" value={stats.activeTickets} color="bg-green-50" />
            <StatCard icon={<CreditCard className="text-purple-600" />} label="Today's Visits" value={stats.todayCheckins} color="bg-purple-50" />
            <StatCard icon={<AlertTriangle className="text-orange-600" />} label="Expiring Soon" value={stats.expiringSoon} color="bg-orange-50" />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Check-in Trends</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Bar dataKey="checkins" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      )}

      {/* TICKETS VIEW */}
      {activeView === 'tickets' && (
         <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
                 <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input type="text" placeholder="Search phone..." className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm" />
                 </div>
                 <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold"
                 >
                     <Plus size={16} className="mr-2" /> New Ticket
                 </button>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                        <th className="px-6 py-3">Ticket ID</th>
                        <th className="px-6 py-3">Owner</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Sessions</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
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
                            <td className="px-6 py-4 uppercase">{t.type}</td>
                            <td className="px-6 py-4">{t.remaining_uses} / {t.total_uses}</td>
                            <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                t.status === 'active' ? 'bg-green-100 text-green-700' : 
                                t.status === 'locked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {t.status}
                            </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                                <button 
                                    onClick={() => handleShowDayPass(t)}
                                    className="p-1.5 hover:bg-purple-100 text-purple-600 rounded" title="Day Pass QR"
                                >
                                    <QrCode size={16} />
                                </button>
                                <button 
                                    onClick={() => handleEditTicketClick(t)}
                                    className="p-1.5 hover:bg-blue-100 text-blue-600 rounded" title="Edit Ticket"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleLock(t.ticket_id)}
                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500" 
                                    title={t.status === 'locked' ? "Unlock" : "Lock"}
                                >
                                    {t.status === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}
                                </button>
                                <button 
                                    onClick={() => handleResetPin(t.owner_phone)}
                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Reset PIN"
                                >
                                    <Key size={16} />
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
         </div>
      )}

      {/* STAFF VIEW */}
      {activeView === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-end">
                 <button 
                    onClick={() => setShowAddStaffModal(true)}
                    className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold"
                 >
                     <Plus size={16} className="mr-2" /> Add Staff
                 </button>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Branch</th>
                        <th className="px-6 py-3 text-right">Actions</th>
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
                                <button 
                                    onClick={() => handleRemoveStaff(s.id)}
                                    className="p-1.5 hover:bg-red-100 text-red-600 rounded" title="Remove Staff"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                        ))}
                        {staff.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">No staff members found</td></tr>
                        )}
                    </tbody>
                 </table>
             </div>
        </div>
      )}

      {/* LOGS VIEW */}
      {activeView === 'logs' && (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex space-x-4">
                <button onClick={() => handleExport('logs')} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    <FileDown size={16} className="mr-2 text-gray-500" /> Export Audit Logs
                </button>
                <button onClick={() => handleExport('tickets')} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    <FileDown size={16} className="mr-2 text-gray-500" /> Export Tickets
                </button>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100">
                     <h3 className="font-bold text-gray-800">System Audit Logs</h3>
                 </div>
                 <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Performer</th>
                            <th className="px-6 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(log => (
                            <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{log.action}</td>
                                <td className="px-6 py-4">{log.performer_id}</td>
                                <td className="px-6 py-4 text-gray-600">{log.details}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">Create New Ticket</h3>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Customer Phone</label>
                        <input required type="tel" className="w-full border rounded p-2" value={newTicketPhone} onChange={e => setNewTicketPhone(e.target.value)} placeholder="09..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Customer Name</label>
                        <input required type="text" className="w-full border rounded p-2" value={newTicketName} onChange={e => setNewTicketName(e.target.value)} placeholder="Nguyen Van A" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Ticket Type</label>
                        <select className="w-full border rounded p-2" value={newTicketType} onChange={e => setNewTicketType(e.target.value as TicketType)}>
                            <option value={TicketType.SESSION_12}>12 Sessions</option>
                            <option value={TicketType.SESSION_20}>20 Sessions</option>
                            <option value={TicketType.MONTHLY}>Monthly</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Create</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && editingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">Edit Ticket {editingTicket.ticket_id}</h3>
                <form onSubmit={handleUpdateTicket} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Remaining Sessions</label>
                        <input 
                            required type="number" 
                            className="w-full border rounded p-2" 
                            value={editingTicket.remaining_uses} 
                            onChange={e => setEditingTicket({...editingTicket, remaining_uses: parseInt(e.target.value)})} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Expires At</label>
                        <input 
                            required type="datetime-local" 
                            className="w-full border rounded p-2" 
                            value={editingTicket.expires_at.slice(0,16)} 
                            onChange={e => setEditingTicket({...editingTicket, expires_at: new Date(e.target.value).toISOString()})} 
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">Add New Staff</h3>
                <form onSubmit={handleAddStaff} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input required type="text" className="w-full border rounded p-2" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input required type="tel" className="w-full border rounded p-2" value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Branch</label>
                        <select className="w-full border rounded p-2" value={newStaffBranch} onChange={e => setNewStaffBranch(e.target.value)}>
                            {BRANCHES.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={() => setShowAddStaffModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Add Staff</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
       {/* QR Modal (Shared for Day Pass and Membership Card) */}
       {qrModalData && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden relative animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => setQrModalData(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="p-6 flex flex-col items-center text-center">
                  <h3 className="font-bold text-lg mb-1 text-brand-600">{qrModalData.title}</h3>
                  <p className="font-medium text-gray-900">{qrModalData.ticket.owner_name}</p>
                  <p className="text-gray-500 text-sm mb-2">{qrModalData.ticket.ticket_id}</p>
                  <p className="text-xs bg-gray-100 px-2 py-1 rounded mb-4">{qrModalData.ticket.type}</p>
                  
                  <div className="bg-white p-4 rounded-xl border-2 border-brand-500 shadow-lg mb-6">
                     <div className="w-48 h-48 bg-gray-900 flex flex-col items-center justify-center text-white text-[10px] break-all p-2 overflow-hidden">
                        <QrCode size={48} className="mb-2" />
                        <span className="mt-1 font-mono leading-none opacity-70" style={{fontSize: '8px', lineHeight: '10px', wordBreak: 'break-all'}}>
                            {qrModalData.token.substring(0, 150)}...
                        </span>
                     </div>
                  </div>
    
                  <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium w-full">
                    {qrModalData.subtitle || `Valid: ${new Date().toLocaleDateString()}`}
                  </div>
                  
                   <button onClick={() => window.print()} className="flex items-center justify-center mt-4 text-brand-600 text-sm font-bold">
                       <Printer size={16} className="mr-2"/> Print
                   </button>
                </div>
              </div>
          </div>
       )}

    </Layout>
  );
};

const StatCard: React.FC<{icon: React.ReactNode, label: string, value: number, color: string}> = ({ icon, label, value, color }) => (
  <div className={`${color} p-4 rounded-xl border border-transparent hover:border-gray-200 transition-colors`}>
    <div className="flex items-center justify-between mb-2">
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-600 font-medium">{label}</div>
  </div>
);

export default OwnerDashboard;