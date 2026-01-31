import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup = () => {
    const [formData, setFormData] = useState({ username: '', password: '', department: '' });
    const [message, setMessage] = useState('');
    const { signup } = useAuth();

    const DEPARTMENTS = [
        'TPA', 'TPA ACCOUNTANT', 'HR', 'OPERATION', 'PHARMACY',
        'HOUSE KEEPING', 'MAINTENANCE', 'IT', 'MARKETING', 'DOCTOR', 'ADMIN'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(formData);
            setMessage('Account created! Please wait for Admin approval.');
            setFormData({ username: '', password: '', department: '' });
        } catch (err) {
            console.error(err);
            setMessage('Failed to create account.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel w-full max-w-md p-8"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-teal-800">Create Account</h2>
                    <p className="text-gray-600">Join SBH Team</p>
                </div>

                {message && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm">
                        <p className="text-sm">{message}</p>
                        <Link to="/login" className="text-sm font-bold underline mt-2 inline-block">Go to Login</Link>
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-500" size={20} />
                            <input
                                type="text"
                                placeholder="Username"
                                className="input-field pl-14"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-500" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                className="input-field pl-10"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Building className="absolute left-3 top-3 text-gray-500" size={20} />
                            <select
                                className="input-field pl-10 appearance-none"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select Department</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="btn-primary">
                            Sign Up
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-teal-700 font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
