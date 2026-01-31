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
import { useState } from 'react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    // Simple active check
    const isActive = (path) => location.pathname === path;

    const NavItem = ({ to, icon: Icon, label, onClick }) => (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 mb-1 group
        ${isActive(to)
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
        >
            <Icon size={20} className={`${!collapsed && 'group-hover:translate-x-1'} transition-transform`} />
            {!collapsed && <span className="font-medium whitespace-nowrap text-sm tracking-wide">{label}</span>}
        </Link>
    );

    return (
        <div className={`h-screen sticky top-0 left-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-50 shadow-2xl
      ${collapsed ? 'w-20' : 'w-72'}
    `}>
            {/* Header */}
            <div className="p-6 flex items-center gap-4 border-b border-slate-800 bg-slate-900">
                <div className="relative">
                    <img src="/src/assets/logo.jpg" alt="Logo" className="w-12 h-12 rounded-lg bg-white object-contain p-0.5 border border-slate-700 shadow-inner" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                </div>
                {!collapsed && (
                    <div>
                        <h1 className="font-bold text-lg leading-tight text-white tracking-tight">SBH Group</h1>
                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Enterprise Portal</p>
                    </div>
                )}
            </div>

            {/* Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-9 bg-blue-600 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-500 transition-colors border-2 border-slate-50 z-50"
            >
                {collapsed ? <Menu size={12} /> : <X size={12} />}
            </button>

            {/* Nav */}
            <div className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
                <div className="mb-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {!collapsed && 'Main Menu'}
                </div>

                <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                <NavItem to="/new-complaint" icon={FilePlus} label="New Ticket" />

                {user.Role === 'admin' && (
                    <>
                        <div className="mt-8 mb-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {!collapsed && 'Administration'}
                        </div>
                        <NavItem to="/users" icon={Users} label="User Directory" />
                    </>
                )}
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md ring-1 ring-white/10">
                        {user.Username.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="font-semibold text-sm truncate text-slate-200">{user.Username}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{user.Department || user.Role}</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={logout}
                            className="ml-auto p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
