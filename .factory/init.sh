#!/bin/bash
# Content extraction environment setup

cd "$(dirname "$0")/.."

# Verify node_modules exist
if [ ! -d "node_modules" ]; then
    npm ci --legacy-peer-deps
fi

# Verify Python and pdfplumber are available
if ! python -c "import pdfplumber" 2>/dev/null; then
    echo "Installing pdfplumber..."
    python -m pip install pdfplumber --quiet
fi

# Verify content files exist
echo "Checking content files..."
for file in data/processed/lectures.json data/processed/examples.json data/processed/question-bank.json; do
    if [ ! -f "$file" ]; then
        echo "WARNING: Missing $file"
    fi
done

# Verify raw text files exist
if [ ! -f "data/raw/lecture1_full.txt" ]; then
    echo "Extracting PDFs to raw text..."
    python extract-pdfs.py
fi

echo "Environment ready for content extraction."
