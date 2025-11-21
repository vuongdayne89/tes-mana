
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { UserRole, CheckInLog, Ticket, TicketType, User } from '../types';
import { 
    performCheckIn, getCheckInLogs, getTicketsByPhone, generateDayPassToken, 
    createTicket, generateStaticTicketQR, getCustomers, registerCustomer, generateIdentityToken, parseIdentityToken
} from '../services/mockDb';
import { Search, CheckCircle, XCircle, KeyRound, QrCode, X, Printer, Plus, Users, Calendar, Camera } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import QRCode from "react-qr-code";

const StaffDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'customers' | 'create' | 'list'>('scan');
  
  // State
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [status, setStatus] = useState<{msg: string, success: boolean} | null>(null);
  
  // Scan & Manual
  const [requirePin, setRequirePin] = useState(false);
  const [customerPin, setCustomerPin] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [foundTickets, setFoundTickets] = useState<Ticket[]>([]);
  const [pauseScan, setPauseScan] = useState(false);
  
  // Create Ticket Form
  const [ticketMode, setTicketMode] = useState<'existing' | 'new'>('existing');
  const [targetPhone, setTargetPhone] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPin, setNewCustPin] = useState('');
  
  const [ticketType, setTicketType] = useState<TicketType>(TicketType.SESSION_12);
  const [customSessions, setCustomSessions] = useState(10);
  const [expiryMode, setExpiryMode] = useState<'default' | 'days' | 'date'>('default');
  const [expiryValue, setExpiryValue] = useState<any>('');

  // QR Modal
  const [qrModalData, setQrModalData] = useState<{token: string, title: string, subtitle?: string} | null>(null);

  useEffect(() => {
    if (activeTab === 'list') getCheckInLogs().then(setLogs);
    if (activeTab === 'customers') getCustomers().then(setCustomers);
    if (activeTab === 'scan') setPauseScan(false);
    else setPauseScan(true);
  }, [activeTab]);

  // --- Handlers ---

  const handleCheckIn = async (idOrToken: string, method: 'QR_RIENG' | 'MANUAL', pin?: string) => {
    if (!idOrToken) return;
    
    const res = await performCheckIn(idOrToken, method, 'anan1', 'staff1', pin);
    
    if (res.requirePin) {
        setRequirePin(true);
        setPendingToken(idOrToken);
        return;
    }

    setStatus({ msg: res.message, success: res.success });
    if (res.success) {
        setRequirePin(false);
        setCustomerPin('');
        setPendingToken('');
        // Temporary pause scan to show success message
        setPauseScan(true);
        setTimeout(() => setPauseScan(false), 3000);
    }
  };

  const handleScan = async (result: string) => {
      if (!result || pauseScan) return;

      // 1. Try to detect if it's an Identity Token (Customer Card)
      const identityPhone = parseIdentityToken(result);
      if (identityPhone) {
          setPauseScan(true);
          setSearchTerm(identityPhone);
          const tickets = await getTicketsByPhone(identityPhone);
          setFoundTickets(tickets);
          setActiveTab('manual');
          setStatus({ success: true, msg: `Đã nhận diện khách hàng: ${identityPhone}` });
          return;
      }

      // 2. Assume it's a Ticket Token
      handleCheckIn(result, 'QR_RIENG');
  };

  const handleRegisterCustomer = async () => {
      if (!newCustName || !targetPhone || !newCustPin) return alert('Vui lòng điền đủ thông tin');
      const res = await registerCustomer(newCustName, targetPhone, newCustPin, 'staff1');
      if (!res.success) return alert(res.message);
      
      // Auto generate identity QR
      if (res.user) {
          const token = generateIdentityToken(res.user);
          setQrModalData({ token, title: "THẺ THÀNH VIÊN", subtitle: `Khách: ${res.user.name}` });
      }
      setTicketMode('existing'); // Switch to existing mode after create
      getCustomers().then(setCustomers); // Refresh list
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const ticketData = {
          owner_phone: targetPhone,
          owner_name: newCustName || (customers.find(c => c.phone === targetPhone)?.name || 'Khách vãng lai'),
          type: ticketType,
          type_label: ticketType === TicketType.CUSTOM ? `Vé Tùy Chọn (${customSessions} buổi)` : undefined,
          custom_sessions: ticketType === TicketType.CUSTOM ? customSessions : undefined,
          custom_days: expiryMode === 'days' ? Number(expiryValue) : undefined,
          specific_date: expiryMode === 'date' ? expiryValue : undefined
      };

      const newTicket = await createTicket(ticketData, 'staff1');

      if (newTicket) {
          const staticToken = await generateStaticTicketQR(newTicket);
          setQrModalData({
              token: staticToken,
              title: "VÉ CỐ ĐỊNH (IN)",
              subtitle: `Khách: ${newTicket.owner_name} - ${newTicket.type_label || newTicket.type}`
          });
          // Reset
          setTargetPhone('');
          setNewCustName('');
      } else {
          alert('Lỗi tạo vé');
      }
  };

  return (
    <Layout role={UserRole.STAFF} title="Nhân Viên: Chi nhánh Lê Lợi">
      
      {/* Navigation Tabs */}
      <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border border-gray-200 overflow-x-auto">
        {[
            {id: 'scan', label: 'Quét QR'},
            {id: 'manual', label: 'Thủ Công'},
            {id: 'customers', label: 'Khách Hàng'},
            {id: 'create', label: 'Tạo Vé'},
            {id: 'list', label: 'Lịch Sử'}
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setStatus(null); }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px] relative">
        
        {/* SCAN TAB */}
        {activeTab === 'scan' && !requirePin && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-black relative">
                <div className="absolute inset-0 z-10 border-2 border-brand-500 opacity-50 pointer-events-none"></div>
                <Scanner 
                    onScan={(result) => {
                        if (result && result.length > 0) {
                            handleScan(result[0].rawValue);
                        }
                    }}
                    scanDelay={2000}
                    components={{ audio: false, finder: false }}
                    styles={{
                        container: { width: '100%', aspectRatio: '1/1' }
                    }}
                />
            </div>
            <p className="text-sm text-gray-500 flex items-center"><Camera size={16} className="mr-2"/> Đưa mã QR vé hoặc thẻ thành viên vào khung</p>
          </div>
        )}

        {/* PIN PROMPT */}
        {activeTab === 'scan' && requirePin && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
                <div className="p-4 bg-orange-50 text-orange-800 rounded-full"><KeyRound size={32} /></div>
                <div className="text-center">
                    <h3 className="font-bold text-lg">Yêu cầu xác thực</h3>
                    <p className="text-gray-500 text-sm">Vui lòng mời khách nhập mã PIN 4 số.</p>
                </div>
                <input 
                    type="password" maxLength={4} autoFocus
                    className="w-40 text-center text-3xl tracking-[0.5em] border-2 border-brand-500 rounded-lg p-2"
                    value={customerPin} onChange={e => setCustomerPin(e.target.value)}
                />
                <button onClick={() => handleCheckIn(pendingToken, 'QR_RIENG', customerPin)} className="px-6 py-2 bg-brand-600 text-white rounded-lg">Xác Nhận</button>
                <button onClick={() => {setRequirePin(false); setCustomerPin('')}} className="text-gray-500">Hủy</button>
            </div>
        )}

        {/* MANUAL TAB */}
        {activeTab === 'manual' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" placeholder="Nhập số điện thoại khách..."
                className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-brand-500"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
              <button 
                onClick={() => getTicketsByPhone(searchTerm).then(setFoundTickets)}
                className="absolute right-2 top-2 px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
              >Tìm</button>
            </div>

            <div className="space-y-3">
                {foundTickets.map(t => (
                    <div key={t.ticket_id} className="border rounded-xl p-4 bg-gray-50 flex justify-between items-center">
                        <div>
                            <div className="font-bold">{t.owner_name}</div>
                            <div className="text-xs text-gray-500">{t.type_label || t.type} • Còn {t.remaining_uses} buổi</div>
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={() => handleCheckIn(t.ticket_id, 'MANUAL')} className="p-2 bg-brand-600 text-white rounded hover:bg-brand-700" title="Check-in Ngay"><CheckCircle size={18} /></button>
                             <button onClick={async () => {
                                 const token = await generateDayPassToken(t.ticket_id);
                                 setQrModalData({token, title: 'VÉ TRONG NGÀY', subtitle: 'Dùng để khách tự check-in hôm nay'});
                             }} className="p-2 bg-white border text-brand-600 rounded hover:bg-gray-50" title="Tạo QR Ngày"><QrCode size={18} /></button>
                        </div>
                    </div>
                ))}
                {searchTerm && foundTickets.length === 0 && <p className="text-center text-gray-400">Không tìm thấy vé.</p>}
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Tên</th>
                            <th className="px-4 py-3">SĐT</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id} className="border-b">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                <td className="px-4 py-3">{c.phone}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => {
                                        const token = generateIdentityToken(c);
                                        setQrModalData({token, title: 'THẺ THÀNH VIÊN', subtitle: c.name});
                                    }} className="text-brand-600 hover:underline">Lấy QR</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
        )}

        {/* CREATE TICKET TAB */}
        {activeTab === 'create' && (
            <div className="max-w-md mx-auto space-y-6">
                {/* Step 1: Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-bold text-sm mb-3 text-gray-700 flex items-center"><Users size={16} className="mr-2"/> Thông tin khách hàng</h4>
                    <div className="flex space-x-2 mb-3 text-sm">
                        <button onClick={() => setTicketMode('existing')} className={`flex-1 py-1 rounded ${ticketMode === 'existing' ? 'bg-white shadow text-brand-600 font-bold' : 'text-gray-500'}`}>Khách cũ</button>
                        <button onClick={() => setTicketMode('new')} className={`flex-1 py-1 rounded ${ticketMode === 'new' ? 'bg-white shadow text-brand-600 font-bold' : 'text-gray-500'}`}>Đăng ký mới</button>
                    </div>
                    
                    <input type="tel" placeholder="Số điện thoại" className="w-full p-2 border rounded mb-2" value={targetPhone} onChange={e => setTargetPhone(e.target.value)} />
                    
                    {ticketMode === 'new' && (
                        <div className="space-y-2 animate-in fade-in">
                            <input type="text" placeholder="Họ tên khách" className="w-full p-2 border rounded" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
                            <input type="text" placeholder="Tạo mã PIN (4 số)" className="w-full p-2 border rounded" maxLength={4} value={newCustPin} onChange={e => setNewCustPin(e.target.value)} />
                            <button onClick={handleRegisterCustomer} className="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold">Lưu Khách Hàng Mới</button>
                        </div>
                    )}
                </div>

                {/* Step 2: Ticket Config */}
                <form onSubmit={handleCreateTicket} className="space-y-4">
                    <h4 className="font-bold text-sm text-gray-700 flex items-center"><Calendar size={16} className="mr-2"/> Cấu hình vé</h4>
                    
                    <select className="w-full p-2 border rounded" value={ticketType} onChange={e => setTicketType(e.target.value as TicketType)}>
                        <option value={TicketType.SESSION_12}>Gói 12 Buổi</option>
                        <option value={TicketType.SESSION_20}>Gói 20 Buổi</option>
                        <option value={TicketType.MONTHLY}>Vé Tháng (30 ngày)</option>
                        <option value={TicketType.CUSTOM}>Tùy chọn khác...</option>
                    </select>

                    {ticketType === TicketType.CUSTOM && (
                        <input type="number" placeholder="Số buổi" className="w-full p-2 border rounded" value={customSessions} onChange={e => setCustomSessions(Number(e.target.value))} />
                    )}

                    <div className="text-sm">
                        <span className="block mb-1 text-gray-600">Hạn sử dụng:</span>
                        <div className="flex space-x-2 mb-2">
                            <button type="button" onClick={() => setExpiryMode('default')} className={`px-3 py-1 rounded border ${expiryMode === 'default' ? 'bg-brand-50 border-brand-500' : 'bg-white'}`}>Mặc định</button>
                            <button type="button" onClick={() => setExpiryMode('days')} className={`px-3 py-1 rounded border ${expiryMode === 'days' ? 'bg-brand-50 border-brand-500' : 'bg-white'}`}>Số ngày</button>
                            <button type="button" onClick={() => setExpiryMode('date')} className={`px-3 py-1 rounded border ${expiryMode === 'date' ? 'bg-brand-50 border-brand-500' : 'bg-white'}`}>Chọn ngày</button>
                        </div>
                        {expiryMode === 'days' && <input type="number" placeholder="Nhập số ngày (VD: 45)" className="w-full p-2 border rounded" onChange={e => setExpiryValue(e.target.value)} />}
                        {expiryMode === 'date' && <input type="date" className="w-full p-2 border rounded" onChange={e => setExpiryValue(e.target.value)} />}
                    </div>

                    <button type="submit" className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold flex items-center justify-center">
                        <Plus size={18} className="mr-2" /> Tạo Vé & In QR
                    </button>
                </form>
            </div>
        )}

        {/* LIST TAB */}
        {activeTab === 'list' && (
            <div className="space-y-2 overflow-y-auto max-h-[400px]">
                {logs.map(l => (
                    <div key={l.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                        <div>
                            <div className="font-bold text-sm">{l.user_name}</div>
                            <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleString()}</div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${l.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status}</span>
                    </div>
                ))}
            </div>
        )}

        {/* Status Toast */}
        {status && activeTab !== 'create' && activeTab !== 'customers' && (
            <div className={`mt-4 p-3 rounded-lg flex items-center ${status.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {status.success ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
                <span className="font-medium">{status.msg}</span>
            </div>
        )}

        {/* Universal QR Modal */}
        {qrModalData && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-xs relative p-6 text-center">
                    <button onClick={() => setQrModalData(null)} className="absolute top-3 right-3 p-1 bg-gray-100 rounded-full"><X size={20} /></button>
                    <h3 className="font-bold text-lg text-brand-600 mb-1">{qrModalData.title}</h3>
                    <p className="text-sm text-gray-700 mb-4">{qrModalData.subtitle}</p>
                    <div className="bg-white border-2 border-brand-500 p-2 rounded-xl mb-4 inline-block">
                        <QRCode value={qrModalData.token} size={150} />
                    </div>
                    <button onClick={() => window.print()} className="w-full py-2 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                        <Printer size={16} className="mr-2" /> In Mã
                    </button>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDashboard;
