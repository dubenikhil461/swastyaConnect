import { User } from '../models/User.js';

const PROFILE_FIELDS = [
  'address',
  'city',
  'district',
  'state',
  'pincode',
  'bloodGroup',
  'allergies',
  'existingDiseases',
  'currentMedications',
  'symptoms',
  'medicalReports',
];

function defaultProfile() {
  const o = {};
  for (const k of PROFILE_FIELDS) o[k] = '';
  o.medicalReportUrls = [];
  return o;
}

/**
 * Merge stored patientProfile with defaults so API always returns full shape.
 */
export function normalizeProfile(user) {
  const raw = user.patientProfile || {};
  const out = { ...defaultProfile() };
  for (const k of PROFILE_FIELDS) {
    if (raw[k] != null) out[k] = String(raw[k]);
  }
  if (Array.isArray(raw.medicalReportUrls)) {
    out.medicalReportUrls = raw.medicalReportUrls.filter((u) => typeof u === 'string' && u.length > 0);
  }
  return out;
}

export async function getProfileByUserId(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return normalizeProfile(user);
}

/**
 * Patch only allowed string fields; does not replace medicalReportUrls (use upload/remove endpoints).
 */
export async function updateProfile(userId, patch) {
  const $set = {};
  for (const k of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      const v = patch[k];
      if (v == null) {
        $set[`patientProfile.${k}`] = '';
      } else {
        const s = String(v).trim();
        if (s.length > 10000) {
          throw Object.assign(new Error(`${k} too long (max 10000)`), { status: 400 });
        }
        $set[`patientProfile.${k}`] = s;
      }
    }
  }
  if (Object.keys($set).length === 0) {
    const user = await User.findById(userId).lean();
    return user ? normalizeProfile(user) : null;
  }
  await User.updateOne({ _id: userId }, { $set });
  const user = await User.findById(userId).lean();
  return user ? normalizeProfile(user) : null;
}

/**
 * Append ImageKit URL to medicalReportUrls (max 50).
 */
export async function appendReportUrl(userId, url) {
  const max = 50;
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.patientProfile) user.patientProfile = {};
  const urls = Array.isArray(user.patientProfile.medicalReportUrls)
    ? [...user.patientProfile.medicalReportUrls]
    : [];
  if (urls.length >= max) {
    throw Object.assign(new Error(`Maximum ${max} report images`), { status: 400 });
  }
  if (!urls.includes(url)) urls.push(url);
  user.patientProfile.medicalReportUrls = urls;
  user.markModified('patientProfile');
  await user.save();
  return normalizeProfile(user.toObject());
}

/**
 * Remove a URL from medicalReportUrls by index or exact URL.
 */
export async function removeReportUrl(userId, indexOrUrl) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.patientProfile?.medicalReportUrls) return normalizeProfile(user.toObject());
  let urls = [...user.patientProfile.medicalReportUrls];
  if (typeof indexOrUrl === 'number' && indexOrUrl >= 0 && indexOrUrl < urls.length) {
    urls.splice(indexOrUrl, 1);
  } else if (typeof indexOrUrl === 'string') {
    urls = urls.filter((u) => u !== indexOrUrl);
  } else {
    throw Object.assign(new Error('Invalid index or url'), { status: 400 });
  }
  user.patientProfile.medicalReportUrls = urls;
  user.markModified('patientProfile');
  await user.save();
  return normalizeProfile(user.toObject());
}
