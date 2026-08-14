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
        programScope?: { mode: 'ALL' | 'RESTRICTED' | 'DENY'; programs: string[] };
    };
    accessToken: string | null;
    currentProgram: string | null;
    setUser: (userData: any) => void;
    clearUser: () => void;
    setAccessToken: (token: string | null) => void;
    clearAccessToken: () => void;
    setCurrentProgram: (programCode: string | null) => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    can: (permission: string, programCode?: string) => boolean;
}

const defaultUser = {
    userId: -1,
    username: '',
    warehouseId: -1,
    warehouseName: '',
    permissions: [],
    programScope: { mode: 'ALL' as const, programs: [] }
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
    programScope: userData?.programScope && typeof userData.programScope === 'object'
        ? userData.programScope
        : defaultUser.programScope,
});

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: defaultUser,
            accessToken: null,
            currentProgram: null,

            setUser: (userData) =>
                set({
                    user: normalizeUserData(userData)
                }),

            clearUser: () => set({ user: defaultUser }),

            setAccessToken: (token) => set({ accessToken: token }),

            clearAccessToken: () => set({ accessToken: null }),

            setCurrentProgram: (programCode) => {
                const normalized = String(programCode || '').trim();
                set({ currentProgram: normalized || null });
            },

            hasPermission: (permission) => {
                if (typeof window === 'undefined') return false;
                const { user } = get();
                if (!user) return false;
                if (user.permissions.includes('*')) return true;
                return user.permissions.includes(permission);
            },

            can: (permission, programCode) => {
                if (typeof window === 'undefined') return false;
                const { user } = get();
                if (user.permissions.includes('*')) return true;
                if (!user.permissions.includes(permission)) return false;
                if (!programCode) return true;
                const scope = user.programScope;
                // Missing policy is the explicit legacy compatibility mode.
                if (!scope || scope.mode === 'ALL') return true;
                if (scope.mode === 'DENY') return false;
                return scope.programs.includes(String(programCode).trim());
            },

            logout: () => {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('lms.lessons.reauth');
                }
                set({ user: defaultUser, accessToken: null, currentProgram: null });
                void mutate(() => true, undefined, { revalidate: false });
                handleLogout();
            },
        }),
        {
            name: 'auth-storage', // key trong localStorage
            // Access token chỉ giữ trong memory; reload sẽ dùng HttpOnly refresh
            // cookie để lấy access token mới.
            partialize: (state) => ({
                user: state.user,
                currentProgram: state.currentProgram,
            }),
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error('Error during rehydration:', error)
                }
            },
        }
    )
);
