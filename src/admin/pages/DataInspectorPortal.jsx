import React, { useState, useEffect } from 'react';
import { ArrowLeft, Database, GraduationCap, Users, BookOpen, DoorOpen, Link2, UserCheck, Loader2, RefreshCw, Code, Table, Copy, Check } from 'lucide-react';
import Logo from '../../shared/Logo';

export default function DataInspectorPortal({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'teachers', 'subjects', 'classes', 'subjectclass', 'staffsubject'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'json'
  const [dataPayload, setDataPayload] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [paginationInfo, setPaginationInfo] = useState({ page: 1, limit: 1000 });
  const [isCopied, setIsCopied] = useState(false);

  const resourceEndpoints = {
    students: 'https://startrite.eschoolng.net/admin/api/?resource=students',
    teachers: 'https://startrite.eschoolng.net/admin/api/?resource=teachers',
    subjects: 'https://startrite.eschoolng.net/admin/api/?resource=subjects',
    classes: 'https://startrite.eschoolng.net/admin/api/?resource=classes',
    subjectclass: 'https://startrite.eschoolng.net/admin/api/?resource=subjectclass',
    staffsubject: 'https://startrite.eschoolng.net/admin/api/?resource=staffsubject'
  };

  const fetchInspectorData = async (resourceKey) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const token = "478472374ff54c4137a20301c97a18be2f587828e37bf33945354bbc104a5d3d";
      
      if (!token) {
        throw new Error("Authentication token missing. Please sign out and log back in.");
      }

      const targetUrl = `${resourceEndpoints[resourceKey]}&page=${paginationInfo.page}&limit=${paginationInfo.limit}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status} — ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle different potential payload shapes (array directly or nested under data/results)
      const listItems = Array.isArray(result) ? result : (result.results || result.data || result.items || []);
      setDataPayload(listItems);
    } catch (err) {
      console.error("❌ [INSPECTOR FETCH FAULT]:", err);
      setErrorMsg(err.message || "Failed to establish connection with external resource.");
      setDataPayload([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectorData(activeTab);
  }, [activeTab]);

  const handleCopyJsonToClipboard = () => {
    if (!dataPayload || dataPayload.length === 0) return;
    const jsonString = JSON.stringify(dataPayload, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }).catch(err => {
      console.error("Failed to copy JSON:", err);
    });
  };

  const renderTableHeaders = () => {
    if (!dataPayload || dataPayload.length === 0) return null;
    const sampleRecord = dataPayload[0];
    const keys = Object.keys(sampleRecord).slice(0, 6); // Display first 6 columns neatly

    return (
      <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
        <th className="p-4 pl-6 w-16">#</th>
        {keys.map((k) => (
          <th key={k} className="p-4 font-mono">{k.replace(/_/g, ' ')}</th>
        ))}
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-hidden text-left">
      
      {/* Header Banner */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateBack} 
            className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">External Data Inspector Portal</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Start-Rite Legacy Endpoints Sync & Schema Inspection</p>
          </div>
        </div>

        {/* Resource 6-Way Tab Switcher */}
        <div className="flex bg-white/20 p-1 rounded-2xl border border-white/30 font-mono text-[10px] font-bold gap-1 flex-wrap">
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'students' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Students
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'teachers' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Teachers
          </button>
          <button 
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'subjects' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Subjects
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'classes' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" /> Classes
          </button>
          <button 
            onClick={() => setActiveTab('subjectclass')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'subjectclass' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> SubjectClass
          </button>
          <button 
            onClick={() => setActiveTab('staffsubject')}
            className={`px-3 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 ${
              activeTab === 'staffsubject' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> StaffSubject
          </button>
        </div>
      </header>

      {/* Control Strip Toolbar */}
      <div className="w-full bg-white border-b border-[#E2D5F8] px-8 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 font-mono text-xs font-black uppercase text-slate-900 truncate">
          <Database className="w-4 h-4 text-[#7C3AED] shrink-0" />
          <span className="truncate">Endpoint: <span className="text-[#7C6B93] lowercase text-[11px] font-normal">{resourceEndpoints[activeTab]}&page=1&limit=1000</span></span>
          <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-[#7C3AED] rounded-lg text-[10px] shrink-0">
            Total Fetched: {Array.isArray(dataPayload) ? dataPayload.length : 0} Records
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono shrink-0">
          <div className="flex bg-[#F7F5FC] p-1 rounded-xl border border-[#E2D5F8] text-[10px] font-bold">
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Table View
            </button>
            <button 
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === 'json' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Raw JSON
            </button>
          </div>

          {/* 🎯 COPY JSON PAYLOAD BUTTON */}
          <button 
            onClick={handleCopyJsonToClipboard}
            disabled={!dataPayload || dataPayload.length === 0}
            className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40 ${
              isCopied ? 'bg-emerald-600 text-white' : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
            }`}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Copied to Clipboard!' : 'Copy JSON'}
          </button>

          <button 
            onClick={() => fetchInspectorData(activeTab)}
            className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 bg-[#F7F5FC] px-8 py-6 overflow-y-auto h-full space-y-4">
        {isLoading ? (
          <div className="h-full flex flex-col justify-center items-center text-[#7C6B93] font-mono text-xs uppercase font-bold gap-2 py-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /> Querying external resource API endpoint...
          </div>
        ) : errorMsg ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3 max-w-lg mx-auto my-auto shadow-2xs font-mono">
            <h3 className="text-xs font-black text-rose-700 uppercase">API Ingestion Exception</h3>
            <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>
            <button onClick={() => fetchInspectorData(activeTab)} className="px-4 py-2 bg-[#7C3AED] text-white text-[10px] uppercase font-bold rounded-xl">Retry Request</button>
          </div>
        ) : !Array.isArray(dataPayload) || dataPayload.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-[#7C6B93] p-8 text-center bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl py-24 shadow-xs max-w-lg mx-auto my-auto font-mono">
            <p className="text-xs font-black uppercase tracking-wide">No Records Returned</p>
            <p className="text-xs text-slate-600 font-medium normal-case mt-1">Endpoint returned an empty dataset or pagination limit reached.</p>
          </div>
        ) : viewMode === 'json' ? (
          <div className="bg-slate-900 text-emerald-400 p-6 rounded-3xl font-mono text-xs overflow-auto max-h-[calc(100vh-260px)] shadow-2xl text-left">
            <pre>{JSON.stringify(dataPayload, null, 2)}</pre>
          </div>
        ) : (
          <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
            <div className="overflow-x-auto w-full max-h-[calc(100vh-260px)]">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  {renderTableHeaders()}
                </thead>
                <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                  {dataPayload.map((item, idx) => {
                    const keys = Object.keys(item).slice(0, 6);
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#FAF9FA] transition-colors">
                        <td className="p-4 pl-6 text-[#7C6B93] font-black">0{idx + 1}</td>
                        {keys.map((k) => (
                          <td key={k} className="p-4 text-slate-900 truncate max-w-[200px]">
                            {typeof item[k] === 'object' ? JSON.stringify(item[k]) : String(item[k] ?? 'N/A')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>

    </div>
  );
}