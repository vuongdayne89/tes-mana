import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import PublicCheckIn from './pages/PublicCheckIn';
import CustomerDashboard from './pages/CustomerDashboard';
import StaffDashboard from './pages/StaffDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Login from './pages/Login'; 

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/checkin" element={<PublicCheckIn />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;