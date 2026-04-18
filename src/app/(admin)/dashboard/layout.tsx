import React from "react";
import { ThemedLayout } from "@refinedev/antd";
import { Header } from "@components/header";

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <ThemedLayout Header={Header} >
      {children}
    </ThemedLayout>
  );
}
