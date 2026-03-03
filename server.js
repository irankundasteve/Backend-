const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
const dataFile = path.join(__dirname, 'data', 'store.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function loadStore() {
  if (!fs.existsSync(dataFile)) {
    return { categories: [{ id: 'uncategorized', name: 'Uncategorized' }], images: [] };
  }

  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveStore(store) {
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image uploads are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/categories', (_req, res) => {
  const store = loadStore();
  res.json(store.categories);
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const store = loadStore();
  const exists = store.categories.some((category) => category.name.toLowerCase() === name.trim().toLowerCase());

  if (exists) {
    return res.status(409).json({ error: 'Category already exists.' });
  }

  const category = {
    id: `cat-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim()
  };

  store.categories.push(category);
  saveStore(store);

  return res.status(201).json(category);
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const store = loadStore();
  const category = store.categories.find((entry) => entry.id === id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  category.name = name.trim();
  saveStore(store);

  return res.json(category);
});

app.get('/api/images', (req, res) => {
  const store = loadStore();
  const { categoryId } = req.query;

  const images = categoryId
    ? store.images.filter((image) => image.categoryId === categoryId)
    : store.images;

  res.json(images);
});

app.post('/api/images', upload.single('image'), (req, res) => {
  const { title, categoryId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required.' });
  }

  const store = loadStore();
  const category = store.categories.find((entry) => entry.id === categoryId) || store.categories[0];

  const image = {
    id: `img-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title: (title || req.file.originalname || 'Untitled').trim(),
    categoryId: category.id,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString(),
    edits: []
  };

  store.images.push(image);
  saveStore(store);

  return res.status(201).json(image);
});

app.put('/api/images/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { text = '', x = 20, y = 40, color = '#ffffff', size = 40 } = req.body;

  const store = loadStore();
  const image = store.images.find((entry) => entry.id === id);

  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  if (!text.trim()) {
    return res.status(400).json({ error: 'Text is required for edit.' });
  }

  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const baseFile = path.join(uploadsDir, image.filename);
  const editedFilename = `${path.parse(image.filename).name}-edited-${Date.now()}.png`;
  const editedPath = path.join(uploadsDir, editedFilename);

  try {
    const meta = await sharp(baseFile).metadata();
    const width = meta.width || 1000;
    const height = meta.height || 1000;

    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <style>
          .label { fill: ${color}; font-size: ${Number(size)}px; font-family: Arial, sans-serif; font-weight: 700; }
        </style>
        <text x="${Number(x)}" y="${Number(y)}" class="label">${safeText}</text>
      </svg>
    `;

    await sharp(baseFile)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toFile(editedPath);

    image.filename = editedFilename;
    image.url = `/uploads/${editedFilename}`;
    image.edits.push({
      text,
      x: Number(x),
      y: Number(y),
      color,
      size: Number(size),
      editedAt: new Date().toISOString()
    });

    saveStore(store);

    return res.json(image);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to edit image.', details: error.message });
  }
});

app.use((err, _req, res, _next) => {
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Image manager listening on http://localhost:${PORT}`);
});
