import dotenv from 'dotenv';
dotenv.config();

export const config = {
  mongoUri: process.env.MONGODB_URI,
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  imagekit: {
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/ki6yi0wce',
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER, // for SMS fallback
  },
};

export function assertTwilioConfig() {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  }
}
