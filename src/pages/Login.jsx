import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">

            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-panel w-full max-w-lg p-8 relative z-10 !bg-white/10 !border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl rounded-2xl border border-white/10"
            >
                <div className="flex flex-col items-center mb-8">
                    {/* Modified Logo Container for 986x435 Aspect Ratio */}
                    <div className="relative w-full max-w-[240px] aspect-[2.2/1] bg-white/10 rounded-xl mb-6 shadow-2xl p-2 border border-white/10">
                        <img src="/src/assets/logo.jpg" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-pink-200 tracking-tight mb-2 text-center drop-shadow-sm leading-tight">
                        SBH Complaint Management
                    </h2>
                    <p className="text-blue-200/80 font-bold tracking-widest text-xs uppercase">SBH Group of Hospitals</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 mb-8 rounded-xl flex items-center gap-3 backdrop-blur-md"
                    >
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                        <p className="text-sm font-bold">{error}</p>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center bg-white/5 rounded-l-xl border-r border-white/10 z-10 transition-colors group-focus-within:bg-blue-500/20">
                            <User className="text-blue-200" size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full pl-20 pr-4 py-4 bg-slate-900/40 backdrop-blur-md border border-white/10 focus:border-blue-400/50 rounded-xl outline-none transition-all placeholder:text-slate-400 text-white font-bold shadow-inner focus:bg-slate-900/60"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center bg-white/5 rounded-l-xl border-r border-white/10 z-10 transition-colors group-focus-within:bg-purple-500/20">
                            <Lock className="text-purple-200" size={20} />
                        </div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full pl-20 pr-4 py-4 bg-slate-900/40 backdrop-blur-md border border-white/10 focus:border-purple-400/50 rounded-xl outline-none transition-all placeholder:text-slate-400 text-white font-bold shadow-inner focus:bg-slate-900/60"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary flex items-center justify-center gap-3 group !bg-gradient-to-r !from-blue-600 !via-purple-600 !to-pink-600 !shadow-lg !shadow-purple-500/40 !py-4 hover:!scale-[1.02] active:!scale-95 text-lg uppercase tracking-wider !rounded-xl border-t border-white/20 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="font-bold">Access Dashboard</span>
                                <motion.div>
                                    <Lock size={18} className="opacity-80 group-hover:translate-x-1 transition-transform" />
                                </motion.div>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <p className="text-slate-400 font-medium"> //
                        New Staff Member?{' '}
                        <Link to="/signup" className="text-blue-300 font-bold hover:text-white transition-colors hover:underline underline-offset-4 decoration-pink-500 decoration-2">
                            Request Access
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
