#test_whishper.py


import whisper
import os


# ============================================================
# WHISPER STANDALONE TEST
# ============================================================

# Path to the uploaded meeting audio
AUDIO_FILE = r"Backend\uploads\ttSMP3.com_VoiceText_2026-8-9_13-53-23.mp3"


# Check whether the audio file exists
if not os.path.exists(AUDIO_FILE):
    print("ERROR: Audio file not found!")
    print(f"Expected location: {AUDIO_FILE}")
    exit()


print("Loading Whisper model...")
print("This may take some time during the first run.")


# Load Whisper model
model = whisper.load_model("base")


print("Whisper model loaded successfully!")
print("Starting transcription...")


# Transcribe audio
result = model.transcribe(
    AUDIO_FILE,
    fp16=False
)


# Extract transcript
transcript = result["text"].strip()


print("\n" + "=" * 70)
print("TRANSCRIPTION RESULT")
print("=" * 70)

print(transcript)

print("=" * 70)


# Save transcript to a text file
OUTPUT_FILE = "whisper_transcript.txt"

with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
    file.write(transcript)


print(f"\nTranscript saved to: {OUTPUT_FILE}")