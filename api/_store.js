// Approved reviews live in one small JSON file in your Vercel Blob store ("crystanva-reviews").
import { put } from '@vercel/blob';

const FILE = 'reviews.json';

// The store's public address can be worked out from its token: vercel_blob_rw_<storeId>_<secret>
function fileUrl(env) {
  const id = (env.BLOB_READ_WRITE_TOKEN || '').split('_')[3];
  return id ? `https://${id.toLowerCase()}.public.blob.vercel-storage.com/${FILE}` : null;
}

export const storeReady = (env) => Boolean(env.BLOB_READ_WRITE_TOKEN);

// fresh = skip the CDN cache (used right before changing the list)
export async function readApproved(env, fresh = false) {
  const url = fileUrl(env);
  if (!url) return [];
  const res = await fetch(fresh ? `${url}?v=${Date.now()}` : url, { cache: 'no-store' });
  if (!res.ok) return []; // no reviews approved yet
  const list = await res.json().catch(() => []);
  return Array.isArray(list) ? list : [];
}

export async function writeApproved(list, env) {
  await put(FILE, JSON.stringify(list), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
    token: env.BLOB_READ_WRITE_TOKEN,
  });
}
