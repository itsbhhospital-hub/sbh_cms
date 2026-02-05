import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Building, Phone, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { sheetsService } from '../services/googleSheets';
import sbhBg from '../assets/sbh.png';


const Signup = () => {
    const [formData, setFormData] = useState({ username: '', password: '', department: '', mobile: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDuplicate, setShowDuplicate] = useState(null); // { type: 'username' | 'mobile' }
    const { signup } = useAuth();
    const navigate = useNavigate();

    const DEPARTMENTS = [
        'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
        'HOUSE KEEPING', 'MAINTENANCE', 'IT', 'MARKETING', 'DOCTOR', 'ADMIN'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const users = await sheetsService.getUsers();

            const newUsername = formData.username.trim().toLowerCase();
            const newMobile = formData.mobile.trim();

            const duplicateUser = users.find(u => (u.Username || '').toLowerCase() === newUsername);
            const duplicateMobile = users.find(u => {
                const m = u.Mobile;
                return m && String(m) === newMobile;
            });

            if (duplicateUser) {
                setShowDuplicate('username');
                setIsLoading(false);
                return;
            }

            if (duplicateMobile) {
                setShowDuplicate('mobile');
                setIsLoading(false);
                return;
            }

            await signup(formData);
            setShowModal(true);
            setFormData({ username: '', password: '', department: '', mobile: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            {/* Subtle Professional Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-emerald-900/5"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 border border-slate-200"
            >
                {/* Minimal Header */}
                <div className="bg-white p-8 pb-0 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create Account</h2>
                    <p className="text-slate-500 text-xs font-medium mt-1">Join the SBH Team</p>
                </div>

                <div className="p-8 pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm placeholder:text-slate-400"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm placeholder:text-slate-400"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Department</label>
                            <div className="relative">
                                <select
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm appearance-none cursor-pointer placeholder:text-slate-400"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Department</option>
                                    {DEPARTMENTS.sort().map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400 text-xs">▼</div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mobile</label>
                            <input
                                type="tel"
                                placeholder="10-Digit Mobile Number"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-semibold text-sm placeholder:text-slate-400"
                                value={formData.mobile}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setFormData({ ...formData, mobile: val });
                                }}
                                required
                                pattern="\d{10}"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-xs font-medium">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-700 font-bold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>


            {/* Duplicate User Modal - Clean & Fast */}
            {showDuplicate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="text-emerald-600" size={28} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1">Account Exists</h3>
                        <p className="text-slate-500 text-xs font-medium mb-6">
                            {showDuplicate === 'username'
                                ? "This username is already taken."
                                : "This mobile number is already registered."}
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowDuplicate(null)}
                                className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg hover:bg-emerald-800 transition-all"
                            >
                                Try Again
                            </button>
                            <Link
                                to="/login"
                                className="text-slate-500 font-bold text-xs hover:text-slate-700 hover:underline"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal - Clean & Fast */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-emerald-600 font-bold">✓</span>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1">Request Sent</h3>
                        <p className="text-slate-500 text-xs font-medium mb-6">
                            Your account is pending admin approval.
                        </p>

                        <Link
                            to="/login"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg transition-all block w-full"
                        >
                            Return to Login
                        </Link>
                    </div>
                </div>
            )}

            {/* Standard Footer */}
            <Footer />
        </div>
    );
};

export default Signup;
