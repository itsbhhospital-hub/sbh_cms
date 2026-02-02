import { Heart } from 'lucide-react';



const Footer = ({ compact = false }) => {
    if (compact) {
        return (
            <footer className="w-full py-2 text-center opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                    SBH Group Of Hospitals 2026 • Developed By <span className="font-bold text-slate-700">Naman Mishra</span>
                </p>
            </footer>
        );
    }

    return (
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-r from-pink-50 to-rose-50 border-t border-pink-100 py-1.5 shadow-sm">
            <div className="container mx-auto text-center relative px-4 flex flex-col items-center justify-center">
                <p className="text-[10px] text-pink-900/70 font-bold tracking-wider flex items-center gap-1">
                    Made with <Heart size={10} className="text-pink-500 fill-pink-500 animate-pulse" /> by <span className="text-pink-700 font-extrabold">Naman Mishra</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">
                    © 2026 SBH Group Of Hospitals
                </p>
                <p className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-pink-300 font-mono font-bold hidden md:block">v2.0</p>
            </div>
        </footer>
    );
};


export default Footer;
