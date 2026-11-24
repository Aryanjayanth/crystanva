// Approved reviews live in one small JSON file in your Vercel Blob store ("crystanva-reviews").
// On Vercel the store is connected via BLOB_STORE_ID (secure OIDC access, no key to manage);
// an older-style BLOB_READ_WRITE_TOKEN also works.
import { del, put } from '@vercel/blob';

const FILE = 'reviews.json';

function storeId(env) {
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN.split('_')[3] || null; // vercel_blob_rw_<id>_<secret>
  if (env.BLOB_STORE_ID) return env.BLOB_STORE_ID.replace(/^store_/, '');
  return null;
}

export const storeReady = (env) => Boolean(storeId(env));

const fileUrl = (env) => `https://${storeId(env).toLowerCase()}.public.blob.vercel-storage.com/${FILE}`;

// fresh = skip the CDN cache (used right before changing the list)
export async function readApproved(env, fresh = false) {
  if (!storeReady(env)) return [];
  const url = fileUrl(env);
  const res = await fetch(fresh ? `${url}?v=${Date.now()}` : url, { cache: 'no-store' });
  if (!res.ok) return []; // nothing approved yet
  const list = await res.json().catch(() => []);
  return Array.isArray(list) ? list : [];
}

const auth = (env) => (env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {});

// approved review photos: photos/<review id>.jpg
export async function savePhoto(id, bytes, env) {
  const blob = await put(`photos/${id}.jpg`, bytes, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'image/jpeg', cacheControlMaxAge: 31536000, ...auth(env),
  });
  return blob.url;
}

export async function deletePhoto(url, env) {
  if (url) await del(url, auth(env)).catch(() => {});
}

export async function writeApproved(list, env) {
  await put(FILE, JSON.stringify(list), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
    ...auth(env),
  });
}
