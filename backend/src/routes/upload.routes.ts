import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync, openSync, readSync, closeSync, unlinkSync } from 'fs';
import { nanoid } from 'nanoid';

// Uploads are stored under backend/public/uploads/ and served via Express static.
// NOTE: Render's filesystem is ephemeral — files are lost on redeploy.
// For persistent storage in production, migrate to S3 or Cloudinary.
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

// Detect image MIME type from magic bytes — no external dependency needed.
function detectMimeFromBytes(buf: Buffer): string | null {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf.length > 11 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return null;
}

// Only these MIME types (confirmed by actual magic bytes) are accepted.
const SAFE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Read the first `n` bytes of a file without loading the whole thing. */
function readMagicBytes(filePath: string, n = 12): Buffer {
  const buf = Buffer.alloc(n);
  const fd = openSync(filePath, 'r');
  try {
    readSync(fd, buf, 0, n, 0);
  } finally {
    closeSync(fd);
  }
  return buf;
}

/** Delete a file silently (used to clean up rejected uploads). */
function safeUnlink(filePath: string): void {
  try { unlinkSync(filePath); } catch { /* already gone */ }
}

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${nanoid(10)}${ext}`;
    cb(null, filename);
  },
});

// Allowed extension set — GIF excluded (polyglot risk); SVG/HTML/XML never permitted.
const SAFE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// First-pass filter: reject clearly wrong extensions and client-supplied MIME types
// before the file is written to disk at all.
// A second magic-bytes check runs in the route handler after storage.
const fileFilter = (_req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const clientMime = file.mimetype.toLowerCase();
  if (SAFE_EXTENSIONS.has(ext) && SAFE_MIME_TYPES.has(clientMime)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Single image upload
router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Second-pass: verify actual file content via magic bytes.
  // This catches files whose extension/MIME passed the filter but whose
  // real bytes indicate a different (or dangerous) type.
  try {
    const magic = readMagicBytes(req.file.path);
    const detectedMime = detectMimeFromBytes(magic);
    if (!detectedMime || !SAFE_MIME_TYPES.has(detectedMime)) {
      safeUnlink(req.file.path);
      return res.status(400).json({ error: 'File content does not match an allowed image type.' });
    }
  } catch {
    safeUnlink(req.file.path);
    return res.status(400).json({ error: 'Could not verify uploaded file.' });
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
  res.json({ url: `${backendUrl}/uploads/${req.file.filename}` });
});

// Multiple images upload
router.post('/images', upload.array('images', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // Magic bytes check for each file — reject the whole batch on any violation.
  for (const file of files) {
    try {
      const magic = readMagicBytes(file.path);
      const detectedMime = detectMimeFromBytes(magic);
      if (!detectedMime || !SAFE_MIME_TYPES.has(detectedMime)) {
        files.forEach((f) => safeUnlink(f.path));
        return res.status(400).json({ error: 'One or more files are not valid image types.' });
      }
    } catch {
      files.forEach((f) => safeUnlink(f.path));
      return res.status(400).json({ error: 'Could not verify one or more uploaded files.' });
    }
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
  res.json({ urls: files.map((f) => `${backendUrl}/uploads/${f.filename}`) });
});

export const uploadRouter = router;
