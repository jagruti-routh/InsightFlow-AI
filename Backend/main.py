#main.py

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection
from report_service import generate_meeting_report

from ai_service import analyze_meeting
from ai_database import (
    save_complete_ai_analysis,
    save_ai_processing_log
)

import os
import shutil
import subprocess
import time
import json


app = FastAPI(
    title="InsightFlow AI",
    description="Business Meeting Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "InsightFlow AI Backend is running!",
        "status": "success"
    }


# ============================================================
# USERS
# ============================================================

@app.get("/users")
def get_users():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
        user_id,
        full_name,
        email,
        role,
        department,
        profile_image,
        created_at,
        updated_at
    FROM users
    ORDER BY user_id;
    """)

    users = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "user_id": row[0],
            "full_name": row[1],
            "role": row[2],
            "department": row[3],
            "profile_image": row[4]
        }
        for row in users
    ]


# ============================================================
# MEETINGS
# ============================================================

# ============================================================
# GET ALL MEETINGS - DASHBOARD READY
# ============================================================

@app.get("/meetings")
def get_meetings():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            m.meeting_id,
            m.title,
            m.description,
            m.meeting_date,
            m.meeting_time,
            m.duration,
            m.file_name,
            m.file_format,
            m.file_size,
            m.meeting_status,
            m.created_at,
            m.updated_at,

            mi.sentiment,
            mi.meeting_category,
            mi.overall_priority,
            mi.confidence_score

        FROM meetings m

        LEFT JOIN meeting_insights mi
            ON m.meeting_id = mi.meeting_id

        ORDER BY m.meeting_date DESC, m.meeting_id DESC;
    """)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    meetings = []

    for row in rows:
        meetings.append({
            "meeting_id": row[0],
            "title": row[1],
            "description": row[2],
            "meeting_date": row[3],
            "meeting_time": row[4],
            "duration": row[5],
            "file_name": row[6],
            "file_format": row[7],
            "file_size": row[8],
            "meeting_status": row[9],
            "created_at": row[10],
            "updated_at": row[11],
            "sentiment": row[12],
            "meeting_category": row[13],
            "overall_priority": row[14],
            "confidence_score": row[15]
        })

    return meetings


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            meeting_id,
            uploaded_by,
            title,
            description,
            meeting_date,
            meeting_time,
            duration,
            file_name,
            file_format,
            file_size,
            audio_file_path,
            meeting_status,
            created_at,
            updated_at
        FROM meetings
        WHERE meeting_id = %s;
    """, (meeting_id,))

    meeting = cursor.fetchone()

    cursor.close()
    connection.close()

    if meeting is None:
        return {"message": "Meeting not found"}

    return {
        "meeting_id": meeting[0],
        "uploaded_by": meeting[1],
        "title": meeting[2],
        "description": meeting[3],
        "meeting_date": meeting[4],
        "meeting_time": meeting[5],
        "duration": meeting[6],
        "file_name": meeting[7],
        "file_format": meeting[8],
        "file_size": meeting[9],
        "audio_file_path": meeting[10],
        "meeting_status": meeting[11],
        "created_at": meeting[12],
        "updated_at": meeting[13]
    }


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

WHISPER_PYTHON = os.path.join(
    os.path.dirname(BASE_DIR),
    "whisper_env",
    "Scripts",
    "python.exe"
)

WHISPER_SERVICE = os.path.join(
    BASE_DIR,
    "whisper_service.py"
)

DIARIZATION_PYTHON = os.path.join(
    os.path.dirname(BASE_DIR),
    "diarization_env",
    "Scripts",
    "python.exe"
)

DIARIZATION_SERVICE = os.path.join(
    BASE_DIR,
    "diarization_service.py"
)

def run_whisper(audio_file: str) -> tuple[dict, float]:

    start_time = time.time()

    result = subprocess.run(
        [
            WHISPER_PYTHON,
            WHISPER_SERVICE,
            audio_file
        ],
        capture_output=True,
        text=True
    )

    processing_time = time.time() - start_time

    if result.returncode != 0:

        raise RuntimeError(
            f"Whisper failed:\n{result.stderr}"
        )

    try:

        whisper_result = json.loads(
            result.stdout
        )

    except json.JSONDecodeError:

        raise RuntimeError(
            f"Invalid Whisper output:\n{result.stdout}"
        )

    return whisper_result, processing_time


def run_diarization(
    audio_file: str,
    num_speakers: int
) -> tuple[list, float]:

    start_time = time.time()

    result = subprocess.run(
        [
            DIARIZATION_PYTHON,
            DIARIZATION_SERVICE,
            audio_file,
            str(num_speakers)
        ],
        capture_output=True,
        text=True
    )

    processing_time = time.time() - start_time

    if result.returncode != 0:
        raise RuntimeError(
            f"Diarization failed:\n{result.stderr}"
        )

    try:

        diarization_result = json.loads(
            result.stdout
        )

    except json.JSONDecodeError:

        raise RuntimeError(
            f"Invalid diarization output:\n{result.stdout}"
        )

    segments = diarization_result.get(
        "segments",
        []
    )

    return segments, processing_time


def align_transcript_with_speakers(
    whisper_segments: list,
    speaker_segments: list
) -> list:

    aligned_segments = []

    for whisper_segment in whisper_segments:

        whisper_start = whisper_segment["start"]
        whisper_end = whisper_segment["end"]

        best_speaker = "UNKNOWN"
        best_overlap = 0.0

        for speaker_segment in speaker_segments:

            speaker_start = speaker_segment["start"]
            speaker_end = speaker_segment["end"]

            # Calculate overlap between the two time ranges
            overlap_start = max(
                whisper_start,
                speaker_start
            )

            overlap_end = min(
                whisper_end,
                speaker_end
            )

            overlap = max(
                0.0,
                overlap_end - overlap_start
            )

            if overlap > best_overlap:

                best_overlap = overlap
                best_speaker = speaker_segment["speaker"]

        aligned_segments.append({
            "start": whisper_start,
            "end": whisper_end,
            "speaker": best_speaker,
            "text": whisper_segment["text"]
        })

    return aligned_segments



# ============================================================
# MEETING PARTICIPANTS
# ============================================================

@app.get("/meeting-participants/{meeting_id}")
def get_meeting_participants(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            mp.participant_id,
            mp.meeting_id,
            mp.user_id,
            u.full_name,
            mp.attendance_status,
            mp.joined_at
        FROM meeting_participants mp
        JOIN users u
            ON mp.user_id = u.user_id
        WHERE mp.meeting_id = %s
        ORDER BY mp.participant_id;
    """, (meeting_id,))

    participants = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "participant_id": row[0],
            "meeting_id": row[1],
            "user_id": row[2],
            "full_name": row[3],
            "attendance_status": row[4],
            "joined_at": row[5]
        }
        for row in participants
    ]

# ============================================================
# SPEAKER PARTICIPATION / SPEAKER STATS
# ============================================================

@app.get("/speaker-stats/{meeting_id}")
def get_speaker_stats(meeting_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                speaker,
                SUM(end_time - start_time) AS speaking_time
            FROM meeting_speaker_segments
            WHERE meeting_id = %s
            GROUP BY speaker
            ORDER BY speaking_time DESC;
            """,
            (meeting_id,)
        )

        rows = cursor.fetchall()

        if not rows:
            return {
                "meeting_id": meeting_id,
                "total_speaking_time": 0,
                "speaker_count": 0,
                "speakers": []
            }

        speakers = []

        for speaker, speaking_time in rows:
            speakers.append({
                "speaker": speaker,
                "speaking_time": round(float(speaking_time), 2)
            })

        total_speaking_time = sum(
            speaker["speaking_time"]
            for speaker in speakers
        )

        for speaker in speakers:
            speaker["percentage"] = round(
                (speaker["speaking_time"] / total_speaking_time) * 100,
                1
            )

        return {
            "meeting_id": meeting_id,
            "total_speaking_time": round(total_speaking_time, 2),
            "speaker_count": len(speakers),
            "speakers": speakers
        }

    finally:
        cursor.close()
        conn.close()

# ============================================================
# TRANSCRIPTS
# ============================================================

@app.get("/transcripts/{meeting_id}")
def get_transcript(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            transcript_id,
            meeting_id,
            transcript_text,
            language,
            processing_time,
            transcript_version,
            generated_at
        FROM transcripts
        WHERE meeting_id = %s;
    """, (meeting_id,))

    transcript = cursor.fetchone()

    cursor.close()
    connection.close()

    if transcript is None:
        return {"message": "Transcript not found"}

    return {
        "transcript_id": transcript[0],
        "meeting_id": transcript[1],
        "transcript_text": transcript[2],
        "language": transcript[3],
        "processing_time": transcript[4],
        "transcript_version": transcript[5],
        "generated_at": transcript[6]
    }


# ============================================================
# MEETING INSIGHTS
# ============================================================

@app.get("/insights/{meeting_id}")
def get_insights(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            insight_id,
            meeting_id,
            summary,
            keywords,
            sentiment,
            meeting_category,
            overall_priority,
            confidence_score,
            generated_at
        FROM meeting_insights
        WHERE meeting_id = %s
        ORDER BY insight_id;
    """, (meeting_id,))

    insights = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "insight_id": row[0],
            "meeting_id": row[1],
            "summary": row[2],
            "keywords": row[3],
            "sentiment": row[4],
            "meeting_category": row[5],
            "overall_priority": row[6],
            "confidence_score": row[7],
            "generated_at": row[8]
        }
        for row in insights
    ]


# ============================================================
# TASKS
# ============================================================

@app.get("/tasks/{meeting_id}")
def get_tasks(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            t.task_id,
            t.meeting_id,
            t.assigned_to,
            u.full_name,
            t.task_title,
            t.task_description,
            t.priority_level,
            t.deadline,
            t.status,
            t.completion_date,
            t.created_at
        FROM tasks t
        LEFT JOIN users u
            ON t.assigned_to = u.user_id
        WHERE t.meeting_id = %s
        ORDER BY t.task_id;
    """, (meeting_id,))

    tasks = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "task_id": row[0],
            "meeting_id": row[1],
            "assigned_to": row[2],
            "assigned_user": row[3],
            "task_title": row[4],
            "task_description": row[5],
            "priority_level": row[6],
            "deadline": row[7],
            "status": row[8],
            "completion_date": row[9],
            "created_at": row[10]
        }
        for row in tasks
    ]


# ============================================================
# DECISIONS
# ============================================================

@app.get("/decisions/{meeting_id}")
def get_decisions(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            decision_id,
            meeting_id,
            decision_text,
            decision_category,
            importance_level,
            created_at
        FROM decisions
        WHERE meeting_id = %s
        ORDER BY decision_id;
    """, (meeting_id,))

    decisions = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "decision_id": row[0],
            "meeting_id": row[1],
            "decision_text": row[2],
            "decision_category": row[3],
            "importance_level": row[4],
            "created_at": row[5]
        }
        for row in decisions
    ]


# ============================================================
# RISKS
# ============================================================

@app.get("/risks/{meeting_id}")
def get_risks(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            risk_id,
            meeting_id,
            risk_description,
            risk_level,
            mitigation_plan,
            status,
            created_at
        FROM risks
        WHERE meeting_id = %s
        ORDER BY risk_id;
    """, (meeting_id,))

    risks = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "risk_id": row[0],
            "meeting_id": row[1],
            "risk_description": row[2],
            "risk_level": row[3],
            "mitigation_plan": row[4],
            "status": row[5],
            "created_at": row[6]
        }
        for row in risks
    ]


# ============================================================
# REPORTS
# ============================================================

@app.get("/reports/{meeting_id}")
def get_reports(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            r.report_id,
            r.meeting_id,
            r.report_name,
            r.report_type,
            r.report_format,
            r.file_path,
            r.generated_by,
            u.full_name,
            r.generated_at
        FROM reports r
        LEFT JOIN users u
            ON r.generated_by = u.user_id
        WHERE r.meeting_id = %s
        ORDER BY r.report_id;
    """, (meeting_id,))

    reports = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "report_id": row[0],
            "meeting_id": row[1],
            "report_name": row[2],
            "report_type": row[3],
            "report_format": row[4],
            "file_path": row[5],
            "generated_by": row[6],
            "generated_user": row[7],
            "generated_at": row[8]
        }
        for row in reports
    ]


# ============================================================
# AI PROCESSING LOGS
# ============================================================

@app.get("/processing-logs/{meeting_id}")
def get_processing_logs(meeting_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            job_id,
            meeting_id,
            current_stage,
            status,
            started_at,
            completed_at,
            processing_time,
            error_message
        FROM ai_processing_logs
        WHERE meeting_id = %s
        ORDER BY job_id;
    """, (meeting_id,))

    logs = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "job_id": row[0],
            "meeting_id": row[1],
            "current_stage": row[2],
            "status": row[3],
            "started_at": row[4],
            "completed_at": row[5],
            "processing_time": row[6],
            "error_message": row[7]
        }
        for row in logs
    ]


# ============================================================
# MEETING UPLOAD
# ============================================================

# ============================================================
# MEETING UPLOAD + WHISPER TRANSCRIPTION
# ============================================================

@app.post("/meetings/upload")
def upload_meeting(
    title: str = Form(...),
    description: str = Form(None),
    meeting_date: str = Form(...),
    meeting_time: str = Form(...),
    duration: int = Form(None),
    uploaded_by: int = Form(...),
    num_speakers: int = Form(...),
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # 1. Create uploads folder
    # --------------------------------------------------------

    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # --------------------------------------------------------
    # 2. Get file information
    # --------------------------------------------------------

    file_name = file.filename

    file_format = (
        os.path.splitext(file_name)[1]
        .replace(".", "")
        .lower()
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file_name
    )

    # --------------------------------------------------------
    # 3. Save uploaded audio
    # --------------------------------------------------------

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # --------------------------------------------------------
    # 4. Get file size
    # --------------------------------------------------------

    file_size = os.path.getsize(file_path)

    # --------------------------------------------------------
    # 5. Insert meeting into database
    # --------------------------------------------------------

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO meetings
        (
            uploaded_by,
            title,
            description,
            meeting_date,
            meeting_time,
            duration,
            file_name,
            file_format,
            file_size,
            audio_file_path,
            meeting_status
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING meeting_id;
    """, (
        uploaded_by,
        title,
        description,
        meeting_date,
        meeting_time,
        duration,
        file_name,
        file_format,
        file_size,
        file_path,
        "Processing"
    ))

    meeting_id = cursor.fetchone()[0]

    connection.commit()

    cursor.close()
    connection.close()

        # ========================================================
    # 6. RUN WHISPER
    # ========================================================

    try:

        whisper_result, whisper_time = run_whisper(
            file_path
        )

        print("\n========== WHISPER DEBUG ==========")
        print("Whisper result type:", type(whisper_result))
        print("Whisper result keys:", whisper_result.keys())

        transcript = whisper_result.get(
            "transcript",
            ""
        )

        whisper_segments = whisper_result.get(
            "segments",
            []
        )

        language = whisper_result.get(
            "language",
            "unknown"
        )

        print("Transcript length:", len(transcript))
        print("Whisper segments:", len(whisper_segments))
        print("Detected language:", language)

        if transcript:
            print("Transcript preview:")
            print(transcript[:300])

        if whisper_segments:
            print("First Whisper segment:")
            print(whisper_segments[0])

        print("===================================\n")

        if not transcript.strip():
            raise RuntimeError(
                "Whisper returned an empty transcript. "
                "The uploaded audio may contain no detectable speech."
            )

        if not whisper_segments:
            raise RuntimeError(
                "Whisper returned transcript text but no timestamped segments."
            )

    except Exception as e:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE meetings
            SET meeting_status = %s
            WHERE meeting_id = %s;
        """, (
            "Transcription Failed",
            meeting_id
        ))

        connection.commit()

        cursor.close()
        connection.close()

        raise RuntimeError(
            f"Meeting uploaded but transcription failed: {e}"
        )

    # ========================================================
    # 7. RUN SPEAKER DIARIZATION
    # ========================================================

    try:

        speaker_segments, diarization_time = run_diarization(
            file_path,
            num_speakers
        )

        print("\n========== DIARIZATION DEBUG ==========")
        print("Speaker segments type:", type(speaker_segments))
        print("Speaker segments count:", len(speaker_segments))

        if speaker_segments:
            print("First speaker segment:")
            print(speaker_segments[0])

            print("\nAll detected speakers:")
            print(
                sorted(
                    set(
                        segment.get("speaker", "UNKNOWN")
                        for segment in speaker_segments
                    )
                )
            )

        print("========================================\n")


        aligned_segments = align_transcript_with_speakers(
            whisper_segments,
            speaker_segments
        )

        print("\n========== ALIGNMENT DEBUG ==========")
        print("Aligned segments count:", len(aligned_segments))

        if aligned_segments:
            print("First aligned segment:")
            print(aligned_segments[0])

        print("======================================\n")

    except Exception as e:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE meetings
            SET meeting_status = %s
            WHERE meeting_id = %s;
        """, (
            "Diarization Failed",
            meeting_id
        ))

        connection.commit()

        cursor.close()
        connection.close()

        raise RuntimeError(
            f"Meeting uploaded and transcribed, but diarization failed: {e}"
        )

    # ========================================================
    # 7.1 ALIGN TRANSCRIPT WITH SPEAKERS
    # ========================================================

    aligned_segments = align_transcript_with_speakers(
        whisper_segments,
        speaker_segments
    )


    # ========================================================
    # 7.2 SAVE SPEAKER SEGMENTS
    # ========================================================

    connection = get_connection()
    cursor = connection.cursor()

    # Remove any existing speaker segments for this meeting
    # This prevents duplicate rows if this section is ever rerun.
    cursor.execute("""
        DELETE FROM meeting_speaker_segments
        WHERE meeting_id = %s;
    """, (meeting_id,))


    for segment in aligned_segments:

        cursor.execute("""
            INSERT INTO meeting_speaker_segments
            (
                meeting_id,
                speaker,
                start_time,
                end_time,
                transcript_text
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            );
        """, (
            meeting_id,
            segment["speaker"],
            segment["start"],
            segment["end"],
            segment["text"]
        ))


    connection.commit()

    cursor.close()
    connection.close()


    # ========================================================
    # 8. SAVE TRANSCRIPT
    # ========================================================

    # ========================================================
    # 8. SAVE TRANSCRIPT
    # ========================================================

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO transcripts
        (
            meeting_id,
            transcript_text,
            language,
            processing_time,
            transcript_version
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s
        );
    """, (
        meeting_id,
        transcript,
        language,
        whisper_time,
        1
    ))

    connection.commit()

    cursor.close()
    connection.close()

    # ========================================================
    # 9. RUN GEMINI AI ANALYSIS
    # ========================================================

    try:

        print(
            "\nStarting Gemini AI meeting analysis..."
        )

        ai_analysis, ai_processing_time = analyze_meeting(
            aligned_segments
        )

        print(
            f"Gemini analysis completed in "
            f"{ai_processing_time:.2f} seconds."
        )

    except Exception as e:

        print(
            "\nWARNING: Gemini AI analysis is temporarily unavailable."
        )
        print("Gemini error:", str(e))

        # Update meeting status without crashing the API
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE meetings
            SET meeting_status = %s
            WHERE meeting_id = %s;
        """, (
            "AI Analysis Failed",
            meeting_id
        ))

        connection.commit()

        cursor.close()
        connection.close()

        # Return a successful API response with partial processing
        return {
            "message": (
                "Meeting uploaded and transcribed successfully, "
                "but AI analysis is temporarily unavailable."
            ),

            "meeting_id": meeting_id,

            "title": title,

            "file_name": file_name,

            "file_format": file_format,

            "file_size": file_size,

            "meeting_status": "AI Analysis Failed",

            "whisper_processing_time": whisper_time,

            "diarization_processing_time": diarization_time,

            "ai_processing_time": None,

            "total_processing_time": (
                whisper_time + diarization_time
            ),

            "transcript": transcript,

            "speaker_segments": speaker_segments,

            "aligned_segments": aligned_segments,

            "ai_analysis": None,

            "ai_error": str(e)
        }


    # ========================================================
    # 10. SAVE AI ANALYSIS TO POSTGRESQL
    # ========================================================

    try:

        save_complete_ai_analysis(
            meeting_id,
            ai_analysis,
            ai_processing_time
        )

        print(
            "\nAI analysis successfully saved to PostgreSQL."
        )

    except Exception as e:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE meetings
            SET meeting_status = %s
            WHERE meeting_id = %s;
        """, (
            "AI Persistence Failed",
            meeting_id
        ))

        connection.commit()

        cursor.close()
        connection.close()

        raise RuntimeError(
            f"AI analysis was generated, "
            f"but database persistence failed: {e}"
        )


    # ========================================================
    # 11. UPDATE MEETING STATUS
    # ========================================================

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE meetings
        SET meeting_status = %s
        WHERE meeting_id = %s;
    """, (
        "Processed",
        meeting_id
    ))

    connection.commit()

    cursor.close()
    connection.close()

    # ========================================================
    # 12. RETURN COMPLETE AI RESULT
    # ========================================================

    total_processing_time = (
        whisper_time
        + diarization_time
        + ai_processing_time
    )

    return {
        "message": "Meeting uploaded and processed successfully",

        "meeting_id": meeting_id,

        "title": title,

        "file_name": file_name,

        "file_format": file_format,

        "file_size": file_size,

        "meeting_status": "Processed",

        "whisper_processing_time": whisper_time,

        "diarization_processing_time": diarization_time,

        "ai_processing_time": ai_processing_time,

        "total_processing_time": total_processing_time,

        "transcript": transcript,

        "speaker_segments": speaker_segments,

        "aligned_segments": aligned_segments,

        "ai_analysis": ai_analysis
    }




# ============================================================
# COMPLETE MEETING INTELLIGENCE
# ============================================================

@app.get("/meetings/{meeting_id}/intelligence")
def get_meeting_intelligence(meeting_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    # --------------------------------------------------------
    # 1. MEETING
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            meeting_id,
            uploaded_by,
            title,
            description,
            meeting_date,
            meeting_time,
            duration,
            file_name,
            file_format,
            file_size,
            meeting_status,
            created_at,
            updated_at
        FROM meetings
        WHERE meeting_id = %s;
    """, (meeting_id,))

    meeting = cursor.fetchone()

    if meeting is None:
        cursor.close()
        connection.close()

        return {
            "message": "Meeting not found",
            "meeting_id": meeting_id
        }

    # --------------------------------------------------------
    # 2. TRANSCRIPT
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            transcript_id,
            meeting_id,
            transcript_text,
            language,
            processing_time,
            transcript_version
        FROM transcripts
        WHERE meeting_id = %s
        ORDER BY transcript_id DESC
        LIMIT 1;
    """, (meeting_id,))

    transcript = cursor.fetchone()

    # --------------------------------------------------------
    # 3. AI INSIGHTS
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            insight_id,
            meeting_id,
            summary,
            keywords,
            sentiment,
            meeting_category,
            overall_priority,
            confidence_score,
            generated_at
        FROM meeting_insights
        WHERE meeting_id = %s
        ORDER BY insight_id DESC
        LIMIT 1;
    """, (meeting_id,))

    insight = cursor.fetchone()

    # --------------------------------------------------------
    # 4. TASKS
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            task_id,
            meeting_id,
            assigned_to,
            task_title,
            task_description,
            priority_level,
            deadline,
            status,
            completion_date,
            created_at
        FROM tasks
        WHERE meeting_id = %s
        ORDER BY task_id;
    """, (meeting_id,))

    tasks = cursor.fetchall()

    # --------------------------------------------------------
    # 5. DECISIONS
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            decision_id,
            meeting_id,
            decision_text,
            decision_category,
            importance_level,
            created_at
        FROM decisions
        WHERE meeting_id = %s
        ORDER BY decision_id;
    """, (meeting_id,))

    decisions = cursor.fetchall()

    # --------------------------------------------------------
    # 6. RISKS
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            risk_id,
            meeting_id,
            risk_description,
            risk_level,
            mitigation_plan,
            status,
            created_at
        FROM risks
        WHERE meeting_id = %s
        ORDER BY risk_id;
    """, (meeting_id,))

    risks = cursor.fetchall()


    # --------------------------------------------------------
    # 7. SPEAKER PARTICIPATION
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            speaker,
            ROUND(
                SUM(end_time - start_time)::numeric,
                2
            ) AS speaking_time,
            COUNT(*) AS segment_count
        FROM meeting_speaker_segments
        WHERE meeting_id = %s
        GROUP BY speaker
        ORDER BY speaking_time DESC;
    """, (meeting_id,))

    speaker_rows = cursor.fetchall()

    total_speaking_time = sum(
        float(row[1])
        for row in speaker_rows
    )

    speakers = []

    for row in speaker_rows:

        speaking_time = float(row[1])

        percentage = (
            (speaking_time / total_speaking_time) * 100
            if total_speaking_time > 0
            else 0
        )

        speakers.append({
            "speaker": row[0],
            "speaking_time": round(
                speaking_time,
                2
            ),
            "percentage": round(
                percentage,
                1
            ),
            "segment_count": row[2]
        })


    # --------------------------------------------------------
    # 7. AI PROCESSING LOG
    # --------------------------------------------------------

    cursor.execute("""
        SELECT
            job_id,
            meeting_id,
            current_stage,
            status,
            started_at,
            completed_at,
            processing_time,
            error_message
        FROM ai_processing_logs
        WHERE meeting_id = %s
        ORDER BY job_id DESC
        LIMIT 1;
    """, (meeting_id,))

    processing = cursor.fetchone()

    cursor.close()
    connection.close()

    # --------------------------------------------------------
    # BUILD RESPONSE
    # --------------------------------------------------------

    return {
        "meeting": {
            "meeting_id": meeting[0],
            "uploaded_by": meeting[1],
            "title": meeting[2],
            "description": meeting[3],
            "meeting_date": meeting[4],
            "meeting_time": meeting[5],
            "duration": meeting[6],
            "file_name": meeting[7],
            "file_format": meeting[8],
            "file_size": meeting[9],
            "meeting_status": meeting[10],
            "created_at": meeting[11],
            "updated_at": meeting[12]
        },

        "transcript": None if transcript is None else {
            "transcript_id": transcript[0],
            "meeting_id": transcript[1],
            "transcript_text": transcript[2],
            "language": transcript[3],
            "processing_time": transcript[4],
            "transcript_version": transcript[5]
        },

        "insights": None if insight is None else {
            "insight_id": insight[0],
            "meeting_id": insight[1],
            "summary": insight[2],
            "keywords": insight[3],
            "sentiment": insight[4],
            "meeting_category": insight[5],
            "overall_priority": insight[6],
            "confidence_score": insight[7],
            "generated_at": insight[8]
        },

        "tasks": [
            {
                "task_id": row[0],
                "meeting_id": row[1],
                "assigned_to": row[2],
                "task_title": row[3],
                "task_description": row[4],
                "priority_level": row[5],
                "deadline": row[6],
                "status": row[7],
                "completion_date": row[8],
                "created_at": row[9]
            }
            for row in tasks
        ],

        "decisions": [
            {
                "decision_id": row[0],
                "meeting_id": row[1],
                "decision_text": row[2],
                "decision_category": row[3],
                "importance_level": row[4],
                "created_at": row[5]
            }
            for row in decisions
        ],

        "risks": [
            {
                "risk_id": row[0],
                "meeting_id": row[1],
                "risk_description": row[2],
                "risk_level": row[3],
                "mitigation_plan": row[4],
                "status": row[5],
                "created_at": row[6]
            }
            for row in risks
        ],

        "processing": None if processing is None else {
            "job_id": processing[0],
            "meeting_id": processing[1],
            "current_stage": processing[2],
            "status": processing[3],
            "started_at": processing[4],
            "completed_at": processing[5],
            "processing_time": processing[6],
            "error_message": processing[7]
        }
    }


@app.post("/reports/{meeting_id}/generate")
def generate_report(meeting_id: int):

    try:

        report = generate_meeting_report(meeting_id)

        return {
            "message": "Meeting report generated successfully",
            "report": report
        }

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )


@app.get("/reports/download/{report_id}")
def download_report(report_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            report_name,
            report_format,
            file_path
        FROM reports
        WHERE report_id = %s;
    """, (report_id,))

    report = cursor.fetchone()

    cursor.close()
    connection.close()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report_name = report[0]
    report_format = report[1]
    file_path = report[2]

    if not file_path:
        raise HTTPException(
            status_code=404,
            detail="Report file path not found"
        )

    import os

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Report file does not exist"
        )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"{report_name}.pdf"
    )