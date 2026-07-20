import { ActionType } from '@/enums/action';
import { UnitApiResponse } from '@/services/unitService'; // Giả định bạn có unitService.ts
import { create } from 'zustand';

interface UnitOption {
    label: string;
    value: string | number;
    labelText?: string; // Optional, used for displaying text in select options
}

interface UnitModalState {
    open: boolean;
    title: string;
    type: ActionType | null;
    unit: UnitApiResponse | null;
}

interface UnitStore {
    // State
    modal: UnitModalState;
    shouldReload: boolean;
    optionsUnit: UnitOption[];

    // Actions
    setOptionsUnit: (options: UnitOption[]) => void;
    setModal: (partial: Partial<UnitModalState>) => void;
    resetModal: () => void;
    setShouldReload: (value: boolean) => void;
}

const useUnitStore = create<UnitStore>((set, get) => ({
    modal: {
        open: false,
        title: '',
        type: null,
        unit: null,
    },

    optionsUnit: [],

    setModal: (partial) => set((state) => {
        const newModal = {
            ...state.modal,
            ...partial,
            title: partial.type === ActionType.CREATE
                ? 'Thêm giáo viên'
                : partial.type === ActionType.UPDATE
                    ? 'Cập nhật giáo viên'
                    : state.modal.title
        };
        return { modal: newModal };
    }),

    resetModal: () => set({
        modal: {
            open: false,
            title: '',
            type: null,
            unit: null,
        }
    }),

    shouldReload: false,
    setShouldReload: (value) => set({ shouldReload: value }),
    setOptionsUnit: (options) => set({ optionsUnit: options }),
}));

export default useUnitStore;
