import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Search, Calendar, Hash, X, Building2, User, ArrowRight, RefreshCw, Star, BarChart3, TrendingUp, ChevronRight, Plus, Share2, History as HistoryIcon, Shield, ShieldCheck } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import TransferModal from './TransferModal';
import ExtendModal from './ExtendModal';
import ResolveModal from './ResolveModal';
import RateModal from './RateModal';

const PerformanceWidget = ({ user, userStats }) => {
    // Use official stats from backend if available, else fallback to 0
    const stats = useMemo(() => {
        if (!userStats) return { myResolvedCount: 0, avgRating: '0.0', efficiency: 0 };
        return {
            myResolvedCount: userStats.SolvedCount || 0,
            avgRating: userStats.AvgRating || '0.0',
            efficiency: 100 // Placeholder or calculate if needed
        };
    }, [userStats]);

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
                    <h3 className="text-card-value text-slate-900 leading-none">-<span className="text-sm font-normal text-slate-400 ml-1">days</span></h3>
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

// --- MEMOIZED ROW COMPONENT ---
const ComplaintRow = memo(({ complaint, onClick }) => {
    const getStatusStyle = (status) => {
        const s = String(status || '').trim();
        switch (s) {
            case 'Open': return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
            case 'Solved':
            case 'Closed':
            case 'Resolved': return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
            case 'Transferred': return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20';
            case 'Force Close': return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20';
            default: return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10';
        }
    };

    return (
        <tr
            onClick={() => onClick(complaint)}
            className="group border-b border-slate-50 hover:bg-emerald-50/10 transition-colors cursor-pointer"
        >
            <td className="p-4 py-3">
                <span className="font-mono text-small-info font-bold text-slate-400" translate="no">#{complaint.ID}</span>
            </td>
            <td className="p-4 py-3">
                <div className="flex flex-col">
                    <span className="text-table-data font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors tracking-tight">
                        {complaint.Description}
                    </span>
                    <span className="text-[10px] text-slate-400 md:hidden font-bold">
                        {/* Mobile: Date + Time (Deduped) */}
                        {(() => {
                            const d = (complaint.Date || '').replace(/'/g, '').split(' ')[0];
                            const t = (complaint.Time || '').replace(/'/g, '');
                            return `${d} ${t}`;
                        })()}
                    </span>
                </div>
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                {complaint.LatestTransfer ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">To</span>
                        <span className="text-small-info font-bold text-slate-600 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-100/50 tracking-tight">
                            {complaint.LatestTransfer.NewDepartment || complaint.Department}
                        </span>
                    </div>
                ) : (
                    <span className="text-small-info font-bold text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-100/50 tracking-tight">
                        {complaint.Department}
                    </span>
                )}
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                {complaint.LatestTransfer ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">By</span>
                        <span className="text-table-data font-bold text-slate-700">{complaint.LatestTransfer.TransferredBy || 'Unknown'}</span>
                    </div>
                ) : (
                    <span className="text-table-data font-bold text-slate-700">{complaint.Unit}</span>
                )}
            </td>
            <td className="p-4 py-3 hidden md:table-cell">
                {complaint.LatestTransfer ? (
                    <>
                        <span className="text-small-info font-bold text-slate-400 tracking-tight block">
                            {(complaint.LatestTransfer.TransferDate || '').replace(/'/g, '').split(' ')[0]}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300 tracking-tight">
                            {(complaint.LatestTransfer.TransferDate || '').includes(' ') ? (complaint.LatestTransfer.TransferDate || '').split(' ').slice(1).join(' ').replace(/'/g, '') : ''}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-small-info font-bold text-slate-400 tracking-tight block">
                            {(complaint.Date || '').replace(/'/g, '').split(' ')[0]}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300 tracking-tight">
                            {(complaint.Time || '').replace(/'/g, '')}
                        </span>
                    </>
                )}
            </td>
            <td className="p-4 py-3 text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-table-header font-black tracking-widest ${getStatusStyle(complaint.Status)}`}>
                    {complaint.Status}
                </span>
            </td>
            <td className="p-4 py-3 text-right w-10">
                <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </td>
        </tr>
    );
});

// --- ENTERPRISE CARD COMPONENT (Mobile) ---
const ComplaintCard = memo(({ complaint, onClick }) => (
    <div onClick={() => onClick(complaint)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all mb-3 relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-1 h-full ${complaint.Status === 'Open' ? 'bg-amber-500' : complaint.Status === 'Solved' || complaint.Status === 'Closed' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <div className="flex justify-between items-start mb-2 pl-2">
            <span translate="no" className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-widest ${complaint.Status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {complaint.Status}
            </span>
            <span translate="no" className="text-[10px] font-mono text-slate-400 font-bold">#{complaint.ID}</span>
        </div>
        <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2 pl-2 font-body">{complaint.Description}</h4>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide pl-2">
            <Building2 size={12} className="text-emerald-500" /> {complaint.Department}
        </div>
    </div>
));

const ComplaintList = ({ onlyMyComplaints = false, onlySolvedByMe = false, initialFilter = 'All', autoOpenTicket = null, onAutoOpenComplete = () => { } }) => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(initialFilter); // Initialize with prop
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20); // PAGINATION STATE

    // NEW: Fetch Ratings & Performance & Journey Logs
    const [ratingsLog, setRatingsLog] = useState([]);
    const [transferLogs, setTransferLogs] = useState([]);
    const [extensionLogs, setExtensionLogs] = useState([]);
    const [userPerformance, setUserPerformance] = useState(null);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setVisibleCount(20);
    }, [filter, searchTerm, onlyMyComplaints, onlySolvedByMe]);

    useEffect(() => {
        const fetchExtras = async () => {
            try {
                // Fetch All Logs in parallel for speed
                const [rLog, tLog, eLog] = await Promise.all([
                    sheetsService.getRatings(),
                    sheetsService.getTransferLogs(),
                    sheetsService.getExtensionLogs()
                ]);

                setRatingsLog(rLog);
                setTransferLogs(tLog);
                setExtensionLogs(eLog);

                // Fetch User Performance (User_Performance_Ratings)
                if (user?.Username) {
                    const pLog = await sheetsService.getUserPerformance();
                    const myStats = pLog ? pLog.find(p => String(p.StaffName).toLowerCase() === String(user.Username).toLowerCase()) : null;
                    setUserPerformance(myStats);
                }
            } catch (e) {
                console.error("Error fetching extra data", e);
            }
        };
        fetchExtras();
    }, [user]);

    // Update filter when initialFilter changes (from Dashboard click)
    useEffect(() => {
        if (initialFilter) setFilter(initialFilter);
    }, [initialFilter]);

    // Handle "Track" from Dashboard Popup
    useEffect(() => {
        if (autoOpenTicket) {
            setSelectedComplaint(autoOpenTicket);
            setDetailModalOpen(true);
            onAutoOpenComplete();
        }
    }, [autoOpenTicket]);

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

    // ... (Detail Modal Helpers - revised)
    const openDetailModal = (complaint) => {
        // PART 8: TRANSFER CASE POPUP ACCESS
        // "When Admin or Super Admin clicks a transferred case: Open full complaint popup. Show..."
        // "Normal users must NOT have this access."
        const role = (user.Role || '').toUpperCase().trim();
        const isTransferred = (complaint.Status || '').toLowerCase() === 'transferred';

        if (isTransferred) {
            const isMyDept = String(user.Department || '').toLowerCase() === String(complaint.Department || '').toLowerCase();
            if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && !isMyDept) {
                // Do nothing for users who don't belong to the active department of the ticket
                return;
            }
        }

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
                    action === 'Force Close' ? 'Closed' : newStatus, // Status is Closed
                    action === 'Force Close' ? 'AM Sir' : (action === 'Rate' ? (selectedComplaint.ResolvedBy || '') : user.Username),
                    action === 'Force Close' ? 'Action: Force Closed' : (data.remark || data.reason || ''), // Special Remark
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

                result = result.map(c => {
                    const transferRecord = transferLogs
                        .filter(l => String(l.ComplaintID || l.complaint_id || l.ID || '').trim() === String(c.ID).trim())
                        .sort((a, b) => new Date(String(b.TransferDate || b.transfer_time).replace(/'/g, '')) - new Date(String(a.TransferDate || a.transfer_time).replace(/'/g, '')))[0];

                    const isTransferredByMe = transferRecord && (
                        String(transferRecord.TransferredBy || transferRecord.transferred_by || '').toLowerCase() === myUsername ||
                        String(transferRecord.FromDepartment || transferRecord.from_department || '').toLowerCase() === myDept
                    );

                    // Return new object with transfer info if relevant, keeping original immutable
                    if (isTransferredByMe) {
                        return { ...c, LatestTransfer: transferRecord, _isTransferView: true };
                    }
                    return c;
                }).filter(c => {
                    const isMyDept = String(c.Department || '').toLowerCase() === myDept;
                    const isMyReport = String(c.ReportedBy || '').toLowerCase() === myUsername;
                    return isMyDept || isMyReport || c._isTransferView;
                });
            }
        }

        // 2. Status / Category Filtering
        if (filter !== 'All') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            switch (filter) {
                case 'Open':
                    // Part 3 Fix: Show Transferred & Delayed tickets in Active/Open for the target department
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        return s === 'open' || s === 'transferred' || s === 'delayed';
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
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        // Part 8 Fix: Must appear in Open, Transfer, Delayed until closed.
                        // Check if status is Transferred OR if it exists in transfer logs (history of transfer)
                        const isTransferredStatus = s === 'transferred';
                        const hasTransferHistory = transferLogs.some(t => String(t.ID || t.complaint_id) === String(c.ID));
                        const isClosed = s === 'closed' || s === 'solved' || s === 'force close';

                        return !isClosed && (isTransferredStatus || hasTransferHistory);
                    });
                    break;
                case 'Extended':
                    result = result.filter(c => (c.Status || '').trim().toLowerCase() === 'extended' || (c.Status || '').trim().toLowerCase() === 'extend');
                    // Note: If 'extended_flag' exists we could use that, but relying on status for now as primary or we'd need to fetch extension log map here.
                    break;
                case 'Delayed':
                    result = result.filter(c => {
                        const s = (c.Status || '').trim().toLowerCase();
                        if (s === 'delayed') return true;

                        // Fallback: Check strictly overdue if not yet marked as solved
                        if (['solved', 'closed', 'resolved'].includes(s)) return false;
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
            <PerformanceWidget user={user} userStats={userPerformance} />

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
                                {filteredComplaints.slice(0, visibleCount).map(complaint => (
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
                        {filteredComplaints.slice(0, visibleCount).map(complaint => (
                            <ComplaintCard
                                key={complaint.ID}
                                complaint={complaint}
                                onClick={openDetailModal}
                            />
                        ))}
                    </div>

                    {visibleCount < filteredComplaints.length && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 20)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 text-xs tracking-wide uppercase"
                            >
                                Load More Tickets ({filteredComplaints.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
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
                                    <p className="font-bold text-slate-700 text-forms">
                                        {(selectedComplaint.Date || '').replace(/'/g, '').split(' ')[0]}
                                        <span className="text-slate-400 text-xs ml-2">
                                            {(selectedComplaint.Time || '').replace(/'/g, '')}
                                        </span>
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <User size={14} />
                                        <span className="text-label font-bold uppercase tracking-widest text-[#64748b]">Reporter</span>
                                    </div>
                                    <p className="font-bold text-slate-700 text-forms">{selectedComplaint.ReportedBy}</p>
                                </div>
                            </div>

                            {/* TICKET JOURNEY (NEW FEATURE) */}
                            <div className="mt-8">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <HistoryIcon size={14} className="text-orange-500" /> Ticket Journey
                                </h4>
                                <div className="space-y-0 pl-4 border-l-2 border-slate-100 ml-2 relative">
                                    {(() => {
                                        // 1. Complaint Registered
                                        const events = [{
                                            type: 'created',
                                            date: new Date(selectedComplaint.Date),
                                            title: 'Complaint Registered',
                                            subtitle: `Reported by ${selectedComplaint.ReportedBy}`,
                                            icon: <Plus size={10} />,
                                            color: 'green'
                                        }];

                                        // 2. Assigned (Implied if Department exists)
                                        if (selectedComplaint.Department) {
                                            events.push({
                                                type: 'assigned',
                                                date: new Date(selectedComplaint.Date), // Assuming assigned at creation for now or same day
                                                title: 'Assigned',
                                                subtitle: `To ${selectedComplaint.Department} Dept`,
                                                icon: <ShieldCheck size={10} />,
                                                color: 'blue'
                                            });
                                        }

                                        // 3. Transfers
                                        const transfers = transferLogs.filter(t => String(t.ComplaintID) === String(selectedComplaint.ID));
                                        transfers.forEach(t => {
                                            events.push({
                                                type: 'transfer',
                                                date: new Date(t.TransferDate || t.Date),
                                                title: 'Department Transferred',
                                                subtitle: `From ${t.FromDepartment || t.from_department} to ${t.NewDepartment || t.to_department}`,
                                                icon: <Share2 size={10} />,
                                                color: 'sky'
                                            });
                                        });

                                        // 4. Extensions
                                        const extensions = extensionLogs.filter(e => String(e.ComplaintID) === String(selectedComplaint.ID));
                                        extensions.forEach(e => {
                                            events.push({
                                                type: 'extension',
                                                date: new Date(e.ExtensionDate || e.Date),
                                                title: 'Deadline Extended',
                                                subtitle: `Target: ${e.NewTargetDate} (Reason: ${e.Reason})`,
                                                icon: <Clock size={10} />,
                                                color: 'amber'
                                            });
                                        });

                                        // 5. Resolution
                                        if (selectedComplaint.ResolvedDate) {
                                            events.push({
                                                type: 'resolved',
                                                date: new Date(selectedComplaint.ResolvedDate),
                                                title: 'Complaint Solved',
                                                subtitle: `Solved by ${selectedComplaint.ResolvedBy}`,
                                                icon: <CheckCircle size={10} />,
                                                color: 'orange'
                                            });
                                        }

                                        // 6. Ratings
                                        const rating = ratingsLog.find(r => String(r.ID) === String(selectedComplaint.ID));
                                        if (rating) {
                                            const reporterName = (rating.Reporter && rating.Reporter !== 'undefined' && rating.Reporter.trim() !== '')
                                                ? rating.Reporter
                                                : (selectedComplaint.ReportedBy || 'Reporter');

                                            events.push({
                                                type: 'rated',
                                                date: new Date(rating.Date),
                                                title: 'Feedback Received',
                                                subtitle: (
                                                    <span className="flex items-center gap-1.5 mt-0.5">
                                                        <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                                                        <strong className="text-slate-700">{rating.Rating} Star</strong>
                                                        <span className="text-slate-500 font-normal">by {reporterName}</span>
                                                    </span>
                                                ),
                                                icon: <Star size={10} />,
                                                color: 'purple'
                                            });
                                        }

                                        // Sort by Date
                                        events.sort((a, b) => a.date - b.date);

                                        return events.map((ev, i) => (
                                            <div key={i} className="relative pl-8 py-3 group">
                                                {/* Timeline Node */}
                                                <div className={`absolute -left-[21px] top-4 w-4 h-4 rounded-full bg-white border-2 z-10 flex items-center justify-center transition-all group-hover:scale-125
                                                    ${ev.color === 'green' ? 'border-emerald-500 text-emerald-500 shadow-emerald-100' :
                                                        ev.color === 'blue' ? 'border-blue-500 text-blue-500 shadow-blue-100' :
                                                            ev.color === 'sky' ? 'border-sky-500 text-sky-500 shadow-sky-100' :
                                                                ev.color === 'amber' ? 'border-amber-500 text-amber-500 shadow-amber-100' :
                                                                    ev.color === 'orange' ? 'border-orange-500 text-orange-500 shadow-orange-100' :
                                                                        ev.color === 'purple' ? 'border-purple-500 text-purple-500 shadow-purple-100' : 'border-slate-300'}`}>
                                                    {ev.icon}
                                                </div>

                                                {/* Card */}
                                                <div className={`p-3 rounded-xl border transition-all hover:shadow-md ${ev.color === 'green' ? 'bg-emerald-50/50 border-emerald-100' :
                                                    ev.color === 'blue' ? 'bg-blue-50/50 border-blue-100' :
                                                        ev.color === 'sky' ? 'bg-sky-50/50 border-sky-100' :
                                                            ev.color === 'amber' ? 'bg-amber-50/50 border-amber-100' :
                                                                ev.color === 'orange' ? 'bg-orange-50/50 border-orange-100' :
                                                                    ev.color === 'purple' ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">{ev.title}</h5>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap ml-2">
                                                            {ev.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-600 mt-1">{ev.subtitle}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1">{ev.date.toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

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
                                            <p className="font-bold text-slate-800 text-sm">{selectedComplaint.ResolvedDate ? new Date(selectedComplaint.ResolvedDate).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wide mb-0.5">Rating Given</p>
                                            <div className="flex items-center gap-0.5">
                                                {(() => {
                                                    const rLog = ratingsLog.find(r => String(r.ID) === String(selectedComplaint.ID));
                                                    const ratingVal = rLog ? Number(rLog.Rating) : Number(selectedComplaint.Rating);

                                                    return ratingVal > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                <span className="font-black text-amber-600 text-sm">{ratingVal}/5</span>
                                                            </div>
                                                            <div className="flex">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <Star
                                                                        key={star}
                                                                        size={14}
                                                                        className={star <= ratingVal ? "text-amber-400 fill-amber-400" : "text-amber-200"}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400">Not Rated</span>
                                                    );
                                                })()}
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
                                    {/* FORCE CLOSE: EXCLUSIVE TO AM SIR (SUPER ADMIN) */}
                                    {user.Username === 'AM Sir' && selectedComplaint.Status !== 'Closed' && selectedComplaint.Status !== 'Force Close' && (
                                        <button onClick={() => setActionMode('Force Close')} className="w-full py-3 mt-2 bg-rose-50 text-rose-600 font-black rounded-xl border border-rose-200 hover:bg-rose-100 transition-all shadow-sm flex items-center justify-center gap-2">
                                            <Shield size={16} /> Force Close Case (Super Admin)
                                        </button>
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
