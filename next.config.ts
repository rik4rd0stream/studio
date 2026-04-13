
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /**
   * CONFIGURAÇÃO PARA O APK (CAPACITOR):
   * Para gerar o APK Android, você PRECISA descomentar a linha 'output: export' abaixo.
   * Enquanto estiver apenas testando na Vercel (Web), pode deixá-la comentada para usar 
   * recursos de servidor se necessário.
   */
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
