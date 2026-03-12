import ImageKit from 'imagekit';
import { config } from '../config.js';

let _client = null;

function getClient() {
  if (_client) return _client;
  const { publicKey, privateKey, urlEndpoint } = config.imagekit;
  if (!publicKey || !privateKey) {
    throw Object.assign(new Error('ImageKit not configured'), {
      status: 503,
      code: 'IMAGEKIT_NOT_CONFIGURED',
    });
  }
  _client = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });
  return _client;
}

/**
 * Upload a file buffer to ImageKit. Returns { url, fileId, name }.
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
  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
  };
}
