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
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Invalid Date';

        // Intl.DateTimeFormat is the most robust way to force a timezone
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
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
        const date = new Date(dateInput);
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
 * Returns current time in strict ISO format with offset (mocking backend for optimistic updates)
 */
export const getCurrentISO = () => {
    return new Date().toISOString();
};
