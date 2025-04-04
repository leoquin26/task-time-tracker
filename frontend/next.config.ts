import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Desactiva ESLint durante la compilación
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;