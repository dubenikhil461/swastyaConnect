# Hawkathon 2026 – Team Roles & PRD Work Split

**Product:** Rural TeleHealth Access System  
**Context:** Track 2 Healthcare – Nabha + ~173 villages, low-bandwidth / offline-first

---

## 1. Suggested roles (4 people)

| Person | Primary focus | Owns (from PRD) |
|--------|----------------|------------------|
| **Backend dev** | APIs, DB, auth, sync | FR-CONSULT signaling/queue, FR-DHR CRUD + versioning, RBAC, audit logs |
| **Frontend dev** | PWA / lite app | FR-RURAL UX, patient/doctor UIs, offline read (IndexedDB), i18n shell, low-bandwidth UI |
| **AI dev** | Triage + safety | FR-AI rule engine + optional small model, red-flag logic, disclaimers, logging for doctor review |
| **Full-stack / integration** | Glue + demo | WebRTC/audio consult wiring, background sync, SMS/reminder stubs, deploy, demo script |

> If you truly only have **backend + frontend + AI** (3 streams), merge integration into **backend** (WebRTC + sync) or **frontend** (PWA + IndexedDB sync).

---

## 2. Work split by PRD section

### Remote consultation (FR-CONSULT)

| Stream | Responsibility |
|--------|----------------|
| **Backend** | Queue/slots API, patient/doctor presence, post-consult note + Rx persistence, callback/missed-call state. |
| **Frontend** | Request consult, join call UI, audio-first (hide video on slow network), doctor queue screen. |
| **AI** | Optional—after triage, tag consult as “tele suitable” for queue prioritization (rule-based is enough for hackathon). |
| **Integration** | WebRTC signaling (Socket or REST + WebSocket), TURN config, fallback story (“doctor calls patient”) for demo. |

### Digital health records (FR-DHR)

| Stream | Responsibility |
|--------|----------------|
| **Backend** | Patient profile, allergies/chronic, consult summaries, prescriptions, versioning (who/when), minimal PII on responses. |
| **Frontend** | Offline cache of “last N consults + active Rx” (IndexedDB), assisted mode UI (profile picker for shared phone). |
| **AI** | Read-only for demo—doctor sees AI triage inputs in summary if consult follows symptom flow. |

### AI symptom checker (FR-AI)

| Stream | Responsibility |
|--------|----------------|
| **AI (owner)** | Question tree (yes/no, body area, duration), red-flag rules, outputs: emergency / see doctor soon / self-care / teleconsult suitable, disclaimer, local save of abandoned flow. |
| **Backend** | `POST /triage/session` + `POST /triage/complete` to log inputs + outcome for audit; no diagnosis text stored as “fact.” |
| **Frontend** | Minimal typing flow, large taps, Punjabi/Hindi/English strings for questions. |

### Rural-first (FR-RURAL)

| Stream | Responsibility |
|--------|----------------|
| **Frontend (owner)** | PWA manifest, large targets, contrast, lazy routes, audio-first consult. |
| **Backend** | Pagination, small payloads, gzip, no heavy images in APIs. |
| **AI** | On-device or tiny payload—prefer rule-based + small JSON over big model calls on 2G. |

---

## 3. One shared contract (do this day 1)

Agree on **one OpenAPI or shared TypeScript types** for:

- **Patient**, **Consult**, **Prescription**, **PrescriptionVersion**
- **TriageSession** (inputs + outcome + disclaimer acknowledged)

**Process:** Backend implements; frontend and AI consume. AI only needs triage endpoints + maybe read patient summary if you scope it.

---

## 4. MVP sequencing (hackathon-safe)

1. **Backend:** Auth (phone OTP stub) + patient + one prescription + one consult record.
2. **Frontend:** Register → book “consult” (can be simulated) → show Rx → offline show last Rx from cache.
3. **AI:** Rule-based triage only—no model dependency for demo on bad network.
4. **Integration:** One real audio path (WebRTC) or credible pre-recorded flow with real queue + real DB writes.

**If time runs out:** Ship **audio consult + DHR** as per your PRD.

---

## 5. Weekly (or daily) sync checklist

| Stream | Checkpoint |
|--------|------------|
| **Backend** | “These endpoints are frozen: …” |
| **Frontend** | “These screens work against mock; switching to real API tomorrow.” |
| **AI** | “Triage returns enum only; no free-text diagnosis.” |
| **Integration** | “Demo path: register → triage → queue → call → Rx.” |

---

## 6. Risk ownership (who mitigates what)

| Risk | Owner |
|------|--------|
| AI wrong urgency | AI + backend (rules + logging) |
| Doctor adoption | Frontend (EMR-lite, &lt;2 min post-consult) |
| Connectivity | Frontend offline cache + backend queue |
| Literacy | Frontend (icons, assisted mode, i18n) |

---

## 7. Minimal repo layout (optional)

```text
/apps/web          # PWA – frontend
/services/api      # Backend
/packages/shared   # Types + OpenAPI
/ai/triage         # Rules + optional model
```

---

## Summary

| Stream | Scope |
|--------|--------|
| **Backend** | Data model + consult queue + Rx versioning + triage audit API. |
| **Frontend** | Rural-first PWA, offline Rx read, consult flows, i18n. |
| **AI** | Rule-based triage + red flags + disclaimers + session persistence. |
| **4th person** | WebRTC/sync + demo orchestration—or fold into backend if you only have three devs. |

---

## Next step

Share your stack (e.g. Node/FastAPI, React/Flutter, Supabase) to turn this into a **file-level task list** and **API sketch** for GitHub Issues.
