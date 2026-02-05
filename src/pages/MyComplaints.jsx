import ComplaintList from '../components/ComplaintList';

const MyComplaints = () => {
    return (
        <div className="max-w-7xl mx-auto pb-20 mt-8 px-4">
            {/* Page Header - Executive Style */}
            <div className="mb-8 p-10 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden border-t-8 border-t-emerald-700">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">My Ticket Portal</h1>
                        <div className="text-emerald-700/60 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Real-time Resolution Tracking
                        </div>
                    </div>
                </div>
            </div>

            <ComplaintList onlyMyComplaints={true} />
        </div>
    );
};

export default MyComplaints;
