"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/libs/supabaseClient";
import { Spin, Result, Button } from "antd";

type Status = "loading" | "unauthenticated" | "forbidden" | "admin";

export default function IndexPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setStatus("unauthenticated");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        setStatus("forbidden");
        return;
      }

      setStatus("admin");
    };

    run();
  }, []);

  // 🔥 redirect phải đặt trong useEffect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }

    if (status === "admin") {
      router.replace("/products");
    }
  }, [status, router]);

  // ⏳ loading
  if (status === "loading") {
    return <Spin fullscreen />;
  }

  // ❌ không có quyền → hiển thị UI
  if (status === "forbidden") {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập"
        extra={
          <Button onClick={() => router.replace("/login")}>
            Đăng nhập lại
          </Button>
        }
      />
    );
  }

  // ⏳ đang redirect
  return <Spin fullscreen />;
}