"use client";

import { useLogin, useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query"; // 🔥 thêm
import { Form, Input, Typography, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Text } = Typography;

export default function LoginPage() {
    const { mutate: login, isPending } = useLogin();
    const { refetch } = useGetIdentity();
    const queryClient = useQueryClient(); // 🔥 thêm
    const router = useRouter();
    const [form] = Form.useForm();

    const onFinish = (values: { email: string; password: string }) => {
        login(values, {
            onSuccess: async () => {
                // 🔥 QUAN TRỌNG NHẤT
                await queryClient.clear(); // 💥 reset toàn bộ cache

                await refetch(); // lấy identity mới

                router.replace("/");
            },
            onError: (error) => {
                const errorMessages: Record<string, string> = {
                    "Invalid login credentials": "Email hoặc mật khẩu không đúng",
                    "Email not confirmed": "Email chưa được xác nhận",
                    "User not found": "Tài khoản không tồn tại",
                    "Too many requests": "Đăng nhập quá nhiều lần, vui lòng thử lại sau",
                };

                message.error(
                    errorMessages[error?.message] ||
                    error?.message ||
                    "Đăng nhập thất bại"
                );
            },
        });
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--color-bg-page, #f0f2f5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }}>
            <div style={{
                width: 420,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #e8e8e8",
                overflow: "hidden",
            }}>
                {/* Header strip */}
                <div style={{
                    background: "#1a1a2e",
                    padding: "32px 40px 28px",
                    textAlign: "center",
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        background: "#4f46e5",
                        borderRadius: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 22V12h6v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div style={{ color: "#fff", fontSize: 18, fontWeight: 600, letterSpacing: 0.3 }}>
                        Admin Dashboard
                    </div>
                    <div style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
                        Hệ thống quản lý bán hàng
                    </div>
                </div>

                {/* Form section */}
                <div style={{ padding: "32px 40px 36px" }}>
                    <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
                        <Form.Item
                            label={<span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Email</span>}
                            name="email"
                            rules={[
                                { required: true, message: "Vui lòng nhập email" },
                                { type: "email", message: "Email không hợp lệ" },
                            ]}
                            style={{ marginBottom: 20 }}
                        >
                            <Input
                                size="large"
                                prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
                                placeholder="admin@shop.com"
                                autoFocus
                                style={{ borderRadius: 8, fontSize: 14 }}
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Mật khẩu</span>}
                            name="password"
                            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
                            style={{ marginBottom: 28 }}
                        >
                            <Input.Password
                                size="large"
                                prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                                placeholder="••••••••"
                                style={{ borderRadius: 8, fontSize: 14 }}
                            />
                        </Form.Item>

                        <button
                            type="submit"
                            disabled={isPending}
                            style={{
                                width: "100%",
                                height: 44,
                                background: isPending ? "#6366f1aa" : "#4f46e5",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: isPending ? "not-allowed" : "pointer",
                                letterSpacing: 0.3,
                                transition: "background 0.2s",
                            }}
                        >
                            {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                    </Form>

                    <div style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: "1px solid #f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}>
                        <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#10b981",
                        }} />
                        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                            Kết nối bảo mật SSL
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
}