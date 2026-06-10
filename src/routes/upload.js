const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

router.post('/upload', (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: '缺少图片数据' });

  const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: '无效的图片格式' });

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 10 * 1024 * 1024) return res.status(400).json({ error: '图片不能超过10MB' });

  ensureDir();
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, buf);

  res.json({ url: `/uploads/${name}` });
});

module.exports = router;
