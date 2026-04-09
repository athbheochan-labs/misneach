import type { CapacitorConfig } from '@capacitor/cli';

const appName = process.env.MOBILE_APP_NAME || 'Misneach';
const appId = process.env.MOBILE_APP_ID || 'site.misneach.mobile';
const hostedWebUrl = process.env.MOBILE_WEB_URL || 'https://www.misneach.site';

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  server: {
    // Phase 1 hosted-web shell mode.
    url: hostedWebUrl,
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
