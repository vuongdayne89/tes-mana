
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { UserRole, Ticket } from '../types';
import { getTicketsByPhone, generateTicketToken, changePin, getSession } from '../services/mockDb';
import TicketCard from '../components/TicketCard';
import { X, RefreshCw, Settings, Key } from 'lucide-react';
import QRCode from "react-qr-code";

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getSession());
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
    const loadTickets = async () => {
      const data = await getTicketsByPhone(user.phone);
      setTickets(data);
    };
    loadTickets();
  }, [user, navigate]);

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
    <Layout role={UserRole.CUSTOMER} title="Vé Của Tôi">
      <div className="space-y-6 relative">
        <div className="absolute top-0 right-0 -mt-12 mr-4">
             <button onClick={() => setShowSettings(true)} className="text-white p-2 hover:bg-brand-700 rounded-full" title="Cài đặt">
                 <Settings size={20} />
             </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Xin chào, {user.name} 👋</h2>
          <p className="text-gray-500 text-sm">Chúc bạn một buổi tập tràn đầy năng lượng!</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="font-semibold text-gray-700">Danh sách vé</h3>
             <button onClick={() => window.location.reload()} className="text-xs text-brand-600 flex items-center"><RefreshCw size={12} className="mr-1"/> Làm mới</button>
          </div>
          
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Bạn chưa có vé nào.</p>
          ) : (
            tickets.map(ticket => (
              <TicketCard 
                key={ticket.ticket_id} 
                ticket={ticket} 
                onClick={() => setSelectedTicket(ticket)}
              />
            ))
          )}
        </div>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="p-8 flex flex-col items-center text-center">
              <h3 className="font-bold text-xl mb-1">{selectedTicket.type_label || selectedTicket.type}</h3>
              <p className="text-gray-500 text-sm mb-6">Mã vé: {selectedTicket.ticket_id}</p>
              
              <div className="bg-white p-4 rounded-xl border-2 border-brand-500 shadow-lg mb-6 relative">
                 {qrToken ? (
                     <div className="flex flex-col items-center justify-center">
                        <QRCode value={qrToken} size={192} />
                        <span className="text-[10px] text-gray-400 mt-2">Quét để check-in</span>
                     </div>
                 ) : (
                     <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">Đang tải...</div>
                 )}
              </div>

              <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium w-full flex items-center justify-center">
                Mã check-in cá nhân
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
             <div className="bg-white rounded-2xl w-full max-w-xs p-6 relative animate-in fade-in zoom-in-95">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4"><X size={20} className="text-gray-400" /></button>
                <h3 className="font-bold text-lg mb-4 flex items-center"><Key className="mr-2" size={20} /> Đổi mã PIN</h3>
                <form onSubmit={handleChangePin} className="space-y-4">
                    <input 
                        type="password" placeholder="PIN cũ" 
                        className="w-full p-2 border rounded" 
                        value={oldPin} onChange={e => setOldPin(e.target.value)}
                        maxLength={4}
                    />
                    <input 
                        type="password" placeholder="PIN mới (4 số)" 
                        className="w-full p-2 border rounded"
                        value={newPin} onChange={e => setNewPin(e.target.value)}
                        maxLength={4}
                    />
                    <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded font-bold">Cập nhật PIN</button>
                    {pinMsg && <p className="text-center text-sm font-medium text-brand-600">{pinMsg}</p>}
                </form>
             </div>
          </div>
      )}
    </Layout>
  );
};

export default CustomerDashboard;
