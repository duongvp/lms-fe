// stores/tabStore.ts
import { create } from "zustand";

interface TabStore {
    tabToClose: string | null;
    closeTab: (key: string) => void;
    clearCloseTab: () => void;
}

export const useTabStore = create<TabStore>((set) => ({
    tabToClose: null,
    closeTab: (key) => set({ tabToClose: key }),
    clearCloseTab: () => set({ tabToClose: null }),
}));
