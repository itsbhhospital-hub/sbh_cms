import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, AlertTriangle, Filter, Search } from 'lucide-react';

const ComplaintList = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

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
                c.ID === selectedComplaint.ID ? { ...c, Status: newStatus, Remark: remark } : c
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

    // Filter Logic
    const filteredComplaints = complaints.filter(c => {
        const role = user?.Role?.toLowerCase() || '';
        const dept = user?.Department || '';
        const username = user?.Username || '';

        if (role === 'admin') return true;
        if (c.Department === dept) return true;
        if (c.ReportedBy === username) return true;
        return false;
    }).filter(c => {
        if (filter === 'All') return true;
        return c.Status === filter;
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

    return (
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-white/5 pb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg"><Clock size={24} className="text-white" /></div>
                        Complaint Feed
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 ml-14">Live tracking of hospital issues</p>
                </div>

                <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10">
                    <Filter size={18} className="text-gray-400 ml-2" />
                    <select
                        className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-gray-200 cursor-pointer min-w-[120px] outline-none"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="All" className="bg-slate-900">All Status</option>
                        <option value="Open" className="bg-slate-900">Open</option>
                        <option value="Solved" className="bg-slate-900">Solved</option>
                        <option value="Closed" className="bg-slate-900">Closed</option>
                    </select>
                </div>
            </div>

            {filteredComplaints.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <CheckCircle size={64} className="mx-auto mb-4 text-white/20" />
                    <p className="text-lg font-medium text-white/60">No complaints found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredComplaints.map((complaint, idx) => (
                        <div key={idx} className="group relative bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-cyan-300 bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-wider">
                                            {complaint.Department}
                                        </span>
                                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                            <Clock size={12} /> {new Date(complaint.Date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-white font-bold text-lg leading-snug">{complaint.Description}</h4>

                                    {/* Remarks Display */}
                                    {complaint.Remark && (
                                        <div className="bg-white/5 p-3 rounded-xl border-l-2 border-purple-500 mt-2">
                                            <p className="text-xs text-purple-300 font-bold mb-0.5">Remark:</p>
                                            <p className="text-sm text-gray-300 italic">"{complaint.Remark}"</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm text-gray-400 pt-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold ring-1 ring-indigo-500/40">
                                            {complaint.ReportedBy ? complaint.ReportedBy[0]?.toUpperCase() : '?'}
                                        </div>
                                        <span>Reported by <span className="text-indigo-300 font-medium">{complaint.ReportedBy || 'Unknown'}</span></span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${getStatusStyle(complaint.Status)}`}>
                                        <div className={`w-2 h-2 rounded-full ${complaint.Status === 'Open' ? 'bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]' : complaint.Status === 'Solved' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`}></div>
                                        {complaint.Status}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-2">
                                        {user?.Role?.toLowerCase() === 'manager' && complaint.Status === 'Open' && (
                                            <button
                                                onClick={() => openActionModal(complaint, 'Solved')}
                                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle size={14} /> Resolve
                                            </button>
                                        )}

                                        {user?.Role?.toLowerCase() === 'admin' && complaint.Status !== 'Closed' && (
                                            <button
                                                onClick={() => openActionModal(complaint, 'Closed')}
                                                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                                            >
                                                <AlertTriangle size={14} /> Force Close
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
