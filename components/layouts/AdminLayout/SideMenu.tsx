"use client";
import React, { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Drawer, Menu, MenuProps, Grid } from "antd";
import {
    BankOutlined,
    BookOutlined,
    DashboardOutlined,
    LogoutOutlined,
    UsergroupAddOutlined,
    UserOutlined,
    TeamOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { logoutUser } from "@/services/authService";

const { useBreakpoint } = Grid;

interface SideMenuProps {
    drawerOpen: boolean;
    onCloseDrawer: () => void;
}

interface LevelKeysProps {
    key?: string;
    children?: LevelKeysProps[];
}

type MenuItem = Required<MenuProps>["items"][number];


export interface IMenuItem {
    key: string;
    label: string;
    icon?: ReactNode;
    path?: string;
    permission: PermissionKey | null;
    children?: IMenuItem[];
}

// Mapping key to URL path và permission tương ứng
export const menuConfig: IMenuItem[] = [
    {
        key: "0",
        icon: <DashboardOutlined />,
        label: "Tổng quan",
        path: "/dashboard",
        permission: PermissionKey.DASHBOARD_VIEW,
    },
    {
        key: "4",
        icon: <BookOutlined />,
        label: "Quản lý đề cương",
        path: "/lessons",
        permission: PermissionKey.LESSON_VIEW,
    },
    {
        key: "quiz",
        icon: <QuestionCircleOutlined />,
        label: "Quản lý câu hỏi",
        path: "/quizzes",
        permission: PermissionKey.QUIZ_VIEW,
    },
    {
        key: "5",
        icon: <BankOutlined />,
        label: "Quản lý lịch học",
        path: "/schedule",
        permission: PermissionKey.SCHEDULE_VIEW,
    },
    {
        key: "5_room",
        icon: <SettingOutlined />,
        label: "Cấu hình phòng học",
        path: "/room-config",
        permission: PermissionKey.ROOM_CONFIG_VIEW,
    },
    {
        key: "6",
        icon: <TeamOutlined />,
        label: "Giáo viên & Trợ giảng",
        path: "/teacher-profiles",
        permission: PermissionKey.TEACHER_PROFILE_VIEW,
    },
    {
        key: "7",
        icon: <UserOutlined />,
        label: "Quản trị viên",
        path: "/users",
        permission: PermissionKey.USER_VIEW,
    },
    {
        key: "8",
        icon: <UsergroupAddOutlined />,
        label: "Vai trò thành viên",
        path: "/member-roles",
        permission: PermissionKey.ROLE_VIEW,
    },
    {
        key: "9",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
        path: "/auth/login",
        permission: null,
    },
];

// Chỉ ba trang nghiệp vụ này dùng chung bộ lọc Chương trình. Các trang khác
// không nhận query `program`, nhưng cũng không được xóa lựa chọn trong store.
export const PROGRAM_CONTEXT_PATHS = ["/lessons", "/quizzes", "/schedule"] as const;

export const isProgramContextPath = (path: string) => {
    const pathname = path.split("?")[0].split("#")[0];
    return PROGRAM_CONTEXT_PATHS.some(
        (item) => pathname === item || pathname.startsWith(`${item}/`)
    );
};

export const withProgramContext = (path: string, programCode?: string | null) => {
    const [pathWithoutHash, hash] = path.split("#", 2);
    const [pathname, query = ""] = pathWithoutHash.split("?", 2);
    const params = new URLSearchParams(query);

    if (isProgramContextPath(path)) {
        const program = String(
            programCode === undefined
                ? useAuthStore.getState().currentProgram || ""
                : programCode || ""
        ).trim();
        if (program) params.set("program", program);
        else params.delete("program");
    } else {
        params.delete("program");
    }

    const queryString = params.toString();
    return `${pathname}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
};

// Tạo menu items dựa trên quyền của user
const getMenuItems = (
    hasPermission: (permission: string | null) => boolean
): MenuItem[] => {
    return menuConfig
        .filter((item) => {
            if (item.children) {
                const hasChildPermission = item.children.some((child) =>
                    hasPermission(child.permission)
                );
                return hasPermission(item.permission) || hasChildPermission;
            }
            return hasPermission(item.permission);
        })
        .map((item) => {
            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: item.label,
                    children: item.children
                        .filter((child) => hasPermission(child.permission))
                        .map((child) => ({
                            key: child.key,
                            label: child.label,
                        })),
                };
            }
            return {
                key: item.key,
                icon: item.icon,
                label: item.label,
            };
        })
        .filter((item) => {
            if (item.children) {
                return item.children.length > 0;
            }
            return true;
        });
};

// Tạo mapping key to path từ menuConfig
const createMenuRoutes = () => {
    const routes: Record<string, string> = {};
    menuConfig.forEach((item) => {
        if (item.path) {
            routes[item.key] = item.path;
        }
        if (item.children) {
            item.children.forEach((child) => {
                if (child.path) {
                    routes[child.key] = child.path;
                }
            });
        }
    });
    return routes;
};

const menuRoutes = createMenuRoutes();

const getLevelKeys = (items1: LevelKeysProps[]) => {
    const key: Record<string, number> = {};
    const func = (items2: LevelKeysProps[], level = 1) => {
        items2.forEach((item) => {
            if (item.key) {
                key[item.key] = level;
            }
            if (item.children) {
                func(item.children, level + 1);
            }
        });
    };
    func(items1);
    return key;
};

const isPathActive = (currentPath: string, targetPath: string) => {
    if (!targetPath) return false;
    if (currentPath === targetPath) return true;
    if (currentPath.startsWith(targetPath + "/")) return true;
    return false;
};

export const getActiveKeys = (pathname: string) => {
    let activeTopKey = "";
    let activeSideKey = "";

    for (const item of menuConfig) {
        if (item.children) {
            for (const child of item.children) {
                if (child.path && isPathActive(pathname, child.path)) {
                    activeTopKey = item.key;
                    activeSideKey = child.key;
                    break;
                }
            }
            if (activeTopKey) break;
        } else if (item.path && isPathActive(pathname, item.path)) {
            activeTopKey = item.key;
            activeSideKey = "";
            break;
        }
    }

    return { activeTopKey, activeSideKey };
};

const SideMenu: React.FC<SideMenuProps> = ({ drawerOpen, onCloseDrawer }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { hasPermission: _hasPermission } = useAuthStore();
    const currentProgram = useAuthStore((state) => state.currentProgram);
    const screens = useBreakpoint();
    const isMobile = screens && !screens.xl;

    const hasPermission = (permission: string | null) => {
        if (permission === null) return true;
        return _hasPermission(permission);
    };

    const items = getMenuItems(hasPermission);
    const levelKeys = getLevelKeys(items as LevelKeysProps[]);
    const { activeTopKey, activeSideKey } = getActiveKeys(pathname);

    const getDefaultOpenKeys = (): string[] => {
        if (activeTopKey) return [activeTopKey];
        return [];
    };

    const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(
        getDefaultOpenKeys()
    );

    useEffect(() => {
        if (activeTopKey) {
            setStateOpenKeys((prev) => {
                if (prev.includes(activeTopKey)) return prev;
                return [...prev, activeTopKey];
            });
        }
    }, [activeTopKey]);

    const onOpenChange: MenuProps["onOpenChange"] = (openKeys) => {
        const currentOpenKey = openKeys.find(
            (key) => stateOpenKeys.indexOf(key) === -1
        );
        if (currentOpenKey !== undefined) {
            const repeatIndex = openKeys
                .filter((key) => key !== currentOpenKey)
                .findIndex((key) => levelKeys[key] === levelKeys[currentOpenKey]);

            setStateOpenKeys(
                openKeys
                    .filter((_, index) => index !== repeatIndex)
                    .filter((key) => levelKeys[key] <= levelKeys[currentOpenKey])
            );
        } else {
            setStateOpenKeys(openKeys);
        }
    };

    const onMenuClick: MenuProps["onClick"] = ({ key }) => {
        const path = menuRoutes[key];
        if (path) {
            if (path === "/auth/login") {
                void logoutUser().finally(() => {
                    useAuthStore.getState().logout();
                    router.replace("/auth/login");
                });
                return;
            }
            router.push(withProgramContext(path, currentProgram));
            onCloseDrawer();
        }
    };

    if (!isMobile) {
        return null;
    }

    return (
        <Drawer
            placement="left"
            closable
            onClose={onCloseDrawer}
            open={drawerOpen}
            styles={{ body: { padding: 10 } }}
            width={screens.sm ? 280 : "86vw"}
        >
            <Menu
                mode="inline"
                selectedKeys={[activeSideKey || activeTopKey]}
                openKeys={stateOpenKeys}
                onOpenChange={onOpenChange}
                onClick={onMenuClick}
                items={items}
            />
        </Drawer>
    );
};

export default SideMenu;
