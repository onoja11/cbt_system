// src/admin/components/GlobalTermFilterBar.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Check, RefreshCw, Loader2 } from 'lucide-react';
import { apiRequest } from '../../core/api';

export default function GlobalTermFilterBar({ onTermChange }) {
    const [session, setSession] = useState(localStorage.getItem('admin_filter_session') || '2025/2026');
    const [term, setTerm] = useState(localStorage.getItem('admin_filter_term') || 'Second Term');
    const [isApplied, setIsApplied] = useState(!!localStorage.getItem('admin_filter_session'));

    // Dynamic database lists
    const [availableSessions, setAvailableSessions] = useState(['2025/2026']);
    const [availableTerms, setAvailableTerms] = useState(['First Term', 'Second Term', 'Third Term']);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchContextsFromDB = async () => {
            try {
                const res = await apiRequest('api/v1/admin/settings/available-contexts', { method: 'GET' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'SUCCESS' && isMounted) {
                        if (data.sessions?.length) setAvailableSessions(data.sessions);
                        if (data.terms?.length) setAvailableTerms(data.terms);
                    }
                }
            } catch (err) {
                console.error("❌ [CONTEXT FETCH FAULT]:", err);
            } finally {
                if (isMounted) setIsLoadingOptions(false);
            }
        };

        fetchContextsFromDB();
        return () => { isMounted = false; };
    }, []);

    const handleApply = () => {
        localStorage.setItem('admin_filter_session', session);
        localStorage.setItem('admin_filter_term', term);
        setIsApplied(true);
        if (onTermChange) onTermChange({ session, term });
        window.location.reload(); 
    };

    const handleReset = () => {
        localStorage.removeItem('admin_filter_session');
        localStorage.removeItem('admin_filter_term');
        setIsApplied(false);
        if (onTermChange) onTermChange(null);
        window.location.reload();
    };

    return (
        <div className="w-full bg-white border border-[#E2D5F8] px-4 sm:px-6 py-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs font-mono text-xs shrink-0 mb-4">
            <div className="flex items-center gap-2 text-[#7C3AED]">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="font-black uppercase tracking-wider text-[11px]">Academic Context Scope:</span>
                {isLoadingOptions && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <select 
                    value={session} 
                    onChange={(e) => setSession(e.target.value)}
                    className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] rounded-xl font-bold text-slate-900 outline-none text-[11px] uppercase cursor-pointer"
                >
                    {availableSessions.map((s) => (
                        <option key={s} value={s}>{s} Session</option>
                    ))}
                </select>

                <select 
                    value={term} 
                    onChange={(e) => setTerm(e.target.value)}
                    className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] rounded-xl font-bold text-slate-900 outline-none text-[11px] uppercase cursor-pointer"
                >
                    {availableTerms.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                {!isApplied ? (
                    <button 
                        onClick={handleApply}
                        className="px-4 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black uppercase rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                        <Check className="w-3.5 h-3.5" /> Apply Scope
                    </button>
                ) : (
                    <button 
                        onClick={handleReset}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Reset Scope
                    </button>
                )}
            </div>
        </div>
    );
}