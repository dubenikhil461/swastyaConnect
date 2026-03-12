import { Router } from 'express';
import { requireAdmin } from '../middleware/admin.js';
import { validateParams, validateBody } from '../middleware/validate.js';
import { adminApproveParams, adminApproveBody } from '../validation/schemas.js';
import { User } from '../models/User.js';

const router = Router();

// All routes under /admin require matching admin email in request
router.use(requireAdmin);

/**
 * GET /admin/health
 * Quick check that admin email was accepted.
 */
router.get('/health', (_req, res) => {
  res.json({ ok: true, role: 'admin' });
});

/**
 * GET /admin/doctors/pending
 * List doctor registrations waiting for approval (isActive === false).
 */
router.get('/doctors/pending', async (_req, res) => {
  try {
    const pending = await User.find({ isActive: false })
      .select('phone name doctorId createdAt')
      .lean();
    const list = pending.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));
    list.forEach((u) => delete u._id);
    res.json({ count: list.length, pending: list });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list pending doctors' });
  }
});

/**
 * PATCH /admin/doctors/:userId/approve
 * Approve a doctor (set isActive true).
 */
router.patch(
  '/doctors/:userId/approve',
  validateParams(adminApproveParams),
  validateBody(adminApproveBody),
  async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: true } },
      { new: true }
    ).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.id = user._id.toString();
    delete user._id;
    res.json({ ok: true, message: 'Doctor approved', user });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to approve doctor' });
  }
  }
);

export default router;
