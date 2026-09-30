# AI Meeting Summarizer with Action Extraction, PostgreSQL & QA Engine

An end-to-end intelligent meeting processing platform that converts raw meeting recordings (.mp3, .wav, .m4a, .flac) into speaker-attributed transcripts, executive summaries, actionable task items, decisions, deadlines, risks, follow-up topics, and custom contextual Q&A answers.

---

## 1. Project Overview

The **AI Meeting Summarizer** automates meeting documentation by leveraging state-of-the-art open-source Deep Learning and Natural Language Processing (NLP) models.

### Key Capabilities:
- **Speech-to-Text Transcription**: Converts multi-format audio into accurate text using `faster-whisper`.
- **Optional Speaker Diarization**: Formats spoken turns into `Speaker 1: ...`, `Speaker 2: ...` (via `pyannote.audio` or segment attribution).
- **Automated Deep Learning Analysis**:
  - Abstractive Summarization via pretrained DistilBART Seq2Seq Transformer.
  - Action Item & Deadline Extraction via pretrained BERT NER Token Classification.
  - Factual extraction of Decisions, Risks, and Follow-up Topics without hallucination.
- **Contextual Question Answering**: Allows users to ask custom questions grounded strictly in the meeting transcript using pretrained RoBERTa SQuAD2.
- **Persistent Data Storage**: Persists all meetings and structured analysis outputs in a relational PostgreSQL database via SQLAlchemy.
- **Executive React Dashboard**: Responsive glassmorphic UI built with React, Vite, and Tailwind CSS.

---

## 2. Architecture & Pipeline Diagram

```
User Uploads Audio Recording (.mp3, .wav, .m4a, .flac)
       ↓
FastAPI Backend (/api/meetings/upload)
       ↓
faster-whisper Engine (Speech-to-Text)
       ↓
Optional Speaker Diarization / Turn Attribution
       ↓
Speaker-Aware Meeting Transcript
       ├──> DistilBART Seq2Seq Model ──> Executive Summary
       ├──> BERT NER Model         ──> Action Items & Assignees ({person, task, deadline})
       ├──> Factual NLP Rules      ──> Decisions, Risks & Follow-up Topics
       └──> RoBERTa SQuAD2 Model   ──> Contextual Custom Question Answering
       ↓
PostgreSQL Relational Persistence (SQLAlchemy & Pydantic Schemas)
       ↓
React + Vite + Tailwind CSS Executive Dashboard
```

---

## 3. Deep Learning & NLP Pipeline Explanation

```
Audio Input (.wav / .mp3)
       ↓
faster-whisper Mel-Spectrogram & Encoder-Decoder
       ↓
Raw Transcript String
       ↓
Hugging Face Tokenizer (BPE / WordPiece)
       ↓
Token IDs Sequence: [101, 2054, 2001, 3123, 102]
       ↓
Embedding Vectors Matrix (Token + Position + Segment Embeddings)
       ↓
Multi-Head Self-Attention & Feed-Forward Transformer Layers
       ↓
Prediction Probabilities Logits Output
       ↓
Structured Output ({summary, action_items, decisions, deadlines, risks, follow_ups})
```

### Deep Learning Concepts Explained:

1. **Pretrained Models vs. Fine-Tuned Models**:
   - **Pretrained Models**: Models trained on large scale, general-purpose datasets (e.g. CNN-DailyMail, CoNLL-2003, SQuAD2) that are initialized directly from Hugging Face Hub checkpoints for inference. **This application uses off-the-shelf pretrained models.** Training models from scratch or fine-tuning weights on custom meeting datasets was not performed.
   - **Fine-Tuned Models**: Models whose weights are further updated via backpropagation on custom domain-specific datasets after pretraining.

2. **Whisper (Speech-to-Text)**:
   - Converts raw 16kHz audio waveforms into 80-channel log-Mel spectrograms. An audio encoder maps spectrogram features to representations, and a sequence-to-sequence autoregressive decoder generates text tokens.

3. **Transformer Architecture**:
   - Relies on multi-head self-attention mechanisms to weigh relationships between all tokens in a sequence simultaneously, enabling parallel computing and capturing long-range contextual dependencies.

4. **Tokenization**:
   - Converts raw string text into discrete numerical identifiers (`Token IDs`). DistilBART uses Byte-Pair Encoding (BPE), while BERT/RoBERTa uses WordPiece subword tokenization.

5. **Embedding Vectors**:
   - Maps discrete token IDs to high-dimensional continuous vector space (e.g., 768-dimensional vectors) combining token identity, position embeddings, and segment markers.

6. **BERT / DistilBART / RoBERTa**:
   - **DistilBART** (`sshleifer/distilbart-cnn-12-6`): Compressed sequence-to-sequence transformer model optimized for abstractive text summarization.
   - **BERT NER** (`dslim/bert-base-NER`): Bidirectional encoder transformer performing token-level classification to detect Named Entities (`PER`, `ORG`, `LOC`).
   - **RoBERTa SQuAD2** (`deepset/roberta-base-squad2`): Robustly optimized BERT variant trained on SQuAD 2.0 to perform span-level extractive Question Answering.

7. **PyTorch Framework**:
   - Serves as the underlying deep learning tensor computation and automatic differentiation framework powering model execution on CPU/GPU.

---

## 4. Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, PyTorch, Hugging Face Transformers, `faster-whisper`, `psycopg2-binary`.
- **Database**: PostgreSQL 18.
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide Icons.

---

## 5. Environment Variables (`backend/.env`)

```env
APP_NAME=AI Meeting Summarizer
APP_ENV=development
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/meeting_summarizer
UPLOADS_DIR=uploads
WHISPER_MODEL_SIZE=tiny
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
SUMMARIZER_MODEL_NAME=sshleifer/distilbart-cnn-12-6
# Optional Speaker Diarization Hugging Face Token:
# HF_TOKEN=hf_your_access_token
```

---

## 6. Database Setup

1. **Start PostgreSQL Server**: Ensure PostgreSQL is running on port 5432 or 5433.
2. **Create Database**:
   ```sql
   CREATE DATABASE meeting_summarizer;
   ```
3. **Automatic Schema Migration**: On backend startup (`uvicorn app.main:app`), `init_db()` automatically initializes all 8 database tables:
   - `meetings`, `transcripts`, `summaries`, `action_items`, `decisions`, `deadlines`, `risks`, `follow_up_topics`.

---

## 7. How to Run the Project

### Step 1: Start Backend API

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### Step 2: Start Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```
- Dashboard URL: `http://localhost:5173`

---

## 8. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service health status |
| `GET` | `/api/health` | API liveness check |
| `GET` | `/api/meetings` | Retrieve all meetings from PostgreSQL |
| `GET` | `/api/meetings/{id}` | Retrieve meeting details, transcript, summary, & tasks |
| `POST` | `/api/meetings/upload` | Upload audio and run automated meeting analysis |
| `POST` | `/api/meetings/{id}/ask` | Answer custom user questions using transcript context |
| `POST` | `/api/meetings/{id}/analyze` | Re-trigger automated analysis workflow |

---

## 9. Project Directory Structure

```
AI-Meeting-Summarizer/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py           # Health endpoints
│   │   │       └── meetings.py         # Meeting CRUD, Upload, QA & Analysis routes
│   │   ├── database/
│   │   │   └── connection.py           # SQLAlchemy engine & session maker
│   │   ├── models/
│   │   │   ├── db_models.py            # SQLAlchemy DB entities (8 tables)
│   │   │   └── schemas.py              # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── whisper_service.py      # faster-whisper STT service
│   │   │   ├── summarizer.py           # DistilBART Seq2Seq summarizer
│   │   │   ├── action_extractor.py     # BERT NER entity extractor
│   │   │   ├── diarization_service.py  # Optional speaker diarization
│   │   │   ├── qa_service.py           # RoBERTa contextual QA engine
│   │   │   └── analysis_service.py     # Automated analysis coordinator
│   │   ├── config.py                   # App & Database Settings
│   │   └── main.py                     # FastAPI application startup & CORS
│   ├── uploads/                        # Local audio recording store
│   ├── requirements.txt
│   ├── .env & .env.example
├── frontend/                           # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── App.jsx                     # Dashboard, Upload & QA UI
│   │   ├── index.css                   # Tailwind CSS imports & theme
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 10. Testing Instructions

### Run Automated Audit Verification Suite

```bash
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\python "..\scratch\final_audit_verification.py"
```
This suite verifies:
1. PostgreSQL connection & all 8 table schemas.
2. Real audio transcription via Whisper.
3. Abstractive summary generation via DistilBART.
4. Action item extraction via BERT NER.
5. Record persistence in PostgreSQL.
6. Contextual Question Answering via RoBERTa SQuAD2.
