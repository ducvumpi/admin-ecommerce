"use client";

import { Suspense } from "react";
import { Authenticated, useGetIdentity } from "@refinedev/core";
import { Spin, Result, Button } from "antd";
import { useRouter } from "next/navigation";
import { NavigateToResource } from "@refinedev/nextjs-router";

function AdminGate() {
  const { data: identity, isLoading } = useGetIdentity<{ role: string }>();
  const router = useRouter();

  if (isLoading || identity?.role == null) {
    return <Spin fullscreen />;
  }

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

  return <NavigateToResource />;
}

export default function IndexPage() {
  return (
    <Suspense fallback={<Spin fullscreen />}>
      <Authenticated
        key="authenticated"
        fallback={<Spin fullscreen />}
      >
        {/* key theo timestamp để force remount sau mỗi lần auth thay đổi */}
        <AdminGate key={typeof window !== "undefined" ? sessionStorage.getItem("auth_version") ?? "0" : "0"} />
      </Authenticated>
    </Suspense>
  );
}