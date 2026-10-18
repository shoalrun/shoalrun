import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './dist/server.js';

const root = path.resolve(process.env.DOCS_PREVIEW_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'example/dist'));
const port = Number(process.env.DOCS_PREVIEW_PORT ?? 8765);
await serveSite(root, '127.0.0.1', port);
process.stdout.write(`Preview: http://127.0.0.1:${port}/\n`);
