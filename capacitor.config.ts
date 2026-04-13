
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rappi.commander',
  appName: 'Rappi Commander',
  webDir: 'out',
  server: {
    // IMPORTANTE: O APK agora carregará o site diretamente da Vercel.
    // Isso garante que o app esteja sempre atualizado e resolva problemas de CORS e Server Actions.
    url: "https://motoboy-13742.vercel.app",
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
