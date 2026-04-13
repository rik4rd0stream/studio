
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /**
   * Configuração padrão para Web e Live URL.
   * Suporta Server Actions, Genkit e consulta ao Redash sem erros de CORS.
   * NÃO use output: 'export' aqui para que as funções de servidor funcionem na Vercel.
   */
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
