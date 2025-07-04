import { handleLogout } from '@/ultils/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    user: {
        userId: number;
        username: string;
        warehouseId: number;
        warehouseName: string;
        permissions: string[];
    };
    accessToken: string | null;
    setUser: (userData: any) => void;
    clearUser: () => void;
    setAccessToken: (token: string | null) => void;
    clearAccessToken: () => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

const defaultUser = {
    userId: -1,
    username: '',
    warehouseId: -1,
    warehouseName: '',
    permissions: []
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: defaultUser,
            accessToken: '',

            setUser: (userData) =>
                set({
                    user: {
                        userId: userData.userId,
                        username: userData.username,
                        warehouseId: userData.warehouseId,
                        warehouseName: userData.warehouseName,
                        permissions: userData.permissions
                    }
                }),

            clearUser: () => set({ user: defaultUser }),

            setAccessToken: (token) => set({ accessToken: token }),

            clearAccessToken: () => set({ accessToken: '' }),

            hasPermission: (permission) => {
                if (typeof window === 'undefined') return false;
                const { user } = get();
                if (!user) return false;
                if (user.permissions.includes('*')) return true;
                return user.permissions.includes(permission);
            },

            logout: () => {
                set({ user: defaultUser, accessToken: null });
                handleLogout();
                // 👉 Redirect về login (chỉ gọi ở client)
                if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
                    window.location.href = '/auth/login';
                }
            },
        }),
        {
            name: 'auth-storage', // key trong localStorage
            partialize: (state) => ({ user: state.user, accessToken: state.accessToken }), // chỉ lưu user
            onRehydrateStorage: () => (state, error) => {
                console.log('Rehydrating state:', state)
                if (error) {
                    console.error('Error during rehydration:', error)
                }
            },
        }
    )
);
