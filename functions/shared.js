const nodemailer = require('nodemailer');
const Busboy = require('busboy');

const MAIL_TO   = process.env.MAIL_TO   || 'info@globaldirectfence.com';
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER;

const FIELD_LABELS = {
  firstName:    'First Name',
  lastName:     'Last Name',
  email:        'Email',
  phone:        'Phone',
  address:      'Property Address',
  propertyType: 'Property Type',
  fenceType:    'Fence Type',
  linearFeet:   'Approximate Linear Feet',
  fenceHeight:  'Fence Height',
  postSpacing:  'Post Spacing',
  numGates:     'Number of Gates',
  gateWidth:    'Gate Width',
  colorFinish:  'Colour / Finish',
  panelStyle:   'Panel Style',
  message:      'Project Details'
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function label(field) {
  return FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function buildHtml(title, fields) {
  const rows = Object.entries(fields)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:bold;white-space:nowrap;color:#555">${escapeHtml(label(k))}</td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`)
    .join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="background:#1a3a6b;color:#fff;padding:16px 20px;margin:0;border-radius:6px 6px 0 0">${escapeHtml(title)}</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none">${rows}</table>
      <p style="margin-top:16px;color:#999;font-size:12px">Sent from the Global School Fence website</p>
    </div>`;
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 && !/^(\d)\1{9}$/.test(d);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// ── Rate limiting (per instance; Cloud Armor recommended for multi-instance) ──
const _ratemap = new Map();
const RATE_LIMIT  = 5;   // max requests
const RATE_WINDOW = 60 * 1000; // per 60 s

function isRateLimited(ip) {
  const now  = Date.now();
  const entry = _ratemap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) { entry.count = 0; entry.start = now; }
  entry.count++;
  _ratemap.set(ip, entry);
  // cleanup stale entries periodically
  if (_ratemap.size > 5000) {
    for (const [k, v] of _ratemap) { if (now - v.start > RATE_WINDOW) _ratemap.delete(k); }
  }
  return entry.count > RATE_LIMIT;
}

function handleCors(req, res) {
  const allowedRaw = process.env.ALLOWED_ORIGIN || '';
  const allowed = allowedRaw.split(',').map(o => o.trim()).filter(Boolean);
  const origin  = req.headers.origin || '';

  // Block all cross-origin requests when no ALLOWED_ORIGIN is configured —
  // prevents any site calling the function directly.
  if (!allowed.length) {
    res.status(403).json({ error: 'ALLOWED_ORIGIN env var is not configured.' });
    return true;
  }

  if (!allowed.includes(origin)) {
    res.status(403).json({ error: 'Forbidden' });
    return true;
  }

  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files  = {};
    const bb = Busboy({ headers: req.headers });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file',  (name, stream, info) => {
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('end',  () => { files[name] = { buffer: Buffer.concat(chunks), filename: info.filename, mimetype: info.mimeType }; });
    });
    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error',  reject);
    if (req.rawBody) { bb.end(req.rawBody); } else { req.pipe(bb); }
  });
}

module.exports = { MAIL_TO, MAIL_FROM, buildHtml, isValidEmail, isValidPhone, createTransporter, handleCors, parseMultipart, isRateLimited };
