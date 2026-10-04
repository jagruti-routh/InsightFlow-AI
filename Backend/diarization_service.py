import sys
import json

from pyannote.audio import Pipeline


# ============================================================
# INSIGHTFLOW AI - SPEAKER DIARIZATION SERVICE
# ============================================================

def diarize_audio(audio_file: str, num_speakers: int):

    if not audio_file:
        raise ValueError("No audio file supplied.")

    if not num_speakers or num_speakers < 1:
        raise ValueError("num_speakers must be at least 1.")

    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-community-1"
    )

    output = pipeline(
        audio_file,
        num_speakers=num_speakers
    )

    segments = []

    for turn, _, speaker in output.exclusive_speaker_diarization.itertracks(
        yield_label=True
    ):
        segments.append({
            "start": round(turn.start, 2),
            "end": round(turn.end, 2),
            "speaker": speaker
        })

    return segments


# ============================================================
# STANDALONE EXECUTION
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) < 3:
        print(
            "ERROR: Audio file and number of speakers are required.",
            file=sys.stderr
        )
        sys.exit(1)

    audio_file = sys.argv[1]

    try:
        num_speakers = int(sys.argv[2])
    except ValueError:
        print(
            "ERROR: num_speakers must be an integer.",
            file=sys.stderr
        )
        sys.exit(1)

    try:

        segments = diarize_audio(
            audio_file,
            num_speakers
        )

        print(
            json.dumps(
                {
                    "segments": segments
                }
            )
        )

    except Exception as e:

        print(
            f"ERROR DURING DIARIZATION: {e}",
            file=sys.stderr
        )

        sys.exit(1)