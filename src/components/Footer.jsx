import { Heart } from 'lucide-react';



const Footer = () => {
    return (
        <footer className="w-full py-6 flex justify-center mt-auto">
            <div className="bg-white/40 backdrop-blur-md border border-emerald-100/50 px-6 py-2 rounded-full shadow-sm">
                <p className="text-xs text-slate-500 font-semibold tracking-wide flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-emerald-600/80">SBH Group Of Hospitals 2026</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-slate-400">Developed By</span>
                    <span className="text-emerald-700 font-black">Naman Mishra</span>
                </p>
            </div>
        </footer>
    );
};


export default Footer;
