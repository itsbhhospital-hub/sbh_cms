import React from 'react';

const DepartmentLoadTable = ({ data }) => {
    // Sort by Total Active (Open + Pending)
    const sortedProps = [...data].sort((a, b) => (b.open + b.pending) - (a.open + a.pending)).slice(0, 6);

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Department Load</h3>

            <div className="space-y-3">
                {sortedProps.map((d, i) => {
                    const active = d.open + d.pending;
                    const loadPercent = Math.min(100, (active / 20) * 100); // Assume 20 is "high load" visual cap
                    const color = active > 15 ? 'bg-rose-500' : active > 8 ? 'bg-amber-500' : 'bg-emerald-500';

                    return (
                        <div key={i} className="mb-2">
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>{d.name}</span>
                                <span className={active > 15 ? 'text-rose-600' : ''}>{active} Active</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full ${color} transition-all duration-500`}
                                    style={{ width: `${loadPercent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>{d.solved} Solved</span>
                                {d.delayed > 0 && <span className="text-rose-500 font-bold">{d.delayed} Delayed</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default DepartmentLoadTable;
