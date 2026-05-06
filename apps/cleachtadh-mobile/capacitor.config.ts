import type { CapacitorConfig } from '@capacitor/cli';

const appName = process.env.MOBILE_APP_NAME || 'Cleachtadh';
const appId = process.env.MOBILE_APP_ID || 'ie.misneach.cleachtadh';
const hostedWebUrl = (process.env.MOBILE_WEB_URL || '').trim();
const useHostedWeb = process.env.MOBILE_USE_HOSTED_WEB === 'true' && hostedWebUrl.length > 0;

const config: CapacitorConfig = {
  appId,
  appName,
  // Phase 2 bundled-assets mode: load local cleachtadh-web build output.
  webDir: '../cleachtadh-web/build',
  ...(useHostedWeb
    ? {
        // Optional rollback path to hosted-web mode.
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
