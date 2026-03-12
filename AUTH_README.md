# Twilio OTP + JWT Auth (Express)

## Flow

1. **Send OTP** — Client sends mobile number → server sends SMS via Twilio.
2. **Verify OTP** — Client sends phone + code → server validates → returns **JWT**.
3. **Persistent session** — Client stores JWT and sends `Authorization: Bearer <token>` on later requests.

## Setup

### 1. Install

```bash
npm install
```

### 2. Twilio

- Create a [Twilio account](https://www.twilio.com/try-twilio).
- **Recommended:** Create a **Verify** service in [Console → Verify](https://console.twilio.com/us1/develop/verify/services). Copy the **Service SID** (`VA...`).
- **Alternative:** Use a Twilio **phone number** as sender; the app will generate a 6-digit code and SMS it (dev/hackathon only—in production use Verify or Redis for OTP storage).

### 3. Environment

Copy `.env.example` to `.env` and fill in:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...   # preferred
# OR
# TWILIO_PHONE_NUMBER=+1...       # for SMS fallback

JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d

# MongoDB Atlas — include database name before ?
MONGODB_URI=mongodb+srv://USER:PASS@cluster.../swastyaconnect?retryWrites=true&w=majority

PORT=3000

# Patient profile — medical report uploads (ImageKit)
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/ki6yi0wce
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
```

### MongoDB (Mongoose)

- Set `MONGODB_URI` to your Atlas connection string. **Append a database name** after the host if your URI ends with `/` only, e.g. `...mongodb.net/swastyaconnect?retryWrites=true&w=majority`.
- On successful **verify-otp**, a **User** is upserted (`phone` unique, `lastLoginAt`, `createdAt` / `updatedAt`).
- JWT payload includes `userId` for DB-backed routes; `GET /auth/me` returns the full user document from MongoDB.

### 4. Run

```bash
npm run dev
```

## API

| Method | Path | Body / Headers | Description |
|--------|------|----------------|-------------|
| `POST` | `/auth/send-otp` | `{ "phone": "+15551234567" }` | Sends OTP to the number |
| `POST` | `/auth/verify-otp` | `{ "phone": "+1...", "code": "123456" }` | Verifies code, returns JWT |
| `GET` | `/auth/me` | `Authorization: Bearer <jwt>` | Returns current user (phone) |
| `GET` | `/api/protected` | `Authorization: Bearer <jwt>` | Example protected route |
| `GET` | `/api/patient/profile` | Patient JWT | Profile + report URLs |
| `PATCH` | `/api/patient/profile` | Text fields JSON | Update profile |
| `POST` | `/api/patient/profile/upload-report` | `multipart/form-data` field `file` | Image → ImageKit |
| `DELETE` | `/api/patient/profile/report-url` | `{ "url" }` or `{ "index" }` | Remove report URL |

### Example: cURL

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567"}'

# 2. Verify (use code from SMS)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","code":"123456"}'

# 3. Use JWT
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

## Frontend hint

After `verify-otp`, save `token` (e.g. `localStorage`) and attach to every API call:

```js
headers: { Authorization: `Bearer ${token}` }
```

## Security notes

- Use **Twilio Verify** in production; avoid storing OTPs only in memory across restarts.
- Use a strong `JWT_SECRET` and HTTPS in production.
- Rate-limit `/auth/send-otp` to prevent abuse.
