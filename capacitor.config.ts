
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rappi.commander',
  appName: 'Rappi Commander',
  webDir: 'out',
  server: {
    // O APK carregará o site diretamente da Vercel.
    // Isso garante que o app esteja sempre atualizado e resolva problemas de CORS e Server Actions.
    url: "https://studio-kappa-mocha.vercel.app",
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlay: false,
      backgroundColor: '#E65C1A',
      style: 'DARK'
    }
  },
};

export default config;
