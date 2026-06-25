require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sanitizeFilename = require('sanitize-filename');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Paths ──────────────────────────────────────────────────────────────────
const PODCASTS_FILE = path.join(__dirname, 'podcasts.json');
const UPLOADS_DIR   = path.join(__dirname, 'public', 'uploads');
const THUMB_DIR     = path.join(UPLOADS_DIR, 'thumbnails');
const VIDEO_DIR     = path.join(UPLOADS_DIR, 'videos');

[UPLOADS_DIR, THUMB_DIR, VIDEO_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Hash admin password once on startup ────────────────────────────────────
let ADMIN_HASH = null;
(async () => {
  if (!process.env.ADMIN_PASSWORD) {
    console.error('❌  ADMIN_PASSWORD not set in .env');
    process.exit(1);
  }
  ADMIN_HASH = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  console.log('✅  Admin password hashed and ready.');
})();

// ── Helmet (security headers) ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      mediaSrc:   ["'self'", 'blob:'],
    }
  }
}));

// ── Rate limiter on login ──────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: JSON.stringify({ error: 'Too many login attempts. Try again in 15 minutes.' }),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  }
}));

// ── Parsers & static ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Multer setup ───────────────────────────────────────────────────────────
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, file.fieldname === 'thumbnail' ? THUMB_DIR : VIDEO_DIR);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname);
    const safe = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uuidv4()}-${safe}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = file.fieldname === 'thumbnail' ? ALLOWED_IMAGE : ALLOWED_VIDEO;
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Invalid file type for ${file.fieldname}`));
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function readPodcasts() {
  try { return JSON.parse(fs.readFileSync(PODCASTS_FILE, 'utf8')); }
  catch { return []; }
}

function writePodcasts(data) {
  fs.writeFileSync(PODCASTS_FILE, JSON.stringify(data, null, 2));
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect('/login');
}

// ── Page routes ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/podcast/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'podcast.html'));
});

// ── Auth API ───────────────────────────────────────────────────────────────
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required.' });

    if (!ADMIN_HASH) return res.status(503).json({ error: 'Server not ready.' });

    const match = await bcrypt.compare(password, ADMIN_HASH);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });

    req.session.authenticated = true;
    req.session.loginTime = Date.now();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth-status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// ── Podcast API ────────────────────────────────────────────────────────────
app.get('/api/podcasts', (req, res) => {
  let podcasts = readPodcasts();

  const { search, category, sort } = req.query;

  if (search) {
    const q = search.toLowerCase();
    podcasts = podcasts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'All') {
    podcasts = podcasts.filter(p => p.category === category);
  }

  podcasts.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sort === 'oldest') podcasts.reverse();

  res.json(podcasts);
});

app.get('/api/podcasts/:id', (req, res) => {
  const podcasts = readPodcasts();
  const podcast  = podcasts.find(p => p.id === req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Not found.' });
  res.json(podcast);
});

app.post('/api/podcasts', requireAuth,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video',     maxCount: 1 }
  ]),
  (req, res) => {
    const { title, description, duration, category, date } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required.' });
    }

    const podcasts = readPodcasts();
    const newPodcast = {
      id:          uuidv4(),
      title:       title.trim(),
      description: description.trim(),
      thumbnail:   req.files?.thumbnail?.[0]
                     ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}`
                     : '/images/default-thumb.svg',
      video:       req.files?.video?.[0]
                     ? `/uploads/videos/${req.files.video[0].filename}`
                     : '',
      date:        date || new Date().toISOString().split('T')[0],
      duration:    duration || '0:00',
      category:    category.trim(),
      featured:    false,
    };

    podcasts.unshift(newPodcast);
    writePodcasts(podcasts);
    res.status(201).json(newPodcast);
  }
);

app.delete('/api/podcasts/:id', requireAuth, (req, res) => {
  let podcasts = readPodcasts();
  const podcast = podcasts.find(p => p.id === req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Not found.' });

  // delete files from disk
  const tryDelete = filePath => {
    if (!filePath) return;
    const abs = path.join(__dirname, 'public', filePath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  };
  tryDelete(podcast.thumbnail);
  tryDelete(podcast.video);

  podcasts = podcasts.filter(p => p.id !== req.params.id);
  writePodcasts(podcasts);
  res.json({ success: true });
});

// ── Multer error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎙️  StudioCast running → http://localhost:${PORT}`);
});
