"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import { useNotificationProvider } from "@refinedev/antd";
import { dataProviderSupabase } from "@/app/libs/dataProviders";
import { AppIcon } from "@/components/app-icon";
import { ColorModeContextProvider } from "@/contexts/color-mode";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import React from "react";
import { authProvider } from "@providers/authProviders/authProvider";
import customI18nProvider from "@/app/libs/i18nProvider";
import {
    ShoppingOutlined,
    AppstoreOutlined,
    ShoppingCartOutlined,
    BgColorsOutlined,
} from "@ant-design/icons";
interface RefineProviderProps {
    children: React.ReactNode;
    defaultMode: "light" | "dark";
}

export function RefineProvider({ children, defaultMode }: RefineProviderProps) {
    return (
        <RefineKbarProvider>
            <AntdRegistry>
                <ColorModeContextProvider defaultMode={defaultMode}>
                    <Refine
                        i18nProvider={customI18nProvider}
                        authProvider={authProvider}
                        routerProvider={routerProvider}
                        dataProvider={dataProviderSupabase}
                        notificationProvider={useNotificationProvider}
                        resources={[
                            {
                                name: "dashboard",
                                list: "/dashboard",
                                meta: {
                                    label: "Dashboard",
                                    canDelete: true,
                                    icon: <ShoppingOutlined />,
                                },
                            },
                            {
                                name: "products",
                                list: "/products",
                                create: "/products/create",
                                edit: "/products/edit/:id",
                                show: "/products/show/:id",
                                meta: {
                                    label: "Sản phẩm",
                                    canDelete: true,
                                    icon: <ShoppingOutlined />,
                                },
                            },
                            {
                                name: "categories",
                                list: "/categories",
                                create: "/categories/create",
                                edit: "/categories/edit/:id",
                                show: "/categories/show/:id",
                                meta: {
                                    label: "Danh mục",
                                    canDelete: true,
                                    icon: <AppstoreOutlined />,
                                },
                            },
                            {
                                name: "orders",
                                list: "/orders",
                                create: "/orders/create",
                                edit: "/orders/edit/:id",
                                show: "/orders/show/:id",
                                meta: {
                                    label: "Đơn hàng",
                                    canDelete: true,
                                    icon: <ShoppingCartOutlined />,
                                },
                            },

                        ]}
                        options={{
                            syncWithLocation: true,
                            warnWhenUnsavedChanges: true,
                            projectId: "i0refO-qq8Lp2-3OKL9w",
                            title: { text: "Quản lý sản phẩm", icon: <AppIcon /> },
                        }}
                    >
                        {children}
                        <RefineKbar />
                    </Refine>
                </ColorModeContextProvider>
            </AntdRegistry>
        </RefineKbarProvider >
    );
}
