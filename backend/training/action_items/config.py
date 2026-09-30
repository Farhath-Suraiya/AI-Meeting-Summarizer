import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = os.getenv("ACTION_ITEMS_DATASET_PATH", str(BASE_DIR / "data" / "action_items_ner_dataset.json"))
OUTPUT_DIR = os.getenv("ACTION_ITEMS_OUTPUT_DIR", str(BASE_DIR / "models" / "fine_tuned_bert_action_items"))

MODEL_NAME = "dslim/bert-base-NER"
MAX_LENGTH = 128
BATCH_SIZE = 4
LEARNING_RATE = 3e-5
NUM_EPOCHS = 3
SAVE_STEPS = 200

# Action Item NER Label Map
LABEL_LIST = ["O", "B-ACTION", "I-ACTION", "B-ASSIGNEE", "I-ASSIGNEE", "B-DEADLINE", "I-DEADLINE"]
LABEL2ID = {label: i for i, label in enumerate(LABEL_LIST)}
ID2LABEL = {i: label for i, label in enumerate(LABEL_LIST)}
