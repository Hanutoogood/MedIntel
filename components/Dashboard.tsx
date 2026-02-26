
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BloodPressureLog, HealthMetric } from '../types';

interface DashboardProps {
  onPreparePoints: (prompt: string) => void;
  onOpenBpLog: () => void;
  recentBp?: BloodPressureLog;
  chartData: HealthMetric[];
  totalRecords: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onPreparePoints, onOpenBpLog, recentBp, chartData, totalRecords }) => {
  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | 'all'>('all');

  const filteredData = React.useMemo(() => {
    if (dateRange === 'all') return chartData;
    const now = new Date();
    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    return chartData.filter(d => new Date(d.date) >= cutoff);
  }, [chartData, dateRange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Health Overview</h2>
          <div className="flex items-center mt-1">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">System Secure • Privacy mode active</p>
          </div>
        </div>
        <button 
          onClick={onOpenBpLog}
          className="bg-white dark:bg-slate-900 border-2 border-blue-600 text-blue-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center shadow-sm"
        >
          <span className="mr-2 text-lg">❤️</span> Log Vitals
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium mb-1">Total Records</p>
          <p className="text-4xl font-bold">{totalRecords}</p>
          <div className="mt-4 flex items-center text-xs text-blue-200">
            Clinical documents in your vault
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Latest Blood Pressure</p>
          <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">
            {recentBp ? `${recentBp.systolic}/${recentBp.diastolic}` : '--/--'}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-400 dark:text-slate-500">
            {recentBp ? `Logged ${recentBp.date}` : 'No logs recorded yet'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Upcoming Appointments</p>
          <p className="text-lg font-bold text-slate-400 italic">None Scheduled</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Calendar synced with external providers</p>
          <button 
            disabled
            className="mt-2 text-xs text-slate-300 dark:text-slate-700 font-bold flex items-center cursor-not-allowed"
          >
            Prepare AI Discussion Points <span className="ml-1">→</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Health Trend Visualization */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Vitals History</h3>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    dateRange === range 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {range === 'all' ? 'All' : range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {filteredData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['auto', 'auto']} stroke={document.documentElement.classList.contains('dark') ? '#64748b' : '#94a3b8'} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                      color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ fill: '#2563eb', strokeWidth: 2 }} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-300 dark:text-slate-700 text-sm font-medium italic flex flex-col items-center">
                <span className="text-3xl mb-2">📈</span>
                {dateRange === 'all' 
                  ? 'Log your vitals to visualize health trends' 
                  : `No logs found for the last ${dateRange === '7d' ? '7 days' : '30 days'}`}
              </div>
            )}
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
             <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
               <span className="font-bold text-blue-600">AI Intelligence:</span> Your profile data is used to provide context for clinical record interpretation. 
             </p>
          </div>
        </div>

        {/* Intelligence Cards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Security & Processing</h3>
          <div className="space-y-4">
             <div className="flex items-start space-x-4 p-4 border border-blue-50 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/20">
               <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-xl">🛡️</div>
               <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200">End-to-End Encryption</p>
                 <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Data stays in your browser's private indexed workspace.</p>
               </div>
             </div>
             <div className="flex items-start space-x-4 p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
               <div className="bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xl">💊</div>
               <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Medication Extraction</p>
                 <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">AI automatically parses prescriptions and logs dosages in your list.</p>
               </div>
             </div>
             <div className="flex items-start space-x-4 p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
               <div className="bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xl">🧠</div>
               <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Advanced Reasoning</p>
                 <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Deep analysis provides context for complex clinical findings.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
