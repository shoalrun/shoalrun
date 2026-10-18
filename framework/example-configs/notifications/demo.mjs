import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// A local teaching fixture. It never contacts a notification provider or sends mail.
export function createNotificationDemo() {
  const messages = new Map();
  return createServer(async (request, response) => {
    const send = (code, value) => { response.writeHead(code, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/v1/messages/email') {
      let body = '';
      try {
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 16384) { send(413, { error: 'Request too large' }); return; }
        }
        const value = JSON.parse(body);
        if (typeof value.to !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.to) || value.template !== 'welcome') {
          send(400, { error: 'Use an email address and the welcome template' }); return;
        }
        const id = `msg_${randomUUID()}`;
        messages.set(id, { reads: 0, failed: value.to === 'blocked@example.com' });
        send(202, { id, status: 'queued' });
      } catch { send(400, { error: 'Expected a JSON request body' }); }
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/v1/messages/')) {
      const id = url.pathname.slice('/v1/messages/'.length);
      const message = messages.get(id);
      if (!message) { send(404, { error: 'Message not found' }); return; }
      const status = message.reads++ === 0 ? 'queued' : message.failed ? 'failed' : 'delivered';
      send(200, { id, status, ...(status === 'failed' ? { failureReason: 'recipient_rejected' } : {}) });
      return;
    }
    send(404, { error: 'Route not found' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createNotificationDemo();
  server.listen(8787, '127.0.0.1', () => console.log('Notification demo: http://127.0.0.1:8787/v1 (simulated delivery; no mail is sent)'));
}
