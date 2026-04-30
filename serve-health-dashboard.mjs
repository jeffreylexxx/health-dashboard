#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const host = '0.0.0.0';
const port = 8788;
const baseDir = 'C:/Users/jeffreylex/.openclaw/workspace';
const filePath = path.join(baseDir, 'health-dashboard.html');

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (url.pathname === '/' || url.pathname === '/health-dashboard.html') {
    fs.readFile(filePath, (err, data) => {
      if (err) return send(res, 500, 'Failed to load health-dashboard.html');
      send(res, 200, data, 'text/html; charset=utf-8');
    });
    return;
  }
  if (url.pathname === '/healthz') {
    return send(res, 200, 'ok');
  }
  send(res, 404, 'Not found');
});

server.listen(port, host, () => {
  console.log(`health-dashboard server listening on http://${host}:${port}`);
});
