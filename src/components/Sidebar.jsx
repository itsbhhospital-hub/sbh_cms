import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FilePlus,
    Users,
    LogOut,
    Settings,
    Menu,
    X
} from 'lucide-react';
import { useState, useEffect } from 'react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    // Timer Logic
    useEffect(() => {
        const updateTimer = () => {
            const loginTime = localStorage.getItem('sbh_login_time');
            if (!loginTime) return;

            const elapsed = Date.now() - parseInt(loginTime);
            const remaining = (60 * 60 * 1000) - elapsed; // 1 Hour

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

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    // Simple active check
    const isActive = (path) => location.pathname === path;

    const NavItem = ({ to, icon: Icon, label, onClick }) => (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 mb-1 group
        ${isActive(to)
                    ? 'bg-white/20 text-white shadow-lg border border-white/20 backdrop-blur-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
        >
            <Icon size={20} className={`${!collapsed && 'group-hover:translate-x-1'} transition-transform ${isActive(to) ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
            {(!collapsed || mobileOpen) && <span className="font-bold whitespace-nowrap text-sm tracking-wide">{label}</span>}
        </Link>
    );

    return (
        <>
            {/* Mobile Toggle Button (Visible only on Mobile when sidebar closed) */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-40 bg-indigo-900 text-white p-2.5 rounded-xl shadow-lg border border-white/20 active:scale-95 transition-transform"
            >
                <Menu size={24} />
            </button>

            {/* Backdrop for Mobile */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container - Increased Z-Index to sit above Footer */}
            <div className={`h-screen flex flex-col transition-all duration-300 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 border-r border-white/10 shadow-2xl z-[60]
                fixed md:sticky top-0 left-0
                ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
                ${collapsed ? 'md:w-24' : 'md:w-72'}
            `}>
                {/* Header */}
                <div className="p-8 flex items-center gap-4 border-b border-white/10">
                    <div className="relative">
                        <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-xl bg-white/10 object-contain p-0.5 border border-white/20 shadow-md backdrop-blur-sm" />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-indigo-900"></div>
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <div>
                            <h1 className="font-black text-xl leading-tight text-white tracking-tight">SBH Group</h1>
                            <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest">Portal</p>
                        </div>
                    )}

                    {/* Mobile Close Button */}
                    <button onClick={() => setMobileOpen(false)} className="md:hidden ml-auto text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Desktop Toggle (Hidden on Mobile) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex absolute -right-3 top-10 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-500 transition-colors border border-white/20 z-50 hover:scale-110 active:scale-95 items-center justify-center"
                >
                    {collapsed ? <Menu size={14} /> : <X size={14} />}
                </button>

                {/* Nav */}
                <div className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar">
                    <div className="mb-4 px-4 text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {(!collapsed || mobileOpen) && 'Main Menu'}
                    </div>

                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/new-complaint" icon={FilePlus} label="New Ticket" />

                    {user.Role === 'admin' && (
                        <>
                            <div className="mt-10 mb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {(!collapsed || mobileOpen) && 'Administration'}
                            </div>
                            <NavItem to="/user-management" icon={Users} label="User Management" />
                        </>
                    )}
                </div>

                {/* User Footer */}
                <div className={`p-6 border-t border-white/20 bg-white/10 mb- safe-bottom ${(collapsed && !mobileOpen) ? 'flex justify-center' : ''}`}>
                    <div className={`flex items-center gap-3 ${(collapsed && !mobileOpen) ? 'flex-col' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-lg border border-white/30 backdrop-blur-md min-w-[2.5rem]">
                            {user.Username.charAt(0).toUpperCase()}
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm truncate text-white drop-shadow-md">{user.Username}</p>
                                <p className="text-xs text-white/70 truncate capitalize font-medium">{user.Department || user.Role}</p>
                                <p className="text-[10px] text-emerald-300 font-mono mt-0.5 opacity-80">
                                    Time Left: {timeLeft}
                                </p>
                            </div>
                        )}
                        {(!collapsed || mobileOpen) && (
                            <button
                                onClick={logout}
                                className="ml-auto p-2 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
