import { AuthProvider } from "@refinedev/core";
import { supabase } from "../../app/libs/supabaseClient";

export const authProvider: AuthProvider = {
 // providers/authProviders/authProvider.ts

login: async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorMessages: Record<string, string> = {
      "Invalid login credentials": "Email hoặc mật khẩu không đúng",
      "Email not confirmed": "Email chưa được xác nhận",
      "User not found": "Tài khoản không tồn tại",
      "Too many requests": "Đăng nhập quá nhiều lần, vui lòng thử lại sau",
    };

    return {
      success: false,
      error: {
        name: "Đăng nhập thất bại",
        message: errorMessages[error.message] || error.message,
      },
    };
  }

  // 🔥 QUAN TRỌNG: đợi session ổn định
  await supabase.auth.getSession();

  return {
    success: true,
    redirectTo: "/",
  };
},

  logout: async () => {
    await supabase.auth.signOut();
    return {
      success: true,
      redirectTo: "/login",
    };
  },

 check: async () => {
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    return {
      authenticated: false,
      redirectTo: "/login",
    };
  }

  return {
    authenticated: true,
  };

 
},

getIdentity: async () => {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return null;

  // 🔥 luôn lấy fresh từ DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return {
    id: userData.user.id,
    name: userData.user.email,
    role: profile?.role,
  };
},

  onError: async (error) => {
    console.error(error);
    return { error };
  },
};
