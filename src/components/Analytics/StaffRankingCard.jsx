import React from 'react';
import { Trophy, Star, Zap } from 'lucide-react';

const StaffRankingCard = ({ staff }) => {
    // Top 5
    const topStaff = staff.slice(0, 5);

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Top Performers (Live)</h3>
                <Trophy size={16} className="text-amber-500" />
            </div>

            <div className="space-y-3">
                {topStaff.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                    idx === 1 ? 'bg-slate-200 text-slate-600' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-50 text-slate-400'
                                }`}>
                                #{idx + 1}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">{s.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{s.solved} Solved</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-xs font-black text-slate-700">{s.avgRating}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">Score: {s.efficiency}</div>
                        </div>
                    </div>
                ))}

                {topStaff.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                        No performance data yet today.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffRankingCard;
