import nodeAdapter from '@sveltejs/adapter-node';
import staticAdapter from '@sveltejs/adapter-static';

const isMobileBundledBuild = process.env.MOBILE_BUNDLED === '1';

const config = {
  kit: {
    adapter: isMobileBundledBuild
      ? staticAdapter({
          fallback: 'index.html'
        })
      : nodeAdapter(),
    prerender: isMobileBundledBuild
      ? {
          entries: []
        }
      : undefined
  }
};

export default config;
