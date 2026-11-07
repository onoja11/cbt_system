import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../core/api'; 
import { Calendar, Loader2, ShieldCheck, CheckCircle2, History, Power, Tag } from 'lucide-react';

export default function AdminTermSettings() {
    const [session, setSession] = useState('2025/2026');
    const [term, setTerm] = useState('Second Term');
    const [isActive, setIsActive] = useState(true); 
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchActiveSettings = async () => {
            try {
                const res = await apiRequest('api/v1/settings/active-term', { method: 'GET' });
                const data = await res.json();

                if (res.ok && data) {
                    const settings = data.data || data.settings || data;
                    
                    const resolvedSession = settings.session || settings.active_session;
                    const resolvedTerm = settings.term || settings.active_term;
                    const resolvedIsActive = settings.is_active !== undefined ? settings.is_active : settings.active;

                    if (resolvedSession) setSession(resolvedSession);
                    if (resolvedTerm) setTerm(resolvedTerm);
                    if (resolvedIsActive !== undefined) setIsActive(Boolean(resolvedIsActive));
                }
            } catch (err) {
                console.error("Failed to fetch active term settings:", err);
            } finally {
                setFetching(false);
            }
        };

        fetchActiveSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        try {
            const res = await apiRequest('api/v1/admin/settings/active-term', {
                method: 'POST',
                body: JSON.stringify({
                    active_session: session,
                    active_term: term,
                    is_active: isActive
                })
            });

            const data = await res.json();

            if (res.ok && (data.status === 'SUCCESS' || data.success)) {
                setSuccessMessage('Academic term settings updated successfully! Refreshing app...');
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                alert('Failed to update: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="w-full max-w-3xl mx-auto bg-white border border-[#E2D5F8] rounded-3xl p-12 shadow-xs flex items-center justify-center font-mono text-xs text-[#7C6B93] uppercase font-black tracking-wider">
                <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED] mr-2" /> Loading active term settings...
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto bg-white border border-[#E2D5F8] rounded-3xl p-6 shadow-xs font-sans text-left space-y-6">
            
            {/* Header Section */}
            <div className="flex items-center gap-3 border-b border-[#E2D5F8]/60 pb-4">
                <div className="w-10 h-10 bg-[#7C3AED] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">Academic Term & Session Configuration</h2>
                    <p className="text-[11px] font-bold text-[#7C6B93] uppercase tracking-wider mt-0.5">Control global multi-tenant academic isolation bounds</p>
                </div>
            </div>

            {successMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 font-mono text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                        <p className="font-black uppercase tracking-wide">Sync Successful</p>
                        <p className="text-[10px] text-emerald-700 opacity-90 mt-0.5">{successMessage}</p>
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
                
                {/* Academic Session Input */}
                <div className="space-y-1">
                    <label className="block font-black text-[#7C6B93] uppercase tracking-wider text-[10px]">Academic Session</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={session} 
                            onChange={(e) => setSession(e.target.value)}
                            placeholder="e.g. 2025/2026"
                            className="w-full px-4 py-3 border border-[#E2D5F8] rounded-2xl font-sans font-bold text-slate-900 focus:ring-2 focus:ring-[#7C3AED] outline-none bg-white shadow-2xs"
                            required 
                        />
                        <History className="absolute right-4 top-3.5 w-4 h-4 text-[#7C6B93] pointer-events-none" />
                    </div>
                </div>

                {/* Academic Term Selector */}
                <div className="space-y-1">
                    <label className="block font-black text-[#7C6B93] uppercase tracking-wider text-[10px]">Active Academic Term</label>
                    <div className="grid grid-cols-3 gap-2.5">
                        {['First Term', 'Second Term', 'Third Term'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTerm(t)}
                                className={`py-3 px-3 rounded-2xl font-bold text-xs uppercase transition-all border cursor-pointer font-mono flex items-center justify-center gap-1.5 ${
                                    term === t 
                                        ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-2xs' 
                                        : 'bg-[#FAF9FA] text-slate-700 border-[#E2D5F8] hover:border-[#7C3AED]'
                                }`}
                            >
                                <Tag className="w-3 h-3 opacity-70" /> {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Network Status Toggle Card */}
                <div 
                    onClick={() => setIsActive(!isActive)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
                        isActive 
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                            : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-rose-500 text-white shadow-2xs'}`}>
                            <Power className="w-4 h-4" />
                        </div>
                        <div className="text-left font-sans">
                            <h4 className="text-xs font-black uppercase tracking-tight">
                                {isActive ? 'Term State: Active & Operational' : 'Term State: Inactive / Dormant'}
                            </h4>
                            <p className="text-[10px] font-mono opacity-80 mt-0.5">
                                {isActive ? 'Exams, records, and active sessions are fully operational.' : 'This term context is marked inactive; endpoints are restricted.'}
                            </p>
                        </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isActive} 
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </div>
                </div>

                {/* Submit Action Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99] text-white font-black uppercase tracking-wider py-3.5 rounded-2xl transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-xs font-mono"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Synchronizing Mainframe...
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4" /> Commit Academic Configuration
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}