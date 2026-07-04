import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reyanshgidwani.kharche',
  appName: 'Kharche',
  webDir: 'public',
  server: {
    url: "https://kharche-iota.vercel.app",
    androidScheme: "https"
  }
};

export default config;
