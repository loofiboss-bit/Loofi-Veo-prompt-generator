import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { cwd } from 'node:process';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const rootDir = join(cwd(), 'dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const toSafePath = (urlPath) => {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = normalize(cleanPath).replace(/^\/+/, '');
  if (normalizedPath.includes('..')) {
    return null;
  }
  return normalizedPath;
};

const server = createServer(async (req, res) => {
  const safePath = toSafePath(req.url || '/');

  if (safePath === null) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  const requestedPath = safePath === '' ? 'index.html' : safePath;
  const filePath = join(rootDir, requestedPath);

  try {
    const fileContent = await readFile(filePath);
    const contentType = contentTypes[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fileContent);
  } catch {
    try {
      const fallback = await readFile(join(rootDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallback);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  }
});

server.listen(port, host, () => {
  console.log(`Serving dist on http://${host}:${port}`);
});
