"use client";

import { Suspense } from "react";
import { Authenticated, useGetIdentity } from "@refinedev/core";
import { Spin, Result, Button } from "antd";
import { useRouter } from "next/navigation";
import { NavigateToResource } from "@refinedev/nextjs-router";

function AdminGate() {
  const { data: identity, isLoading } = useGetIdentity<{ role: string }>();
  const router = useRouter();

  // ⏳ Chờ identity load xong (tránh role = undefined → hiện 403 sớm)
  if (isLoading || identity?.role == null) {
    return <Spin fullscreen />;
  }

  // 🚫 Không phải admin
  if (identity.role !== "admin") {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập"
        extra={
          <Button onClick={() => router.replace("/login")}>
            Quay lại đăng nhập
          </Button>
        }
      />
    );
  }

  // ✅ Admin → điều hướng vào resource đầu tiên
  return <NavigateToResource />;
}

export default function IndexPage() {
  return (
    // Authenticated tự xử lý redirect → /login nếu chưa đăng nhập
    <Suspense fallback={<Spin fullscreen />}>
      <Authenticated key="authenticated" fallback={<Spin fullscreen />}>
        <AdminGate />
      </Authenticated>
    </Suspense>
  );
}