import React from 'react';
import { motion } from 'framer-motion';

const SkeletonCard = ({ delay }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        className="flex flex-col justify-between p-4 md:p-6 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_15px_-3px_rgb(0,0,0,0.04)] relative overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent skew-x-12 animate-shimmer" />

        <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
        </div>

        <div className="relative z-10 mt-4">
            <div className="h-8 w-16 bg-slate-100 rounded-lg mb-2 animate-pulse" />
            <div className="h-3 w-24 bg-slate-50 rounded animate-pulse" />
        </div>
    </motion.div>
);

const DashboardSkeleton = () => {
    return (
        <div className="w-full space-y-6 md:space-y-8 pb-10">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 mb-2">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="w-full md:w-auto">
                    <div className="h-12 w-full md:w-40 bg-slate-200 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Stress Index Skeleton */}
            <div className="h-24 w-full bg-white border border-slate-100 rounded-2xl animate-pulse flex items-center px-8 gap-6">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-grow space-y-2">
                    <div className="h-3 w-32 bg-slate-50 rounded" />
                    <div className="h-6 w-48 bg-slate-100 rounded" />
                </div>
                <div className="w-full max-w-[40%] h-4 bg-slate-50 rounded-full" />
            </div>

            {/* Filter Skeleton */}
            <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} delay={i * 0.1} />
                ))}
            </div>

            {/* List Skeleton handled by ComplaintList's own loader */}
            <div className="mt-8 h-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        </div>
    );
};

export default DashboardSkeleton;
