import json
import os
from typing import List, Dict
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer
from training.action_items import config

class ActionItemNERDataset(Dataset):
    """
    PyTorch Dataset for fine-tuning BERT/RoBERTa on Action Item Token Classification (NER).
    Dataset JSON format:
    [
        {
            "tokens": ["Akhilash", "will", "complete", "frontend", "by", "Friday"],
            "ner_tags": [3, 0, 1, 1, 0, 5]
        }
    ]
    Labels: O (0), B-ACTION (1), I-ACTION (2), B-ASSIGNEE (3), I-ASSIGNEE (4), B-DEADLINE (5), I-DEADLINE (6)
    """
    def __init__(self, data_path: str, tokenizer: AutoTokenizer, max_length: int = 128):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples = []

        if os.path.exists(data_path):
            with open(data_path, "r", encoding="utf-8") as f:
                self.examples = json.load(f)

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = self.examples[idx]
        tokens = item.get("tokens", [])
        tags = item.get("ner_tags", [])

        encoding = self.tokenizer(
            tokens,
            is_split_into_words=True,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        labels = []
        word_ids = encoding.word_ids(batch_index=0)
        previous_word_idx = None

        for word_idx in word_ids:
            if word_idx is None:
                labels.append(-100)
            elif word_idx != previous_word_idx:
                labels.append(tags[word_idx] if word_idx < len(tags) else 0)
            else:
                labels.append(-100)
            previous_word_idx = word_idx

        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels": torch.tensor(labels, dtype=torch.long)
        }
