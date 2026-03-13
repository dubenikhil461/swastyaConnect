import { PanelPrescription } from '../models/PanelPrescription.js';
import { User } from '../models/User.js';

/**
 * Create a simple prescription record from the doctor PrescriptionPanel.
 * Public-facing: callers provide doctorId/doctorName; we resolve patient from userId.
 */
export async function createPanelPrescription(body) {
  const patientId = body.patientId;
  const doctorId = body.doctorId ? String(body.doctorId).trim() : '';
  const doctorName = body.doctorName ? String(body.doctorName).trim() : '';

  if (!patientId) {
    const err = new Error('patientId is required');
    err.status = 400;
    throw err;
  }

  const patient = await User.findOne({ _id: patientId, role: 'patient' }).lean();
  if (!patient) {
    const err = new Error('Patient not found');
    err.status = 404;
    throw err;
  }

  const doc = await PanelPrescription.create({
    doctorId,
    doctorName,
    patientUserId: patient._id,
    patientName: patient.name,
    patientPhone: patient.phone || '',
    medicine: String(body.medicine || '').trim(),
    dosage: String(body.dosage || '').trim(),
    frequency: String(body.frequency || '').trim(),
    duration: String(body.duration || '').trim(),
    notes: body.notes ? String(body.notes).trim() : '',
  });

  return doc.toObject();
}

/**
 * List simple panel prescriptions, optionally filtered by patientId or doctorId.
 */
export async function listPanelPrescriptions(filters = {}) {
  const query = {};
  if (filters.patientId) {
    query.patientUserId = filters.patientId;
  }
  if (filters.doctorId) {
    query.doctorId = String(filters.doctorId).trim();
  }

  const limit = Math.min(filters.limit || 50, 100);

  const list = await PanelPrescription.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return list.map((p) => ({
    id: p._id.toString(),
    doctorId: p.doctorId || '',
    doctorName: p.doctorName || '',
    patientUserId: p.patientUserId.toString(),
    patientName: p.patientName,
    patientPhone: p.patientPhone || '',
    medicine: p.medicine,
    dosage: p.dosage,
    frequency: p.frequency,
    duration: p.duration,
    notes: p.notes || '',
    createdAt: p.createdAt,
  }));
}


