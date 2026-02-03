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

            const safeGet = (obj, key) => {
                const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const target = norm(key);
                const foundKey = Object.keys(obj).find(k => norm(k) === target);
                return foundKey ? obj[foundKey] : '';
            };

            const newUsername = formData.username.trim().toLowerCase();
            const newMobile = formData.mobile.trim();

            const duplicateUser = users.find(u => safeGet(u, 'Username').toLowerCase() === newUsername);
            const duplicateMobile = users.find(u => {
                const m = safeGet(u, 'Mobile');
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900/20">
            {/* Blurred Background Image */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                    src={sbhBg}
                    alt="Background"
                    className="w-full h-full object-cover blur-md scale-105 opacity-60 pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/10"></div> {/* Overlay for contrast */}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 border border-slate-100"
            >
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center text-white relative">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
                        <p className="text-emerald-50 text-sm mt-1">Join the SBH Team</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Username"
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
                                        placeholder="Password"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-slate-700 font-medium text-sm"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Department</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <Building size={18} />
                                </div>
                                <select
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-slate-700 font-medium text-sm appearance-none cursor-pointer"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Department</option>
                                    {DEPARTMENTS.sort().map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-4 pointer-events-none text-slate-400 text-xs">▼</div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="10-Digit Mobile Number"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-slate-700 font-medium text-sm"
                                    value={formData.mobile}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) setFormData({ ...formData, mobile: val });
                                    }}
                                    required
                                    pattern="\d{10}"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-slate-500 text-sm font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>


            {/* Duplicate User Modal */}
            {showDuplicate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-[0_20px_70px_-15px_rgba(16,185,129,0.3)] border border-emerald-50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-50 to-transparent -z-10"></div>

                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200/50">
                            <User className="text-emerald-600" size={32} />
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 mb-2">Account Exists</h3>
                        <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-4">Registration Conflict</p>

                        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                            {showDuplicate === 'username'
                                ? "This username is already taken. Please try to login or use a different name."
                                : "This mobile number is already registered. Please check again or contact support."}
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowDuplicate(null)}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                            >
                                Fix Details
                            </button>
                            <Link
                                to="/login"
                                className="text-emerald-600 font-bold text-sm hover:underline"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Success Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_20px_70px_-15px_rgba(16,185,129,0.3)] text-center border border-emerald-50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-50 to-transparent -z-10"></div>

                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200/50">
                            <span className="text-3xl text-emerald-600">✓</span>
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 mb-2">Request Sent!</h3>
                        <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-4">Verification Pending</p>

                        <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                            Your account is pending admin approval.<br />
                            You can sign in once your access is verified.
                        </p>
                        <Link
                            to="/login"
                            className="bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all block w-full shadow-lg"
                        >
                            Return to Login
                        </Link>
                    </motion.div>
                </div>
            )}

            {/* Simple Footer Link/Copyright */}
            <div className="absolute bottom-4 text-center w-full">
                <Footer />
            </div>
        </div>
    );
};

export default Signup;
