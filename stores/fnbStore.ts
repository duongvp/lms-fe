import { create } from 'zustand';

export interface FnbTableState {
    status: 'empty' | 'in_use';
    start_time: number | null;
    order_draft: any[];
    occupantCount: number;
}

interface FnbStoreData {
    tables: Record<string, FnbTableState>;
}

interface FnbStoreActions {
    initTables: (allTablesData: Record<string, FnbTableState>) => void;
    updateTable: (tableId: string | number, newState: Partial<FnbTableState>) => void;
}

type FnbStoreState = FnbStoreData & FnbStoreActions;

export const useFnbStore = create<FnbStoreState>((set) => ({
    tables: {},

    initTables: (allTablesData) => set({ tables: allTablesData }),

    updateTable: (tableId, newState) => set((state) => {
        const idStr = String(tableId);
        return {
            tables: {
                ...state.tables,
                [idStr]: {
                    ...(state.tables[idStr] || { status: 'empty', start_time: null, order_draft: [], occupantCount: 0 }),
                    ...newState
                }
            }
        };
    }),
}));
