/**
 * TCP Health Check Script for NestJS Microservices
 *
 * Connects to a NestJS TCP microservice and sends a health.check command.
 * Exits 0 on success, 1 on failure.
 *
 * Usage: node healthcheck-tcp.js <host> <port>
 * Example: node healthcheck-tcp.js 0.0.0.0 30001
 */

const net = require('net');
const crypto = require('crypto');

const host = process.argv[2] || '0.0.0.0';
const port = parseInt(process.argv[3], 10) || 3000;
const TIMEOUT_MS = 3000;

const id = crypto.randomUUID();
const token = process.env.INTERNAL_RPC_TOKEN;
const data = token ? { serviceToken: token } : {};
const payload = JSON.stringify({
  pattern: 'health.check',
  data,
  id,
});

const message = `${payload.length}#${payload}`;

const client = new net.Socket();
let buffer = '';

const timeout = setTimeout(() => {
  client.destroy();
  process.exit(1);
}, TIMEOUT_MS);

client.connect(port, host, () => {
  client.write(message);
});

client.on('data', (data) => {
  buffer += data.toString();

  // NestJS TCP protocol: <length>#<json>
  const hashIndex = buffer.indexOf('#');
  if (hashIndex === -1) return;

  const expectedLength = parseInt(buffer.substring(0, hashIndex), 10);
  const jsonStart = hashIndex + 1;
  const jsonStr = buffer.substring(jsonStart);

  if (jsonStr.length < expectedLength) return;

  try {
    const response = JSON.parse(jsonStr.substring(0, expectedLength));
    if (response.response && response.response.status === 'ok') {
      clearTimeout(timeout);
      client.destroy();
      process.exit(0);
    } else {
      clearTimeout(timeout);
      client.destroy();
      process.exit(1);
    }
  } catch {
    clearTimeout(timeout);
    client.destroy();
    process.exit(1);
  }
});

client.on('error', () => {
  clearTimeout(timeout);
  client.destroy();
  process.exit(1);
});
