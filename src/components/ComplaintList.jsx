import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Search, Calendar, Hash, X, Building2, User, ArrowRight, RefreshCw, Star, BarChart3, TrendingUp } from 'lucide-react';

const safeGet = (obj, key) => {
    if (!obj) return '';
    const norm = (s) => String(s || '').toLowerCase().replace(/\s/g, '');
    const target = norm(key);
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];

    const foundKey = Object.keys(obj).find(k => norm(k) === target);
    if (foundKey) return obj[foundKey];

    // Specific handling for 'ID'
    if (target === 'id') {
        const idKey = Object.keys(obj).find(k => {
            const nk = norm(k);
            return nk === 'ticketid' || nk === 'complaintid' || nk === 'tid' || (nk.includes('id') && nk.length < 10);
        });
        if (idKey) return obj[idKey];
    }
    return '';
};

const PerformanceWidget = ({ complaints, user }) => {
    const stats = useMemo(() => {
        const role = (user?.Role || '').toLowerCase();
        const username = (user?.Username || '').toLowerCase();

        // 1. Calculate MY Stats (as Resolver) - Only count CLOSED tickets
        const myResolved = complaints.filter(c =>
            (c.ResolvedBy || '').toLowerCase() === username &&
            (safeGet(c, 'Status').toLowerCase() === 'closed' || safeGet(c, 'Status').toLowerCase() === 'solved')
        );
        const ratedTickets = myResolved.filter(c => c.Rating && c.Rating > 0);
        const totalRating = ratedTickets.reduce((acc, c) => acc + Number(c.Rating), 0);
        const myAvgRating = ratedTickets.length ? (totalRating / ratedTickets.length).toFixed(1) : 'N/A';

        // 2. Admin Leaderboard Data
        const leaderboard = [];
        if (role === 'admin') {
            const resolverMap = {};
            complaints.forEach(c => {
                const r = c.ResolvedBy;
                if (!r) return;
                if (!resolverMap[r]) resolverMap[r] = { name: r, resolved: 0, totalRating: 0, count: 0 };
                resolverMap[r].resolved++;
                if (c.Rating) {
                    resolverMap[r].totalRating += Number(c.Rating);
                    resolverMap[r].count++;
                }
            });
            Object.values(resolverMap).forEach(s => {
                leaderboard.push({
                    name: s.name,
                    resolved: s.resolved,
                    rating: s.count ? (s.totalRating / s.count).toFixed(1) : '-'
                });
            });
            leaderboard.sort((a, b) => b.resolved - a.resolved);
        }

        return { myResolved: myResolved.length, myAvgRating, leaderboard };
    }, [complaints, user]);

    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
            {/* My Performance Card */}
            {/* My Performance Card (Hidden for Super Admin) */}
            {(user?.Role || '').toLowerCase() !== 'admin' && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={60} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">My Performance</h3>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-3xl font-black">{stats.myResolved}</p>
                            <p className="text-xs text-slate-400 font-medium">Tickets Resolved</p>
                        </div>
                        {(user?.Role !== 'user') && (
                            <div>
                                <p className="text-3xl font-black text-amber-400 flex items-center gap-1">
                                    {stats.myAvgRating} <Star size={18} fill="currentColor" />
                                </p>
                                <p className="text-xs text-slate-400 font-medium">Avg Rating</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Admin Stats Trigger */}
            {user?.Role === 'Admin' && (
                <button
                    onClick={() => setShowLeaderboard(true)}
                    className="bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all text-left group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <BarChart3 size={24} />
                        </div>
                        <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                    </div>
                    <h3 className="font-bold text-slate-800">View Team Performance</h3>
                    <p className="text-xs text-slate-500 font-medium">Check ratings & resolution counts</p>
                </button>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={18} /> Team Leaderboard</h3>
                            <button onClick={() => setShowLeaderboard(false)}><X size={20} /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4 text-center">Resolved</th>
                                        <th className="p-4 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.leaderboard.map((s, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-slate-700">{s.name}</td>
                                            <td className="p-4 text-center font-medium">{s.resolved}</td>
                                            <td className="p-4 text-center font-bold text-amber-500 flex justify-center items-center gap-1">
                                                {s.rating} <Star size={12} fill="currentColor" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ComplaintList = ({ onlyMyComplaints = false }) => {
    const { user } = useAuth();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Actions
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [actionMode, setActionMode] = useState(null);

    // Deep Linking
    const [searchParams] = useSearchParams();
    const ticketIdParam = searchParams.get('ticketId');

    useEffect(() => {
        if (ticketIdParam && complaints.length > 0) {
            const found = complaints.find(c => String(safeGet(c, 'ID')) === String(ticketIdParam));
            if (found) {
                // Remove param from URL to prevent reopening on reload (optional, but cleaner UX) (skipping for now to stick to simple req)
                setDetailModalOpen(true);
                setSelectedComplaint(found);
            }
        }
    }, [ticketIdParam, complaints]);
    const [remark, setRemark] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [rating, setRating] = useState(0); // NEW RATING STATE
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => { loadComplaints(); }, []);

    const loadComplaints = async () => {
        try {
            const data = await sheetsService.getComplaints(true);
            setComplaints(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openDetailModal = (complaint) => {
        setSelectedComplaint(complaint);
        setActionMode(null);
        setRemark('');
        setTargetDate('');
        setRating(0); // Reset rating
        setDetailModalOpen(true);
    };

    // --- RE-OPEN CHECK ---
    const canReopen = (complaint) => {
        const resolvedDateStr = safeGet(complaint, 'Resolved Date') || safeGet(complaint, 'Date'); // Fallback
        if (!resolvedDateStr) return true; // Safety
        const resolvedTime = new Date(resolvedDateStr).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - resolvedTime) / (1000 * 60 * 60);
        return hoursDiff <= 24; // Only allow if within 24 hours
    };

    const handleConfirmAction = async () => {
        if (!selectedComplaint || !actionMode) return;
        const ticketId = safeGet(selectedComplaint, 'ID');
        if (!ticketId) return alert("Error: Ticket ID is missing.");

        setIsSubmitting(true);
        try {
            let newStatus = safeGet(selectedComplaint, 'Status');
            if (actionMode === 'Resolve' || actionMode === 'Close' || actionMode === 'Rate') {
                newStatus = 'Closed';
            }
            if (actionMode === 'Extend') newStatus = 'Extend';
            // 'Re-open' logic removed as per simplification request

            await sheetsService.updateComplaintStatus(ticketId, newStatus, user.Username, remark, targetDate, rating);
            setDetailModalOpen(false);
            setShowSuccess(true);
            loadComplaints();
        } catch (error) {
            console.error(error);
            alert("Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredComplaints = useMemo(() => {
        return complaints.filter(c => {
            const role = safeGet(user, 'Role').toLowerCase();
            const userDept = safeGet(user, 'Department').toLowerCase();
            const username = safeGet(user, 'Username').toLowerCase();
            const complaintDept = safeGet(c, 'Department').toLowerCase();
            const reportedBy = safeGet(c, 'ReportedBy').toLowerCase();

            let isVisible = false;
            if (onlyMyComplaints) {
                if (reportedBy === username) isVisible = true;
            } else {
                if (role === 'admin') isVisible = true;
                else if (userDept && complaintDept === userDept) isVisible = true;
                else if (reportedBy === username) isVisible = true;
            }
            if (!isVisible) return false;

            const status = safeGet(c, 'Status');
            if (filter !== 'All' && status !== filter) return false;

            const term = searchTerm.toLowerCase();
            return safeGet(c, 'ID').toLowerCase().includes(term) || safeGet(c, 'Description').toLowerCase().includes(term);
        }).sort((a, b) => new Date(safeGet(b, 'Date')) - new Date(safeGet(a, 'Date')));
    }, [complaints, filter, searchTerm, user, onlyMyComplaints]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Solved':
            case 'Closed': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <PerformanceWidget complaints={complaints} user={user} />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">

                    {/* Filter Tabs */}
                    <div className="flex p-1 bg-slate-100/80 rounded-xl w-full xl:w-auto overflow-x-auto no-scrollbar">
                        {['All', 'Open', 'Closed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-72 group">
                            <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-400"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={loadComplaints}
                            disabled={loading}
                            className={`p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 ${loading ? 'cursor-wait' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="p-4 grid gap-3">
                    {filteredComplaints.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold">No tickets found.</div>
                    ) : (
                        filteredComplaints.map((c, i) => (
                            <div key={i} onClick={() => openDetailModal(c)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadge(safeGet(c, 'Status'))}`}>{safeGet(c, 'Status')}</span>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">#{safeGet(c, 'ID')}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600">{safeGet(c, 'Description')}</h4>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{safeGet(c, 'Department')} • {safeGet(c, 'ReportedBy')} • {safeGet(c, 'Unit')}</p>
                                    </div>
                                    <ArrowRight className="text-slate-300 group-hover:text-blue-500" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* DETAIL MODAL - TICKET JOURNEY REVAMP */}
            {detailModalOpen && selectedComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95">

                        {/* LEFT: TICKET JOURNEY (Timeline) */}
                        <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-100 flex flex-col">
                            <div className="p-6 border-b border-slate-200 bg-white">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 border ${getStatusBadge(safeGet(selectedComplaint, 'Status'))}`}>
                                    {safeGet(selectedComplaint, 'Status')}
                                </span>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Ticket #{safeGet(selectedComplaint, 'ID')}</h1>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={12} /> Opened {new Date(safeGet(selectedComplaint, 'Date')).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 sticky top-0 bg-slate-50 py-2 z-10">Ticket Journey</h4>
                                <div className="space-y-6 relative ml-2">
                                    {/* Vertical Line */}
                                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                                    {/* Creation Node */}
                                    <div className="relative pl-8 group">
                                        <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10 group-hover:scale-125 transition-transform"></div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group-hover:border-blue-200 transition-colors">
                                            <p className="text-xs font-bold text-slate-500 mb-1 flex justify-between">
                                                <span>Ticket Created</span>
                                                <span className="font-mono opacity-50 text-[10px]">{new Date(safeGet(selectedComplaint, 'Date')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                            <p className="text-sm font-medium text-slate-800">
                                                Request by <span className="font-bold text-slate-900">{safeGet(selectedComplaint, 'ReportedBy')}</span> in <span className="text-blue-600">{safeGet(selectedComplaint, 'Department')}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* History Nodes */}
                                    {(safeGet(selectedComplaint, 'History') || '').split('\n').map((log, i) => {
                                        if (log.includes('Ticket Created')) return null; // Skip duplicate creation log if present
                                        const isResolution = log.toLowerCase().includes('resolved') || log.toLowerCase().includes('closed');
                                        const isExtension = log.toLowerCase().includes('extended');

                                        return (
                                            <div key={i} className="relative pl-8 group animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                                                <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 group-hover:scale-125 transition-transform ${isResolution ? 'bg-emerald-500' : isExtension ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                                                <p className="text-[10px] font-bold text-slate-400 mb-1">{log.match(/\[(.*?)\]/)?.[1] || 'Update'}</p>
                                                <p className="text-xs font-medium text-slate-700 bg-white/50 p-2 rounded-lg border border-transparent group-hover:bg-white group-hover:border-slate-200 transition-all">
                                                    {log.split(']').pop().trim()}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: DETAILS & ACTIONS */}
                        <div className="w-full md:w-1/2 flex flex-col bg-white overflow-hidden max-h-[50vh] md:max-h-full">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 size={16} className="text-slate-400" /> Issue Details</h3>
                                <button onClick={() => setDetailModalOpen(false)} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {/* Description Box */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Description</h4>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {safeGet(selectedComplaint, 'Description')}
                                    </p>
                                </div>

                                {/* Meta Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned To</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs"><User size={12} /></div>
                                            <span className="text-xs font-bold text-slate-700">{safeGet(selectedComplaint, 'ResolvedBy') || 'Pending'}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target Date</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={safeGet(selectedComplaint, 'TargetDate') ? "text-slate-600" : "text-slate-300"} />
                                            <span className="text-xs font-bold text-slate-700">{safeGet(selectedComplaint, 'TargetDate') || 'Not Set'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* RESOLUTION REPORT (Gold Card) */}
                                {(safeGet(selectedComplaint, 'Status') === 'Solved' || safeGet(selectedComplaint, 'Status') === 'Closed') && (
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                        <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Star size={12} fill="currentColor" /> Resolution Report</h4>

                                        <div className="flex justify-between items-end mb-3">
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-600/70 uppercase">User Rating</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-3xl font-black text-amber-600">{safeGet(selectedComplaint, 'Rating') || '-'}</span>
                                                    <span className="text-xs font-bold text-amber-600/60 mt-2">/ 5</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} className={i < safeGet(selectedComplaint, 'Rating') ? "text-amber-500 fill-amber-500" : "text-amber-200"} />
                                                ))}
                                            </div>
                                        </div>

                                        {safeGet(selectedComplaint, 'Rating') && (
                                            <div className="bg-white/60 p-3 rounded-xl border border-amber-100/50 backdrop-blur-sm">
                                                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">User Feedback</p>
                                                <p className="text-xs font-medium text-slate-700 italic">"{safeGet(selectedComplaint, 'Remark')}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                {actionMode ? (
                                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-lg animate-in slide-in-from-bottom-2">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            {actionMode === 'Rate' ? 'Rate Service Quality' : (actionMode === 'Resolve' || actionMode === 'Close') ? 'Close Ticket' : actionMode}
                                        </h4>

                                        {actionMode === 'Rate' && (
                                            <div className="mb-4 flex flex-col items-center">
                                                <p className="text-sm font-bold text-slate-500 mb-2">How was the service?</p>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                                                            <Star size={32} className={rating >= star ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {actionMode === 'Extend' && (
                                            <div className="mb-3">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Date</label>
                                                <input type="date" className="w-full p-2 border rounded-lg font-bold" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                                            </div>
                                        )}

                                        <textarea
                                            className="w-full p-3 border rounded-lg text-sm font-medium h-20 resize-none mb-4"
                                            placeholder={actionMode === 'Rate' ? "Any feedback? (Optional)" : "Reason/Remark..."}
                                            value={remark}
                                            onChange={e => setRemark(e.target.value)}
                                        />

                                        <div className="flex gap-2">
                                            <button onClick={() => setActionMode(null)} className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-slate-600">Cancel</button>
                                            <button
                                                onClick={handleConfirmAction}
                                                disabled={isSubmitting || (actionMode === 'Rate' && rating === 0)}
                                                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-black disabled:opacity-50"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {/* Dept/Admin Action: Close (Only for Dept Staff or Admin) */}
                                        {safeGet(selectedComplaint, 'Status') === 'Open' &&
                                            (user.Role === 'admin' || (user.Department || '').toLowerCase() === (safeGet(selectedComplaint, 'Department') || '').toLowerCase()) && (
                                                <>
                                                    <button onClick={() => setActionMode('Resolve')} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all">Close Ticket</button>
                                                    <button onClick={() => setActionMode('Extend')} className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50">Extend</button>
                                                </>
                                            )}

                                        {/* Reporter Action: Rate (Only if Closed and no rating yet) */}
                                        {safeGet(selectedComplaint, 'Status') === 'Closed' &&
                                            !safeGet(selectedComplaint, 'Rating') &&
                                            (safeGet(selectedComplaint, 'ReportedBy') || '').toLowerCase() === (user.Username || '').toLowerCase() && (
                                                <button onClick={() => setActionMode('Rate')} className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-200 animate-pulse hover:shadow-xl transition-all">
                                                    Rate This Service
                                                </button>
                                            )}

                                        {/* Force Close Fallback for Admin */}
                                        {user.Role === 'admin' && safeGet(selectedComplaint, 'Status') === 'Open' && (
                                            <button onClick={() => setActionMode('Close')} className="w-full py-2 text-rose-500 font-bold text-xs hover:bg-rose-50 rounded-lg">Force Close</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm ${showSuccess ? 'block' : 'hidden'}`}>
                <div className="bg-white p-8 rounded-2xl flex flex-col items-center animate-in zoom-in">
                    <CheckCircle className="text-green-500 mb-4" size={48} />
                    <h3 className="font-bold text-xl mb-4">Updated Successfully!</h3>
                    <button onClick={() => setShowSuccess(false)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg">Continue</button>
                </div>
            </div>
        </div>
    );
};

export default ComplaintList;
