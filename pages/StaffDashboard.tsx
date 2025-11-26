
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { UserRole, CheckInLog, Ticket, TicketType, User, CustomerDetail } from '../types';
import { 
    performCheckIn, getCheckInLogs, createTicket, generateStaticTicketQR, getCustomers, registerCustomer, parseIdentityToken,
    previewTicketToken, getCustomerFullDetails, getSession
} from '../services/mockDb';
import { Search, KeyRound, QrCode, X, Printer, Eye, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import QRCode from "react-qr-code";

const StaffDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'lookup' | 'history'>('checkin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // State
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [recentCheckIn, setRecentCheckIn] = useState<{name: string, type: string, remaining: number, time: string} | null>(null);
  
  // Scan & Manual
  const [requirePin, setRequirePin] = useState(false);
  const [customerPin, setCustomerPin] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [pauseScan, setPauseScan] = useState(false);
  const [scanPreview, setScanPreview] = useState<{ticket: Ticket, token: string, user?: User} | null>(null);
  
  // Customer Detail View
  const [viewingCustomer, setViewingCustomer] = useState<CustomerDetail | null>(null);

  // Create Ticket Form
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    const session = getSession();
    if(session) setCurrentUser(session);
  }, []);

  useEffect(() => {
    if(!currentUser) return;
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'lookup') getCustomers().then(setCustomers);
    
    if (activeTab === 'checkin') setPauseScan(false);
    else setPauseScan(true);
  }, [activeTab, currentUser]);

  // Helper to show notification
  const showNotify = (message: string, type: 'success' | 'error') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const loadHistory = () => {
      if(!currentUser || !currentUser.branch_id) return;
      const today = new Date().toISOString().split('T')[0];
      getCheckInLogs(currentUser.branch_id, today).then(setLogs);
  };

  const handleCheckIn = async (idOrToken: string, method: 'QR_RIENG' | 'MANUAL', pin?: string) => {
    if (!idOrToken) return;
    
    const branchId = currentUser?.branch_id || 'anan1';
    const res = await performCheckIn(idOrToken, method, branchId, currentUser?.id, pin);
    
    if (res.requirePin) {
        setScanPreview(null); 
        setRequirePin(true);
        setPendingToken(idOrToken);
        return;
    }

    setScanPreview(null);
    
    if (res.success) {
        setRequirePin(false);
        setCustomerPin('');
        setPendingToken('');
        setManualPhone(''); 
        setPauseScan(true);
        showNotify(res.message, 'success');
        
        // Update "Just Checked-in" info for Lookup Tab
        if (res.ticketInfo) {
            setRecentCheckIn({
                name: res.ticketInfo.owner_name,
                type: res.ticketInfo.type_label,
                remaining: res.ticketInfo.remaining,
                time: new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
            });
        }

        setTimeout(() => setPauseScan(false), 3000);
        
        // If viewing details, refresh
        if (viewingCustomer) {
            const updatedDetails = await getCustomerFullDetails(viewingCustomer.user.phone);
            if (updatedDetails) setViewingCustomer(updatedDetails);
        }
    } else {
        showNotify(res.message, 'error');
    }
  };

  const handleScan = async (result: string) => {
      if (!result || pauseScan) return;
      setPauseScan(true);

      const identityPhone = parseIdentityToken(result);
      if (identityPhone) {
          handleViewCustomer(identityPhone);
          return;
      }

      const preview = await previewTicketToken(result);
      if (preview.success && preview.ticket) {
           const details = await getCustomerFullDetails(preview.ticket.owner_phone);
           setScanPreview({ ticket: preview.ticket, token: result, user: details?.user });
      } else {
          showNotify(preview.message, 'error');
          setTimeout(() => setPauseScan(false), 2000);
      }
  };

  const handleViewCustomer = async (phone: string) => {
      const details = await getCustomerFullDetails(phone);
      if (details) {
          setViewingCustomer(details);
          setPauseScan(true);
      } else {
          showNotify('Không tìm thấy khách hàng', 'error');
          if(activeTab === 'checkin') setPauseScan(false);
      }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(manualPhone.length < 10) return showNotify('SĐT không hợp lệ', 'error');
      handleViewCustomer(manualPhone);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      let finalName = newCustName;
      if (ticketMode === 'new') {
          const regRes = await registerCustomer(newCustName, targetPhone, newCustPin, currentUser?.id || 'staff');
          if (!regRes.success && regRes.message !== 'Số điện thoại đã tồn tại') {
              showNotify('Lỗi: ' + regRes.message, 'error');
              return;
          }
      } else {
          const exist = customers.find(c => c.phone === targetPhone);
          finalName = exist ? exist.name : 'Khách vãng lai';
      }
      
      const ticketData = {
          owner_phone: targetPhone, owner_name: finalName, type: ticketType,
          type_label: ticketType === TicketType.CUSTOM ? `Vé Tùy Chọn (${customSessions} buổi)` : undefined,
          custom_sessions: ticketType === TicketType.CUSTOM ? customSessions : undefined,
          custom_days: expiryMode === 'days' ? Number(expiryValue) : undefined,
          specific_date: expiryMode === 'date' ? expiryValue : undefined
      };

      const newTicket = await createTicket(ticketData, currentUser?.id || 'staff');
      if (newTicket) {
          const staticToken = await generateStaticTicketQR(newTicket);
          setQrModalData({ token: staticToken, title: "VÉ CỐ ĐỊNH (IN)", subtitle: `Khách: ${newTicket.owner_name}` });
          setShowCreateModal(false);
          setTargetPhone(''); setNewCustName('');
          showNotify('Tạo vé mới thành công!', 'success');
      } else {
          showNotify('Lỗi tạo vé', 'error');
      }
  };

  return (
    <Layout role={UserRole.STAFF} title={`Nhân Viên: ${currentUser?.branch_id || 'Chi nhánh'}`}>
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border border-gray-200">
        <button onClick={() => setActiveTab('checkin')} className={`flex-1 py-3 font-bold rounded-md ${activeTab === 'checkin' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}>Check-in KH</button>
        <button onClick={() => setActiveTab('lookup')} className={`flex-1 py-3 font-bold rounded-md ${activeTab === 'lookup' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}>Tra cứu KH</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 font-bold rounded-md ${activeTab === 'history' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}>Lịch sử</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-h-[500px] relative">
        
        {/* TAB 1: CHECK-IN */}
        {activeTab === 'checkin' && !viewingCustomer && !scanPreview && !requirePin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Scanner Section */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center"><QrCode className="mr-2"/> Quét Mã QR</h3>
                    <div className="w-full max-w-[280px] aspect-square bg-black rounded-lg overflow-hidden relative shadow-md">
                        {!pauseScan && (
                            <Scanner 
                                onScan={(r) => { if (r && r.length > 0) handleScan(r[0].rawValue); }}
                                onError={() => showNotify('Lỗi Camera', 'error')}
                                scanDelay={1000} components={{ finder: false }} constraints={{ facingMode: 'environment' }}
                                styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
                            />
                        )}
                        <div className="absolute inset-0 border-2 border-brand-500 opacity-50 pointer-events-none"></div>
                    </div>
                </div>

                {/* Manual Input Section */}
                <div className="flex flex-col justify-center p-6 bg-white rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-6 flex items-center"><KeyRound className="mr-2"/> Nhập Tay (SĐT)</h3>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase">Số điện thoại khách</label>
                            <input type="tel" className="w-full p-3 border rounded-lg text-lg font-mono" placeholder="09xx..." value={manualPhone} onChange={e=>setManualPhone(e.target.value)} />
                        </div>
                        <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700">Tìm & Check-in</button>
                    </form>
                </div>
            </div>
        )}

        {/* TAB 2: LOOKUP */}
        {activeTab === 'lookup' && !viewingCustomer && (
            <div className="space-y-6">
                {/* Recent Activity Card */}
                {recentCheckIn && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                        <div>
                            <div className="text-xs text-green-600 font-bold uppercase mb-1">Khách vừa check-in</div>
                            <h3 className="text-xl font-bold text-gray-800">{recentCheckIn.name}</h3>
                            <div className="text-sm text-gray-600">{recentCheckIn.type} • Còn {recentCheckIn.remaining}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-green-700">{recentCheckIn.time}</div>
                            <div className="text-xs text-gray-500">NV: {currentUser?.name}</div>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" placeholder="Tìm tên hoặc SĐT..." className="w-full pl-10 p-2 border rounded-lg" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => { setShowCreateModal(true); setTicketMode('new'); }} className="px-3 py-2 bg-brand-600 text-white rounded-lg font-bold text-sm whitespace-nowrap">+ Khách Mới</button>
                    <button onClick={() => { setShowCreateModal(true); setTicketMode('existing'); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm whitespace-nowrap">+ Vé</button>
                </div>

                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold">
                            <tr><th className="p-3">Tên</th><th className="p-3">SĐT</th><th className="p-3 text-right"></th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {customers.filter(c => c.phone.includes(searchTerm) || c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewCustomer(c.phone)}>
                                    <td className="p-3 font-medium">{c.name}</td>
                                    <td className="p-3">{c.phone}</td>
                                    <td className="p-3 text-right text-brand-600"><Eye size={18}/></td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
            <div>
                <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Clock className="mr-2"/> Lịch sử hôm nay ({new Date().toLocaleDateString('vi-VN')})</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {logs.length === 0 && <p className="text-gray-400 text-center py-10">Chưa có lượt check-in nào hôm nay.</p>}
                    {logs.map(l => (
                        <div key={l.id} className="p-3 border rounded-lg flex justify-between items-center hover:bg-gray-50">
                            <div>
                                <div className="font-bold text-gray-800">{l.user_name}</div>
                                <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleTimeString('vi-VN')} • {l.method}</div>
                            </div>
                            <span className="text-green-600 font-bold text-sm">{l.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* OVERLAYS */}
        
        {/* CUSTOMER DETAIL */}
        {viewingCustomer && (
            <div className="absolute inset-0 z-20 bg-white p-4 overflow-y-auto">
                <button onClick={() => setViewingCustomer(null)} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold">{viewingCustomer.user.name}</h2>
                    <p className="text-gray-500">{viewingCustomer.user.phone}</p>
                </div>
                <div className="space-y-3">
                    <h3 className="font-bold text-sm text-gray-500 uppercase">Vé đang hoạt động</h3>
                    {viewingCustomer.tickets.map(t => (
                        <div key={t.ticket_id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-brand-700">{t.type_label}</div>
                                <div className="text-sm">Còn: <b>{t.remaining_uses}</b></div>
                                <div className="text-xs text-gray-500">Hạn: {new Date(t.expires_at).toLocaleDateString()}</div>
                            </div>
                            {t.remaining_uses > 0 && (
                                <button onClick={() => handleCheckIn(t.ticket_id, 'MANUAL')} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-sm">Check-in</button>
                            )}
                        </div>
                    ))}
                    {viewingCustomer.tickets.length === 0 && <p className="text-gray-400">Khách này chưa có vé.</p>}
                </div>
            </div>
        )}

        {/* PIN INPUT */}
        {requirePin && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur flex flex-col items-center justify-center p-4">
                <h3 className="font-bold text-xl mb-4">Nhập PIN Xác Thực</h3>
                <input type="password" maxLength={4} className="text-3xl tracking-[0.5em] text-center border-2 border-brand-500 rounded p-2 mb-4 w-48" autoFocus value={customerPin} onChange={e=>setCustomerPin(e.target.value)} />
                <div className="flex gap-4">
                    <button onClick={() => handleCheckIn(pendingToken, 'QR_RIENG', customerPin)} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl">Xác Nhận</button>
                    <button onClick={() => {setRequirePin(false); setCustomerPin('')}} className="px-6 py-3 bg-gray-200 rounded-xl">Hủy</button>
                </div>
            </div>
        )}

        {/* QR PREVIEW */}
        {scanPreview && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm text-center">
                    <h3 className="font-bold text-lg mb-1">Xác nhận Check-in</h3>
                    <div className="my-4 text-left bg-gray-50 p-4 rounded border">
                        <div className="font-bold text-lg">{scanPreview.ticket.owner_name}</div>
                        <div className="text-brand-600 font-bold">{scanPreview.ticket.type_label}</div>
                        <div>Còn: {scanPreview.ticket.remaining_uses}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => {setScanPreview(null); setPauseScan(false)}} className="py-3 bg-gray-200 font-bold rounded-xl">Hủy</button>
                        <button onClick={() => handleCheckIn(scanPreview.token, 'QR_RIENG')} className="py-3 bg-brand-600 text-white font-bold rounded-xl">Đồng ý</button>
                    </div>
                </div>
            </div>
        )}

        {/* CREATE MODAL */}
        {showCreateModal && (
            <div className="absolute inset-0 z-30 bg-white p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">{ticketMode === 'new' ? 'Tạo Khách & Vé Mới' : 'Tạo Vé Cho Khách'}</h3>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleCreateTicket} className="space-y-4 max-w-md mx-auto">
                    <div className="flex gap-2 mb-4">
                        <button type="button" onClick={() => setTicketMode('existing')} className={`flex-1 py-2 border rounded ${ticketMode === 'existing' ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold' : ''}`}>Khách Cũ</button>
                        <button type="button" onClick={() => setTicketMode('new')} className={`flex-1 py-2 border rounded ${ticketMode === 'new' ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold' : ''}`}>Khách Mới</button>
                    </div>
                    
                    <input type="tel" placeholder="Số điện thoại (*)" required className="w-full p-3 border rounded-lg" value={targetPhone} onChange={e=>setTargetPhone(e.target.value)} />
                    
                    {ticketMode === 'new' && (
                        <div className="space-y-4 animate-in fade-in">
                            <input type="text" placeholder="Họ tên khách (*)" required className="w-full p-3 border rounded-lg" value={newCustName} onChange={e=>setNewCustName(e.target.value)} />
                            <input type="text" placeholder="PIN đăng nhập (4 số)" maxLength={4} required className="w-full p-3 border rounded-lg" value={newCustPin} onChange={e=>setNewCustPin(e.target.value)} />
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        <label className="font-bold block mb-2">Loại Vé</label>
                        <select className="w-full p-3 border rounded-lg mb-2" value={ticketType} onChange={e=>setTicketType(e.target.value as TicketType)}>
                            <option value={TicketType.SESSION_12}>Gói 12 Buổi</option>
                            <option value={TicketType.SESSION_20}>Gói 20 Buổi</option>
                            <option value={TicketType.MONTHLY}>Gói Tháng</option>
                            <option value={TicketType.CUSTOM}>Tùy Chọn</option>
                        </select>
                         {ticketType === TicketType.CUSTOM && (
                            <input type="number" placeholder="Số buổi" className="w-full p-3 border rounded-lg mb-2" value={customSessions} onChange={e=>setCustomSessions(Number(e.target.value))} />
                        )}
                        <label className="font-bold block mb-2 mt-2">Hạn Sử Dụng</label>
                        <select className="w-full p-3 border rounded-lg mb-2" value={expiryMode} onChange={e=>setExpiryMode(e.target.value as any)}>
                            <option value="default">Mặc định (3-6 tháng)</option>
                            <option value="days">Theo số ngày</option>
                            <option value="date">Chọn ngày cụ thể</option>
                        </select>
                        {expiryMode === 'days' && <input type="number" placeholder="Số ngày (VD: 30)" className="w-full p-3 border rounded-lg" value={expiryValue} onChange={e=>setExpiryValue(e.target.value)} />}
                        {expiryMode === 'date' && <input type="date" className="w-full p-3 border rounded-lg" value={expiryValue} onChange={e=>setExpiryValue(e.target.value)} />}
                    </div>

                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg mt-6">Hoàn Tất & In Vé</button>
                </form>
            </div>
        )}

        {/* QR DISPLAY MODAL */}
        {qrModalData && (
             <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm text-center relative">
                    <button onClick={() => setQrModalData(null)} className="absolute top-2 right-2 p-2"><X/></button>
                    <h3 className="font-bold text-xl mb-1">{qrModalData.title}</h3>
                    <p className="text-gray-500 mb-6">{qrModalData.subtitle}</p>
                    <div className="bg-white p-2 border-4 border-brand-500 rounded-xl inline-block mb-6">
                        <QRCode value={qrModalData.token} size={200} />
                    </div>
                    <button onClick={() => window.print()} className="w-full py-3 bg-gray-100 font-bold rounded-xl flex items-center justify-center"><Printer className="mr-2"/> In Ngay</button>
                </div>
             </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDashboard;
