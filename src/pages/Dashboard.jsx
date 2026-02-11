import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sheetsService } from '../services/googleSheets';
import ComplaintList from '../components/ComplaintList';
import ActiveUsersModal from '../components/ActiveUsersModal';
import DashboardPopup from '../components/DashboardPopup';
import DashboardSkeleton from '../components/DashboardSkeleton'; // Imported
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, Clock, Plus, History, Shield, Users, Share2, Timer, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import DirectorDashboard from '../components/Analytics/DirectorDashboard';
import { useIntelligence } from '../context/IntelligenceContext';

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
    const [loading, setLoading] = useState(true); // Added loading state
    const [reopenedTickets, setReopenedTickets] = useState([]);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showActiveStaffModal, setShowActiveStaffModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // For click-to-filter
    const { stressIndex, crisisRisk } = useIntelligence();

    // Popup State
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupCategory, setPopupCategory] = useState('');
    const [popupItems, setPopupItems] = useState([]);
    const [trackTicket, setTrackTicket] = useState(null);


    const isSuperAdmin = user?.Role === 'SUPER_ADMIN';
    const isAdmin = user?.Role?.toLowerCase() === 'admin' || isSuperAdmin;

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        setLoading(true);
        try {
            const [statsData, usersData] = await Promise.all([
                sheetsService.getDashboardStats(user.Username, user.Department, user.Role),
                isAdmin ? sheetsService.getUsers() : Promise.resolve([])
            ]);

            // ADMIN VISIBILITY FIX: Pass correct dept
            const deptFilter = isAdmin ? '' : user.Department;

            setStats({
                ...statsData,
                activeStaff: isAdmin ? usersData.filter(u => String(u.Status).toLowerCase() === 'active').length : 0
            });

            // Check for Re-opened tickets (For User/Staff) - Fetch first page of open tickets assigned to me
            if (!isAdmin) {
                const openRes = await sheetsService.getComplaintsPaginated(1, 10, '', 'Open', '', '', user.Username, user.Username, user.Role, user.Department, true);
                if (openRes && openRes.items && openRes.items.length > 0) {
                    setReopenedTickets(openRes.items);
                    setShowReopenModal(true);
                }
            }
        } catch (err) {
            console.error("Dashboard Stats Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = async (type) => {
        if (type === 'Active Staff') {
            setShowActiveStaffModal(true);
        } else {
            // Load Category Data on Click
            try {
                const res = await sheetsService.getComplaintsPaginated(
                    1, 100, // Show up to 100 in quick popup
                    '', // Filter by dept if not admin (REMOVED - rely on backend security)
                    type,
                    '',
                    '',
                    '',
                    user.Username, user.Role, user.Department
                );
                setPopupItems(res.items || []);
                setPopupCategory(type);
                setPopupOpen(true);
            } catch (err) {
                console.error("Popup data fetch error", err);
            }
        }
    };

    const StatCard = ({ icon: Icon, title, value, colorClass, bgClass, borderClass, delay, filterType }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            onClick={() => handleCardClick(filterType)}
            className={`flex flex-col justify-between p-4 md:p-6 rounded-2xl bg-white border cursor-pointer relative overflow-hidden group 
                ${activeFilter === filterType && filterType !== 'Active Staff' ? 'ring-2 ring-offset-2 ring-orange-500 shadow-lg' : 'border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)]'} 
                hover:shadow-lg transition-all active:scale-[0.98]`}
        >
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon size={48} className="md:w-16 md:h-16" />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className={`p-2 md:p-2.5 rounded-xl ${bgClass} ${colorClass}`}>
                    <Icon size={18} className="md:w-[22px] md:h-[22px]" />
                </div>
                {activeFilter === filterType && filterType !== 'Active Staff' && (
                    <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in">Active</div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none mt-3 md:mt-4">{value}</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wide mt-1 uppercase">{title}</p>
            </div>
        </motion.div>
    );

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="w-full max-w-full overflow-x-hidden md:px-0 space-y-6 md:space-y-8 pb-10">
            <ActiveUsersModal

                isOpen={showActiveStaffModal}
                onClose={() => setShowActiveStaffModal(false)}
            />

            <DashboardPopup
                isOpen={popupOpen}
                onClose={() => setPopupOpen(false)}
                title={popupCategory}
                complaints={popupItems}
                onTrack={(ticket) => {
                    setPopupOpen(false); // Close list popup
                    setTrackTicket(ticket); // Trigger main list to open details
                }}
            />

            {/* Re-open Alert Warning */}
            {user?.Username === 'AM Sir' && <DirectorDashboard />}

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

            {/* AI Hospital Stress Index - New Section */}
            <div className={`p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-all duration-500 bg-white
                ${stressIndex > 70 ? 'border-rose-200' : stressIndex > 40 ? 'border-amber-200' : 'border-emerald-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${stressIndex > 70 ? 'bg-rose-50 text-rose-500' : stressIndex > 40 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <Activity size={32} className={stressIndex > 70 ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hospital Stress Index</h2>
                        <p className="text-2xl font-black text-slate-800 tracking-tight">System Pressure: {stressIndex}%</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-2/3">
                    <div className="flex-grow h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 shadow-sm
                                ${stressIndex > 70 ? 'bg-rose-500' : stressIndex > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${stressIndex}%` }}
                        />
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 whitespace-nowrap
                        ${stressIndex > 70 ? 'bg-rose-50 text-rose-600 border-rose-100' : stressIndex > 40 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        Risk: {crisisRisk}
                    </div>
                </div>
            </div>

            {/* Active Filter & Stats Grid */}
            <div className="space-y-4">
                {activeFilter !== 'All' && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 animate-in fade-in slide-in-from-left-2">
                        <Filter size={16} className="text-orange-500" />
                        Filtering view by: <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{activeFilter}</span>
                        <button onClick={() => setActiveFilter('All')} className="ml-2 text-xs text-slate-400 hover:text-slate-600 underline">Clear Filter</button>
                    </div>
                )}

                {/* Stats Grid - Responsive Update */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    <StatCard icon={AlertCircle} title="Open" value={stats.open} bgClass="bg-amber-100" colorClass="text-amber-700" delay={0} filterType="Open" />

                    <StatCard icon={Timer} title="Pending" value={stats.pending} bgClass="bg-sky-100" colorClass="text-sky-700" delay={0.05} filterType="Pending" />

                    <StatCard icon={CheckCircle} title="Solved" value={stats.solved} bgClass="bg-emerald-100" colorClass="text-emerald-700" delay={0.1} filterType="Solved" />

                    <StatCard icon={Share2} title="Transferred" value={stats.transferred} bgClass="bg-purple-100" colorClass="text-purple-700" delay={0.15} filterType="Transferred" />

                    {isAdmin ? (
                        <>
                            {/* Admin sees Active Staff AND Delayed/Extended overview if needed, but per request: Super Admin needs Delayed */}
                            <StatCard icon={Users} title="Active Staff" value={stats.activeStaff} bgClass="bg-slate-100" colorClass="text-slate-700" delay={0.2} filterType="Active Staff" />
                            {isSuperAdmin && (
                                <StatCard icon={Clock} title="Delayed" value={stats.delayed} bgClass="bg-rose-100" colorClass="text-rose-700" delay={0.25} filterType="Delayed" />
                            )}
                        </>
                    ) : (
                        <>
                            <StatCard icon={History} title="Extended" value={stats.extended} bgClass="bg-blue-100" colorClass="text-blue-700" delay={0.2} filterType="Extended" />
                            <StatCard icon={Clock} title="Delayed" value={stats.delayed} bgClass="bg-rose-100" colorClass="text-rose-700" delay={0.25} filterType="Delayed" />
                        </>
                    )}
                </div>
            </div>

            {/* List Container */}
            <div className="mt-4 md:mt-8">
                {/* We pass trackTicket to ComplaintList. ComplaintList will need to watch this prop and open modal if changed */}
                <ComplaintList initialFilter={activeFilter} autoOpenTicket={trackTicket} onAutoOpenComplete={() => setTrackTicket(null)} />
            </div>
        </div>
    );
};

export default Dashboard;
