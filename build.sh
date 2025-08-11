#!/usr/bin/env bash
# exit on error
set -o errexit

apt-get update && apt-get install -y libpango-1.0-0 libpangoft2-1.0-0

pip install -r requirements.txt