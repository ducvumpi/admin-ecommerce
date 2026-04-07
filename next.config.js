/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // ✅ wildcard hostname

      },
    ],
    // domains: ["opjluoktkkgyqwujdhdu.supabase.co"]
  },
};

export default nextConfig;


