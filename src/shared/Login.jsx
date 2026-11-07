import React, { useState, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../core/api';
import Logo from './Logo';

export default function Login({ onAuthSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'error',
    message: ''
  });

  const triggerAlert = useCallback((message, type = 'error') => {
    setNotification({ isOpen: true, type, message });
  }, []);

  const closeAlert = useCallback(() => {
    setNotification(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Guard against rapid duplicate clicks

    closeAlert();

    const cleanIdentifier = identifier.trim();
    
    if (!cleanIdentifier || !password) {
      triggerAlert("Please enter your registered ID Number and password to log in.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest('api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          identifier: cleanIdentifier, 
          password 
        })
      });

      const data = await response.json().catch(() => null);

      if (!data) {
        throw new Error("Server returned an invalid response format.");
      }

      if (response.ok && data.status === 'SUCCESS') {
        localStorage.setItem('intranet_access_token', data.token);
        onAuthSuccess(data.token, data.domain_context, data.user);
      } else {
        let cleanMessage = data.message || "Invalid credentials. Please check your details and try again.";
        
        if (cleanMessage.includes('SQLSTATE') || cleanMessage.includes('PDO')) {
          cleanMessage = "A temporary database processing glitch occurred. Please try signing in again.";
        }

        triggerAlert(cleanMessage);
      }
    } catch (error) {
      console.error("LAN_AUTHENTICATION_FAILURE:", error);
      
      let fallbackMsg = "Could not connect to the school server. Please verify your network connection.";
      if (error.message && !error.message.includes('SQLSTATE') && !error.message.includes('PDO')) {
        fallbackMsg = error.message;
      }

      triggerAlert(fallbackMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FF] flex flex-col justify-between items-center py-6 px-4 select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">
      <div className="pt-2 flex justify-center w-full">
        <Logo size={65} showText={false} />
      </div>

      <div className="w-full max-w-[440px] mx-auto my-auto bg-gradient-to-b from-[#F2EDFC] via-[#EAE1F7] to-[#DFD4F2] border border-[#CDBCE9] px-8 py-9 rounded-3xl shadow-sm flex flex-col items-center">
        <div className="mb-6 text-center w-full">
          <h1 className="text-sm font-black text-[#2A1A63] tracking-wide uppercase">PORTAL LOGIN VERIFICATION</h1>
          <p className="text-[11px] text-[#6E5D91] font-medium mt-2 px-2 leading-relaxed">
            Please enter your institutional tracking code and account password to securely connect to your intranet node workspace
          </p>
        </div>

        {notification.isOpen && (
          <div className={`w-full p-3 rounded-xl border text-xs font-medium mb-4 flex items-start gap-2 relative animate-fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#C62927] shrink-0 mt-0.5" />
            )}
            <span className="pr-4 text-left">{notification.message}</span>
            <button 
              type="button" 
              onClick={closeAlert} 
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
          <div>
            <label className="block text-[11px] font-bold text-[#2A1A63] mb-1.5">Staff No / Admission No</label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="eg. TCH/00... or startrite/00/000..."
              className="w-full px-3.5 py-2.5 bg-white/70 border border-[#C5B3E2] text-xs text-[#2A1A63] rounded-xl focus:outline-none focus:border-[#2A1A63] focus:bg-white transition-all placeholder:text-[#9A87A9] shadow-2xs font-mono disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#2A1A63] mb-1.5">Password</label>
            <input
              type="password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 bg-white/70 border border-[#C5B3E2] text-xs text-[#2A1A63] rounded-xl focus:outline-none focus:border-[#2A1A63] focus:bg-white transition-all placeholder:text-[#9A87A9] shadow-2xs disabled:opacity-60"
            />
            <p className="text-[10px] text-[#8C7AAB] mt-1">Must be at least 8 characters.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#1C1A24] hover:bg-[#2A1A63] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-5 active:scale-[0.98] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking Credentials...
              </>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}