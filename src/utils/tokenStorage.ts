// src/utils/tokenStorage.ts
import type { Cart, UserRecord } from "@/types";


export type StoredTokens = { accessToken: string; refreshToken: string };
const KEY = "auth_tokens_v1";
const USER_KEY = "APP_USER";
const CONFIG_KEY = "APP_CONFIG";
const CART_KEY = "APP_CART";
const ADMIN_KEY = "admin_auth_tokens_v1";
const ADMIN_SESSION_KEY = "ADMIN_SESSION";

export function saveTokens(tokens: StoredTokens) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(tokens));
}

export function loadTokens(): StoredTokens | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredTokens;
    } catch {
        return null;
    }
}

export function clearTokens() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
}


