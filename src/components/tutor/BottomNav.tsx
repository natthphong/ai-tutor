// src/components/tutor/BottomNav.tsx
import { type FC } from "react";
import { useRouter } from "next/router";

const TABS = [
    { path: "/", icon: "chat", label: "Learn" },
    { path: "/progress", icon: "progress", label: "Progress" },
    { path: "/review", icon: "review", label: "Review" },
] as const;

const BottomNav: FC = () => {
    const router = useRouter();

    return (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 safe-bottom z-50">
            <div className="flex items-center justify-around max-w-lg mx-auto py-2">
                {TABS.map((tab) => {
                    const isActive = router.pathname === tab.path;
                    return (
                        <button
                            key={tab.path}
                            onClick={() => router.push(tab.path)}
                            className={`nav-item flex flex-col items-center gap-0.5 px-4 py-1 ${isActive ? "active" : "text-slate-500"}`}
                            id={`nav-${tab.icon}`}
                        >
                            <TabIcon icon={tab.icon} active={isActive} />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
    const stroke = active ? "#818cf8" : "#64748b";
    switch (icon) {
        case "chat":
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        case "progress":
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
            );
        case "review":
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                </svg>
            );
        default:
            return null;
    }
}

export default BottomNav;
