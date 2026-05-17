import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Cart } from "@/types";

const emptyCart: Cart = {
    groups: [],
    totalAmount: 0,
    totalItems: 0,
    totalQuantity: 0,
    lastSyncedAt: new Date(0).toISOString(),
};

const cartSlice = createSlice({
    name: "cart",
    initialState: { value: emptyCart },
    reducers: {
        setCart(state, action: PayloadAction<Cart>) {
            state.value = action.payload;
        },
        clearCart(state) {
            state.value = emptyCart;
        },
    },
});

export const { clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
