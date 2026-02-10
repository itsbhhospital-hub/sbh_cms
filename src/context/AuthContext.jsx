import { createContext, useContext, useState, useEffect } from 'react';
import { sheetsService, getGoogleDriveDirectLink } from '../services/googleSheets';

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
                try {
                    const parsed = JSON.parse(storedUser);
                    // HOTFIX: Ensure Profile Photo URL is normalized even for cached sessions
                    if (parsed.ProfilePhoto) {
                        parsed.ProfilePhoto = getGoogleDriveDirectLink(parsed.ProfilePhoto);
                    }
                    setUser(parsed);
                } catch (e) {
                    console.error("Failed to parse stored user", e);
                    setUser(null);
                }
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

            const foundUser = users.find(u =>
                String(u.Username).toLowerCase().trim() === String(username).toLowerCase().trim()
            );

            if (!foundUser) {
                console.warn("LOGIN FAILED: User not found.");
                throw new Error('User not found. Please check username.');
            }

            if (String(foundUser.Password) !== String(password)) {
                console.warn("LOGIN FAILED: Wrong password.");
                throw new Error('Incorrect password. Please try again.');
            }

            if (String(foundUser.Status) === 'Terminated' || String(foundUser.Status) === 'Rejected') {
                throw new Error('TERMINATED: Your account has been rejected or terminated by the administrator.');
            }
            if (String(foundUser.Status) !== 'Active') {
                throw new Error('Account is pending approval or inactive');
            }

            // Map user data robustly before saving to session
            const userSession = {
                Username: foundUser.Username,
                Role: String(foundUser.Username).toLowerCase().trim() === 'am sir' ? 'SUPER_ADMIN' : foundUser.Role,
                Department: foundUser.Department,
                Status: foundUser.Status,
                Mobile: foundUser.Mobile,
                ProfilePhoto: foundUser.ProfilePhoto // Added for Avatar Display
            };

            setUser(userSession);
            localStorage.setItem('sbh_user', JSON.stringify(userSession));
            localStorage.setItem('sbh_login_time', Date.now().toString());

            // MASTER PROFILE UPGRADE: Log IP Visit (Fire & Forget)
            sheetsService.logUserVisit(userSession.Username).catch(err => console.warn("Visit log failed", err));

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

    const updateUserSession = (updates) => {
        const newUser = { ...user, ...updates };
        setUser(newUser);
        localStorage.setItem('sbh_user', JSON.stringify(newUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, updateUserSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
