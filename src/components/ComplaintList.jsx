import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Search, Calendar, Hash, X, Building2, User, ArrowRight, RefreshCw, Star, BarChart3, TrendingUp, ChevronRight, Plus, Share2, History as HistoryIcon } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import TransferModal from './TransferModal';
import ExtendModal from './ExtendModal';
import ResolveModal from './ResolveModal';
import RateModal from './RateModal';

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

    const role = (user?.Role || '').toUpperCase().trim();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return null;

    return (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-white p-6 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)]">
                <p className="text-label font-black text-slate-400 mb-4">Your Impact</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-card-value text-slate-900 leading-none">{stats.myResolvedCount}</h3>
                    <div className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-small-info font-bold border border-orange-100">Solved</div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)]">
                <p className="text-label font-black text-slate-400 mb-4">Avg Speed</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-card-value text-slate-900 leading-none">{stats.avgDays}<span className="text-sm font-normal text-slate-400 ml-1">days</span></h3>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-400"><Clock size={16} strokeWidth={2.5} /></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)]">
                <p className="text-label font-black uppercase tracking-widest text-slate-400 mb-4">Quality Score</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-card-value text-slate-900 leading-none flex items-center gap-1">
                        {stats.avgRating} <Star size={20} className="text-amber-400 fill-amber-400" />
                    </h3>
                </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={64} /></div>
                <p className="text-label font-black uppercase tracking-widest text-orange-400/80 mb-4">Efficiency Rank</p>
                <h3 className="text-card-value text-white relative z-10 leading-none">{stats.efficiency}%</h3>
            </div>
        </div>
    );
};

// --- ENTERPRISE ROW COMPONENT (Desktop) ---
const ComplaintRow = memo(({ complaint, onClick }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Open': return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
            case 'Solved':
            case 'Closed': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            case 'Transferred': return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20';
            default: return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10';
        }
    };

    return (
        <tr
            onClick={() => onClick(complaint)}
            className="group border-b border-slate-50 hover:bg-orange-50/10 transition-colors cursor-pointer"
        >
            <td className="p-4 py-3">
                <span className="font-mono text-small-info font-bold text-slate-400">#{complaint.ID}</span>
            </td>
            <td className="p-4 py-3">
                <div className="flex flex-col">
                    <span className="text-table-data font-bold text-slate-800 line-clamp-1 group-hover:text-orange-700 transition-colors tracking-tight">
                        {complaint.Description}
                    </span>
                    <span className="text-[10px] text-slate-400 md:hidden font-bold">{new Date(complaint.Date).toLocaleDateString()}</span>
                </div>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-small-info font-bold text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-100/50 tracking-tight">
                    {complaint.Department}
                </span>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-table-data font-bold text-slate-700">{complaint.Unit}</span>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                <span className="text-small-info font-bold text-slate-400 tracking-tight">{new Date(complaint.Date).toLocaleDateString()}</span>
            </td>
            <td className="p-4 py-3 text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-table-header font-black tracking-widest ${getStatusStyle(complaint.Status)}`}>
                    {complaint.Status}
                </span>
            </td>
            <td className="p-4 py-3 text-right w-10">
                <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
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

const ComplaintList = ({ onlyMyComplaints = false, onlySolvedByMe = false, initialFilter = 'All' }) => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(initialFilter); // Initialize with prop
    const [searchTerm, setSearchTerm] = useState('');

    // Update filter when initialFilter changes (from Dashboard click)
    useEffect(() => {
        if (initialFilter) setFilter(initialFilter);
    }, [initialFilter]);

    // ... (Modal & Actions State - unchanged)
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [actionMode, setActionMode] = useState(null);
    const modalRef = useRef(null);

    // ... (Click Outside & Scroll Lock - unchanged) 
    useClickOutside(modalRef, () => {
        if (!actionMode) setDetailModalOpen(false);
    });

    useEffect(() => {
        if (detailModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [detailModalOpen]);

    // ... (Deep Linking & Load Logic - unchanged)
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

    const [successMessage, setSuccessMessage] = useState('Verification of ticket changes successful.');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadComplaints = async (isRefetch = false) => {
        if (!isRefetch) setLoading(true);
        try {
            // Updated to be silent on refetch if needed, but for initial load use spinner
            const data = await sheetsService.getComplaints(true, isRefetch);
            setComplaints(data);
        } catch (error) {
            console.error("Failed to load complaints", error);
        } finally {
            if (!isRefetch) setLoading(false);
        }
    };

    useEffect(() => {
        loadComplaints();
    }, []);

    // ... (Detail Modal Helpers - unchanged)
    const openDetailModal = (complaint) => {
        setSelectedComplaint(complaint);
        setDetailModalOpen(true);
    };

    const hasImmutableRating = (id) => {
        const c = complaints.find(item => item.ID === id);
        return c && c.Rating && Number(c.Rating) > 0;
    };

    const canReopen = (c) => {
        return c.Status === 'Closed' || c.Status === 'Solved' || c.Status === 'Force Close';
    };

    // ... (handleModalConfirm - unchanged)
    const handleModalConfirm = async (action, data) => {
        if (!selectedComplaint) return;
        const ticketId = selectedComplaint.ID;
        if (!ticketId) return alert("Error: Ticket ID is missing.");

        const previousComplaints = [...complaints];

        // Optimistic UI updates could go here...

        // ... (API Calls) ...
        setIsSubmitting(true);
        try {
            if (action === 'Transfer') {
                await sheetsService.transferComplaint(
                    ticketId,
                    data.dept,
                    '',
                    data.reason,
                    user.Username
                );
                setSuccessMessage(`Ticket #${ticketId} successfully transferred to ${data.dept}.`);
            } else {
                let newStatus = selectedComplaint.Status;
                if (action === 'Resolve' || action === 'Close' || action === 'Rate' || action === 'Force Close') {
                    newStatus = action === 'Force Close' ? 'Force Close' : 'Closed';
                    if (action === 'Resolve') setSuccessMessage(`Ticket #${ticketId} marked as successfully resolved.`);
                    if (action === 'Force Close') setSuccessMessage(`Ticket #${ticketId} force closed by admin.`);
                }
                if (action === 'Extend') {
                    newStatus = 'Extend';
                    setSuccessMessage(`Ticket #${ticketId} extended successfully. New date: ${data.date}`);
                }
                if (action === 'Re-open') {
                    newStatus = 'Open';
                    setSuccessMessage(`Ticket #${ticketId} re-opened successfully.`);
                }
                if (action === 'Rate') {
                    setSuccessMessage(`Rating of ${data.rating}/5 submitted successfully.`);
                }

                await sheetsService.updateComplaintStatus(
                    ticketId,
                    newStatus,
                    selectedComplaint.ResolvedBy || user.Username, // Preserve original resolver if rating/closing
                    data.remark || data.reason || '',
                    data.date || '',
                    data.rating || 0
                );
            }

            // Sync State with SILENT refresh (Part 4)
            const updatedList = await sheetsService.getComplaints(true, true);
            setComplaints(updatedList);

            setActionMode(null);
            setSelectedComplaint(null);
            setDetailModalOpen(false);
            setShowSuccess(true);
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

        // 1. Role / Context Filtering
        if (onlyMyComplaints) {
            result = result.filter(c => String(c.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase());
        } else if (onlySolvedByMe) {
            const myUsername = String(user.Username || '').toLowerCase();
            result = result.filter(c =>
                String(c.ResolvedBy || '').toLowerCase() === myUsername &&
                (['closed', 'solved', 'force close'].includes(String(c.Status || '').toLowerCase()))
            );
        } else {
            const role = (user.Role || '').toUpperCase().trim();
            if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
                // Admin sees all
            } else {
                const myDept = String(user.Department || '').toLowerCase();
                const myUsername = String(user.Username || '').toLowerCase();
                result = result.filter(c =>
                    String(c.Department || '').toLowerCase() === myDept ||
                    String(c.ReportedBy || '').toLowerCase() === myUsername
                );
            }
        }

        // 2. Status / Category Filtering
        if (filter !== 'All') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            switch (filter) {
                case 'Open':
                    // Part 3 Fix: Show Transferred tickets in Active/Open for the target department
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        return s === 'open' || s === 'transferred';
                    });
                    break;
                case 'Pending':
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        return s === 'pending' || s === 'in-progress';
                    });
                    break;
                case 'Solved':
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        return s === 'solved' || s === 'closed' || s === 'resolved';
                    });
                    break;
                case 'Transferred':
                    result = result.filter(c => (c.Status || '').trim().toLowerCase() === 'transferred');
                    break;
                case 'Extended':
                    result = result.filter(c => (c.Status || '').trim().toLowerCase() === 'extended' || (c.Status || '').trim().toLowerCase() === 'extend');
                    // Note: If 'extended_flag' exists we could use that, but relying on status for now as primary or we'd need to fetch extension log map here.
                    break;
                case 'Delayed':
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        if (s === 'solved' || s === 'closed' || s === 'resolved') return false;
                        if (!c.TargetDate) return false;
                        const target = new Date(c.TargetDate);
                        return target < now;
                    });
                    break;
                default:
                    // If filter matches a literal status (like 'Closed') allow it, else 'All'
                    if (filter !== 'All' && filter !== 'Active Staff') {
                        result = result.filter(c => (c.Status || 'Open') === filter);
                    }
                    break;
            }
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
                            <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by ID, Dept, or Name..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => loadComplaints(false)}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all active:scale-95 shadow-sm"
                            title="Update Data"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 p-2 bg-slate-50/50 overflow-x-auto no-scrollbar">
                    {['All', 'Open', 'Pending', 'Solved', 'Transferred', 'Delayed'].map(f => (
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
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="p-4 py-3 text-table-header text-slate-400 w-24 uppercase tracking-widest font-bold">ID</th>
                                    <th className="p-4 py-3 text-table-header text-slate-400 uppercase tracking-widest font-bold">Description</th>
                                    <th className="p-4 py-3 text-table-header text-slate-400 w-32 uppercase tracking-widest font-bold">Dept</th>
                                    <th className="p-4 py-3 text-table-header text-slate-400 w-32 uppercase tracking-widest font-bold">Unit</th>
                                    <th className="p-4 py-3 text-table-header text-slate-400 w-32 uppercase tracking-widest font-bold">Date</th>
                                    <th className="p-4 py-3 text-table-header text-slate-400 text-right w-24 uppercase tracking-widest font-bold">Status</th>
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
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none animate-in fade-in duration-150">
                    <div ref={modalRef} className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative border border-slate-200 max-h-[85vh]">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 sticky top-0 z-10 backdrop-blur-none">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-slate-900 text-white text-small-info font-black px-2 py-1 rounded">#{selectedComplaint.ID}</span>
                                    <span className={`text-small-info font-black px-2 py-1 rounded border ${String(selectedComplaint.Status).toLowerCase() === 'open' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                        {String(selectedComplaint.Status).toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-popup-title font-bold text-slate-800 leading-tight">{selectedComplaint.Description}</h2>
                            </div>
                            <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 active:scale-95 group">
                                <X size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                            </button>
                        </div>

                        {/* Modal Body - Fixed Height Scroll */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                            {/* Key Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Building2 size={14} />
                                        <span className="text-label font-bold uppercase tracking-widest text-[#64748b]">Department</span>
                                    </div>
                                    <p className="font-bold text-slate-700 text-forms">{selectedComplaint.Department}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Building2 size={14} />
                                        <span className="text-label font-bold uppercase tracking-widest text-[#64748b]">Unit</span>
                                    </div>
                                    <p className="font-bold text-slate-700 text-forms">{selectedComplaint.Unit}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar size={14} />
                                        <span className="text-label font-bold uppercase tracking-widest text-[#64748b]">Date Reported</span>
                                    </div>
                                    <p className="font-bold text-slate-700 text-forms">{new Date(selectedComplaint.Date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <User size={14} />
                                        <span className="text-label font-bold uppercase tracking-widest text-[#64748b]">Reporter</span>
                                    </div>
                                    <p className="font-bold text-slate-700 text-forms">{selectedComplaint.ReportedBy}</p>
                                </div>
                            </div>

                            {/* Timeline / History */}
                            {selectedComplaint.History && (
                                <div className="mt-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <HistoryIcon size={14} className="text-orange-500" /> Ticket Timeline
                                    </h4>
                                    <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-2">
                                        {String(selectedComplaint.History).split('\n').filter(Boolean).map((log, i) => {
                                            const isTransfer = log.includes('TRANSFERRED');
                                            const isCreation = log.includes('Created');
                                            const isClosure = log.includes('CLOSED') || log.includes('RESOLVED');

                                            return (
                                                <div key={i} className="relative pl-6">
                                                    <div className={`absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center
                                                        ${isTransfer ? 'border-sky-500 text-sky-500' :
                                                            isClosure ? 'border-orange-500 text-orange-500' :
                                                                isCreation ? 'border-green-500 text-green-500' : 'border-slate-300 text-slate-400'}`}>
                                                        {isTransfer ? <Share2 size={10} /> :
                                                            isClosure ? <CheckCircle size={10} /> :
                                                                isCreation ? <Plus size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                    </div>
                                                    <div className={`p-3 rounded-xl border transition-all ${isTransfer ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                                            {log.split(']').length > 1 ? (
                                                                <>
                                                                    <span className="text-[10px] text-slate-400 font-mono mr-2">{log.split(']')[0]}]</span>
                                                                    <span>{log.split(']')[1].trim()}</span>
                                                                </>
                                                            ) : log}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Resolution Details - REVISED UI */}
                            {selectedComplaint.ResolvedBy && (
                                <div className="bg-orange-50/50 border border-orange-100 p-5 rounded-2xl">
                                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <CheckCircle size={14} /> Resolution Details
                                    </h4>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wide mb-0.5">Reporter</p>
                                            <p className="font-bold text-slate-800 text-sm">{selectedComplaint.ReportedBy}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wide mb-0.5">Closed By</p>
                                            <p className="font-bold text-slate-800 text-sm">{selectedComplaint.ResolvedBy}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wide mb-0.5">Closed Date</p>
                                            <p className="font-bold text-slate-800 text-sm">{new Date(selectedComplaint.ResolvedDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wide mb-0.5">Rating Given</p>
                                            <div className="flex items-center gap-0.5">
                                                {Number(selectedComplaint.Rating) > 0 ? (
                                                    [1, 2, 3, 4, 5].map(star => (
                                                        <Star
                                                            key={star}
                                                            size={14}
                                                            className={star <= Number(selectedComplaint.Rating) ? "text-amber-400 fill-amber-400" : "text-amber-200"}
                                                        />
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400">Not Rated</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedComplaint.Remark && (
                                        <div className="pt-3 border-t border-orange-100/50">
                                            <p className="text-xs text-orange-700/80 font-medium italic">"{selectedComplaint.Remark}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10 glass-safe-bottom">
                            {actionMode && (
                                <>
                                    <TransferModal
                                        isOpen={actionMode === 'Transfer'}
                                        onClose={() => setActionMode(null)}
                                        onConfirm={(dept, reason) => handleModalConfirm('Transfer', { dept, reason })}
                                        isSubmitting={isSubmitting}
                                    />
                                    <ExtendModal
                                        isOpen={actionMode === 'Extend'}
                                        onClose={() => setActionMode(null)}
                                        onConfirm={(date, reason) => handleModalConfirm('Extend', { date, reason })}
                                        isSubmitting={isSubmitting}
                                    />
                                    <ResolveModal
                                        isOpen={actionMode === 'Resolve' || actionMode === 'Close' || actionMode === 'Force Close' || actionMode === 'Re-open'}
                                        title={actionMode === 'Force Close' ? 'Force Close Ticket' : actionMode === 'Re-open' ? 'Re-open Ticket' : 'Mark as Resolved'}
                                        onClose={() => setActionMode(null)}
                                        onConfirm={(remark) => handleModalConfirm(actionMode, { remark })}
                                        isSubmitting={isSubmitting}
                                    />
                                    <RateModal
                                        isOpen={actionMode === 'Rate'}
                                        onClose={() => setActionMode(null)}
                                        onConfirm={(rating) => handleModalConfirm('Rate', { rating })}
                                        isSubmitting={isSubmitting}
                                    />
                                </>
                            )}

                            {!actionMode && (
                                <div className="flex flex-wrap gap-2">
                                    {(String(selectedComplaint.Status).toLowerCase() === 'open' || String(selectedComplaint.Status).toLowerCase() === 'transferred') &&
                                        (user.Role === 'admin' || String(user.Department || '').toLowerCase() === String(selectedComplaint.Department || '').toLowerCase()) && (
                                            <>
                                                <button onClick={() => setActionMode('Resolve')} className="flex-1 py-3 bg-orange-700 text-white font-bold rounded-xl shadow-sm hover:bg-orange-800 hover:-translate-y-0.5 transition-all">Mark as Resolved</button>
                                                <button onClick={() => setActionMode('Extend')} className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">Extend</button>
                                                <button onClick={() => setActionMode('Transfer')} className="w-full py-3 mt-2 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-100 hover:bg-orange-100 transition-all shadow-sm">Transfer to Another Dept</button>
                                            </>
                                        )}
                                    {String(selectedComplaint.Status).toLowerCase() === 'closed' && !selectedComplaint.Rating && !hasImmutableRating(selectedComplaint.ID) && String(selectedComplaint.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase() && (
                                        <button onClick={() => setActionMode('Rate')} className="flex-1 py-4 bg-orange-800 text-white font-black rounded-xl hover:bg-orange-900 transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs">Rate This Service</button>
                                    )}
                                    {String(selectedComplaint.Status).toLowerCase() === 'closed' && canReopen(selectedComplaint) && String(selectedComplaint.ReportedBy || '').toLowerCase() === String(user.Username || '').toLowerCase() && (
                                        <button onClick={() => setActionMode('Re-open')} className="flex-1 py-3 bg-white text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-100 hover:bg-rose-50 transition-all shadow-sm">Re-open Ticket</button>
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
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="text-orange-500" size={40} />
                    </div>
                    <h3 className="font-black text-2xl mb-2 text-slate-900 tracking-tight">System Updated</h3>
                    <p className="text-slate-500 text-sm font-medium mb-8 text-center px-4 leading-relaxed">{successMessage}</p>
                    <button onClick={() => setShowSuccess(false)} className="w-full py-4 bg-orange-700 text-white font-black rounded-xl hover:bg-orange-800 transition-all active:scale-95 tracking-widest text-xs">Continue</button>
                </div>
            </div>
        </div>
    );
};

export default ComplaintList;
