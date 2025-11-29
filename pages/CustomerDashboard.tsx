
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { UserRole, Ticket, CheckInLog } from '../types';
import { getTicketsByPhone, generateTicketToken, changePin, getSession, getMyHistory } from '../services/mockDb';
import { X, KeyRound } from 'lucide-react';
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

  // Get Primary Active Ticket
  const activeTicket = tickets.find(t => t.status === 'active' && t.remaining_uses > 0) || tickets[0];

  if (!user) return null;

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');
  
  return (
    <Layout role={UserRole.CUSTOMER} title="Hồ Sơ Thành Viên">
      <div className="max-w-md mx-auto bg-white p-8 shadow-xl border border-gray-200 min-h-[600px] text-gray-900 relative mt-4 font-sans">
        
        {/* HEADER */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight mb-1">
                {user.tenantName || 'ONIN PLATFORM'}
            </h1>
            <p className="text-sm text-gray-500 uppercase font-medium">Chi Nhánh: {user.branch_id || 'Chính'}</p>
            <div className="border-t border-dashed border-gray-300 w-full my-4"></div>
        </div>

        {/* GREETING */}
        <div className="mb-6">
            <p className="text-red-600 font-bold text-xl">Xin chào, {user.name}</p>
        </div>

        {/* TICKET INFO */}
        <div className="mb-8">
            <h3 className="font-bold border-b-2 border-gray-900 inline-block mb-4 pb-1 uppercase text-sm tracking-wider">
                Thông Tin Dịch Vụ
            </h3>
            
            {loading ? (
                <p>Đang tải...</p>
            ) : activeTicket ? (
                <div 
                    onClick={() => setSelectedTicket(activeTicket)}
                    className="cursor-pointer group hover:bg-gray-50 -mx-4 px-4 py-3 transition-colors rounded-lg border border-transparent hover:border-gray-200"
                >
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-gray-700">Gói của bạn:</span>
                        <span className="font-bold text-black">{activeTicket.type_label || activeTicket.type}</span>
                    </div>
                    <div className="flex justify-between mb-1 text-sm text-gray-600">
                        <span>Ngày khởi tạo:</span>
                        <span>{formatDate(activeTicket.created_at)}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-sm text-gray-600">
                        <span>Hết hạn:</span>
                        <span className="text-red-600 font-medium">{formatDate(activeTicket.expires_at)}</span>
                    </div>

                    <div className="border-b-2 border-dashed border-gray-300 mb-4"></div>

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700">Đã check-in:</span>
                        <span className="font-bold text-lg">{activeTicket.total_uses - activeTicket.remaining_uses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold uppercase text-gray-900">Buổi còn lại:</span>
                        <span className="font-extrabold text-4xl text-brand-600">{activeTicket.remaining_uses}</span>
                    </div>
                    <div className="text-center mt-4 text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        [ Bấm để lấy mã QR ]
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
                <span className="font-bold text-xs uppercase bg-gray-100 px-3 py-1 rounded text-gray-600 tracking-wider">
                    Lịch Sử Sử Dụng
                </span>
            </div>
            
            <div className="space-y-3 text-sm">
                {historyLogs.length === 0 && <p className="text-center text-gray-400 italic">Chưa có dữ liệu.</p>}
                
                {(showFullHistory ? historyLogs : historyLogs.slice(0, 5)).map((log, idx) => (
                    <div key={log.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                        <div className="flex flex-col">
                             <span className="font-bold text-gray-700">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                             <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}</span>
                        </div>
                        <span className="text-gray-600 text-xs">{log.branch_id}</span>
                        <span className="uppercase text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Check-in</span>
                    </div>
                ))}
                
                {historyLogs.length > 5 && (
                    <button 
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="w-full text-center text-xs font-bold text-gray-500 mt-4 hover:text-black uppercase"
                    >
                        {showFullHistory ? "Thu gọn" : "Xem thêm"}
                    </button>
                )}
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto pt-6 border-t-2 border-dashed border-gray-300 text-center space-y-4">
             <button 
                onClick={() => setShowSettings(true)}
                className="text-sm font-bold text-gray-600 hover:text-black uppercase tracking-wide border border-gray-300 px-4 py-2 rounded hover:border-black transition-colors"
             >
                Đổi Mã PIN
             </button>
             
             <div className="text-[10px] text-gray-300 uppercase tracking-widest pt-2">
                ID: {user.id} • ONIN Platform
             </div>
        </div>

      </div>

      {/* QR MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-6 w-full max-w-sm text-center relative shadow-2xl rounded-xl">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-bold text-xl mb-1 uppercase text-gray-900">{selectedTicket.type_label}</h3>
            <p className="text-gray-400 text-xs mb-6 font-mono">{selectedTicket.ticket_id}</p>
            
            <div className="bg-white p-2 border-4 border-black rounded-lg inline-block mb-4 shadow-inner">
                 {qrToken ? (
                     <QRCode value={qrToken} size={200} />
                 ) : (
                     <div className="w-[200px] h-[200px] bg-gray-50 flex items-center justify-center text-gray-400">Đang tạo...</div>
                 )}
            </div>
            <p className="text-sm font-bold uppercase mb-4 text-gray-600">Đưa mã này cho nhân viên</p>
            
            <div className="border-t border-dashed border-gray-300 pt-4 flex justify-between items-center">
                 <span className="text-gray-500 font-medium">Còn lại:</span>
                 <span className="font-extrabold text-3xl text-brand-600">{selectedTicket.remaining_uses}</span>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-xs p-6 relative shadow-xl rounded-lg border border-gray-200">
                <button onClick={() => setShowSettings(false)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black"><X size={20}/></button>
                <h3 className="font-bold text-lg mb-6 flex items-center justify-center uppercase border-b border-gray-200 pb-3 text-gray-800">
                    <KeyRound className="mr-2" size={18} /> Đổi mã PIN
                </h3>
                <form onSubmit={handleChangePin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">PIN Hiện tại</label>
                        <input 
                            type="password"
                            className="w-full p-3 border border-gray-300 rounded focus:border-black focus:ring-0 outline-none text-center font-bold tracking-widest text-xl bg-gray-50" 
                            value={oldPin} onChange={e => setOldPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">PIN Mới (4 số)</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border border-gray-300 rounded focus:border-black focus:ring-0 outline-none text-center font-bold tracking-widest text-xl bg-gray-50"
                            value={newPin} onChange={e => setNewPin(e.target.value)}
                            maxLength={4}
                            placeholder="••••"
                        />
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-3 font-bold uppercase rounded hover:bg-gray-800 transition-colors mt-2 text-sm tracking-wide">
                        Xác Nhận
                    </button>
                    {pinMsg && <p className={`text-center text-xs font-bold mt-3 ${pinMsg.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>{pinMsg}</p>}
                </form>
             </div>
          </div>
      )}
    </Layout>
  );
};

export default CustomerDashboard;
