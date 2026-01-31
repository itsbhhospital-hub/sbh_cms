import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="glass-panel mx-4 mt-4 px-6 py-3 flex justify-between items-center sticky top-4 z-50">
            <div className="flex items-center gap-3">
                <img src="/src/assets/logo.jpg" alt="SBH Logo" className="h-10 w-10 rounded-full object-cover" />
                <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                    SBH CMS
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white/50 px-3 py-1.5 rounded-full">
                    <User size={16} />
                    <span>{user?.Username} ({user?.Role})</span>
                </div>
                <button
                    onClick={logout}
                    className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
