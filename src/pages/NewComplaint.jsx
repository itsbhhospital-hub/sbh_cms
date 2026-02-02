import { useNavigate } from 'react-router-dom';
import ComplaintForm from '../components/ComplaintForm';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const NewComplaint = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-4xl mx-auto"
        >
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors font-bold group"
            >
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 group-hover:border-emerald-500/50 transition-colors">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                Back to Dashboard
            </button>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>


                <div className="p-10 border-b border-slate-100 relative z-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Create New Ticket</h1>
                    <p className="text-slate-500 font-medium text-lg">Submit a new complaint to the relevant department</p>
                </div>
                <div className="p-0 relative z-10">
                    <ComplaintForm />
                </div>
            </div>
        </motion.div>
    );
};

export default NewComplaint;
