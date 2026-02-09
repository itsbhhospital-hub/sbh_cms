import React, { useState, useMemo } from 'react';
import { X, ArrowRight, Building2, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

const DashboardPopup = ({ isOpen, onClose, title, complaints, onTrack }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset page on open
    React.useEffect(() => {
        if (isOpen) setCurrentPage(1);
    }, [isOpen, title]);

    // Memoize paginated data for performance
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return complaints.slice(start, start + itemsPerPage);
    }, [complaints, currentPage]);

    const totalPages = Math.ceil(complaints.length / itemsPerPage);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in scale-95 duration-200 max-h-[85vh] border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-white z-10 flex justify-between items-center sticky top-0">
                    <div>
                        <h3 className="font-black text-slate-800 text-xl leading-none">{title} Cases</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">{complaints.length} Records Found</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors border border-transparent hover:border-slate-100">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-slate-50/50">
                    {complaints.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <p className="font-bold">No cases found in this category.</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">ID</th>
                                        <th className="p-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Complaint</th>
                                        <th className="p-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Dept</th>
                                        <th className="p-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Status</th>
                                        <th className="p-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {paginatedData.map((c) => (
                                        <tr key={c.ID} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 py-3 font-mono text-xs font-bold text-slate-500">#{c.ID}</td>
                                            <td className="p-4 py-3">
                                                <p className="text-sm font-bold text-slate-700 line-clamp-1">{c.Description}</p>
                                            </td>
                                            <td className="p-4 py-3">
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit">
                                                    <Building2 size={12} /> {c.Department}
                                                </span>
                                            </td>
                                            <td className="p-4 py-3">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${c.Status === 'Open' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        c.Status === 'Solved' || c.Status === 'Closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            c.Status === 'Pending' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {c.Status}
                                                </span>
                                            </td>
                                            <td className="p-4 py-3 text-right">
                                                <button
                                                    onClick={() => onTrack(c)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm active:scale-95 group/btn"
                                                >
                                                    <Activity size={12} className="group-hover/btn:scale-110 transition-transform" /> Status
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center z-10">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPopup;
