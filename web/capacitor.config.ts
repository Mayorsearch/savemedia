import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.mayorsearch.savemedia',
  appName: 'SaveMedia',
  webDir: 'mobile-shell',
  server: {
    ...(serverUrl ? { url: serverUrl } : {}),
    cleartext: false,
    androidScheme: 'https',
  },
}

export default config
