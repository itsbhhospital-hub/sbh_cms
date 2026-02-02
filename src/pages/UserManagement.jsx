import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Check, X, Shield, User as UserIcon, Lock, Search, Save, Edit2, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Updated to use cache by default (no forceRefresh)
            const data = await sheetsService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (u) => {
        setEditingUser(u.Username);
        setEditForm({ ...u });
    };

    const handleSave = async () => {
        const updatedUsers = users.map(u => u.Username === editingUser ? editForm : u);
        setUsers(updatedUsers);
        setEditingUser(null);

        try {
            await sheetsService.updateUser(editForm);
            // alert("User updated successfully!"); // Removed annoying alert
        } catch (error) {
            alert("Failed to update user on server. (But updated locally)");
            console.error(error);
        }
    };

    const filteredUsers = users.filter(u =>
        u.Username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (user.Role !== 'admin') return <div className="p-10 text-center text-red-500">Access Denied</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto pb-10"
        >
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <UsersIcon className="text-emerald-600 bg-emerald-50 p-2 rounded-xl" size={48} />
                        User Management
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 ml-1">
                        Total Users: <span className="font-bold text-slate-800">{users.length}</span> •
                        Active: <span className="font-bold text-emerald-600">{users.filter(u => u.Status === 'Active').length}</span>
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none shadow-sm text-slate-700 font-medium transition-all"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to page 1 on search
                        }}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <th className="p-5">User Info</th>
                                <th className="p-5">Department</th>
                                <th className="p-5">Mobile</th>
                                <th className="p-5">Role</th>
                                <th className="p-5">Status</th>
                                <th className="p-5">Password</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-medium animate-pulse">Loading directory...</td></tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-medium">No users found</td></tr>
                            ) : paginatedUsers.map((u, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${u.Role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {u.Username[0].toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700">{u.Username}</span>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded-lg bg-white text-sm w-full outline-none focus:border-emerald-500"
                                                value={editForm.Department || 'General'}
                                                onChange={(e) => setEditForm({ ...editForm, Department: e.target.value })}
                                            >
                                                <option value="General">General</option>
                                                <option value="IT">IT</option>
                                                <option value="MARKETING">MARKETING</option>
                                                <option value="PHARMACY">PHARMACY</option>
                                                <option value="COMPUTER">COMPUTER</option>
                                                <option value="ADMIN">ADMIN</option>
                                                <option value="BILLING">BILLING</option>
                                                <option value="Front Office">Front Office</option>
                                                <option value="HR">HR</option>
                                                <option value="ACCOUNT">ACCOUNT</option>
                                                <option value="MAINTANCE">MAINTANCE</option>
                                                <option value="STORE">STORE</option>
                                                <option value="TPA">TPA</option>
                                                <option value="HOUSEKEEPING">HOUSEKEEPING</option>
                                                <option value="LAB">LAB</option>
                                                <option value="NURSING">NURSING</option>
                                                <option value="SECURITY">SECURITY</option>
                                                <option value="CCTV">CCTV</option>
                                                <option value="OT">OT</option>
                                                <option value="ICU">ICU</option>
                                                <option value="NICU">NICU</option>
                                                <option value="PICU">PICU</option>
                                                <option value="RADIOLOGY">RADIOLOGY</option>
                                                <option value="DOCTOR">DOCTOR</option>
                                                <option value="OTHER">OTHER</option>
                                            </select>
                                        ) : (
                                            <span className="text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">{u.Department}</span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <input
                                                type="text"
                                                className="w-32 p-2 border rounded-lg bg-white text-sm outline-none focus:border-emerald-500"
                                                placeholder="9198..."
                                                value={editForm.Mobile || ''}
                                                onChange={(e) => setEditForm({ ...editForm, Mobile: e.target.value })}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone size={14} className="text-slate-400" />
                                                {u.Mobile || <span className="text-slate-300 italic">--</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded-lg bg-white text-sm outline-none focus:border-emerald-500"
                                                value={editForm.Role || 'user'}
                                                onChange={(e) => setEditForm({ ...editForm, Role: e.target.value })}
                                            >
                                                <option value="user">User</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${u.Role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                u.Role === 'manager' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {u.Role}
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded-lg bg-white text-sm outline-none focus:border-emerald-500"
                                                value={editForm.Status || 'Pending'}
                                                onChange={(e) => setEditForm({ ...editForm, Status: e.target.value })}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Active">Active</option>
                                                <option value="Suspended">Suspended</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${u.Status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                <span className={`text-sm font-bold ${u.Status === 'Active' ? 'text-emerald-700' : 'text-amber-600'}`}>
                                                    {u.Status}
                                                </span>
                                                {u.Status === 'Pending' && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(u.Username);
                                                            setEditForm({ ...u, Status: 'Active' });
                                                            // Immediate UI update, save triggers on next render (handled by user clicking save usually, but here we want quick action)
                                                            // We should probably just do standard edit for safety, or auto-save.
                                                            // Let's stick to opening edit mode with Active pre-selected:
                                                        }}
                                                        className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 hover:bg-emerald-200 transition-colors"
                                                    >
                                                        APPROVE
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <input
                                                type="text"
                                                className="w-24 p-2 border rounded-lg bg-white text-sm font-mono outline-none focus:border-emerald-500"
                                                value={editForm.Password || ''}
                                                onChange={(e) => setEditForm({ ...editForm, Password: e.target.value })}
                                            />
                                        ) : (
                                            <span className="text-slate-300 font-mono text-xs select-none">••••</span>
                                        )}
                                    </td>


                                    <td className="p-4 text-right">
                                        {editingUser === u.Username ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-colors"><Save size={16} /></button>
                                                <button onClick={() => setEditingUser(null)} className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(u)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit User">
                                                <Edit2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredUsers.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-sm text-slate-500 font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Helper Icon
const UsersIcon = ({ className, size }) => (
    <div className={className}>
        <Shield size={size} />
    </div>
);

export default UserManagement;

