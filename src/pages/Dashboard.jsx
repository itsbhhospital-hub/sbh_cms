import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sheetsService } from '../services/googleSheets';
import ComplaintList from '../components/ComplaintList';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, Clock, Plus, History, Shield, Users, Database, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ open: 0, resolved: 0, delayed: 0, total: 0, staffCount: 0 });
    const isAdmin = user?.Role?.toLowerCase() === 'admin';

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        const [complaintsData, usersData] = await Promise.all([
            sheetsService.getComplaints(),
            isAdmin ? sheetsService.getUsers() : Promise.resolve([])
        ]);

        const role = user?.Role?.toLowerCase();
        const dept = user?.Department;

        const relevant = complaintsData.filter(c => {
            if (role === 'admin') return true;
            if (c.Department === dept) return true;
            if (c.ReportedBy === user.Username) return true;
            return false;
        });

        const open = relevant.filter(c => c.Status === 'Open').length;
        const resolved = relevant.filter(c => c.Status === 'Solved' || c.Status === 'Closed').length;
        const total = relevant.length;

        const delayed = relevant.filter(c => {
            if (c.Status !== 'Open') return false;
            const diff = Date.now() - new Date(c.Date).getTime();
            return diff > 86400000;
        }).length;

        // Calculate Staff Count (Active Users)
        const staffCount = isAdmin ? usersData.filter(u => u.Status === 'Active').length : 0;

        setStats({ open, resolved, delayed, total, staffCount });
    };

    const StatCard = ({ icon: Icon, title, value, colorClass, bgClass, delay }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
        >
            <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500`}>
                <Icon size={100} className="text-slate-900" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgClass} ${colorClass}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h4 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{value}</h4>
                    <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">{title}</p>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-emerald-600">
                        <LayoutDashboard size={20} />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/60">
                            {isAdmin ? 'Admin Console' : 'Staff Dashboard'}
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Overview</h1>
                    <p className="text-slate-500 font-medium text-lg">
                        Welcome back, <span className="text-slate-900 font-bold">{user.Username}</span>
                        {user.Department && <span className="bg-slate-100 px-2 py-0.5 rounded-md text-sm ml-2 border border-slate-200">{user.Department}</span>}
                    </p>
                </div>

                <div className="flex gap-3 relative z-10">
                    {isAdmin && (
                        <Link to="/user-management" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow">
                            <Users size={18} /> <span className="hidden md:inline">Manage Users</span>
                        </Link>
                    )}
                    <Link to="/new-complaint" className="group flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-[0.98] hover:bg-emerald-700">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>New Ticket</span>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={AlertCircle} title="Open Cases" value={stats.open}
                    bgClass="bg-orange-50" colorClass="text-orange-600" delay={0.1}
                />
                <StatCard
                    icon={CheckCircle} title="Resolved" value={stats.resolved}
                    bgClass="bg-emerald-50" colorClass="text-emerald-600" delay={0.2}
                />
                {!isAdmin ? (
                    <StatCard
                        icon={Clock} title="Delayed Cases" value={stats.delayed}
                        bgClass="bg-red-50" colorClass="text-red-600" delay={0.3}
                    />
                ) : (
                    <StatCard
                        icon={Users} title="Active Staff" value={stats.staffCount}
                        bgClass="bg-blue-50" colorClass="text-blue-600" delay={0.3}
                    />
                )}

                <StatCard
                    icon={isAdmin ? Database : History} title={isAdmin ? "Total Records" : "My History"} value={stats.total}
                    bgClass="bg-purple-50" colorClass="text-purple-600" delay={0.4}
                />
            </div>

            {/* Complaint Feed */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <Activity size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Activity</h3>
                </div>
                {/* Clean container for list */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative min-h-[400px]">
                    <ComplaintList />
                </div>
            </div>

        </div>
    );
};

export default Dashboard;

