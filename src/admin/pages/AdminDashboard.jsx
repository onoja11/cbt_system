import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  FileText, 
  Activity, 
  CheckCircle, 
  ChevronRight, 
  Radio, 
  Clock, 
  AlertTriangle, 
  LogOut, 
  ShieldAlert,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  Calendar,
  Tags,
  Folder,
  Settings,
  ArrowLeft,
  History,
  Search,
  X,
  User,
  Filter,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';
import AdminTermSettings from './AdminTermSettings';
import windowEcho from '../../core/echo';

// Storage cache key constants for Stale-While-Revalidate UI speed
const STORAGE_KEYS = {
  STATS: 'startrite_admin_school_stats',
  RECENT_LOGS: 'startrite_admin_recent_logs'
};

export default function AdminDashboard({ 
  adminUser, 
  onNavigateToApproval, 
  onNavigateToArchive, 
  onNavigateToScheduler, 
  onNavigateToUsers, 
  onNavigateToClasses, 
  onNavigateToSubAdmins, 
  onNavigateToLiveSurveillance, 
  onLogOut 
}) {
  // Initialize state from sessionStorage if present for instantaneous initial rendering (SWR)
  const [schoolStats, setSchoolStats] = useState(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEYS.STATS);
      return cached ? JSON.parse(cached) : {
        active_exam_writers: 0,
        total_students: 0,
        total_teachers: 0,
        total_subjects: 0,
        total_class_arms: 0,
        pending_vetting_slips: 0
      };
    } catch {
      return {
        active_exam_writers: 0,
        total_students: 0,
        total_teachers: 0,
        total_subjects: 0,
        total_class_arms: 0,
        pending_vetting_slips: 0
      };
    }
  });

  const [liveSessions, setLiveSessions] = useState([]);
  
  const [recentLogs, setRecentLogs] = useState(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEYS.RECENT_LOGS);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  // Skeleton & Main Loading States - set false if we already have cached stats available
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(STORAGE_KEYS.STATS);
    } catch {
      return true;
    }
  });

  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);
  const [currentAdminView, setCurrentAdminView] = useState('dashboard');

  // Surveillance Filters & Debouncing
  const [channelSearch, setChannelSearch] = useState('');
  const [debouncedChannelSearch, setDebouncedChannelSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false);

  // Audit Logs Lazy Loading & Pagination States
  const [allLogs, setAllLogs] = useState([]);
  const [showAllLogsDrawer, setShowAllLogsDrawer] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [logsPage, setLogsPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isFetchingMoreLogs, setIsFetchingMoreLogs] = useState(false);

  const logsScrollContainerRef = useRef(null);

  // Synchronize stats to sessionStorage on update
  const updateSchoolStatsState = useCallback((newStats) => {
    setSchoolStats(prev => {
      const updated = typeof newStats === 'function' ? newStats(prev) : { ...prev, ...newStats };
      try { sessionStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Synchronize recent logs to sessionStorage on update
  const updateRecentLogsState = useCallback((newLogs) => {
    setRecentLogs(prev => {
      const updated = typeof newLogs === 'function' ? newLogs(prev) : newLogs;
      try { sessionStorage.setItem(STORAGE_KEYS.RECENT_LOGS, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Debounce Search input for surveillance channels
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedChannelSearch(channelSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [channelSearch]);

  const isMasterAdmin = useMemo(() => {
    if (!adminUser) return true;

    const primaryRole = (adminUser.role || '').toLowerCase();
    const staffRole = (adminUser.staff_role || '').toLowerCase();
    const nestedStaffRole = (adminUser.staff_profile?.staff_role || '').toLowerCase();
    const detailsStaffRole = (adminUser.details?.staff_role || '').toLowerCase();

    const isSubAdmin = primaryRole === 'sub_admin' || 
                       staffRole === 'sub_admin' || 
                       nestedStaffRole === 'sub_admin' || 
                       detailsStaffRole === 'sub_admin';

    return !isSubAdmin;
  }, [adminUser]);

  const extractLogsArray = (payloadData) => {
    if (Array.isArray(payloadData)) {
      return payloadData;
    }
    if (payloadData && Array.isArray(payloadData.data)) {
      return payloadData.data;
    }
    return [];
  };

  const fetchRecentAuditLogs = useCallback(async () => {
    try {
      const res = await apiRequest(`api/v1/admin/audit-logs?per_page=5&page=1`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          const extractedArray = extractLogsArray(payload.data);
          updateRecentLogsState(extractedArray.slice(0, 5));
        }
      }
    } catch {
      // Silent fallback
    }
  }, [updateRecentLogsState]);

  const fetchSurveillanceChannels = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshingChannels(true);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedChannelSearch.trim()) queryParams.append('search', debouncedChannelSearch.trim());
      if (selectedCategory && selectedCategory !== 'ALL') queryParams.append('category', selectedCategory);

      const channelsRes = await apiRequest(`api/v1/admin/dashboard/surveillance-channels?${queryParams.toString()}`, { method: 'GET' });
      if (channelsRes.ok) {
        const channelsPayload = await channelsRes.json();
        if (channelsPayload.status === 'SUCCESS') {
          const rawChannels = channelsPayload.channels || channelsPayload.data || [];
          const validSessions = rawChannels.filter(s => s && s.id && (s.subject || s.arm));
          setLiveSessions(validSessions);
        }
      }
    } catch {
      // Silent error fallback
    } finally {
      if (isManual) setIsRefreshingChannels(false);
    }
  }, [debouncedChannelSearch, selectedCategory]);

  useEffect(() => {
    fetchSurveillanceChannels();
  }, [fetchSurveillanceChannels]);

  // Primary Paginated Audit Log Fetcher
  const fetchAuditLogsPage = useCallback(async (pageNumber = 1, category = 'ALL', search = '', isInitial = false) => {
    if (isInitial) {
      setIsLoadingLogs(true);
    } else {
      setIsFetchingMoreLogs(true);
    }

    try {
      let endpoint = `api/v1/admin/audit-logs?page=${pageNumber}&per_page=15`;
      if (category && category !== 'ALL') {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }
      if (search.trim()) {
        endpoint += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await apiRequest(endpoint, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          const newLogs = extractLogsArray(payload.data);
          const totalPages = payload.data?.last_page || (newLogs.length < 15 ? pageNumber : pageNumber + 1);

          if (isInitial) {
            setAllLogs(newLogs);
          } else {
            setAllLogs(prev => {
              const existingIds = new Set(prev.map(item => item.id));
              const uniqueNewLogs = newLogs.filter(item => !existingIds.has(item.id));
              return [...prev, ...uniqueNewLogs];
            });
          }

          setHasMoreLogs(pageNumber < totalPages && newLogs.length > 0);
          setLogsPage(pageNumber);
        }
      }
    } catch {
      // Silent error fallback
    } finally {
      setIsLoadingLogs(false);
      setIsFetchingMoreLogs(false);
    }
  }, []);

  // Initial dashboard metrics loading with SWR background revalidation
  const ingestSchoolManagementLogs = useCallback(async () => {
    // Only set skeleton loading state if we have no cached data at all
    if (!sessionStorage.getItem(STORAGE_KEYS.STATS)) {
      setIsLoading(true);
    }
    
    try {
      const statsRes = await apiRequest(`api/v1/admin/dashboard/school-metrics`, { method: 'GET' });
      if (statsRes.ok) {
        const statsPayload = await statsRes.json();
        if (statsPayload.status === 'SUCCESS' && statsPayload.data) {
          updateSchoolStatsState(statsPayload.data);
        }
      }

      await fetchSurveillanceChannels();
      await fetchRecentAuditLogs();
    } catch {
      // Background sync error handled silently
    } finally {
      setIsLoading(false);
    }
  }, [fetchSurveillanceChannels, fetchRecentAuditLogs, updateSchoolStatsState]);

  useEffect(() => {
    ingestSchoolManagementLogs();
  }, [ingestSchoolManagementLogs]);

  // Echo Websockets Listener (Real-time updates dynamically update state + storage cache)
  useEffect(() => {
    let isFetching = false;
    const surveillanceChannel = windowEcho.channel('exam-surveillance-channel');
    
    surveillanceChannel.listen('.room.telemetry.updated', () => {
      if (isFetching) return;
      isFetching = true;

      fetchSurveillanceChannels().finally(() => {
        setTimeout(() => { isFetching = false; }, 2000);
      });
    });

    const metricsChannel = windowEcho.channel('school-metrics-channel');
    metricsChannel.listen('.vetting.slip.updated', (event) => {
      if (event && event.metricsData) {
        updateSchoolStatsState(prev => ({
          ...prev,
          pending_vetting_slips: event.metricsData.pending_vetting_slips
        }));
      }
    });

    const auditChannel = windowEcho.channel('audit-logs-channel');
    auditChannel.listen('.audit.logged', (event) => {
      if (event && event.auditLog) {
        updateRecentLogsState(prev => {
          const prevArr = Array.isArray(prev) ? prev : [];
          return [event.auditLog, ...prevArr.slice(0, 4)];
        });
        setAllLogs(prev => {
          const prevArr = Array.isArray(prev) ? prev : [];
          return [event.auditLog, ...prevArr];
        });
      }
    });

    return () => {
      windowEcho.leaveChannel('exam-surveillance-channel');
      windowEcho.leaveChannel('school-metrics-channel');
      windowEcho.leaveChannel('audit-logs-channel');
    };
  }, [fetchSurveillanceChannels, updateSchoolStatsState, updateRecentLogsState]);

  // Filter or search triggers initial fetch reset
  useEffect(() => {
    if (showAllLogsDrawer) {
      const delayDebounceFn = setTimeout(() => {
        fetchAuditLogsPage(1, selectedCategoryFilter, logsSearchQuery, true);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [selectedCategoryFilter, logsSearchQuery, showAllLogsDrawer, fetchAuditLogsPage]);

  // Infinite Scroll Handler on Audit Drawer
  const handleLogsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreLogs && !isLoadingLogs && !isFetchingMoreLogs) {
      fetchAuditLogsPage(logsPage + 1, selectedCategoryFilter, logsSearchQuery, false);
    }
  };

  const formatCleanDuration = (durationInput) => {
    if (!durationInput) return '30 Mins';
    if (typeof durationInput === 'string' && !/^\d+(\.\d+)?$/.test(durationInput)) {
      return durationInput;
    }
    const totalMinutes = Math.round(parseFloat(durationInput));
    if (isNaN(totalMinutes)) return durationInput;

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    return `${totalMinutes} Mins`;
  };

  const resolvedActiveWriters = useMemo(() => {
    if (Array.isArray(liveSessions) && liveSessions.length > 0) {
      return liveSessions.reduce((acc, session) => {
        const count = parseInt(session.active_writers ?? session.students_count ?? session.writers_count ?? 0, 10);
        return acc + (isNaN(count) ? 0 : count);
      }, 0);
    }
    
    if (typeof schoolStats.active_exam_writers === 'number' && schoolStats.active_exam_writers >= 0) {
      return schoolStats.active_exam_writers;
    }
    
    return 0;
  }, [schoolStats.active_exam_writers, liveSessions]);

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'SECURITY':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'EXAM_SESSION':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'QUESTION_BUILDER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'GRADE_BOOK':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-purple-50 text-[#7C3AED] border-purple-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none font-sans text-[#2A1A63] relative overflow-hidden w-full">

      {/* HEADER SECTION */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-4 md:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center shadow-xs gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center shrink-0">
            <Logo size={28} showText={false} />
          </div>
          <div className="text-left truncate">
            <h1 className="text-xs font-black uppercase tracking-wider text-white truncate">
              {isMasterAdmin ? 'START-RITE ADMIN PORTAL' : 'START-RITE SUB-ADMIN PORTAL'}
            </h1>
            <p className="text-[10px] md:text-[11px] font-bold text-white/90 uppercase tracking-wider mt-0.5 truncate">
              {isMasterAdmin ? 'INSTITUTIONAL EXAMINATION MANAGEMENT SYSTEM' : 'DECENTRALIZED CLASS ARM MANAGEMENT'}
            </p>
          </div>
        </div>

        <div className="flex items-center self-end sm:self-center">
          <button 
            onClick={() => setShowLogoutDrawer(true)} 
            className="w-8 h-8 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Sign Out of Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {currentAdminView === 'term_settings' ? (
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col items-start">
          <button 
            onClick={() => setCurrentAdminView('dashboard')}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-[#7C3AED] rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard Overview
          </button>
          <div className="w-full text-left">
            <AdminTermSettings />
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5 flex flex-col justify-start">

          {/* TOP METRICS CARDS WITH SKELETON LOADING */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${isMasterAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-3 font-mono w-full shrink-0`}>
            
            {isLoading ? (
              Array.from({ length: isMasterAdmin ? 5 : 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-white/70 border border-[#E2D5F8]/50 rounded-xl flex items-center gap-2.5 animate-pulse">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg shrink-0"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-purple-200/60 rounded w-12"></div>
                    <div className="h-2.5 bg-slate-200 rounded w-20"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 bg-[#F3EEFC] border border-[#E2D5F8] rounded-xl flex items-center gap-2.5 shadow-2xs hover:shadow-xs transition-all w-full relative overflow-hidden">
                  <div className="w-10 h-10 bg-purple-400/20 border border-[#E2D5F8] rounded-lg flex items-center justify-center text-purple shrink-0 shadow-2xs">
                    <Activity className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="truncate text-left z-10 min-w-0">
                    <span className="text-sm font-black text-slate-900 block tracking-tight">{resolvedActiveWriters}</span>
                    <p className="text-[9px] font-bold text-black tracking-wide font-sans truncate">Students In Hall</p>
                    <span className="text-[8px] text-[#7C6B93] block">Writing Now!</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FCE7EE] border border-[#F8D3DF] rounded-xl flex items-center gap-2.5 shadow-2xs hover:shadow-xs transition-all w-full">
                  <div className="w-10 h-10 bg-red-400/20 border border-[#F8D3DF] rounded-lg flex items-center justify-center text-[#E11D48] shrink-0 shadow-2xs">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="truncate text-left min-w-0">
                    <span className="text-sm font-black text-slate-900 block tracking-tight">{schoolStats.total_students}</span>
                    <p className="text-[9px] font-bold text-black tracking-wide font-sans truncate">Students Enrollment</p>
                    <span className="text-[8px] text-slate-500 block">Registered</span>
                  </div>
                </div>

                {isMasterAdmin && (
                  <div className="p-3 bg-[#EBFBF3] border border-[#C6F6D5] rounded-xl flex items-center gap-2.5 shadow-2xs hover:shadow-xs transition-all w-full">
                    <div className="w-10 h-10 bg-green-400/20 border border-[#C6F6D5] rounded-lg flex items-center justify-center text-[#059669] shrink-0 shadow-2xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="truncate text-left min-w-0">
                      <span className="text-sm font-black text-slate-900 block tracking-tight">{schoolStats.total_teachers}</span>
                      <p className="text-[9px] font-bold text-black tracking-wide font-sans truncate">Teaching Staff</p>
                      <span className="text-[8px] text-slate-500 block font-mono">Active</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl flex items-center gap-2.5 shadow-2xs hover:shadow-xs transition-all w-full">
                  <div className="w-10 h-10 bg-[#FEF3C7] border border-[#FEF3C7] rounded-lg flex items-center justify-center text-[#D97706] shrink-0 shadow-2xs">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <div className="truncate text-left min-w-0">
                    <span className="text-sm font-black text-slate-900 block tracking-tight">{schoolStats.total_class_arms}</span>
                    <p className="text-[9px] font-bold text-black tracking-wide font-sans truncate">Class Branches</p>
                    <span className="text-[8px] text-slate-500 block font-mono">Classes</span>
                  </div>
                </div>

                {isMasterAdmin && (
                  <div className="p-3 bg-[#F5EFE6] border border-[#E8DFD1] rounded-xl flex items-center gap-2.5 shadow-2xs hover:shadow-xs transition-all w-full col-span-2 sm:col-span-1">
                    <div className="w-10 h-10 bg-purple-400/20 border border-[#E8DFD1] rounded-lg flex items-center justify-center text-purple-400 shrink-0 shadow-2xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="truncate text-left min-w-0">
                      <span className="text-sm font-black text-slate-900 block tracking-tight">{schoolStats.total_subjects}</span>
                      <p className="text-[9px] font-bold text-slate-700 tracking-wide font-sans truncate">Total Subjects</p>
                      <span className="text-[8px] text-slate-500 block font-mono">Listed</span>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

          {/* QUICK NAVIGATION ACTIONS */}
          <div className="w-full flex flex-wrap lg:flex-nowrap items-center gap-2.5 font-mono shrink-0">

            <div onClick={onNavigateToClasses} className="py-2 px-2.5 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                  <Folder className="w-3 h-3" />
                </div>
                <div className="truncate text-left font-sans">
                  <span className="text-[7px] font-black text-[#7C6B93] block tracking-wider font-mono uppercase">Records</span>
                  <p className="text-[9px] font-bold text-slate-800 truncate">Classes</p>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-[#7C6B93] group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
            </div>

            {isMasterAdmin && (
              <div onClick={onNavigateToUsers} className="py-2 px-2.5 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                    <Users className="w-3 h-3" />
                  </div>
                  <div className="truncate text-left font-sans">
                    <span className="text-[7px] font-black text-[#7C6B93] block tracking-wider font-mono uppercase">Directory</span>
                    <p className="text-[9px] font-bold text-slate-800 truncate">Users & Subj</p>
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-[#7C6B93] group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
              </div>
            )}

            {isMasterAdmin && (
              <div onClick={onNavigateToSubAdmins} className="py-2 px-2.5 bg-indigo-50 border border-indigo-200 hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-6 h-6 bg-[#7C3AED] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                    <ShieldAlert className="w-3 h-3" />
                  </div>
                  <div className="truncate text-left font-sans">
                    <span className="text-[7px] font-black text-indigo-500 block tracking-wider font-mono uppercase">Delegation</span>
                    <p className="text-[9px] font-bold text-slate-900 truncate">Sub-Admin</p>
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
              </div>
            )}

            <div onClick={onNavigateToApproval} className="py-2 px-2.5 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="truncate text-left font-sans">
                  <span className="text-[7px] font-black text-[#7C6B93] block tracking-wider font-mono uppercase">Approvals</span>
                  <p className="text-[9px] font-bold text-slate-800 truncate">{schoolStats.pending_vetting_slips} Pending</p>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-[#7C6B93] group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
            </div>

            <div onClick={onNavigateToArchive} className="py-2 px-2.5 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                  <CheckCircle className="w-3 h-3" />
                </div>
                <div className="truncate text-left font-sans">
                  <span className="text-[7px] font-black text-[#7C6B93] block tracking-wider font-mono uppercase">Archive</span>
                  <p className="text-[9px] font-bold text-slate-800 truncate">Audit Center</p>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-[#7C6B93] group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
            </div>

            <div onClick={onNavigateToScheduler} className="py-2 px-2.5 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white transition-all shrink-0 shadow-2xs">
                  <Calendar className="w-3 h-3" />
                </div>
                <div className="truncate text-left font-sans">
                  <span className="text-[7px] font-black text-[#7C6B93] block tracking-wider font-mono uppercase">Scheduling</span>
                  <p className="text-[9px] font-bold text-slate-800 truncate">Timetable</p>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-[#7C6B93] group-hover:translate-x-0.5 group-hover:text-[#7C3AED] transition-all shrink-0 ml-1" />
            </div>

            {isMasterAdmin && (
              <div onClick={() => setCurrentAdminView('term_settings')} className="py-2 px-2.5 bg-purple-500/20 border border-[#7C3AED] hover:bg-purple-500/30 rounded-xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all flex-1 min-w-[130px]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-6 h-6 bg-[#7C3AED] border border-[#E2D5F8] rounded-md flex items-center justify-center text-white group-hover:bg-[#6D28D9] transition-all shrink-0 shadow-2xs">
                    <Settings className="w-3 h-3 animate-spin-slow" />
                  </div>
                  <div className="truncate text-left font-sans">
                    <span className="text-[7px] font-black text-[#7C3AED] block tracking-wider font-mono uppercase">Config</span>
                    <p className="text-[9px] font-bold text-slate-950 truncate">Terms & Sess</p>
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-[#7C3AED] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
              </div>
            )}

          </div>

          {/* TWO-COLUMN DASHBOARD CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-start">

            {/* ACTIVE EXAM SURVEILLANCE CHANNELS PANEL (LEFT: 8/12) WITH SEARCH & FILTER */}
            <div className="lg:col-span-8 bg-gradient-to-t from-[#D8B4FE]/60 via-[#EEDAFE]/40 to-[#F7F2FF] border border-[#E2D5F8] rounded-3xl p-4 md:p-5 shadow-xs flex flex-col overflow-hidden w-full text-left min-h-[380px]">
              
              {/* PANEL HEADER WITH CONTROLS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E2D5F8]/60 pb-3 mb-3 shrink-0 w-full font-mono gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-[#7C6B93] uppercase tracking-wider">Active Examination Hall Monitor Channels</span>
                </div>
                {liveSessions.length > 0 && (
                  <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 uppercase">
                    {liveSessions.length} Active Session{liveSessions.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* ⚡ REAL-TIME SEARCH & FILTER BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 font-sans">
                <div className="sm:col-span-10 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search teacher, subject, class, or category..."
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-800 rounded-xl shadow-2xs focus:outline-none focus:border-[#7C3AED]"
                  />
                  {channelSearch && (
                    <button onClick={() => setChannelSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => fetchSurveillanceChannels(true)}
                  disabled={isRefreshingChannels}
                  className="sm:col-span-2 py-1.5 px-3 bg-white border border-[#E2D5F8] hover:border-[#7C3AED] text-slate-800 rounded-xl flex items-center justify-center gap-1 text-xs font-bold font-mono cursor-pointer shadow-2xs transition-all active:scale-[0.97]"
                  title="Refresh Channels"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#7C3AED] ${isRefreshingChannels ? 'animate-spin' : ''}`} />
                  <span className="sm:hidden lg:inline text-[10px]">Sync</span>
                </button>
              </div>

              <div className="flex-1 w-full flex flex-col justify-start">
                {isLoading ? (
                  <div className="w-full space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-3.5 border border-[#E2D5F8] rounded-2xl bg-white/70 animate-pulse flex justify-between items-center">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-purple-200/50 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-200/70 rounded w-1/4"></div>
                        </div>
                        <div className="h-8 bg-purple-300/40 rounded-xl w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : (!Array.isArray(liveSessions) || liveSessions.length === 0) ? (
                  <div className="w-full my-auto flex flex-col justify-center items-center text-center font-mono py-10">
                    <div className="w-20 h-20 flex items-center justify-center text-[#7C3AED] mb-2">
                      <img 
                        src="/thinking-character.png" 
                        alt="No Sessions" 
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">
                      {debouncedChannelSearch || selectedCategory !== 'ALL' 
                        ? 'NO ACTIVE EXAMINATION ROOMS MATCH THE APPLIED SEARCH CRITERIA.'
                        : 'NO ACTIVE EXAMINATION ROOM SESSIONS ARE CURRENTLY RUNNING ON THE SCHOOL NETWORK.'}
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-2.5">
                    {liveSessions.map((session) => (
                      <div key={session.id} className="p-3.5 border border-[#E2D5F8] rounded-2xl bg-white hover:border-[#7C3AED] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full shadow-2xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 tracking-wider shrink-0 uppercase">LIVE RUNNING</span>
                            <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-[#7C3AED] text-white rounded-lg uppercase tracking-wide flex items-center gap-1 shrink-0">
                              <Tags className="w-2.5 h-2.5 opacity-80" /> {session.category || 'EXAM'}
                            </span>
                            <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate flex-1 min-w-[200px]">
                              {session.subject} — {session.arm}
                            </h4>
                          </div>
                          <p className="text-[11px] font-medium text-[#7C6B93] font-mono uppercase truncate">
                            Invigilator: <span className="font-sans font-bold text-slate-800 text-xs">{session.supervisor}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0 font-mono text-[11px] font-bold">
                          <div className="flex items-center gap-1 text-slate-600 bg-[#FAF9FA] border border-[#E2D5F8] px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#7C6B93]" /> {formatCleanDuration(session.duration)}
                          </div>

                          {session.alertsCount > 0 ? (
                            <span className="flex items-center gap-1 text-[#C62927] bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0 font-black animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" /> {session.alertsCount} Irregularities
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0 font-black">
                              <CheckCircle className="w-3.5 h-3.5" /> Secure Room
                            </span>
                          )}
                          <button 
                            onClick={() => onNavigateToLiveSurveillance(session)} 
                            className="px-3.5 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md shrink-0 transition-all active:scale-[0.97]"
                          >
                            Monitor Room
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RECENT SYSTEM AUDIT LOGS WIDGET (RIGHT: 4/12) WITH SKELETON */}
            <div className="lg:col-span-4 bg-white border border-[#E2D5F8] rounded-3xl p-4 md:p-5 shadow-2xs w-full text-left font-mono flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#7C3AED]" />
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-sans">System Audit Logs</span>
                  </div>
                  <button 
                    onClick={() => {
                      fetchAuditLogsPage(1, selectedCategoryFilter, logsSearchQuery, true);
                      setShowAllLogsDrawer(true);
                    }}
                    className="text-[9px] font-black text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-0.5 uppercase tracking-wider cursor-pointer hover:underline transition-all"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-2.5 border border-slate-100 rounded-xl bg-[#FAF9FA] animate-pulse space-y-2">
                        <div className="h-3 bg-purple-200/50 rounded w-16"></div>
                        <div className="h-3 bg-slate-200/80 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : (!Array.isArray(recentLogs) || recentLogs.length === 0) ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans font-medium">
                    No recent audit entries logged.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentLogs.map((log, idx) => (
                      <div key={log.id || idx} className="p-2.5 border border-slate-100 hover:border-[#E2D5F8] rounded-xl bg-[#FAF9FA] flex flex-col justify-between gap-1.5 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border uppercase shrink-0 ${getCategoryBadgeColor(log.category)}`}>
                            {log.category || 'SYSTEM'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-sans">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'}
                          </span>
                        </div>

                        <div className="min-w-0 text-left">
                          <p className="text-[11px] font-bold text-slate-900 truncate font-sans">{log.action}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{log.description}</p>
                        </div>

                        <div className="flex items-center justify-end text-[9px] text-slate-500 pt-1 border-t border-slate-100/60 font-sans">
                          <span className="font-semibold text-slate-600 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> {log.user_name || 'System'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>

      {/* LOGOUT CONFIRMATION DRAWER */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-[#C62927] p-4 md:p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full select-none text-left">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-rose-50 text-[#C62927] border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Administrative Session Token?</h3>
                <p className="text-[10px] font-bold text-[#7C6B93] uppercase mt-0.5 tracking-wide font-mono">Signing out terminates active management control feeds immediately.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto font-sans border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 justify-end">
              <button onClick={() => setShowLogoutDrawer(false)} className="px-4 py-2 border border-[#E2D5F8] text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-xl cursor-pointer transition-all text-center">Cancel Actions</button>
              <button onClick={onLogOut} className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl shadow-md cursor-pointer font-mono text-center">Confirm Logout</button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL AUDIT LOGS SLIDE-OVER DRAWER WITH LAZY LOADING INFINITE SCROLL */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex justify-end w-full ${showAllLogsDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between transition-all duration-300 transform ${showAllLogsDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 bg-purple-100 text-[#7C3AED] rounded-xl flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight font-sans">System Audit Trail Records</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Full immutable operational activity history</p>
              </div>
            </div>
            <button onClick={() => setShowAllLogsDrawer(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 space-y-3 bg-white font-mono">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text"
                placeholder="Search actions, descriptions, or staff names..."
                value={logsSearchQuery}
                onChange={(e) => setLogsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
              {['ALL', 'SECURITY', 'EXAM_SESSION', 'QUESTION_BUILDER', 'GRADE_BOOK', 'ASSESSMENT_MANAGEMENT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg border transition shrink-0 uppercase cursor-pointer ${selectedCategoryFilter === cat ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* INFINITE SCROLLABLE CONTAINER WITH SKELETONS */}
          <div 
            ref={logsScrollContainerRef}
            onScroll={handleLogsScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 font-mono text-left"
          >
            {isLoadingLogs ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3.5 border border-slate-200 rounded-2xl bg-slate-50/50 animate-pulse space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-purple-200/50 rounded w-20"></div>
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-slate-200/80 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-200/60 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : allLogs.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400 font-sans">
                No matching system audit log entries found.
              </div>
            ) : (
              <>
                {allLogs.map((log) => (
                  <div key={log.id} className="p-3.5 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-[#7C3AED] transition-all space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded-md border uppercase ${getCategoryBadgeColor(log.category)}`}>
                        {log.category || 'SYSTEM'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans font-medium">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-sans">{log.action}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-sans leading-relaxed">{log.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {log.user_name || 'System Operator'}
                      </span>
                      {log.ip_address && (
                        <span className="font-mono text-slate-400 text-[9px]">{log.ip_address}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* BOTTOM SPINNER WHEN FETCHING NEXT LAZY PAGE */}
                {isFetchingMoreLogs && (
                  <div className="py-4 flex justify-center items-center font-sans text-xs text-[#7C3AED]">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading older logs...
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400 font-mono uppercase">
            Start-rite institutional audit logger • {allLogs.length} records loaded
          </div>

        </div>
      </div>

    </div>
  );
}