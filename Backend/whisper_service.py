import os
import sys
import json
import whisper


# ============================================================
# INSIGHTFLOW AI - WHISPER TRANSCRIPTION SERVICE
# ============================================================

def transcribe_audio(
    audio_file: str,
    model_name: str = "base"
):

    # --------------------------------------------------------
    # 1. Check audio file
    # --------------------------------------------------------

    if not os.path.exists(audio_file):
        raise FileNotFoundError(
            f"Audio file not found: {audio_file}"
        )

    # --------------------------------------------------------
    # 2. Load Whisper model
    # --------------------------------------------------------

    model = whisper.load_model(model_name)

    # --------------------------------------------------------
    # 3. Transcribe
    # --------------------------------------------------------

    result = model.transcribe(
        audio_file,
        fp16=False
    )

    # --------------------------------------------------------
    # 4. Extract timestamped segments
    # --------------------------------------------------------

    segments = []

    for segment in result.get("segments", []):

        text = segment.get("text", "").strip()

        if not text:
            continue

        segments.append({
            "start": round(segment["start"], 2),
            "end": round(segment["end"], 2),
            "text": text
        })

    # --------------------------------------------------------
    # 5. Complete transcript
    # --------------------------------------------------------

    transcript = result.get("text", "").strip()

    return {
        "transcript": transcript,
        "segments": segments,
        "language": result.get("language", "unknown")
    }


# ============================================================
# STANDALONE EXECUTION
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print(
            "ERROR: No audio file supplied.",
            file=sys.stderr
        )

        sys.exit(1)

    audio_file = sys.argv[1]

    try:

        result = transcribe_audio(audio_file)

        # IMPORTANT:
        # Print ONLY JSON.
        # FastAPI captures stdout.

        print(
            json.dumps(
                result,
                ensure_ascii=False
            )
        )

    except Exception as e:

        print(
            f"ERROR DURING TRANSCRIPTION: {e}",
            file=sys.stderr
        )

        sys.exit(1)