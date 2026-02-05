import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Key, Shield, Building2, Phone, X, Check, Eye, EyeOff, Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { formatIST } from '../utils/dateUtils';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { setMobileOpen } = useLayout();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const dropdownRef = useRef(null);

    // Robust Getter Helper
    // safeGet is no longer needed due to data normalization


    // Timer State
    const [timeLeft, setTimeLeft] = useState('');
    const [timerStatus, setTimerStatus] = useState('normal');

    // Password Change State
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState(false);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const notifRef = useRef(null);

    // Fetch Notifications
    useEffect(() => {
        if (!user) return;
        const fetchNotifs = async () => {
            try {
                const data = await sheetsService.getComplaints(true);
                const role = String(user.Role || '').toLowerCase();
                const username = String(user.Username || '').toLowerCase();
                const dept = String(user.Department || '').toLowerCase();

                let alerts = [];

                if (role.includes('admin')) {
                    // SUPER ADMIN: Everything Open or Assigned to me
                    const newTickets = data.filter(c =>
                        String(c.Status).toLowerCase() === 'open' || String(c.ResolvedBy || '').toLowerCase() === username
                    );
                    alerts = newTickets.map(t => ({
                        id: t.ID,
                        type: 'alert',
                        msg: `Ticket #${t.ID} is Open in ${t.Department}`,
                        time: t.Date
                    }));
                } else {
                    // STANDARD USER & DEPT STAFF
                    // 1. "My Ticket" Updates (Reported By Me) - Show Status Changes (Solved/Closed)
                    const myReports = data.filter(c =>
                        String(c.ReportedBy || '').toLowerCase() === username &&
                        (String(c.Status) === 'Solved' || String(c.Status) === 'Closed')
                    ).map(t => ({
                        id: t.ID,
                        type: t.Status === 'Closed' || t.Status === 'Solved' ? 'success' : 'info',
                        msg: `Your Ticket #${t.ID} is ${t.Status}`,
                        time: t.ResolvedDate || t.Date
                    }));

                    // 2. "My Department" Tickets (Assigned TO My Dept) - Show OPEN tickets (For Staff to work on)
                    let deptAlerts = [];
                    if (dept) {
                        deptAlerts = data.filter(c =>
                            String(c.Department || '').toLowerCase() === dept &&
                            String(c.Status) === 'Open'
                        ).map(t => ({
                            id: t.ID,
                            type: 'alert',
                            msg: `New Ticket #${t.ID} for ${dept}`,
                            time: t.Date
                        }));
                    }

                    alerts = [...myReports, ...deptAlerts];
                }
                // Sort by TIME desc (Latest first)
                setNotifications(alerts.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5));
            } catch (e) {
                console.error(e);
            } finally {
                setIsPolling(false);
            }
        };
        fetchNotifs();
        const interval = setInterval(() => {
            setIsPolling(true);
            fetchNotifs();
        }, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const fetchNotifs = async () => {
            try {
                // ... logic
            } catch (e) { console.error(e); }
        };
        // ...
    }, [user]);

    // Click Outside Handling
    useClickOutside(dropdownRef, () => setIsOpen(false));
    useClickOutside(notifRef, () => setShowNotifications(false));

    // Timer Logic
    useEffect(() => {
        if (!user) return;
        const updateTimer = () => {
            const loginTime = localStorage.getItem('sbh_login_time');
            if (!loginTime) return;
            const elapsed = Date.now() - parseInt(loginTime);
            const remaining = 3600000 - elapsed; // 1 Hour

            if (remaining <= 0) {
                setTimeLeft("00:00");
                // Optional: Force logout
            } else {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${m}m ${s}s`);

                if (remaining < 60000) setTimerStatus('critical');
                else if (remaining < 300000) setTimerStatus('warning');
                else setTimerStatus('normal');
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [user]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPassError('');

        if (passForm.new.length < 4) {
            setPassError('New password must be at least 4 characters');
            return;
        }
        if (passForm.new !== passForm.confirm) {
            setPassError('New passwords do not match');
            return;
        }

        setIsChanging(true);
        try {
            await sheetsService.changePassword(user.Username, passForm.current, passForm.new);
            setPassSuccess(true);
            setTimeout(() => {
                setShowPasswordModal(false);
                setPassSuccess(false);
                setPassForm({ current: '', new: '', confirm: '' });
                logout(); // Logout after password change for security
            }, 2000);
        } catch (err) {
            // Display backend error message (e.g., 'Current Password Incorrect')
            setPassError(err.message || 'Failed to update password. Try again.');
        } finally {
            setIsChanging(false);
        }
    };

    if (!user) return null;

    return (
        <nav className="sticky top-0 z-[100] w-full px-6 py-3 bg-white border-b border-slate-200 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto flex justify-between md:justify-end items-center gap-4">

                {/* Mobile Menu Button - Left Aligned */}
                <button
                    onClick={() => setMobileOpen(true)}
                    className="md:hidden p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all"
                >
                    <Menu size={24} />
                </button>

                {/* Session Timer Display - Fluent Pill */}
                <div className={`
                    flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all duration-500 shadow-sm
                    ${timerStatus === 'critical' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' :
                        timerStatus === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-slate-50 text-slate-600 border-slate-200/60'}
                `}>
                    <div className={`w-2 h-2 rounded-full ${timerStatus === 'critical' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 hidden sm:block">Session</p>
                    <p className={`font-mono font-bold text-xs sm:text-sm ${timerStatus === 'critical' ? 'text-red-600' : 'text-slate-800'}`}>
                        {timeLeft}
                    </p>
                </div>

                {/* Notification Bell */}
                <div className="relative z-50" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm transition-all relative"
                    >
                        <Bell size={20} className={isPolling ? "animate-wiggle" : ""} />
                        {isPolling && (
                            <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                        )}
                        {notifications.length > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-slate-200 p-4 overflow-hidden z-[200]"
                            >
                                <h4 className="font-black text-slate-800 mb-3 px-2 flex justify-between items-center">
                                    Notifications <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-500">{notifications.length}</span>
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <p className="text-center text-xs font-bold text-slate-400 py-4">No new notifications</p>
                                    ) : (
                                        notifications.map((n, i) => (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    navigate(`/my-complaints?ticketId=${n.id}`);
                                                }}
                                                className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors border border-slate-100 cursor-pointer group relative"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.type === 'alert' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500'}`}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition-colors leading-tight mb-1">{n.msg}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                                                            {formatIST(n.time)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative" ref={dropdownRef}>
                    {/* User Profile Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="flex flex-col items-end hidden sm:flex text-right">
                            <span className="text-sm font-bold text-slate-800 mb-1 capitalize">
                                {String(user.Username)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide leading-none">
                                {String(user.Username || '').toLowerCase() === 'admin' ? 'Super Admin' : user.Role}
                            </span>
                        </div>
                        <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200/50 group-hover:rotate-6 transition-transform">
                            <User size={20} strokeWidth={2.5} />
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-slate-200 p-3 overflow-hidden"
                            >
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { setShowProfile(true); setIsOpen(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all group/item"
                                    >
                                        <div className="bg-slate-100 group-hover/item:bg-emerald-100 p-2 rounded-xl transition-colors">
                                            <Shield size={18} />
                                        </div>
                                        <span className="font-bold text-sm">View Profile</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowPasswordModal(true); setIsOpen(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 text-slate-600 hover:text-emerald-700 transition-all group/item"
                                    >
                                        <div className="bg-slate-100 group-hover/item:bg-emerald-100 p-2 rounded-xl transition-colors">
                                            <Key size={18} />
                                        </div>
                                        <span className="font-bold text-sm">Change Password</span>
                                    </button>

                                    <div className="h-px bg-slate-100 my-2 mx-2"></div>

                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-all group/item"
                                    >
                                        <div className="bg-rose-50 group-hover/item:bg-rose-100 p-2 rounded-xl transition-colors">
                                            <LogOut size={18} />
                                        </div>
                                        <span className="font-bold text-sm">Logout</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfile && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative overflow-hidden border border-emerald-50 shadow-2xl"
                        >
                            <button onClick={() => setShowProfile(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all border border-slate-100">
                                <X size={20} />
                            </button>

                            <div className="w-24 h-24 bg-emerald-700 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-emerald-200">
                                <User size={40} strokeWidth={2} />
                            </div>

                            <h3 className="text-2xl font-black text-slate-800 text-center mb-1 capitalize">{user.Username}</h3>
                            <p className="text-emerald-600 font-bold text-[10px] text-center uppercase tracking-widest mb-8">System Profile</p>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                    <Building2 className="text-slate-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">Department</p>
                                        <p className="text-slate-800 font-bold">{user.Department || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                    <Phone className="text-slate-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">Mobile</p>
                                        <p className="text-slate-800 font-bold">{user.Mobile || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                    <Shield className="text-slate-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">System Role</p>
                                        <p className="text-emerald-700 font-black uppercase text-xs tracking-widest">{String(user.Username || '').toLowerCase() === 'admin' ? 'Super Admin' : user.Role}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative overflow-hidden shadow-2xl"
                        >
                            {!passSuccess ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <Key size={28} />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-800 text-center mb-1 leading-tight">Pass Management</h3>
                                    <p className="text-emerald-600 font-black text-[10px] text-center uppercase tracking-widest mb-8">Security Update</p>

                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPass ? "text" : "password"}
                                                    required
                                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                                                    value={passForm.current}
                                                    onChange={e => setPassForm({ ...passForm, current: e.target.value })}
                                                />
                                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-4 text-slate-400">
                                                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                                                value={passForm.new}
                                                onChange={e => setPassForm({ ...passForm, new: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                                                value={passForm.confirm}
                                                onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                                            />
                                        </div>

                                        {passError && <p className="text-rose-500 text-xs font-bold text-center">{passError}</p>}

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowPasswordModal(false); setPassError(''); }}
                                                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isChanging}
                                                className="flex-2 px-8 py-4 bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                                            >
                                                {isChanging ? 'Updating...' : 'Update'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="py-10 text-center animate-in zoom-in duration-300">
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check size={40} strokeWidth={3} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">Password Updated!</h3>
                                    <p className="text-slate-500 font-medium">System security reinforced.<br />Logging out for safety...</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </nav >
    );
};

export default Navbar;
