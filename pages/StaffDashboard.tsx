
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { UserRole, CheckInLog, Ticket, TicketType, User, CustomerDetail } from '../types';
import { 
    performCheckIn, getCheckInLogs, createTicket, generateStaticTicketQR, getCustomers, registerCustomer, generateIdentityToken, parseIdentityToken,
    previewTicketToken, getCustomerFullDetails, deleteTicket
} from '../services/mockDb';
import { Search, CheckCircle, XCircle, KeyRound, QrCode, X, Printer, Plus, Users, Calendar, Camera, RefreshCw, Eye, Clock, Trash2 } from 'lucide-react';
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
  const [pauseScan, setPauseScan] = useState(false);
  const [scanPreview, setScanPreview] = useState<{ticket: Ticket, token: string, user?: User} | null>(null);
  
  // Customer Detail View
  const [viewingCustomer, setViewingCustomer] = useState<CustomerDetail | null>(null);

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

  const handleCheckIn = async (idOrToken: string, method: 'QR_RIENG' | 'MANUAL', pin?: string) => {
    if (!idOrToken) return;
    
    const res = await performCheckIn(idOrToken, method, 'anan1', 'staff1', pin);
    
    if (res.requirePin) {
        setScanPreview(null); // Close the preview modal first so we can see the PIN input
        setRequirePin(true);
        setPendingToken(idOrToken);
        return;
    }

    setStatus({ msg: res.message, success: res.success });
    setScanPreview(null); // Close preview if open
    
    if (res.success) {
        setRequirePin(false);
        setCustomerPin('');
        setPendingToken('');
        setPauseScan(true);
        setTimeout(() => setPauseScan(false), 3000);
        
        // If we are viewing customer details, refresh them to show updated ticket counts
        if (viewingCustomer) {
            const updatedDetails = await getCustomerFullDetails(viewingCustomer.user.phone);
            if (updatedDetails) {
                setViewingCustomer(updatedDetails);
                alert(res.message); // Explicit feedback for manual entry
            }
        }
    } else {
        // If failed inside modal, show alert
        if (viewingCustomer || method === 'MANUAL') {
            alert(res.message);
        }
    }
  };

  const handleScan = async (result: string) => {
      if (!result || pauseScan) return;
      
      // Pause immediately to prevent multiple scans
      setPauseScan(true);

      // 1. Try Identity Token
      const identityPhone = parseIdentityToken(result);
      if (identityPhone) {
          handleViewCustomer(identityPhone);
          return;
      }

      // 2. Ticket Token -> PREVIEW
      const preview = await previewTicketToken(result);
      if (preview.success && preview.ticket) {
           // Fetch user details for better preview
           const details = await getCustomerFullDetails(preview.ticket.owner_phone);
           setScanPreview({ ticket: preview.ticket, token: result, user: details?.user });
      } else {
          setStatus({ success: false, msg: preview.message });
          setTimeout(() => setPauseScan(false), 2000);
      }
  };

  const handleViewCustomer = async (phone: string) => {
      const details = await getCustomerFullDetails(phone);
      if (details) {
          setViewingCustomer(details);
          setPauseScan(true);
      } else {
          alert('Không tìm thấy khách hàng');
          if(activeTab === 'scan') setPauseScan(false);
      }
  };

  const closeCustomerView = () => {
      setViewingCustomer(null);
      if (activeTab === 'scan') setPauseScan(false);
  };

  const handleRegisterCustomer = async () => {
      if (!newCustName || !targetPhone || !newCustPin) return alert('Vui lòng điền đủ thông tin');
      const res = await registerCustomer(newCustName, targetPhone, newCustPin, 'staff1');
      if (!res.success) return alert(res.message);
      
      if (res.user) {
          const token = generateIdentityToken(res.user);
          setQrModalData({ token, title: "THẺ THÀNH VIÊN", subtitle: `Khách: ${res.user.name}` });
      }
      setTicketMode('existing'); 
      getCustomers().then(setCustomers); 
  };

  const handleDeleteTicket = async (ticketId: string) => {
      if (confirm('Bạn có chắc muốn XÓA vé này không?')) {
          await deleteTicket(ticketId);
          if (viewingCustomer) handleViewCustomer(viewingCustomer.user.phone); // refresh
      }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalName = newCustName;

      // Logic: If creating NEW customer, register them FIRST
      if (ticketMode === 'new') {
          const regRes = await registerCustomer(newCustName, targetPhone, newCustPin, 'staff1');
          if (!regRes.success && regRes.message !== 'Số điện thoại đã tồn tại') {
              alert('Lỗi tạo khách hàng: ' + regRes.message);
              return;
          }
      } else {
          // Existing
          const exist = customers.find(c => c.phone === targetPhone);
          finalName = exist ? exist.name : 'Khách vãng lai';
      }
      
      const ticketData = {
          owner_phone: targetPhone,
          owner_name: finalName,
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
                onClick={() => { setActiveTab(tab.id as any); setStatus(null); setViewingCustomer(null); setScanPreview(null); }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px] relative">
        
        {/* CUSTOMER DETAIL VIEW (OVERLAY) */}
        {viewingCustomer && (
            <div className="absolute inset-0 z-30 bg-white p-6 rounded-xl animate-in slide-in-from-bottom-5 overflow-y-auto">
                <button onClick={closeCustomerView} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
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
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center"><QrCode size={18} className="mr-2"/> Danh sách vé</h3>
                        <div className="space-y-3">
                            {viewingCustomer.tickets.length === 0 && <p className="text-gray-400 text-sm">Khách chưa có vé.</p>}
                            {viewingCustomer.tickets.map(t => (
                                <div key={t.ticket_id} className={`border p-3 rounded-lg ${t.remaining_uses > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between">
                                        <span className="font-bold">{t.type_label || t.type}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${t.remaining_uses > 0 ? 'bg-white text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                            {t.remaining_uses > 0 ? 'Đang dùng' : 'Hết hạn'}
                                        </span>
                                    </div>
                                    <div className="text-sm mt-1 flex justify-between">
                                        <span>Còn: <b>{t.remaining_uses}/{t.total_uses}</b></span>
                                        <span className="text-xs text-gray-500">Hạn: {new Date(t.expires_at).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {t.remaining_uses > 0 && (
                                            <button onClick={() => handleCheckIn(t.ticket_id, 'MANUAL')} className="flex-1 py-1 bg-brand-600 text-white text-xs font-bold rounded hover:bg-brand-700">Check-in</button>
                                        )}
                                        <button onClick={() => handleDeleteTicket(t.ticket_id)} className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded hover:bg-red-200"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center"><Clock size={18} className="mr-2"/> Lịch sử gần đây</h3>
                         <div className="space-y-2 max-h-60 overflow-y-auto">
                            {viewingCustomer.logs.length === 0 && <p className="text-gray-400 text-sm">Chưa có lịch sử.</p>}
                            {viewingCustomer.logs.slice(0, 10).map(l => (
                                <div key={l.id} className="text-sm p-2 border-b flex justify-between">
                                    <span className="text-gray-600">{new Date(l.timestamp).toLocaleString('vi-VN')}</span>
                                    <span className={l.status === 'SUCCESS' ? 'text-green-600 font-bold' : 'text-red-500'}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* SCAN PREVIEW MODAL */}
        {scanPreview && (
            <div className="absolute inset-0 z-40 bg-black bg-opacity-80 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center animate-in zoom-in">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">Xác Nhận Check-in</h3>
                    <p className="text-sm text-gray-500 mb-6">Thông tin vé được quét</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border mb-6 text-left space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500 text-xs">Khách hàng:</span> <span className="font-bold">{scanPreview.ticket.owner_name}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 text-xs">SĐT:</span> <span className="font-mono">{scanPreview.ticket.owner_phone}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 text-xs">Loại vé:</span> <span className="text-brand-600 font-bold">{scanPreview.ticket.type_label}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 text-xs">Còn lại:</span> <span className="font-bold">{scanPreview.ticket.remaining_uses} buổi</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 text-xs">Hết hạn:</span> <span>{new Date(scanPreview.ticket.expires_at).toLocaleDateString('vi-VN')}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { setScanPreview(null); setPauseScan(false); }} className="py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Hủy Bỏ</button>
                        <button onClick={() => handleCheckIn(scanPreview.token, 'QR_RIENG')} className="py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200">Check-in Ngay</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* SCAN TAB */}
        {activeTab === 'scan' && !requirePin && !viewingCustomer && !scanPreview && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-lg relative aspect-square">
                <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-brand-500/80 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-500 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-500 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-500 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-500 -mb-1 -mr-1"></div>
                    </div>
                </div>

                {!pauseScan && (
                    <Scanner 
                        onScan={(result) => { if (result && result.length > 0) handleScan(result[0].rawValue); }}
                        onError={(err) => setStatus({ success: false, msg: 'Lỗi Camera: Hãy cấp quyền truy cập.' })}
                        scanDelay={1000}
                        components={{ finder: false }}
                        constraints={{ facingMode: 'environment' }}
                        styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
                    />
                )}
            </div>
            <p className="text-sm text-gray-500 flex items-center"><Camera size={16} className="mr-2"/> Đưa mã QR vào khung</p>
             {status?.success === false && <button onClick={() => window.location.reload()} className="flex items-center text-brand-600 text-sm font-bold"><RefreshCw size={14} className="mr-1"/> Tải lại trang</button>}
          </div>
        )}

        {/* PIN PROMPT */}
        {activeTab === 'scan' && requirePin && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in py-10">
                <div className="p-4 bg-orange-50 text-orange-800 rounded-full"><KeyRound size={32} /></div>
                <h3 className="font-bold text-lg">Yêu cầu xác thực PIN</h3>
                <input 
                    type="password" maxLength={4} autoFocus
                    className="w-40 text-center text-3xl tracking-[0.5em] border-2 border-brand-500 rounded-lg p-2 outline-none"
                    value={customerPin} onChange={e => setCustomerPin(e.target.value)}
                />
                <div className="flex space-x-3">
                    <button onClick={() => handleCheckIn(pendingToken, 'QR_RIENG', customerPin)} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold">Xác Nhận</button>
                    <button onClick={() => {setRequirePin(false); setCustomerPin(''); setPauseScan(false)}} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
                </div>
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
              <button onClick={() => handleViewCustomer(searchTerm)} className="absolute right-2 top-2 px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">Tìm</button>
            </div>
            <p className="text-center text-gray-400 text-sm">Nhập SĐT chính xác để tìm kiếm và check-in.</p>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && !viewingCustomer && (
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
                            <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewCustomer(c.phone)}>
                                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                <td className="px-4 py-3">{c.phone}</td>
                                <td className="px-4 py-3 text-right">
                                    <button className="text-brand-600"><Eye size={16}/></button>
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
                        </div>
                    )}
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4">
                    <h4 className="font-bold text-sm text-gray-700 flex items-center"><Calendar size={16} className="mr-2"/> Cấu hình vé</h4>
                    <select className="w-full p-2 border rounded" value={ticketType} onChange={e => setTicketType(e.target.value as TicketType)}>
                        <option value={TicketType.SESSION_12}>Gói 12 Buổi</option>
                        <option value={TicketType.SESSION_20}>Gói 20 Buổi</option>
                        <option value={TicketType.MONTHLY}>Vé Tháng (30 ngày)</option>
                        <option value={TicketType.CUSTOM}>Tùy chọn khác...</option>
                    </select>

                    {ticketType === TicketType.CUSTOM && <input type="number" placeholder="Số buổi" className="w-full p-2 border rounded" value={customSessions} onChange={e => setCustomSessions(Number(e.target.value))} />}

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

        {status && activeTab !== 'create' && activeTab !== 'customers' && (
            <div className={`mt-4 p-3 rounded-lg flex items-center ${status.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {status.success ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
                <span className="font-medium">{status.msg}</span>
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
                    <button onClick={() => window.print()} className="w-full py-2 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"><Printer size={16} className="mr-2" /> In Mã</button>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDashboard;
