import { Prescription } from '../models/Prescription.js';

function normalizeMedicines(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && (m.name || m.name === ''))
    .map((m) => ({
      name: String(m.name || '').trim(),
      dosage: m.dosage != null ? String(m.dosage).trim() : '',
      frequency: m.frequency != null ? String(m.frequency).trim() : '',
      duration: m.duration != null ? String(m.duration).trim() : '',
    }))
    .filter((m) => m.name.length > 0);
}

export async function createPrescription(doctorUserId, body) {
  const medicines = normalizeMedicines(body.medicines);
  const doc = await Prescription.create({
    doctorUserId,
    patientMobile: String(body.patientMobile).trim(),
    notes: body.notes != null ? String(body.notes).trim() : '',
    medicines,
  });
  return doc.toObject();
}

export async function listPrescriptionsByDoctor(doctorUserId, { patientMobile, limit = 50 } = {}) {
  const q = { doctorUserId };
  if (patientMobile) q.patientMobile = String(patientMobile).trim();
  return Prescription.find(q).sort({ createdAt: -1 }).limit(Math.min(limit, 100)).lean();
}

export async function listPrescriptionsByPatientMobile(patientMobile, limit = 20) {
  return Prescription.find({ patientMobile: String(patientMobile).trim() })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 50))
    .lean();
}
