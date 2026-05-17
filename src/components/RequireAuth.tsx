import { useEffect, useRef, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { RootState, useAppDispatch } from "@store/index";
import { logout, setTokens, setUser } from "@store/authSlice";

import {
    clearTokens,
    loadTokens,
    saveTokens,
} from "@utils/tokenStorage";

import { logError } from "@/utils/logger";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const accessToken = useSelector((state: RootState) => state.auth.accessToken);
    const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);
    const user = useSelector((state: RootState) => state.auth.user);


    const [hydrated, setHydrated] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(false);
    const bootstrapRef = useRef(false);

    useEffect(() => {
        const storedTokens = loadTokens();

        if (!accessToken && storedTokens?.accessToken && storedTokens?.refreshToken) {
            dispatch(setTokens(storedTokens));
        }


        setHydrated(true);
    }, [accessToken,  dispatch, user]);

    useEffect(() => {
        if (!hydrated) return;
        if (accessToken && refreshToken) {
            saveTokens({ accessToken, refreshToken });
        } else {
            clearTokens();
        }
    }, [accessToken, refreshToken, hydrated]);


    useEffect(() => {
        if (!hydrated) return;
        if (!accessToken) {
            bootstrapRef.current = false;

            if (router.pathname !== "/login") {
                void router.replace("/login");
            }
            return;
        }
        if (bootstrapRef.current || bootstrapping) return;
        bootstrapRef.current = true;
        setBootstrapping(true);

        const init = async () => {
            try {
                // If we don't have the user in Redux, fetch it. We try the
                // generic /auth/me endpoint first (used by both LINE and
                // local auth) and fall back to the LINE-specific one.
                if (!user) {
                    const { fetchMe, fetchMeLocal } = await import("@/services/auth");
                    let me: any;
                    try {
                        me = await fetchMeLocal();
                    } catch {
                        me = await fetchMe();
                    }
                    dispatch(setUser(me));
                }
            } catch (err) {
                logError("Failed to fetch user profile", err);
                dispatch(logout());
                clearTokens();
            } finally {
                setBootstrapping(false);
            }
        };

        void init();
    }, [accessToken, bootstrapping, dispatch, hydrated, router, user]);

    if (!hydrated || !accessToken || bootstrapping) return null;
    return <>{children}</>;
}
