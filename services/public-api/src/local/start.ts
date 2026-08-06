import { listenLocalPublicApiServer } from './server';

const port = Number(process.env.PUBLIC_API_LOCAL_PORT || '5174');
const maxAttempts = Number(process.env.PUBLIC_API_LOCAL_PORT_ATTEMPTS || '10');

start(port, maxAttempts).catch((error) => {
  console.error('Failed to start local public API', error);
  process.exitCode = 1;
});

async function start(initialPort: number, attempts: number) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidatePort = initialPort + offset;
    try {
      const { url } = await listenLocalPublicApiServer(candidatePort);
      console.log(`Local public API listening on ${url}`);
      return;
    } catch (error) {
      if (isAddressInUse(error) && offset < attempts - 1) {
        console.warn(`Port ${candidatePort} is in use; trying ${candidatePort + 1}.`);
        continue;
      }
      throw error;
    }
  }
}

function isAddressInUse(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE';
}
