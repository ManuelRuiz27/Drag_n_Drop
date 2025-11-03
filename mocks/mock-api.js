// Simple mock payments API server for local development.
// Usage: npm run mock:api

const http = require('http');
const { randomUUID } = require('crypto');
const url = require('url');

const PORT = Number(process.env.MOCK_API_PORT || 3000);
const HOST = process.env.MOCK_API_HOST || '0.0.0.0';

const codiCharges = new Map();

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function handleMercadoPagoPreference(req, res) {
  parseRequestBody(req)
    .then((body) => {
      const preferenceId = `PREF-${randomUUID()}`;
      const checkoutUrl = `https://sandbox.mercadopago.com/init?pref_id=${preferenceId}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      sendJson(res, 200, {
        preferenceId,
        initPoint: checkoutUrl,
        sandboxInitPoint: checkoutUrl,
        expiresAt,
        receivedPayload: body,
      });
    })
    .catch((error) => {
      sendJson(res, 400, { message: 'Invalid JSON payload', detail: String(error.message) });
    });
}

function handleMercadoPagoPaymentStatus(req, res, pathname) {
  const segments = pathname.split('/');
  const paymentId = segments[segments.length - 1] || 'MOCK';
  const now = new Date();

  sendJson(res, 200, {
    id: paymentId,
    status: paymentId.endsWith('approved') ? 'approved' : 'pending',
    statusDetail: paymentId.endsWith('approved') ? 'accredited' : 'pending_waiting_payment',
    amount: 1250,
    currency: 'MXN',
    approvedAt: now.toISOString(),
    orderId: 'ORD-98342',
    metadata: {
      source: 'mock-api',
    },
    lastUpdatedAt: now.toISOString(),
  });
}

function handleCodiQr(req, res) {
  parseRequestBody(req)
    .then(() => {
      const codiId = `CODI-${randomUUID()}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const deeplink = `codi://qr/${codiId}`;
      const qrData =
        'data:image/svg+xml;base64,' +
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#050505"/><text x="50%" y="50%" fill="#d4af37" font-size="22" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">CoDi ${codiId.slice(-4)}</text></svg>`
        ).toString('base64');

      codiCharges.set(codiId, {
        status: 'pending',
        updatedAt: new Date().toISOString(),
      });

      sendJson(res, 200, {
        codiId,
        qrData,
        deeplink,
        expiresAt,
      });
    })
    .catch((error) => {
      sendJson(res, 400, { message: 'Invalid JSON payload', detail: String(error.message) });
    });
}

function handleCodiCharges(req, res, pathname) {
  const segments = pathname.split('/');
  const codiId = segments[segments.length - 1];
  const charge = codiCharges.get(codiId);

  if (!charge) {
    sendJson(res, 404, { message: 'Charge not found', codiId });
    return;
  }

  const hasElapsed = Date.now() - Date.parse(charge.updatedAt) > 10_000;
  if (hasElapsed && charge.status === 'pending') {
    charge.status = 'authorized';
    charge.authorizedAt = new Date().toISOString();
    charge.payerAccount = 'BBVA-1234';
    charge.updatedAt = charge.authorizedAt;
    codiCharges.set(codiId, charge);
  }

  sendJson(res, 200, {
    codiId,
    status: charge.status,
    authorizedAt: charge.authorizedAt ?? null,
    payerAccount: charge.payerAccount ?? null,
    amount: 1250,
    currency: 'MXN',
    updatedAt: charge.updatedAt,
  });
}

function handleSpeiReferences(req, res) {
  parseRequestBody(req)
    .then(() => {
      const reference = `BBVA-${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
      sendJson(res, 200, {
        reference,
        clabe: '012345678901234567',
        alias: 'Mock SPEI',
        status: 'pending',
      });
    })
    .catch((error) => {
      sendJson(res, 400, { message: 'Invalid JSON payload', detail: String(error.message) });
    });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname || '/';

  if (req.method === 'POST' && pathname === '/api/mercadopago/preferences') {
    handleMercadoPagoPreference(req, res);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/mercadopago/payments/')) {
    handleMercadoPagoPaymentStatus(req, res, pathname);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/codi/qr') {
    handleCodiQr(req, res);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/codi/charges/')) {
    handleCodiCharges(req, res, pathname);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/spei/references') {
    handleSpeiReferences(req, res);
    return;
  }

  sendJson(res, 404, {
    message: 'Endpoint not implemented in mock API',
    method: req.method,
    path: pathname,
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock payments API listening on http://${HOST}:${PORT}`);
});
