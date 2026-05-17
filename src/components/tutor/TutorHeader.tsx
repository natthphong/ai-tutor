// src/components/tutor/TutorHeader.tsx
import { type FC } from "react";
import { useRouter } from "next/router";
import { useAppDispatch } from "@/store";
import { logout } from "@/store/authSlice";
import { clearTokens } from "@/utils/tokenStorage";
import { logoutLocal } from "@/services/auth";
import type { TutorUser } from "@/types/tutor";

type Props = {
    user?: TutorUser | null;
    unitTitle?: string;
    currentMode?: string;
    onSettings?: () => void;
    onClose?: () => void;
};

const TutorHeader: FC<Props> = ({ user, unitTitle, currentMode, onSettings, onClose }) => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const onLogout = async () => {
        try { await logoutLocal(); } catch {}
        dispatch(logout());
        clearTokens();
        void router.replace("/login");
    };
    return (
        <header className="px-4 py-3 glass border-b border-white/5 safe-top">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        {user?.pictureUrl ? (
                            <img
                                src={user.pictureUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/30"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                                <span className="text-sm font-bold">AI</span>
                            </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0f0f23]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold">AI Tutor</h1>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">
                            {unitTitle || "Ready to learn"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {currentMode && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white ${
                            currentMode === "listening" ? "mode-listening" :
                            currentMode === "speaking" ? "mode-speaking" :
                            currentMode === "reading" ? "mode-reading" : "mode-review"
                        }`}>
                            {currentMode}
                        </span>
                    )}
                    {onSettings && (
                        <button onClick={onSettings} className="p-2 rounded-lg hover:bg-white/5 transition-colors" id="btn-settings">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors" id="btn-close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-xs text-slate-400"
                        id="btn-logout"
                        title="Logout"
                    >
                        ⎋
                    </button>
                </div>
            </div>
        </header>
    );
};

export default TutorHeader;
