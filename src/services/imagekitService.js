import ImageKit from 'imagekit';
import { config } from '../config.js';

let _client = null;

function getClient() {
  if (_client) return _client;
  const { publicKey, privateKey, urlEndpoint } = config.imagekit;
  if (!publicKey || !privateKey) {
    const err = new Error('ImageKit not configured');
    err.status = 503;
    err.code = 'IMAGEKIT_NOT_CONFIGURED';
    throw err;
  }
  _client = new ImageKit({ publicKey, privateKey, urlEndpoint });
  return _client;
}

/**
 * Upload buffer to ImageKit. Returns { url, fileId, name }.
 */
export async function uploadBuffer(buffer, fileName, { folder = '/medical-reports' } = {}) {
  const client = getClient();
  const safeName = String(fileName || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await client.upload({
    file: buffer,
    fileName: safeName,
    folder,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId, name: result.name };
}
