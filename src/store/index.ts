// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import auth from "./authSlice";
import notificationsSlice from "@store/notificationsSlice";


export const store = configureStore({
    reducer: {
        auth,
        notificationsSlice
    },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
