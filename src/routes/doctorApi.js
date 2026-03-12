import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireDoctor } from '../middleware/requireDoctor.js';
import { validateBody } from '../middleware/validate.js';
import {
  appointmentCreateBody,
  appointmentUpdateBody,
  prescriptionCreateBody,
} from '../validation/schemas.js';
import {
  listAppointmentsByDoctor,
  createAppointment,
  updateAppointment,
} from '../services/appointmentService.js';
import {
  createPrescription,
  listPrescriptionsByDoctor,
} from '../services/prescriptionService.js';

const router = Router();

router.use(requireAuth, requireDoctor);

/** GET /api/doctor/appointments — list this doctor's appointments */
router.get('/appointments', async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const list = await listAppointmentsByDoctor(req.doctorUserId, { status, from, to });
    res.json({ appointments: list });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list appointments' });
  }
});

/** POST /api/doctor/appointments — create appointment */
router.post('/appointments', validateBody(appointmentCreateBody), async (req, res) => {
  try {
    const doc = await createAppointment(req.doctorUserId, req.body);
    res.status(201).json({ appointment: doc });
  } catch (e) {
    const status = e.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: e.message || 'Failed to create appointment' });
  }
});

/** PATCH /api/doctor/appointments/:id */
router.patch(
  '/appointments/:id',
  validateBody(appointmentUpdateBody),
  async (req, res) => {
    try {
      const doc = await updateAppointment(req.doctorUserId, req.params.id, req.body);
      if (!doc) return res.status(404).json({ error: 'Appointment not found' });
      res.json({ appointment: doc });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Failed to update appointment' });
    }
  }
);

/** GET /api/doctor/prescriptions — list prescriptions by this doctor */
router.get('/prescriptions', async (req, res) => {
  try {
    const { patientMobile, limit } = req.query;
    const list = await listPrescriptionsByDoctor(req.doctorUserId, {
      patientMobile,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json({ prescriptions: list });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list prescriptions' });
  }
});

/** POST /api/doctor/prescriptions — prescribe by patient mobile + notes + medicines */
router.post('/prescriptions', validateBody(prescriptionCreateBody), async (req, res) => {
  try {
    const doc = await createPrescription(req.doctorUserId, req.body);
    res.status(201).json({ prescription: doc });
  } catch (e) {
    const status = e.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: e.message || 'Failed to create prescription' });
  }
});

export default router;
