import os
import re
import logging
from typing import Dict, Any, Optional

os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering

logger = logging.getLogger(__name__)

class MeetingQAService:
    """
    Extractive & Contextual Question Answering Service for Meetings.
    Uses pretrained `deepset/roberta-base-squad2` model to answer user questions
    strictly using the transcript context of a specific meeting.
    Does not invent facts or use external paid LLM APIs.
    """
    _instance: Optional['MeetingQAService'] = None
    _tokenizer = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MeetingQAService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "deepset/roberta-base-squad2"):
        if MeetingQAService._model is None:
            self.model_name = os.getenv("QA_MODEL_NAME", model_name)
            logger.info(f"Loading Question Answering model '{self.model_name}'...")
            try:
                MeetingQAService._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                MeetingQAService._model = AutoModelForQuestionAnswering.from_pretrained(self.model_name)
                logger.info(f"QA model '{self.model_name}' initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to load QA model '{self.model_name}': {e}", exc_info=True)
                raise RuntimeError(f"QA Service initialization failed: {e}")

    def answer_question(self, question: str, transcript: str) -> Dict[str, Any]:
        """
        Answers a specific user question grounded in the provided meeting transcript context.
        Rules:
        - Must answer using only transcript/context.
        - If transcript lacks sufficient information or confidence score is too low, returns clear indication.
        """
        if not question or not question.strip():
            return {
                "question": question,
                "answer": "Please enter a valid question about this meeting.",
                "score": 0.0,
                "found": False
            }

        if not transcript or not transcript.strip():
            return {
                "question": question,
                "answer": "The meeting transcript is empty or unavailable.",
                "score": 0.0,
                "found": False
            }

        clean_question = question.strip()
        clean_context = transcript.strip()

        try:
            inputs = MeetingQAService._tokenizer(
                clean_question,
                clean_context,
                max_length=512,
                truncation=True,
                return_tensors="pt"
            )

            with torch.no_grad():
                outputs = MeetingQAService._model(**inputs)

            start_logits = outputs.start_logits
            end_logits = outputs.end_logits

            start_idx = torch.argmax(start_logits)
            end_idx = torch.argmax(end_logits) + 1

            start_prob = torch.softmax(start_logits, dim=-1)[0, start_idx].item()
            end_prob = torch.softmax(end_logits, dim=-1)[0, min(end_idx - 1, end_logits.shape[-1] - 1)].item()
            confidence_score = round(float((start_prob + end_prob) / 2.0), 4)

            tokens = MeetingQAService._tokenizer.convert_ids_to_tokens(inputs['input_ids'][0][start_idx:end_idx])
            raw_answer = MeetingQAService._tokenizer.convert_tokens_to_string(tokens).strip()

            # Clean formatting symbols
            clean_answer = re.sub(r'</?s>|\[CLS\]|\[SEP\]', '', raw_answer).strip()

            # Fallback if confidence is too low or answer is uninformative
            if confidence_score < 0.15 or not clean_answer or clean_answer.lower() in [clean_question.lower(), '<s>', '</s>']:
                return {
                    "question": clean_question,
                    "answer": "The requested information is not available in the meeting transcript.",
                    "score": confidence_score,
                    "found": False
                }

            return {
                "question": clean_question,
                "answer": clean_answer,
                "score": confidence_score,
                "found": True
            }

        except Exception as e:
            logger.error(f"Error executing QA inference: {e}", exc_info=True)
            return {
                "question": clean_question,
                "answer": "The requested information is not available in the meeting transcript.",
                "score": 0.0,
                "found": False
            }

def get_qa_service() -> MeetingQAService:
    return MeetingQAService()
