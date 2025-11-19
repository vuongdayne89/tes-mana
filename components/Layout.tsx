import React from 'react';
import { UserRole } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, QrCode, PieChart, List, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role?: UserRole;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, role, title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-brand-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg truncate">{title}</h1>
          {role && (
            <button onClick={handleLogout} className="p-2 hover:bg-brand-700 rounded-full">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation (Mobile First) */}
      {role && (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 pb-safe">
          <div className="flex justify-around items-center h-16 max-w-5xl mx-auto">
            
            {role === UserRole.CUSTOMER && (
              <>
                <NavItem 
                  icon={<User size={24} />} 
                  label="My Tickets" 
                  active={isActive('/customer')} 
                  onClick={() => navigate('/customer')} 
                />
                <NavItem 
                  icon={<List size={24} />} 
                  label="History" 
                  active={isActive('/customer/history')} 
                  onClick={() => navigate('/customer/history')} 
                />
              </>
            )}

            {role === UserRole.STAFF && (
              <>
                <NavItem 
                  icon={<QrCode size={24} />} 
                  label="Scan" 
                  active={isActive('/staff')} 
                  onClick={() => navigate('/staff')} 
                />
                <NavItem 
                  icon={<List size={24} />} 
                  label="Activity" 
                  active={isActive('/staff/activity')} 
                  onClick={() => navigate('/staff/activity')} 
                />
              </>
            )}

            {role === UserRole.OWNER && (
              <>
                <NavItem 
                  icon={<PieChart size={24} />} 
                  label="Overview" 
                  active={isActive('/owner')} 
                  onClick={() => navigate('/owner')} 
                />
                <NavItem 
                  icon={<List size={24} />} 
                  label="Tickets" 
                  active={isActive('/owner/tickets')} 
                  onClick={() => navigate('/owner/tickets')} 
                />
                <NavItem 
                  icon={<User size={24} />} 
                  label="Logs" 
                  active={isActive('/owner/logs')} 
                  onClick={() => navigate('/owner/logs')} 
                />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ 
  icon, label, active, onClick 
}) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default Layout;