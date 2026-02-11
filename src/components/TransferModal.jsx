import { ChevronRight, Share2, X, Zap } from 'lucide-react';
import { useIntelligence } from '../context/IntelligenceContext';

const DEPARTMENTS = [
    'IT', 'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
    'HOUSE KEEPING', 'MAINTENANCE', 'MARKETING', 'DOCTOR', 'ADMIN',
    'BILLING', 'FRONT OFFICE', 'STORE', 'LAB', 'NURSING', 'SECURITY', 'CCTV', 'OT', 'ICU', 'NICU', 'PICU', 'RADIOLOGY'
];

const TransferModal = ({ isOpen, onClose, onConfirm, isSubmitting, ticket }) => {
    const [dept, setDept] = useState('');
    const [reason, setReason] = useState('');
    const { getTransferSuggestion } = useIntelligence();
    const suggestedDept = getTransferSuggestion(ticket);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onConfirm(dept, reason);
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200 max-w-lg mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Share2 className="text-orange-500" size={20} /> Transfer Ticket
                </h4>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                </button>
            </div>

            <div className="mb-4 space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Transfer To Department</label>
                        {suggestedDept && (
                            <button
                                onClick={() => setDept(suggestedDept)}
                                className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase animate-pulse"
                            >
                                <Zap size={10} fill="currentColor" /> AI Suggest: {suggestedDept}
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 appearance-none"
                            value={dept}
                            onChange={e => setDept(e.target.value)}
                        >
                            <option value="">Select Target Department...</option>
                            {DEPARTMENTS.sort().map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-3.5 text-slate-400 rotate-90 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reason for Transfer</label>
                    <textarea
                        className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400 bg-slate-50"
                        placeholder="Why is this case being transferred?"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !dept || !reason}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                </button>
            </div>
        </div>
    );
};

export default TransferModal;
