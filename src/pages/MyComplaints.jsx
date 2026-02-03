import ComplaintList from '../components/ComplaintList';

const MyComplaints = () => {
    return (
        <div className="max-w-7xl mx-auto pb-20 mt-8 px-4">
            {/* Page Header */}
            <div className="mb-8 p-8 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">My Complaints</h1>
                    <p className="text-slate-500 font-medium text-lg">
                        Track the status of tickets you have reported.
                    </p>
                </div>
            </div>

            <ComplaintList onlyMyComplaints={true} />
        </div>
    );
};

export default MyComplaints;
