import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../services/mockDb';
import { UserRole } from '../types';
import { ArrowLeft, Lock, KeyRound } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as UserRole || UserRole.CUSTOMER;
  
  const [phone, setPhone] = useState('');
  const [secret, setSecret] = useState(''); // PIN or Password
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isStaffOrOwner = roleParam === UserRole.OWNER || roleParam === UserRole.STAFF;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Call Auth Service
    const { user, error: loginError } = await login(phone, secret, roleParam);
    
    if (user) {
      if (user.role === UserRole.CUSTOMER) navigate('/customer');
      else if (user.role === UserRole.STAFF) navigate('/staff');
      else if (user.role === UserRole.OWNER) navigate('/owner');
    } else {
      setError(loginError || 'Authentication failed.');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {roleParam === UserRole.OWNER ? 'Owner Login' : roleParam === UserRole.STAFF ? 'Staff Login' : 'Customer Login'}
            </h1>
            <p className="text-gray-500">
                {isStaffOrOwner ? 'Enter your credentials to manage the system.' : 'Enter your phone and PIN to access your tickets.'}
            </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              placeholder="09xx xxx xxx"
              required
            />
            {isStaffOrOwner && <p className="text-xs text-gray-400 mt-1">Demo: 0909000001 (Owner) / 0909000002 (Staff)</p>}
            {!isStaffOrOwner && <p className="text-xs text-gray-400 mt-1">Demo: 0912345678</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {isStaffOrOwner ? 'Password' : '4-Digit PIN'}
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
            {isStaffOrOwner && <p className="text-xs text-gray-400 mt-1">Demo: admin123 / staff123</p>}
             {!isStaffOrOwner && <p className="text-xs text-gray-400 mt-1">Demo: 1234</p>}
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-200"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
        
        {/* Switcher for convenience in Demo */}
        {!isStaffOrOwner && (
             <div className="mt-6 text-center text-sm text-gray-400">
                <p>Forgot PIN? Contact staff at the counter.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;