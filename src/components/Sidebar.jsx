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
import logo from '../assets/logo.png';

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
    ];

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            onClick={() => {
                if (location.pathname !== to) showLoader();
                setMobileOpen(false);
            }}
            className={({ isActive }) => `
                relative flex items-center gap-3 px-4 py-3.5 mx-2 rounded-xl transition-all duration-300 group
                font-body font-bold tracking-wide mb-1
                ${isActive
                    ? 'bg-white text-[#65a30d] shadow-lg shadow-black/10 scale-[1.02]'
                    : 'text-[#1a2e05] hover:bg-white/20 hover:text-black'
                }
            `}
        >
            {({ isActive }) => (
                <>
                    <Icon
                        size={22}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-[#65a30d]' : 'text-[#1a2e05] group-hover:text-black'}`}
                    />

                    {(!collapsed || mobileOpen || isHovered) && (
                        <span className="relative z-10">{label}</span>
                    )}

                    {isActive && (
                        <div className="absolute right-3 w-2 h-2 rounded-full bg-[#65a30d] shadow-sm" />
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
                className={`fixed md:sticky top-0 left-0 z-[150] h-[100dvh] bg-[#84cc16] shadow-2xl transition-all duration-300 ease-in-out border-r border-white/20 flex flex-col justify-between
                ${mobileOpen ? 'translate-x-0 w-[280px]' : collapsed && !isHovered ? 'w-[80px] -translate-x-0' : 'translate-x-0 w-[260px]'}
                ${!mobileOpen && 'hidden md:flex flex-col'}`}
            >
                {/* Header */}
                <div className="h-20 flex items-center justify-center border-b border-black/10 mb-2 relative shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#65a30d] shadow-lg">
                            <LayoutDashboard size={24} strokeWidth={2.5} />
                        </div>
                        {(!collapsed || mobileOpen || isHovered) && (
                            <span className="font-black text-2xl text-white tracking-tight drop-shadow-sm">
                                CMS<span className="text-yellow-300">.</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-4 px-4 text-xs font-black text-[#1a2e05] uppercase tracking-wider leading-none opacity-80">
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
                            <div className="mt-8 mb-4 px-4 text-xs font-black text-[#1a2e05] uppercase tracking-wider leading-none opacity-80">
                                {(!collapsed || mobileOpen || isHovered) && 'System Management'}
                            </div>
                            {adminMenuItems.map((item) => (
                                <NavItem key={item.path} to={item.path} icon={item.icon} label={item.name} />
                            ))}
                        </>
                    )}
                </nav>

                {/* Footer Section */}
                <div className="p-4 border-t border-black/10 bg-black/5 backdrop-blur-sm shrink-0">
                    {(!collapsed || mobileOpen || isHovered) ? (
                        <div className="flex flex-col gap-3">
                            <div className="bg-white/20 border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center text-white shadow-sm">
                                        <Clock className="animate-pulse" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[#1a2e05] tracking-wide leading-none mb-1">Session Left</p>
                                        <p className="text-sm font-mono font-black text-white leading-none">{timeLeft || '--:--'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-3 p-3.5 bg-white text-[#65a30d] font-bold rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-95 group"
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
