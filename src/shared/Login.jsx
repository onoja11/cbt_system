import React, { useState } from 'react';
import { ArrowRight, CircleDot, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../core/api'; // Central handler pipeline
import Logo from './Logo'; // Importing your institutional brand mark

export default function Login({ onAuthSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🏛️ APP LOCAL NOTIFICATION POPUP PANEL STATES
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'error', // 'error' | 'success'
    message: ''
  });

  const triggerAlert = (message, type = 'error') => {
    setNotification({ isOpen: true, type, message });
  };

  const closeAlert = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    closeAlert();
    
    if (!identifier.trim() || !password.trim()) {
      triggerAlert("Please fill in both your User ID and password to log in.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest('api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          identifier: identifier.trim(), 
          password: password 
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        localStorage.setItem('intranet_access_token', data.token);
        onAuthSuccess(data.token, data.domain_context, data.user);
      } else {
        triggerAlert(data.message || "Invalid login details. Please check your spelling and try again.");
      }
    } catch (error) {
      console.error("LAN_AUTHENTICATION_CRITICAL_FAILURE:", error);
      triggerAlert("Could not connect to the school server. Please verify your computer is connected to the school network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between p-6 select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      
      {/* Main Identity Verification Card Container */}
      <div className="w-full max-w-sm mx-auto my-auto bg-white border border-[#9A87A9]/30 p-8 rounded-xl shadow-xs shrink-0 flex flex-col items-center">
        
        {/* Brand Institutional Logo Header Enclave */}
        <div className="mb-6 flex justify-center w-full pb-4 border-b border-[#FAF9FA]">
          <Logo size={85} showText={false} />
        </div>

        <div className="mb-6 text-center w-full">
          <h1 className="text-base font-black text-[#2A1A63] tracking-tight uppercase">Portal Login Verification</h1>
          <p className="text-xs text-[#9A87A9] font-medium mt-1">Please enter your username and account password to open your dashboard or start an assessment.</p>
        </div>

        {/* INLINE CUSTOM STATE BANNER MESSAGES NOTIFIER */}
        {notification.isOpen && (
          <div className={`w-full p-3 rounded-lg border text-xs font-medium mb-4 flex items-start gap-2 relative animate-fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#C62927] shrink-0 mt-0.5" />
            )}
            <span className="pr-4">{notification.message}</span>
            <button 
              type="button" 
              onClick={closeAlert} 
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
          <div>
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Username / ID Code</label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., STUDENT-001 or TEACHER-NAME"
              className="w-full px-3 py-2.5 bg-[#FAF9FA] border border-[#9A87A9]/40 text-sm font-bold text-[#2A1A63] uppercase font-mono rounded-lg focus:outline-none focus:border-[#2A1A63] focus:bg-white transition-all placeholder:normal-case shadow-3xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Password</label>
            <input
              type="password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-[#FAF9FA] border border-[#9A87A9]/40 text-sm font-bold text-[#2A1A63] rounded-lg focus:outline-none focus:border-[#2A1A63] focus:bg-white transition-all shadow-3xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: '#2A1A63' }}
            className={`w-full py-3 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-2 active:scale-[0.98] rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking Credentials...
              </>
            ) : (
              <>
                Sign In to Portal
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Frame Bottom Baseline Label */}
      <div className="w-full text-center py-2 shrink-0">
        <span className="text-[9px] font-black text-[#9A87A9] tracking-widest uppercase font-mono">Start-Rite Schools Portal Services Enclave © 2026</span>
      </div>

    </div>
  );
}