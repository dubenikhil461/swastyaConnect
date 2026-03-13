import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    /** Patient OTP flow; optional for doctor email/password accounts */
    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    /** Doctor (and future) email/password login */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    /** Set when admin rejects a doctor; used to exclude from pending list */
    rejectedAt: {
      type: Date,
      default: null,
    },
    /**
     * Discriminator for CRUD / RBAC: patient (OTP/phone) vs doctor (email + doctorId).
     * Always set on create; legacy docs may lack it—middleware can backfill or treat as patient.
     */
    role: {
      type: String,
      enum: ['patient', 'doctor'],
      default: 'patient',
      index: true,
    },
    doctorId: {
      type: String,
      maxlength: 100,
      trim: true,
      sparse: true,
      index: true,
    },
    /** Doctor registration: phone, council, specialization (optional at signup) */
    doctorProfile: {
      phone: { type: String, trim: true, default: '' },
      council: { type: String, trim: true, default: '' },
      specialization: { type: String, trim: true, default: '' },
    },
    /** Patient-only; updated via PATCH /api/patient/profile */
    patientProfile: {
      address: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      bloodGroup: { type: String, trim: true, default: '' },
      allergies: { type: String, trim: true, default: '' },
      existingDiseases: { type: String, trim: true, default: '' },
      currentMedications: { type: String, trim: true, default: '' },
      symptoms: { type: String, trim: true, default: '' },
      medicalReports: { type: String, trim: true, default: '' },
      medicalReportUrls: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
