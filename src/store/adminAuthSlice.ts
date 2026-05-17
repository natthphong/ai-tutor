import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminSession } from "@/types/admin";

type State = {
    accessToken: string | null;
    refreshToken: string | null;
    session: AdminSession | null;
};

const initialState: State = {
    accessToken: null,
    refreshToken: null,
    session: null,
};

const adminAuthSlice = createSlice({
    name: "adminAuth",
    initialState,
    reducers: {
        setAdminTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
        },
        setAdminSession(state, action: PayloadAction<AdminSession | null>) {
            state.session = action.payload;
        },
        adminLogout(state) {
            state.accessToken = null;
            state.refreshToken = null;
            state.session = null;
        },
    },
});

export const { adminLogout, setAdminSession, setAdminTokens } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
