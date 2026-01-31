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
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 border-b border-slate-800">
                    <h1 className="text-2xl font-bold text-white">Create New Ticket</h1>
                    <p className="text-slate-400">Submit a new complaint to the relevant department</p>
                </div>
                <div className="p-0">
                    <ComplaintForm />
                </div>
            </div>
        </motion.div>
    );
};

export default NewComplaint;
