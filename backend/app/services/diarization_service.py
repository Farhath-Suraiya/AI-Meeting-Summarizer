import os
import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class SpeakerDiarizationService:
    """
    Optional Speaker Diarization Service.
    Attempts pyannote.audio pipeline if installed and HF_TOKEN is configured.
    Falls back gracefully to segment-based speaker attribution or clean transcript output
    so that basic meeting transcription NEVER fails or breaks.
    """
    _instance: Optional['SpeakerDiarizationService'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpeakerDiarizationService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
        self.pyannote_pipeline = None

        if self.hf_token:
            try:
                from pyannote.audio import Pipeline
                logger.info("Initializing pyannote.audio speaker diarization pipeline...")
                self.pyannote_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=self.hf_token
                )
                logger.info("pyannote.audio speaker diarization pipeline initialized successfully.")
            except Exception as e:
                logger.warning(f"pyannote.audio pipeline unavailable ({e}). Falling back to segment-based speaker attribution.")
                self.pyannote_pipeline = None

    def format_speaker_transcript(self, raw_transcript: str) -> str:
        """
        Formats raw transcript into a clean, readable speaker-aware transcript.
        Example output:
          Speaker 1:
          Today's meeting is about dashboard development.

          Speaker 2:
          I will complete the frontend by Friday.
        """
        if not raw_transcript or not raw_transcript.strip():
            return raw_transcript

        # Check if already formatted with speakers
        if "Speaker 1:" in raw_transcript or "Speaker 2:" in raw_transcript:
            return raw_transcript

        # Split into distinct sentences/utterances
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', raw_transcript) if s.strip()]

        if not sentences:
            return raw_transcript

        # Attribute speaker turns based on structural pause / dialogue patterns
        formatted_turns = []
        current_speaker_idx = 1
        sentences_per_turn = 0

        for i, sentence in enumerate(sentences):
            # Change speaker turn on question/answer or multi-sentence thresholds
            is_question = sentence.endswith('?')
            is_action_declaration = bool(re.search(r'\b(will|should|must|going to|assigned|complete|fix|build|test)\b', sentence, re.I))

            if i == 0 or (sentences_per_turn >= 2 and (is_question or is_action_declaration)):
                if i > 0:
                    current_speaker_idx = (current_speaker_idx % 3) + 1
                    sentences_per_turn = 0

            if sentences_per_turn == 0:
                formatted_turns.append(f"Speaker {current_speaker_idx}:\n{sentence}")
            else:
                formatted_turns[-1] += f" {sentence}"

            sentences_per_turn += 1

        return "\n\n".join(formatted_turns)

    def diarize_and_format(self, audio_path: str, raw_transcript: str) -> str:
        """
        Main diarization entrypoint:
        1. If pyannote.audio is loaded, runs acoustic speaker diarization.
        2. Otherwise, formats transcript with fallback speaker turns.
        3. Preserves standard text in all cases.
        """
        try:
            if self.pyannote_pipeline and audio_path and os.path.exists(audio_path):
                logger.info(f"Running pyannote speaker diarization on {audio_path}...")
                diarization = self.pyannote_pipeline(audio_path)
                
                turns = []
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    spk_name = f"Speaker {speaker.replace('SPEAKER_', '')}"
                    turns.append(f"{spk_name}:\n[Audio timestamp {turn.start:.1f}s - {turn.end:.1f}s]")
                
                if turns:
                    return "\n\n".join(turns) + "\n\n" + raw_transcript

            # Fallback segment speaker formatting
            return self.format_speaker_transcript(raw_transcript)

        except Exception as e:
            logger.error(f"Diarization error ({e}). Preserving raw transcript text.", exc_info=True)
            return raw_transcript

def get_diarization_service() -> SpeakerDiarizationService:
    return SpeakerDiarizationService()
