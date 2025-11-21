
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTicketsByPhone, performCheckIn, login, parseIdentityToken } from '../services/mockDb';
import { Ticket } from '../types';
import TicketCard from '../components/TicketCard';
import { AlertCircle, CheckCircle, Smartphone, KeyRound, QrCode } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

const PublicCheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get('shop_id') || 'anan1';
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{success: boolean; message: string}>({ success: false, message: '' });
  
  // Identity QR Input
  const [showIdentityInput, setShowIdentityInput] = useState(false);

  useEffect(() => {
     if (step === 4) {
         const timer = setTimeout(() => {
             resetFlow();
         }, 5000);
         return () => clearTimeout(timer);
     }
  }, [step]);

  const resetFlow = () => {
    setStep(1);
    setPhone('');
    setPin('');
    setTickets([]);
    setError('');
    setShowIdentityInput(false);
    setResult({ success: false, message: '' });
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return setError('Vui lòng nhập đúng số điện thoại');
    setError('');
    setStep(2);
  };
  
  const handleIdentityScan = (token: string) => {
      if (token) {
        const parsedPhone = parseIdentityToken(token);
        if (parsedPhone) {
            setPhone(parsedPhone);
            setStep(2); // Move to PIN
            setShowIdentityInput(false);
        } else {
            setError('Mã thẻ thành viên không hợp lệ');
        }
      }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return setError('PIN phải có 4 số');
    setLoading(true);
    setError('');

    const { user, error: loginError } = await login(phone, pin);

    if (!user) {
        setLoading(false);
        setError(loginError || 'Thông tin đăng nhập không đúng');
        return;
    }

    const foundTickets = await getTicketsByPhone(phone);
    if (foundTickets.length === 0) {
        setLoading(false);
        setError('Không tìm thấy vé nào đang hoạt động.');
        return;
    }

    setTickets(foundTickets);
    setLoading(false);
    setStep(3);
  };

  const handleTicketSelect = async (ticket: Ticket) => {
    setLoading(true);
    const res = await performCheckIn(ticket.ticket_id, 'QR_CHUNG', shopId, undefined, pin);
    setResult(res);
    setStep(4);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-brand-600 p-6 text-center text-white">
          <h2 className="text-xl font-bold">CHECK-IN TỰ ĐỘNG</h2>
          <p className="text-brand-100 text-sm mt-1">Yoga An An ({shopId})</p>
        </div>

        <div className="p-6">
          {/* Step 1: Phone or Identity Card */}
          {step === 1 && (
            <div className="space-y-6">
                 {!showIdentityInput ? (
                    <>
                         <form onSubmit={handlePhoneSubmit} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-brand-600 mb-3">
                                <Smartphone size={24} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Nhập Số Điện Thoại</h3>
                                <p className="text-sm text-gray-500">Vui lòng nhập SĐT đã đăng ký của bạn.</p>
                            </div>
                            
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full text-center text-2xl font-bold tracking-wider p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="09xx xxx xxx"
                                autoFocus
                            />
                            
                            <button
                                disabled={loading || phone.length < 10}
                                type="submit"
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition-colors"
                            >
                                Tiếp tục
                            </button>
                        </form>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Hoặc</span></div>
                        </div>

                        <button 
                            onClick={() => setShowIdentityInput(true)}
                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold flex items-center justify-center"
                        >
                            <QrCode className="mr-2" /> Quét Thẻ Thành Viên
                        </button>
                    </>
                 ) : (
                     <div className="space-y-4 text-center animate-in zoom-in">
                         <h3 className="font-bold">Quét Mã QR Thành Viên</h3>
                         <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-black mx-auto relative">
                             <div className="absolute inset-0 z-10 border-2 border-brand-500 opacity-50 pointer-events-none"></div>
                             <Scanner 
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        handleIdentityScan(result[0].rawValue);
                                    }
                                }}
                                scanDelay={1000}
                                components={{ audio: false, finder: false }}
                                styles={{
                                    container: { width: '100%', aspectRatio: '1/1' }
                                }}
                             />
                         </div>
                         <button onClick={() => setShowIdentityInput(false)} className="text-gray-500 text-sm underline">Quay lại nhập SĐT</button>
                     </div>
                 )}
                 {error && <p className="text-red-500 text-center text-sm">{error}</p>}
            </div>
          )}

          {/* Step 2: PIN */}
          {step === 2 && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
               <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-brand-600 mb-3">
                  <KeyRound size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Nhập mã PIN</h3>
                <p className="text-sm text-gray-500">Nhập mã bảo mật 4 số của bạn.</p>
              </div>

              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center text-3xl font-bold tracking-[1em] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                placeholder="••••"
                autoFocus
              />

               <button
                disabled={loading || pin.length !== 4}
                type="submit"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition-colors"
              >
                {loading ? 'Đang kiểm tra...' : 'Đăng nhập'}
              </button>
               {error && <p className="text-red-500 text-center text-sm bg-red-50 p-2 rounded">{error}</p>}
                <button type="button" onClick={resetFlow} className="w-full text-gray-500 text-sm">Quay lại</button>
            </form>
          )}

          {/* Step 3: Select Ticket */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                 <h3 className="font-bold text-gray-900">Chọn Vé</h3>
                 <p className="text-sm text-gray-500">Vui lòng chọn vé muốn sử dụng</p>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-3">
                  {tickets.map(t => (
                      <TicketCard key={t.ticket_id} ticket={t} onClick={() => handleTicketSelect(t)} />
                  ))}
              </div>
              {loading && <p className="text-center text-brand-600">Đang xử lý check-in...</p>}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && (
            <div className="text-center py-8 animate-in zoom-in">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 {result.success ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'CHECK-IN THÀNH CÔNG' : 'THẤT BẠI'}
              </h3>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-gray-400 h-full animate-progress" style={{width: '100%'}}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCheckIn;
