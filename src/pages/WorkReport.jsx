import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import ComplaintList from '../components/ComplaintList';
import {
    BarChart3, Users, Star, Search, ArrowRight,
    TrendingUp, Clock, Shield, Building2, Phone, Briefcase, AlertTriangle
} from 'lucide-react';

const WorkReport = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [performanceData, setPerformanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, perfData] = await Promise.all([
                sheetsService.getUsers(),
                sheetsService.getAllUserPerformance(true)
            ]);
            setUsers(usersData);
            setPerformanceData(perfData);
        } catch (err) {
            console.error("Failed to load report data", err);
        } finally {
            setLoading(false);
        }
    };

    // Merge User Data with Performance Metrics
    const userMetrics = useMemo(() => {
        if (!Array.isArray(users)) return [];

        return users.map(u => {
            const username = String(u.Username || '').trim();
            // Find stats in performance data (case-insensitive match)
            const stats = performanceData.find(p => String(p.Username || '').toLowerCase() === username.toLowerCase()) || {};

            return {
                ...u,
                stats: {
                    resolved: parseInt(stats.SolvedCount || 0),
                    avgRating: parseFloat(stats.AvgRating || '0.0').toFixed(1),
                    ratingCount: parseInt(stats.RatingCount || 0),
                    avgSpeed: parseFloat(stats.AvgSpeedHours || 0),
                    efficiency: parseFloat(stats.EfficiencyScore || 0),
                    delayed: parseInt(stats.DelayCount || 0),
                    total: parseInt(stats.TotalCases || 0),
                    breakdown: {
                        5: parseInt(stats.R5 || 0),
                        4: parseInt(stats.R4 || 0),
                        3: parseInt(stats.R3 || 0),
                        2: parseInt(stats.R2 || 0),
                        1: parseInt(stats.R1 || 0)
                    }
                }
            };
        });
    }, [users, performanceData]);

    const filteredUsers = useMemo(() => {
        const list = userMetrics.filter(u => {
            const username = (u.Username || '').toLowerCase().trim();
            const search = String(searchTerm).toLowerCase();
            return username.includes(search) ||
                String(u.Department || '').toLowerCase().includes(search);
        });

        // Sort by efficiency once here to ensure stable ranking and display
        return list.sort((a, b) => (b.stats?.efficiency || 0) - (a.stats?.efficiency || 0));
    }, [userMetrics, searchTerm]);

    // Pagination State
    const [page, setPage] = useState(1);
    const pageSize = 12; // Grid 3x4

    // Reset page on search
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, page]);

    const totalPages = Math.ceil(filteredUsers.length / pageSize);

    if (loading) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 max-w-7xl mx-auto px-4 py-6 md:py-8">
            {selectedUser ? (
                // --- USER DETAIL VIEW ---
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="p-8 bg-orange-950 text-white flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-emerald-600 hover:border-emerald-500">
                                    <ArrowRight className="rotate-180" size={16} /> Dashboard
                                </button>
                                {selectedUser && (
                                    <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                                        / Back to List
                                    </button>
                                )}
                            </div>
                            <h1 className="text-page-title font-black mb-2">{selectedUser.Username}</h1>
                            <div className="flex flex-wrap gap-4 text-small-info font-bold uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-2"><Building2 size={14} className="text-blue-400" /> {selectedUser.Department}</span>
                                <span className="flex items-center gap-2"><Shield size={14} className="text-purple-400" /> {selectedUser.Role}</span>
                                <span className="flex items-center gap-2"><Phone size={14} className="text-orange-400" /> {selectedUser.Mobile}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-orange-900/50 p-4 rounded-2xl border border-white/10 shadow-inner">
                                <p className="text-label text-orange-400 uppercase mb-1 tracking-widest">Global Rank</p>
                                <div className="text-card-value font-black text-amber-400 flex items-center justify-end gap-2">
                                    #{filteredUsers.findIndex(x => x.Username === selectedUser.Username) + 1}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 -mt-8">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <p className="text-label text-slate-400 uppercase">Solved Cases</p>
                            <p className="text-card-value font-black text-orange-600 mt-1">{selectedUser.stats.resolved}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <p className="text-label text-slate-400 uppercase">Avg Rating</p>
                            <p className="text-card-value font-black text-amber-500 mt-1 flex items-center gap-1">
                                {selectedUser.stats.avgRating} <Star size={18} fill="currentColor" />
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <p className="text-label text-slate-400 uppercase">Avg Speed (Hr)</p>
                            <p className="text-card-value font-black text-blue-600 mt-1">{Number(selectedUser.stats.avgSpeed).toFixed(1)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <p className="text-label text-slate-400 uppercase">Efficiency Score</p>
                            <p className="text-card-value font-black text-emerald-600 mt-1">{Number(selectedUser.stats.efficiency).toFixed(0)}</p>
                        </div>
                    </div>

                    {/* Performance Deep Dive */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8 pt-0">
                        {/* Rating Breakdown */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Star size={16} className="text-amber-400" /> Rating Distribution
                            </h4>
                            <div className="space-y-3">
                                {[5, 4, 3, 2, 1].map(star => {
                                    const count = selectedUser.stats.breakdown[star];
                                    const total = selectedUser.stats.ratingCount || 1;
                                    const pct = (count / total) * 100;
                                    return (
                                        <div key={star} className="flex items-center gap-3 text-xs font-bold">
                                            <span className="w-8 text-right flex items-center justify-end gap-1 text-slate-500">{star} <Star size={10} fill="currentColor" className="text-slate-300" /></span>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                            </div>
                                            <span className="w-6 text-slate-400">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Efficiency Factors */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Factor 1: Delay Impact */}
                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="text-sm font-bold text-rose-800 uppercase">Delayed Cases</h5>
                                    <AlertTriangle size={18} className="text-rose-500" />
                                </div>
                                <p className="text-3xl font-black text-rose-600 mb-1">{selectedUser.stats.delayed}</p>
                                <p className="text-xs text-rose-400 font-medium">Cases exceeding target time. Negatively impacts efficiency score.</p>
                            </div>

                            {/* Factor 2: Speed Score */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="text-sm font-bold text-blue-800 uppercase">Speed Score</h5>
                                    <Clock size={18} className="text-blue-500" />
                                </div>
                                <p className="text-3xl font-black text-blue-600 mb-1">{Math.round((selectedUser.stats.efficiency - ((Number(selectedUser.stats.avgRating) / 5) * 50)) * 2) / 2 || 0}</p>
                                <p className="text-xs text-blue-400 font-medium">Points earned from fast resolution (Target: 24h). 30% Weightage.</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed History Table via ComplaintList */}
                    <div className="p-8 pt-0 min-h-[500px]">
                        <h3 className="font-bold text-section-title text-slate-800 mb-6 flex items-center gap-2">
                            <Briefcase size={24} className="text-slate-400" /> Resolution History
                        </h3>
                        {/* Reuse ComplaintList with Custom Resolver Filter */}
                        <ComplaintList
                            customResolver={selectedUser.Username}
                            initialFilter="Solved" // Show all tickets they specifically solved
                        />
                    </div>
                </div>
            ) : (
                // --- MAIN DASHBOARD VIEW ---
                <>
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-8 bg-orange-950 rounded-3xl shadow-sm text-white relative overflow-hidden ring-1 ring-white/10">
                        <div className="relative z-10">
                            <span className="bg-orange-800 px-3 py-1 rounded-full text-small-info font-black uppercase tracking-widest border border-orange-700/50 mb-3 inline-block">Staff Analytics Console</span>
                            <h1 className="text-page-title font-black mb-2">Work Report & Analytics</h1>
                            <p className="text-table-data text-orange-300/60 font-medium max-w-lg">Monitor staff performance, track resolution times, and analyze user efficiency.</p>
                        </div>
                        <div className="relative z-10 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-orange-400" size={20} />
                                <input
                                    className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 font-bold focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 outline-none w-full md:w-64 transition-all"
                                    placeholder="Search User..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <BarChart3 className="absolute right-0 bottom-0 text-white/5 w-64 h-64 -mr-10 -mb-10 rotate-12" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedUsers.map((u, i) => (
                            <div
                                key={u.Username || i}
                                onClick={() => setSelectedUser(u)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-700 group-hover:text-white transition-all shadow-inner group-hover:shadow-orange-200">
                                        <Users size={24} />
                                    </div>
                                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                        <TrendingUp size={14} className="text-amber-400" />
                                        <span className="text-xs font-black text-amber-700">#{(page - 1) * pageSize + i + 1}</span>
                                    </div>
                                </div>
                                <h3 className="font-black text-lg text-slate-800 group-hover:text-orange-700 transition-colors mb-1 tracking-tight">{u.Username}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{u.Role} • {u.Department}</p>

                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Solved</p>
                                        <p className="font-black text-slate-800">{u.stats.resolved}</p>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rating</p>
                                        <p className="font-black text-amber-500">{u.stats.avgRating}</p>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Score</p>
                                        <p className="font-black text-emerald-600">{Number(u.stats.efficiency).toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors border border-transparent hover:border-slate-200"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WorkReport;
