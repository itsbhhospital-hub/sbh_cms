import { useLayout } from '../context/LayoutContext';

const Footer = () => {
    const layout = useLayout();
    const { mobileOpen = false, collapsed = false } = layout || {};

    // On Mobile: Always 0px. On Desktop: Depends on Sidebar state.
    // We use a CSS variable or simple conditional rendering.
    // Since we can't easily detect "Mobile View" in JS without a listener, 
    // we will rely on valid CSS: "md:left-[var(--footer-offset)]"

    const desktopOffset = layout ? (collapsed ? '5rem' : '18rem') : '0px';

    return (
        <footer
            style={{ '--footer-offset': desktopOffset }}
            className="fixed bottom-0 z-[100] py-2 md:py-1.5 bg-gradient-to-r from-orange-600 to-rose-600 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 w-full left-0 md:left-[var(--footer-offset)] md:w-[calc(100%-var(--footer-offset))]"
        >
            <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] font-bold tracking-wide text-white/90">
                    <a
                        href="https://sbhhospital.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors flex items-center gap-2 group"
                    >
                        SBH Group of Hospitals
                        <span className="w-1 h-1 bg-white/30 rounded-full hidden sm:block"></span>
                    </a>
                    <a
                        href="https://www.instagram.com/ignamanmishra"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors group"
                    >
                        Architecture: <span className="opacity-70 group-hover:opacity-100 transition-opacity">Naman Mishra</span>
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
