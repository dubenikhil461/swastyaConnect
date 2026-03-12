import mongoose from 'mongoose';

/**
 * Separate model: prescription issued by doctor to a patient.
 * Patient identified by mobile number; clinical notes + medicine list.
 */
const medicineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true, default: '' },
    frequency: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Patient mobile — matches User.phone style (E.164 or digits) */
    patientMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    /** Free-text clinical / instruction notes */
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    /** Structured medicine lines */
    medicines: {
      type: [medicineItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

prescriptionSchema.index({ doctorUserId: 1, createdAt: -1 });
prescriptionSchema.index({ patientMobile: 1, createdAt: -1 });

export const Prescription =
  mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
