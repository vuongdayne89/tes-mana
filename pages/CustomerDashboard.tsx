import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { UserRole, Ticket, CheckInLog } from '../types';
import { getTicketsByPhone, generateTicketToken, changePin, getSession, getMyHistory } from '../services/mockDb';
import TicketCard from '../components/TicketCard';
import { X, RefreshCw, Settings, Key, Clock, Calendar, Ticket as TicketIcon, History, MapPin, CheckCircle } from 'lucide-react';
import QRCode from "react-qr-code";

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getSession());
  const [activeTab, setActiveTab] = useState<'tickets' | 'history'>('tickets');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [historyLogs, setHistoryLogs] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  useEffect(() => {
    if (!user || user.role !== UserRole.CUSTOMER) {
        navigate('/login?role=CUSTOMER');
        return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
      if(!user) return;
      setLoading(true);
      const t = await getTicketsByPhone(user.phone);
      setTickets(t);
      const h = await getMyHistory(user.phone);
      setHistoryLogs(h);
      setLoading(false);
  };

  useEffect(() => {
    if (selectedTicket) {
      const updateToken = async () => {
        const token = await generateTicketToken(selectedTicket.ticket_id);
        setQrToken(token);
      };
      updateToken();
    }
  }, [selectedTicket]);

  const handleChangePin = async (e: React.FormEvent) => {
      e.preventDefault();
      setPinMsg('');
      if (!user) return;
      if (newPin.length !== 4 || isNaN(Number(newPin))) {
          setPinMsg('PIN phải có 4 số');
          return;
      }
      const res = await changePin(user.phone, oldPin, newPin);
      setPinMsg(res.message);
      if (res.success) {
          setOldPin('');
          setNewPin('');
          setTimeout(() => setShowSettings(false), 2000);
      }
  }

  if (!user) return null;

  return (
    <Layout role={UserRole.CUSTOMER} title="Hội Viên">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <TicketIcon size={120} className="text-brand-600" />
        </div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Xin chào, {user.name} 👋</h2>
                <p className="text-gray-500">Thành viên thân thiết</p>
            </div>
            <button 
                onClick={() => setShowSettings(true)} 
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 text-gray-600 transition-colors"
                title="Cài đặt tài khoản"
            >
                <Settings size={20} />
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-gray-200/50 rounded-xl mb-6 relative">
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 flex items-center justify-center py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === 'tickets' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
              <TicketIcon size={18} className="mr-2" /> Vé Của Tôi
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === 'history' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
              <History size={18} className="mr-2" /> Lịch Sử
          </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
          ) : (
              <>
                {/* TICKETS TAB */}
                {activeTab === 'tickets' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Danh sách vé hiện có ({tickets.length})</span>
                            <button onClick={loadData} className="text-brand-600 hover:text-brand-700 p-1 rounded-full hover:bg-brand-50"><RefreshCw size={16}/></button>
                        </div>
                        
                        {tickets.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <TicketIcon className="mx-auto text-gray-300 mb-3" size={48} />
                                <p className="text-gray-500 font-medium">Bạn chưa có vé nào.</p>
                                <p className="text-sm text-gray-400">Vui lòng liên hệ nhân viên để mua vé.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tickets.map(ticket => (
                                    <TicketCard 
                                        key={ticket.ticket_id} 
                                        ticket={ticket} 
                                        onClick={() => setSelectedTicket(ticket)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4 px-1">
                             <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Nhật ký sử dụng</span>
                             <button onClick={loadData} className="text-brand-600 hover:text-brand-700 p-1 rounded-full hover:bg-brand-50"><RefreshCw size={16}/></button>
                        </div>

                        {historyLogs.length === 0 ? (
                             <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <History className="mx-auto text-gray-300 mb-3" size={48} />
                                <p className="text-gray-500 font-medium">Chưa có lịch sử check-in.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {historyLogs.map((log, index) => (
                                    <div key={log.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${index !== historyLogs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-4">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{new Date(log.timestamp).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                                    <Clock size={12} className="mr-1" /> {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-gray-700">{log.ticket_id}</div>
                                            <div className="text-xs text-gray-500 flex items-center justify-end mt-1">
                                                <MapPin size={12} className="mr-1" /> {log.branch_id}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
              </>
          )}
      </div>

      {/* QR MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            <div className="p-8 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Vé Điện Tử</span>
              <h3 className="font-bold text-2xl mb-1 text-gray-900">{selectedTicket.type_label || selectedTicket.type}</h3>
              <p className="text-gray-400 text-sm mb-8 font-mono">{selectedTicket.ticket_id}</p>
              
              <div className="bg-white p-4 rounded-2xl border-2 border-brand-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] mb-8 relative">
                 {qrToken ? (
                     <div className="flex flex-col items-center justify-center">
                        <QRCode value={qrToken} size={200} />
                     </div>
                 ) : (
                     <div className="w-[200px] h-[200px] bg-gray-50 flex items-center justify-center rounded-lg text-gray-400 text-sm">Đang tạo mã...</div>
                 )}
                 <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-3 text-xs font-bold text-brand-600">QUÉT ĐỂ CHECK-IN</div>
              </div>

              <div className="w-full bg-brand-50 rounded-xl p-4 flex justify-between items-center text-sm">
                  <span className="text-gray-600">Còn lại</span>
                  <span className="font-bold text-brand-700 text-lg">{selectedTicket.remaining_uses} <span className="text-xs font-normal text-gray-500">buổi</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-2xl w-full max-w-xs p-6 relative animate-in zoom-in-95 shadow-xl">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
                <h3 className="font-bold text-lg mb-6 flex items-center text-gray-800"><Key className="mr-2 text-brand-600" size={20} /> Đổi mã PIN</h3>
                <form onSubmit={handleChangePin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">PIN Hiện tại</label>
                        <input 
                            type="password"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-center font-bold tracking-widest text-xl" 
                            value={oldPin} onChange={e => setOldPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">PIN Mới (4 số)</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-center font-bold tracking-widest text-xl"
                            value={newPin} onChange={e => setNewPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-200 transition-all mt-2">Cập nhật PIN</button>
                    {pinMsg && <p className={`text-center text-sm font-medium mt-2 ${pinMsg.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>{pinMsg}</p>}
                </form>
             </div>
          </div>
      )}
    </Layout>
  );
};

export default CustomerDashboard;