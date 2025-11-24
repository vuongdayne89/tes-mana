
import React from 'react';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
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
      <Switch>
        <Route exact path="/" component={Landing} />
        <Route path="/checkin" component={PublicCheckIn} />
        <Route path="/login" component={Login} />
        
        <Route path="/customer" component={CustomerDashboard} />
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/owner" component={OwnerDashboard} />
        <Route path="/super-admin" component={SuperAdminDashboard} />
        
        <Route path="*">
            <Redirect to="/" />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
