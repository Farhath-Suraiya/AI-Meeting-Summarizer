import os
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM, 
    Trainer, 
    TrainingArguments
)
from training.summarization import config
from training.summarization.dataset import MeetingSummarizationDataset

def train_summarization_model():
    """
    Fine-tuning pipeline for BART/T5 Seq2Seq Summarization on Meeting Transcripts.
    Loads dataset, splits train/validation, initializes pretrained model, and executes PyTorch trainer.
    """
    print("=" * 60)
    print("AI Meeting Summarizer - Seq2Seq Fine-Tuning Pipeline")
    print(f"Base Model: {config.MODEL_NAME}")
    print(f"Output Path: {config.OUTPUT_DIR}")
    print("=" * 60)

    if not os.path.exists(config.DATASET_PATH):
        print(f"Error: Training dataset not found at '{config.DATASET_PATH}'.")
        print("To run fine-tuning, provide a dataset JSON file with 'transcript' and 'summary' fields.")
        print("Format template:")
        print('[{"transcript": "Full transcript text...", "summary": "Expected target summary..."}]')
        return False

    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(config.MODEL_NAME)

    full_dataset = MeetingSummarizationDataset(config.DATASET_PATH, tokenizer)
    if len(full_dataset) == 0:
        print("Dataset is empty. Exiting fine-tuning.")
        return False

    train_size = int(0.85 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])

    training_args = TrainingArguments(
        output_dir=config.OUTPUT_DIR,
        num_train_epochs=config.NUM_EPOCHS,
        per_device_train_batch_size=config.BATCH_SIZE,
        per_device_eval_batch_size=config.BATCH_SIZE,
        warmup_steps=config.WARMUP_STEPS,
        weight_decay=config.WEIGHT_DECAY,
        logging_dir=os.path.join(config.OUTPUT_DIR, "logs"),
        logging_steps=10,
        eval_strategy="steps" if val_size > 0 else "no",
        eval_steps=config.EVAL_STEPS if val_size > 0 else None,
        save_steps=config.SAVE_STEPS,
        save_total_limit=2,
        load_best_model_at_end=True if val_size > 0 else False,
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset if val_size > 0 else None,
        tokenizer=tokenizer
    )

    print("Starting fine-tuning process...")
    trainer.train()

    print(f"Saving final fine-tuned model checkpoint to {config.OUTPUT_DIR}...")
    model.save_pretrained(config.OUTPUT_DIR)
    tokenizer.save_pretrained(config.OUTPUT_DIR)
    print("Fine-tuning completed successfully!")
    return True

if __name__ == "__main__":
    train_summarization_model()
