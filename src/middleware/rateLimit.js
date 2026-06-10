const counts = new Map();

function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = counts.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
    if (++entry.count > max) { return res.status(429).json({ error: '请求太频繁，稍后再试' }); }
    counts.set(key, entry);
    next();
  };
}

module.exports = { rateLimit };
