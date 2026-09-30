import os
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification, 
    Trainer, 
    TrainingArguments
)
from training.action_items import config
from training.action_items.dataset import ActionItemNERDataset

def train_action_items_model():
    """
    Fine-tuning pipeline for BERT/RoBERTa Token Classification on Meeting Action Items.
    Labels: O, B-ACTION, I-ACTION, B-ASSIGNEE, I-ASSIGNEE, B-DEADLINE, I-DEADLINE.
    """
    print("=" * 60)
    print("AI Meeting Summarizer - BERT Action Item Fine-Tuning Pipeline")
    print(f"Base Model: {config.MODEL_NAME}")
    print(f"Output Path: {config.OUTPUT_DIR}")
    print("=" * 60)

    if not os.path.exists(config.DATASET_PATH):
        print(f"Error: Training dataset not found at '{config.DATASET_PATH}'.")
        print("To run fine-tuning, provide a token-classification JSON file.")
        print("Format template:")
        print('[{"tokens": ["Akhilash", "will", "complete", "frontend", "by", "Friday"], "ner_tags": [3, 0, 1, 1, 0, 5]}]')
        return False

    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
    model = AutoModelForTokenClassification.from_pretrained(
        config.MODEL_NAME,
        num_labels=len(config.LABEL_LIST),
        id2label=config.ID2LABEL,
        label2id=config.LABEL2ID,
        ignore_mismatched_sizes=True
    )

    full_dataset = ActionItemNERDataset(config.DATASET_PATH, tokenizer)
    if len(full_dataset) == 0:
        print("Dataset is empty. Exiting fine-tuning.")
        return False

    training_args = TrainingArguments(
        output_dir=config.OUTPUT_DIR,
        num_train_epochs=config.NUM_EPOCHS,
        per_device_train_batch_size=config.BATCH_SIZE,
        per_device_eval_batch_size=config.BATCH_SIZE,
        learning_rate=config.LEARNING_RATE,
        save_steps=config.SAVE_STEPS,
        logging_dir=os.path.join(config.OUTPUT_DIR, "logs"),
        logging_steps=10,
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=full_dataset,
        tokenizer=tokenizer
    )

    print("Starting BERT token classification fine-tuning...")
    trainer.train()

    print(f"Saving fine-tuned action item model to {config.OUTPUT_DIR}...")
    model.save_pretrained(config.OUTPUT_DIR)
    tokenizer.save_pretrained(config.OUTPUT_DIR)
    print("Fine-tuning completed successfully!")
    return True

if __name__ == "__main__":
    train_action_items_model()
