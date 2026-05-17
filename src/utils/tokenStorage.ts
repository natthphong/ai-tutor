// src/utils/tokenStorage.ts
import type { Cart, UserRecord } from "@/types";
import type { AdminSession } from "@/types/admin";


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

export function saveAdminTokens(tokens: StoredTokens) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(tokens));
}

export function loadAdminTokens(): StoredTokens | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredTokens;
    } catch {
        return null;
    }
}

export function clearAdminTokens() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ADMIN_KEY);
}

export function saveAdminSession(session: AdminSession) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function loadAdminSession(): AdminSession | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AdminSession;
    } catch {
        return null;
    }
}

export function clearAdminSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function saveUser(user: UserRecord) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(USER_KEY);
}

export function saveConfig(config: Record<string, string>) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CONFIG_KEY);
}

export function saveCart(cart: Cart) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CART_KEY);
}

