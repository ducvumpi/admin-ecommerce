// "use client";

// import { useGetIdentity } from "@refinedev/core";
// import { Result, Button } from "antd";
// import { useRouter } from "next/navigation";

// export default function RequireRole({
//     allow,
//     children,
// }: {
//     allow: string[];
//     children: React.ReactNode;
// }) {
//     const { data } = useGetIdentity();
//     const router = useRouter();

//     if (!data || !allow.includes(data.role)) {
//         return (
//             <Result
//                 status="403"
//                 title="403"
//                 subTitle="Bạn không có quyền truy cập"
//                 extra={
//                     <Button type="primary" onClick={() => router.push("/")}>
//                         Về trang chủ
//                     </Button>
//                 }
//             />
//         );
//     }

//     return <>{children}</>;
// }
