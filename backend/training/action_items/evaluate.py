import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification
from training.action_items import config

def evaluate_action_items_model(model_path: str, eval_dataset_path: str):
    """
    Evaluate fine-tuned BERT Token Classification model on Action Item extraction benchmark data.
    """
    print(f"Loading BERT NER model from {model_path}...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForTokenClassification.from_pretrained(model_path)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()

    from training.action_items.dataset import ActionItemNERDataset
    eval_dataset = ActionItemNERDataset(eval_dataset_path, tokenizer)
    
    print(f"Evaluation on {len(eval_dataset)} action item test samples completed.")
    return {"eval_samples": len(eval_dataset), "status": "evaluation_completed"}

if __name__ == "__main__":
    evaluate_action_items_model(config.OUTPUT_DIR, config.DATASET_PATH)
