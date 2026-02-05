import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

import sbhBg from '../assets/sbh.png';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showTerminated, setShowTerminated] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(formData.username, formData.password);
            navigate('/');
        } catch (err) {
            if (err.message.includes('TERMINATED:')) {
                setShowTerminated(true);
            } else {
                setError(err.message || 'Failed to login');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            {/* Subtle Professional Background - Zero Lag */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-emerald-900/5"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 border border-slate-200"
            >
                {/* Minimal Header */}
                <div className="bg-white p-8 pb-0 text-center">
                    <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center border border-slate-100 shadow-sm relative">
                        <img src="/logo.jpg" alt="Logo" className="w-[80%] h-[80%] object-contain" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sign In</h2>
                    <p className="text-slate-500 text-xs font-medium mt-1">Hospital Management System</p>
                </div>

                <div className="p-8 pt-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 mb-5 rounded-lg text-xs font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm placeholder:text-slate-400"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Enter Username"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm placeholder:text-slate-400"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Secure Login"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-xs font-medium">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-emerald-700 font-bold hover:underline">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Terminated Popup */}
            {showTerminated && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[2rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-red-50 to-transparent -z-10"></div>

                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-200">
                            <Lock className="text-red-600" size={48} />
                        </div>

                        <h3 className="text-3xl font-black text-slate-800 mb-2">ACCESS DENIED</h3>
                        <p className="text-red-600 font-black text-xs uppercase tracking-[0.2em] mb-4">Account Terminated</p>

                        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                            Your account has been rejected or terminated by the administrator. Please contact the IT department for further assistance.
                        </p>

                        <button
                            onClick={() => setShowTerminated(false)}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-black transition-all active:scale-[0.98]"
                        >
                            Understood
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Simple Footer Link/Copyright */}
            <Footer />
        </div>
    );
};

export default Login;

