import { User } from '../models/User.js';

/**
 * After requireAuth: ensure JWT user is a patient (phone-based OTP session).
 * Use for patient-only CRUD routes. Doctor JWT uses userId + email sub—reject here
 * unless you allow dual accounts (not typical).
 */
export async function requirePatient(req, res, next) {
  // OTP JWT has sub = phone, often no userId in payload—requireAuth sets userId from token
  const userId = req.user?.userId;
  const sub = req.user?.sub;
  if (!userId && !sub) {
    return res.status(403).json({ error: 'Forbidden', message: 'Patient session required' });
  }
  let user = null;
  if (userId) {
    user = await User.findById(userId).lean();
  }
  if (!user && sub) {
    user = await User.findOne({ phone: sub }).lean();
  }
  if (!user) {
    return res.status(403).json({ error: 'Forbidden', message: 'User not found' });
  }
  const role = user.role || (user.doctorId ? 'doctor' : 'patient');
  if (role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden', message: 'Patient account required' });
  }
  req.patientUserId = user._id;
  req.patient = {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    role: 'patient',
  };
  next();
}
