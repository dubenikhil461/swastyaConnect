import mongoose from 'mongoose';

/**
 * Patient appointment for a doctor — patient identified by mobile (phone).
 * Doctor is the logged-in User (doctor account).
 */
const appointmentSchema = new mongoose.Schema(
  {
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: '',
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    /** Optional reason / chief complaint */
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorUserId: 1, scheduledAt: 1 });

export const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
