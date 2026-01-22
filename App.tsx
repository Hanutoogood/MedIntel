
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import RecordCard from './components/RecordCard';
import ChatInterface from './components/ChatInterface';
import { BloodPressureLog, MedicalRecord, HealthMetric, RecordType, Medication } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('medintel_current_user'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  
  // Per-user states
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [bpLogs, setBpLogs] = useState<BloodPressureLog[]>([]);
  const [adherence, setAdherence] = useState<Record<string, boolean>>({});

  // Login Form States
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Modals
  const [isBpModalOpen, setIsBpModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  
  const [newBp, setNewBp] = useState({ sys: '', dia: '' });
  const [newRecord, setNewRecord] = useState({
    facility: '',
    provider: '',
    date: new Date().toISOString().split('T')[0],
    type: RecordType.CONSULTATION,
    content: ''
  });
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Load User Data when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const savedRecords = localStorage.getItem(`medintel_${currentUser}_records`);
      const savedMeds = localStorage.getItem(`medintel_${currentUser}_meds`);
      const savedBp = localStorage.getItem(`medintel_${currentUser}_bp`);
      const today = new Date().toISOString().split('T')[0];
      const savedAdherence = localStorage.getItem(`medintel_${currentUser}_adherence_${today}`);

      setRecords(savedRecords ? JSON.parse(savedRecords) : []);
      setMedications(savedMeds ? JSON.parse(savedMeds) : []);
      setBpLogs(savedBp ? JSON.parse(savedBp) : []);
      setAdherence(savedAdherence ? JSON.parse(savedAdherence) : {});
    } else {
      // Reset state on logout
      setRecords([]);
      setMedications([]);
      setBpLogs([]);
      setAdherence({});
    }
  }, [currentUser]);

  // Persist User Data
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`medintel_${currentUser}_records`, JSON.stringify(records));
    }
  }, [records, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`medintel_${currentUser}_meds`, JSON.stringify(medications));
    }
  }, [medications, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`medintel_${currentUser}_bp`, JSON.stringify(bpLogs));
    }
  }, [bpLogs, currentUser]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!username || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('medintel_users') || '{}');

    if (loginMode === 'register') {
      if (users[username]) {
        setAuthError('Username already taken.');
        return;
      }
      users[username] = { password };
      localStorage.setItem('medintel_users', JSON.stringify(users));
      login(username);
    } else {
      if (!users[username]) {
        setAuthError('Username not found.');
        return;
      }
      if (users[username].password !== password) {
        setAuthError('Incorrect password.');
        return;
      }
      login(username);
    }
  };

  const login = (name: string) => {
    setCurrentUser(name);
    localStorage.setItem('medintel_current_user', name);
    setUsername('');
    setPassword('');
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('medintel_current_user');
    setActiveTab('dashboard');
    setUsername('');
    setPassword('');
    setLoginMode('login');
  };

  const combinedBpData = useMemo(() => {
    return bpLogs.map(log => ({
      date: log.date,
      value: log.systolic,
      unit: 'mmHg',
      label: 'Systolic'
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bpLogs]);

  const toggleAdherence = (medName: string) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const newAdherence = { ...adherence, [medName]: !adherence[medName] };
    setAdherence(newAdherence);
    localStorage.setItem(`medintel_${currentUser}_adherence_${today}`, JSON.stringify(newAdherence));
  };

  const addBpLog = () => {
    if (!newBp.sys || !newBp.dia) return;
    const log: BloodPressureLog = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toLocaleDateString(),
      systolic: parseInt(newBp.sys),
      diastolic: parseInt(newBp.dia)
    };
    setBpLogs(prev => [...prev, log]);
    setIsBpModalOpen(false);
    setNewBp({ sys: '', dia: '' });
  };

  const deleteRecord = (id: string) => {
    if (window.confirm("Permanently delete this medical record?")) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const deleteBpLog = (id: string) => {
    if (window.confirm("Delete this blood pressure reading?")) {
      setBpLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.facility || !newRecord.content) {
      alert("Please provide the facility name and the record content.");
      return;
    }

    setIsSavingRecord(true);
    try {
      const recordId = `user-rec-${Math.random().toString(36).substring(7)}`;
      const createdRecord: MedicalRecord = {
        id: recordId,
        date: newRecord.date,
        type: newRecord.type,
        provider: newRecord.provider || 'Unspecified Provider',
        facility: newRecord.facility,
        rawContent: newRecord.content,
        status: 'synced'
      };

      if (newRecord.type === RecordType.PRESCRIPTION) {
        const extractedMeds = await geminiService.extractMedications(newRecord.content);
        if (extractedMeds && extractedMeds.length > 0) {
          const formattedMeds: Medication[] = extractedMeds.map(m => ({
            id: `med-${Math.random().toString(36).substring(7)}`,
            name: m.name,
            dosagePerIntake: m.dosagePerIntake,
            timesPerDay: m.timesPerDay,
            frequency: m.frequency,
            startDate: newRecord.date,
            purpose: m.purpose || 'Prescribed treatment'
          }));
          setMedications(prev => [...prev, ...formattedMeds]);
          alert(`Prescription extracted. Added ${formattedMeds.length} items to your medicine list.`);
        }
      }

      setRecords(prev => [createdRecord, ...prev]);
      setIsAddRecordModalOpen(false);
      setNewRecord({
        facility: '',
        provider: '',
        date: new Date().toISOString().split('T')[0],
        type: RecordType.CONSULTATION,
        content: ''
      });
    } catch (error) {
      console.error(error);
      alert("Error processing record.");
    } finally {
      setIsSavingRecord(false);
    }
  };

  const navigateToAssistant = (prompt: string) => {
    let context = `Health Context for ${currentUser}:\n`;
    records.forEach(r => context += `- ${r.date}: ${r.type} from ${r.facility}\n`);
    medications.forEach(m => context += `- Medicine: ${m.name} (${m.dosagePerIntake}, ${m.timesPerDay})\n`);
    bpLogs.forEach(l => context += `- BP: ${l.date}: ${l.systolic}/${l.diastolic}\n`);
    setInitialPrompt(`${context}\n\nTask: ${prompt}`);
    setActiveTab('assistant');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-blue-600 p-10 text-center">
            <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 font-black text-3xl mx-auto mb-4 shadow-lg">M</div>
            <h1 className="text-white text-3xl font-bold tracking-tight">MedIntel</h1>
            <p className="text-blue-100 text-sm mt-2">Secure Medical Intelligence Hub</p>
          </div>
          <div className="p-10">
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setLoginMode('login')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${loginMode === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setLoginMode('register')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${loginMode === 'register' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              
              {authError && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl text-center">{authError}</p>}
              
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                {loginMode === 'login' ? 'Continue to Records' : 'Create Intelligence Profile'}
              </button>
            </form>
          </div>
          <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise-Grade Security Enabled</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          onPreparePoints={navigateToAssistant} 
          onOpenBpLog={() => setIsBpModalOpen(true)} 
          recentBp={bpLogs[bpLogs.length - 1]} 
          chartData={combinedBpData}
          totalRecords={records.length}
        />;
      case 'records':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Your Medical History</h2>
                <p className="text-slate-500">Add and manage reports from Metropolitan, Vasan, or any provider.</p>
              </div>
              <button 
                onClick={() => setIsAddRecordModalOpen(true)}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 z-10"
              >
                + Add New Record / Provider
              </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {records.map(record => (
                <RecordCard key={record.id} record={record} onDelete={() => deleteRecord(record.id)} />
              ))}
              {bpLogs.map((log) => (
                <div key={log.id} className="bg-white border border-blue-100 rounded-3xl p-8 shadow-sm relative group transition-all hover:border-blue-300">
                  <button 
                    onClick={() => deleteBpLog(log.id)}
                    className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 z-20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase mb-3 tracking-wider">Health Metric</span>
                  <h3 className="text-xl font-bold text-slate-800">Blood Pressure</h3>
                  <p className="text-sm text-slate-500 font-medium">{log.date}</p>
                  <div className="mt-6 text-4xl font-black text-blue-600">
                    {log.systolic}/{log.diastolic} <span className="text-sm text-slate-400 font-bold">mmHg</span>
                  </div>
                </div>
              ))}
              {records.length === 0 && bpLogs.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="text-5xl mb-4 opacity-30">📁</div>
                  <h3 className="text-xl font-bold text-slate-800">Your health vault is empty</h3>
                  <p className="text-slate-500 mt-2">Start by adding a visit or prescription to build your profile.</p>
                  <button 
                    onClick={() => setIsAddRecordModalOpen(true)}
                    className="mt-6 text-blue-600 font-bold hover:underline"
                  >
                    Add my first record →
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 'medications':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header>
              <h2 className="text-2xl font-bold text-slate-900">Current Medications</h2>
              <p className="text-slate-500">Review your extracted schedule and track daily compliance.</p>
            </header>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-6 font-bold text-slate-700">Medicine & Dose</th>
                      <th className="px-8 py-6 font-bold text-slate-700">Frequency</th>
                      <th className="px-8 py-6 font-bold text-slate-700">Today's Status</th>
                      <th className="px-8 py-6 font-bold text-slate-700 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {medications.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-slate-800 text-lg">{med.name}</p>
                          <div className="flex space-x-2 mt-2">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Take {med.dosagePerIntake}</span>
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">{med.timesPerDay} Daily</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-medium text-slate-600">
                          {med.frequency}
                        </td>
                        <td className="px-8 py-6">
                           <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${adherence[med.name] ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {adherence[med.name] ? 'TAKEN' : 'PENDING'}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => toggleAdherence(med.name)}
                            className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                              adherence[med.name] ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-blue-600 text-white shadow-lg'
                            }`}
                          >
                            {adherence[med.name] ? 'Reset Status' : 'Mark as Taken'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {medications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                          No medications found. Records marked as 'Prescription' will automatically extract details here.
                        </td>
                      </tr>
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        );
      case 'assistant':
        return <ChatInterface initialPrompt={initialPrompt} clearInitialPrompt={() => setInitialPrompt(null)} />;
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} currentUser={currentUser}>
      {renderContent()}

      {/* Manual BP Modal */}
      {isBpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-2xl">Log Blood Pressure</h3>
              <p className="text-slate-500 mt-1">Record your latest reading manually.</p>
            </div>
            <div className="p-10 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Systolic</label>
                   <input 
                     type="number" 
                     value={newBp.sys} 
                     onChange={e => setNewBp({...newBp, sys: e.target.value})} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center"
                     placeholder="120"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Diastolic</label>
                   <input 
                     type="number" 
                     value={newBp.dia} 
                     onChange={e => setNewBp({...newBp, dia: e.target.value})} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center"
                     placeholder="80"
                   />
                 </div>
               </div>
            </div>
            <div className="p-10 bg-slate-50 flex space-x-4">
              <button onClick={() => setIsBpModalOpen(false)} className="flex-1 text-slate-500 font-bold text-base hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={addBpLog} className="flex-1 bg-blue-600 text-white rounded-2xl font-bold text-base py-5 shadow-2xl hover:bg-blue-700 transition-all active:scale-[0.98]">Save Reading</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {isAddRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            {/* Modal Header */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-900 text-2xl md:text-3xl tracking-tight">Add Medical Event</h3>
              <p className="text-slate-500 mt-2 font-medium">Log reports, visits, or prescriptions for AI interpretation.</p>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-8 md:p-10 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Hospital or Medical Center</label>
                    <input 
                      type="text" 
                      value={newRecord.facility} 
                      onChange={e => setNewRecord({...newRecord, facility: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      placeholder="e.g. Metropolitan General Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Practitioner Name</label>
                    <input 
                      type="text" 
                      value={newRecord.provider} 
                      onChange={e => setNewRecord({...newRecord, provider: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Dr. Sarah Chen"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Service Date</label>
                    <input 
                      type="date" 
                      value={newRecord.date} 
                      onChange={e => setNewRecord({...newRecord, date: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Document Classification</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.values(RecordType).map(t => (
                          <button 
                            key={t}
                            type="button"
                            onClick={() => setNewRecord({...newRecord, type: t})}
                            className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newRecord.type === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                          >
                            {t}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Clinical Notes or Text</label>
                    <textarea 
                      value={newRecord.content} 
                      onChange={e => setNewRecord({...newRecord, content: e.target.value})} 
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-slate-700"
                      placeholder="Paste prescriptions, lab findings, or visit summaries here..."
                    />
                    <p className="mt-3 text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                      AI Intelligence Active: Medicines will be auto-detected
                    </p>
                  </div>
               </div>
            </div>

            {/* Modal Footer (Actions) - Always Fixed at Bottom */}
            <div className="p-8 md:p-10 bg-slate-50 flex space-x-6 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setIsAddRecordModalOpen(false)} 
                className="flex-1 text-slate-500 font-bold text-lg hover:text-slate-900 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleAddRecord}
                disabled={isSavingRecord}
                className="flex-[2] bg-blue-600 text-white rounded-2xl font-bold text-lg py-5 shadow-2xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                {isSavingRecord ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analyzing...
                  </span>
                ) : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
