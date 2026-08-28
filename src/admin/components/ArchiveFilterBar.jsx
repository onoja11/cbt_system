// src/components/ArchiveFilterBar.jsx
import React, { useState } from 'react';

export default function ArchiveFilterBar({ onFilterChange }) {
    const [session, setSession] = useState('');
    const [term, setTerm] = useState('');
    const [isArchiveActive, setIsArchiveActive] = useState(false);

    const handleApply = () => {
        if (!session || !term) {
            alert('Select both session and term to view archive.');
            return;
        }
        setIsArchiveActive(true);
        // Pass query parameters up to the parent page/dashboard component
        onFilterChange({ session, term });
    };

    const handleClear = () => {
        setSession('');
        setTerm('');
        setIsArchiveActive(false);
        onFilterChange(null); // Resets back to current active term
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${isArchiveActive ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
            <span className="font-semibold text-gray-700">
                {isArchiveActive ? '📦 Viewing Archive:' : '⚡ Live Active View'}
            </span>

            <select 
                value={session} 
                onChange={(e) => setSession(e.target.value)}
                className="px-2 py-1 border rounded bg-white text-xs"
            >
                <option value="">Select Session</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
            </select>

            <select 
                value={term} 
                onChange={(e) => setTerm(e.target.value)}
                className="px-2 py-1 border rounded bg-white text-xs"
            >
                <option value="">Select Term</option>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
            </select>

            {!isArchiveActive ? (
                <button 
                    onClick={handleApply}
                    className="bg-gray-800 hover:bg-black text-white px-3 py-1 rounded text-xs font-semibold"
                >
                    Load Archive
                </button>
            ) : (
                <button 
                    onClick={handleClear}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
                >
                    Reset to Active
                </button>
            )}
        </div>
    );
}