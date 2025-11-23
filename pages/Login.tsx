
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../services/mockDb';
import { UserRole } from '../types';
import { ArrowLeft, Lock, KeyRound, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as UserRole || UserRole.CUSTOMER;
  
  const [phone, setPhone] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isStaffOrOwner = roleParam === UserRole.OWNER || roleParam === UserRole.STAFF || roleParam === UserRole.SUPER_ADMIN;

  const getTitle = () => {
      if (roleParam === UserRole.SUPER_ADMIN) return 'Super Admin';
      if (roleParam === UserRole.OWNER) return 'Chủ Thương Hiệu';
      if (roleParam === UserRole.STAFF) return 'Nhân viên';
      return 'Hội viên';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { user, error: loginError } = await login(phone, secret, roleParam);
    
    if (user) {
      if (user.role === UserRole.CUSTOMER) navigate('/customer');
      else if (user.role === UserRole.STAFF) navigate('/staff');
      else if (user.role === UserRole.OWNER) navigate('/owner');
      else if (user.role === UserRole.SUPER_ADMIN) navigate('/super-admin');
    } else {
      setError(loginError || 'Đăng nhập thất bại.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4">
        <button onClick={() => navigate('/')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
          <ArrowLeft />
        </button>
      </div>
      
      <div className="flex-1 px-8 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                {roleParam === UserRole.SUPER_ADMIN && <Shield className="mr-2 text-red-600"/>}
                {getTitle()}
            </h1>
            <p className="text-gray-500">
                {roleParam === UserRole.SUPER_ADMIN ? 'Đăng nhập quản trị hệ thống ONIN.' : 'Đăng nhập nền tảng ONIN.'}
            </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {roleParam === UserRole.SUPER_ADMIN ? 'Tên đăng nhập' : 'Số điện thoại'}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              placeholder={roleParam === UserRole.SUPER_ADMIN ? "admin" : "09xx xxx xxx"}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {isStaffOrOwner ? 'Mật khẩu' : 'Mã PIN (4 số)'}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    {isStaffOrOwner ? <Lock size={18} /> : <KeyRound size={18} />}
                </div>
                <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                maxLength={isStaffOrOwner ? undefined : 4}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder={isStaffOrOwner ? "••••••••" : "••••"}
                required
                />
            </div>
            {roleParam === UserRole.SUPER_ADMIN && <p className="text-xs text-gray-400 mt-1">Default: admin / root123</p>}
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-200"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
