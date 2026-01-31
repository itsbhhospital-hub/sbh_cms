import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sheetsService } from '../services/googleSheets';
import ComplaintList from '../components/ComplaintList';
import AdminUserPanel from '../components/AdminUserPanel'; // Still useful for Admins? Maybe explicit request was to remove. "sirf me open...".
// AdminUserPanel is for user approval. It's useful. I'll keep it but perhaps below or conditional. User said "sirf me open complaint...". I will prioritize stats.
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, Clock, Plus, History } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ open: 0, resolved: 0, delayed: 0, total: 0 });

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        const data = await sheetsService.getComplaints();
        const role = user?.Role?.toLowerCase();
        const dept = user?.Department;

        const relevant = data.filter(c => {
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

        setStats({ open, resolved, delayed, total });
    };

    const StatCard = ({ icon: Icon, title, value, gradient, delay }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`p-6 rounded-3xl shadow-2xl relative overflow-hidden group ${gradient}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <Icon size={100} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-4 border border-white/10 shadow-lg">
                    <Icon size={24} className="text-white" />
                </div>
                <div>
                    <h4 className="text-4xl font-black text-white mb-1 drop-shadow-md">{value}</h4>
                    <p className="text-white/80 text-sm font-bold tracking-wider uppercase backdrop-blur-sm inline-block px-2 py-0.5 rounded-md bg-black/5">{title}</p>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900/50 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 tracking-tight mb-2">Dashboard</h1>
                    <p className="text-slate-400 font-medium text-lg">
                        Overview for <span className="text-cyan-400 font-bold bg-cyan-900/30 px-2 py-0.5 rounded-lg border border-cyan-500/30">{user.Department || 'General'}</span> Department
                    </p>
                </div>

                <Link to="/new-complaint" className="relative z-10 group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95 border border-white/10">
                    <div className="bg-white/20 p-1 rounded-full"><Plus size={18} className="group-hover:rotate-90 transition-transform" /></div>
                    <span>New Ticket</span>
                </Link>
            </div>

            {/* Stats Grid - VIBRANT GRADIENTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={AlertCircle}
                    title="Open Cases"
                    value={stats.open}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600 border border-orange-400/30"
                    delay={0.1}
                />
                <StatCard
                    icon={CheckCircle}
                    title="Resolved"
                    value={stats.resolved}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-400/30"
                    delay={0.2}
                />
                <StatCard
                    icon={Clock}
                    title="Delayed (>24h)"
                    value={stats.delayed}
                    gradient="bg-gradient-to-br from-red-500 to-rose-600 border border-red-400/30"
                    delay={0.3}
                />
                <StatCard
                    icon={History}
                    title="Total History"
                    value={stats.total}
                    gradient="bg-gradient-to-br from-indigo-500 to-violet-600 border border-indigo-400/30"
                    delay={0.4}
                />
            </div>

            {/* Complaint Feed */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Activity size={24} className="text-cyan-400" />
                    <h3 className="text-2xl font-bold text-white tracking-wide">Live Activity Feed</h3>
                </div>
                <ComplaintList />
            </div>
        </div>
    );
};

export default Dashboard;
