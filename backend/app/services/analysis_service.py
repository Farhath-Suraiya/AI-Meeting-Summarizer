import re
import logging
from typing import Dict, Any, List, Optional
from app.services.whisper_service import get_whisper_service
from app.services.summarizer import get_summarizer_service
from app.services.action_extractor import get_action_extractor_service
from app.services.diarization_service import get_diarization_service

logger = logging.getLogger(__name__)

class MeetingAnalysisService:
    """
    Automated Meeting Analysis Service.
    Coordinates Whisper, Speaker Diarization, DistilBART, and BERT Action Extractor models
    alongside factual extraction rules for decisions, deadlines, risks, and follow-up topics.
    Ensures model singletons are reused efficiently without duplicate model reloading.
    """
    _instance: Optional['MeetingAnalysisService'] = None

    DECISION_REGEX = re.compile(
        r'\b(decided|agreed|concluded|approved|resolved|confirmed|consensus|decided to|agreed to|agreed on)\b',
        re.IGNORECASE
    )

    RISK_REGEX = re.compile(
        r'\b(risk|issue|problem|blocker|concern|delay|challenge|bottleneck|vulnerability|warning|threat|danger)\b',
        re.IGNORECASE
    )

    FOLLOW_UP_REGEX = re.compile(
        r'\b(follow up|follow-up|next meeting|discuss later|table this|circle back|further discussion|revisit|next time|agenda for next)\b',
        re.IGNORECASE
    )

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MeetingAnalysisService, cls).__new__(cls)
        return cls._instance

    def _split_sentences(self, text: str) -> List[str]:
        if not text:
            return []
        sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
        return [s.strip() for s in sentences if s.strip()]

    def extract_decisions(self, transcript: str) -> List[str]:
        """Extract explicit decisions from transcript without hallucinating."""
        sentences = self._split_sentences(transcript)
        decisions = []
        for s in sentences:
            if self.DECISION_REGEX.search(s):
                clean_s = re.sub(r'^(?:Speaker\s+\d+|[A-Z][a-z]+):\s*', '', s).strip()
                decisions.append(clean_s)
        return decisions

    def extract_risks(self, transcript: str) -> List[str]:
        """Extract explicit risks/issues from transcript without hallucinating."""
        sentences = self._split_sentences(transcript)
        risks = []
        for s in sentences:
            if self.RISK_REGEX.search(s):
                clean_s = re.sub(r'^(?:Speaker\s+\d+|[A-Z][a-z]+):\s*', '', s).strip()
                risks.append(clean_s)
        return risks

    def extract_follow_ups(self, transcript: str) -> List[str]:
        """Extract explicit follow-up topics from transcript without hallucinating."""
        sentences = self._split_sentences(transcript)
        follow_ups = []
        for s in sentences:
            if self.FOLLOW_UP_REGEX.search(s):
                clean_s = re.sub(r'^(?:Speaker\s+\d+|[A-Z][a-z]+):\s*', '', s).strip()
                follow_ups.append(clean_s)
        return follow_ups

    def analyze_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Runs the full automated meeting analysis workflow on a transcript:
        Transcript -> Summary -> Action Items -> Decisions -> Deadlines -> Risks -> Follow-up Topics
        Returns structured dict matching required format.
        """
        if not transcript or not transcript.strip():
            return {
                "summary": "",
                "action_items": [],
                "decisions": [],
                "deadlines": [],
                "risks": [],
                "follow_up_topics": []
            }

        # 1. Generate Summary (DistilBART)
        summarizer = get_summarizer_service()
        summary = summarizer.summarize(transcript)

        # 2. Extract Action Items (BERT NER)
        extractor = get_action_extractor_service()
        action_items = extractor.extract_action_items(transcript)

        # 3. Extract Decisions
        decisions = self.extract_decisions(transcript)

        # 4. Extract Deadlines from action_items
        deadlines = [
            {
                "task": item["task"],
                "deadline": item["deadline"],
                "person": item.get("person")
            }
            for item in action_items if item.get("deadline")
        ]

        # 5. Extract Risks / Issues
        risks = self.extract_risks(transcript)

        # 6. Extract Follow-up Topics
        follow_up_topics = self.extract_follow_ups(transcript)

        return {
            "summary": summary,
            "action_items": action_items,
            "decisions": decisions,
            "deadlines": deadlines,
            "risks": risks,
            "follow_up_topics": follow_up_topics
        }

    def process_meeting_file(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Transcribes meeting audio using Whisper, optionally applies speaker diarization,
        and performs full analysis pipeline without breaking standard transcription.
        """
        whisper = get_whisper_service()
        raw_transcript = whisper.transcribe(audio_file_path)

        # Optional Speaker Diarization / Attribution
        try:
            diarization_service = get_diarization_service()
            speaker_transcript = diarization_service.diarize_and_format(audio_file_path, raw_transcript)
        except Exception as e:
            logger.warning(f"Speaker diarization skipped ({e}). Preserving raw transcript.")
            speaker_transcript = raw_transcript

        analysis = self.analyze_transcript(speaker_transcript)
        analysis["transcript"] = speaker_transcript
        return analysis

def get_analysis_service() -> MeetingAnalysisService:
    return MeetingAnalysisService()
