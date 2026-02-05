import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 w-full z-[100] bg-indigo-950 border-t border-indigo-900/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center text-[11px] font-bold tracking-widest text-slate-400">
                <span className="hover:text-emerald-500 transition-colors cursor-default">
                    SBH Group Of Hospitals | Developed by Naman Mishra
                </span>
            </div>
        </footer>
    );
};

export default Footer;
