import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rappi.commander',
  appName: 'Rappi Commander',
  webDir: 'out',
  server: {
    // A URL da sua Vercel onde o app roda de verdade
    url: "https://studio-kappa-mocha.vercel.app",
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      overlay: true, // Permite que o app use o espaço atrás da barra de status
      backgroundColor: '#E65C1A',
      style: 'DARK'
    }
  },
};

export default config;