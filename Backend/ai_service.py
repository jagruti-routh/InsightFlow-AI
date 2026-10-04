# ai_service.py

import os
import json
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# ============================================================
# INSIGHTFLOW AI - AI ANALYSIS SERVICE
# ============================================================


# ============================================================
# 1. LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env"
    )
)

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured in Backend/.env"
    )


# ============================================================
# 2. GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)

# Primary model
MODEL_NAME = "gemini-3.6-flash"

# Fallback model
FALLBACK_MODEL_NAME = "gemini-3.5-flash"

# Application-level retry configuration
MAX_PRIMARY_ATTEMPTS = 2
RETRY_DELAY_SECONDS = 3


# ============================================================
# 3. STRUCTURED OUTPUT MODELS
# ============================================================

class Summary(BaseModel):

    executive_summary: str = Field(
        description="Concise executive summary of the meeting."
    )

    key_points: list[str] = Field(
        description="Important points discussed in the meeting."
    )


class Task(BaseModel):

    title: str = Field(
        description="Short title of the task."
    )

    description: str = Field(
        description="Description of what needs to be done."
    )

    owner: Optional[str] = Field(
        default=None,
        description="Responsible speaker or person."
    )

    deadline: Optional[str] = Field(
        default=None,
        description="Deadline mentioned in the meeting."
    )

    priority: str = Field(
        description="Priority: High, Medium, or Low."
    )


class Decision(BaseModel):

    decision: str = Field(
        description="Decision explicitly made or agreed upon."
    )

    category: Optional[str] = Field(
        default=None,
        description="Decision category."
    )

    importance: Optional[str] = Field(
        default=None,
        description="Importance level."
    )

    made_by: Optional[str] = Field(
        default=None,
        description="Speaker or person who made or confirmed the decision."
    )


class Risk(BaseModel):

    risk: str = Field(
        description="Risk, concern, blocker, or potential problem."
    )

    impact: str = Field(
        description="Potential business or technical impact."
    )

    mitigation_plan: str = Field(
        description="Mitigation discussed in the meeting."
    )

    severity: str = Field(
        description="Severity: High, Medium, or Low."
    )

    status: str = Field(
        description="Current risk status."
    )


class Insight(BaseModel):

    insight: str = Field(
        description="Useful business, product, technical, or operational insight."
    )

    type: str = Field(
        description="Insight category."
    )


class MeetingAnalysis(BaseModel):

    summary: Summary

    sentiment: str = Field(
        description="Overall sentiment: Positive, Neutral, Negative, or Mixed."
    )

    meeting_category: str = Field(
        description="Business category of the meeting."
    )

    overall_priority: str = Field(
        description="Overall priority: Low, Medium, High, or Critical."
    )

    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score between 0 and 1."
    )

    tasks: list[Task]

    decisions: list[Decision]

    risks: list[Risk]

    insights: list[Insight]


# ============================================================
# 4. CONVERT ALIGNED TRANSCRIPT TO AI INPUT
# ============================================================

def build_transcript_text(
    aligned_transcript: list[dict]
) -> str:

    lines = []

    for segment in aligned_transcript:

        speaker = segment.get(
            "speaker",
            "UNKNOWN"
        )

        text = segment.get(
            "text",
            ""
        ).strip()

        if text:

            lines.append(
                f"{speaker}: {text}"
            )

    transcript_text = "\n".join(
        lines
    )

    if not transcript_text:

        raise ValueError(
            "Aligned transcript is empty."
        )

    return transcript_text


# ============================================================
# 5. CHECK WHETHER ERROR IS TEMPORARY
# ============================================================

def is_transient_gemini_error(
    error: Exception
) -> bool:

    error_text = str(error).upper()

    transient_indicators = [
        "503",
        "UNAVAILABLE",
        "SERVICE_UNAVAILABLE",
        "429",
        "RESOURCE_EXHAUSTED",
        "500",
        "INTERNAL",
        "504",
        "DEADLINE_EXCEEDED",
        "TIMEOUT"
    ]

    return any(
        indicator in error_text
        for indicator in transient_indicators
    )


# ============================================================
# 6. GEMINI REQUEST WITH RESILIENCE
# ============================================================

def generate_gemini_response(
    prompt: str
):
    """
    Attempts Gemini analysis using the primary model.

    Recovery strategy:

    1. Primary model - attempt 1
    2. Primary model - attempt 2 after short delay
    3. Fallback model
    4. Raise a clear error if all attempts fail
    """

    last_error = None

    # --------------------------------------------------------
    # PRIMARY MODEL
    # --------------------------------------------------------

    for attempt in range(
        1,
        MAX_PRIMARY_ATTEMPTS + 1
    ):

        try:

            print(
                f"\nGemini attempt "
                f"{attempt}/{MAX_PRIMARY_ATTEMPTS}"
            )

            print(
                f"Using model: {MODEL_NAME}"
            )

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=MeetingAnalysis
                )
            )

            print(
                f"Gemini primary model succeeded "
                f"on attempt {attempt}."
            )

            return response

        except Exception as e:

            last_error = e

            print(
                f"\nGemini primary model attempt "
                f"{attempt} failed."
            )

            print(
                f"Error: {e}"
            )

            # Only retry known temporary failures
            if not is_transient_gemini_error(e):

                print(
                    "Error does not appear to be "
                    "transient. No retry will be attempted."
                )

                raise

            if attempt < MAX_PRIMARY_ATTEMPTS:

                wait_time = (
                    RETRY_DELAY_SECONDS * attempt
                )

                print(
                    f"Temporary Gemini service error."
                )

                print(
                    f"Waiting {wait_time} seconds "
                    f"before retry..."
                )

                time.sleep(
                    wait_time
                )


    # --------------------------------------------------------
    # FALLBACK MODEL
    # --------------------------------------------------------

    print(
        "\nPrimary Gemini model unavailable "
        "after retries."
    )

    print(
        f"Switching to fallback model: "
        f"{FALLBACK_MODEL_NAME}"
    )

    try:

        response = client.models.generate_content(
            model=FALLBACK_MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MeetingAnalysis
            )
        )

        print(
            f"Fallback model "
            f"{FALLBACK_MODEL_NAME} succeeded."
        )

        return response

    except Exception as fallback_error:

        print(
            "\nFallback Gemini model also failed."
        )

        print(
            f"Fallback error: {fallback_error}"
        )

        raise RuntimeError(
            "Gemini AI analysis is temporarily "
            "unavailable. The primary model and "
            "fallback model could not process "
            "the meeting."
        ) from fallback_error


# ============================================================
# 7. ANALYZE MEETING
# ============================================================

def analyze_meeting(
    aligned_transcript: list[dict]
) -> tuple[dict, float]:

    start_time = time.time()

    transcript_text = build_transcript_text(
        aligned_transcript
    )

    prompt = f"""
You are the AI intelligence engine for InsightFlow AI,
a Business Meeting Intelligence Platform.

Analyze the following meeting transcript and extract reliable,
business-relevant information.

IMPORTANT RULES:

1. Only use information explicitly supported by the transcript.
2. Do not invent people, tasks, decisions, deadlines, risks, or facts.
3. Preserve speaker labels such as SPEAKER_00 and SPEAKER_01.
4. If a task owner is identified only by a speaker label,
   return that speaker label.
5. Do not guess the real identity of a speaker.
6. If a deadline is mentioned relatively, such as "Thursday",
   preserve the relative wording as "Thursday".
7. Identify decisions only when the transcript clearly indicates
   that a decision was made or agreed upon.
8. Identify risks only when the transcript indicates a potential
   problem, threat, blocker, or negative consequence.
9. Extract useful business insights from measurable or meaningful
   information in the meeting.
10. confidence_score must be between 0.0 and 1.0.
11. Do not create an owner when the transcript does not identify one.
12. Do not create a deadline when the transcript does not identify one.
13. Keep numerical information accurate.
14. Do not infer speaker identity from the speaker labels.

For sentiment, classify the overall meeting as one of:

Positive
Neutral
Negative
Mixed

For overall_priority, classify the meeting as one of:

Low
Medium
High
Critical

Return the analysis according to the required structured schema.

MEETING TRANSCRIPT:

{transcript_text}
"""

    print(
        "\nSending meeting transcript to Gemini..."
    )

    print(
        f"Primary model: {MODEL_NAME}"
    )

    print(
        f"Fallback model: {FALLBACK_MODEL_NAME}"
    )

    print(
        f"Transcript characters: "
        f"{len(transcript_text)}"
    )

    # --------------------------------------------------------
    # RESILIENT GEMINI REQUEST
    # --------------------------------------------------------

    response = generate_gemini_response(
        prompt
    )

    # --------------------------------------------------------
    # VALIDATE RESPONSE
    # --------------------------------------------------------

    if not response.text:

        raise RuntimeError(
            "Gemini returned an empty response."
        )

    analysis = MeetingAnalysis.model_validate_json(
        response.text
    )

    processing_time = (
        time.time() - start_time
    )

    return (
        analysis.model_dump(),
        processing_time
    )


# ============================================================
# 8. STANDALONE TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("INSIGHTFLOW AI - AI SERVICE TEST")
    print("=" * 70)

    print(
        "\nAI service loaded successfully."
    )

    print(
        f"Primary Gemini model: "
        f"{MODEL_NAME}"
    )

    print(
        f"Fallback Gemini model: "
        f"{FALLBACK_MODEL_NAME}"
    )

    print(
        "\nThis module is now ready to receive "
        "aligned transcripts dynamically."
    )

    print("=" * 70)