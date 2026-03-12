import { User } from '../models/User.js';

/**
 * After requireAuth: ensure JWT user has role doctor (or legacy doctorId).
 */
export async function requireDoctor(req, res, next) {
  if (!req.user?.userId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Doctor session required' });
  }
  const user = await User.findById(req.user.userId).lean();
  const isDoctor = user && (user.role === 'doctor' || user.doctorId);
  if (!isDoctor) {
    return res.status(403).json({ error: 'Forbidden', message: 'Doctor account required' });
  }
  if (user.role !== 'doctor' && user.doctorId) {
    await User.updateOne({ _id: user._id }, { $set: { role: 'doctor' } });
    user.role = 'doctor';
  }
  if (user.isActive === false) {
    return res.status(403).json({
      error:
        'Verification pending. Your account is awaiting approval—please wait before using the doctor portal.',
      pendingApproval: true,
    });
  }
  req.doctorUserId = user._id;
  req.doctor = {
    id: user._id.toString(),
    doctorId: user.doctorId,
    name: user.name,
    email: user.email,
    role: 'doctor',
  };
  next();
}
