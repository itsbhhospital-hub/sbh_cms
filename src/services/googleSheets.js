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
    { Username: 'AM Sir', Password: 'Am@321', Role: 'SUPER_ADMIN', Status: 'Active', Department: 'ADMIN', Mobile: '0000000000' }
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

// --- DATA NORMALIZATION HELPER ---
const normalizeRows = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    // Map messy keys to standard internal keys
    return rows.map(row => {
        const normalized = {};
        const keys = Object.keys(row);

        const findValue = (possibleKeys) => {
            const match = keys.find(k => {
                const nk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                return possibleKeys.some(p => p.toLowerCase().replace(/[^a-z0-9]/g, '') === nk);
            });
            return match ? row[match] : '';
        };

        // Standard Schema Mapping
        normalized.ID = findValue(['ID', 'Ticket ID', 'TID', 'ComplaintID']);
        normalized.Date = findValue(['Date', 'Timestamp', 'Created Date']);
        normalized.Department = findValue(['Department', 'Dept']);
        normalized.Description = findValue(['Description', 'Desc', 'Complaint']);
        normalized.Status = findValue(['Status']);
        normalized.ReportedBy = findValue(['ReportedBy', 'User', 'Reporter', 'ReporterName', 'Reporter Name']);
        // Complaint_Ratings specific
        normalized.ResolvedBy = findValue(['ResolvedBy', 'AssignedTo', 'Staff', 'StaffName', 'Staff Name', 'Staff Name (Resolver)']);
        normalized.Remark = findValue(['Remark', 'Comments', 'Feedback']);
        normalized.Unit = findValue(['Unit', 'Section', 'Ward']); // NEW: Unit Mapping
        normalized.ResolvedDate = findValue(['Resolved Date', 'Closed Date', 'Closure Date', 'ResolvedDate']); // NEW: Closed Date Mapping
        normalized.Rating = findValue(['Rating', 'Stars', 'Rate']); // NEW: Rating Mapping

        // User_Performance_Ratings specific
        normalized.SolvedCount = findValue(['Total Cases Solved', 'Solved Count', 'Cases Solved']);
        normalized.RatingCount = findValue(['Total Ratings Received', 'Total Ratings', 'Rating Count']);
        normalized.AvgRating = findValue(['Average Rating', 'Avg Rating']);
        normalized.LastUpdated = findValue(['Last Updated', 'Date']);

        // User/Master Sheet specific
        normalized.Username = findValue(['Username', 'User Name', 'Name', 'Staff Name']);
        normalized.Password = findValue(['Password', 'Pass']);
        normalized.Role = findValue(['Role', 'Access Level']);
        normalized.Mobile = findValue(['Mobile', 'Phone', 'Contact']);

        // Default fallbacks for crucial fields if missing
        if (!normalized.ID && normalized.Username) normalized.ID = normalized.Username; // Treat Username as ID for users

        return normalized;
    });
};

const fetchSheetData = async (sheetName, forceRefresh = false, options = {}) => {
    // 1. Check Cache
    const cached = getCachedData(sheetName);

    if (!forceRefresh && cached) {
        // Fetch in background WITHOUT awaiting
        fetch(`${API_URL}?action=read&sheet=${sheetName}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.status !== 'error') {
                    const normalized = normalizeRows(data);
                    setCachedData(sheetName, normalized);
                }
            })
            .catch(err => console.error("Background Refresh error:", err));

        return cached;
    }

    // 2. Fetch Network (Sync)
    try {
        if (!options.silent) window.dispatchEvent(new Event('sbh-loading-start'));
        const response = await fetch(`${API_URL}?action=read&sheet=${sheetName}&t=${Date.now()}`);
        const data = await response.json();

        if (data.status === 'error') throw new Error(data.message);

        const normalized = normalizeRows(Array.isArray(data) ? data : []);

        // 3. Update Cache
        setCachedData(sheetName, normalized);
        return normalized;
    } catch (error) {
        // console.error("API Read Error:", error);
        // Fallback for missing sheets
        if (error.message === 'Sheet not found') return [];

        if (sheetName === 'master') {
            const stale = localStorage.getItem(CACHE_PREFIX + sheetName);
            if (stale) return normalizeRows(JSON.parse(stale).value);
            return normalizeRows(MOCK_USERS);
        }
        return [];
    } finally {
        if (!options.silent) window.dispatchEvent(new Event('sbh-loading-end'));
    }
};

const sendToSheet = async (action, payload, silent = false) => {
    try {
        if (!silent) window.dispatchEvent(new Event('sbh-loading-start'));
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, payload })
        });

        const result = await response.json();

        // Invalidate Cache on Successful Write
        if (action === 'createComplaint' || action === 'updateComplaintStatus') {
            invalidateCache('data'); // 'data' is the sheet name for complaints
            invalidateCache('ratings'); // Force refresh of ratings ledger
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
    } finally {
        if (!silent) window.dispatchEvent(new Event('sbh-loading-end'));
    }
};

export const sheetsService = {
    getComplaints: (force = false, silent = false) => fetchSheetData('data', force, { silent }),
    getUsers: (force = false, silent = false) => fetchSheetData('master', force, { silent }),
    getRatings: (force = false, silent = false) => fetchSheetData('Complaint_Ratings', force, { silent }), // Updated Sheet Name
    getUserPerformance: (force = false, silent = false) => fetchSheetData('User_Performance_Ratings', force, { silent }), // New Function
    getTransferLogs: (force = false, silent = false) => fetchSheetData('Case_Transfer_Log', force, { silent }),
    getExtensionLogs: (force = false, silent = false) => fetchSheetData('Case_Extend_Log', force, { silent }),

    createComplaint: async (complaint, silent = true) => {
        const payload = {
            // ID: Generated on Server (GAS)
            Date: new Date().toISOString(),
            Department: complaint.department,
            Description: complaint.description,
            ReportedBy: complaint.reportedBy,
            Unit: complaint.unit // NEW
        };
        return sendToSheet('createComplaint', payload, silent);
    },

    updateComplaintStatus: async (id, status, resolvedBy, remark = '', targetDate = '', rating = '', silent = true) => {
        const payload = {
            ID: id,
            Status: status,
            ResolvedBy: resolvedBy,
            Remark: remark,
            TargetDate: targetDate, // NEW (For Extensions)
            Rating: rating // NEW (For Feedback)
        };
        return sendToSheet('updateComplaintStatus', payload, silent);
    },

    registerUser: async (user, silent = true) => {
        const payload = {
            Username: user.Username || user.username,
            Password: user.Password || user.password,
            Department: user.Department || user.department || '',
            Mobile: user.Mobile || user.mobile || '',
            Role: user.Role || user.role || 'user',
            Status: user.Status || 'Pending' // Fix: Pass status so Admin can auto-approve
        };
        return sendToSheet('registerUser', payload, silent);
    },

    updateUser: async (user, silent = true) => {
        return sendToSheet('updateUser', user, silent);
    },

    deleteUser: async (username, silent = false) => {
        return sendToSheet('deleteUser', { Username: username }, silent);
    },

    changePassword: async (username, oldPassword, newPassword, silent = false) => {
        const payload = {
            Username: username,
            OldPassword: oldPassword,
            NewPassword: newPassword
        };
        return sendToSheet('changePassword', payload, silent);
    },

    transferComplaint: async (id, newDept, newAssignee, reason, transferredBy, silent = true) => {
        const payload = {
            ID: id,
            NewDepartment: newDept,
            NewAssignee: newAssignee,
            Reason: reason,
            TransferredBy: transferredBy
        };
        return sendToSheet('transferComplaint', payload, silent);
    }
};
