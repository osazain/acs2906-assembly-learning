"""Extract text from all lecture PDFs and save as clean text files."""
import pdfplumber
import os
import re

base_dir = "C:/OsaZain_stuff/edu/ACS2906/Lectures"
out_dir = "C:/OsaZain_stuff/edu/ACS2906/acs2906-assembly-learning/data/raw"

# Clean text for cp1252 compatibility (Windows console encoding)
def clean_text(text):
    if not text:
        return ""
    # Remove control characters except newlines/tabs
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Replace common problematic Unicode chars
    replacements = {
        '\u274f': '[x]',       # ballot x
        '\u25fb': '[ ]',       # white square
        '\u2022': '*',         # bullet
        '\u2013': '-',         # en dash
        '\u2014': '--',        # em dash
        '\u2019': "'",         # apostrophe
        '\u2018': "'",         # single quote
        '\u201c': '"',         # left double quote
        '\u201d': '"',         # right double quote
        '\u2026': '...',       # ellipsis
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

for i in range(1, 11):
    pdf_path = f"{base_dir}/Lecture {i}.pdf"
    out_path = f"{out_dir}/lecture{i}_full.txt"
    
    print(f"Processing Lecture {i}...")
    all_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                all_pages.append(clean_text(t))
    
    full_text = "\n\n".join(all_pages)
    
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    
    print(f"  -> {len(full_text)} chars, {len(all_pages)} pages -> {out_path}")

print("Done!")
