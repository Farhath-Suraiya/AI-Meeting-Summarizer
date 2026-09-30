import os
import logging
from typing import Optional
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class WhisperService:
    _instance: Optional['WhisperService'] = None
    _model: Optional[WhisperModel] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_size: str = "tiny", device: str = "cpu", compute_type: str = "int8"):
        if WhisperService._model is None:
            self.model_size = os.getenv("WHISPER_MODEL_SIZE", model_size)
            self.device = os.getenv("WHISPER_DEVICE", device)
            self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", compute_type)
            
            logger.info(f"Loading faster-whisper model '{self.model_size}' on {self.device} ({self.compute_type})...")
            try:
                WhisperService._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type
                )
                logger.info(f"faster-whisper model '{self.model_size}' loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to load with compute_type '{self.compute_type}', falling back to 'float32': {e}")
                WhisperService._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type="float32"
                )
                logger.info(f"faster-whisper model '{self.model_size}' loaded successfully with float32 fallback.")

    def transcribe(self, audio_path: str) -> str:
        """
        Transcribe an audio file using faster-whisper.
        :param audio_path: Path to local audio file (.mp3, .wav, .m4a, etc.)
        :return: Full transcript text string
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if WhisperService._model is None:
            raise RuntimeError("Whisper model is not initialized.")

        try:
            logger.info(f"Starting transcription for {audio_path}...")
            segments, info = WhisperService._model.transcribe(audio_path, beam_size=5)
            
            transcript_parts = []
            for segment in segments:
                transcript_parts.append(segment.text.strip())

            full_transcript = " ".join(transcript_parts).strip()
            logger.info(f"Transcription finished successfully. Length: {len(full_transcript)} chars.")
            return full_transcript
        except Exception as e:
            logger.error(f"Error during transcription of {audio_path}: {str(e)}")
            raise RuntimeError(f"Transcription failed: {str(e)}")

def get_whisper_service() -> WhisperService:
    return WhisperService()
