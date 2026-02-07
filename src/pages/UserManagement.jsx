import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../constants/appData';
import { Check, X, Shield, User as UserIcon, Lock, Search, Save, Edit2, Phone, ChevronLeft, ChevronRight, UserPlus, Trash2, Key, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Add User State
    const [addingUser, setAddingUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ Username: '', Password: '', Department: 'General', Mobile: '', Role: 'user' });

    // Delete & Reject Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [rejectConfirm, setRejectConfirm] = useState(null);
    const [actionSuccess, setActionSuccess] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (actionSuccess) {
            const timer = setTimeout(() => setActionSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [actionSuccess]);

    const loadUsers = async () => {
        setLoading(true);
        try {
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
        setEditForm({
            Username: u.Username,
            Password: u.Password,
            Department: u.Department,
            Mobile: u.Mobile,
            Role: u.Role,
            Status: u.Status,
            OldUsername: u.Username
        });
    };

    const handleSave = async () => {
        try {
            await sheetsService.updateUser(editForm);
            setActionSuccess("User updated successfully! 🎉");
            setEditingUser(null);
            loadUsers();
        } catch (error) {
            alert("Failed to update user.");
            console.error(error);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const targetUsername = deleteConfirm.Username;
        setDeleteConfirm(null);
        try {
            await sheetsService.deleteUser(targetUsername);
            setActionSuccess("User deleted successfully! 🗑️");
            loadUsers();
        } catch (error) {
            alert("Failed to delete user.");
            console.error(error);
        }
    };

    const handleAddUser = async () => {
        if (!newUserForm.Username || !newUserForm.Password || !newUserForm.Mobile) {
            alert("Mandatory fields missing.");
            return;
        }
        setLoading(true);
        const tempUser = { ...newUserForm, Status: 'Active' };
        try {
            await sheetsService.registerUser(tempUser);
            setActionSuccess("User created successfully! 🚀");
            setAddingUser(false);
            setNewUserForm({ Username: '', Password: '', Department: 'General', Mobile: '', Role: 'user' });
            loadUsers();
        } catch (error) {
            alert("Failed to add user.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [isApproving, setIsApproving] = useState(false);

    const handleApprove = async (u) => {
        if (!confirm(`Approve access for ${u.Username}?`)) return;
        setIsApproving(true);
        try {
            await sheetsService.updateUser({ Username: u.Username, Status: 'Active' });
            setActionSuccess("User approved & notified! ✅");
            loadUsers();
        } catch (error) {
            alert("Failed to approve user.");
            console.error(error);
        } finally {
            setIsApproving(false);
        }
    };

    // ... (rest of filtering)

    const filteredUsers = users.filter(u =>
        u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const isAuthorized = user.Role === 'admin' || user.Role === 'SUPER_ADMIN';
    if (!isAuthorized) return <div className="p-10 text-center text-red-500">Access Denied</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto pb-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-page-title text-slate-900 tracking-tight flex items-center gap-3">
                        <UsersIcon className="text-orange-600 bg-orange-50 p-2 rounded-xl" size={32} />
                        User Directory
                    </h1>
                    <p className="text-table-data text-slate-500 font-bold mt-1 ml-1">
                        System Registry: <span className="text-slate-800">{users.length} Records</span>
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-forms"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <button onClick={() => setAddingUser(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-100">
                        <UserPlus size={18} /> Add Member
                    </button>
                </div>
            </div>

            {actionSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-orange-800 text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-4">
                    {actionSuccess}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-compact">
                        <thead>
                            <tr className="text-table-header text-slate-500 tracking-wide font-bold">
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Security</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center text-slate-400 animate-pulse">Loading...</td></tr>
                            ) : paginatedUsers.map((u, idx) => (
                                <tr key={u.Username || idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${u.Role === 'admin' ? 'bg-orange-600' : 'bg-slate-400'}`}>
                                                {u.Username ? u.Username[0].toUpperCase() : '?'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-table-data font-bold text-slate-800">{u.Username}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">{u.Role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-small-info font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                            {u.Department}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${u.Status === 'Active' ? 'bg-orange-500' : 'bg-amber-500'}`}></div>
                                            <span className="text-table-data font-bold text-slate-700">{u.Status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setUsers(users.map(item => item.Username === u.Username ? { ...item, showPass: !item.showPass } : item))}>
                                            <span className="text-xs font-mono text-slate-400">{u.showPass ? u.Password : '••••'}</span>
                                            <Key size={12} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {u.Status !== 'Active' && (
                                                <button
                                                    onClick={() => handleApprove(u)}
                                                    disabled={isApproving}
                                                    title="Approve User"
                                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEditClick(u)} className="p-2 text-slate-400 hover:text-orange-600 transition-colors"><Edit2 size={16} /></button>
                                            {u.Username !== user.Username && (
                                                <button onClick={() => setDeleteConfirm(u)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-small-info text-slate-500">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div >

            {/* Add User Modal */}
            {
                addingUser && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                        <UserPlus size={20} />
                                    </div>
                                    Add New Member
                                </h3>
                                <button onClick={() => !loading && setAddingUser(false)} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                        Full Name / ID <span className="text-slate-300 normal-case tracking-normal ml-1">(e.g. Naman Mishra)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                        placeholder="Example: Naman Mishra"
                                        value={newUserForm.Username}
                                        onChange={e => setNewUserForm({ ...newUserForm, Username: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Role</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                                            value={newUserForm.Role}
                                            onChange={e => setNewUserForm({ ...newUserForm, Role: e.target.value })}
                                        >
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Department</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none"
                                                value={newUserForm.Department}
                                                onChange={e => setNewUserForm({ ...newUserForm, Department: e.target.value })}
                                            >
                                                <option value="General">General</option>
                                                {DEPARTMENTS.sort().map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mobile Number</label>
                                    <input
                                        type="tel"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                                        placeholder="10-digit number"
                                        value={newUserForm.Mobile}
                                        onChange={e => setNewUserForm({ ...newUserForm, Mobile: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Default Password</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                                        placeholder="Password"
                                        value={newUserForm.Password}
                                        onChange={e => setNewUserForm({ ...newUserForm, Password: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={handleAddUser}
                                    disabled={loading || !newUserForm.Username || !newUserForm.Password}
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black tracking-wide shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Confirm Registration
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Edit User Modal */}
            {
                editingUser && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                        >
                            <h3 className="text-xl font-black text-slate-900 mb-6">Edit User</h3>
                            <div className="space-y-4">
                                <input className="w-full p-3 border rounded-xl" value={editForm.Mobile} onChange={e => setEditForm({ ...editForm, Mobile: e.target.value })} placeholder="Mobile" />
                                <input className="w-full p-3 border rounded-xl" value={editForm.Department} onChange={e => setEditForm({ ...editForm, Department: e.target.value })} placeholder="Department" />
                                <div className="flex gap-4">
                                    <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Cancel</button>
                                    <button onClick={handleSave} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Save Changes</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Access?</h3>
                            <p className="text-slate-500 mb-6 font-medium">Are you sure you want to remove <span className="text-slate-900 font-bold">{deleteConfirm.Username}</span>?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Yes, Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </motion.div >
    );
};

const UsersIcon = ({ className, size }) => (
    <div className={className}><Shield size={size} /></div>
);

export default UserManagement;
