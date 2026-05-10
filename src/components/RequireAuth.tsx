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
    }, [accessToken, bootstrapping, dispatch, hydrated, router]);

    if (!hydrated || !accessToken || bootstrapping) return null;
    return <>{children}</>;
}
