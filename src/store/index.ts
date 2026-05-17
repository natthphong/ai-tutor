// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import auth from "./authSlice";
import notificationsSlice from "@store/notificationsSlice";
import adminAuth from "./adminAuthSlice";
import cart from "./cartSlice";
import config from "./configSlice";


export const store = configureStore({
    reducer: {
        auth,
        adminAuth,
        cart,
        config,
        notifications: notificationsSlice
    },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
