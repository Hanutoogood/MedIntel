
import React, { useState } from 'react';
import { MedicalRecord } from '../types';
import { geminiService } from '../services/geminiService';

interface RecordCardProps {
  record: MedicalRecord;
  onDelete?: () => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onDelete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState(record.summary);
  const [showRaw, setShowRaw] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const summary = await geminiService.analyzeDocument(record.rawContent);
      setAiSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareVia = (platform: string) => {
    const text = `Medical Record from ${record.facility} (${record.date}): ${aiSummary || 'Attached medical report.'}`;
    const url = `https://medintel.app/view/${record.id}`;
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else {
      alert(`Sharing via ${platform} initiated for: ${record.id}`);
    }
    setShowShareMenu(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative group">
      {onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 z-10"
          title="Delete Record"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase mb-2">
            {record.type}
          </span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pr-8 leading-tight">{record.facility}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{record.provider} • {record.date}</p>
          {record.bmi && (
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">BMI: {record.bmi}</p>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">Synced</span>
        </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 min-h-[100px] flex flex-col justify-center border border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">AI Interpretation</h4>
        {aiSummary ? (
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiSummary}</p>
        ) : (
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center h-full group"
          >
            {isAnalyzing ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing...
              </span>
            ) : (
              <span className="group-hover:translate-x-1 transition-transform">Generate AI Summary →</span>
            )}
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        <button 
          onClick={() => setShowRaw(true)}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          View Raw Report
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Share Securely
          </button>
          
          {showShareMenu && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-20 w-48 animate-in slide-in-from-top-2">
               <button onClick={() => shareVia('whatsapp')} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center">
                 <span className="mr-2 text-lg">💬</span> WhatsApp
               </button>
               <button onClick={() => shareVia('facebook')} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center">
                 <span className="mr-2 text-lg">📱</span> Facebook
               </button>
               <button onClick={() => shareVia('email')} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                 <span className="mr-2 text-lg">✉️</span> Email Secure Link
               </button>
            </div>
          )}
        </div>
      </div>

      {showRaw && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Raw Clinical Data</h3>
              <button onClick={() => setShowRaw(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>
            <div className="p-6 bg-slate-900 text-green-400 font-mono text-xs overflow-auto max-h-[60vh] leading-relaxed">
              <pre>{record.rawContent}</pre>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 text-right">
              <button 
                onClick={() => setShowRaw(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordCard;
