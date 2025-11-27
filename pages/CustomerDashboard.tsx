
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { UserRole, Ticket, CheckInLog } from '../types';
import { getTicketsByPhone, generateTicketToken, changePin, getSession, getMyHistory } from '../services/mockDb';
import { X, KeyRound, Printer } from 'lucide-react';
import QRCode from "react-qr-code";

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getSession());
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [historyLogs, setHistoryLogs] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  // Pagination for history
  const [showFullHistory, setShowFullHistory] = useState(false);

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

  // Get Primary Active Ticket (Logically the one expiring soonest or first found)
  const activeTicket = tickets.find(t => t.status === 'active' && t.remaining_uses > 0) || tickets[0];

  if (!user) return null;

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

  return (
    <Layout role={UserRole.CUSTOMER} title="Hồ Sơ Thành Viên">
      <div className="max-w-md mx-auto bg-white p-8 shadow-xl border border-gray-200 min-h-[600px] font-mono text-gray-800 relative mt-4">
        
        {/* Paper texture effect (optional visual) */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 to-white opacity-50"></div>

        {/* HEADER */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">
                {user.tenantName || 'ONIN PLATFORM'}
            </h1>
            <p className="text-sm text-gray-500 uppercase">Chi Nhánh: {user.branch_id || 'Chính'}</p>
            <p className="text-xs text-gray-400 mt-1">----------------------------------------</p>
        </div>

        {/* GREETING */}
        <div className="mb-8">
            <p className="text-red-600 font-bold text-xl">Xin chào, {user.name}</p>
        </div>

        {/* TICKET INFO */}
        <div className="mb-8">
            <h3 className="font-bold border-b-2 border-dashed border-gray-800 inline-block mb-4 pb-1">
                Thông Tin Dịch Vụ
            </h3>
            
            {loading ? (
                <p>Đang tải...</p>
            ) : activeTicket ? (
                <div 
                    onClick={() => setSelectedTicket(activeTicket)}
                    className="cursor-pointer group hover:bg-gray-50 -mx-4 px-4 py-2 transition-colors rounded"
                >
                    <div className="flex justify-between mb-1">
                        <span className="font-bold">Gói của bạn:</span>
                        <span>{activeTicket.type_label || activeTicket.type}</span>
                    </div>
                    <div className="flex justify-between mb-1 text-sm">
                        <span>Ngày khởi tạo:</span>
                        <span>{formatDate(activeTicket.created_at)}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-sm">
                        <span>Hết hạn:</span>
                        <span className="text-red-500">{formatDate(activeTicket.expires_at)}</span>
                    </div>

                    <div className="border-b-2 border-dashed border-gray-300 mb-4 group-hover:border-gray-400"></div>

                    <div className="flex justify-between items-center mb-2">
                        <span>Đã check-in:</span>
                        <span className="font-bold text-lg">{activeTicket.total_uses - activeTicket.remaining_uses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold uppercase">Buổi còn lại:</span>
                        <span className="font-bold text-3xl text-brand-600">{activeTicket.remaining_uses}</span>
                    </div>
                    <div className="text-center mt-4 text-xs text-gray-400 group-hover:text-brand-600">
                        [ Bấm vào đây để lấy mã QR ]
                    </div>
                </div>
            ) : (
                <p className="text-gray-500 italic">Bạn chưa có gói dịch vụ nào.</p>
            )}
        </div>

        <div className="border-b-2 border-dashed border-gray-300 mb-8"></div>

        {/* HISTORY */}
        <div className="mb-10">
            <div className="text-center mb-4">
                <span className="font-bold text-sm bg-gray-100 px-2 py-1 rounded">
                    [ XEM LỊCH SỬ SỬ DỤNG ]
                </span>
            </div>
            
            <div className="space-y-2 text-sm">
                {historyLogs.length === 0 && <p className="text-center text-gray-400 italic">Chưa có dữ liệu.</p>}
                
                {(showFullHistory ? historyLogs : historyLogs.slice(0, 5)).map((log, idx) => (
                    <div key={log.id} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
                        <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                        <span>{new Date(log.timestamp).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}</span>
                        <span className="uppercase text-xs font-bold text-gray-600">Check-in</span>
                    </div>
                ))}
                
                {historyLogs.length > 5 && (
                    <button 
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="w-full text-center text-xs text-brand-600 mt-2 hover:underline"
                    >
                        {showFullHistory ? "Thu gọn" : "Xem thêm..."}
                    </button>
                )}
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto pt-6 border-t-2 border-dashed border-gray-300 text-center space-y-3">
             <button 
                onClick={() => setShowSettings(true)}
                className="text-sm font-bold text-gray-600 hover:text-black hover:underline"
             >
                [ ĐỔI MÃ PIN ]
             </button>
             
             <div className="text-xs text-gray-300 pt-4">
                {user.id} • ONIN Platform
             </div>
        </div>

      </div>

      {/* QR MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-6 w-full max-w-sm text-center relative shadow-2xl">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-bold text-xl mb-1 uppercase">{selectedTicket.type_label}</h3>
            <p className="text-gray-400 text-xs mb-6 font-mono">{selectedTicket.ticket_id}</p>
            
            <div className="bg-white p-2 border-4 border-black inline-block mb-4">
                 {qrToken ? (
                     <QRCode value={qrToken} size={200} />
                 ) : (
                     <div className="w-[200px] h-[200px] bg-gray-50 flex items-center justify-center">...</div>
                 )}
            </div>
            <p className="text-sm font-bold uppercase mb-4">Đưa mã này cho nhân viên</p>
            
            <div className="border-t border-dashed border-gray-300 pt-4 flex justify-between">
                 <span>Còn lại:</span>
                 <span className="font-bold text-xl">{selectedTicket.remaining_uses}</span>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-xs p-6 relative shadow-xl border-2 border-black">
                <button onClick={() => setShowSettings(false)} className="absolute top-2 right-2 p-1"><X size={20}/></button>
                <h3 className="font-bold text-lg mb-6 flex items-center justify-center uppercase border-b border-black pb-2">
                    <KeyRound className="mr-2" size={20} /> Đổi mã PIN
                </h3>
                <form onSubmit={handleChangePin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">PIN Hiện tại</label>
                        <input 
                            type="password"
                            className="w-full p-2 border-b-2 border-gray-300 focus:border-black outline-none text-center font-bold tracking-widest text-xl bg-gray-50" 
                            value={oldPin} onChange={e => setOldPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">PIN Mới (4 số)</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border-b-2 border-gray-300 focus:border-black outline-none text-center font-bold tracking-widest text-xl bg-gray-50"
                            value={newPin} onChange={e => setNewPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-3 font-bold uppercase hover:bg-gray-800 transition-colors mt-4">
                        Xác Nhận Đổi
                    </button>
                    {pinMsg && <p className={`text-center text-sm font-medium mt-2 ${pinMsg.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>{pinMsg}</p>}
                </form>
             </div>
          </div>
      )}
    </Layout>
  );
};

export default CustomerDashboard;
