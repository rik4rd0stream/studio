
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rappi.commander',
  appName: 'Rappi Commander',
  webDir: 'out',
  server: {
    url: "https://studio-kappa-mocha.vercel.app",
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    // Desativado CapacitorHttp para não interferir nas chamadas internas do SDK do Firebase
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      overlay: false,
      backgroundColor: '#E65C1A',
      style: 'DARK'
    }
  },
};

export default config;
