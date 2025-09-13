# python_service/analyse.py
import sys
import traceback
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Load CodeT5-small once
tokenizer = AutoTokenizer.from_pretrained("Salesforce/codet5-small")
model = AutoModelForSeq2SeqLM.from_pretrained("Salesforce/codet5-small")

def ai_suggestion(code, language):
    prompt = f"Fix the {language} code and give suggestion:\n{code}"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    outputs = model.generate(**inputs, max_length=150)
    suggestion = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return suggestion

def analyze_python_code(code: str):
    try:
        compiled = compile(code, "<string>", "exec")
    except SyntaxError as se:
        return f"Error detected: {se}\nAI Suggestion: {ai_suggestion(code, 'Python')}"
    except Exception as e:
        return f"Error detected: {e}\nAI Suggestion: {ai_suggestion(code, 'Python')}"

    try:
        local_vars = {}
        exec(compiled, {}, local_vars)
        return "No syntax/runtime errors detected!"
    except Exception as e:
        tb = traceback.format_exc()
        return f"Error detected: {str(e)}\nAI Suggestion: {ai_suggestion(code, 'Python')}"

if __name__ == "__main__":
    input_code = sys.stdin.read()
    result = analyze_python_code(input_code)
    print(result)
