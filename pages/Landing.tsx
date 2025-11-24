
import React from 'react';
import { useHistory } from 'react-router-dom';
import { UserRole } from '../types';
import { Users, LayoutDashboard, QrCode, ShieldCheck } from 'lucide-react';

const Landing: React.FC = () => {
  const history = useHistory();

  const handleNavigateToLogin = (role: UserRole) => {
    history.push(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-brand-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">ONIN</h1>
          <p className="text-gray-500 mb-8 text-sm">Nền tảng vé điện tử & xác thực người dùng</p>

          <div className="space-y-3">
             <button
              onClick={() => history.push('/checkin?shop_id=anan1')}
              className="w-full flex items-center justify-center p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-brand-200"
            >
              <QrCode className="mr-3" />
              Kiosk Check-in
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Đăng nhập hệ thống</span>
              </div>
            </div>

            <button onClick={() => handleNavigateToLogin(UserRole.CUSTOMER)} className="w-full flex items-center p-3 bg-white border hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3"><Users size={20} /></div>
              <div><div className="font-medium text-gray-900">Hội viên</div><div className="text-xs text-gray-500">Ví vé & Lịch sử</div></div>
            </button>

            <button onClick={() => handleNavigateToLogin(UserRole.STAFF)} className="w-full flex items-center p-3 bg-white border hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mr-3"><QrCode size={20} /></div>
              <div><div className="font-medium text-gray-900">Nhân viên</div><div className="text-xs text-gray-500">Quét vé & Vận hành</div></div>
            </button>

            <button onClick={() => handleNavigateToLogin(UserRole.OWNER)} className="w-full flex items-center p-3 bg-white border hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3"><LayoutDashboard size={20} /></div>
              <div><div className="font-medium text-gray-900">Chủ thương hiệu</div><div className="text-xs text-gray-500">Quản trị & Báo cáo</div></div>
            </button>

             <button onClick={() => handleNavigateToLogin(UserRole.PLATFORM_ADMIN)} className="w-full flex items-center justify-center p-2 text-gray-400 text-xs hover:text-gray-600 mt-4">
              Platform Admin (ONIN)
            </button>
          </div>
        </div>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          Powered by ONIN Platform © 2025
        </div>
      </div>
    </div>
  );
};

export default Landing;
