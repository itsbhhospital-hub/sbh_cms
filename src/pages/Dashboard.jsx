import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sheetsService } from '../services/googleSheets';
import ComplaintList from '../components/ComplaintList';
import ActiveUsersModal from '../components/ActiveUsersModal';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, Clock, Plus, History, Shield, Users, Share2, Timer, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        open: 0,
        pending: 0,
        solved: 0,
        transferred: 0,
        extended: 0,
        delayed: 0,
        activeStaff: 0
    });
    const [reopenedTickets, setReopenedTickets] = useState([]);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showActiveStaffModal, setShowActiveStaffModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // For click-to-filter

    const isSuperAdmin = user?.Role === 'SUPER_ADMIN';
    const isAdmin = user?.Role?.toLowerCase() === 'admin' || isSuperAdmin;

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        const [complaintsData, usersData, extensionData] = await Promise.all([
            sheetsService.getComplaints(),
            isAdmin ? sheetsService.getUsers() : Promise.resolve([]),
            sheetsService.getExtensionLogs()
        ]);

        const username = (user.Username || '').toLowerCase().trim();
        const userDept = (user.Department || '').toLowerCase().trim();

        // 1. Filter Relevant Complaints based on Role
        const relevant = complaintsData.filter(c => {
            if (isAdmin) return true; // Admin sees all

            // User sees own Department OR Reported by them
            const cDept = (c.Department || '').toLowerCase().trim();
            const cReportedBy = (c.ReportedBy || '').toLowerCase().trim();
            return cDept === userDept || cReportedBy === username;
        });

        // 2. Data Counting Logic
        // Open: Status is explicitly 'Open'
        const open = relevant.filter(c => (c.Status || '').trim().toLowerCase() === 'open').length;

        // Pending: Status is 'Pending' or 'In-Progress'
        const pending = relevant.filter(c => {
            const s = (c.Status || '').trim().toLowerCase();
            return s === 'pending' || s === 'in-progress';
        }).length;

        // Solved: Status is 'Resolved' or 'Closed'
        const solved = relevant.filter(c => {
            const s = (c.Status || '').trim().toLowerCase();
            return s === 'resolved' || s === 'solved' || s === 'closed';
        }).length;

        // Transferred: Status is 'Transferred'
        const transferred = relevant.filter(c => (c.Status || '').trim().toLowerCase() === 'transferred').length;

        // Extended: Logic - Check extended_flag OR if ID exists in extension logs
        const extended = relevant.filter(c => {
            // Check if status is Extended (if used) OR flag exists
            const s = (c.Status || '').trim().toLowerCase();
            if (s === 'extended' || s === 'extend') return true;

            // Check cross-reference with logs if needed (optional optimization)
            const hasLog = extensionData.some(log => String(log.ComplaintID) === String(c.ID));
            return hasLog;
        }).length;

        // Delayed: TargetDate < Today AND Status is NOT Solved/Closed
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const delayed = relevant.filter(c => {
            const s = (c.Status || '').trim().toLowerCase();
            if (s === 'solved' || s === 'closed' || s === 'resolved') return false;

            if (!c.TargetDate) return false;
            const target = new Date(c.TargetDate);
            return target < now;
        }).length;

        // Active Staff (Admin Only)
        const activeStaff = isAdmin ? usersData.filter(u => u.Status === 'Active').length : 0;

        setStats({ open, pending, solved, transferred, extended, delayed, activeStaff });

        // Check for Re-opened tickets (For User/Staff)
        if (!isAdmin) {
            const reopens = relevant.filter(c =>
                String(c.Status || '').trim().toLowerCase() === 'open' &&
                String(c.ResolvedBy || '').toLowerCase() === username
            );
            if (reopens.length > 0) {
                setReopenedTickets(reopens);
                setShowReopenModal(true);
            }
        }
    };

    const handleCardClick = (filterType) => {
        if (filterType === 'Active Staff' && isAdmin) {
            setShowActiveStaffModal(true);
        } else {
            setActiveFilter(filterType);
        }
    };

    const StatCard = ({ icon: Icon, title, value, colorClass, bgClass, borderClass, delay, filterType }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            onClick={() => handleCardClick(filterType)}
            className={`flex flex-col justify-between p-6 rounded-2xl bg-white border cursor-pointer relative overflow-hidden group 
                ${activeFilter === filterType && filterType !== 'Active Staff' ? 'ring-2 ring-offset-2 ring-orange-500 shadow-lg' : 'border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)]'} 
                hover:shadow-lg transition-all active:scale-[0.98]`}
        >
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon size={64} />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass}`}>
                    <Icon size={22} />
                </div>
                {activeFilter === filterType && filterType !== 'Active Staff' && (
                    <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in">Active</div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-stat-number text-slate-900 leading-none mt-4">{value}</h3>
                <p className="text-label font-bold text-slate-400 tracking-wide mt-1">{title}</p>
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-[100vw] overflow-x-hidden md:max-w-7xl mx-auto md:px-4 px-2 py-4 md:py-8 space-y-6 md:space-y-8 pb-32">
            <ActiveUsersModal
                isOpen={showActiveStaffModal}
                onClose={() => setShowActiveStaffModal(false)}
            />

            {/* Re-open Alert Warning */}
            {showReopenModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-rose-100"
                    >
                        <div className="p-8 text-center relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1 bg-rose-500"></div>
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-100 animate-pulse">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Attention Required</h3>
                            <p className="text-xs font-bold text-rose-600 tracking-wide mb-4">Ticket Re-opened</p>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                                A ticket you previously resolved has been flagged for review by the reporter.
                            </p>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-wrap justify-center gap-2">
                                {reopenedTickets.map(t => (
                                    <span key={t.ID} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-bold shadow-sm">
                                        #{t.ID}
                                    </span>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowReopenModal(false)}
                                className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 active:scale-[0.98]"
                            >
                                Acknowledge Issue
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Enterprise Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 mb-2">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2 md:gap-3">
                        Complaint Management
                        <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-100 text-[10px] md:text-xs font-bold text-orange-600 tracking-wide whitespace-nowrap">
                            Hospital Unit
                        </span>
                    </h1>
                    <p className="text-xs md:text-sm font-bold text-slate-500 mt-1.5 opacity-60 tracking-tight">System Resolution Monitor v4.0</p>
                </div>
                <div className="w-full md:w-auto">
                    <Link to="/new-complaint" className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-rose-600 text-white hover:shadow-xl hover:shadow-orange-500/20 rounded-xl text-sm font-bold tracking-wide shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        <Plus size={16} strokeWidth={3} /> Create Ticket
                    </Link>
                </div>
            </div>

            {/* Filter Status Readout */}
            {activeFilter !== 'All' && (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 animate-in fade-in slide-in-from-left-2">
                    <Filter size={16} className="text-orange-500" />
                    Filtering view by: <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{activeFilter}</span>
                    <button onClick={() => setActiveFilter('All')} className="ml-2 text-xs text-slate-400 hover:text-slate-600 underline">Clear Filter</button>
                </div>
            )}

            {/* Stats Grid - Role Based */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatCard icon={AlertCircle} title="Open" value={stats.open} bgClass="bg-amber-100" colorClass="text-amber-700" delay={0} filterType="Open" />

                {/* Pending Only shown if non-zero or specific logic, but requested to show card */}
                <StatCard icon={Timer} title="Pending" value={stats.pending} bgClass="bg-sky-100" colorClass="text-sky-700" delay={0.05} filterType="Pending" />

                <StatCard icon={CheckCircle} title="Solved" value={stats.solved} bgClass="bg-emerald-100" colorClass="text-emerald-700" delay={0.1} filterType="Solved" />

                <StatCard icon={Share2} title="Transferred" value={stats.transferred} bgClass="bg-purple-100" colorClass="text-purple-700" delay={0.15} filterType="Transferred" />

                {isAdmin ? (
                    // Admin View
                    <StatCard icon={Users} title="Active Staff" value={stats.activeStaff} bgClass="bg-slate-100" colorClass="text-slate-700" delay={0.2} filterType="Active Staff" />
                ) : (
                    // User View - Extended & Delayed
                    <>
                        <StatCard icon={History} title="Extended" value={stats.extended} bgClass="bg-blue-100" colorClass="text-blue-700" delay={0.2} filterType="Extended" />
                        <StatCard icon={Clock} title="Delayed" value={stats.delayed} bgClass="bg-rose-100" colorClass="text-rose-700" delay={0.25} filterType="Delayed" />
                    </>
                )}
            </div>

            {/* List Container - Passing Filter Prop */}
            <div className="mt-4 md:mt-8">
                <ComplaintList initialFilter={activeFilter} key={activeFilter} />
            </div>
        </div>
    );
};

export default Dashboard;
