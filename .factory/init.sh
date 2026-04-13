#!/bin/bash
# Content validation environment setup

cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm ci --legacy-peer-deps
fi

# Verify content files exist
echo "Checking content files..."
for file in data/processed/lectures.json data/processed/examples.json data/processed/question-bank.json; do
    if [ ! -f "$file" ]; then
        echo "ERROR: Missing $file"
        exit 1
    fi
done

echo "Environment ready for content generation."
