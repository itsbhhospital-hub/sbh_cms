import axios from 'axios';

// !!! IMPORTANT: AUTHORIZATION REQUIRED !!!
// If you redeploy the script, you MUST update this URL.
// 1. Go to Google Apps Script -> Deploy -> Manage Deployments
// 2. Copy the 'Web App URL'
// 3. Paste it below:
const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

// --- MOCK DATA FALLBACK ---
const MOCK_USERS = [
    { Username: 'admin', Password: 'admin123', Role: 'admin', Status: 'Active', Department: 'ADMIN' },
];

// --- LOCAL STORAGE CACHE HELPERS ---
const CACHE_PREFIX = 'sbh_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes (Increased for better performance)

const getCachedData = (key) => {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const { value, timestamp } = JSON.parse(item);
        const now = Date.now();

        if (now - timestamp > CACHE_DURATION) {
            // console.log(`[Cache] Expired for ${key}`);
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        // console.log(`[Cache] Hit for ${key}`);
        return value;
    } catch (e) {
        console.error("Cache Read Error", e);
        return null;
    }
};

const setCachedData = (key, value) => {
    try {
        const item = {
            value,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
        console.error("Cache Write Error", e);
    }
};

const invalidateCache = (key) => {
    localStorage.removeItem(CACHE_PREFIX + key);
};

// --- API HELPERS ---

const fetchSheetData = async (sheetName, forceRefresh = false) => {
    // 1. Check Cache
    if (!forceRefresh) {
        const cached = getCachedData(sheetName);
        if (cached) return cached;
    }

    // 2. Fetch Network
    try {
        // console.log(`[API] Fetching ${sheetName}...`);
        // Use fetch with no-cache to ensure we get fresh data from server when we actually ask
        const response = await fetch(`${API_URL}?action=read&sheet=${sheetName}`, { cache: "no-store" });
        const data = await response.json();

        // Check for Script Error
        if (data.status === 'error') throw new Error(data.message);

        const result = Array.isArray(data) ? data : [];

        // 3. Update Cache
        setCachedData(sheetName, result);
        return result;
    } catch (error) {
        console.error("API Read Error:", error);

        // Fallback to cache even if expired if network fails? 
        // For now, if master fails and we have nothing, return mock
        if (sheetName === 'master') {
            // Try to get expired cache if available?
            const stale = localStorage.getItem(CACHE_PREFIX + sheetName);
            if (stale) {
                console.warn("Returning stale cache due to API error");
                return JSON.parse(stale).value;
            }
            return MOCK_USERS;
        }
        return [];
    }
};

const sendToSheet = async (action, payload) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, payload })
        });

        const result = await response.json();

        // Invalidate Cache on Successful Write
        if (action === 'createComplaint' || action === 'updateComplaintStatus') {
            invalidateCache('data'); // 'data' is the sheet name for complaints
        }
        if (action === 'registerUser' || action === 'updateUser') {
            invalidateCache('master'); // 'master' is the sheet name for users
        }

        if (result.status === 'error') throw new Error(result.message);
        return result;
    } catch (error) {
        console.error("API Write Error:", error);
        alert(`API Connection Failed: ${error.message}. Please check your connection.`);
        throw error;
    }
};

export const sheetsService = {
    getComplaints: (force = false) => fetchSheetData('data', force),
    getUsers: (force = false) => fetchSheetData('master', force),

    createComplaint: async (complaint) => {
        const payload = {
            // ID: Generated on Server (GAS)
            Date: new Date().toISOString(),
            Department: complaint.department,
            Description: complaint.description,
            ReportedBy: complaint.reportedBy
        };
        return sendToSheet('createComplaint', payload);
    },

    updateComplaintStatus: async (id, status, resolvedBy, remark = '') => {
        const payload = {
            ID: id,
            Status: status,
            ResolvedBy: resolvedBy,
            Remark: remark
        };
        return sendToSheet('updateComplaintStatus', payload);
    },

    registerUser: async (user) => {
        const payload = {
            Username: user.Username || user.username,
            Password: user.Password || user.password,
            Department: user.Department || user.department || '',
            Mobile: user.Mobile || user.mobile || '',
            Role: user.Role || user.role || 'user'
        };
        return sendToSheet('registerUser', payload);
    },

    updateUser: async (user) => {
        return sendToSheet('updateUser', user);
    },

    deleteUser: async (username) => {
        return sendToSheet('deleteUser', { Username: username });
    }
};
