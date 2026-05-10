// src/pages/login.tsx
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAppDispatch } from "@/store";
import { setTokens, setUser } from "@/store/authSlice";
import { saveTokens } from "@/utils/tokenStorage";
import { loginWithLine } from "@/services/tutorApi";

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID || "";

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [status, setStatus] = useState<"init" | "loading" | "error">("init");
    const [errorMsg, setErrorMsg] = useState("");

    const handleLiffLogin = useCallback(async () => {
        try {
            setStatus("loading");
            const liff = (await import("@line/liff")).default;
            await liff.init({ liffId: LIFF_ID });

            if (!liff.isLoggedIn()) {
                liff.login({ redirectUri: window.location.href });
                return;
            }

            const profile = await liff.getProfile();
            const result = await loginWithLine({
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
            });

            dispatch(setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken }));
            saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
            dispatch(setUser(result.user as any));

            router.replace("/");
        } catch (err: any) {
            setStatus("error");
            const msg = err?.response?.data?.message || err?.message || "Login failed";
            if (msg.includes("not authorized") || msg.includes("FORBIDDEN")) {
                setErrorMsg("บัญชี LINE ของคุณยังไม่ได้รับอนุญาตเข้าใช้งาน กรุณาติดต่อ Admin");
            } else {
                setErrorMsg(msg);
            }
        }
    }, [dispatch, router]);

    useEffect(() => {
        // Check if returning from LIFF redirect
        if (typeof window !== "undefined" && (window.location.search.includes("liff.state") || window.location.hash.includes("access_token"))) {
            handleLiffLogin();
        }
    }, [handleLiffLogin]);

    return (
        <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom">
            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl animate-float" />
                <div className="absolute bottom-32 -right-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
            </div>

            <div className="relative z-10 w-full max-w-sm text-center">
                {/* Logo & Title */}
                <div className="mb-10">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        <span className="text-gradient">AI Tutor</span>
                    </h1>
                    <p className="text-slate-400 text-sm">
                        สอนภาษาอังกฤษด้วย AI อัจฉริยะ<br />
                        ฟัง · พูด · อ่าน · ทบทวน
                    </p>
                </div>

                {/* Login Button */}
                {status === "init" && (
                    <button
                        onClick={handleLiffLogin}
                        className="w-full py-4 rounded-2xl font-semibold text-white text-lg shadow-lg transition-all active:scale-95 hover:shadow-xl"
                        style={{ background: "#06C755" }}
                        id="btn-line-login"
                    >
                        <span className="flex items-center justify-center gap-3">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                <path d="M12 2C6.48 2 2 5.69 2 10.18c0 3.07 2.35 5.77 5.87 7.16l-.68 2.49c-.05.19.02.4.17.52.1.08.22.12.33.12.08 0 .17-.02.24-.06l2.97-1.97c.36.04.73.06 1.1.06 5.52 0 10-3.69 10-8.18C22 5.69 17.52 2 12 2z" />
                            </svg>
                            เข้าสู่ระบบด้วย LINE
                        </span>
                    </button>
                )}

                {/* Loading */}
                {status === "loading" && (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400">กำลังเข้าสู่ระบบ...</p>
                    </div>
                )}

                {/* Error */}
                {status === "error" && (
                    <div className="animate-slide-up">
                        <div className="glass rounded-2xl p-6 mb-6">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M15 9l-6 6M9 9l6 6" />
                                </svg>
                            </div>
                            <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
                        </div>
                        <button
                            onClick={() => { setStatus("init"); setErrorMsg(""); }}
                            className="w-full py-3 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-colors"
                        >
                            ลองอีกครั้ง
                        </button>
                    </div>
                )}

                {/* Features */}
                <div className="mt-12 grid grid-cols-3 gap-3">
                    {[
                        { icon: "🎧", label: "Listening" },
                        { icon: "🎤", label: "Speaking" },
                        { icon: "📖", label: "Reading" },
                    ].map((f) => (
                        <div key={f.label} className="glass rounded-xl py-3 px-2">
                            <div className="text-2xl mb-1">{f.icon}</div>
                            <div className="text-xs text-slate-400">{f.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="mt-auto pt-10 text-xs text-slate-600">
                AI Tutor Loop v1.0 · Powered by Gemini
            </p>
        </div>
    );
}
