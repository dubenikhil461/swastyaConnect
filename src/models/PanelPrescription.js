import mongoose from 'mongoose';

/**
 * Simple prescription model for the doctor PrescriptionPanel UI.
 * Stores one medicine line + metadata for a given patient and doctor.
 */
const panelPrescriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    doctorName: {
      type: String,
      trim: true,
      default: '',
    },
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
      required: true,
    },
    patientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    medicine: {
      type: String,
      trim: true,
      required: true,
    },
    dosage: {
      type: String,
      trim: true,
      default: '',
    },
    frequency: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

panelPrescriptionSchema.index({ patientUserId: 1, createdAt: -1 });

export const PanelPrescription =
  mongoose.models.PanelPrescription ||
  mongoose.model('PanelPrescription', panelPrescriptionSchema);

