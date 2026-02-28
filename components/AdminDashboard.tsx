
import React, { useState, useMemo } from 'react';
import { MedicalRecord, Medication, MedicalCode } from '../types';
import { geminiService } from '../services/geminiService';

interface AdminDashboardProps {
  onLogout: () => void;
  adminUsername: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface PatientData {
  username: string;
  records: MedicalRecord[];
  medications: Medication[];
  adherence: Record<string, boolean>;
  bpLogs: any[];
  email: string;
  mobileNumber: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, adminUsername, theme, toggleTheme }) => {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ username: '', idSuffix: '', code: adminUsername });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [analyzingRecordId, setAnalyzingRecordId] = useState<string | null>(null);

  const patients = useMemo(() => {
    const users = JSON.parse(localStorage.getItem('medintel_users') || '{}');
    const patientList: PatientData[] = [];

    Object.keys(users).forEach(username => {
      // Only include patients whose password matches this admin's username
      if (users[username].password !== adminUsername) return;

      const records = JSON.parse(localStorage.getItem(`medintel_${username}_records`) || '[]');
      const medications = JSON.parse(localStorage.getItem(`medintel_${username}_meds`) || '[]');
      const bpLogs = JSON.parse(localStorage.getItem(`medintel_${username}_bp`) || '[]');
      const email = users[username].email || 'Not provided';
      const mobileNumber = users[username].mobileNumber || 'Not provided';
      
      const today = new Date().toISOString().split('T')[0];
      const adherence = JSON.parse(localStorage.getItem(`medintel_${username}_adherence_${today}`) || '{}');

      patientList.push({
        username,
        records,
        medications,
        adherence,
        bpLogs,
        email,
        mobileNumber
      });
    });

    return patientList;
  }, [isAddPatientModalOpen, adminUsername, refreshTrigger]);

  const generateIdSuffix = () => {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPatient(prev => ({ ...prev, idSuffix: suffix }));
  };

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUsername = `${newPatient.idSuffix}${newPatient.username}`;
    if (!newPatient.username || !newPatient.idSuffix || !newPatient.code) return;

    const users = JSON.parse(localStorage.getItem('medintel_users') || '{}');
    if (users[finalUsername]) {
      alert('Patient ID already exists');
      return;
    }

    // We pre-register the user so the patient can "sign up" by completing their profile (mobile number)
    users[finalUsername] = { password: newPatient.code, isPreRegistered: true };
    localStorage.setItem('medintel_users', JSON.stringify(users));
    setIsAddPatientModalOpen(false);
    setNewPatient({ username: '', idSuffix: '', code: adminUsername });
  };

  const handleDeletePatient = (username: string) => {
    const users = JSON.parse(localStorage.getItem('medintel_users') || '{}');
    delete users[username];
    localStorage.setItem('medintel_users', JSON.stringify(users));
    
    // Clean up user data
    localStorage.removeItem(`medintel_${username}_records`);
    localStorage.removeItem(`medintel_${username}_meds`);
    localStorage.removeItem(`medintel_${username}_bp`);
    
    // Clear adherence data (keys starting with medintel_username_adherence_)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`medintel_${username}_adherence_`)) {
        localStorage.removeItem(key);
      }
    });
    
    if (selectedPatient === username) {
      setSelectedPatient(null);
    }
    setPatientToDelete(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePermanentLogout = () => {
    const users = JSON.parse(localStorage.getItem('medintel_users') || '{}');
    
    // Find all patients belonging to this admin
    const patientsToDelete = Object.keys(users).filter(username => users[username].password === adminUsername);
    
    patientsToDelete.forEach(username => {
      // Delete user entry
      delete users[username];
      
      // Clean up user data
      localStorage.removeItem(`medintel_${username}_records`);
      localStorage.removeItem(`medintel_${username}_meds`);
      localStorage.removeItem(`medintel_${username}_bp`);
      
      // Clear adherence data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`medintel_${username}_adherence_`)) {
          localStorage.removeItem(key);
        }
      });
    });
    
    // Save updated users list
    localStorage.setItem('medintel_users', JSON.stringify(users));
    
    // Finally logout
    onLogout();
  };

  const handleSuggestCodes = async (patientUsername: string, recordId: string, content: string) => {
    setAnalyzingRecordId(recordId);
    try {
      const result = await geminiService.suggestMedicalCodes(content);
      
      // Update local storage for this patient's records
      const storageKey = `medintel_${patientUsername}_records`;
      const savedRecords: MedicalRecord[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const updatedRecords = savedRecords.map(r => {
        if (r.id === recordId) {
          return { ...r, suggestedCodes: result.codes, ambiguities: result.ambiguities };
        }
        return r;
      });
      
      localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error suggesting codes:", error);
      alert("Failed to suggest medical codes.");
    } finally {
      setAnalyzingRecordId(null);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePatient = patients.find(p => p.username === selectedPatient);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Patient,Record Date,Type,Facility,BMI,Medications,Adherence (Today),Email,Mobile\n";

    patients.forEach(p => {
      const meds = p.medications.map(m => m.name).join('; ');
      const adherenceStr = p.medications.map(m => {
        const taken = p.adherence[m.id];
        return `${m.name}:${taken ? 'Yes' : 'No'}`;
      }).join('; ');
      
      if (p.records.length > 0) {
        p.records.forEach(r => {
          csvContent += `${p.username},${r.date},${r.type},${r.facility},${r.bmi || ''},"${meds}","${adherenceStr}","${p.email}","${p.mobileNumber}"\n`;
        });
      } else {
        csvContent += `${p.username},N/A,N/A,N/A,N/A,"${meds}","${adherenceStr}","${p.email}","${p.mobileNumber}"\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medintel_patient_database.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-30 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">MedIntel <span className="text-blue-600">Admin</span></h1>
          <button 
            onClick={toggleTheme}
            className="ml-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="ml-2 p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center space-x-2 px-3"
            title="Logout Permanently"
          >
            <span className="text-sm font-bold">Logout Permanently</span>
            <span>🚪</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsAddPatientModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center"
          >
            <span className="mr-2">➕</span> Add Patient
          </button>
          <button 
            onClick={exportToCSV}
            className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all flex items-center"
          >
            <span className="mr-2">📊</span> Export CSV
          </button>
          <button 
            onClick={onLogout}
            className="text-slate-500 hover:text-red-600 font-bold text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Patient List */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search patients..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPatients.map(p => (
              <div key={p.username} className="relative group">
                <button
                  onClick={() => setSelectedPatient(p.username)}
                  className={`w-full text-left px-6 py-4 border-b border-slate-50 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedPatient === p.username ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''}`}
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">{p.username}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.records.length} Records</p>
                    <div className={`w-2 h-2 rounded-full ${p.medications.length > 0 ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPatientToDelete(p.username);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg z-20"
                  title="Delete Patient"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {filteredPatients.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic text-sm">
                No patients found.
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Patient Details */}
        <section className="flex-1 overflow-y-auto p-10">
          {activePatient ? (
            <div className="max-w-4xl mx-auto space-y-10">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">{activePatient.username}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Patient Profile & Clinical History</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Last Activity</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Today</p>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Medication Adherence</p>
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl ${Object.values(activePatient.adherence).every(v => v) && activePatient.medications.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {Object.values(activePatient.adherence).filter(v => v).length} / {activePatient.medications.length}
                    </div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Taken Today</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Total Records</p>
                  <div className="text-2xl font-bold text-blue-600">{activePatient.records.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email Address</p>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={activePatient.email}>{activePatient.email}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mobile Number</p>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{activePatient.mobileNumber}</div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Clinical Records</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activePatient.records.map(r => (
                    <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded uppercase tracking-wider">{r.type}</span>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">{r.facility}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{r.date} • {r.provider}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {r.bmi && (
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase">BMI</p>
                              <p className="text-lg font-black text-blue-600">{r.bmi}</p>
                            </div>
                          )}
                          <button
                            onClick={() => handleSuggestCodes(activePatient.username, r.id, r.rawContent)}
                            disabled={analyzingRecordId === r.id}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                              analyzingRecordId === r.id 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            }`}
                          >
                            {analyzingRecordId === r.id ? 'Analyzing...' : 'Suggest Billing Codes'}
                          </button>
                        </div>
                      </div>

                      {/* Suggested Codes Display */}
                      {(r.suggestedCodes || r.ambiguities) && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                          {r.suggestedCodes && r.suggestedCodes.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Suggested Billing Codes</p>
                              <div className="flex flex-wrap gap-2">
                                {r.suggestedCodes.map((c, idx) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center space-x-2">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${c.type === 'ICD-10' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                                      {c.type}
                                    </span>
                                    <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{c.code}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{c.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.ambiguities && r.ambiguities.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center">
                                <span className="mr-1">⚠️</span> Ambiguities / Missing Info
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {r.ambiguities.map((a, idx) => (
                                  <li key={idx} className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {activePatient.records.length === 0 && (
                    <div className="py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                      No records found for this patient.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Medication Schedule</h3>
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700">Medicine</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Dosage</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Status (Today)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePatient.medications.map(m => (
                        <tr key={m.id}>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{m.name}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{m.dosagePerIntake} • {m.timesPerDay}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${activePatient.adherence[m.id] ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {activePatient.adherence[m.id] ? 'TAKEN' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {activePatient.medications.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">No medications listed.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <div className="text-6xl mb-4">🩺</div>
              <h3 className="text-xl font-bold">Select a patient to view details</h3>
              <p className="text-sm">Comprehensive clinical history and adherence tracking</p>
            </div>
          )}
        </section>
      </main>

      {/* Add Patient Modal */}
      {isAddPatientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-2xl">Register New Patient</h3>
              <p className="text-slate-500 mt-1">Generate a secure access code for the patient.</p>
            </div>
            <form onSubmit={handleAddPatient} className="p-10 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">4-Digit ID</label>
                   <div className="flex space-x-2">
                     <input 
                       type="text" 
                       required
                       maxLength={4}
                       value={newPatient.idSuffix} 
                       onChange={e => setNewPatient({...newPatient, idSuffix: e.target.value.replace(/\D/g, '')})} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-mono font-bold text-center"
                       placeholder="1234"
                     />
                     <button 
                      type="button"
                      onClick={generateIdSuffix}
                      className="bg-slate-100 text-slate-600 px-4 rounded-2xl font-bold hover:bg-slate-200 transition-all text-xs"
                     >
                       Gen
                     </button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Base Username</label>
                   <input 
                     type="text" 
                     required
                     value={newPatient.username} 
                     onChange={e => setNewPatient({...newPatient, username: e.target.value.replace(/\s/g, '')})} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="john"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Final Patient ID (Username)</label>
                 <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 font-bold text-blue-700 text-center text-xl">
                   {newPatient.idSuffix || '----'}{newPatient.username || '----'}
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Access Code (Hospital Username)</label>
                 <input 
                   type="text" 
                   readOnly
                   required
                   value={newPatient.code} 
                   className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 font-mono font-bold text-blue-600 cursor-not-allowed"
                 />
                 <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patients use your username as their access code</p>
               </div>
               <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsAddPatientModalOpen(false)} className="flex-1 text-slate-500 font-bold text-base hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-2xl font-bold text-base py-4 shadow-2xl hover:bg-blue-700 transition-all active:scale-[0.98]">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center text-red-600 text-3xl mx-auto mb-6">⚠️</div>
              <h3 className="font-bold text-slate-900 text-2xl">Delete Patient?</h3>
              <p className="text-slate-500 mt-2">Are you sure you want to permanently delete <strong>{patientToDelete}</strong>? This action cannot be undone.</p>
            </div>
            <div className="p-10 bg-slate-50 flex space-x-4">
              <button 
                onClick={() => setPatientToDelete(null)} 
                className="flex-1 text-slate-500 font-bold text-base hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeletePatient(patientToDelete)} 
                className="flex-1 bg-red-600 text-white rounded-2xl font-bold text-base py-4 shadow-xl hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Permanently Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="p-10 text-center">
              <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-3xl mx-auto mb-6">⚠️</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-2xl">Logout Permanently?</h3>
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <p className="text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest mb-2">Critical Warning</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-bold">
                  Logging out permanently will <span className="text-red-600 dark:text-red-400 underline">delete all {patients.length} patients</span> and their medical history from the database.
                </p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-xs font-medium">
                This action is irreversible. All clinical data for <strong>{adminUsername}</strong> will be wiped.
              </p>
            </div>
            <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex flex-col space-y-3">
              <button 
                onClick={handlePermanentLogout} 
                className="w-full bg-red-600 text-white rounded-2xl font-bold text-lg py-5 shadow-xl shadow-red-200 dark:shadow-red-900/20 hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Yes, Wipe Data & Logout
              </button>
              <button 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="w-full text-slate-500 dark:text-slate-400 font-bold text-base hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
