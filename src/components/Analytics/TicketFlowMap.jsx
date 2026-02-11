import React from 'react';
import { Activity, CheckCircle, Clock, AlertOctagon } from 'lucide-react';

const TicketFlowMap = ({ stats }) => {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Live Ticket Flow (Today)</h3>

            <div className="grid grid-cols-4 gap-4">
                {/* Registered / Active */}
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex justify-center mb-2">
                        <Activity className="text-blue-600" size={24} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{stats.open}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Active Flow</div>
                </div>

                {/* Solved */}
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex justify-center mb-2">
                        <CheckCircle className="text-emerald-600" size={24} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{stats.solved}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Resolved</div>
                </div>

                {/* Delayed */}
                <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="flex justify-center mb-2">
                        <AlertOctagon className="text-rose-600" size={24} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{stats.delayed}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Delayed</div>
                </div>

                {/* Transferred */}
                <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex justify-center mb-2">
                        <Clock className="text-purple-600" size={24} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{stats.transferred}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Transferred</div>
                </div>
            </div>
        </div>
    );
};

export default TicketFlowMap;
