"""Quick inspection of extracted PDF text files."""
import os

base = "C:/OsaZain_stuff/edu/ACS2906/acs2906-assembly-learning/data/raw"
for i in range(1, 11):
    path = f"{base}/lecture{i}_full.txt"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    lines = text.split("\n")
    # Find the first non-empty content line
    first_lines = [l for l in lines if l.strip() and not l.strip().isdigit()][:10]
    print(f"L{i} ({len(text)} chars):")
    for fl in first_lines[:5]:
        print(f"  {fl}")
    print()
