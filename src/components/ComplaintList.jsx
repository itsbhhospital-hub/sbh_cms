import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Filter, Search, Calendar, Hash, History } from 'lucide-react';

const ComplaintList = ({ onlyMyComplaints = false }) => {
    const { user } = useAuth();
    // Helper to safely get properties (handles case/spaces)
    const safeGet = (obj, key) => {
        if (!obj) return '';
        const norm = (s) => String(s || '').toLowerCase().replace(/\s/g, '');
        const target = norm(key);

        // 1. Direct match
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];

        // 2. Normalized match (handles case and spaces)
        const foundKey = Object.keys(obj).find(k => norm(k) === target);
        if (foundKey) return obj[foundKey];

        // 3. Special handling for ID/TID
        if (target === 'id' || target === 'tid' || target === 'complaintid' || target === 'ticketid') {
            const idKey = Object.keys(obj).find(k => {
                const nk = norm(k);
                return nk === 'id' || nk === 'tid' || nk === 'ticketid' || nk === 'complaintid' || nk.includes('ticketid') || (nk.includes('id') && nk.length < 15);
            });
            if (idKey) return obj[idKey];
        }

        return '';
    };

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [actionType, setActionType] = useState(null); // 'Solved' or 'Closed'
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const data = await sheetsService.getComplaints(true); // Force refresh
            setComplaints(data);
        } catch (err) {
            console.error("Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (complaint, type) => {
        setSelectedComplaint(complaint);
        setActionType(type);
        setRemark('');
        setModalOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedComplaint) return;
        setIsSubmitting(true);
        try {
            const newStatus = actionType;
            // Optimistic update
            setComplaints(prev => prev.map(c =>
                c.ID === selectedComplaint.ID ? { ...c, Status: newStatus, Remark: remark, ResolvedBy: user.Username } : c
            ));

            await sheetsService.updateComplaintStatus(selectedComplaint.ID, newStatus, user.Username, remark);
            setModalOpen(false);
            setShowSuccess(true);
        } catch (error) {
            console.error(error);
            alert("Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter & Sort Logic
    const filteredComplaints = complaints.filter(c => {
        // 1. Role Limitation
        const role = safeGet(user, 'Role').toLowerCase().trim();
        const userDept = safeGet(user, 'Department').toLowerCase().trim();
        const username = safeGet(user, 'Username').toLowerCase().trim();

        const complaintDept = safeGet(c, 'Department').toLowerCase().trim();
        const reportedBy = safeGet(c, 'ReportedBy').toLowerCase().trim();

        let isVisible = false;

        if (onlyMyComplaints) {
            // STRICT MODE: Only show what I reported
            if (reportedBy === username) isVisible = true;
        } else {
            // DASHBOARD MODE
            if (role === 'admin') isVisible = true;
            else if (userDept && complaintDept === userDept) isVisible = true; // Match Department
            else if (reportedBy === username) isVisible = true; // Match Reporter
        }

        if (!isVisible) return false;

        // 2. Status Filter
        const status = safeGet(c, 'Status');
        if (filter !== 'All' && status !== filter) return false;

        // 3. Search Filter (ID, Description, ReportedBy)
        const term = searchTerm.toLowerCase();
        const id = safeGet(c, 'ID').toString().toLowerCase();
        const desc = safeGet(c, 'Description').toLowerCase();

        const matchesSearch =
            id.includes(term) ||
            desc.includes(term) ||
            reportedBy.includes(term);

        if (!matchesSearch) return false;

        // 4. Date Range Filter
        if (startDate || endDate) {
            const rawDate = safeGet(c, 'Date');
            const cDateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';

            if (startDate && cDateStr < startDate) return false;
            if (endDate && cDateStr > endDate) return false;
        }

        return true;
    }).sort((a, b) => {
        // Priority: Open(1) > Solved(2) > Closed(3)
        const statA = safeGet(a, 'Status');
        const statB = safeGet(b, 'Status');

        const priority = { 'Open': 1, 'Solved': 2, 'Closed': 3 };
        const pA = priority[statA] || 99;
        const pB = priority[statB] || 99;

        if (pA !== pB) return pA - pB;

        // Secondary: Date Newest First
        return new Date(safeGet(b, 'Date')) - new Date(safeGet(a, 'Date'));
    });

    // RENDER HELPERS
    const renderStatus = (c) => safeGet(c, 'Status');
    const renderDept = (c) => safeGet(c, 'Department');
    const renderReporter = (c) => safeGet(c, 'ReportedBy') || 'Unknown';
    const renderDate = (c) => {
        const d = safeGet(c, 'Date');
        return d ? new Date(d).toLocaleDateString() : '';
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Open': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40';
            case 'Solved': return 'bg-green-500/20 text-green-400 border-green-500/40';
            case 'Closed': return 'bg-red-500/20 text-red-400 border-red-500/40';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
    );

    const getCardStyle = (status) => {
        switch (status) {
            case 'Open': return 'bg-amber-50 border-l-4 border-l-amber-500 border-y border-r border-amber-100 shadow-sm hover:shadow-md';
            case 'Solved': return 'bg-emerald-50 border-l-4 border-l-emerald-500 border-y border-r border-emerald-100 shadow-sm hover:shadow-md';
            case 'Closed': return 'bg-rose-50 border-l-4 border-l-rose-500 border-y border-r border-rose-100 shadow-sm hover:shadow-md';
            default: return 'bg-slate-50 border border-slate-200';
        }
    };

    return (
        <div className="bg-white/50 p-6 rounded-3xl border border-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6 mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className={`p-2.5 bg-gradient-to-br ${onlyMyComplaints ? 'from-purple-600 to-pink-600 shadow-purple-500/20' : 'from-blue-600 to-indigo-600 shadow-blue-500/20'} rounded-xl shadow-lg text-white`}>
                                {onlyMyComplaints ? <CheckCircle size={24} /> : <Clock size={24} />}
                            </div>
                            {onlyMyComplaints ? 'My Submitted Tickets' : 'Complaint Feed'}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1 ml-14 font-medium">Live tracking of hospital issues</p>
                    </div>
                    {/* Refresh Button */}
                    <button
                        onClick={() => { setLoading(true); loadComplaints(); }}
                        className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                        title="Refresh Data"
                    >
                        <History size={20} />
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search ID, Description..."
                            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                        <Calendar size={18} className="text-slate-400" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer w-32"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="Start Date"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer w-32"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="End Date"
                            />
                        </div>
                    </div>

                    {/* Status Select */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none text-sm font-bold focus:ring-0 text-slate-600 cursor-pointer outline-none"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Open">Open</option>
                            <option value="Solved">Solved</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            {filteredComplaints.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} className="text-slate-300" />
                    </div>
                    <p className="text-lg font-bold text-slate-400">No complaints found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredComplaints.map((complaint, idx) => {
                        const status = renderStatus(complaint);
                        const reporter = renderReporter(complaint);
                        const displayId = safeGet(complaint, 'ID') || 'NO-ID';

                        return (
                            <div key={idx} className={`group relative rounded-2xl p-6 transition-all duration-300 ${getCardStyle(status)}`}>
                                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${status === 'Open' ? 'bg-orange-100 text-orange-800' :
                                                status === 'Solved' ? 'bg-emerald-100 text-emerald-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                {renderDept(complaint)}
                                            </span>
                                            {/* ID Display */}
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-md border border-slate-200/50">
                                                <Hash size={12} /> {displayId}
                                            </span>
                                            <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                                                <Clock size={14} /> {renderDate(complaint)}
                                            </span>
                                        </div>
                                        <h4 className="text-slate-800 font-bold text-xl leading-relaxed tracking-wide">{safeGet(complaint, 'Description')}</h4>

                                        {/* Remarks Display */}
                                        {safeGet(complaint, 'Remark') && (
                                            <div className="bg-slate-50 p-5 rounded-2xl border-l-4 border-slate-300 mt-4">
                                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                                    Remark
                                                </p>
                                                <p className="text-base text-slate-600 font-medium mb-3">{safeGet(complaint, 'Remark')}</p>

                                                {(status === 'Closed' || status === 'Solved') && safeGet(complaint, 'ResolvedBy') && (
                                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 mt-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {safeGet(complaint, 'ResolvedBy')[0]?.toUpperCase()}
                                                        </div>
                                                        <p className="text-sm text-slate-500 font-medium">
                                                            Resolved by <span className="text-slate-700">{safeGet(complaint, 'ResolvedBy')}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-slate-400 pt-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                                {reporter ? reporter[0]?.toUpperCase() : '?'}
                                            </div>
                                            <span>Reported by <span className="text-slate-700 font-bold">{reporter}</span></span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                        <span className={`px-5 py-2 rounded-2xl text-xs font-black shadow-sm border flex items-center gap-2 ${getStatusStyle(status)}`}>
                                            <div className={`w-2 h-2 rounded-full ${status === 'Open' ? 'bg-amber-400 animate-pulse' : status === 'Solved' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                            {status.toUpperCase()}
                                        </span>

                                        {/* Actions */}
                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 mt-2 w-full">
                                            {/* User/Manager Action: Close Ticket (Solved) */}
                                            {(safeGet(user, 'Role').toLowerCase() === 'manager' || safeGet(user, 'Role').toLowerCase() === 'user') && status === 'Open' && (
                                                <button
                                                    onClick={() => openActionModal(complaint, 'Solved')}
                                                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={16} /> Close Ticket
                                                </button>
                                            )}

                                            {/* Admin Action: Force Close (Closed) */}
                                            {safeGet(user, 'Role').toLowerCase() === 'admin' && status !== 'Closed' && (
                                                <button
                                                    onClick={() => openActionModal(complaint, 'Closed')}
                                                    className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                                >
                                                    <AlertTriangle size={16} /> Force Close
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* SIMPLE ACTION MODAL */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={(e) => {
                        // Close only if clicking background
                        if (e.target === e.currentTarget) setModalOpen(false);
                    }}
                >
                    <div className="bg-white w-[90%] max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {/* Simple Header */}
                        <div className={`p-4 ${actionType === 'Solved' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center gap-3`}>
                            {actionType === 'Solved' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                            <h3 className="text-lg font-bold">
                                {actionType === 'Solved' ? 'Resolve Complaint' : 'Force Close'}
                            </h3>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 font-medium mb-4 text-sm">
                                {actionType === 'Solved'
                                    ? 'Please confirm you want to resolve this ticket.'
                                    : 'Warning: You are force-closing this ticket.'}
                            </p>

                            <textarea
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-slate-800 focus:border-blue-500 outline-none text-sm font-medium mb-4 resize-none"
                                placeholder="Enter remark (Required)..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                rows={3}
                                autoFocus
                            />

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-100 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    disabled={isSubmitting || !remark.trim()}
                                    className={`px-6 py-2 rounded-lg text-white font-bold text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50 ${actionType === 'Solved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {isSubmitting ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIMPLE SUCCESS MODAL */}
            {showSuccess && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-[90%] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2">Success!</h3>
                        <p className="text-slate-600 mb-6 text-sm font-medium">
                            Ticket has been <span className="text-slate-900 font-bold">{actionType === 'Solved' ? 'Solved' : 'Force Closed'}</span> successfully.
                        </p>

                        <button
                            onClick={() => setShowSuccess(false)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-95"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintList;
