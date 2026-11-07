import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiRequest } from '../../core/api';
import { 
  ShieldAlert, Loader2, Search, ArrowLeft, X, Check, 
  UserCheck, Users, CheckSquare, Square, RefreshCw, Filter,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export default function SubAdminManagementPanel({ onNavigateBack }) {
    const [staffList, setStaffList] = useState([]);
    const [classArms, setClassArms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 📄 Server-Side Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({ total: 0, per_page: 15, last_page: 1 });
    const [roleFilter, setRoleFilter] = useState('ALL');

    // 🔍 Search State & 300ms Debounce
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // 📝 Modal & Selected Staff State
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    // 🚀 Async Trackers
    const [updatingRoleId, setUpdatingRoleId] = useState(null);
    const [isSavingAllocations, setIsSavingAllocations] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // ⚡ Fast Paginated Fetch
    const loadDirectoryData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setIsRefreshing(true);

            const queryParams = new URLSearchParams({
                page: currentPage,
                per_page: 15,
                search: debouncedSearch,
                role: roleFilter
            });

            const [staffRes, classesRes] = await Promise.all([
                apiRequest(`api/v1/admin/sub-admins/directory?${queryParams.toString()}`, { method: 'GET' }),
                classArms.length === 0 
                    ? apiRequest('api/v1/admin/directory/class-arms', { method: 'GET' }) 
                    : Promise.resolve({ ok: true, json: async () => ({ class_arms: classArms }) })
            ]);

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                setStaffList(staffData.staff_directory || []);
                if (staffData.pagination) {
                    setPaginationMeta(staffData.pagination);
                }
            }

            if (classesRes.ok && classArms.length === 0) {
                const classData = await classesRes.json();
                setClassArms(classData.class_arms || []);
            }
        } catch (err) {
            console.error('Network error loading sub-admin data:', err);
            triggerToast('Network error loading directory details.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [currentPage, debouncedSearch, roleFilter, classArms]);

    useEffect(() => {
        loadDirectoryData(false);
    }, [currentPage, debouncedSearch, roleFilter]);

    // ⚡ Optimistic Role Update
    const updateStaffRole = async (staffProfileId, newRole) => {
        const previousStaffList = [...staffList];

        setStaffList(prev => prev.map(s => 
            s.staff_profile_id === staffProfileId ? { ...s, staff_role: newRole } : s
        ));
        setUpdatingRoleId(staffProfileId);

        try {
            const res = await apiRequest(`api/v1/admin/sub-admins/${staffProfileId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ staff_role: newRole })
            });

            if (res.ok) {
                triggerToast('Staff access role updated successfully.');
            } else {
                setStaffList(previousStaffList);
                alert('Role update failed. Please check administrative permissions.');
            }
        } catch (err) {
            setStaffList(previousStaffList);
            alert('Failed to execute role update.');
        } finally {
            setUpdatingRoleId(null);
        }
    };

    const openModal = (staff) => {
        setSelectedStaff(staff);
        setAssignedClasses(staff.assigned_classes ? staff.assigned_classes.map(c => c.class_arm_id) : []);
        setModalSearchQuery('');
        setIsModalOpen(true);
    };

    const toggleClassSelection = (classId) => {
        setAssignedClasses(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const toggleSelectAllClasses = () => {
        if (assignedClasses.length === filteredModalClassArms.length) {
            setAssignedClasses([]);
        } else {
            setAssignedClasses(filteredModalClassArms.map(c => c.id));
        }
    };

    // ⚡ Optimistic Allocation Save
    const saveClassAllocations = async () => {
        if (!selectedStaff) return;
        setIsSavingAllocations(true);

        try {
            const res = await apiRequest(`api/v1/admin/sub-admins/${selectedStaff.staff_profile_id}/allocations`, {
                method: 'POST',
                body: JSON.stringify({ class_arm_ids: assignedClasses })
            });

            if (res.ok) {
                const updatedClassObjects = classArms
                    .filter(arm => assignedClasses.includes(arm.id))
                    .map(arm => ({ class_arm_id: arm.id, class_name: arm.name }));

                setStaffList(prev => prev.map(s => 
                    s.staff_profile_id === selectedStaff.staff_profile_id 
                        ? { ...s, assigned_classes: updatedClassObjects } 
                        : s
                ));

                setIsModalOpen(false);
                triggerToast(`Class allocations updated for ${selectedStaff.name}.`);
            } else {
                alert('Failed to save class mapping.');
            }
        } catch (err) {
            alert('Failed to save class mapping.');
        } finally {
            setIsSavingAllocations(false);
        }
    };

    const handleBackNavigation = (e) => {
        if (e) e.preventDefault();
        localStorage.setItem('active_domain_context', 'admin_dash');
        window.dispatchEvent(new CustomEvent('domain_context_changed', { detail: 'admin_dash' }));
        if (typeof onNavigateBack === 'function') {
            onNavigateBack();
        }
    };

    const filteredModalClassArms = useMemo(() => {
        const q = modalSearchQuery.toLowerCase().trim();
        if (!q) return classArms;
        return classArms.filter(arm => arm.name && arm.name.toLowerCase().includes(q));
    }, [classArms, modalSearchQuery]);

    const getRoleBadgeStyle = (role) => {
        switch (String(role).toLowerCase()) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'sub_admin':
                return 'bg-[#7C3AED] text-white border-[#6D28D9]';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 text-left font-sans pb-12">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] p-6 rounded-3xl shadow-xs text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={handleBackNavigation}
                        className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                        title="Return to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-white" /> Sub-Admin Access Control Matrix
                        </h2>
                        <p className="text-xs font-mono font-bold text-purple-100 uppercase mt-0.5 tracking-wider">
                            Manage Administrative Delegation & Class Arm Access Rules
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button 
                        type="button"
                        onClick={() => loadDirectoryData(true)}
                        disabled={isRefreshing}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync Directory
                    </button>
                </div>
            </div>

            {/* Controls Bar: Search & Role Filter */}
            <div className="bg-white p-4 rounded-3xl border border-[#E2D5F8] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:max-w-md">
                    <Search className="w-4 h-4 text-[#7C6B93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by staff name, email, or staff ID..." 
                        className="w-full pl-10 pr-9 py-2.5 bg-[#FAF9FA] border border-[#E2D5F8] rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#7C3AED] uppercase font-mono shadow-2xs"
                    />
                    {searchQuery && (
                        <button 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5 bg-[#FAF9FA] border border-[#E2D5F8] px-3 py-1.5 rounded-2xl font-mono text-xs">
                        <Filter className="w-3.5 h-3.5 text-[#7C3AED]" />
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="sub_admin">Sub-Admins Only</option>
                            <option value="admin">Master Admins</option>
                            <option value="teacher">Teachers</option>
                        </select>
                    </div>

                    <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-[#7C3AED] font-mono font-black text-xs rounded-xl uppercase shrink-0">
                        Total Records: {paginationMeta.total}
                    </span>
                </div>
            </div>

            {/* Staff Directory Table */}
            <div className="bg-white rounded-3xl border border-[#E2D5F8] overflow-hidden shadow-xs">
                {loading ? (
                    <div className="w-full py-24 flex flex-col items-center justify-center font-mono text-xs uppercase text-slate-500 gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-[#7C3AED]" />
                        <span className="font-bold tracking-wider text-slate-800">Fetching Directory Records...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#E2D5F8]">
                            <thead className="bg-[#FAF9FA]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider">Staff Member</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider">Contact & Staff ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider">Assigned System Role</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider">Delegated Class Arms</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider">Control Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-[#E2D5F8]/60 text-xs">
                                {staffList.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center text-slate-400 font-mono">
                                            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <span className="text-xs font-bold uppercase text-slate-700">No staff members match your criteria</span>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Try adjusting your search query or role filter.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    staffList.map((staff) => {
                                        const isSubAdmin = staff.staff_role === 'sub_admin';
                                        const isUpdating = updatingRoleId === staff.staff_profile_id;

                                        return (
                                            <tr key={staff.staff_profile_id} className="hover:bg-purple-50/40 transition-colors">
                                                <td className="px-6 py-4 font-black text-slate-900 font-sans">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#7C3AED] font-mono font-black flex items-center justify-center text-xs shrink-0 border border-purple-200">
                                                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                                                        </div>
                                                        <div>
                                                            <span className="block text-xs font-bold text-slate-900">{staff.name}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-slate-600 font-mono">
                                                    <div className="font-bold text-slate-800 text-[11px]">{staff.email}</div>
                                                    <div className="text-[10px] text-[#7C6B93] font-black uppercase">ID: {staff.staff_no || 'N/A'}</div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="relative inline-block">
                                                        <select 
                                                            value={staff.staff_role}
                                                            disabled={isUpdating}
                                                            onChange={(e) => updateStaffRole(staff.staff_profile_id, e.target.value)}
                                                            className={`border rounded-xl px-3 py-1.5 text-xs font-mono font-black cursor-pointer focus:outline-none transition-all shadow-2xs ${getRoleBadgeStyle(staff.staff_role)}`}
                                                        >
                                                            <option value="admin" className="bg-white text-slate-900 font-bold">Master Admin</option>
                                                            <option value="sub_admin" className="bg-white text-slate-900 font-bold">Sub-Admin</option>
                                                            <option value="teacher" className="bg-white text-slate-900 font-bold">Teacher</option>
                                                        </select>
                                                        {isUpdating && (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C3AED] absolute -right-5 top-1/2 -translate-y-1/2" />
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 font-mono text-[11px]">
                                                    {isSubAdmin ? (
                                                        staff.assigned_classes && staff.assigned_classes.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                                {staff.assigned_classes.map(c => (
                                                                    <span key={c.class_arm_id} className="px-2 py-0.5 bg-purple-50 text-[#7C3AED] border border-purple-200 rounded-lg font-bold text-[10px]">
                                                                        {c.class_name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-rose-600 font-bold uppercase text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                                                                ● Unassigned
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-400 font-bold text-[10px] uppercase">
                                                            Full System Access
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    {isSubAdmin ? (
                                                        <button 
                                                            type="button"
                                                            onClick={() => openModal(staff)}
                                                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3.5 py-1.5 rounded-xl font-mono text-[10px] uppercase font-black transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1"
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5" /> Manage Classes
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {paginationMeta.last_page > 1 && (
                <div className="flex justify-between items-center bg-white border border-[#E2D5F8] px-6 py-3 rounded-2xl font-mono text-xs shadow-2xs mt-4">
                    <span className="text-[#7C6B93] font-bold text-[11px] uppercase">
                        Page {paginationMeta.current_page} of {paginationMeta.last_page} ({paginationMeta.total} Total Staff)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage <= 1 || loading}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 border border-[#E2D5F8] rounded-xl text-slate-700 bg-white hover:bg-purple-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-bold"
                        >
                            <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <button
                            disabled={currentPage >= paginationMeta.last_page || loading}
                            onClick={() => setCurrentPage(prev => Math.min(paginationMeta.last_page, prev + 1))}
                            className="px-3 py-1.5 border border-[#E2D5F8] rounded-xl text-slate-700 bg-white hover:bg-purple-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-bold"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Class Allocation Modal */}
            {isModalOpen && selectedStaff && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-[10000] animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E2D5F8] space-y-4 text-left font-sans">
                        <div className="flex items-center justify-between border-b border-[#E2D5F8] pb-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase font-sans">
                                    Allocate Class Arms: <span className="text-[#7C3AED]">{selectedStaff.name}</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Select class arms this sub-admin is authorized to manage.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Search & Select All Tools */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="text"
                                    value={modalSearchQuery}
                                    onChange={(e) => setModalSearchQuery(e.target.value)}
                                    placeholder="Filter class arms..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-[#E2D5F8] rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#7C3AED]"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={toggleSelectAllClasses}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-200 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition-all shrink-0"
                            >
                                {assignedClasses.length === filteredModalClassArms.length ? (
                                    <> <Square className="w-3 h-3" /> Deselect All </>
                                ) : (
                                    <> <CheckSquare className="w-3 h-3" /> Select All </>
                                )}
                            </button>
                        </div>

                        {/* Class Arms Checklist */}
                        <div className="max-h-64 overflow-y-auto space-y-1.5 border border-[#E2D5F8] p-3 rounded-2xl bg-[#FAF9FA]">
                            {filteredModalClassArms.length === 0 ? (
                                <p className="text-center text-xs font-mono text-slate-400 py-6">No matching class arms found.</p>
                            ) : (
                                filteredModalClassArms.map(arm => {
                                    const isChecked = assignedClasses.includes(arm.id);
                                    return (
                                        <label 
                                            key={arm.id} 
                                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                                                isChecked 
                                                    ? 'bg-purple-50/80 border-[#7C3AED]/40 shadow-2xs' 
                                                    : 'bg-white border-transparent hover:border-[#E2D5F8]'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleClassSelection(arm.id)}
                                                    className="h-4 w-4 text-[#7C3AED] border-slate-300 rounded focus:ring-[#7C3AED] cursor-pointer"
                                                />
                                                <span className="text-xs font-bold text-slate-900 uppercase font-mono">{arm.name}</span>
                                            </div>
                                            {isChecked && (
                                                <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                                    Assigned
                                                </span>
                                            )}
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#E2D5F8]">
                            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                                Selected: <strong className="text-[#7C3AED]">{assignedClasses.length}</strong> Class Arms
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer uppercase font-mono"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    disabled={isSavingAllocations}
                                    onClick={saveClassAllocations}
                                    className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold uppercase font-mono shadow-md cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                    {isSavingAllocations ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save Mapping
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification Banner */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[60000] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-mono text-xs uppercase border border-slate-800 animate-slideUp">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="font-bold tracking-wider">{toastMessage}</span>
                </div>
            )}

        </div>
    );
}