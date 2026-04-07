"use client";

import { useEffect } from "react";
import { useIsAuthenticated, useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: isAuth, isLoading: authLoading } = useIsAuthenticated();
    const { data: identity, isLoading: identityLoading } = useGetIdentity<{ role: string }>();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuth) {
            router.replace("/login");
        }
    }, [isAuth, authLoading, router]);

    // ⏳ Chờ cả auth lẫn identity load xong
    if (authLoading || identityLoading) return <Spin fullscreen />;

    if (!isAuth) return null;

    // 🚫 KHÔNG PHẢI ADMIN
    if (identity?.role !== "admin") {
        return (
            <Result
                status="403"
                title="403"
                subTitle="Bạn không có quyền truy cập"
                extra={
                    <Button onClick={() => router.replace("/login")}>
                        Quay lại
                    </Button>
                }
            />
        );
    }

    // ✅ ADMIN
    return <>{children}</>;
}