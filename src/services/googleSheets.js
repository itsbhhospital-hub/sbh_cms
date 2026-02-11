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
const CACHE_DURATION = 15 * 1000; // 15 Seconds (Optimized for Live Feel)

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

export const getGoogleDriveDirectLink = (url) => {
    if (!url) return '';
    try {
        // Handle "uc?export=view&id=" format
        if (url.includes('drive.google.com') && url.includes('id=')) {
            const match = url.match(/id=([^&]+)/);
            if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
        // Handle "/file/d/" format
        if (url.includes('/file/d/')) {
            const match = url.match(/\/file\/d\/([^/]+)/);
            if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

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
        normalized.Time = findValue(['Time', 'Registered Time', 'Created Time']);
        normalized.Department = findValue(['Department', 'Dept']);
        normalized.Description = findValue(['Description', 'Desc', 'Complaint']);
        const rawStatus = findValue(['Status']);
        normalized.Status = rawStatus ? (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) : ''; // Normalize: Open, Solved, etc.
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
        normalized.ProfilePhoto = getGoogleDriveDirectLink(findValue(['ProfilePhoto', 'Photo', 'Avatar', 'Image']));
        normalized.LastLogin = findValue(['LastLogin', 'Last Login', 'Login Time']);
        normalized.IPDetails = findValue(['IPDetails', 'IP Address', 'IP']);

        // Notification & Log Specifics (NEW)
        // Notification & Log Specifics (NEW)
        normalized.TransferredBy = findValue(['TransferredBy', 'Transferred By', 'Transfer By', 'By', 'transferred_by']);
        normalized.NewDepartment = findValue(['NewDepartment', 'New Department', 'To Dept', 'to_department']);
        normalized.FromDepartment = findValue(['FromDepartment', 'From Department', 'From Dept', 'from_department']);
        normalized.ComplaintID = findValue(['ComplaintID', 'TicketID', 'complaint_id', 'ID']);
        normalized.TransferDate = findValue(['TransferDate', 'Transfer Time', 'transfer_time']);
        normalized.Reason = findValue(['Reason', 'Transfer Reason', 'Extension Reason', 'reason']);
        normalized.ExtendedBy = findValue(['ExtendedBy', 'Extended By', 'extended_by']);
        normalized.TargetDate = findValue(['TargetDate', 'Target Date', 'New Date', 'new_target_date']);

        // Default fallbacks for crucial fields if missing
        if (!normalized.ID && normalized.Username) normalized.ID = normalized.Username; // Treat Username as ID for users

        // OPTIMIZATION: Resize Google Drive Images
        if (normalized.ProfilePhoto && normalized.ProfilePhoto.includes('googleusercontent') === false) {
            if (normalized.ProfilePhoto.includes('sz=w1000')) {
                normalized.ProfilePhoto = normalized.ProfilePhoto.replace('sz=w1000', 'sz=w400');
            }
        }

        return normalized;
    });
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchSheetData = async (sheetName, forceRefresh = false, options = { silent: true }) => {
    // 1. Check Cache
    const cached = getCachedData(sheetName);

    if (!forceRefresh && cached) {
        // Background Refresh (Fire & Forget) - Retries not critical here
        fetch(`${API_URL}?action=read&sheet=${sheetName}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.status !== 'error') {
                    const normalized = normalizeRows(data);
                    setCachedData(sheetName, normalized);
                }
            })
            .catch(err => console.warn("Background refresh skipped:", err.message));

        return cached;
    }

    // 2. Fetch Network (Sync with Retry)
    let retries = 3;
    let delay = 1000;

    const isSilent = options.silent !== false; // Default to silent
    if (!isSilent) window.dispatchEvent(new Event('sbh-loading-start'));

    while (retries > 0) {
        try {
            const response = await fetch(`${API_URL}?action=read&sheet=${sheetName}&t=${Date.now()}`);

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();

            if (data.status === 'error') throw new Error(data.message);

            const normalized = normalizeRows(Array.isArray(data) ? data : []);

            // 3. Update Cache
            setCachedData(sheetName, normalized);

            if (!isSilent) window.dispatchEvent(new Event('sbh-loading-end'));
            return normalized;

        } catch (error) {
            console.warn(`Attempt failed for ${sheetName}. Retries left: ${retries - 1}. Error: ${error.message}`);
            retries--;
            if (retries === 0) {
                if (!isSilent) window.dispatchEvent(new Event('sbh-loading-end'));

                // Fallback logic
                if (error.message.includes('Sheet not found')) return [];

                // NEW: Handle additional optional sheets gracefully
                if (['Complaint_Ratings', 'User_Performance_Ratings', 'Case_Transfer_Log', 'Case_Extend_Log'].includes(sheetName)) {
                    console.warn(`Optional sheet '${sheetName}' load failed. Serving empty data.`);
                    return [];
                }

                if (sheetName === 'master') {
                    const stale = localStorage.getItem(CACHE_PREFIX + sheetName);
                    if (stale) return normalizeRows(JSON.parse(stale).value);
                    return normalizeRows(MOCK_USERS);
                }

                // Return cached data if available even if expired/stale, rather than crashing
                if (cached) return cached;

                return [];
            }
            await wait(delay);
            delay *= 2; // Exponential backoff
        }
    }
};

const sendToSheet = async (action, payload, silent = true) => {
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
        // Alert removed to allow UI to handle specific errors (like Wrong Password)
        throw error;
    } finally {
        if (!silent) window.dispatchEvent(new Event('sbh-loading-end'));
    }
};

const fetchPaginatedData = async (action, params, force = false, silent = true) => {
    // Create a unique cache key based on action and params
    const cacheKey = `${action}_${JSON.stringify(params)}`;

    // 1. Check Cache
    const cached = getCachedData(cacheKey);

    if (!force && cached) {
        // Background Refresh (SWR)
        const query = new URLSearchParams(params).toString();
        fetch(`${API_URL}?action=${action}&${query}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.status !== 'error') {
                    if (data.data && Array.isArray(data.data.items)) {
                        data.data.items = normalizeRows(data.data.items);
                    }
                    setCachedData(cacheKey, data.data);
                }
            })
            .catch(err => console.warn("Background pagination refresh skipped:", err.message));

        return cached;
    }

    if (!silent) window.dispatchEvent(new Event('sbh-loading-start'));

    try {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_URL}?action=${action}&${query}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);

        // Normalize items if present
        if (data.data && Array.isArray(data.data.items)) {
            data.data.items = normalizeRows(data.data.items);
        }

        // 3. Update Cache
        setCachedData(cacheKey, data.data);

        if (!silent) window.dispatchEvent(new Event('sbh-loading-end'));
        return data.data; // { items, total, page ... }

    } catch (error) {
        console.error("Pagination Fetch Error:", error);
        if (!silent) window.dispatchEvent(new Event('sbh-loading-end'));
        return { items: [], total: 0, page: 1 };
    }
};

export const sheetsService = {
    getComplaints: (force = false, silent = false) => fetchSheetData('data', force, { silent }),
    getUsers: (force = false, silent = false) => fetchSheetData('master', force, { silent }),
    getRatings: (force = false, silent = false) => fetchSheetData('Complaint_Ratings', force, { silent }), // Updated Sheet Name
    getUserPerformance: (username, silent = false) => fetchPaginatedData('getUserPerformance', { username }, false, silent),
    getAllUserPerformance: (force = false, silent = false) => fetchSheetData('User_Performance_Ratings', force, { silent }),

    getComplaintsPaginated: (page, limit, department, status, search, reporter, resolver, viewer, viewerRole, viewerDept, force = false, silent = true) => {
        // ADMIN VISIBILITY FIX: If Admin/Super Admin or 'AM Sir', ignore department filter to see ALL
        const isSuper = viewerRole === 'SUPER_ADMIN' || (viewer && viewer.toLowerCase() === 'am sir');
        const effectiveDept = (viewerRole === 'ADMIN' || isSuper) ? '' : (department || viewerDept);

        return fetchPaginatedData('getComplaintsPaginated', {
            page, limit,
            department: effectiveDept,
            status: status || 'All', // Ensure default status
            search, reporter, resolver, viewer, viewerRole, viewerDept
        }, force, silent);
    },

    getDashboardStats: (username, department, role, force = false, silent = true) => {
        const isSuper = role === 'SUPER_ADMIN' || (username && username.toLowerCase() === 'am sir');
        const effectiveDept = (role === 'ADMIN' || isSuper) ? '' : department;
        return fetchPaginatedData('getDashboardStats', { username, department: effectiveDept, role }, force, silent);
    },

    getComplaintById: (id, force = false, silent = false) =>
        fetchPaginatedData('getComplaintById', { id }, force, silent),

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
    },

    // --- MASTER PROFILE UPGRADE METHODS ---

    uploadProfileImage: async (file, username) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64Data = reader.result; // Data URL
                    const response = await sendToSheet('uploadImage', { image: base64Data, username }, true);
                    resolve(response);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = error => reject(error);
        });
    },

    logUserVisit: async (username) => {
        try {
            // 1. Get Real IP from external service (Plan requirement)
            const ipRes = await axios.get('https://api.ipify.org?format=json');
            const ip = ipRes.data.ip;

            // 2. Send to Backend
            return sendToSheet('updateUserIP', { username, ip }, true); // Silent update
        } catch (e) {
            console.warn("IP Tracking failed:", e);
            // Fallback: Send 'Unknown' or retry logic if needed, but don't block user
        }
    }
};
