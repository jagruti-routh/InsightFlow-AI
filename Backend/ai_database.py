import json
from datetime import datetime, timedelta

from database import get_connection


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_meeting_date(meeting_id: int):
    """
    Retrieve the meeting date from the meetings table.
    """

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT meeting_date
        FROM meetings
        WHERE meeting_id = %s;
        """,
        (meeting_id,)
    )

    row = cursor.fetchone()

    cursor.close()
    connection.close()

    if not row:
        raise ValueError(
            f"Meeting {meeting_id} was not found."
        )

    return row[0]


def convert_deadline(deadline: str | None, meeting_date):
    """
    Convert relative weekday deadlines such as
    'Thursday' into an actual date.

    Returns None when the deadline cannot be
    safely resolved.
    """

    if not deadline:
        return None

    deadline = deadline.strip()

    if deadline.lower() == "not specified":
        return None

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6
    }

    deadline_lower = deadline.lower()

    if (
        meeting_date is not None
        and deadline_lower in weekdays
    ):

        current_weekday = meeting_date.weekday()
        target_weekday = weekdays[deadline_lower]

        days_ahead = (
            target_weekday - current_weekday
        ) % 7

        # If the deadline is the same weekday,
        # interpret it as the following occurrence.
        if days_ahead == 0:
            days_ahead = 7

        return meeting_date + timedelta(
            days=days_ahead
        )

    return None


# ============================================================
# GET EXISTING SPEAKER / USER MAPPING
# ============================================================

def get_speaker_user_mapping(meeting_id: int):
    """
    Retrieve speaker-to-user mappings if available.

    For Meeting 73 there are currently no participant
    mappings, so SPEAKER_00 / SPEAKER_01 remain unmapped.
    """

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM meeting_participants
        WHERE meeting_id = %s;
        """,
        (meeting_id,)
    )

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    if not rows:
        return {}

    # No automatic identity inference.
    # Explicit speaker-to-user mapping will be added
    # later when participant identification is implemented.
    return {}


# ============================================================
# GET NEXT AI JOB ID
# ============================================================

def get_next_job_id():
    """
    Generate the next job_id for ai_processing_logs.

    This is used because job_id is NOT NULL in the
    current database schema.
    """

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT COALESCE(MAX(job_id), 0) + 1
        FROM ai_processing_logs;
        """
    )

    job_id = cursor.fetchone()[0]

    cursor.close()
    connection.close()

    return job_id


# ============================================================
# SAVE MEETING INSIGHTS
# ============================================================

def save_meeting_insights(
    meeting_id: int,
    analysis: dict
):

    summary = analysis["summary"]

    executive_summary = summary[
        "executive_summary"
    ]

    key_points = summary[
        "key_points"
    ]

    # Existing DB has a text field called keywords.
    # We preserve the generated key points without
    # inventing additional keywords.
    keywords = "; ".join(key_points)

    sentiment = analysis.get(
        "sentiment"
    )

    meeting_category = analysis.get(
        "meeting_category"
    )

    overall_priority = analysis.get(
        "overall_priority"
    )

    confidence_score = analysis.get(
        "confidence_score"
    )

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO meeting_insights
        (
            meeting_id,
            summary,
            keywords,
            sentiment,
            meeting_category,
            overall_priority,
            confidence_score,
            generated_at
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
            %s
        );
        """,
        (
            meeting_id,
            executive_summary,
            keywords,
            sentiment,
            meeting_category,
            overall_priority,
            confidence_score,
            datetime.now()
        )
    )

    connection.commit()

    cursor.close()
    connection.close()


# ============================================================
# SAVE TASKS
# ============================================================

def save_tasks(
    meeting_id: int,
    analysis: dict
):

    meeting_date = get_meeting_date(
        meeting_id
    )

    speaker_mapping = get_speaker_user_mapping(
        meeting_id
    )

    connection = get_connection()
    cursor = connection.cursor()

    for task in analysis.get(
        "tasks",
        []
    ):

        owner = task.get(
            "owner"
        )

        assigned_to = speaker_mapping.get(
            owner
        )

        deadline = convert_deadline(
            task.get("deadline"),
            meeting_date
        )

        task_description = task.get(
            "description"
        )

        # Preserve speaker information because
        # the current meeting has no participant mapping.
        if owner and assigned_to is None:

            task_description = (
                f"{task_description} "
                f"[Speaker owner: {owner}]"
            )

        cursor.execute(
            """
            INSERT INTO tasks
            (
                meeting_id,
                assigned_to,
                task_title,
                task_description,
                priority_level,
                deadline,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            );
            """,
            (
                meeting_id,
                assigned_to,
                task.get("title"),
                task_description,
                task.get("priority"),
                deadline,
                "Pending"
            )
        )

    connection.commit()

    cursor.close()
    connection.close()


# ============================================================
# SAVE DECISIONS
# ============================================================

def save_decisions(
    meeting_id: int,
    analysis: dict
):

    connection = get_connection()
    cursor = connection.cursor()

    for decision in analysis.get(
        "decisions",
        []
    ):

        decision_text = decision.get(
            "decision"
        )

        made_by = decision.get(
            "made_by"
        )

        if made_by:

            decision_text = (
                f"{decision_text} "
                f"[Made by: {made_by}]"
            )

        cursor.execute(
            """
            INSERT INTO decisions
            (
                meeting_id,
                decision_text,
                decision_category,
                importance_level,
                created_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            );
            """,
            (
                meeting_id,
                decision_text,
                decision.get("category"),
                decision.get("importance"),
                datetime.now()
            )
        )

    connection.commit()

    cursor.close()
    connection.close()


# ============================================================
# SAVE RISKS
# ============================================================

def save_risks(
    meeting_id: int,
    analysis: dict
):

    connection = get_connection()
    cursor = connection.cursor()

    for risk in analysis.get(
        "risks",
        []
    ):

        cursor.execute(
            """
            INSERT INTO risks
            (
                meeting_id,
                risk_description,
                risk_level,
                mitigation_plan,
                status,
                created_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            );
            """,
            (
                meeting_id,
                risk.get("risk"),
                risk.get("severity"),
                risk.get("mitigation_plan"),
                risk.get("status"),
                datetime.now()
            )
        )

    connection.commit()

    cursor.close()
    connection.close()


# ============================================================
# SAVE AI PROCESSING LOG
# ============================================================

def save_ai_processing_log(
    meeting_id: int,
    processing_time: float,
    status: str = "Completed",
    error_message: str | None = None
):

    connection = get_connection()
    cursor = connection.cursor()

    job_id = get_next_job_id()

    completed_at = datetime.now()

    started_at = (
        completed_at
        - timedelta(
            seconds=processing_time
        )
    )

    cursor.execute(
        """
        INSERT INTO ai_processing_logs
        (
            job_id,
            meeting_id,
            current_stage,
            status,
            started_at,
            completed_at,
            processing_time,
            error_message
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
            %s
        );
        """,
        (
            job_id,
            meeting_id,
            "AI Analysis",
            status,
            started_at,
            completed_at,
            processing_time,
            error_message
        )
    )

    connection.commit()

    cursor.close()
    connection.close()


# ============================================================
# SAVE COMPLETE AI ANALYSIS
# ============================================================

def save_complete_ai_analysis(
    meeting_id: int,
    analysis: dict,
    processing_time: float
):

    try:

        save_meeting_insights(
            meeting_id,
            analysis
        )

        save_tasks(
            meeting_id,
            analysis
        )

        save_decisions(
            meeting_id,
            analysis
        )

        save_risks(
            meeting_id,
            analysis
        )

        save_ai_processing_log(
            meeting_id,
            processing_time,
            "Completed"
        )

        return {
            "status": "success",
            "meeting_id": meeting_id
        }

    except Exception as e:

        try:

            save_ai_processing_log(
                meeting_id,
                processing_time,
                "Failed",
                str(e)
            )

        except Exception:
            pass

        raise


# ============================================================
# TEST WITH MEETING 73
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print(
        "INSIGHTFLOW AI - DATABASE PERSISTENCE TEST"
    )
    print("=" * 70)

    analysis_path = (
        "Backend/meeting_73_ai_analysis.json"
    )

    with open(
        analysis_path,
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    meeting_id = data["meeting_id"]

    analysis = data["analysis"]

    processing_time = data[
        "processing_time"
    ]

    print(
        f"\nMeeting ID: {meeting_id}"
    )

    print(
        f"AI processing time: "
        f"{processing_time:.2f} seconds"
    )

    print(
        "\nSaving AI analysis to PostgreSQL..."
    )

    result = save_complete_ai_analysis(
        meeting_id,
        analysis,
        processing_time
    )

    print(
        "\n✅ DATABASE PERSISTENCE SUCCESSFUL!"
    )

    print(
        json.dumps(
            result,
            indent=2
        )
    )

    print("=" * 70)