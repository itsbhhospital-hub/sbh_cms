import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SessionTimer = () => {
    const { user, logout } = useAuth();
    const [timeLeft, setTimeLeft] = useState(null);
    const [status, setStatus] = useState('normal'); // normal, warning, critical

    useEffect(() => {
        if (!user) return;

        const updateTimer = () => {
            const loginTime = localStorage.getItem('sbh_login_time');
            if (!loginTime) {
                // Should not happen if user is logged in, but safe fallback
                return;
            }

            const elapsed = Date.now() - parseInt(loginTime);
            // 60 minutes in ms = 3600000
            const remaining = 3600000 - elapsed;

            if (remaining <= 0) {
                setTimeLeft("Session Expired");
                // Optional: Trigger logout here if not handled by AuthContext
                // logout(); 
            } else {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${m}m ${s}s`);

                if (remaining < 60000) { // Less than 1 min
                    setStatus('critical');
                } else if (remaining < 300000) { // Less than 5 mins
                    setStatus('warning');
                } else {
                    setStatus('normal');
                }
            }
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(interval);
    }, [user]);

    if (!user) return null;

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-4 right-4 z-[100]"
        >
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all duration-500
                ${status === 'critical' ? 'bg-red-500/90 border-red-600 text-white animate-pulse' :
                    status === 'warning' ? 'bg-amber-500/90 border-amber-600 text-white' :
                        'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'}
            `}>
                <motion.div
                    animate={status === 'critical' ? { rotate: [0, 10, -10, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                >
                    {status === 'critical' ? <AlertTriangle size={16} fill="currentColor" /> : <Clock size={16} />}
                </motion.div>

                <div className="flex flex-col items-end leading-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Session Time</span>
                    <span className="font-mono font-black text-sm tabular-nums">
                        {timeLeft || "--:--"}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export default SessionTimer;
