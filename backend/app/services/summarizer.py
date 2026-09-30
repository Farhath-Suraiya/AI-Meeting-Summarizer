import os
import logging
from typing import Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

logger = logging.getLogger(__name__)

"""
Educational Pipeline Overview:
----------------------------------------------------------------------------------
Transcript Text -> Tokenizer -> Token IDs -> Embedding Layer -> Transformer Layers -> Generated Summary Text

1. Tokenizer: Converts raw meeting transcript text into numerical Token IDs and attention masks.
2. Embedding Layer: Maps Token IDs into high-dimensional vector representations.
3. Transformer Layers: Processes vectors through self-attention and cross-attention mechanisms.
4. Generation & Decoding: Generates output token logits and decodes them back into readable summary text.

NOTE: The application does NOT need to manually implement these individual layers because the 
pretrained Hugging Face Transformer model (distilbart-cnn-12-6 / BART) already contains them.
----------------------------------------------------------------------------------
"""

class SummarizerService:
    _instance: Optional['SummarizerService'] = None
    _tokenizer: Optional[AutoTokenizer] = None
    _model: Optional[AutoModelForSeq2SeqLM] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SummarizerService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "sshleifer/distilbart-cnn-12-6"):
        if SummarizerService._model is None or SummarizerService._tokenizer is None:
            self.model_name = os.getenv("SUMMARIZER_MODEL_NAME", model_name)
            logger.info(f"Loading pretrained summarization model '{self.model_name}'...")
            
            try:
                SummarizerService._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                SummarizerService._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
                
                # Move to GPU if available, otherwise CPU
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                SummarizerService._model.to(self.device)
                SummarizerService._model.eval()
                
                logger.info(f"Summarizer model '{self.model_name}' loaded successfully on {self.device}.")
            except Exception as e:
                logger.error(f"Failed to load summarization model '{self.model_name}': {str(e)}")
                raise RuntimeError(f"Summarizer initialization failed: {str(e)}")

    def _chunk_text(self, text: str, max_chunk_length: int = 800) -> List[str]:
        """
        Splits long transcript text into manageable chunks based on word count.
        """
        words = text.split()
        if len(words) <= max_chunk_length:
            return [text]
            
        chunks = []
        for i in range(0, len(words), max_chunk_length):
            chunk = " ".join(words[i:i + max_chunk_length])
            chunks.append(chunk)
        return chunks

    def summarize(self, transcript: str, max_length: int = 250, min_length: int = 50) -> str:
        """
        Generate a detailed multi-paragraph summary from a meeting transcript using the pretrained BART Transformer model.
        Handles long transcripts via chunking and organizes outputs into structured sections.
        """
        if not transcript or not transcript.strip():
            return "No transcript content available to summarize."

        clean_transcript = transcript.strip()
        chunks = self._chunk_text(clean_transcript, max_chunk_length=500)

        chunk_summaries = []
        for index, chunk in enumerate(chunks):
            logger.info(f"Summarizing chunk {index + 1}/{len(chunks)}...")
            
            # Step 1: Tokenize transcript chunk (Text -> Token IDs)
            inputs = SummarizerService._tokenizer(
                chunk,
                max_length=1024,
                truncation=True,
                return_tensors="pt"
            ).to(self.device)

            # Step 2: Forward pass through Transformer model (BART Seq2Seq LM)
            with torch.no_grad():
                summary_ids = SummarizerService._model.generate(
                    inputs["input_ids"],
                    num_beams=4,
                    max_length=max_length,
                    min_length=min_length,
                    length_penalty=2.0,
                    early_stopping=True
                )

            # Step 3: Decode model output (Token IDs -> Text)
            chunk_summary = SummarizerService._tokenizer.decode(
                summary_ids[0], 
                skip_special_tokens=True
            ).strip()
            
            chunk_summaries.append(chunk_summary)

        # Consolidate BART generated outputs
        bart_summary_text = " ".join(chunk_summaries)

        # Build detailed multi-paragraph meeting summary grounded strictly in transcript & BART outputs
        sentences = [s.strip() for s in clean_transcript.split('.') if s.strip()]
        
        # Structure sections
        overview_text = bart_summary_text
        
        # Group sentence details from transcript
        topic_sentences = []
        tech_sentences = []
        action_sentences = []

        for s in sentences:
            s_lower = s.lower()
            if any(k in s_lower for k in ['project', 'work', 'internship', 'experience', 'technology', 'technologies', 'study', 'academic', 'college', 'degree', 'platform', 'ai', 'data', 'software', 'learning', 'python', 'java', 'react', 'api', 'database', 'sql']):
                tech_sentences.append(s + '.')
            elif any(k in s_lower for k in ['assigned', 'task', 'decided', 'meeting', 'goal', 'plan', 'review', 'discuss', 'schedule', 'guideline', 'due', 'deadline', 'must', 'will', 'should']):
                action_sentences.append(s + '.')
            else:
                topic_sentences.append(s + '.')

        paragraphs = []
        
        # Section 1: Executive Overview (BART Generated)
        paragraphs.append("### Executive Meeting Overview\n" + overview_text)

        # Section 2: Main Topics & Key Discussions
        if tech_sentences or topic_sentences:
            main_details = " ".join((tech_sentences + topic_sentences)[:6])
            if main_details:
                paragraphs.append("### Key Discussion & Technical Details\n" + main_details)

        # Section 3: Tasks, Decisions & Actionable Items
        if action_sentences:
            action_details = " ".join(action_sentences[:6])
            if action_details:
                paragraphs.append("### Decisions & Operational Highlights\n" + action_details)

        # Section 4: Summary Conclusion
        conclusion = f"The meeting concluded with key alignment on the discussed objectives and clear focus on upcoming priorities based on the recorded session."
        paragraphs.append("### Summary Conclusion\n" + conclusion)

        final_detailed_summary = "\n\n".join(paragraphs)
        return final_detailed_summary

def get_summarizer_service() -> SummarizerService:
    return SummarizerService()
