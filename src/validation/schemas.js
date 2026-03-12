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

/** POST /auth/doctor/send-otp — signup: doctorId, name, phone */
export const doctorSendOtpBody = Joi.object({
  doctorId: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'doctorId is required',
  }),
  name: nameSchema,
  phone: phoneSchema,
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

/** POST /auth/doctor/verify-otp — same shape as verify-otp */
export const doctorVerifyOtpBody = verifyOtpBody;

/** POST /auth/pharmacy/send-otp — signup: pharmacyId, name, phone */
export const pharmacySendOtpBody = Joi.object({
  pharmacyId: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'pharmacyId is required',
  }),
  name: nameSchema,
  phone: phoneSchema,
}).unknown(false);

/** POST /auth/pharmacy/verify-otp — same shape as verify-otp */
export const pharmacyVerifyOtpBody = verifyOtpBody;

/** MongoDB ObjectId string */
const objectIdString = Joi.string()
  .hex()
  .length(24)
  .required()
  .messages({
    'string.length': 'userId must be a valid 24-char hex id',
    'any.required': 'userId is required',
  });

/** PATCH /admin/doctors/:userId/approve — params */
export const adminApproveParams = Joi.object({
  userId: objectIdString,
}).unknown(false);

/** Optional body when approving via PATCH with email in body */
export const adminApproveBody = Joi.object({
  email: Joi.string().trim().email().optional(),
}).unknown(false);

/** Admin email in query (when not using header) */
export const adminEmailQuery = Joi.object({
  email: Joi.string().trim().email().optional(),
}).unknown(true);
