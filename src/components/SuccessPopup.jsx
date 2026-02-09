import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

const SuccessPopup = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 right-6 z-[200] max-w-sm w-full"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 flex items-center gap-4 relative overflow-hidden">
                        {/* Accent Bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600" />

                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                            <Check size={20} className="text-emerald-600" strokeWidth={3} />
                        </div>

                        <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800">Success</h4>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{message}</p>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SuccessPopup;
