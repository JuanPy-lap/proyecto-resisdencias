// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el servidor de desarrollo desde un celular en la red local.
  // Si cambia la IP de tu equipo (ipconfig), agrégala aquí.
  allowedDevOrigins: ['192.168.1.88', '169.254.83.107', 'localhost:3000'],
  images: {
    // Fotos públicas del bucket de Supabase Storage (next/image).
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // El módulo de cámara ahora se llama Fotos; los enlaces viejos siguen funcionando.
  async redirects() {
    return [{ source: '/camara', destination: '/fotos', permanent: true }];
  },
};

export default nextConfig;
