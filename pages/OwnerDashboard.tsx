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
import QRCode from "react-qr-code";

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
            <StatCard icon={<Activity className="