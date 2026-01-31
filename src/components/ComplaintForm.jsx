import { useState } from 'react';
import { sheetsService } from '../services/googleSheets';
import { Send, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SuccessModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-green-50 to-transparent -z-10"></div>

                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                    <CheckCircle className="text-green-600 animate-[bounce_1s_infinite]" size={40} />
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-2">Complaint Sent!</h3>
                <p className="text-slate-500 mb-8 font-medium">Your ticket has been registered and SMS notification sent to the department.</p>

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

    const DEPARTMENTS = [
        'IT', 'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
        'HOUSE KEEPING', 'MAINTENANCE', 'MARKETING', 'DOCTOR', 'ADMIN',
        'BILLING', 'FRONT OFFICE', 'STORE', 'LAB', 'NURSING', 'SECURITY', 'CCTV', 'OT', 'ICU', 'NICU', 'PICU', 'RADIOLOGY'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sheetsService.createComplaint({
                department,
                description,
                reportedBy: user.Username
            });

            // Show Success Modal instead of Alert
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8 mb-8 transform transition-all hover:shadow-[0_0_40px_rgba(30,58,138,0.2)]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40">
                        <Upload className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white">Create Ticket</h3>
                        <p className="text-slate-400 text-sm">Fill in the details below</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid md:grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-wide mb-2 pl-1">Target Department</label>
                        <div className="relative group">
                            <select
                                className="w-full px-5 py-4 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white font-bold appearance-none cursor-pointer hover:border-blue-500/50"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required
                            >
                                <option value="" className="text-gray-500">-- Select Department --</option>
                                {DEPARTMENTS.sort().map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-5 pointer-events-none text-blue-500 group-hover:text-blue-400 transition-colors">▼</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-wide mb-2 pl-1">Issue Description</label>
                        <textarea
                            className="w-full px-5 py-4 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-600 h-32 resize-none hover:border-blue-500/50"
                            placeholder="Describe the issue in detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send size={20} /> Submit Ticket
                            </>
                        )}
                    </button>
                </form>
            </div>

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
        </>
    );
};

export default ComplaintForm;
