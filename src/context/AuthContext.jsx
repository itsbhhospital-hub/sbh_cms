import { createContext, useContext, useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('sbh_user');
        const loginTime = localStorage.getItem('sbh_login_time');

        if (storedUser) {
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;

            if (loginTime && (now - parseInt(loginTime) > oneHour)) {
                localStorage.removeItem('sbh_user');
                localStorage.removeItem('sbh_login_time');
                setUser(null);
            } else {
                setUser(JSON.parse(storedUser));
            }
        }
        setLoading(false);
    }, []);

    // Active Session Monitor & Auto Logout
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            const loginTime = localStorage.getItem('sbh_login_time');
            if (loginTime && (Date.now() - parseInt(loginTime) > 60 * 60 * 1000)) {
                logout(); // Logs out if active session exceeds 1 hour
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [user]);

    const login = async (username, password) => {
        try {
            const users = await sheetsService.getUsers();

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

            // Fallback: Hardcoded Admin
            if (username === 'admin' && password === 'admin123') {
                const adminUser = { Username: 'admin', Role: 'admin', Department: 'ADMIN', Status: 'Active' };
                setUser(adminUser);
                localStorage.setItem('sbh_user', JSON.stringify(adminUser));
                localStorage.setItem('sbh_login_time', Date.now().toString());
                return adminUser;
            }

            const foundUser = users.find(u =>
                safeGet(u, 'Username') === username &&
                String(safeGet(u, 'Password')) === String(password)
            );

            if (!foundUser) throw new Error('Invalid credentials');

            const userStatus = safeGet(foundUser, 'Status');
            if (userStatus === 'Terminated' || userStatus === 'Rejected') {
                throw new Error('TERMINATED: Your account has been rejected or terminated by the administrator.');
            }
            if (userStatus !== 'Active') {
                throw new Error('Account is pending approval or inactive');
            }

            // Map user data robustly before saving to session
            const userSession = {
                Username: safeGet(foundUser, 'Username'),
                Role: safeGet(foundUser, 'Role'),
                Department: safeGet(foundUser, 'Department'),
                Status: safeGet(foundUser, 'Status'),
                Mobile: safeGet(foundUser, 'Mobile')
            };

            setUser(userSession);
            localStorage.setItem('sbh_user', JSON.stringify(userSession));
            localStorage.setItem('sbh_login_time', Date.now().toString());
            return userSession;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const signup = async (userData) => {
        await sheetsService.registerUser(userData);
        // Auto-login or wait for approval? "id approval ke liye admin id me jaye" -> Wait approval
        // So just return success
        return true;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sbh_user');
        localStorage.removeItem('sbh_login_time');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
