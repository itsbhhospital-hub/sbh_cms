import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
            setError(err.message || 'Failed to login');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F3F4F6]">
            {/* Subtle Professional Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-600 to-transparent opacity-10"></div>
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 border border-slate-100"
            >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-lg mb-4 flex items-center justify-center">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
                        <p className="text-emerald-50 text-sm mt-1">SBH Complaints System</p>
                    </div>
                </div>

                <div className="p-8 pt-10">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-6 rounded text-sm font-medium flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-slate-700 font-medium text-sm"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-slate-700 font-medium text-sm"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-slate-500 text-sm font-medium">
                        Need an account?{' '}
                        <Link to="/signup" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors">
                            Request Access
                        </Link>
                    </p>
                </div>

            </motion.div>

            {/* Simple Footer Link/Copyright */}
            <div className="absolute bottom-4 text-center w-full">
                <Footer compact={true} />
            </div>
        </div>
    );
};

export default Login;

