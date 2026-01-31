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

    const updateUserRole = async (username, newRole, newStatus) => {
        // NOTE: This usually requires a server-side update to the sheet row.
        // Client-side without Row ID is hard. We will "Mock" the update in the UI.
        console.log(`Updating ${username} to ${newRole}/${newStatus}`);

        setUsers(users.map(u =>
            u.Username === username ? { ...u, Role: newRole, Status: newStatus } : u
        ));

        // In a real implementation: find row index, update cells.
        alert("User updated! (Note: Actual sheet update requires Backend/Script, this is UI only)");
    };

    if (loading) return <div className="text-center py-4">Loading users...</div>;

    return (
        <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-teal-900">
                <Shield size={24} /> User Management
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-600 text-sm">
                            <th className="p-3">Username</th>
                            <th className="p-3">Department</th>
                            <th className="p-3">Current Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-white/30 transition-colors">
                                <td className="p-3 font-medium">{user.Username}</td>
                                <td className="p-3">{user.Department}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.Role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            user.Role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.Role}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {user.Status}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                    {user.Status !== 'Active' && (
                                        <button
                                            onClick={() => updateUserRole(user.Username, user.Role, 'Active')}
                                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                            title="Approve User"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <select
                                        className="text-xs border rounded p-1 bg-white/50"
                                        value={user.Role}
                                        onChange={(e) => updateUserRole(user.Username, e.target.value, 'Active')}
                                    >
                                        <option value="user">User</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUserPanel;
