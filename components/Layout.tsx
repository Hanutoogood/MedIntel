
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: string | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, onLogout }) => {
  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: '📊' },
    { id: 'records', label: 'My Records', icon: '📁' },
    { id: 'medications', label: 'Medications', icon: '💊' },
    { id: 'assistant', label: 'AI Assistant', icon: '🧠' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-8 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">M</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">MedIntel</h1>
          </div>
        </div>
        
        {/* Profile Card with prominent Logout Option */}
        <div className="p-6">
           <div className="bg-slate-50 rounded-2xl p-4 flex flex-col space-y-3 border border-slate-100 shadow-sm transition-all group">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                   {currentUser?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Profile</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{currentUser}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all flex items-center space-x-3 border border-transparent hover:border-red-100 shadow-sm bg-white"
              >
                <span className="text-lg">🚪</span>
                <span>Log out of session</span>
              </button>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-100'
                  : 'text-slate-500 hover:bg-slate-50 font-semibold'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Status: Secure</p>
            <p className="text-xs text-green-800 font-bold flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Local Vault Active
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm">M</div>
            <h1 className="text-lg font-black text-slate-800 tracking-tighter">MedIntel</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {tabs.map(t => (
                 <button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-2 rounded-xl transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                   {t.icon}
                 </button>
              ))}
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              type="button"
              onClick={() => onLogout()} 
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Log out"
            >
              🚪
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
