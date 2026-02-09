import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Key, Shield, Building2, Phone, X, Check, Eye, EyeOff, Menu, Bell, Edit2, CheckCircle, ArrowRight, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { formatIST } from '../utils/dateUtils';
import UserProfilePanel from '../components/UserProfilePanel';

const Navbar = () => {
    const { user, logout, updateUserSession } = useAuth();
    const { setMobileOpen } = useLayout();
    const navigate = useNavigate();
    const location = useLocation();

    // UI States
    const [isOpen, setIsOpen] = useState(false);

    // Profile Panel State (Replaces inline profile)
    const [showProfilePanel, setShowProfilePanel] = useState(false);

    // Notification States
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    const dropdownRef = useRef(null);
    const notifRef = useRef(null);

    // Notifications Polling
    useEffect(() => {
        if (!user) return;
        const fetchNotifs = async () => {
            try {
                // Fetch all data sources
                const [complaintsData, transferData, extendData] = await Promise.all([
                    sheetsService.getComplaints(true, true), // Force refresh, silent
                    sheetsService.getTransferLogs(true, true),
                    sheetsService.getExtensionLogs(true, true)
                ]);

                const role = String(user.Role || '').toUpperCase().trim();
                const username = String(user.Username || '').toLowerCase().trim();
                const userDept = String(user.Department || '').toLowerCase().trim();

                let allEvents = [];

                // Helper to look up ticket details for Logs
                const getTicket = (id) => complaintsData.find(c => String(c.ID || '').trim() === String(id || '').trim());

                // 1. Complaint Events (New, Solved)
                complaintsData.forEach(t => {
                    // New Complaint
                    if (String(t.Status).toLowerCase() === 'open') {
                        allEvents.push({
                            id: t.ID,
                            type: 'new',
                            title: 'New Complaint Registered',
                            by: t.ReportedBy,
                            dept: t.Department,
                            time: t.Date,
                            icon: AlertTriangle,
                            color: 'text-amber-600 bg-amber-50 border-amber-100',
                            iconBg: 'bg-amber-100 text-amber-600',
                            viewParams: `?ticketId=${t.ID}`
                        });
                    }
                    // Solved Complaint
                    if (['solved', 'closed'].includes(String(t.Status).toLowerCase())) {
                        allEvents.push({
                            id: t.ID,
                            type: 'solved',
                            title: 'Complaint Solved',
                            by: t.ResolvedBy,
                            dept: t.Department,
                            time: t.ResolvedDate || t.LastUpdated || t.Date,
                            icon: CheckCircle,
                            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                            iconBg: 'bg-emerald-100 text-emerald-600',
                            viewParams: `?ticketId=${t.ID}`
                        });
                    }
                });

                // 2. Transfer Events
                if (Array.isArray(transferData)) {
                    transferData.forEach(l => {
                        const ticket = getTicket(l.ID);
                        const displayDept = l.NewDepartment || (ticket ? ticket.Department : 'N/A');

                        allEvents.push({
                            id: l.ID,
                            type: 'transfer',
                            title: 'Complaint Transferred',
                            by: l.TransferredBy,
                            dept: displayDept,
                            msg: `To: ${l.NewDepartment} | From: ${ticket ? ticket.Department : '?'}`,
                            time: l.Date || l.Timestamp,
                            icon: ArrowRight,
                            color: 'text-blue-600 bg-blue-50 border-blue-100',
                            iconBg: 'bg-blue-100 text-blue-600',
                            viewParams: `?ticketId=${l.ID}`
                        });
                    });
                }

                // 3. Extension Events
                if (Array.isArray(extendData)) {
                    extendData.forEach(l => {
                        const ticket = getTicket(l.ID);
                        allEvents.push({
                            id: l.ID,
                            type: 'extended',
                            title: 'Deadline Extended',
                            by: l.ExtendedBy,
                            dept: ticket ? ticket.Department : 'N/A',
                            time: l.Date || l.Timestamp,
                            icon: Clock,
                            color: 'text-purple-600 bg-purple-50 border-purple-100',
                            iconBg: 'bg-purple-100 text-purple-600',
                            viewParams: `?ticketId=${l.ID}`
                        });
                    });
                }

                // Filter based on Role & Permissions
                let filteredEvents = [];

                if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                    filteredEvents = allEvents;
                } else {
                    filteredEvents = allEvents.filter(e => {
                        const isMyDept = userDept && String(e.dept || '').toLowerCase() === userDept;
                        const isMe = String(e.by || '').toLowerCase() === username;
                        return isMyDept || isMe;
                    });
                }

                // Sort by Time Descending (Latest First)
                filteredEvents.sort((a, b) => new Date(b.time) - new Date(a.time));

                setNotifications(filteredEvents);

            } catch (e) {
                console.error("Notif Fetch Error", e);
            } finally {
                setIsPolling(false);
            }
        };

        fetchNotifs();
        const interval = setInterval(() => {
            if (!document.hidden) {
                setIsPolling(true);
                fetchNotifs().catch(err => console.warn("Polling skipped:", err.message));
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [user]);

    // Click Outside Handling
    useClickOutside(dropdownRef, () => setIsOpen(false));
    useClickOutside(notifRef, () => setShowNotifications(false));

    // Profile Update Handler
    const handleUpdateProfile = async (updates) => {
        try {
            // 1. Update Sheet
            await sheetsService.updateUser({
                ...updates,
                OldUsername: user.Username // Critical
            });
            // 2. Update Session
            updateUserSession(updates);

            // 3. Optional: Close panel
            setShowProfilePanel(false);
        } catch (error) {
            console.error("Profile update failed", error);
            const msg = error.message || '';

            // Special handling for System Master (AM Sir)
            if (msg.includes('CRITICAL SECURE') && user.Username === 'AM Sir') {
                alert("Note: Profile updated locally. Server sync is restricted for the System Master account.");
                updateUserSession(updates); // Force local update
                setShowProfilePanel(false);
                return; // Treat as success
            }

            throw error; // Let panel handle other errors
        }
    };

    const renderNotificationItem = (n, i, full = false) => (
        <div
            key={i}
            onClick={() => {
                setShowNotifications(false);
                setShowAllNotifications(false);
                const targetPath = `/my-complaints${n.viewParams}`;
                if (location.pathname + location.search === targetPath) {
                    navigate(targetPath, { replace: true });
                } else {
                    navigate(targetPath);
                }
            }}
            className={`p-3 bg-slate-50 rounded-xl hover:bg-orange-50 transition-colors border border-slate-100 cursor-pointer group relative flex gap-3 ${full ? 'mb-2' : ''}`}
        >
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm border border-black/5 ${n.iconBg}`}>
                <n.icon size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-slate-800 leading-tight mb-0.5">{n.title}</p>
                    <span className="text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap ml-2 opacity-80">{formatIST(n.time).split(',')[1]}</span>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-500 truncate">
                        Ticket: <span className="font-mono text-slate-700">{n.id}</span>
                        {n.dept && <span className="mx-1 opacity-50">•</span>}
                        {n.dept}
                    </p>
                    {n.by && (
                        <p className="text-[10px] font-bold text-slate-400 truncate">
                            By: <span className="text-slate-600">{n.by}</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    if (!user) return null;

    return (
        <>
            <nav className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-300">
                <div className="w-full">
                    <div className="px-3 py-2 md:px-6 md:py-3 max-w-7xl mx-auto flex justify-between items-center gap-2 md:gap-4">

                        {/* LEFT SIDE: Logos & Menu */}
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center">
                                <img src="/sbh_wide.jpg" alt="SBH Logo" className="h-10 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="md:hidden flex items-center gap-2">
                                <img src="/sbh_wide.jpg" alt="Logo" className="h-6 w-auto object-contain mr-1" />
                            </div>
                            <div className="md:hidden">
                                <button
                                    onClick={() => setMobileOpen(true)}
                                    className="p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-700 rounded-xl transition-all"
                                >
                                    <Menu size={22} />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Icons */}
                        <div className="flex items-center gap-3 md:gap-4">

                            {/* Notification Bell */}
                            <div className="relative z-50" ref={notifRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-orange-700 hover:bg-orange-50 shadow-sm transition-all relative"
                                >
                                    <Bell size={20} className={isPolling ? "animate-wiggle" : ""} />
                                    {isPolling && (
                                        <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping"></span>
                                    )}
                                    {notifications.length > 0 && (
                                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="fixed w-[90vw] right-4 top-16 md:absolute md:w-80 md:right-0 md:top-full md:mt-3 bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden z-[200]"
                                        >
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                <h4 className="font-black text-slate-800 text-sm">Notifications</h4>
                                                <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">{notifications.length}</span>
                                            </div>

                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                {notifications.length === 0 ? (
                                                    <div className="text-center py-8 opacity-50">
                                                        <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                                                        <p className="text-xs font-bold text-slate-400">No new notifications</p>
                                                    </div>
                                                ) : (
                                                    notifications.slice(0, 5).map((n, i) => renderNotificationItem(n, i))
                                                )}
                                            </div>

                                            {notifications.length > 5 && (
                                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                                    <button
                                                        onClick={() => { setShowNotifications(false); setShowAllNotifications(true); }}
                                                        className="w-full py-2 text-xs font-black text-slate-500 hover:text-orange-600 hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        See All History <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative" ref={dropdownRef}>
                                {/* User Profile Button */}
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex flex-col items-end hidden sm:flex text-right">
                                        <span className="text-table-data font-black text-slate-800 leading-tight">
                                            {String(user.Username)}
                                        </span>
                                        <span className="text-[10px] font-black text-orange-600 tracking-[0.05em] leading-none mt-1 opacity-70">
                                            {user.Role === 'SUPER_ADMIN' ? 'System Master' : user.Role}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 overflow-hidden border border-slate-200 shadow-sm group-hover:border-orange-200 transition-colors">
                                        {user.ProfilePhoto ? (
                                            <img src={user.ProfilePhoto} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <User size={20} strokeWidth={2.5} />
                                        )}
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden z-[200]"
                                        >
                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={() => { setIsOpen(false); setShowProfilePanel(true); }}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all group/item"
                                                >
                                                    <div className="bg-slate-100 group-hover/item:bg-white group-hover/item:shadow-sm p-2 rounded-lg transition-all">
                                                        <Shield size={18} className="text-slate-500 group-hover/item:text-emerald-500" />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="font-bold text-sm block">My Profile</span>
                                                        <span className="text-[10px] font-bold text-slate-400">View detailed info</span>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={logout}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-all group/item"
                                                >
                                                    <div className="bg-rose-50 group-hover/item:bg-white group-hover/item:shadow-sm p-2 rounded-lg transition-all">
                                                        <LogOut size={18} className="text-rose-400 group-hover/item:text-rose-600" />
                                                    </div>
                                                    <span className="font-bold text-sm">Sign Out</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div >
                </div >
            </nav >

            {/* Profile Side Panel */}
            <AnimatePresence>
                {showProfilePanel && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[140]"
                            onClick={() => setShowProfilePanel(false)}
                        />
                        <UserProfilePanel
                            user={user}
                            onClose={() => setShowProfilePanel(false)}
                            onUpdate={handleUpdateProfile}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Full Notifications Modal */}
            <AnimatePresence>
                {showAllNotifications && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">Notifications</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Full History ({notifications.length})</p>
                                </div>
                                <button onClick={() => setShowAllNotifications(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
                                {notifications.map((n, i) => (
                                    <div key={i} className="flex gap-4 mb-6 relative group">
                                        {/* Timeline Line */}
                                        {i !== notifications.length - 1 && (
                                            <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>
                                        )}

                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm border ${n.iconBg} z-10`}>
                                            <n.icon size={20} />
                                        </div>

                                        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => {
                                                setShowAllNotifications(false);
                                                navigate(`/my-complaints${n.viewParams}`);
                                            }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800">{n.title}</h4>
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{formatIST(n.time)}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium mb-3">
                                                Ticket <span className="font-mono text-slate-700 font-bold">#{n.id}</span> • {n.dept}
                                            </p>
                                            {n.msg && (
                                                <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600 italic">
                                                    "{n.msg}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
