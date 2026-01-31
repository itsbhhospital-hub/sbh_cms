import { createContext, useContext, useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheets';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('sbh_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // In a real app, successful login returns a token. 
            // Here we fetch all users and find a match (Security Warning: Logic is Client Side)
            const users = await sheetsService.getUsers(true);

            // Fallback: Hardcoded Admin for immediate access if sheet is empty or failing
            if (username === 'admin' && password === 'admin123') {
                const adminUser = { Username: 'admin', Role: 'admin', Department: 'ADMIN', Status: 'Active' };
                setUser(adminUser);
                localStorage.setItem('sbh_user', JSON.stringify(adminUser));
                return adminUser;
            }

            const foundUser = users.find(u => u.Username === username && u.Password === password);

            if (!foundUser) {
                throw new Error('Invalid credentials');
            }

            if (foundUser.Status !== 'Active') {
                throw new Error('Account is pending approval or inactive');
            }

            setUser(foundUser);
            localStorage.setItem('sbh_user', JSON.stringify(foundUser));
            return foundUser;
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
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
