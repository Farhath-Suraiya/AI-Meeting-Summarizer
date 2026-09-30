import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = os.getenv("SUMMARIZATION_DATASET_PATH", str(BASE_DIR / "data" / "summarization_dataset.json"))
OUTPUT_DIR = os.getenv("SUMMARIZATION_OUTPUT_DIR", str(BASE_DIR / "models" / "fine_tuned_bart_summarizer"))

MODEL_NAME = "sshleifer/distilbart-cnn-12-6"
MAX_INPUT_LENGTH = 1024
MAX_TARGET_LENGTH = 250
BATCH_SIZE = 2
LEARNING_RATE = 5e-5
NUM_EPOCHS = 3
WARMUP_STEPS = 100
WEIGHT_DECAY = 0.01
SAVE_STEPS = 500
EVAL_STEPS = 500
