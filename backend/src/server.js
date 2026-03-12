import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { connectMongo } from './db/connect.js';
import authRoutes from './routes/auth.js';
import doctorApiRoutes from './routes/doctorApi.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
// Credentials + cookies: cannot use origin '*'. Allow frontend dev server and env override.
const corsOrigin =
  process.env.CORS_ORIGIN ||
  'http://localhost:5173';
const options = {
  origin: corsOrigin === 'true' ? true : corsOrigin.split(',').map((s) => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};
app.use(cors(options));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api/doctor', doctorApiRoutes);

// Example protected route
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({
    message: 'You are authenticated',
    phone: req.user.sub,
  });
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  await connectMongo();
  const server = app.listen(config.port, () => {
    console.log(`Auth server listening on http://localhost:${config.port}`);
    console.log('  POST /auth/send-otp   { "phone": "+1..." }');
    console.log('  POST /auth/verify-otp { "phone": "+1...", "code": "..." }');
    console.log('  GET  /auth/me         Cookie access_token or Authorization: Bearer <jwt>');
    console.log('  POST /auth/logout     clears auth cookie');
    console.log('  POST /auth/doctor/signup { email, password, name, doctorId }');
    console.log('  POST /auth/doctor/login  { email, password }');
    console.log('  POST /auth/doctor/approve { email, secret }  (DOCTOR_APPROVE_SECRET) — activate pending doctor');
    console.log('  GET  /api/doctor/appointments   (doctor JWT)');
    console.log('  POST /api/doctor/appointments   { patientPhone, scheduledAt, ... }');
    console.log('  GET  /api/doctor/prescriptions  (doctor JWT)');
    console.log('  POST /api/doctor/prescriptions  { patientMobile, notes, medicines }');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${config.port} is already in use (EADDRINUSE).\n`);
      console.error('  Free it:    lsof -ti :' + config.port + ' | xargs kill -9');
      console.error('  Or use another port:    PORT=3001 npm run dev\n');
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
