import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Building, Phone, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { sheetsService } from '../services/googleSheets';


const Signup = () => {
    const [formData, setFormData] = useState({ username: '', password: '', department: '', mobile: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
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
            // 1. Fetch existing users to check for duplicates
            const existingUsers = await sheetsService.getUsers();

            // 2. Normalize inputs for comparison
            const newUsername = formData.username.trim().toLowerCase();
            const newMobile = formData.mobile.trim();

            // 3. Check for Duplicates
            const duplicateUser = existingUsers.find(u => u.Username.toLowerCase() === newUsername);
            const duplicateMobile = existingUsers.find(u => u.Mobile && u.Mobile.toString() === newMobile);

            if (duplicateUser) {
                alert("Username is already taken. Please choose another.");
                setIsLoading(false);
                return;
            }

            if (duplicateMobile) {
                alert("This mobile number is already registered.");
                setIsLoading(false);
                return;
            }

            // 4. Proceed if unique
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F3F4F6]">
            {/* Subtle Professional Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-600 to-transparent opacity-[0.03]"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl"></div>
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


            {/* Success Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <span className="text-3xl">✓</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Registration Successful</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            Your account is pending admin approval.<br />
                            You will be notified once active.
                        </p>
                        <Link
                            to="/login"
                            className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-all block w-full text-sm"
                        >
                            Return to Login
                        </Link>
                    </div>
                </div>
            )}

            {/* Simple Footer Link/Copyright */}
            <div className="absolute bottom-4 text-center w-full">
                <Footer compact={true} />
            </div>
        </div>
    );
};

export default Signup;
