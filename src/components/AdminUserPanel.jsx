import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';
import { Check, X, Shield, User as UserIcon } from 'lucide-react';

const AdminUserPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // In real app, we would re-fetch. Here we mock local state updates for demo perception
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await sheetsService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const safeGet = (obj, key) => {
        if (!obj) return '';
        const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = norm(key);
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        const foundKey = Object.keys(obj).find(k => norm(k) === target);
        if (foundKey) return obj[foundKey];

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

    const updateUserRole = async (targetUser, newRole, newStatus) => {
        const username = safeGet(targetUser, 'Username');
        try {
            const fullPayload = {
                OldUsername: username,
                Username: username,
                Password: safeGet(targetUser, 'Password'),
                Department: safeGet(targetUser, 'Department'),
                Mobile: safeGet(targetUser, 'Mobile'),
                Role: newRole,
                Status: newStatus
            };

            await sheetsService.updateUser(fullPayload);

            setUsers(users.map(u =>
                safeGet(u, 'Username') === username ? { ...u, Role: newRole, Status: newStatus } : u
            ));
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to update user on server.");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="glass-panel p-8 !bg-white/80 border !border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                    <Shield size={24} />
                </div>
                User Management
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest font-bold">
                            <th className="p-4 rounded-tl-2xl">Username</th>
                            <th className="p-4">Department</th>
                            <th className="p-4">Current Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 rounded-tr-2xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {users.map((user, idx) => {
                            const uName = safeGet(user, 'Username');
                            const uDept = safeGet(user, 'Department');
                            const uRole = safeGet(user, 'Role');
                            const uStatus = safeGet(user, 'Status');

                            return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-white">
                                            {uName[0]?.toUpperCase() || '?'}
                                        </div>
                                        {uName}
                                    </td>
                                    <td className="p-4 text-slate-500 font-medium text-sm">{uDept}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${uRole === 'admin' ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-500/10' :
                                            uRole === 'manager' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/10' :
                                                'bg-slate-100 text-slate-500 ring-1 ring-slate-500/10'
                                            }`}>
                                            {uRole}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${uStatus === 'Active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${uStatus === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                            {uStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 flex items-center gap-3">
                                        {uStatus !== 'Active' && (
                                            <button
                                                onClick={() => updateUserRole(user, uRole, 'Active')}
                                                className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl shadow-lg shadow-green-200 hover:scale-105 active:scale-95 transition-all"
                                                title="Approve User"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <div className="relative">
                                            <select
                                                className="text-xs font-bold border border-slate-200 rounded-lg py-2 pl-3 pr-8 bg-white text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
                                                value={uRole}
                                                onChange={(e) => updateUserRole(user, e.target.value, uStatus)}
                                            >
                                                <option value="user">User</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <div className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400">▼</div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUserPanel;
