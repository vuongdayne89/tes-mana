import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { UserRole, Ticket } from '../types';
import { getTicketsByPhone, generateTicketToken, changePin } from '../services/mockDb';
import TicketCard from '../components/TicketCard';
import { QrCode, X, RefreshCw, Settings, Key } from 'lucide-react';

const CustomerDashboard: React.FC = () => {
  // Mocked logged in user phone from localStorage or context in a real app
  const userPhone = '0912345678'; 
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Change PIN States
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  useEffect(() => {
    const loadTickets = async () => {
      const data = await getTicketsByPhone(userPhone);
      setTickets(data);
    };
    loadTickets();
  }, []);

  useEffect(() => {
    // Fix: Cannot find namespace 'NodeJS'. Using any to support browser environment where setInterval returns a number.
    let interval: any;
    if (selectedTicket) {
      const updateToken = async () => {
        const token = await generateTicketToken(selectedTicket.ticket_id);
        setQrToken(token);
      };
      updateToken();
      interval = setInterval(updateToken, 60000); // Rotate every 60s
    }
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const handleChangePin = async (e: React.FormEvent) => {
      e.preventDefault();
      setPinMsg('');
      if (newPin.length !== 4 || isNaN(Number(newPin))) {
          setPinMsg('New PIN must be 4 digits');
          return;
      }
      const res = await changePin(userPhone, oldPin, newPin);
      setPinMsg(res.message);
      if (res.success) {
          setOldPin('');
          setNewPin('');
          setTimeout(() => setShowSettings(false), 2000);
      }
  }

  return (
    <Layout role={UserRole.CUSTOMER} title="My Yoga Tickets">
      <div className="space-y-6 relative">
        {/* Header Actions */}
        <div className="absolute top-0 right-0 -mt-12 mr-4">
             <button onClick={() => setShowSettings(true)} className="text-white p-2 hover:bg-brand-700 rounded-full">
                 <Settings size={20} />
             </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Hello, Chị Lan 👋</h2>
          <p className="text-gray-500 text-sm">Ready for your session today?</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Your Tickets</h3>
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active tickets found.</p>
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

      {/* QR Code Modal */}
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
              <h3 className="font-bold text-xl mb-1">{selectedTicket.type.toUpperCase()}</h3>
              <p className="text-gray-500 text-sm mb-6">Ticket ID: {selectedTicket.ticket_id}</p>
              
              <div className="bg-white p-4 rounded-xl border-2 border-brand-500 shadow-lg mb-6 relative">
                 {qrToken ? (
                     // In real app, use a QR library like `qrcode.react`
                     // We visualize the token text for demo purposes to show it changes
                     <div className="w-48 h-48 bg-gray-900 flex flex-col items-center justify-center text-white text-[10px] break-all p-2 overflow-hidden">
                        <QrCode size={48} className="mb-2" />
                        <span className="opacity-50">Scan Me</span>
                        <span className="mt-2 font-mono leading-none">{qrToken.substring(0, 20)}...</span>
                     </div>
                 ) : (
                     <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">Loading...</div>
                 )}
              </div>

              <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium w-full flex items-center justify-center">
                <RefreshCw size={14} className="mr-2 animate-spin-slow" />
                Token refreshes automatically (60s)
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 border-t text-center">
              <p className="text-xs text-gray-400">Secure HMAC Token</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
             <div className="bg-white rounded-2xl w-full max-w-xs p-6 relative animate-in fade-in zoom-in-95">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4"><X size={20} className="text-gray-400" /></button>
                <h3 className="font-bold text-lg mb-4 flex items-center"><Key className="mr-2" size={20} /> Change PIN</h3>
                <form onSubmit={handleChangePin} className="space-y-4">
                    <input 
                        type="password" placeholder="Old PIN" 
                        className="w-full p-2 border rounded" 
                        value={oldPin} onChange={e => setOldPin(e.target.value)}
                        maxLength={4}
                    />
                    <input 
                        type="password" placeholder="New PIN (4 digits)" 
                        className="w-full p-2 border rounded"
                        value={newPin} onChange={e => setNewPin(e.target.value)}
                        maxLength={4}
                    />
                    <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded font-bold">Update PIN</button>
                    {pinMsg && <p className="text-center text-sm font-medium text-brand-600">{pinMsg}</p>}
                </form>
             </div>
          </div>
      )}
    </Layout>
  );
};

export default CustomerDashboard;