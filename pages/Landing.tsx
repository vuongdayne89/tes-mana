import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Users, LayoutDashboard, QrCode } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToLogin = (role: UserRole) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧘</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Winson Check-in</h1>
          <p className="text-gray-500 mb-8">Hệ thống quản lý Yoga An An</p>

          <div className="space-y-3">
             <button
              onClick={() => navigate('/checkin?shop_id=anan1')}
              className="w-full flex items-center justify-center p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-brand-200"
            >
              <QrCode className="mr-3" />
              Trạm Check-in Tự động (Kiosk)
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc đăng nhập</span>
              </div>
            </div>

            <button
              onClick={() => handleNavigateToLogin(UserRole.CUSTOMER)}
              className="w-full flex items-center p-3 bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group"
            >
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3 group-hover:bg-blue-200">
                <Users size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Hội viên (Khách)</div>
                <div className="text-xs text-gray-500">Xem vé, lịch sử tập</div>
              </div>
            </button>

            <button
              onClick={() => handleNavigateToLogin(UserRole.STAFF)}
              className="w-full flex items-center p-3 bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group"
            >
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mr-3 group-hover:bg-orange-200">
                <QrCode size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Nhân viên / Lễ tân</div>
                <div className="text-xs text-gray-500">Quét vé, tạo vé khách lẻ</div>
              </div>
            </button>

            <button
              onClick={() => handleNavigateToLogin(UserRole.OWNER)}
              className="w-full flex items-center p-3 bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-xl transition-all text-left group"
            >
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3 group-hover:bg-purple-200">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Chủ phòng tập (Owner)</div>
                <div className="text-xs text-gray-500">Báo cáo, quản trị hệ thống</div>
              </div>
            </button>
          </div>
        </div>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          Phiên bản demo cho Yoga An An
        </div>
      </div>
    </div>
  );
};

export default Landing;