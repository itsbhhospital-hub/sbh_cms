import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Filter, Search, Calendar, Hash } from 'lucide-react';

const ComplaintList = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchDate, setSearchDate] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [actionType, setActionType] = useState(null); // 'Solved' or 'Closed'
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const data = await sheetsService.getComplaints();
            setComplaints(data);
        } catch (err) {
            console.error(err);
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
        const role = user?.Role?.toLowerCase() || '';
        const dept = user?.Department || '';
        const username = user?.Username || '';

        let isVisible = false;
        if (role === 'admin') isVisible = true;
        else if (c.Department === dept) isVisible = true;
        else if (c.ReportedBy === username) isVisible = true;

        if (!isVisible) return false;

        // 2. Status Filter
        if (filter !== 'All' && c.Status !== filter) return false;

        // 3. Search Filter (ID, Description, ReportedBy)
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (c.ID && c.ID.toString().toLowerCase().includes(term)) ||
            (c.Description && c.Description.toLowerCase().includes(term)) ||
            (c.ReportedBy && c.ReportedBy.toLowerCase().includes(term));

        if (!matchesSearch) return false;

        // 4. Date Filter
        if (searchDate) {
            // Compare YYYY-MM-DD
            const cDate = new Date(c.Date).toISOString().split('T')[0];
            if (cDate !== searchDate) return false;
        }

        return true;
    }).sort((a, b) => {
        // Priority: Open(1) > Solved(2) > Closed(3)
        const priority = { 'Open': 1, 'Solved': 2, 'Closed': 3 };
        const pA = priority[a.Status] || 99;
        const pB = priority[b.Status] || 99;

        if (pA !== pB) return pA - pB;

        // Secondary: Date Newest First
        return new Date(b.Date) - new Date(a.Date);
    });

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
                            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                                <Clock size={24} />
                            </div>
                            Complaint Feed
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 ml-14 font-medium">Live tracking of hospital issues</p>
                    </div>
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

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="date"
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                        />
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
                    {filteredComplaints.map((complaint, idx) => (
                        <div key={idx} className={`group relative rounded-2xl p-6 transition-all duration-300 ${getCardStyle(complaint.Status)}`}>
                            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${complaint.Status === 'Open' ? 'bg-orange-100 text-orange-800' :
                                            complaint.Status === 'Solved' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-rose-100 text-rose-800'
                                            }`}>
                                            {complaint.Department}
                                        </span>
                                        {/* ID Display */}
                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-md border border-slate-200/50">
                                            <Hash size={12} /> {complaint.ID || 'NO-ID'}
                                        </span>
                                        <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                                            <Clock size={14} /> {new Date(complaint.Date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-slate-800 font-bold text-xl leading-relaxed tracking-wide">{complaint.Description}</h4>

                                    {/* Remarks Display */}
                                    {complaint.Remark && (
                                        <div className="bg-slate-50 p-5 rounded-2xl border-l-4 border-slate-300 mt-4">
                                            <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                                Remark
                                            </p>
                                            <p className="text-base text-slate-600 font-medium mb-3">{complaint.Remark}</p>

                                            {(complaint.Status === 'Closed' || complaint.Status === 'Solved') && complaint.ResolvedBy && (
                                                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 mt-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                        {complaint.ResolvedBy[0]?.toUpperCase()}
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-medium">
                                                        Resolved by <span className="text-slate-700">{complaint.ResolvedBy}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm text-slate-400 pt-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                            {complaint.ReportedBy ? complaint.ReportedBy[0]?.toUpperCase() : '?'}
                                        </div>
                                        <span>Reported by <span className="text-slate-700 font-bold">{complaint.ReportedBy || 'Unknown'}</span></span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                    <span className={`px-5 py-2 rounded-2xl text-xs font-black shadow-sm border flex items-center gap-2 ${getStatusStyle(complaint.Status)}`}>
                                        <div className={`w-2 h-2 rounded-full ${complaint.Status === 'Open' ? 'bg-amber-400 animate-pulse' : complaint.Status === 'Solved' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                        {complaint.Status.toUpperCase()}
                                    </span>

                                    {/* Actions */}
                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 mt-2 w-full">
                                        {/* User/Manager Action: Close Ticket (Solved) */}
                                        {(user?.Role?.toLowerCase() === 'manager' || user?.Role?.toLowerCase() === 'user') && complaint.Status === 'Open' && (
                                            <button
                                                onClick={() => openActionModal(complaint, 'Solved')}
                                                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={16} /> Close Ticket
                                            </button>
                                        )}

                                        {/* Admin Action: Force Close (Closed) */}
                                        {user?.Role?.toLowerCase() === 'admin' && complaint.Status !== 'Closed' && (
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
                    ))}
                </div>
            )}

            {/* ACTION MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className={`text-2xl font-black mb-2 ${actionType === 'Solved' ? 'text-green-400' : 'text-red-400'}`}>
                            {actionType === 'Solved' ? 'Resolve Complaint' : 'Force Close Complaint'}
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Add a remark explaining why you are taking this action. This will be visible to everyone.
                        </p>

                        <textarea
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 transition-colors h-32 resize-none mb-6"
                            placeholder="Enter your remark here..."
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                disabled={isSubmitting || !remark.trim()}
                                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${actionType === 'Solved' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-rose-600'} disabled:opacity-50 disabled:scale-100`}
                            >
                                {isSubmitting ? 'Saving...' : 'Confirm Action'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintList;
