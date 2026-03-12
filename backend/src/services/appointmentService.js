import { Appointment } from '../models/Appointment.js';

export async function listAppointmentsByDoctor(doctorUserId, { status, from, to } = {}) {
  const q = { doctorUserId };
  if (status) q.status = status;
  if (from || to) {
    q.scheduledAt = {};
    if (from) q.scheduledAt.$gte = new Date(from);
    if (to) q.scheduledAt.$lte = new Date(to);
  }
  return Appointment.find(q).sort({ scheduledAt: 1 }).lean();
}

export async function createAppointment(doctorUserId, body) {
  const doc = await Appointment.create({
    doctorUserId,
    patientPhone: String(body.patientPhone).trim(),
    patientName: body.patientName != null ? String(body.patientName).trim() : '',
    scheduledAt: new Date(body.scheduledAt),
    status: body.status || 'scheduled',
    notes: body.notes != null ? String(body.notes).trim() : '',
  });
  return doc.toObject();
}

export async function updateAppointment(doctorUserId, appointmentId, patch) {
  const doc = await Appointment.findOne({ _id: appointmentId, doctorUserId });
  if (!doc) return null;
  if (patch.patientPhone != null) doc.patientPhone = String(patch.patientPhone).trim();
  if (patch.patientName != null) doc.patientName = String(patch.patientName).trim();
  if (patch.scheduledAt != null) doc.scheduledAt = new Date(patch.scheduledAt);
  if (patch.status != null) doc.status = patch.status;
  if (patch.notes != null) doc.notes = String(patch.notes).trim();
  await doc.save();
  return doc.toObject();
}
