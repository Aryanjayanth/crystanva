// Approved reviews live in one small JSON file in your Vercel Blob store ("crystanva-reviews").
// On Vercel the store is connected via BLOB_STORE_ID (secure OIDC access, no key to manage);
// an older-style BLOB_READ_WRITE_TOKEN also works.
import { createHash } from 'node:crypto';
import { BlobPreconditionFailedError, del, get, put } from '@vercel/blob';

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

// Safe change to the approved list: read it together with its version tag (etag), apply the change,
// and save only if nobody changed it in between ("ifMatch"). If it changed — or the copy we read was
// slightly out of date — read again and retry. This stops two quick taps from undoing each other.
async function update(file, env, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await get(file, { access: 'public', ...auth(env) });
    const list = r && r.statusCode === 200 ? JSON.parse((await new Response(r.stream).text()) || '[]') : [];
    const next = change(Array.isArray(list) ? list : []);
    try {
      await put(file, JSON.stringify(next), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'application/json', cacheControlMaxAge: 60,
        ...(r?.blob?.etag ? { ifMatch: r.blob.etag } : {}),
        ...auth(env),
      });
      return next;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((ok) => setTimeout(ok, 300 * (attempt + 1)));
    }
  }
  throw new Error('List is busy, please try again');
}

// Safe change to a stored list: read it with its version tag (etag), apply the change, and save only
// if nobody changed it in between ("ifMatch"); otherwise read again and retry.
export const updateApproved = (env, change) => update(FILE, env, change);

// Orders log (feeds the Excel sheet). The file name includes a hash of the bot token so the link can't be guessed.
const ordersFile = (env) => `orders-${createHash('sha256').update(env.TELEGRAM_BOT_TOKEN || '').digest('hex').slice(0, 24)}.json`;
export const updateOrders = (env, change) => update(ordersFile(env), env, change);
export async function readOrders(env) {
  const r = await get(ordersFile(env), { access: 'public', ...auth(env) });
  if (!r || r.statusCode !== 200) return [];
  const list = JSON.parse((await new Response(r.stream).text()) || '[]');
  return Array.isArray(list) ? list : [];
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
