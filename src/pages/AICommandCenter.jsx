import React, { useMemo } from 'react';
import { useIntelligence } from '../context/IntelligenceContext';
import { useAnalytics } from '../context/AnalyticsContext';
import { Activity, AlertCircle, BarChart3, Clock, TrendingUp, Zap, Building2, User, CheckCircle } from 'lucide-react';

const AICommandCenter = () => {
    const { stressIndex, loadWarnings, crisisRisk, deptTrends, lastAiPulse } = useIntelligence();
    const { flowStats, staffStats, allComplaints } = useAnalytics();

    const stressColor = useMemo(() => {
        if (stressIndex > 70) return 'text-rose-500 border-rose-200 bg-rose-50';
        if (stressIndex > 40) return 'text-amber-500 border-amber-200 bg-amber-50';
        return 'text-emerald-500 border-emerald-200 bg-emerald-50';
    }, [stressIndex]);

    const dailyActions = useMemo(() => {
        const actions = [];
        if (stressIndex > 50) actions.push("Urgent: High operational pressure detected. Review delayed cases.");
        if (loadWarnings.length > 0) actions.push(`Optimize: ${loadWarnings.length} staff members are overloaded.`);
        if (flowStats?.open > 20) actions.push("Alert: Open ticket volume is exceeding daily average.");
        if (actions.length === 0) actions.push("Systems Normal: Maintain current resolution speed.");
        return actions.slice(0, 3);
    }, [stressIndex, loadWarnings, flowStats]);

    return (
        <div className="max-w-7xl mx-auto px-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Zap size={32} className="text-rose-500 fill-rose-500" /> AI Command Center
                    </h1>
                    <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">Director's Strategic Intelligence Dashboard</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-bold text-slate-400">
                    Last Intelligence Pulse: {lastAiPulse?.toLocaleTimeString()}
                </div>
            </div>

            {/* Top Row: Stress Index & Crisis Alert */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-center items-center relative overflow-hidden ${stressColor}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
                    <h2 className="text-label font-black uppercase tracking-[0.2em] mb-4">Hospital Stress Index</h2>
                    <div className="text-8xl font-black tabular-nums tracking-tighter mb-2">{stressIndex}%</div>
                    <div className="px-6 py-2 rounded-full border-2 font-black uppercase text-sm tracking-widest bg-white/50 backdrop-blur-md">
                        Status: {crisisRisk}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl text-white flex flex-col">
                    <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Activity size={16} /> AI Focus Actions
                    </h3>
                    <div className="space-y-4 flex-grow">
                        {dailyActions.map((action, i) => (
                            <div key={i} className="flex gap-3 items-start p-3 bg-white/5 rounded-xl border border-white/10">
                                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 text-xs font-black">{i + 1}</span>
                                <p className="text-sm font-semibold text-slate-200 leading-relaxed">{action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Row: Dept Health Heatmap */}
            <div className="mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Building2 size={16} /> Department Health Heatmap
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {deptTrends?.map((dept, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group">
                            <span className="text-xs font-black text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors uppercase tracking-tight line-clamp-1 w-full">{dept.name}</span>
                            <span className="text-[10px] font-bold">{dept.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Row: Load Warnings & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <User size={18} className="text-rose-500" /> Staff Load Warnings
                    </h3>
                    {loadWarnings.length > 0 ? (
                        <div className="space-y-4">
                            {loadWarnings.map((staff, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                                    <span className="font-bold text-slate-800">{staff.name}</span>
                                    <span className="bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-black">{staff.count} Active Cases</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 font-bold">
                            <CheckCircle size={32} className="mx-auto mb-3 opacity-20" />
                            No load warnings detected
                        </div>
                    )}
                </div>

                <div className="bg-emerald-900 p-8 rounded-[2rem] border border-emerald-800 shadow-2xl text-white">
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart3 size={18} /> Operational Efficiency
                    </h3>
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-black">{flowStats?.solved || 0}</p>
                                <p className="text-[10px] font-black uppercase text-emerald-400/60 tracking-wider">Total Resolutions</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black">{flowStats?.efficiency || 0}%</p>
                                <p className="text-[10px] font-black uppercase text-emerald-400/60 tracking-wider">System Efficiency</p>
                            </div>
                        </div>
                        <div className="w-full h-3 bg-emerald-950 rounded-full overflow-hidden border border-emerald-700/50 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000"
                                style={{ width: `${flowStats?.efficiency || 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICommandCenter;
