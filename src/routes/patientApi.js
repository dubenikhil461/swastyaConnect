import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requirePatient } from '../middleware/requirePatient.js';
import { validateBody } from '../middleware/validate.js';
import { patientProfilePatchBody, patientReportUrlDeleteBody } from '../validation/schemas.js';
import {
  getProfileByUserId,
  updateProfile,
  appendReportUrl,
  removeReportUrl,
} from '../services/patientProfileService.js';
import { uploadBuffer } from '../services/imagekitService.js';

const router = Router();

/**
 * Accept image/* and application/octet-stream (many mobile clients send octet-stream
 * for camera/gallery picks). Filename with image extension is a weak signal only.
 */
function isAllowedImage(file) {
  const mime = (file.mimetype || '').toLowerCase();
  if (/^image\/(jpeg|jpg|png|gif|webp)$/i.test(mime)) return true;
  if (mime === 'application/octet-stream') return true;
  if (!mime || mime === 'binary/octet-stream') return true;
  const name = (file.originalname || '').toLowerCase();
  if (/\.(jpe?g|png|gif|webp)$/.test(name)) return true;
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImage(file)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.use(requireAuth, requirePatient);

router.get('/profile', async (req, res) => {
  try {
    const profile = await getProfileByUserId(req.patientUserId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, profile, patient: req.patient });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Failed to load profile' });
  }
});

router.patch('/profile', validateBody(patientProfilePatchBody), async (req, res) => {
  try {
    const profile = await updateProfile(req.patientUserId, req.body);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, profile });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Update failed' });
  }
});

router.post('/profile/upload-report', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'Missing file field (multipart name: file)' });
    }
    const mime = (req.file.mimetype || '').toLowerCase();
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('webp')) ext = 'webp';
    else if ((req.file.originalname || '').toLowerCase().endsWith('.png')) ext = 'png';
    const fileName = `report_${Date.now()}.${ext}`;
    const { url } = await uploadBuffer(req.file.buffer, fileName);
    const profile = await appendReportUrl(req.patientUserId, url);
    res.json({ ok: true, url, profile });
  } catch (e) {
    if (e.code === 'IMAGEKIT_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Image upload unavailable',
        message: 'Set IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY',
      });
    }
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Upload failed' });
  }
});

router.delete('/profile/report-url', validateBody(patientReportUrlDeleteBody), async (req, res) => {
  try {
    const { url, index } = req.body;
    const profile =
      typeof index === 'number'
        ? await removeReportUrl(req.patientUserId, index)
        : await removeReportUrl(req.patientUserId, url);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, profile });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Remove failed' });
  }
});

export default router;
