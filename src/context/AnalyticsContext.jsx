import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { sheetsService } from '../services/googleSheets';

const AnalyticsContext = createContext(null);

export const AnalyticsProvider = ({ children }) => {
    const { user } = useAuth();
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // 1. Raw Data (Cached in Memory)
    const [allComplaints, setAllComplaints] = useState([]);
    const [allRatings, setAllRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    // 2. Computed Metrics (Derived from Raw Data)
    const [deptStats, setDeptStats] = useState([]);
    const [staffStats, setStaffStats] = useState([]);
    const [delayRisks, setDelayRisks] = useState([]);
    const [flowStats, setFlowStats] = useState({ open: 0, solved: 0, delayed: 0, transferred: 0 });
    const [alerts, setAlerts] = useState([]);

    const isAdmin = user?.Role === 'ADMIN' || user?.Role === 'SUPER_ADMIN';

    // -------------------------------------------------------------------------
    // 🔄 POLLING ENGINE
    // -------------------------------------------------------------------------

    // Poll Data - Every 10s (Balances freshness vs API Quota)
    // "Real-time" effect is simulated by frequent UI updates, but data sync is 10s.
    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchData = async () => {
            try {
                // Fetch Complaints (Silent Mode)
                const complaints = await sheetsService.getComplaints(true, true);
                // Fetch Ratings (Silent Mode)
                const ratings = await sheetsService.getRatings(true, true);

                if (isMounted) {
                    setAllComplaints(complaints);
                    setAllRatings(ratings);
                    setLastUpdated(new Date());
                    setLoading(false);
                }
            } catch (error) {
                console.error("Analytics Poll Failed:", error);
            }
        };

        // Initial Fetch
        fetchData();

        const interval = setInterval(fetchData, 10000);
        return () => {
            clearInterval(interval);
            isMounted = false;
        };
    }, [user]);

    // -------------------------------------------------------------------------
    // 🧠 INTELLIGENCE ENGINE (Runs when data changes)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (allComplaints.length === 0) return;

        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // --- 1. Department Load & Flow Stats ---
        const depts = {};
        const flow = { open: 0, solved: 0, delayed: 0, transferred: 0 };
        const risks = [];
        const alertsList = [];

        // Staff Performance Map
        const staffMap = {};

        allComplaints.forEach(c => {
            const status = String(c.Status || '').toLowerCase();
            const dept = c.Department || 'Unknown';
            const resolver = c.ResolvedBy || c.AssignedTo || 'Unassigned';
            const date = c.Date ? new Date(c.Date) : null;
            const solvedDate = c.ResolvedDate ? new Date(c.ResolvedDate) : null;

            // Init Dept
            if (!depts[dept]) depts[dept] = { open: 0, pending: 0, delayed: 0, total: 0, solved: 0 };

            // Counts
            depts[dept].total++;
            if (status === 'open') {
                depts[dept].open++;
                flow.open++;
            } else if (['pending', 'in-progress', 're-open'].includes(status)) {
                depts[dept].pending++;
                flow.open++; // Count as active flow
            } else if (['solved', 'resolved', 'closed', 'force close'].includes(status)) {
                depts[dept].solved++;
                if (solvedDate && solvedDate >= startOfDay) flow.solved++;
            } else if (status === 'transferred') {
                flow.transferred++;
            } else if (status === 'delayed') {
                depts[dept].delayed++;
                flow.delayed++;
            }

            // --- Delay Risk Detection ---
            if (!['solved', 'resolved', 'closed', 'force close'].includes(status) && date) {
                const hoursOpen = (now - date) / (1000 * 60 * 60);

                // Actual Delayed Status
                if (status === 'delayed') {
                    // Already marked
                } else {
                    // Predicted Risk
                    if (hoursOpen > 22) {
                        risks.push({ ...c, riskLevel: 'HIGH', hours: hoursOpen.toFixed(1) });
                    } else if (hoursOpen > 18) {
                        risks.push({ ...c, riskLevel: 'MEDIUM', hours: hoursOpen.toFixed(1) });
                    }
                }
            }

            // --- Staff Metrics ---
            if (resolver !== 'Unassigned') {
                if (!staffMap[resolver]) staffMap[resolver] = { name: resolver, solved: 0, ratings: [], active: 0 };

                if (['solved', 'resolved', 'closed'].includes(status)) {
                    staffMap[resolver].solved++;
                } else {
                    staffMap[resolver].active++;
                }
            }
        });

        // --- 2. Staff Ratings Integration ---
        // (Assuming allRatings has { Staff Name, Rating })
        allRatings.forEach(r => {
            const name = r['Staff Name'];
            const rating = parseInt(r.Rating);
            if (name && !isNaN(rating) && staffMap[name]) {
                staffMap[name].ratings.push(rating);
            }
        });

        // Final Staff Stats Calculation
        const finalStaffStats = Object.values(staffMap).map(s => {
            const avgRating = s.ratings.length ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) : 0;
            const efficiency = (s.solved * avgRating) || 0; // Simple Formula
            return {
                ...s,
                avgRating: avgRating.toFixed(1),
                efficiency: efficiency.toFixed(1)
            };
        }).sort((a, b) => b.efficiency - a.efficiency); // Top Performers First

        // --- 3. Alerts Generation ---
        Object.entries(depts).forEach(([d, stats]) => {
            if (stats.open > 15) alertsList.push({ type: 'overload', msg: `High Load: ${d} (${stats.open} Active)` });
            if (stats.delayed > 5) alertsList.push({ type: 'delay', msg: `Delay Spike: ${d}` });
        });

        if (risks.length > 10) alertsList.push({ type: 'risk', msg: `${risks.length} Cases approaching Deadline` });

        // Update State
        setDeptStats(Object.entries(depts).map(([name, stats]) => ({ name, ...stats })));
        setStaffStats(finalStaffStats);
        setDelayRisks(risks);
        setFlowStats(flow);
        setAlerts(alertsList);

    }, [allComplaints, allRatings]);

    return (
        <AnalyticsContext.Provider value={{
            loading,
            lastUpdated,
            deptStats,
            staffStats,
            delayRisks,
            flowStats,
            alerts,
            isAdmin
        }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => useContext(AnalyticsContext);
