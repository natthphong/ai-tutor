import type { BranchSummary, Cart, CartBranchGroup, CartItem } from "@/types";


function normalizeCartItem(item: CartItem): CartItem {
    return {
        ...item,
        addOns: Array.isArray(item.addOns) ? item.addOns : [],
    };
}

function normalizeCartGroup(group: CartBranchGroup): CartBranchGroup {
    return {
        ...group,
        items: Array.isArray(group.items) ? group.items.map(normalizeCartItem) : [],
    };
}
