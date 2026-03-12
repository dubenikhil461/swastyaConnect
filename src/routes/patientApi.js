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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.use(requireAuth, requirePatient);

/**
 * GET /api/patient/profile — full profile object for dashboard
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await getProfileByUserId(req.patientUserId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({
      ok: true,
      profile,
      patient: req.patient,
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Failed to load profile' });
  }
});

/**
 * PATCH /api/patient/profile — update text fields only
 */
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

/**
 * POST /api/patient/profile/upload-report — multipart file → ImageKit → append URL
 * Field name: file
 */
router.post('/profile/upload-report', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing file field (multipart name: file)' });
    }
    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const fileName = `report_${Date.now()}.${ext}`;
    const { url } = await uploadBuffer(req.file.buffer, fileName);
    const profile = await appendReportUrl(req.patientUserId, url);
    res.json({ ok: true, url, profile });
  } catch (e) {
    const status = e.status || 500;
    if (e.code === 'IMAGEKIT_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Image upload unavailable',
        message: 'Set IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY',
      });
    }
    res.status(status).json({ error: e.message || 'Upload failed' });
  }
});

/**
 * DELETE /api/patient/profile/report-url — body { "url": "..." } or { "index": 0 }
 */
router.delete('/profile/report-url', validateBody(patientReportUrlDeleteBody), async (req, res) => {
  try {
    const { url, index } = req.body;
    let profile;
    if (typeof index === 'number') {
      profile = await removeReportUrl(req.patientUserId, index);
    } else {
      profile = await removeReportUrl(req.patientUserId, url);
    }
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, profile });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Remove failed' });
  }
});

export default router;
