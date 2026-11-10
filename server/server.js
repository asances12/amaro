import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)), 'public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Método no permitido');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Solicitud no válida');
    return;
  }
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = resolve(root, requested);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Acceso denegado');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('No es un archivo');

    const type = types[extname(file)] ?? 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    };

    if (extname(file) === '.mp4') {
      headers['Accept-Ranges'] = 'bytes';
      const range = request.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
          return;
        }

        const start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
        const end = match[1]
          ? Math.min(Number(match[2] || info.size - 1), info.size - 1)
          : info.size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= info.size || start > end) {
          response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
          return;
        }

        headers['Content-Length'] = end - start + 1;
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        response.writeHead(206, headers);
        if (request.method === 'HEAD') return response.end();
        createReadStream(file, { start, end }).pipe(response);
        return;
      }
    }

    response.writeHead(200, headers);
    if (request.method === 'HEAD') return response.end();
    if (extname(file) === '.mp4') {
      createReadStream(file).pipe(response);
    } else {
      response.end(await readFile(file));
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`AMARO está disponible en http://localhost:${port}`));
