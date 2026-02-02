import { useState } from 'react';
import { sheetsService } from '../services/googleSheets';
import { Send, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SuccessModal = ({ isOpen, onClose, complaintId }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-green-50 to-transparent -z-10"></div>

                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                    <CheckCircle className="text-green-600 animate-[bounce_1s_infinite]" size={40} />
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-2">Complaint Sent!</h3>
                {complaintId && (
                    <div className="inline-block bg-slate-100 px-4 py-1.5 rounded-lg mb-4">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ticket ID</p>
                        <p className="text-xl font-black text-slate-800">{complaintId}</p>
                    </div>
                )}
                <p className="text-slate-500 mb-8 font-medium">Ticket has been registered and complaint sent to department.</p>

                <button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

const ComplaintForm = ({ onComplaintCreated }) => {
    const { user } = useAuth();
    const [department, setDepartment] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successId, setSuccessId] = useState(null);

    const DEPARTMENTS = [
        'IT', 'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
        'HOUSE KEEPING', 'MAINTENANCE', 'MARKETING', 'DOCTOR', 'ADMIN',
        'BILLING', 'FRONT OFFICE', 'STORE', 'LAB', 'NURSING', 'SECURITY', 'CCTV', 'OT', 'ICU', 'NICU', 'PICU', 'RADIOLOGY'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await sheetsService.createComplaint({
                department,
                description,
                reportedBy: user.Username
            });

            // Show Success Modal with ID
            setSuccessId(result.id || 'Pending');
            setShowSuccess(true);

            setDepartment('');
            setDescription('');
            if (onComplaintCreated) onComplaintCreated();
        } catch (err) {
            alert("Failed to submit complaint");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="bg-transparent p-10">
                <form onSubmit={handleSubmit} className="grid md:grid-cols-1 gap-8">
                    <div>
                        <label className="block text-sm font-black text-indigo-950 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2">
                            <span className="bg-indigo-100 p-1 rounded-md text-indigo-600">🏢</span> Target Department
                        </label>
                        <div className="relative group">
                            <select
                                className="w-full px-6 py-5 bg-white border-2 border-indigo-50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 font-bold appearance-none cursor-pointer shadow-indigo-100/50 shadow-lg hover:border-indigo-200 hover:-translate-y-0.5"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required
                            >
                                <option value="" className="text-gray-400">Select Department</option>
                                {DEPARTMENTS.sort().map(d => (
                                    <option key={d} value={d} className="py-2 text-slate-700 font-medium">{d}</option>

                                ))}
                            </select>
                            <div className="absolute right-6 top-6 pointer-events-none text-indigo-400 group-hover:text-indigo-600 transition-colors transform group-hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-indigo-950 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2">
                            <span className="bg-indigo-100 p-1 rounded-md text-indigo-600">📝</span> Issue Description
                        </label>
                        <textarea
                            className="w-full px-6 py-5 bg-white border-2 border-indigo-50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 h-40 resize-none shadow-indigo-100/50 shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 font-semibold text-lg"
                            placeholder="Describe the issue in detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send size={20} /> Submit Ticket
                            </>
                        )}
                    </button>
                </form>
            </div>

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} complaintId={successId} />
        </>
    );
};

export default ComplaintForm;
