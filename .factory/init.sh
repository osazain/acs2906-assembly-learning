#!/bin/bash
# .factory/init.sh
# Environment setup for ACS2906 Assembly Learning Platform

set -e

echo "Setting up Phase 1 environment..."

# Ensure processed data directory exists
mkdir -p data/processed

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Verify TypeScript configuration
echo "Verifying TypeScript setup..."
npx tsc --noEmit --project tsconfig.json || echo "TypeScript check failed"

echo "Environment ready for Phase 1"
