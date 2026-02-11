import React from 'react';
import { useAnalytics } from '../../context/AnalyticsContext';
import TicketFlowMap from './TicketFlowMap';
import DepartmentLoadTable from './DepartmentLoadTable';
import StaffRankingCard from './StaffRankingCard';
import { AlertTriangle, Zap, RefreshCw } from 'lucide-react';

const DirectorDashboard = () => {
    const { loading, flowStats, deptStats, staffStats, delayRisks, alerts, lastUpdated } = useAnalytics();

    if (loading) return (
        <div className="w-full h-32 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <span className="text-xs font-bold text-slate-400 animate-pulse">Initializing Analytics Engine...</span>
        </div>
    );

    return (
        <div className="space-y-6 mb-8">
            {/* Header / Alerts Strip */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500" fill="currentColor" />
                        Control Center
                        <span className="text-[10px] font-mono bg-slate-800 text-white px-2 py-0.5 rounded-full opacity-60">LIVE</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-400">
                        System Pulse • Last Update: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                {/* Smart Alerts Ticker */}
                {alerts.length > 0 && (
                    <div className="flex-1 overflow-hidden h-8 bg-rose-50 border border-rose-100 rounded-lg flex items-center px-3 max-w-xl">
                        <AlertTriangle size={14} className="text-rose-500 mr-2 shrink-0 animate-pulse" />
                        <div className="flex gap-4 animate-marquee whitespace-nowrap">
                            {alerts.map((a, i) => (
                                <span key={i} className="text-xs font-bold text-rose-700">{a.msg}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* 1. Ticket Flow (Full Width) */}
                <div className="md:col-span-12">
                    <TicketFlowMap stats={flowStats} />
                </div>

                {/* 2. Dept Load (Half) */}
                <div className="md:col-span-4">
                    <DepartmentLoadTable data={deptStats} />
                </div>

                {/* 3. Staff Ranking (Half) */}
                <div className="md:col-span-4">
                    <StaffRankingCard staff={staffStats} />
                </div>

                {/* 4. Delay Risk Panel */}
                <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Delay Predictions</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {delayRisks.length === 0 ? (
                            <div className="text-center py-10 text-emerald-500 text-xs font-bold bg-emerald-50 rounded-xl">
                                System Healthy. No risks detected.
                            </div>
                        ) : (
                            delayRisks.map((risk, i) => (
                                <div key={i} className={`p-3 rounded-xl border ${risk.riskLevel === 'HIGH' ? 'bg-rose-50 border-rose-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800 text-xs">#{risk.ID}</span>
                                        <span className="text-[10px] font-black text-white bg-slate-800 px-1.5 py-0.5 rounded">{risk.hours}h</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-1 truncate">{risk.Department}</p>
                                    <div className="mt-2 text-[10px] font-bold text-slate-400">
                                        Assigned: <span className="text-slate-600">{risk.ResolvedBy || 'Unassigned'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DirectorDashboard;
