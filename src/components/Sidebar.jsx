import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useLoading } from '../context/LoadingContext';
import {
    LayoutDashboard, Plus, ClipboardList, CheckCircle,
    Clock, LogOut, ChevronLeft, ChevronRight, Menu,
    Users, BarChart3, ShieldCheck, Key, FileText, Share2, Hospital, X
} from 'lucide-react';
import logo from '../assets/logo.jpg';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useLayout();
    const { showLoader } = useLoading();
    const [timeLeft, setTimeLeft] = useState('');

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

    const isActive = (path) => location.pathname === path;

    const NavItem = ({ to, icon: Icon, label }) => (
        <Link
            to={to}
            onClick={() => {
                if (location.pathname !== to) showLoader();
                setMobileOpen(false);
            }}
            className={`flex items-center gap-3.5 px-4 py-3 mx-2 rounded-xl transition-all duration-300 mb-1 group relative overflow-hidden
        ${isActive(to)
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-emerald-100/70 hover:bg-emerald-800/40 hover:text-white hover:shadow-inner'
                }`}
        >
            {isActive(to) && (
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
            <Icon size={18} className={`transition-transform duration-300 ${isActive(to) ? 'text-white scale-105' : 'text-emerald-400/80 group-hover:scale-110 group-hover:text-emerald-300'}`} />
            {(!collapsed || mobileOpen) && (
                <span className={`tracking-wide ${isActive(to) ? 'text-menu-active font-bold' : 'text-menu font-medium'}`}>
                    {label}
                </span>
            )}
        </Link>
    );

    return (
        <>
            {/* Backdrop for Mobile */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar View */}
            <aside
                style={{ '--sidebar-offset': mobileOpen ? '0px' : (collapsed ? '5rem' : '18rem') }}
                className={`fixed md:sticky top-0 left-0 z-[150] h-[100dvh] bg-[var(--sidebar-bg)] border-r border-green-200/50 flex flex-col transition-all duration-300 ease-in-out shadow-[10px_0_40px_-15px_rgba(0,0,0,0.05)]
                ${mobileOpen ? 'translate-x-0 w-[80%] max-w-[300px]' : '-translate-x-full md:translate-x-0'}
                ${collapsed ? 'md:w-20' : 'md:w-72'}`}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-emerald-900/50 bg-[var(--sidebar-bg)] min-h-[88px]">
                    {(!collapsed || mobileOpen) && (
                        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 p-1 backdrop-blur-sm">
                                <img src={logo} alt="SBH Logo" className="w-full h-full object-contain rounded-lg opacity-90" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-primary font-black text-white tracking-tighter text-xl leading-none">SBH<span className="text-emerald-400">CMS</span></span>
                                <span className="text-[10px] font-bold text-emerald-400/60 tracking-[0.1em] mt-1">Admin Portal</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
                        className={`p-2 bg-white/5 hover:bg-emerald-800 rounded-xl text-emerald-400 hover:text-white transition-all border border-white/5 shadow-sm ${collapsed && !mobileOpen ? 'mx-auto' : ''}`}
                    >
                        {mobileOpen ? <X size={20} /> : (collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />)}
                    </button>
                </div>

                {/* Navigation Section */}
                <div className="flex-1 px-3 py-6 overflow-y-auto no-scrollbar">
                    <div className="mb-4 px-4 text-small-info font-bold text-orange-950/40 tracking-wide leading-none">
                        {(!collapsed || mobileOpen) && 'Hospital Services'}
                    </div>

                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/new-complaint" icon={Plus} label="New Ticket" />
                    <NavItem to="/my-complaints" icon={ClipboardList} label="Complaint Desk" />
                    <NavItem to="/case-transfer" icon={Share2} label="Case Transfer" />
                    <NavItem to="/extended-cases" icon={Clock} label="Extended Cases" />
                    <NavItem to="/solved-by-me" icon={CheckCircle} label="Solved By Me" />

                    {(user.Role === 'admin' || user.Role === 'SUPER_ADMIN') && (
                        <>
                            <div className="mt-8 mb-4 px-4 text-small-info font-bold text-orange-950/40 tracking-wide leading-none">
                                {(!collapsed || mobileOpen) && 'System Management'}
                            </div>
                            <NavItem to="/user-management" icon={Users} label="User Management" />
                            <NavItem to="/work-report" icon={BarChart3} label="User Work Report" />
                        </>
                    )}
                </div>

                {/* Footer Area */}
                <div className="p-4 border-t border-emerald-900/50 bg-[var(--sidebar-bg)]">
                    {(!collapsed || mobileOpen) ? (
                        <div className="flex flex-col gap-3">
                            <div className="bg-emerald-900/30 border border-emerald-800/50 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-800/50 flex items-center justify-center text-emerald-400 shadow-sm border border-emerald-700/50">
                                        <Clock className="animate-pulse" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-500/70 tracking-wide leading-none mb-1">Session Left</p>
                                        <p className="text-sm font-mono font-black text-emerald-100 leading-none">{timeLeft || '--:--'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-3 p-3.5 bg-emerald-900/20 text-emerald-400 font-bold rounded-2xl border border-emerald-800/50 hover:bg-rose-900/80 hover:text-rose-200 hover:border-rose-800 transition-all active:scale-95 shadow-sm group"
                            >
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                <span>Logout Session</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-800/50 shadow-sm">
                                <Clock size={20} />
                            </div>
                            <button
                                onClick={logout}
                                className="p-3.5 text-emerald-500 hover:text-rose-200 transition-all bg-emerald-900/20 rounded-xl border border-emerald-800/50 shadow-sm hover:bg-rose-900/80 hover:border-rose-800 active:scale-90"
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
