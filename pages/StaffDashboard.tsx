import React, { useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, CheckInLog } from '../types';
import { performCheckIn, getCheckInLogs, generateTicketToken } from '../services/mockDb';
import { Camera, Search, CheckCircle, XCircle, UserPlus, RefreshCw, KeyRound } from 'lucide-react';

const StaffDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'list'>('scan');
  const [manualId, setManualId] = useState('');
  const [scanInput, setScanInput] = useState(''); // For demo: pasting the token
  const [status, setStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [requirePin, setRequirePin] = useState(false);
  const [customerPin, setCustomerPin] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  const handleCheckIn = async (idOrToken: string, method: 'QR_RIENG' | 'MANUAL', pin?: string) => {
    if (!idOrToken) return;
    
    // Reset status only if not in PIN flow
    if (!pin) setStatus(null);
    
    const res = await performCheckIn(idOrToken, method, 'anan1', 'staff1', pin);
    
    if (res.requirePin) {
        setRequirePin(true);
        setPendingToken(idOrToken);
        return;
    }

    setStatus({ msg: res.message, success: res.success });
    if (res.success) {
        setManualId('');
        setScanInput('');
        setRequirePin(false);
        setCustomerPin('');
        setPendingToken('');
        // Refresh logs if successful
        getCheckInLogs().then(setLogs);
    } else if (pin) {
        // If PIN failed, keep PIN input open but show error
        // optional: setRequirePin(false) if max retries reached logic exists in FE
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (customerPin.length === 4) {
          await handleCheckIn(pendingToken, 'QR_RIENG', customerPin);
      }
  }

  React.useEffect(() => {
    if (activeTab === 'list') {
      getCheckInLogs().then(setLogs);
    }
  }, [activeTab]);

  // Helper for demo: Generate a valid token to test scanning easily
  const copyDemoToken = async () => {
      const token = await generateTicketToken('T003');
      setScanInput(token);
  }

  return (
    <Layout role={UserRole.STAFF} title="Staff: Lê Lợi Branch">
      
      {/* Tab Navigation */}
      <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border border-gray-200">
        <button 
          onClick={() => { setActiveTab('scan'); setStatus(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'scan' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}
        >
          QR Scan
        </button>
        <button 
          onClick={() => { setActiveTab('manual'); setStatus(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}
        >
          Manual
        </button>
         <button 
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'list' ? 'bg-brand-100 text-brand-700' : 'text-gray-500'}`}
        >
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        
        {activeTab === 'scan' && !requirePin && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-full max-w-xs aspect-square bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-gray-500 relative overflow-hidden mb-4">
              <Camera size={48} className="mb-2 opacity-50" />
              <span className="text-sm">Camera Active</span>
              <div className="absolute inset-0 border-2 border-brand-500 opacity-50 animate-pulse rounded-2xl"></div>
            </div>

            {/* Demo Input for Token */}
            <div className="w-full max-w-xs space-y-2">
                <input 
                    type="text" 
                    placeholder="Paste QR Token here..." 
                    className="w-full text-xs p-2 border rounded bg-gray-50"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                />
                <button 
                onClick={() => handleCheckIn(scanInput, 'QR_RIENG')} 
                disabled={!scanInput}
                className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:bg-gray-300"
                >
                Validate Scanned QR
                </button>
            </div>
            
             <button onClick={copyDemoToken} className="text-xs text-blue-500 underline mt-4">
                Generate Valid Demo Token (T003) for Testing
             </button>
          </div>
        )}

        {/* PIN Prompt for Private QR */}
        {activeTab === 'scan' && requirePin && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in">
                <div className="p-4 bg-orange-50 text-orange-800 rounded-full">
                    <KeyRound size={32} />
                </div>
                <div className="text-center">
                    <h3 className="font-bold text-lg">Authentication Required</h3>
                    <p className="text-gray-500 text-sm">Ticket requires PIN verification.</p>
                    <p className="text-gray-500 text-sm">Please ask customer to enter their PIN.</p>
                </div>
                <form onSubmit={handlePinSubmit} className="w-full max-w-xs">
                    <input 
                        type="password" 
                        maxLength={4}
                        autoFocus
                        className="w-full text-center text-3xl tracking-[1em] border-2 border-brand-500 rounded-lg p-3 mb-4"
                        value={customerPin}
                        onChange={e => setCustomerPin(e.target.value)}
                        placeholder="••••"
                    />
                     <button 
                        type="submit"
                        disabled={customerPin.length !== 4}
                        className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:bg-gray-300"
                    >
                        Confirm PIN
                    </button>
                     <button 
                        type="button"
                        onClick={() => { setRequirePin(false); setCustomerPin(''); setPendingToken(''); setStatus(null); }}
                        className="w-full mt-2 py-2 text-gray-500"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'manual' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Manual Check-in</h3>
              <p className="text-sm text-gray-500">Enter Ticket ID to override</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" 
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="e.g., T001"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <button 
              onClick={() => handleCheckIn(manualId, 'MANUAL')}
              disabled={!manualId}
              className="w-full flex items-center justify-center py-3 bg-brand-600 disabled:bg-gray-300 text-white rounded-lg font-medium hover:bg-brand-700"
            >
              <UserPlus size={20} className="mr-2" />
              Manual Check In (Log)
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
                <button onClick={() => getCheckInLogs().then(setLogs)} className="p-2 hover:bg-gray-100 rounded-full">
                    <RefreshCw size={16} />
                </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <div className="flex items-center">
                        <span className="font-medium text-gray-900 mr-2">{log.user_name}</span>
                        {log.is_manual_by_staff && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">MANUAL</span>}
                    </div>
                    <div className="text-xs text-gray-500">{log.ticket_id} • {new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {log.method}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Feedback Modal/Overlay */}
        {status && activeTab !== 'list' && !requirePin && (
          <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start">
              {status.success ? <CheckCircle className="text-green-500 mr-3 flex-shrink-0" /> : <XCircle className="text-red-500 mr-3 flex-shrink-0" />}
              <div>
                <h4 className={`font-bold ${status.success ? 'text-green-800' : 'text-red-800'}`}>
                  {status.success ? 'Success' : 'Error'}
                </h4>
                <p className="text-sm text-gray-600 break-all">{status.msg}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDashboard;