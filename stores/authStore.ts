import { handleLogout } from '@/ultils/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mutate } from 'swr';

interface AuthState {
    user: {
        userId: number;
        username: string;
        warehouseId: number;
        warehouseName: string;
        permissions: string[];
        fieldPolicy?: any;
        roles?: any[];
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

const mergeFieldPolicies = (policies: any[]) => {
    const validPolicies = policies.filter((policy) => policy?.modules);
    if (validPolicies.length === 0) return undefined;

    const allModuleCodes = Array.from(
        new Set(validPolicies.flatMap((policy) => Object.keys(policy.modules || {})))
    );
    const mergedModules: Record<string, any> = {};

    allModuleCodes.forEach((moduleCode) => {
        const modulePolicies = validPolicies
            .map((policy) => policy.modules?.[moduleCode]?.fields)
            .filter(Boolean);

        if (modulePolicies.length !== validPolicies.length) {
            return;
        }

        const fieldCodes = Array.from(
            new Set(modulePolicies.flatMap((fields) => Object.keys(fields)))
        );
        const fields: Record<string, { visible: boolean; editable: boolean }> = {};

        fieldCodes.forEach((fieldCode) => {
            fields[fieldCode] = modulePolicies.reduce(
                (rule, moduleFields) => ({
                    visible: rule.visible || Boolean(moduleFields[fieldCode]?.visible),
                    editable: rule.editable || Boolean(moduleFields[fieldCode]?.editable),
                }),
                { visible: false, editable: false }
            );
        });

        mergedModules[moduleCode] = { fields };
    });

    return { modules: mergedModules };
};

const extractFieldPolicy = (userData: any) => {
    if (userData?.fieldPolicy) return userData.fieldPolicy;
    if (userData?.role?.fieldPolicy) return userData.role.fieldPolicy;
    if (Array.isArray(userData?.roles)) {
        return mergeFieldPolicies(userData.roles.map((role: any) => role?.fieldPolicy));
    }
    return undefined;
};

const normalizeUserData = (userData: any) => ({
    userId: Number(userData?.userId ?? userData?.id ?? defaultUser.userId),
    username: userData?.username ?? userData?.user_name ?? '',
    warehouseId: Number(userData?.warehouseId ?? userData?.warehouse_id ?? defaultUser.warehouseId),
    warehouseName: userData?.warehouseName ?? userData?.warehouse_name ?? '',
    permissions: Array.isArray(userData?.permissions) ? userData.permissions : [],
    fieldPolicy: extractFieldPolicy(userData),
    roles: Array.isArray(userData?.roles) ? userData.roles : [],
});

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: defaultUser,
            accessToken: null,

            setUser: (userData) =>
                set({
                    user: normalizeUserData(userData)
                }),

            clearUser: () => set({ user: defaultUser }),

            setAccessToken: (token) => set({ accessToken: token }),

            clearAccessToken: () => set({ accessToken: null }),

            hasPermission: (permission) => {
                if (typeof window === 'undefined') return false;
                const { user } = get();
                if (!user) return false;
                if (user.permissions.includes('*')) return true;
                return user.permissions.includes(permission);
            },

            logout: () => {
                set({ user: defaultUser, accessToken: null });
                void mutate(() => true, undefined, { revalidate: false });
                handleLogout();
            },
        }),
        {
            name: 'auth-storage', // key trong localStorage
            // Access token chỉ giữ trong memory; reload sẽ dùng HttpOnly refresh
            // cookie để lấy access token mới.
            partialize: (state) => ({ user: state.user }),
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error('Error during rehydration:', error)
                }
            },
        }
    )
);
