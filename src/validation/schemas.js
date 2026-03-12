import Joi from 'joi';

/** Phone: E.164 or digits, 10–20 chars after trim */
const phoneSchema = Joi.string()
  .trim()
  .min(10)
  .max(20)
  .required()
  .messages({
    'string.min': 'phone must be at least 10 characters',
    'any.required': 'phone is required',
  });

const nameSchema = Joi.string().trim().min(1).max(200).required().messages({
  'string.min': 'name is required',
  'any.required': 'name is required',
});

/** POST /auth/send-otp */
export const sendOtpBody = Joi.object({
  phone: phoneSchema,
  name: nameSchema,
}).unknown(false);

/** POST /auth/doctor/signup — email + password + name + doctorId */
const passwordSchema = Joi.string().min(8).max(128).required().messages({
  'string.min': 'password must be at least 8 characters',
  'any.required': 'password is required',
});

const emailSchema = Joi.string().trim().email().required().messages({
  'any.required': 'email is required',
});

export const doctorSignupBody = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  doctorId: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'doctorId is required',
  }),
}).unknown(false);

/** POST /auth/doctor/login */
export const doctorLoginBody = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({ 'any.required': 'password is required' }),
}).unknown(false);

/** POST /auth/verify-otp */
export const verifyOtpBody = Joi.object({
  phone: phoneSchema,
  code: Joi.string()
    .trim()
    .pattern(/^\d{4,8}$/)
    .required()
    .messages({
      'string.pattern.base': 'code must be 4–8 digits',
      'any.required': 'code is required',
    }),
}).unknown(false);

/** POST /api/doctor/appointments */
export const appointmentCreateBody = Joi.object({
  patientPhone: phoneSchema,
  patientName: Joi.string().trim().max(200).allow('').optional(),
  scheduledAt: Joi.date().iso().required().messages({ 'any.required': 'scheduledAt is required' }),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show').optional(),
  notes: Joi.string().trim().max(5000).allow('').optional(),
}).unknown(false);

/** PATCH /api/doctor/appointments/:id */
export const appointmentUpdateBody = Joi.object({
  patientPhone: phoneSchema.optional(),
  patientName: Joi.string().trim().max(200).allow('').optional(),
  scheduledAt: Joi.date().iso().optional(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show').optional(),
  notes: Joi.string().trim().max(5000).allow('').optional(),
})
  .min(1)
  .messages({ 'object.min': 'at least one field required' })
  .unknown(false);

const medicineItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  dosage: Joi.string().trim().max(100).allow('').optional(),
  frequency: Joi.string().trim().max(100).allow('').optional(),
  duration: Joi.string().trim().max(100).allow('').optional(),
}).unknown(false);

/** POST /api/doctor/prescriptions — patient mobile + notes; medicines optional if notes suffice */
export const prescriptionCreateBody = Joi.object({
  patientMobile: phoneSchema,
  notes: Joi.string().trim().max(10000).allow('').optional(),
  medicines: Joi.array().items(medicineItemSchema).default([]),
})
  .custom((value, helpers) => {
    const hasNotes = value.notes && String(value.notes).trim().length > 0;
    const hasMeds = Array.isArray(value.medicines) && value.medicines.length > 0;
    if (!hasNotes && !hasMeds) {
      return helpers.error('any.custom', { message: 'Provide notes and/or at least one medicine' });
    }
    return value;
  })
  .unknown(false);

const optionalProfileString = Joi.string().trim().max(10000).allow('');

/** PATCH /api/patient/profile */
export const patientProfilePatchBody = Joi.object({
  address: optionalProfileString.optional(),
  city: optionalProfileString.optional(),
  district: optionalProfileString.optional(),
  state: optionalProfileString.optional(),
  pincode: optionalProfileString.optional(),
  bloodGroup: optionalProfileString.optional(),
  allergies: optionalProfileString.optional(),
  existingDiseases: optionalProfileString.optional(),
  currentMedications: optionalProfileString.optional(),
  symptoms: optionalProfileString.optional(),
  medicalReports: optionalProfileString.optional(),
})
  .min(1)
  .messages({ 'object.min': 'at least one field required' })
  .unknown(false);

/** DELETE /api/patient/profile/report-url */
export const patientReportUrlDeleteBody = Joi.object({
  url: Joi.string().trim().min(1).optional(),
  index: Joi.number().integer().min(0).optional(),
})
  .or('url', 'index')
  .unknown(false);
