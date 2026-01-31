import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Check, X, Shield, User as UserIcon, Lock, Search, Save, Edit2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        loadUsers();
    }, []);

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
        setEditForm({ ...u });
    };

    const handleSave = async () => {
        const updatedUsers = users.map(u => u.Username === editingUser ? editForm : u);
        setUsers(updatedUsers);
        setEditingUser(null);

        try {
            await sheetsService.updateUser(editForm);
            alert("User updated successfully!");
        } catch (error) {
            alert("Failed to update user on server. (But updated locally)");
            console.error(error);
        }
    };

    const filteredUsers = users.filter(u =>
        u.Username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user.Role !== 'admin') return <div className="p-10 text-center text-red-500">Access Denied</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto"
        >
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <UsersIcon className="text-blue-700" /> User Management
                    </h1>
                    <p className="text-slate-500 font-medium">Enterprise Access Control & Role Management</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none shadow-sm text-gray-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-gray-200">
                            <tr className="text-slate-700 text-xs font-bold uppercase tracking-wider">
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
                                <tr><td colSpan="7" className="p-10 text-center text-slate-500">Loading directory...</td></tr>
                            ) : filteredUsers.map((u, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                                {u.Username[0].toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800">{u.Username}</span>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded bg-white text-sm w-full"
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
                                            <span className="text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded text-xs border border-slate-200">{u.Department}</span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <input
                                                type="text"
                                                className="w-32 p-1.5 border rounded bg-white text-sm"
                                                placeholder="9198..."
                                                value={editForm.Mobile || ''}
                                                onChange={(e) => setEditForm({ ...editForm, Mobile: e.target.value })}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Phone size={14} className="text-slate-400" />
                                                {u.Mobile || <span className="text-slate-300 italic">No Mobile</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded bg-white text-sm"
                                                value={editForm.Role || 'user'}
                                                onChange={(e) => setEditForm({ ...editForm, Role: e.target.value })}
                                            >
                                                <option value="user">User</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${u.Role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                u.Role === 'manager' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {u.Role}
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {/* Status / Approve Button */}
                                        {editingUser === u.Username ? (
                                            <select
                                                className="p-2 border rounded bg-white text-sm"
                                                value={editForm.Status || 'Pending'}
                                                onChange={(e) => setEditForm({ ...editForm, Status: e.target.value })}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Active">Active</option>
                                                <option value="Suspended">Suspended</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`flex items-center gap-1.5 font-bold text-sm ${u.Status === 'Active' ? 'text-emerald-600' : 'text-amber-600'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${u.Status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                    {u.Status}
                                                </span>
                                                {/* Explicit Approve Button for Pending Users */}
                                                {u.Status === 'Pending' && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(u.Username);
                                                            setEditForm({ ...u, Status: 'Active' });
                                                            // Auto-save effectively
                                                            setTimeout(() => document.getElementById('save-btn-' + u.Username)?.click(), 100);
                                                        }}
                                                        className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded shadow hover:bg-green-700 ml-2"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {editingUser === u.Username ? (
                                            <input
                                                type="text"
                                                className="w-24 p-1.5 border rounded bg-white text-sm font-mono"
                                                value={editForm.Password || ''}
                                                onChange={(e) => setEditForm({ ...editForm, Password: e.target.value })}
                                            />
                                        ) : (
                                            <span className="text-gray-300 font-mono text-xs cursor-help" title={u.Password}>••••••</span>
                                        )}
                                    </td>

                                    <td className="p-4 text-right">
                                        {editingUser === u.Username ? (
                                            <div className="flex justify-end gap-2">
                                                <button id={`save-btn-${u.Username}`} onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 shadow-sm"><Save size={16} /></button>
                                                <button onClick={() => setEditingUser(null)} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit User">
                                                <Edit2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

// Helper Icon
const UsersIcon = ({ className }) => (
    <div className={`p-2 bg-blue-50 rounded-lg shadow-sm ${className}`}>
        <Shield size={28} />
    </div>
);

export default UserManagement;
