
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Nota: 'output: export' é necessário para gerar o APK via Capacitor.
  // Para testes na Web (Vercel/Firebase Hosting), recomendamos manter desativado
  // para permitir o uso de Server Actions e evitar erros de CORS com o Redash.
  // output: 'export', 
  images: {
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
