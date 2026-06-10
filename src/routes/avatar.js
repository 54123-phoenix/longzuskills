const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = require('../services/storage');

const AVATAR_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function ensureDir() {
  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('仅支持 JPEG/PNG/GIF/WebP 图片'));
    }
    cb(null, true);
  }
});

// POST /api/avatar-upload - upload a character avatar
router.post('/avatar-upload', upload.single('image'), (req, res) => {
  try {
    const { charId } = req.body;
    if (!charId) return res.status(400).json({ error: '缺少 charId' });
    if (!req.file) return res.status(400).json({ error: '缺少图片文件' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) return res.status(400).json({ error: '不支持的图片格式' });

    ensureDir();
    const name = `avatar_${charId}_${Date.now()}${ext}`;
    const filePath = path.join(AVATAR_DIR, name);
    fs.writeFileSync(filePath, req.file.buffer);

    const url = `/uploads/avatars/${name}`;

    // Store in DB
    storage.run(
      `INSERT OR REPLACE INTO character_avatars (char_id, url, updated_at) VALUES (?, ?, ?)`,
      [charId, url, Date.now()]
    );
    storage.save();

    res.json({ url });
  } catch (e) {
    if (e.message && e.message.includes('仅支持')) {
      return res.status(400).json({ error: e.message });
    }
    if (e.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '图片不能超过2MB' });
    }
    console.error('[avatar-upload]', e);
    res.status(500).json({ error: '上传失败' });
  }
});

// GET /api/character-avatars - get all character avatars
router.get('/character-avatars', (req, res) => {
  const rows = storage.all('SELECT char_id, url, updated_at FROM character_avatars');
  const map = {};
  rows.forEach(r => { map[r.char_id] = { url: r.url, updatedAt: r.updated_at }; });
  res.json(map);
});

// GET /api/characters - get all characters with custom avatar URLs
router.get('/characters', (req, res) => {
  const characters = require('../services/characters');
  const allChars = characters.getAll();
  const avatarRows = storage.all('SELECT char_id, url FROM character_avatars');
  const avatarMap = {};
  avatarRows.forEach(r => { avatarMap[r.char_id] = r.url; });

  const result = {};
  Object.keys(allChars).forEach(id => {
    const ch = allChars[id];
    result[id] = {
      id,
      name: ch.name,
      emoji: ch.emoji,
      color: ch.color,
      avatar: avatarMap[id] || null
    };
  });
  res.json(result);
});

module.exports = router;
