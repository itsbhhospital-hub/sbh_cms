import React, { useState, useEffect } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useLoading } from '../context/LoadingContext';
import {
    LayoutDashboard, Plus, ClipboardList, CheckCircle,
    Clock, LogOut, ChevronLeft, ChevronRight, Menu,
    Users, BarChart3, ShieldCheck, Key, FileText, Share2, Hospital, X
} from 'lucide-react';


const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useLayout();
    const { showLoader } = useLoading();
    const [timeLeft, setTimeLeft] = useState('');
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const loginTime = localStorage.getItem('sbh_login_time');
            if (!loginTime) return;
            const elapsed = Date.now() - parseInt(loginTime);
            const remaining = (60 * 60 * 1000) - elapsed;
            if (remaining <= 0) {
                setTimeLeft('00:00');
            } else {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location, setMobileOpen]);

    const adminMenuItems = [
        { path: '/user-management', name: 'User Management', icon: Users },
        { path: '/work-report', name: 'User Work Report', icon: BarChart3 },
        { path: '/change-password', name: 'Change Password', icon: Key },
    ];

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            onClick={() => {
                // if (location.pathname !== to) showLoader(); // REMOVED: Instant Navigation
                setMobileOpen(false);
            }}
            className={({ isActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-all duration-300 group
                font-ui font-semibold tracking-wide mb-1 text-[13.5px]
                ${isActive
                    ? 'bg-white/10 backdrop-blur-md text-white shadow-lg border border-white/20 scale-[1.02]'
                    : 'text-white hover:bg-white/5 transition-all opacity-90 hover:opacity-100'
                }
            `}
        >
            {({ isActive }) => (
                <>
                    <Icon
                        size={18}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white group-hover:text-white'}`}
                    />

                    {(!collapsed || mobileOpen || isHovered) && (
                        <span className="relative z-10">{label}</span>
                    )}

                    {isActive && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-sm shadow-indigo-500/50" />
                    )}
                </>
            )}
        </NavLink>
    );

    return (
        <>
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                onMouseEnter={() => !mobileOpen && setIsHovered(true)}
                onMouseLeave={() => !mobileOpen && setIsHovered(false)}
                className={`fixed md:sticky top-0 left-0 z-[150] h-[100dvh] 
                bg-gradient-to-b from-[#1e3a8a] via-[#4338ca] to-[#6366f1]
                backdrop-blur-xl border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.2)] 
                flex flex-col justify-between transition-all duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0 w-[80%] max-w-[300px]' : collapsed && !isHovered ? 'w-[80px] -translate-x-0' : 'translate-x-0 w-[260px]'}
                ${!mobileOpen && 'hidden md:flex flex-col'}`}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-center border-b border-white/10 mb-2 relative shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg p-1">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {(!collapsed || mobileOpen || isHovered) && (
                            <span className="font-black text-xl text-white tracking-tight drop-shadow-md">
                                SBH CMS
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className="px-2 py-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="mb-2 px-4 text-[11px] font-bold text-indigo-100 uppercase tracking-wider leading-none opacity-90">
                        {(!collapsed || mobileOpen || isHovered) && 'Hospital Services'}
                    </div>

                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/new-complaint" icon={Plus} label="New Ticket" />
                    <NavItem to="/my-complaints" icon={ClipboardList} label="Complaint Desk" />
                    <NavItem to="/case-transfer" icon={Share2} label="Case Transfer" />
                    <NavItem to="/extended-cases" icon={Clock} label="Extended Cases" />
                    <NavItem to="/solved-by-me" icon={CheckCircle} label="Solved By Me" />

                    {(user.Role === 'admin' || user.Role === 'SUPER_ADMIN') && (
                        <>
                            <div className="mt-6 mb-2 px-4 text-[11px] font-bold text-indigo-100 uppercase tracking-wider leading-none opacity-90">
                                {(!collapsed || mobileOpen || isHovered) && 'System Management'}
                            </div>
                            {adminMenuItems.map((item) => (
                                <NavItem key={item.path} to={item.path} icon={item.icon} label={item.name} />
                            ))}
                        </>
                    )}
                </nav>

                {/* Footer Section - Merged Style */}
                <div className="p-2 flex flex-col justify-end shrink-0">
                    {(!collapsed || mobileOpen || isHovered) ? (
                        <div className="flex flex-col gap-3">
                            <div className="bg-white/20 border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center text-white shadow-sm">
                                        <Clock className="animate-pulse" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-100 tracking-wide leading-none mb-1 opacity-80 uppercase">Session Left</p>
                                        <p className="text-sm font-mono font-black text-white leading-none tracking-wider">{timeLeft || '--:--'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-3 p-3.5 bg-rose-500/10 text-rose-200 font-bold rounded-2xl border border-rose-500/20 hover:bg-rose-500/20 hover:text-white transition-all shadow-lg active:scale-95 group backdrop-blur-sm"
                            >
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                <span>Logout Session</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/10 shadow-sm">
                                <Clock size={20} />
                            </div>
                            <button
                                onClick={logout}
                                className="p-3.5 bg-white text-[#65a30d] rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-90"
                                title="Logout"
                            >
                                <LogOut size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
