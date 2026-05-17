import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type State = {
    value: Record<string, string>;
};

const configSlice = createSlice({
    name: "config",
    initialState: { value: {} } as State,
    reducers: {
        setConfig(state, action: PayloadAction<Record<string, string>>) {
            state.value = action.payload;
        },
        clearConfig(state) {
            state.value = {};
        },
    },
});

export const { clearConfig, setConfig } = configSlice.actions;
export default configSlice.reducer;
