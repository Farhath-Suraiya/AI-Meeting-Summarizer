import json
import os
from typing import List, Dict, Tuple
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer
from training.summarization import config

class MeetingSummarizationDataset(Dataset):
    """
    PyTorch Dataset for fine-tuning BART/T5 Seq2Seq Summarization models on meeting transcripts.
    Dataset JSON format:
    [
        {
            "transcript": "Meeting text here...",
            "summary": "Target summary text here..."
        }
    ]
    """
    def __init__(self, data_path: str, tokenizer: AutoTokenizer, max_input_length: int = 1024, max_target_length: int = 250):
        self.tokenizer = tokenizer
        self.max_input_length = max_input_length
        self.max_target_length = max_target_length
        self.examples = []

        if os.path.exists(data_path):
            with open(data_path, "r", encoding="utf-8") as f:
                self.examples = json.load(f)
        else:
            print(f"Warning: Dataset file not found at {data_path}. Creating mock dataset template.")

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = self.examples[idx]
        transcript = item.get("transcript", "")
        summary = item.get("summary", "")

        model_inputs = self.tokenizer(
            transcript,
            max_length=self.max_input_length,
            truncation=True,
            padding="max_length",
            return_tensors="pt"
        )

        with self.tokenizer.as_target_tokenizer():
            labels = self.tokenizer(
                summary,
                max_length=self.max_target_length,
                truncation=True,
                padding="max_length",
                return_tensors="pt"
            )

        labels_ids = labels["input_ids"].squeeze(0)
        labels_ids[labels_ids == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": model_inputs["input_ids"].squeeze(0),
            "attention_mask": model_inputs["attention_mask"].squeeze(0),
            "labels": labels_ids
        }
