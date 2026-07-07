import React, { useState } from 'react';
import { ArrowRight, CircleDot } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (studentId.trim() && password.trim()) {
      // Elevating student profile states to the root wrapper
      onLoginSuccess({
        name: studentId.toUpperCase().includes('OCHIGBO') ? "OCHIGBO GODSWILL" : "DUNG STEPHEN NYAM",
        initials: studentId.toUpperCase().includes('OCHIGBO') ? "OG" : "DS",
        id: studentId.toUpperCase(),
        classGroup: "Grade 9 / JSS 3"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between p-6 select-none">
      
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center py-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <CircleDot className="w-3.5 h-3.5 text-slate-900 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-slate-900 uppercase">Startrite CBT Portal</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono">LAN // CONNECTED</span>
      </div>

      <div className="w-full max-w-sm mx-auto my-auto bg-white border border-slate-200/80 p-8 rounded-lg shadow-2xs">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Student Authentication</h1>
          <p className="text-xs text-slate-400 mt-1">Provide your terminal credentials to request exam token clearance.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">My Student ID Number</label>
            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g., VUN-JSS-302"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 rounded focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Allocated Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 rounded focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-2 active:scale-[0.99] rounded-sm cursor-pointer"
          >
            Access Exam Room <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      <div className="w-full text-center py-2">
        <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase font-mono">Local Intranet Server Secure Link</span>
      </div>

    </div>
  );
}