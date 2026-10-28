'use strict';

const fs = require('fs');
const { Readable } = require('stream');
const { fileURLToPath } = require('url');

const SAFE_ID = /^[a-zA-Z0-9._:-]{1,250}$/;

function mediaDisplayUrl(kind, id) {
  if (!['media', 'render'].includes(kind) || !SAFE_ID.test(String(id || '')))
    throw new Error('Invalid local media identity.');
  return `loofi-media://${kind}/${encodeURIComponent(id)}`;
}

function rangeFor(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start)
      return null;
    end = Math.min(end, size - 1);
  }
  return { start, end, partial: true };
}

/** Exposes only registered, verified local assets and completed verified render jobs. */
function registerCreatorMediaProtocol({ protocol, getStore, getEngine, allowedOrigins = [] }) {
  const origins = new Set(['null', ...allowedOrigins]);
  protocol.handle('loofi-media', async (request) => {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed.', { status: 405 });
    const origin = request.headers.get('origin');
    if (origin && !origins.has(origin)) return new Response('Forbidden.', { status: 403 });
    let url;
    let id;
    try {
      url = new URL(request.url);
      id = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return new Response('Invalid local media.', { status: 400 });
    }
    if (
      !['media', 'render'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !SAFE_ID.test(id)
    )
      return new Response('Local media not found.', { status: 404 });
    try {
      let filePath;
      let mimeType;
      if (url.hostname === 'media') {
        const record = await getStore()?.resolve(id);
        if (!record?.path) return new Response('Local media not found.', { status: 404 });
        filePath = record.path;
        mimeType = record.mimeType || 'application/octet-stream';
      } else {
        const engine = getEngine();
        if (!engine) return new Response('Local media not available.', { status: 503 });
        if (engine.ready) await engine.ready();
        const preview = await engine.preview(id);
        filePath = fileURLToPath(preview.url);
        mimeType = 'video/mp4';
      }
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return new Response('Local media not found.', { status: 404 });
      const range = rangeFor(request.headers.get('range'), stat.size);
      if (!range)
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${stat.size}` },
        });
      const headers = {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'Content-Type': mimeType,
        'Content-Length': String(stat.size ? range.end - range.start + 1 : 0),
        ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
        ...(range.partial
          ? { 'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}` }
          : {}),
      };
      const body =
        request.method === 'HEAD' || !stat.size
          ? null
          : Readable.toWeb(fs.createReadStream(filePath, { start: range.start, end: range.end }));
      return new Response(body, { status: range.partial ? 206 : 200, headers });
    } catch {
      return new Response('Local media not found.', { status: 404 });
    }
  });
}

module.exports = { mediaDisplayUrl, registerCreatorMediaProtocol };
