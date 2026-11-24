// Approved reviews live in one small JSON file in your Vercel Blob store ("crystanva-reviews").
// On Vercel the store is connected via BLOB_STORE_ID (secure OIDC access, no key to manage);
// an older-style BLOB_READ_WRITE_TOKEN also works.
import { createHash } from 'node:crypto';
import { BlobNotFoundError, BlobPreconditionFailedError, del, get, list, put } from '@vercel/blob';

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

// Safe change to a stored list (reviews): read it with its version tag (etag), apply the change, and save
// only if nobody changed it in between ("ifMatch"); otherwise read again and retry. If the version check
// keeps failing, save anyway rather than leaving the tap stuck on "busy".
async function update(file, env, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await get(file, { access: 'public', ...auth(env) }).catch((e) => { if (e instanceof BlobNotFoundError) return null; throw e; });
    const list = r && r.statusCode === 200 ? JSON.parse((await new Response(r.stream).text()) || '[]') : [];
    const next = change(Array.isArray(list) ? list : []);
    try {
      await put(file, JSON.stringify(next), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'application/json', cacheControlMaxAge: 60,
        ...(r?.blob?.etag && attempt < 3 ? { ifMatch: r.blob.etag } : {}),
        ...auth(env),
      });
      return next;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((ok) => setTimeout(ok, 150 * (attempt + 1)));
    }
  }
  throw new Error('List is busy, please try again');
}

export const updateApproved = (env, change) => update(FILE, env, change);

// ---------- orders (feed the Excel sheet) ----------
// One small file per order: orders/<hash>/000012.json. The hash comes from the bot token so the links can't be guessed.
// A new order takes the next free number (saving never overwrites an existing file, so two orders can't share a number).
const hash = (env) => createHash('sha256').update(env.TELEGRAM_BOT_TOKEN || '').digest('hex').slice(0, 24);
const orderDir = (env) => `orders/${hash(env)}/`;
const orderPath = (env, n) => `${orderDir(env)}${String(n).padStart(6, '0')}.json`;
const publicUrl = (env, path) => `https://${storeId(env).toLowerCase()}.public.blob.vercel-storage.com/${path}`;

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' }); // skip the CDN cache: always the latest
  return res.ok ? res.json().catch(() => null) : null;
}

async function orderBlobs(env) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: orderDir(env), limit: 1000, cursor, ...auth(env) });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

// older single-file log (kept readable so no order is lost)
const legacyOrders = async (env) => {
  const j = await fetchJson(publicUrl(env, `orders-${hash(env)}.json`));
  return Array.isArray(j) ? j : [];
};

export async function readOrders(env) {
  const [blobs, legacy] = await Promise.all([orderBlobs(env), legacyOrders(env)]);
  const byNo = new Map(legacy.map((o) => [o.no, o]));
  for (const o of await Promise.all(blobs.map((b) => fetchJson(b.url)))) if (o?.no) byNo.set(o.no, o);
  return [...byNo.values()].sort((a, b) => a.no - b.no);
}

// build(no) returns the order to save
export async function addOrder(env, build) {
  const [blobs, legacy] = await Promise.all([orderBlobs(env), legacyOrders(env)]);
  let no = Math.max(0, ...legacy.map((o) => o.no || 0), ...blobs.map((b) => parseInt(b.pathname.split('/').pop(), 10) || 0)) + 1;
  for (let i = 0; ; i++, no++) {
    const order = build(no);
    try {
      await put(orderPath(env, no), JSON.stringify(order), {
        access: 'public', addRandomSuffix: false, allowOverwrite: false,
        contentType: 'application/json', cacheControlMaxAge: 60, ...auth(env),
      });
      return order;
    } catch (e) {
      if (i >= 3) throw e; // number was taken by another order: try the next one
    }
  }
}

// change one order (paid / made / transaction ID); returns false if there is no such order
export async function patchOrder(env, no, change) {
  const order = (await readOrders(env)).find((o) => o.no === no);
  if (!order) return false;
  await put(orderPath(env, no), JSON.stringify(change(order)), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60, ...auth(env),
  });
  return true;
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

// delete every order (owner's /reset): the per-order files and the older single file
export async function resetOrders(env) {
  const blobs = await orderBlobs(env);
  if (blobs.length) await del(blobs.map((b) => b.url), auth(env));
  await del(publicUrl(env, `orders-${hash(env)}.json`), auth(env)).catch(() => {});
  return blobs.length;
}
