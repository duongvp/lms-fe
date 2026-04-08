import { ActionType } from '@/enums/action';
import { create } from 'zustand';

interface RoomModalState {
    open: boolean;
    title: string;
    type: ActionType | null;
    room: any | null; // Placeholder for room data
}

interface RoomStore {
    modal: RoomModalState;
    setModal: (partial: Partial<RoomModalState>) => void;
    resetModal: () => void;
}

const useRoomStore = create<RoomStore>((set) => ({
    modal: {
        open: false,
        title: '',
        type: null,
        room: null,
    },

    setModal: (partial) => set((state) => {
        const newModal = {
            ...state.modal,
            ...partial,
            title: partial.title || (partial.type === ActionType.CREATE
                ? 'Thêm Bàn / Phòng'
                : partial.type === ActionType.UPDATE
                    ? 'Cập nhật Bàn / Phòng'
                    : state.modal.title)
        };
        return { modal: newModal };
    }),

    resetModal: () => set({
        modal: {
            open: false,
            title: '',
            type: null,
            room: null,
        }
    }),
}));

export default useRoomStore;
