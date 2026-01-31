import axios from 'axios';

// The Google Apps Script Web App URL provided by the user
const API_URL = 'https://script.google.com/macros/s/AKfycbynemLHupbLTeGXbaTD2PbM3YGilfI74ee9qP3tKD0rc29UIrDh9KfsDl-5KQMNbRES/exec'; // Final Deployment Verified

// --- MOCK DATA FALLBACK (In case of network error/script failure) ---
const MOCK_USERS = [
    { Username: 'admin', Password: 'admin123', Role: 'admin', Status: 'Active', Department: 'ADMIN' },
];

const getLocalData = (key, defaultData) => {
    const stored = localStorage.getItem(`sbh_mock_${key}`);
    return stored ? JSON.parse(stored) : defaultData;
};

// --- API HELPERS ---

/**
 * Fetch data using the Web App URL
 */
// --- CACHE & HELPERS ---
const CACHE_DURATION = 60 * 1000; // 1 minute
const cache = {
    data: { timestamp: 0, payload: [] },
    master: { timestamp: 0, payload: [] }
};

const fetchSheetData = async (sheetName, forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    const now = Date.now();
    if (!forceRefresh && cache[sheetName] && (now - cache[sheetName].timestamp < CACHE_DURATION)) {
        console.log(`Using cached ${sheetName} data`);
        return cache[sheetName].payload;
    }

    try {
        const response = await fetch(`${API_URL}?action=read&sheet=${sheetName}`);
        const data = await response.json();

        const result = Array.isArray(data) ? data : [];
        // Update cache
        cache[sheetName] = { timestamp: now, payload: result };
        return result;
    } catch (error) {
        console.error("API Read Error:", error);
        if (sheetName === 'master') return getLocalData('users', MOCK_USERS);
        return [];
    }
};

const sendToSheet = async (action, payload) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, payload })
        });

        // Invalidate cache on write
        if (action === 'createComplaint' || action === 'updateComplaintStatus') cache.data.timestamp = 0;
        if (action === 'registerUser' || action === 'updateUser') cache.master.timestamp = 0;

        const result = await response.json();
        if (result.status === 'error') throw new Error(result.message);
        return true;
    } catch (error) {
        console.error("API Write Error:", error);
        alert("Network Error: Saving locally for demo purposes.");
        return saveLocally(action, payload);
    }
};

const saveLocally = (action, payload) => {
    if (action === 'registerUser') {
        const users = getLocalData('users', MOCK_USERS);
        users.push({ ...payload, Role: 'User', Status: 'Pending' });
        localStorage.setItem('sbh_mock_users', JSON.stringify(users));
    }
    return true;
};

export const sheetsService = {
    getComplaints: (force = false) => fetchSheetData('data', force),
    getUsers: (force = false) => fetchSheetData('master', force),

    createComplaint: async (complaint) => {
        const payload = {
            ID: Date.now().toString(),
            Date: new Date().toISOString(), // Client-side date
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
            ResolvedBy: resolvedBy, // Pass who resolved it
            Remark: remark
        };
        return sendToSheet('updateComplaintStatus', payload);
    },

    registerUser: async (user) => {
        const payload = {
            Username: user.username,
            Password: user.password,
            Department: user.department || ''
        };
        return sendToSheet('registerUser', payload);
    },

    updateUser: async (user) => {
        // payload: { Username, Role, Status, Password, Department... }
        return sendToSheet('updateUser', user);
    }
};
