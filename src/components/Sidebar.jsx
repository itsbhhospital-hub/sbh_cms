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
            className={`flex items-center gap-3.5 px-4 py-2.5 mx-2 rounded-xl transition-all duration-150 mb-1 group
        ${isActive(to)
                    ? 'bg-[var(--sidebar-active)] bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/20'
                    : 'text-[var(--sidebar-text)] opacity-70 hover:bg-[var(--sidebar-hover)] hover:opacity-100 hover:text-orange-700'
                }`}
        >
            <Icon size={18} className={`transition-transform ${isActive(to) ? 'text-white' : 'text-orange-500 group-hover:scale-110'}`} />
            {(!collapsed || mobileOpen) && (
                <span className={`tracking-tight ${isActive(to) ? 'text-menu-active' : 'text-menu font-bold'}`}>
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
                <div className="p-6 flex items-center justify-between border-b border-slate-200 bg-white min-h-[88px]">
                    {(!collapsed || mobileOpen) && (
                        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-slate-100 p-1">
                                <img src={logo} alt="SBH Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 tracking-tighter text-xl leading-none">SBH<span className="text-orange-600">CMS</span></span>
                                <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] mt-1">Admin Portal</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
                        className={`p-2 bg-slate-50 hover:bg-orange-50 rounded-xl text-slate-400 hover:text-orange-600 transition-all border border-slate-100 shadow-sm ${collapsed && !mobileOpen ? 'mx-auto' : ''}`}
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
                <div className="p-4 border-t border-slate-200 bg-white/80">
                    {(!collapsed || mobileOpen) ? (
                        <div className="flex flex-col gap-3">
                            <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                        <Clock className="animate-pulse" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600/70 tracking-wide leading-none mb-1">Session Left</p>
                                        <p className="text-sm font-mono font-black text-slate-700 leading-none">{timeLeft || '--:--'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-3 p-3.5 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95 shadow-sm group"
                            >
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                <span>Logout Session</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-sm">
                                <Clock size={20} />
                            </div>
                            <button
                                onClick={logout}
                                className="p-3.5 text-slate-400 hover:text-white transition-all bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-rose-600 hover:border-rose-600 active:scale-90"
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
