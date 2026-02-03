import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Check, X, Shield, User as UserIcon, Lock, Search, Save, Edit2, Phone, ChevronLeft, ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Helper to safely get properties (handles case/spaces/common variations)
    const safeGet = (obj, key) => {
        if (!obj) return '';
        const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = norm(key);

        // 1. Direct match
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];

        // 2. Normalized match (handles case, spaces, special chars)
        const foundKey = Object.keys(obj).find(k => norm(k) === target);
        if (foundKey) return obj[foundKey];

        // 3. Special handling for common aliases/mismatches
        if (target === 'id' || target === 'tid' || target === 'ticketid') {
            const idKey = Object.keys(obj).find(k => {
                const nk = norm(k);
                return nk === 'id' || nk === 'tid' || nk === 'ticketid' || nk.includes('ticketid') || (nk.includes('id') && nk.length < 15);
            });
            if (idKey) return obj[idKey];
        }

        if (target === 'mobile' || target === 'phone') {
            const mKey = Object.keys(obj).find(k => norm(k).includes('mobile') || norm(k).includes('phone'));
            if (mKey) return obj[mKey];
        }

        if (target === 'department' || target === 'dept') {
            const dKey = Object.keys(obj).find(k => norm(k).includes('department') || norm(k).includes('dept'));
            if (dKey) return obj[dKey];
        }

        return '';
    };

    // Add User State
    const [addingUser, setAddingUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ Username: '', Password: '', Department: 'General', Mobile: '', Role: 'user' });

    // Delete & Reject Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { user: u }
    const [rejectConfirm, setRejectConfirm] = useState(null); // { user: u }
    const [actionSuccess, setActionSuccess] = useState(null); // "User Deleted Successfully"

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (actionSuccess) {
            const timer = setTimeout(() => setActionSuccess(null), 3000); // Auto hide after 3s
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
        const username = safeGet(u, 'Username');
        setEditingUser(username);
        // Store OldUsername to identify row if username is changed
        setEditForm({
            Username: username,
            Password: safeGet(u, 'Password'),
            Department: safeGet(u, 'Department'),
            Mobile: safeGet(u, 'Mobile'),
            Role: safeGet(u, 'Role'),
            Status: safeGet(u, 'Status'),
            OldUsername: username
        });
    };

    const handleSave = async () => {
        // Optimistic Update
        const updatedUsers = users.map(u => u.Username === editingUser ? { ...editForm, Username: editForm.Username } : u);
        setUsers(updatedUsers);
        setEditingUser(null);

        try {
            await sheetsService.updateUser(editForm);
            setActionSuccess("User updated successfully! 🎉");
        } catch (error) {
            alert("Failed to update user on server. Please refresh.");
            console.error(error);
            loadUsers(); // Revert on failure
        }
    };

    // 1. Initial Click -> Open Modal
    const handleDeleteClick = (targetUser) => {
        setDeleteConfirm(targetUser);
    };

    // 2. Confirmed in Modal -> Execute
    const executeDelete = async () => {
        if (!deleteConfirm) return;

        const targetUser = deleteConfirm;
        setDeleteConfirm(null); // Close modal

        // Optimistic Remove
        const previousUsers = [...users];
        setUsers(users.filter(u => u.Username !== targetUser.Username));

        try {
            await sheetsService.deleteUser(targetUser.Username);
            setActionSuccess("User deleted successfully! 🗑️");
        } catch (error) {
            console.error("Delete Error details:", error);
            // Better Error Message 
            alert(`Error deleting user: ${error.message || "Connection failed"}. Check your internet or script permissions.`);
            setUsers(previousUsers); // Revert
        }
    };

    const handleAddUser = async () => {
        if (!newUserForm.Username || !newUserForm.Password || !newUserForm.Mobile) {
            alert("Username, Password, and Mobile Number are mandatory.");
            return;
        }

        // Admin-created users are automatically approved (Active)
        const tempUser = {
            Username: newUserForm.Username.trim(),
            Password: newUserForm.Password.trim(),
            Department: newUserForm.Department || 'General',
            Mobile: newUserForm.Mobile.trim(),
            Role: newUserForm.Role || 'user',
            Status: 'Active' // Auto-approve
        };

        // Optimistic update
        setUsers([...users, tempUser]);
        setAddingUser(false);
        setNewUserForm({ Username: '', Password: '', Department: 'General', Mobile: '', Role: 'user' });

        try {
            await sheetsService.registerUser(tempUser);
            setActionSuccess("User created & approved automatically! 🚀");
            loadUsers(); // Refresh to get actual data
        } catch (error) {
            alert("Failed to add user.");
            console.error(error);
            loadUsers(); // Revert
        }
    };

    const filteredUsers = users.filter(u =>
        safeGet(u, 'Username').toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeGet(u, 'Department').toLowerCase().includes(searchTerm.toLowerCase())
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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <UsersIcon className="text-emerald-600 bg-emerald-50 p-2 rounded-xl" size={40} />
                        User Management
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 ml-1">
                        Total Users: <span className="font-bold text-slate-800">{users.length}</span> •
                        Active: <span className="font-bold text-emerald-600">{users.filter(u => safeGet(u, 'Status') === 'Active').length}</span>
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
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
                    <button
                        onClick={() => setAddingUser(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        <UserPlus size={20} />
                        <span className="hidden md:inline">Add User</span>
                    </button>
                </div>
            </div>

            {/* Success Toast */}
            {actionSuccess && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600/90 backdrop-blur-xl text-white px-8 py-4 rounded-[2rem] shadow-2xl border border-white/20 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-white text-emerald-600 p-1 rounded-full shadow-inner">
                        <Check size={18} strokeWidth={4} />
                    </div>
                    <span className="font-bold tracking-wide text-xs uppercase">{actionSuccess}</span>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm border-2 border-red-100 animate-in fade-in zoom-in duration-200 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete User?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            This will permanently remove <span className="font-bold text-slate-800">{safeGet(deleteConfirm, 'Username')}</span>.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-colors"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {addingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800">Add New User</h3>
                            <button onClick={() => setAddingUser(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username / Full Name (Mandatory)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                                    value={newUserForm.Username}
                                    onChange={e => setNewUserForm({ ...newUserForm, Username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password (Mandatory)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                                    value={newUserForm.Password}
                                    onChange={e => setNewUserForm({ ...newUserForm, Password: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 bg-white"
                                        value={newUserForm.Department}
                                        onChange={e => setNewUserForm({ ...newUserForm, Department: e.target.value })}
                                    >
                                        <option value="General">General</option>
                                        <option value="IT">IT</option>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="HR">HR</option>
                                        <option value="DOCTOR">DOCTOR</option>
                                        <option value="NURSING">NURSING</option>
                                        <option value="OTHER">OTHER</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile (Mandatory)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                                        placeholder="10-digit mobile"
                                        value={newUserForm.Mobile}
                                        onChange={e => setNewUserForm({ ...newUserForm, Mobile: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User Role</label>
                                <select
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 bg-white"
                                    value={newUserForm.Role}
                                    onChange={e => setNewUserForm({ ...newUserForm, Role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAddUser}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all mt-2"
                            >
                                Create & Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${safeGet(u, 'Role') === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {safeGet(u, 'Username')[0]?.toUpperCase() || '?'}
                                            </div>
                                            {editingUser === safeGet(u, 'Username') ? (
                                                <input
                                                    type="text"
                                                    className="w-32 p-1 border rounded bg-white text-sm font-bold focus:border-emerald-500 outline-none"
                                                    value={editForm.Username}
                                                    onChange={(e) => setEditForm({ ...editForm, Username: e.target.value })}
                                                />
                                            ) : (
                                                <span className="font-bold text-slate-700">{safeGet(u, 'Username')}</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        {editingUser === safeGet(u, 'Username') ? (
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
                                            <span className="text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">{safeGet(u, 'Department')}</span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === safeGet(u, 'Username') ? (
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
                                                {safeGet(u, 'Mobile') || <span className="text-slate-300 italic">--</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === safeGet(u, 'Username') ? (
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
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${safeGet(u, 'Role') === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                safeGet(u, 'Role') === 'manager' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {safeGet(u, 'Role')}
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === safeGet(u, 'Username') ? (
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
                                                <div className={`w-2 h-2 rounded-full ${safeGet(u, 'Status') === 'Active' ? 'bg-emerald-500' : safeGet(u, 'Status') === 'Terminated' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                                <span className={`text-sm font-bold ${safeGet(u, 'Status') === 'Active' ? 'text-emerald-700' : safeGet(u, 'Status') === 'Terminated' ? 'text-red-700' : 'text-amber-600'}`}>
                                                    {safeGet(u, 'Status')}
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === safeGet(u, 'Username') ? (
                                            <input
                                                type="text"
                                                className="w-24 p-2 border rounded-lg bg-white text-sm font-mono outline-none focus:border-emerald-500"
                                                value={editForm.Password || ''}
                                                onChange={(e) => setEditForm({ ...editForm, Password: e.target.value })}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 group/pass">
                                                <span className="text-slate-500 font-mono text-xs">
                                                    {u.showPass ? safeGet(u, 'Password') : '••••'}
                                                </span>
                                                <button
                                                    onClick={() => setUsers(users.map(item => item === u ? { ...item, showPass: !item.showPass } : item))}
                                                    className="opacity-0 group-hover/pass:opacity-100 text-slate-400 hover:text-emerald-600 transition-all font-bold text-[10px] uppercase"
                                                >
                                                    {u.showPass ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                        )}
                                    </td>


                                    <td className="p-4 text-right">
                                        {editingUser === safeGet(u, 'Username') ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-colors" title="Save Changes"><Save size={16} /></button>
                                                <button onClick={() => setEditingUser(null)} className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors" title="Cancel"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1 items-center">
                                                {safeGet(u, 'Status') === 'Pending' && (
                                                    <button
                                                        onClick={() => {
                                                            const username = safeGet(u, 'Username');
                                                            sheetsService.updateUser({
                                                                OldUsername: username,
                                                                Username: username,
                                                                Status: 'Active'
                                                            }).then(() => {
                                                                loadUsers();
                                                                setActionSuccess(`User ${username} Approved! ✅`);
                                                            });
                                                        }}
                                                        className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded shadow-sm hover:scale-105 transition-transform"
                                                    >
                                                        APPROVE
                                                    </button>
                                                )}
                                                {safeGet(u, 'Status') === 'Pending' && safeGet(u, 'Username') !== user.Username && (
                                                    <button
                                                        onClick={() => setRejectConfirm(u)}
                                                        className="px-2 py-1 bg-red-500 text-white text-[10px] font-black rounded shadow-sm hover:scale-105 transition-transform"
                                                    >
                                                        REJECT
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditClick(u)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit User">
                                                    <Edit2 size={18} />
                                                </button>
                                                {safeGet(u, 'Username') !== user.Username && (
                                                    <button onClick={() => handleDeleteClick(u)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete User">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Reject Confirmation Modal */}
                {rejectConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden border border-red-50"
                        >
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-red-50 to-transparent -z-10"></div>

                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-200/50">
                                <Lock className="text-red-600" size={32} />
                            </div>

                            <h3 className="text-2xl font-black text-slate-800 mb-2">Reject Account?</h3>
                            <p className="text-red-600 font-bold text-[10px] uppercase tracking-widest mb-4">Termination Request</p>

                            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                                Are you sure you want to REJECT or TERMINATE <span className="font-bold text-slate-800">{safeGet(rejectConfirm, 'Username')}</span>? They will be blocked from logging in.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        const username = safeGet(rejectConfirm, 'Username').trim();
                                        const target = rejectConfirm;
                                        setRejectConfirm(null);
                                        try {
                                            await sheetsService.updateUser({
                                                OldUsername: username,
                                                Username: username,
                                                Status: 'Terminated'
                                            });
                                            loadUsers();
                                            setActionSuccess("User Terminated Successfully! 🚫");
                                        } catch (err) {
                                            console.error(err);
                                            alert("Failed to terminate user.");
                                        }
                                    }}
                                    className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-[0.98]"
                                >
                                    Confirm Rejection
                                </button>
                                <button
                                    onClick={() => setRejectConfirm(null)}
                                    className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all"
                                >
                                    Keep User
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

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

