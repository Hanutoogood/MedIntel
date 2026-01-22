
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Chat } from "@google/genai";

interface ChatInterfaceProps {
  initialPrompt?: string | null;
  clearInitialPrompt?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialPrompt, clearInitialPrompt }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm your Medical Intelligence Assistant. How can I help you understand your health records today?" }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = geminiService.createHealthChat("Focus on medical record interpretation.");
  }, []);

  // Handle incoming prompts from other parts of the app
  useEffect(() => {
    if (initialPrompt && chatRef.current && !isLoading) {
      handleSend(initialPrompt);
      if (clearInitialPrompt) clearInitialPrompt();
    }
  }, [initialPrompt, chatRef.current]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() || !chatRef.current) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customInput) setInput('');
    setIsLoading(true);

    try {
      let responseText = "";
      
      if (isThinking) {
        const result = await geminiService.analyzeDocument(textToSend, true);
        responseText = result;
      } else {
        const result = await chatRef.current.sendMessage({ message: textToSend });
        responseText = result.text || "No response received.";
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText, isThinking }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I had trouble processing that request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-bold text-slate-800">Intelligence Assistant</h2>
          <p className="text-xs text-slate-500">Powered by Gemini 3 Pro</p>
        </div>
        <div className="flex items-center space-x-2">
           <span className="text-xs font-medium text-slate-600">Thinking Mode</span>
           <button 
             onClick={() => setIsThinking(!isThinking)}
             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isThinking ? 'bg-blue-600' : 'bg-slate-300'}`}
           >
             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isThinking ? 'translate-x-6' : 'translate-x-1'}`} />
           </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
            }`}>
              {m.isThinking && (
                <div className="flex items-center space-x-1 mb-2 text-[10px] uppercase tracking-wider font-bold opacity-70">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Deep Reasoning Applied</span>
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 border border-slate-200">
               <div className="flex space-x-2">
                 <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your medical history..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition-all font-semibold text-sm shadow-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
