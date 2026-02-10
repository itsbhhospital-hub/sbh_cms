/**
 * Enterprise Date Utility for SBH CMS
 * Enforces Indian Standard Time (IST) display regardless of client device settings.
 */

/**
 * Formats an ISO timestamp or Date object to "DD MMM, hh:mm A" in IST.
 * @param {string|Date} dateInput - The date to format
 * @returns {string} - Formatted string (e.g., "12 Oct, 10:45 AM") or "N/A"
 */
export const formatIST = (dateInput) => {
    if (!dateInput) return 'N/A';

    try {
        const cleanDate = typeof dateInput === 'string' ? dateInput.replace(/'/g, '') : dateInput;
        const date = new Date(cleanDate);
        if (isNaN(date.getTime())) return 'Invalid Date';

        // Strict Format: "10 Feb 2026, 04:15 PM"
        const d = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Formatter usually returns "DD MMM YYYY, hh:mm am"
        // We replace the comma with the requested bullet " • "
        return d.format(date).replace(',', ' •');
    } catch (e) {
        console.error("Date formatting error:", e);
        return 'Error';
    }
};

/**
 * Formats to just Date "DD MMM YYYY" in IST
 */
export const formatDateIST = (dateInput) => {
    if (!dateInput) return '-';
    try {
        const cleanDate = typeof dateInput === 'string' ? dateInput.replace(/'/g, '') : dateInput;
        const date = new Date(cleanDate);
        if (isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return '-';
    }
};

/**
 * Formats to just Time "hh:mm A" in IST
 */
export const formatTimeIST = (dateInput) => {
    if (!dateInput) return '-';
    try {
        const cleanDate = typeof dateInput === 'string' ? dateInput.replace(/'/g, '') : dateInput;
        const date = new Date(cleanDate);
        if (isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (e) {
        return '-';
    }
};

/**
 * Returns current time in strict ISO format with offset (mocking backend for optimistic updates)
 */
export const getCurrentISO = () => {
    return new Date().toISOString();
};
