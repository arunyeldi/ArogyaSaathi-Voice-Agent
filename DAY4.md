# Day 4 Architecture & Design: Persistent, Consent-Aware Caller Memory 🧠

## 1. Problem Statement
Voice AI agents typically forget users the moment a session ends. For a healthcare access companion like **ArogyaSaathi**, asking returning users to repeat their name, preferred language, or conversational needs creates unnecessary friction—especially for senior citizens and rural callers across Bharat.

---

## 2. Architecture & Data Flow

```
USER (Browser / Next.js UI)
  ↓ [Sends persistent userId from localStorage via /api/token]
LiveKit Cloud WebRTC
  ↓ [Audio & Data Streams]
ArogyaSaathi Agent (backend/src/agent.py)
  ├── Deepgram STT (nova-3 multilingual)
  ├── Gemini 3.5 Flash Lite LLM
  └── Murf Falcon TTS (Anisha)
  │
Agent Function Tools (@function_tool)
  ├── lookup_user(name_or_id)
  ├── save_user_memory(name, consent, age_band, language_pref...)
  └── forget_user(name_or_id)
  │
Memory Safety & Validation Service (backend/src/memory/service.py)
  │ [Defense-in-depth: Rejects medical notes / sensitive diagnoses]
  │ [Validates explicit user_consent_given == True]
  ↓
SQLite Persistence Layer (backend/data/arogyasaathi.db)
```

---

## 3. Database Schema

**Location**: `backend/data/arogyasaathi.db` (Ignored in `.gitignore`)

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language_preference TEXT DEFAULT 'Hindi/English',
    age_band TEXT DEFAULT 'Unspecified',
    facts_json TEXT NOT NULL,
    last_interaction TEXT NOT NULL
);
```

---

## 4. Privacy Guardrails & Defense-in-Depth

1. **Mandatory Consent**: Before calling `save_user_memory`, the agent explicitly asks the caller for permission. If consent is declined, no record is saved.
2. **Minimal Non-Medical Memory**: Persistent storage is strictly limited to non-sensitive preferences (`name`, `language_preference`, `age_band`, `preferred_register`).
3. **Medical Record Filtering**: The `MemoryService.sanitize_facts()` validator automatically strips and rejects sensitive medical notes, diagnoses, prescriptions, Aadhaar/ID numbers, or financial details.
4. **Right to be Forgotten (`forget_user`)**: Users can request to wipe their saved memory at any time.

---

## 5. Returning User Flow

- **Call 1 (New User)**:
  - User: *"Namaste, my name is Meera."*
  - Agent: *"Nice to meet you, Meera. Would you like me to remember your name and Hindi language preference for future calls?"*
  - User: *"Yes."* -> Agent calls `save_user_memory(consent=True)` -> Memory saved in `backend/data/arogyasaathi.db`.
- **Backend Restart**: Server is completely stopped and restarted.
- **Call 2 (Returning User)**:
  - Agent calls `lookup_user("Meera")`, finds profile, and greets naturally:
  - Agent: *"Namaste Meera ji, welcome back. Would you like to continue in Hindi?"*
- **Deletion**:
  - User: *"ArogyaSaathi, forget my saved information."*
  - Agent calls `forget_user("Meera")` -> Profile permanently deleted from SQLite.

---

## 6. Known Limitations & Production Roadmap

- **Hackathon Local SQLite**: Suitable for single-node deployments. Production multi-region scaling would transition to PostgreSQL or Managed Redis.
- **Non-Medical Scope**: ArogyaSaathi is an AI Health Companion, not a doctor or medical record system. Health notes are intentionally excluded from persistent memory.
