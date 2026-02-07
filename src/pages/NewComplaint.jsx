import { useNavigate } from 'react-router-dom';
import ComplaintForm from '../components/ComplaintForm';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity } from 'lucide-react';

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
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 group-hover:border-orange-500/50 group-hover:bg-orange-50/30 transition-all">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                Back to Dashboard
            </button>

            <div className="mb-10">
                <h1 className="text-page-title text-slate-900 tracking-tight font-black">Ticket Provisioning</h1>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hospital Complaint Registration</h1>
                    <p className="text-slate-500 font-medium">Submit your service request below</p>
                </div>
            </div>

            <ComplaintForm />
        </motion.div>
    );
};

export default NewComplaint;
