import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Search, Calendar, Hash, X, Building2, User, ArrowRight, RefreshCw, Star, BarChart3, TrendingUp, ChevronRight } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

const PerformanceWidget = ({ complaints, user }) => {
    const stats = useMemo(() => {
        const role = String(user?.Role || '').toLowerCase();
        const username = String(user?.Username || '').toLowerCase();

        // 1. Calculate MY Stats (as Resolver)
        const myResolved = complaints.filter(c =>
            String(c.ResolvedBy || '').toLowerCase() === username &&
            (String(c.Status || '').toLowerCase() === 'closed' || String(c.Status || '').toLowerCase() === 'solved')
        );

        let totalDays = 0;
        let ratedCount = 0;
        let totalRating = 0;

        myResolved.forEach(c => {
            const openDate = new Date(c.Date);
            const closeDate = new Date(c.ResolvedDate);
            if (!isNaN(openDate) && !isNaN(closeDate)) {
                const diffTime = Math.max(0, closeDate - openDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                totalDays += diffDays;
            }
            const r = Number(c.Rating);
            if (r > 0) {
                totalRating += r;
                ratedCount++;
            }
        });

        const avgDays = myResolved.length ? (totalDays / myResolved.length).toFixed(1) : '0';
        const avgRating = ratedCount ? (totalRating / ratedCount).toFixed(1) : '-';
        const efficiency = myResolved.length ? Math.min(100, Math.max(0, (1 / (totalDays / myResolved.length || 1)) * 100)).toFixed(0) : '0';

        return { myResolvedCount: myResolved.length, avgDays, avgRating, efficiency };
    }, [complaints, user]);

    if ((user?.Role || '').toLowerCase() === 'admin') return null;

    return (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Impact</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black text-slate-800">{stats.myResolvedCount}</h3>
                    <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Solved</div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Speed</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black text-slate-800">{stats.avgDays}<span className="text-sm text-slate-400 ml-1">days</span></h3>
                    <Clock size={16} className="text-slate-300 mb-1" />
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quality Score</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black text-slate-800 flex items-center gap-1">
                        {stats.avgRating} <Star size={18} className="text-amber-400 fill-amber-400" />
                    </h3>
                </div>
            </div>
            <div className="bg-emerald-950 p-5 rounded-2xl border border-emerald-900 shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Efficiency Rank</p>
                <h3 className="text-3xl font-black relative z-10">{stats.efficiency}%</h3>
            </div>
        </div>
    );
};

// --- ENTERPRISE ROW COMPONENT (Desktop) ---
const ComplaintRow = memo(({ complaint, onClick }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Open': return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 rounded-full';
            case 'Solved':
            case 'Closed': return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 rounded-full';
            case 'Transferred': return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 rounded-full';
            default: return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10 rounded-full';
        }
    };

    return (
        <tr
            onClick={() => onClick(complaint)}
            className="group border-b border-slate-50 hover:bg-emerald-50/40 transition-colors cursor-pointer"
        >
            <td className="p-4 py-3">
                <span className="font-mono text-xs font-bold text-slate-500">#{complaint.ID}</span>
            </td>
            <td className="p-4 py-3">
                <div className="flex flex-col">
                    <span className="font-black text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors tracking-tight">
                        {complaint.Description}
                    </span>
                    <span className="text-[10px] text-slate-400 md:hidden">{new Date(complaint.Date).toLocaleDateString()}</span>
                </div>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {complaint.Department}
                </span>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-xs font-medium text-slate-500">{complaint.Unit}</span>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-xs font-mono text-slate-400">{new Date(complaint.Date).toLocaleDateString()}</span>
            </td>
            <td className="p-4 py-3 text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${getStatusStyle(complaint.Status)}`}>
                    {complaint.Status}
                </span>
            </td>
            <td className="p-4 py-3 text-right w-10">
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600" />
            </td>
        </tr>
    );
});

// --- ENTERPRISE CARD COMPONENT (Mobile) ---
const ComplaintCard = memo(({ complaint, onClick }) => (
    <div onClick={() => onClick(complaint)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all mb-3">
        <div className="flex justify-between items-start mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${complaint.Status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {complaint.Status}
            </span>
            <span className="text-[10px] font-mono text-slate-400">#{complaint.ID}</span>
        </div>
        <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2">{complaint.Description}</h4>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <Building2 size={12} /> {complaint.Department}
        </div>
    </div>
));

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
    const modalRef = useRef(null);

    useClickOutside(modalRef, () => {
        // Only close if NOT in a sub-action (like rating confirmation) to prevent accidental closes
        if (!actionMode) setDetailModalOpen(false);
    });

    // SCROLL LOCK EFFECT
    useEffect(() => {
        if (detailModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [detailModalOpen]);

    // Deep Linking
    const [searchParams] = useSearchParams();
    const ticketIdParam = searchParams.get('ticketId');

    useEffect(() => {
        if (ticketIdParam && complaints.length > 0) {
            const found = complaints.find(c => String(c.ID) === String(ticketIdParam));
            if (found) {
                openDetailModal(found);
            }
        }
    }, [ticketIdParam, complaints.length]);

    const [remark, setRemark] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // IMMUTABLE RATING LOGIC
    const [immutableRatings, setImmutableRatings] = useState([]);

    useEffect(() => { loadComplaints(); }, []);

    const loadComplaints = async () => {
        try {
            const [complaintsData, ratingsData] = await Promise.all([
                sheetsService.getComplaints(true),
                sheetsService.getRatings(true)
            ]);

            const ratingMap = new Map();
            (ratingsData || []).forEach(r => {
                const key = String(r.ID || r['Ticket ID'] || '').toLowerCase();
                ratingMap.set(key, r.Rating);
            });

            // Merge Ledger Ratings into Complaints
            const mergedComplaints = complaintsData.map(c => {
                const key = String(c.ID).toLowerCase();
                const ledgerRating = ratingMap.get(key);
                return {
                    ...c,
                    Rating: c.Rating || ledgerRating || '' // Prefer local, then ledger
                };
            });

            setComplaints(mergedComplaints);
            setImmutableRatings(ratingsData || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const hasImmutableRating = (ticketId) => {
        if (!ticketId) return false;
        const local = complaints.find(c => String(c.ID) === String(ticketId))?.Rating;
        if (local) return true;
        const tid = String(ticketId || '').toLowerCase();
        return immutableRatings.some(r => String(r.ID || r['Ticket ID'] || '').toLowerCase() === tid);
    };

    const getImmutableRatingValue = (ticketId) => {
        const tid = String(ticketId || '').toLowerCase();
        const found = immutableRatings.find(r => String(r.ID || r['Ticket ID'] || '').toLowerCase() === tid);
        return found ? found.Rating : null;
    };

    const openDetailModal = (complaint) => {
        const ledgerRating = getImmutableRatingValue(complaint.ID);
        const mergedComplaint = {
            ...complaint,
            Rating: complaint.Rating || ledgerRating,
        };
        setSelectedComplaint(mergedComplaint);
        setActionMode(null);
        setRemark('');
        setTargetDate('');
        setRating(0);
        setDetailModalOpen(true);
    };

    const canReopen = (complaint) => {
        const resolvedDateStr = complaint.ResolvedDate || complaint.Date;
        if (!resolvedDateStr) return true;
        const resolvedTime = new Date(resolvedDateStr).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - resolvedTime) / (1000 * 60 * 60);
        return hoursDiff <= 24;
    };

    const DEPARTMENTS = [
        'IT', 'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
        'HOUSE KEEPING', 'MAINTENANCE', 'MARKETING', 'DOCTOR', 'ADMIN',
        'BILLING', 'FRONT OFFICE', 'STORE', 'LAB', 'NURSING', 'SECURITY', 'CCTV', 'OT', 'ICU', 'NICU', 'PICU', 'RADIOLOGY'
    ];

    const [transferDept, setTransferDept] = useState('');
    const [transferReason, setTransferReason] = useState('');

    const handleConfirmAction = async () => {
        if (!selectedComplaint || !actionMode) return;
        const ticketId = selectedComplaint.ID;
        if (!ticketId) return alert("Error: Ticket ID is missing.");

        const previousComplaints = [...complaints];
        const optimisticStatus = (actionMode === 'Resolve' || actionMode === 'Close' || actionMode === 'Rate' || actionMode === 'Force Close') ?
            (actionMode === 'Force Close' ? 'Force Close' : 'Closed') :
            (actionMode === 'Re-open' ? 'Open' : (actionMode === 'Transfer' ? 'Transferred' : selectedComplaint.Status));

        setComplaints(prev => prev.map(c => {
            if (c.ID === ticketId) {
                return {
                    ...c,
                    Status: optimisticStatus,
                    Rating: actionMode === 'Rate' ? rating : c.Rating,
                    Remark: (actionMode === 'Transfer' ? transferReason : remark) || c.Remark,
                    Department: actionMode === 'Transfer' ? transferDept : c.Department
                };
            }
            return c;
        }));

        setIsSubmitting(true);
        try {
            if (actionMode === 'Transfer') {
                await sheetsService.transferComplaint(
                    ticketId,
                    transferDept,
                    '',
                    transferReason,
                    user.Username
                );
            } else {
                let newStatus = selectedComplaint.Status;
                if (actionMode === 'Resolve' || actionMode === 'Close' || actionMode === 'Rate' || actionMode === 'Force Close') {
                    newStatus = actionMode === 'Force Close' ? 'Force Close' : 'Closed';
                }
                if (actionMode === 'Extend') newStatus = 'Extend';
                if (actionMode === 'Re-open') newStatus = 'Open';

                await sheetsService.updateComplaintStatus(ticketId, newStatus, user.Username, remark, targetDate, rating);
            }

            setActionMode(null);
            setRemark('');
            setRating(0);
            setTargetDate('');
            setTransferDept('');
            setTransferReason('');
            setSelectedComplaint(null);
            setDetailModalOpen(false);
            setShowSuccess(true);
            setTimeout(() => { loadComplaints(); }, 600);

        } catch (error) {
            console.error(error);
            alert("Failed to perform action.");
            setComplaints(previousComplaints);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredComplaints = useMemo(() => {
        let result = complaints;
        if (onlyMyComplaints) {
            result = result.filter(c => String(c.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase());
        } else {
            if (user.Role === 'admin') {
            } else {
                const myDept = String(user.Department || '').toLowerCase();
                const myUsername = String(user.Username || '').toLowerCase();
                result = result.filter(c =>
                    String(c.Department || '').toLowerCase() === myDept ||
                    String(c.ReportedBy || '').toLowerCase() === myUsername
                );
            }
        }

        if (filter !== 'All') {
            result = result.filter(c => (c.Status || 'Open') === filter);
        }

        if (searchTerm) {
            const lowerSearch = String(searchTerm).toLowerCase();
            result = result.filter(c =>
                String(c.id || c.ID || '').toLowerCase().includes(lowerSearch) ||
                String(c.Description || '').toLowerCase().includes(lowerSearch) ||
                String(c.Department || '').toLowerCase().includes(lowerSearch) ||
                String(c.ReportedBy || '').toLowerCase().includes(lowerSearch)
            );
        }

        return result.sort((a, b) => {
            if (a.Status === 'Open' && b.Status !== 'Open') return -1;
            if (a.Status !== 'Open' && b.Status === 'Open') return 1;
            const dateA = new Date(a.Date);
            const dateB = new Date(b.Date);
            return dateB - dateA;
        });
    }, [complaints, filter, searchTerm, user, onlyMyComplaints]);

    return (
        <div className="max-w-7xl mx-auto px-4 pb-32">
            <PerformanceWidget complaints={complaints} user={user} />

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 sticky top-4 z-20 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-xl">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Database</h2>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-bold">{filteredComplaints.length} Records</span>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by ID, Dept, or Name..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => { setLoading(true); loadComplaints(); }}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all active:scale-95 shadow-sm"
                            title="Update Data"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 p-2 bg-slate-50/50 overflow-x-auto no-scrollbar">
                    {['All', 'Open', 'Solved', 'Closed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === f
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-1 ring-black/5'
                                : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="h-4 w-3/4 bg-slate-200 rounded mb-4"></div>
                    <div className="h-4 w-2/3 bg-slate-200 rounded mb-4"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                </div>
            ) : filteredComplaints.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <CheckCircle size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">All systems operational</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">No tickets match current filters.</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">ID</th>
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Dept</th>
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Unit</th>
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Date</th>
                                    <th className="p-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right w-24">Status</th>
                                    <th className="p-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredComplaints.map(complaint => (
                                    <ComplaintRow
                                        key={complaint.ID}
                                        complaint={complaint}
                                        onClick={openDetailModal}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden">
                        {filteredComplaints.map(complaint => (
                            <ComplaintCard
                                key={complaint.ID}
                                complaint={complaint}
                                onClick={openDetailModal}
                            />
                        ))}
                    </div>
                </div>
            )}

            {detailModalOpen && selectedComplaint && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div ref={modalRef} className="bg-white w-full max-w-2xl my-auto rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/20">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded">#{selectedComplaint.ID}</span>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded border ${String(selectedComplaint.Status).toLowerCase() === 'open' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {String(selectedComplaint.Status).toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedComplaint.Description}</h2>
                            </div>
                            <button onClick={() => setDetailModalOpen(false)} className="p-3 bg-white hover:bg-slate-100 rounded-full transition-colors border border-slate-200 shadow-sm active:scale-95 group">
                                <X size={24} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                            {/* Key Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Building2 size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Department</span>
                                    </div>
                                    <p className="font-bold text-slate-700">{selectedComplaint.Department}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Building2 size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Unit</span>
                                    </div>
                                    <p className="font-bold text-slate-700">{selectedComplaint.Unit}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Date Reported</span>
                                    </div>
                                    <p className="font-bold text-slate-700">{new Date(selectedComplaint.Date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <User size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Reporter</span>
                                    </div>
                                    <p className="font-bold text-slate-700">{selectedComplaint.ReportedBy}</p>
                                </div>
                            </div>

                            {/* Timeline / History */}
                            {selectedComplaint.History && (
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <RefreshCw size={14} className="animate-spin-slow" /> Activity Timeline
                                    </h4>
                                    <div className="space-y-4 pl-2 border-l-2 border-slate-100 ml-2">
                                        {String(selectedComplaint.History).split('\n').filter(Boolean).map((log, i) => (
                                            <div key={i} className="relative pl-6 pb-2">
                                                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-slate-200"></div>
                                                <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-r-xl rounded-bl-xl border border-slate-100/50">
                                                    {log}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution Info */}
                            {selectedComplaint.ResolvedBy && (
                                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <CheckCircle size={14} /> Resolution Details
                                    </h4>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Solved By</p>
                                            <p className="font-black text-slate-800">{selectedComplaint.ResolvedBy}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Date</p>
                                            <p className="font-black text-slate-800">{new Date(selectedComplaint.ResolvedDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {selectedComplaint.Remark && (
                                        <div className="mt-4 pt-4 border-t border-emerald-100/50">
                                            <p className="text-xs text-emerald-700/80 font-medium italic">"{selectedComplaint.Remark}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10 glass-safe-bottom">
                            {actionMode && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200 max-w-lg mx-auto w-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                            {actionMode === 'Rate' ? 'Rate Service Quality' :
                                                actionMode === 'Resolve' ? 'Mark as Resolved' :
                                                    actionMode === 'Close' ? 'Finalize & Close Ticket' :
                                                        actionMode === 'Force Close' ? 'Force Close Ticket' :
                                                            actionMode}
                                        </h4>
                                        <button onClick={() => setActionMode(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                                    </div>
                                    {/* Action Mode Content */}
                                    {actionMode === 'Rate' && (
                                        <div className="mb-6 bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50 flex flex-col items-center justify-center">
                                            <p className="text-xs font-black text-amber-600/60 uppercase tracking-widest mb-4">Click to Rate</p>
                                            <div className="flex gap-3 mb-2" onMouseLeave={() => setHoverRating(0)}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setRating(star)}
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        className="transition-all hover:scale-125 focus:outline-none"
                                                    >
                                                        <Star
                                                            size={42}
                                                            className={`transition-colors duration-200 drop-shadow-sm ${(hoverRating || rating) >= star ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="h-4 text-xs font-bold text-amber-600 transition-opacity duration-300">
                                                {(hoverRating || rating) > 0 ? (['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][(hoverRating || rating) - 1]) : ''}
                                            </p>
                                        </div>
                                    )}
                                    {actionMode === 'Extend' && (
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select New Date</label>
                                            <input type="date" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                                        </div>
                                    )}
                                    {actionMode === 'Transfer' && (
                                        <div className="mb-4 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Transfer To Department</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 appearance-none"
                                                        value={transferDept}
                                                        onChange={e => setTransferDept(e.target.value)}
                                                    >
                                                        <option value="">Select Target Department...</option>
                                                        {DEPARTMENTS.sort().map(d => (
                                                            <option key={d} value={d}>{d}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight className="absolute right-4 top-3.5 text-slate-400 rotate-90 pointer-events-none" size={16} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reason for Transfer</label>
                                                <textarea
                                                    className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400 bg-slate-50"
                                                    placeholder="Why is this case being transferred?"
                                                    value={transferReason}
                                                    onChange={e => setTransferReason(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {actionMode !== 'Rate' && actionMode !== 'Transfer' && (
                                        <div className="relative">
                                            <textarea
                                                className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400 bg-slate-50 focus:bg-white"
                                                placeholder="Reason for this action..."
                                                value={remark}
                                                onChange={e => setRemark(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <div className="mt-6">
                                        <button
                                            onClick={handleConfirmAction}
                                            disabled={isSubmitting || (actionMode === 'Rate' && rating === 0) || (actionMode === 'Transfer' && (!transferDept || !transferReason))}
                                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <>Processing...</> : <>Confirm {actionMode}</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!actionMode && (
                                <div className="flex flex-wrap gap-2">
                                    {(String(selectedComplaint.Status).toLowerCase() === 'open' || String(selectedComplaint.Status).toLowerCase() === 'transferred') &&
                                        (user.Role === 'admin' || String(user.Department || '').toLowerCase() === String(selectedComplaint.Department || '').toLowerCase()) && (
                                            <>
                                                <button onClick={() => setActionMode('Resolve')} className="flex-1 py-3 bg-emerald-700 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-800 hover:-translate-y-0.5 transition-all">Mark as Resolved</button>
                                                <button onClick={() => setActionMode('Extend')} className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">Extend</button>
                                                <button onClick={() => setActionMode('Transfer')} className="w-full py-3 mt-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm">Transfer to Another Dept</button>
                                            </>
                                        )}
                                    {String(selectedComplaint.Status).toLowerCase() === 'closed' && !selectedComplaint.Rating && !hasImmutableRating(selectedComplaint.ID) && String(selectedComplaint.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase() && (
                                        <button onClick={() => setActionMode('Rate')} className="flex-1 py-4 bg-emerald-800 text-white font-black rounded-xl hover:bg-emerald-900 transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs">Rate This Service</button>
                                    )}
                                    {String(selectedComplaint.Status).toLowerCase() === 'closed' && canReopen(selectedComplaint) && String(selectedComplaint.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase() && (
                                        <button onClick={() => setActionMode('Re-open')} className="flex-1 py-3 bg-white text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-50 transition-all shadow-sm">Re-open Ticket</button>
                                    )}
                                    {user.Role === 'admin' && selectedComplaint.Status === 'Open' && (
                                        <button onClick={() => setActionMode('Force Close')} className="w-full py-3 mt-2 bg-rose-50 text-rose-600 font-black rounded-xl border border-rose-200 hover:bg-rose-100 transition-all shadow-sm">Force Close (Admin)</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 ${showSuccess ? 'block' : 'hidden'}`}>
                <div className="bg-white p-10 rounded-2xl flex flex-col items-center animate-in zoom-in duration-300 shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="text-emerald-500" size={40} />
                    </div>
                    <h3 className="font-black text-2xl mb-2 text-slate-900 uppercase tracking-tight">System Updated</h3>
                    <p className="text-slate-500 text-sm font-medium mb-8">Verification of ticket changes successful.</p>
                    <button onClick={() => setShowSuccess(false)} className="w-full py-4 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-800 transition-all active:scale-95 uppercase tracking-widest text-xs">Continue</button>
                </div>
            </div>
        </div>
    );
};

export default ComplaintList;
