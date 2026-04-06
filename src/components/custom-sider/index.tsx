"use client";

import { Layout, Menu } from "antd";
import { useMenu, useGetIdentity } from "@refinedev/core";
import Link from "next/link";

const { Sider } = Layout;

export const CustomSider = () => {
    const { menuItems, selectedKey } = useMenu();
    const { data: identity } = useGetIdentity();

    const role = identity?.role;

    const filteredMenuItems = menuItems.filter((item) => {
        const roles = item.meta?.roles;
        if (!roles) return true;        // không khai báo → ai cũng thấy
        if (!role) return false;        // chưa load identity
        return roles.includes(role);    // check role
    });

    return (
        <Sider width={220}>
            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={filteredMenuItems.map((item) => ({
                    key: item.key,
                    icon: item.icon,
                    label: (
                        <Link href={item.route ?? "#"}>
                            {item.meta?.label ?? item.label}
                        </Link>
                    ),
                }))}
            />
        </Sider>
    );
};
