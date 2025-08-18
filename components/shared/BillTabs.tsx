import React, { useEffect, useState } from "react";
import { Tabs } from "antd";
import type { TabsProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTabStore } from "@/stores/tabStore";

type TabItem = {
    title: string;
    key: string;
    component: React.ReactNode;
};

interface BillTabsProps {
    initialTabs: TabItem[];
    defaultComponent: () => React.ReactNode; // callback để tái tạo component
}

const BillTabs: React.FC<BillTabsProps> = ({ initialTabs, defaultComponent }) => {
    const [tabs, setTabs] = useState<TabItem[]>(initialTabs);
    const [activeKey, setActiveKey] = useState(initialTabs[0]?.key || "");
    const { tabToClose, clearCloseTab } = useTabStore();

    const handleAdd = () => {
        let length = tabs.length;
        let nextIndex = 1;
        let lastKey = tabs[length - 1]?.key;
        if (isNaN(Number(lastKey))) {
            nextIndex = length == 2 ? 2 : 1;
        } else {
            nextIndex = Number(tabs[length - 1].key) + 1; // lấy key của tab cuối cùng và cộng thêm 1
        }
        console.log("nextIndex", nextIndex);
        const newKey = `${nextIndex}`;
        const newTab: TabItem = {
            title: `Hóa đơn ${nextIndex}`,
            key: newKey,
            component: defaultComponent(), // tái tạo component
        };
        setTabs([...tabs, newTab]);
        setActiveKey(newKey);
    };

    const handleRemove = (targetKey: string) => {
        const index = tabs.findIndex((tab) => tab.key === targetKey);
        const newTabs = tabs.filter((tab) => tab.key !== targetKey);
        setTabs(newTabs);
        if (targetKey === activeKey && newTabs.length > 0) {
            let lastActiveKey = newTabs[newTabs.length - 1].key;
            if (isNaN(Number(targetKey)) || Number(targetKey) < Number(lastActiveKey)) {
                lastActiveKey = newTabs[index]?.key || newTabs[0].key; // nếu tab bị xóa là tab hiện tại, chọn tab trước đó
            }
            setActiveKey(lastActiveKey);
        }
    };

    // Lắng nghe tín hiệu đóng tab từ store
    useEffect(() => {
        if (tabToClose) {
            handleRemove(tabToClose);
            clearCloseTab();
        }
    }, [tabToClose]);

    const onChange = (key: string) => {
        if (key === "add_tab") {
            handleAdd();
        } else {
            setActiveKey(key);
        }
    };

    const items: TabsProps["items"] = [
        ...tabs.map((tab) => ({
            label: tab.title,
            key: tab.key,
            children: tab.component,
            closable: true,
        })),
        {
            label: <PlusOutlined />,
            key: "add_tab",
            children: null,
            closable: false,
        },
    ];

    useEffect(() => {
        if (initialTabs.length > 1) {
            setTabs(initialTabs);
            setActiveKey(initialTabs[1].key);
        }
    }, [initialTabs]);

    return (
        <Tabs
            type="editable-card"
            activeKey={activeKey}
            onChange={onChange}
            onEdit={(targetKey, action) => {
                if (action === "remove") handleRemove(targetKey as string);
            }}
            hideAdd
            items={items}
            className="bill-tabs"
            style={{ minHeight: '100%' }}
        />
    );
};

export default BillTabs;
