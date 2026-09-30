import os
import re
import logging
from typing import List, Dict, Any, Optional

os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

logger = logging.getLogger(__name__)

"""
Action Item Extractor Service using BERT/RoBERTa
----------------------------------------------------------------------------------
Pipeline:
Meeting Transcript -> Sentence Segmentation -> Action Sentence Detection -> 
BERT/RoBERTa Entity Recognition -> Task & Deadline Extraction -> Structured JSON

Educational Architecture Note:
The service is modularly designed around a PyTorch BERT Token Classification / NER architecture
(`dslim/bert-base-NER` / `roberta-base`). This allows seamless replacement with a 
fine-tuned domain-specific Action Item BERT model in future iterations.
----------------------------------------------------------------------------------
"""

class ActionExtractorService:
    _instance: Optional['ActionExtractorService'] = None
    _tokenizer: Optional[AutoTokenizer] = None
    _model: Optional[AutoModelForTokenClassification] = None
    _ner_pipeline = None

    # Common action indicators in meeting context
    ACTION_VERBS_REGEX = re.compile(
        r'\b(will|shall|should|must|need to|needs to|going to|assigned to|assigned|takes|take|takes care of|'
        r'complete|test|implement|build|fix|prepare|create|deliver|finish|send|write|update|review|deploy|'
        r'design|setup|set up|manage|coordinate|organize)\b', re.IGNORECASE
    )

    # Deadline patterns (days, dates, timeframes)
    DEADLINE_REGEX = re.compile(
        r'\b(by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|eod|end of day|end of week|next week|tonight)|'
        r'due\s+(?:by\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+)|'
        r'before\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|eod)|'
        r'on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b', re.IGNORECASE
    )

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ActionExtractorService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "dslim/bert-base-NER"):
        if ActionExtractorService._ner_pipeline is None:
            self.model_name = os.getenv("ACTION_MODEL_NAME", model_name)
            logger.info(f"Loading BERT NER Action Extractor model '{self.model_name}'...")
            
            try:
                self.device = 0 if torch.cuda.is_available() else -1
                ActionExtractorService._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                ActionExtractorService._model = AutoModelForTokenClassification.from_pretrained(self.model_name)
                
                ActionExtractorService._ner_pipeline = pipeline(
                    "ner",
                    model=ActionExtractorService._model,
                    tokenizer=ActionExtractorService._tokenizer,
                    aggregation_strategy="simple",
                    device=self.device
                )
                logger.info(f"BERT Action Extractor model '{self.model_name}' initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to load BERT model '{self.model_name}': {str(e)}")
                raise RuntimeError(f"Action Extractor initialization failed: {str(e)}")

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split raw transcript into clean sentences."""
        sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
        return [s.strip() for s in sentences if s.strip()]

    def extract_action_items(self, transcript: str) -> List[Dict[str, Optional[str]]]:
        """
        Extract structured action items (person, task, deadline) from transcript.
        Rules: Never invent details; use null (None) if person or deadline is not explicitly mentioned.
        """
        if not transcript or not transcript.strip():
            return []

        sentences = self._split_into_sentences(transcript)
        action_items = []

        for sentence in sentences:
            # Check if sentence contains action indicators
            is_action_candidate = bool(self.ACTION_VERBS_REGEX.search(sentence))
            
            if not is_action_candidate:
                continue

            # Run BERT NER to extract person entities (PER)
            entities = ActionExtractorService._ner_pipeline(sentence)
            per_entities = [e for e in entities if e.get('entity_group') == 'PER']
            
            person_name = None
            if per_entities:
                # Group contiguous person tokens and extract original string span
                min_start = min(e.get('start', 0) for e in per_entities)
                max_end = max(e.get('end', len(sentence)) for e in per_entities)
                extracted_span = sentence[min_start:max_end].strip()
                person_name = " ".join([w.capitalize() for w in extracted_span.split()])
            else:
                # Fallback pattern for subject capitalized name: "Name was assigned...", "Name will..."
                fallback_match = re.match(r'^([A-Z][a-z]+)\s+(?:was|will|is|should|must|needs|has|takes)\b', sentence)
                if fallback_match and fallback_match.group(1).lower() not in {'hello', 'welcome', 'today', 'this', 'there', 'here', 'we', 'they', 'you'}:
                    person_name = fallback_match.group(1).capitalize()

            # Extract explicit deadline if present in sentence
            deadline_match = self.DEADLINE_REGEX.search(sentence)
            deadline = deadline_match.group(0).strip() if deadline_match else None
            
            if deadline:
                clean_deadline = re.sub(r'^(by|due\s+by|due|before|on)\s+', '', deadline, flags=re.IGNORECASE).strip().capitalize()
            else:
                clean_deadline = None

            # Clean task text
            task_text = sentence
            task_text = re.sub(r'^(?:Speaker\s+\d+|[A-Z][a-z]+):\s*', '', task_text).strip()
            task_text = task_text.rstrip('.!?').strip()

            action_items.append({
                "person": person_name if person_name else None,
                "task": task_text,
                "deadline": clean_deadline if clean_deadline else None
            })

        return action_items

def get_action_extractor_service() -> ActionExtractorService:
    return ActionExtractorService()
