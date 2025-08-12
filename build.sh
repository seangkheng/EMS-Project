#!/usr/bin/env bash
# exit on error
set -o errexit

# Install system dependencies for fonts and PDF generation
apt-get update && apt-get install -y \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libcairo2 \
  libgdk-pixbuf2.0-0 \
  fonts-noto \
  fonts-noto-cjk

# Install python dependencies
pip install -r requirements.txt
