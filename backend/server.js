'use strict';
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const ENC_KEY = process.env.DATA_KEY ? Buffer.from(process.env.DATA_KEY, 'hex') : crypto.randomBytes(32);
if (ENC_KEY.length !== 32) throw new Error('DATA_KEY must be 64 hex characters (32 bytes)');
const ISSUER = 'citizen-cyber-shield';

/* ---------- Masking & safe logging ---------- */
const maskPhone = (p) => String(p).replace(/^(\d{2})\d+(\d{2})$/, (m, a, b) => a + '*'.repeat(m.length - 4) + b);
const maskTxn = (t) => {
  const s = String(t);
  return s.length <= 4 ? '*'.repeat(s.length) : '*'.repeat(s.length - 4) + s.slice(-4);
};
const maskLog = (s) => String(s).replace(/\b\d{10,}\b/g, (m) => maskTxn(m));
const log = (...args) =>
  console.log(new Date().toISOString(), ...args.map((a) => (typeof a === 'string' ? maskLog(a) : a)));

/* ---------- AES-256-GCM helpers (ciphertext bound to record id via AAD) ---------- */
function encryptData(obj, aad) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}
function decryptData(packed, aad) {
  const [iv, tag, ct] = packed.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'));
}
function verifyPayload(packed, aad) {
  try {
    decryptData(packed, aad);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Users ---------- */
const officers = [
  { officerId: 'OFF-1001', badgeNo: 'BDG-7421', name: 'Insp. R. Deshmukh', unit: 'Cyber Cell, Mumbai', passHash: bcrypt.hashSync('Shield@2026', 12) },
  { officerId: 'OFF-1002', badgeNo: 'BDG-3308', name: 'SI A. Kulkarni', unit: 'Cyber Cell, Thane', passHash: bcrypt.hashSync('Command#2026', 12) },
];
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12);

/* ---------- Brute-force protection (officer login) ---------- */
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;
const failures = new Map();
const lockRemaining = (key) => {
  const e = failures.get(key);
  return e && e.lockedUntil > Date.now() ? Math.ceil((e.lockedUntil - Date.now()) / 1000) : 0;
};
const recordFailure = (key) => {
  const e = failures.get(key) || { count: 0, lockedUntil: 0 };
  e.count += 1;
  if (e.count >= MAX_FAILS) {
    e.lockedUntil = Date.now() + LOCK_MS;
    e.count = 0;
  }
  failures.set(key, e);
  return MAX_FAILS - e.count;
};
const clearFailures = (key) => failures.delete(key);

/* ---------- OTP store (hashed with bcrypt, expiring) ---------- */
const otps = new Map();
const otpRequests = new Map();

/* ---------- App ---------- */
const app = express();
app.disable('x-powered-by');
app.use(
  cors({
    origin: [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/* ---------- Auth middleware ---------- */
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER });
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient privileges' });

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '2h', issuer: ISSUER });

/* ---------- Auth routes ---------- */
app.post('/api/auth/otp/request', async (req, res) => {
  const mobile = String((req.body || {}).mobile || '').trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  const now = Date.now();
  const rl = otpRequests.get(mobile) || { count: 0, reset: now + 5 * 60 * 1000 };
  if (rl.reset < now) {
    rl.count = 0;
    rl.reset = now + 5 * 60 * 1000;
  }
  if (rl.count >= 3) return res.status(429).json({ error: 'Too many OTP requests. Try again in a few minutes.' });
  rl.count += 1;
  otpRequests.set(mobile, rl);

  const otp = String(crypto.randomInt(100000, 1000000));
  otps.set(mobile, { hash: await bcrypt.hash(otp, 10), expires: now + 5 * 60 * 1000, attempts: 0 });
  log(`OTP issued for ${maskPhone(mobile)}`);
  const body = { message: 'OTP sent to your mobile number.' };
  if (process.env.NODE_ENV !== 'production') body.devOtp = otp;
  res.json(body);
});

app.post('/api/auth/login', async (req, res) => {
  const { role } = req.body || {};

  if (role === 'citizen') {
    const mobile = String(req.body.mobile || '').trim();
    const otp = String(req.body.otp || '').trim();
    const entry = otps.get(mobile);
    if (!entry || entry.expires < Date.now()) return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    entry.attempts += 1;
    if (entry.attempts > 5) {
      otps.delete(mobile);
      return res.status(429).json({ error: 'Too many wrong attempts. Request a new OTP.' });
    }
    if (!/^\d{6}$/.test(otp) || !(await bcrypt.compare(otp, entry.hash))) {
      return res.status(401).json({ error: 'That OTP is not correct.' });
    }
    otps.delete(mobile);
    const id = crypto.createHash('sha256').update(mobile).digest('hex').slice(0, 16);
    const user = { id, role: 'citizen', name: 'Citizen ' + mobile.slice(-4), maskedMobile: maskPhone(mobile) };
    log(`Citizen login ${user.maskedMobile}`);
    return res.json({ token: signToken({ sub: id, role: 'citizen', name: user.name, maskedMobile: user.maskedMobile }), user });
  }

  if (role === 'cyber_dept') {
    const { officerId, badgeNo, passcode } = req.body;
    if (![officerId, badgeNo, passcode].every((v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 64)) {
      return res.status(400).json({ error: 'Officer ID, badge number and passcode are required.' });
    }
    const key = `${req.ip}|${officerId.trim().toUpperCase()}`;
    const wait = lockRemaining(key);
    if (wait) return res.status(429).json({ error: `Too many failed attempts. Terminal locked for ${wait}s.`, retryAfter: wait });

    const officer = officers.find(
      (o) => o.officerId === officerId.trim().toUpperCase() && o.badgeNo === badgeNo.trim().toUpperCase()
    );
    const ok = await bcrypt.compare(passcode, officer ? officer.passHash : DUMMY_HASH);
    if (!officer || !ok) {
      const left = recordFailure(key);
      log(`Failed officer login for ${officerId.trim().toUpperCase()} from ${req.ip}`);
      const locked = lockRemaining(key);
      return res.status(locked ? 429 : 401).json({
        error: locked ? `Too many failed attempts. Terminal locked for ${locked}s.` : `Invalid credentials. ${left} attempt(s) remaining.`,
        retryAfter: locked || undefined,
      });
    }
    clearFailures(key);
    const user = { id: officer.officerId, role: 'cyber_dept', name: officer.name, unit: officer.unit };
    log(`Officer login ${officer.officerId}`);
    return res.json({ token: signToken({ sub: officer.officerId, role: 'cyber_dept', name: officer.name, unit: officer.unit }), user });
  }

  res.status(400).json({ error: 'Unknown role.' });
});

/* ---------- Scam analyzer ---------- */
const analyzerStats = { redUrls: 0 };
const TEXT_RULES = [
  { label: 'Urgency or threat language', weight: 15, detail: 'Scammers rush you so you do not stop to think.', re: /\b(urgent(ly)?|immediately|within \d+ (hours?|minutes?)|last warning|final notice|act now|expires? today|blocked|suspended|deactivated)\b/i },
  { label: 'Impersonated authority / digital arrest', weight: 55, detail: 'No agency (CBI, police, customs, TRAI) arrests anyone over a call or video call.', re: /(digital arrest|\bcbi\b|narcotics|customs officer|enforcement directorate|\btrai\b|arrest warrant|money laundering|parcel (seized|contains))/i },
  { label: 'Asks for OTP, PIN or CVV', weight: 40, detail: 'Banks never ask you to share an OTP, PIN or CVV.', re: /\b(share|send|tell|provide|enter)\b[^.]{0,40}\b(otp|pin|cvv|password|upi pin)\b|\b(otp|cvv|upi pin)\b[^.]{0,30}\b(share|send|tell)\b/i },
  { label: 'KYC / account update pretext', weight: 25, detail: 'Fake "KYC pending" messages are a very common phishing hook.', re: /\b(kyc|pan (update|card)|aadhaar (update|link)|update your (account|bank|pan)|account will be (blocked|closed))\b/i },
  { label: 'Prize, lottery or refund lure', weight: 25, detail: 'If you did not enter, you did not win.', re: /\b(lottery|you have won|prize|cashback|refund|reward points|gift card|free (gift|recharge))\b/i },
  { label: 'UPI collect request / QR trick', weight: 25, detail: 'You never need to approve a request or scan a QR to RECEIVE money.', re: /\b(collect request|approve (the )?request|scan (this )?qr|pay ₹?\d+ to receive)\b/i },
  { label: 'Work-from-home / task scam', weight: 20, detail: 'Paid "like and subscribe" or Telegram tasks lead to deposit scams.', re: /\b(work from home|part[- ]time job|earn ₹?\s?\d[\d,]*\s*(per|daily|a) day|like (and )?subscribe|telegram (group|task))\b/i },
  { label: 'App / APK install request', weight: 30, detail: 'Apps installed outside the Play Store or App Store can take over your phone.', re: /\.apk\b|\b(install (this )?app|download (the )?apk)\b/i },
];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorturl.at', 'wa.me'];
const BAD_TLDS = ['xyz', 'top', 'click', 'link', 'icu', 'buzz', 'cfd', 'sbs', 'vip', 'shop', 'online', 'site', 'live', 'work', 'support', 'rest'];
const BRANDS = {
  sbi: ['sbi.co.in', 'onlinesbi.sbi', 'sbi.bank.in'],
  hdfc: ['hdfcbank.com'],
  icici: ['icicibank.com'],
  axis: ['axisbank.com'],
  paytm: ['paytm.com'],
  phonepe: ['phonepe.com'],
  irctc: ['irctc.co.in'],
  uidai: ['uidai.gov.in'],
  incometax: ['incometax.gov.in'],
  epfo: ['epfindia.gov.in'],
  amazon: ['amazon.in', 'amazon.com'],
  flipkart: ['flipkart.com'],
};
const onDomain = (host, d) => host === d || host.endsWith('.' + d);

function extractUrls(text) {
  const found = new Set();
  (text.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || []).forEach((u) => found.add(u.replace(/[.,;)]+$/, '')));
  (text.match(new RegExp(`\\b(?:${SHORTENERS.map((s) => s.replace('.', '\\.')).join('|')})\\/\\S+`, 'gi')) || []).forEach((u) =>
    found.add(u.replace(/[.,;)]+$/, ''))
  );
  return [...found].slice(0, 5);
}

function checkUrl(raw) {
  const findings = [];
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch {
    return [{ label: 'Malformed link', weight: 15, detail: `"${raw.slice(0, 40)}" is not a valid web address.` }];
  }
  const host = url.hostname.toLowerCase();
  const add = (label, weight, detail) => findings.push({ label, weight, detail });
  if (url.protocol === 'http:') add('Link is not encrypted (http)', 10, 'Legitimate banking and government sites use https.');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) add('Link uses a raw IP address', 30, 'Real organisations use named websites.');
  if (SHORTENERS.some((s) => onDomain(host, s))) add('Shortened link hides destination', 20, 'You cannot see where this really leads.');
  if (BAD_TLDS.includes(host.split('.').pop())) add('Unusual domain ending', 20, `.${host.split('.').pop()} domains are heavily used in scams.`);
  if (raw.includes('@')) add('Link contains "@" trick', 25, 'Text before "@" is ignored by browsers and used to fake trust.');
  if (host.includes('xn--')) add('Look-alike (punycode) characters', 30, 'The address may imitate a real site with foreign letters.');
  if (host.split('.').length >= 5 || (host.match(/-/g) || []).length >= 3) add('Over-long or hyphen-heavy address', 15, 'Typical of throw-away phishing domains.');
  if (/\.apk(\?|$)/i.test(url.pathname)) add('Link downloads an APK file', 35, 'Do not install apps from links.');
  for (const [brand, domains] of Object.entries(BRANDS)) {
    if (host.includes(brand) && !domains.some((d) => onDomain(host, d))) {
      add('Pretends to be a known brand', 30, `The address mentions "${brand}" but is not its official website.`);
      break;
    }
  }
  if (/gov|nic/.test(host) && !/\.(gov|nic)\.in$/.test(host)) add('Fake government-style address', 30, 'Real Indian government sites end in .gov.in or .nic.in.');
  return findings;
}

app.post('/api/analyze', requireAuth, (req, res) => {
  let text = (req.body || {}).text;
  if (typeof text !== 'string') return res.status(400).json({ error: 'Provide the text or link to analyze.' });
  text = text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[<>]/g, '').trim();
  if (text.length < 3 || text.length > 5000) return res.status(400).json({ error: 'Text must be between 3 and 5000 characters.' });

  const findings = TEXT_RULES.filter((r) => r.re.test(text)).map(({ label, weight, detail }) => ({ label, weight, detail }));
  const urls = extractUrls(text);
  urls.forEach((u) => findings.push(...checkUrl(u)));

  const score = Math.min(100, findings.reduce((a, f) => a + f.weight, 0));
  const level = score >= 55 ? 'red' : score >= 25 ? 'yellow' : 'green';
  const verdicts = {
    red: 'Very likely a scam. Do not click, reply or pay.',
    yellow: 'Suspicious. Verify with the official source before acting.',
    green: 'No common red flags found. Stay careful and never share OTPs.',
  };
  if (level === 'red' && urls.length) analyzerStats.redUrls += 1;
  log(`Analyze by ${req.user.sub}: score=${score} level=${level} urls=${urls.length}`);
  res.json({ score, level, verdict: verdicts[level], findings, urls });
});

/* ---------- Community alerts ---------- */
const alerts = [
  { id: 1, category: 'Digital Arrest Scam', severity: 'High', date: '2026-10-27', title: '"CBI officer" video calls demanding money', summary: 'Callers in fake uniforms claim a parcel in your name has drugs and threaten "digital arrest". Real agencies never do this.', action: 'Hang up, do not transfer money, and call 1930.' },
  { id: 2, category: 'UPI Fraud', severity: 'High', date: '2026-10-26', title: 'Fake "collect request" for a refund', summary: 'A seller says they will refund you, then sends a request. Approving it takes money out of your account.', action: 'Only enter your UPI PIN to PAY, never to receive.' },
  { id: 3, category: 'Fake APK', severity: 'Medium', date: '2026-10-24', title: '"Electricity bill pending" APK on WhatsApp', summary: 'A message says power will be cut tonight and asks you to install an app that steals SMS and OTPs.', action: 'Pay bills only through the official app or website.' },
  { id: 4, category: 'Phishing Link', severity: 'Medium', date: '2026-10-22', title: 'Fake bank KYC SMS with look-alike link', summary: 'SMS says your account will be blocked today and links to a copy of your bank login page.', action: 'Open your bank app yourself instead of tapping links.' },
  { id: 5, category: 'Phishing Link', severity: 'Low', date: '2026-10-20', title: 'Festive "free recharge" lottery messages', summary: 'Prize messages ask for small "processing fees" and card details.', action: 'Delete and block the sender.' },
];
app.get('/api/alerts', requireAuth, (req, res) => res.json({ alerts }));

/* ---------- Incidents (AES-256-GCM encrypted at rest) ---------- */
const CATEGORIES = ['UPI Fraud', 'Digital Arrest Scam', 'Phishing Link', 'Fake APK', 'Other'];
const STATUSES = ['New', 'Under Investigation', 'Resolved'];
const incidents = [];

function createIncident({ reporterId, maskedMobile, category, date, amount, utr, description, status = 'New', createdAt = new Date().toISOString() }) {
  const id = 'INC-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const priority = category === 'Digital Arrest Scam' || amount >= 100000 ? 'High' : amount >= 10000 ? 'Medium' : 'Low';
  const rec = {
    id, reporterId, maskedMobile, category, incidentDate: date, maskedUtr: maskTxn(utr),
    priority, status, createdAt, updatedAt: createdAt,
    payload: encryptData({ description, amount, utr }, id),
  };
  incidents.unshift(rec);
  return rec;
}

function toView(rec, decrypt) {
  const { payload, reporterId, ...pub } = rec;
  const out = { ...pub, payloadVerified: verifyPayload(payload, rec.id), cipherPreview: payload.slice(0, 32) + '…' };
  if (decrypt) {
    try {
      out.details = decryptData(payload, rec.id);
    } catch {
      out.details = null;
    }
  }
  return out;
}

const cleanText = (s) => String(s).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[<>]/g, '').trim();

app.get('/api/incidents', requireAuth, (req, res) => {
  if (req.user.role === 'cyber_dept') {
    const decrypt = req.query.decrypt === 'true';
    if (decrypt) log(`AUDIT: ${req.user.sub} bulk-decrypted ${incidents.length} incidents`);
    let list = incidents;
    if (STATUSES.includes(req.query.status)) list = list.filter((i) => i.status === req.query.status);
    return res.json({ incidents: list.map((i) => toView(i, decrypt)) });
  }
  res.json({ incidents: incidents.filter((i) => i.reporterId === req.user.sub).map((i) => toView(i, true)) });
});

app.get('/api/incidents/:id', requireAuth, requireRole('cyber_dept'), (req, res) => {
  const rec = incidents.find((i) => i.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Incident not found' });
  const decrypt = req.query.decrypt === 'true';
  if (decrypt) log(`AUDIT: ${req.user.sub} decrypted ${rec.id}`);
  res.json({ incident: toView(rec, decrypt) });
});

app.post('/api/incidents', requireAuth, requireRole('citizen'), (req, res) => {
  const b = req.body || {};
  const category = CATEGORIES.includes(b.category) ? b.category : null;
  const amount = Number(b.amount);
  const utr = String(b.utr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const description = cleanText(b.description || '');
  const date = String(b.date || '');
  const parsed = new Date(date);

  if (!category) return res.status(400).json({ error: 'Choose a valid fraud category.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed) || parsed > new Date()) return res.status(400).json({ error: 'Enter a valid incident date (not in the future).' });
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return res.status(400).json({ error: 'Enter a valid amount lost.' });
  if (!/^[A-Z0-9]{12,22}$/.test(utr)) return res.status(400).json({ error: 'UTR / transaction reference must be 12–22 letters or digits.' });
  if (description.length < 10 || description.length > 2000) return res.status(400).json({ error: 'Describe what happened in 10–2000 characters.' });

  const rec = createIncident({ reporterId: req.user.sub, maskedMobile: req.user.maskedMobile, category, date, amount, utr, description });
  log(`Incident ${rec.id} filed by ${req.user.maskedMobile}, utr ${maskTxn(utr)}`);
  res.status(201).json({ incident: toView(rec, false), message: 'Report encrypted and saved.' });
});

// Handles status updates across PUT, PATCH, and legacy /api/reports routes
const handleStatusUpdate = (req, res) => {
  const incidentId = req.params.id;
  const rec = incidents.find((i) => i.id === incidentId);
  if (!rec) return res.status(404).json({ error: 'Incident not found' });

  const status = (req.body || {}).status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  rec.status = status;
  rec.updatedAt = new Date().toISOString();
  log(`AUDIT: ${req.user.sub} set ${rec.id} to ${status}`);
  res.json({ incident: toView(rec, false), message: 'Status updated successfully' });
};

app.put('/api/incidents/:id/status', requireAuth, requireRole('cyber_dept'), handleStatusUpdate);
app.patch('/api/incidents/:id/status', requireAuth, requireRole('cyber_dept'), handleStatusUpdate);
app.patch('/api/reports/:id', requireAuth, requireRole('cyber_dept'), handleStatusUpdate);

/* ---------- 1930 bank interdiction simulation (cyber_dept only) ---------- */
app.post('/api/incidents/:id/freeze', requireAuth, requireRole('cyber_dept'), (req, res) => {
  const rec = incidents.find((i) => i.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Incident not found' });
  if (rec.bankInterdictionStatus !== 'FREEZE_REQUESTED') {
    rec.bankInterdictionStatus = 'FREEZE_REQUESTED';
    rec.frozenAt = new Date().toISOString();
    rec.updatedAt = rec.frozenAt;
    log(`AUDIT: ${req.user.name} (${req.user.sub}) issued 1930 bank freeze interdiction for ${rec.id}`);
  }
  res.json({ incident: toView(rec, false) });
});

/* ---------- Public complaint status tracker (no auth, rate-limited) ---------- */
const trackHits = new Map();
app.get('/api/public/status/:id', (req, res) => {
  const now = Date.now();
  const h = trackHits.get(req.ip) || { count: 0, reset: now + 60000 };
  if (h.reset < now) {
    h.count = 0;
    h.reset = now + 60000;
  }
  h.count += 1;
  trackHits.set(req.ip, h);
  if (h.count > 20) return res.status(429).json({ error: 'Too many lookups. Please wait a minute and try again.' });

  const id = String(req.params.id || '').trim().toUpperCase();
  const rec = /^INC-[A-Z0-9]{6}$/.test(id) ? incidents.find((i) => i.id === id) : null;
  if (!rec) return res.status(404).json({ error: 'Incident not found' });
  res.json({
    id: rec.id,
    category: rec.category,
    priority: rec.priority,
    status: rec.status,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    reporter: 'XXXXXXXX' + String(rec.maskedMobile || '').slice(-2),
    bankInterdictionStatus: rec.bankInterdictionStatus || null,
  });
});

app.get('/api/stats', requireAuth, requireRole('cyber_dept'), (req, res) => {
  const amountOf = (r) => {
    try {
      return Number(decryptData(r.payload, r.id).amount) || 0;
    } catch {
      return 0;
    }
  };
  const byCategory = {};
  CATEGORIES.forEach((c) => (byCategory[c] = 0));
  incidents.forEach((i) => (byCategory[i.category] += 1));
  res.json({
    totalIncidents: incidents.length,
    highRiskUrls: analyzerStats.redUrls + incidents.filter((i) => i.category === 'Phishing Link').length,
    pendingReviews: incidents.filter((i) => i.status === 'New').length,
    lossesPrevented: incidents.filter((i) => i.status === 'Resolved').reduce((a, r) => a + amountOf(r), 0),
    byCategory,
  });
});

/* ---------- Automated syndicate clustering (cyber_dept only) ---------- */
const TIER = 50000;
app.get('/api/syndicates', requireAuth, requireRole('cyber_dept'), (req, res) => {
  const groups = new Map();
  for (const inc of incidents) {
    let amount = 0;
    try {
      amount = Number(decryptData(inc.payload, inc.id).amount) || 0;
    } catch {
      continue;
    }
    const tier = Math.floor(amount / TIER) * TIER;
    const key = `${inc.category}|${tier}`;
    const g = groups.get(key) || { category: inc.category, tier, totalLoss: 0, incidentIds: [] };
    g.totalLoss += amount;
    g.incidentIds.push(inc.id);
    groups.set(key, g);
  }
  const syndicates = [...groups.entries()]
    .map(([key, g]) => ({
      id: 'SYN-' + crypto.createHash('md5').update(key).digest('hex').slice(0, 6).toUpperCase(),
      category: g.category,
      amountTier: g.tier,
      totalLoss: g.totalLoss,
      incidentCount: g.incidentIds.length,
      incidentIds: g.incidentIds,
      riskLevel: g.totalLoss >= 100000 || g.incidentIds.length >= 3 ? 'High' : 'Medium',
    }))
    .sort((a, b) => b.totalLoss - a.totalLoss);
  res.json({ syndicates });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  log('Server error: ' + err.message);
  res.status(err.status === 400 ? 400 : 500).json({ error: err.status === 400 ? 'Malformed request body.' : 'Internal server error.' });
});

/* ---------- Seed data (stored encrypted) ---------- */
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
[
  { category: 'Digital Arrest Scam', amount: 245000, utr: '412398765012', description: 'Caller claimed to be CBI and kept me on video call for 6 hours. Transferred money to a "safe account".', status: 'New', h: 3, mobile: '9820011122' },
  { category: 'UPI Fraud', amount: 18500, utr: '509812345678', description: 'Approved a collect request while trying to receive a refund from an online seller.', status: 'Under Investigation', h: 20, mobile: '9768455501' },
  { category: 'Phishing Link', amount: 4200, utr: 'HDFC2026102212', description: 'Entered card details on a fake bank KYC page received by SMS.', status: 'Resolved', h: 52, mobile: '9930122211' },
  { category: 'Fake APK', amount: 62000, utr: '608877120043', description: 'Installed an electricity bill APK from WhatsApp. Money debited after OTP SMS forwarded.', status: 'New', h: 6, mobile: '9004477788' },
  { category: 'Digital Arrest Scam', amount: 310000, utr: '714400982211', description: 'Fake customs officer threatened arrest over a parcel and demanded a refundable deposit.', status: 'Under Investigation', h: 30, mobile: '9892233344' },
  { category: 'UPI Fraud', amount: 2500, utr: '300912347711', description: 'Paid a fake advance for a second-hand item; seller blocked me.', status: 'Resolved', h: 90, mobile: '9619900011' },
].forEach((s) =>
  createIncident({
    reporterId: 'seed', maskedMobile: maskPhone(s.mobile), category: s.category, date: hoursAgo(s.h).slice(0, 10),
    amount: s.amount, utr: s.utr, description: s.description, status: s.status, createdAt: hoursAgo(s.h),
  })
);

app.listen(PORT, () => log(`Citizen Cyber Shield API running on http://localhost:${PORT}`));