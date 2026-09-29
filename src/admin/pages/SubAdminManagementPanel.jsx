import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../core/api';
import { ShieldAlert, Loader2, Search } from 'lucide-react';

export default function SubAdminManagementPanel({ onNavigateBack }) {
    const [staffList, setStaffList] = useState([]);
    const [classArms, setClassArms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // 🔍 Search Query State
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDirectoryData();
    }, []);

    const loadDirectoryData = async () => {
        try {
            setLoading(true);
            const [staffRes, classesRes] = await Promise.all([
                apiRequest('api/v1/admin/sub-admins/directory', { method: 'GET' }),
                apiRequest('api/v1/admin/directory/class-arms', { method: 'GET' })
            ]);

            if (staffRes.ok && classesRes.ok) {
                const staffData = await staffRes.json();
                const classData = await classesRes.json();
                setStaffList(staffData.staff_directory || []);
                setClassArms(classData.class_arms || []);
            }
        } catch (err) {
            console.error('Network error loading sub-admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStaffRole = async (staffProfileId, newRole) => {
        try {
            const res = await apiRequest(`api/v1/admin/sub-admins/${staffProfileId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ staff_role: newRole })
            });
            if (res.ok) {
                loadDirectoryData();
            } else {
                alert('Role update failed. Check permissions.');
            }
        } catch (err) {
            alert('Failed to update role.');
        }
    };

    const openModal = (staff) => {
        setSelectedStaff(staff);
        setAssignedClasses(staff.assigned_classes.map(c => c.class_arm_id));
        setIsModalOpen(true);
    };

    const toggleClassSelection = (classId) => {
        setAssignedClasses(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const saveClassAllocations = async () => {
        try {
            const res = await apiRequest(`api/v1/admin/sub-admins/${selectedStaff.staff_profile_id}/allocations`, {
                method: 'POST',
                body: JSON.stringify({ class_arm_ids: assignedClasses })
            });
            if (res.ok) {
                setIsModalOpen(false);
                loadDirectoryData();
            } else {
                alert('Failed to save class mapping.');
            }
        } catch (err) {
            alert('Failed to save class mapping.');
        }
    };

    // 🔍 Filter staff based on search input (Name, Email, or Staff Number)
    const filteredStaffList = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return staffList;
        return staffList.filter(staff => 
            (staff.name && staff.name.toLowerCase().includes(q)) ||
            (staff.email && staff.email.toLowerCase().includes(q)) ||
            (staff.staff_no && staff.staff_no.toLowerCase().includes(q))
        );
    }, [staffList, searchQuery]);

    if (loading) {
        return (
            <div className="w-full py-24 flex items-center justify-center font-mono text-xs uppercase text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600 mr-2" /> Loading directory...
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-left font-sans">
            
            {/* Header Card with Title & Search Bar */}
            <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-purple-600" /> Sub-Admin Access Control
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-mono uppercase">
                        Assign roles and delegate class arms for workload balancing.
                    </p>
                </div>

                {/* 🔍 Search Input Bar */}
                <div className="relative w-full md:max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, staff ID..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-purple-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 uppercase font-mono shadow-2xs"
                    />
                </div>
            </div>

            {/* Staff Directory Table */}
            <div className="bg-white rounded-3xl border border-purple-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-purple-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-slate-500 uppercase">Staff Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-slate-500 uppercase">Contact / ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-slate-500 uppercase">Role</th>
                                <th className="px-6 py-4 text-left text-[10px] font-mono font-black text-slate-500 uppercase">Assigned Classes</th>
                                <th className="px-6 py-4 text-right text-[10px] font-mono font-black text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-xs">
                            {filteredStaffList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-mono italic">
                                        No staff members match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaffList.map((staff) => (
                                    <tr key={staff.staff_profile_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{staff.name}</td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">
                                            {staff.email} <br/><span className="text-[10px] text-slate-400">{staff.staff_no}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={staff.staff_role}
                                                onChange={(e) => updateStaffRole(staff.staff_profile_id, e.target.value)}
                                                className="border border-purple-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-purple-600"
                                            >
                                                <option value="admin">Master Admin</option>
                                                <option value="sub_admin">Sub-Admin</option>
                                                <option value="teacher">Teacher</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px]">
                                            {staff.staff_role === 'sub_admin' ? (
                                                staff.assigned_classes.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {staff.assigned_classes.map(c => (
                                                            <span key={c.class_arm_id} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md font-bold">
                                                                {c.class_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-red-500 font-bold italic">No classes assigned</span>
                                                )
                                            ) : (
                                                <span className="text-slate-400 italic">Full System Access</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {staff.staff_role === 'sub_admin' && (
                                                <button 
                                                    onClick={() => openModal(staff)}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase font-bold transition cursor-pointer shadow-xs"
                                                >
                                                    Manage Classes
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Class Allocation Modal */}
            {isModalOpen && selectedStaff && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[10000]">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-200 space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 uppercase">
                                Allocate Classes: <span className="text-purple-600">{selectedStaff.name}</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Check the class arms this sub-admin can control.</p>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 border border-purple-100 p-3 rounded-2xl bg-slate-50">
                            {classArms.map(arm => (
                                <label key={arm.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={assignedClasses.includes(arm.id)}
                                        onChange={() => toggleClassSelection(arm.id)}
                                        className="h-4 w-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-bold text-slate-800 uppercase font-mono">{arm.name}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer uppercase font-mono"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveClassAllocations}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase font-mono shadow-md cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}