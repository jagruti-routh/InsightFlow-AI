# InsightFlow AI

## Business Meeting Intelligence Platform

InsightFlow AI is an AI-powered business meeting intelligence platform that converts meeting recordings into structured and actionable business information.

The system automatically processes meeting audio, generates a speaker-attributed transcript, analyzes the conversation using Generative AI, and extracts important meeting outcomes such as summaries, tasks, decisions, deadlines, priorities, and risks.

---

## Problem Statement

Important information in business meetings is often buried inside long audio recordings or transcripts.

Manually reviewing meetings to identify:

- What was discussed?
- What decisions were made?
- Who needs to do what?
- What are the deadlines?
- What risks were identified?

can be time-consuming and error-prone.

InsightFlow AI addresses this problem by automatically transforming meeting conversations into structured business insights.

---

## Solution

The platform follows an automated AI pipeline:

Meeting Recording
↓
Speech-to-Text
↓
Speaker Diarization
↓
Speaker-Attributed Transcript
↓
Gemini AI Analysis
↓
Tasks / Decisions / Risks / Summary
↓
PostgreSQL Database
↓
React Dashboard
↓
PDF Meeting Report

---

## Key Features

- Meeting audio upload
- Automatic speech-to-text transcription
- Speaker diarization
- Speaker-attributed transcripts
- AI-generated meeting summaries
- Action item / task extraction
- Deadline extraction
- Decision detection
- Risk identification
- Priority classification
- Meeting categorization
- Sentiment analysis
- Confidence scoring
- PostgreSQL data storage
- Interactive React dashboard
- Search and filtering
- Downloadable PDF meeting reports
- Backend API using FastAPI
- Error handling for temporary AI-service failures

---

## AI Pipeline

### 1. Speech-to-Text

OpenAI Whisper converts the uploaded meeting recording into text.

### 2. Speaker Diarization

pyannote.audio identifies different speakers and assigns labels such as:

SPEAKER_00  
SPEAKER_01

These labels are aligned with the transcript to create a speaker-attributed conversation.

### 3. Generative AI Analysis

The transcript is analyzed using the Google Gemini API.

The AI extracts structured information including:

- Summary
- Tasks
- Deadlines
- Decisions
- Risks
- Priorities
- Sentiment
- Meeting category
- Keywords
- Confidence score

### 4. Database Storage

The processed meeting information is stored in PostgreSQL.

### 5. Business Dashboard

The React frontend presents the generated information through dedicated pages for meetings, tasks, decisions, risks and reports.

---

## Technology Stack

### Backend

- Python
- FastAPI
- PostgreSQL
- SQL
- OpenAI Whisper
- pyannote.audio
- Google Gemini API
- Google GenAI Python SDK

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

### Database

- PostgreSQL

### AI / Machine Learning

- Speech Recognition
- Speaker Diarization
- Natural Language Processing
- Generative AI

---

## Project Architecture

```text
                    ┌─────────────────────┐
                    │   Meeting Recording │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   OpenAI Whisper    │
                    │  Speech-to-Text     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  pyannote.audio     │
                    │ Speaker Diarization │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Speaker-Attributed  │
                    │     Transcript      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Gemini AI       │
                    │ Meeting Analysis    │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        ┌─────────┐       ┌───────────┐     ┌─────────┐
        │  Tasks  │       │ Decisions │     │  Risks  │
        └─────────┘       └───────────┘     └─────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Dashboard   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    PDF Reports      │
                    └─────────────────────┘