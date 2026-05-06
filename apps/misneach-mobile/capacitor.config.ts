import type { CapacitorConfig } from '@capacitor/cli';

const appName = process.env.MOBILE_APP_NAME || 'Misneach';
const appId = process.env.MOBILE_APP_ID || 'ie.misneach.app';
const hostedWebUrl = (process.env.MOBILE_WEB_URL || 'https://misneach.ie').trim();
const useHostedWeb = process.env.MOBILE_USE_HOSTED_WEB !== 'false' && hostedWebUrl.length > 0;

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  ...(useHostedWeb
    ? {
        server: {
          url: hostedWebUrl,
          cleartext: false,
        },
      }
    : {}),
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
