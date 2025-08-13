#!/usr/bin/env bash
# exit on error
set -o errexit

# ជំហានទី ១៖ ដំឡើង Python dependencies
# Render នឹងដំឡើង system packages ពី apt.txt មុន script នេះ
pip install -r requirements.txt

# ជំហានទី ២៖ បង្កើតថត font សម្រាប់អ្នកប្រើ
mkdir -p ~/.fonts/

# ជំហានទី ៣៖ ចម្លង font ខ្មែរ និងជប៉ុនពី project ទៅ ~/.fonts/
echo "Copying custom fonts to user's font directory..."
cp fonts/*.ttf ~/.fonts/

# ជំហានទី ៤៖ ធ្វើបច្ចុប្បន្នភាព font cache
echo "Updating font cache..."
fc-cache -fv

# ជំហានទី ៥៖ បង្ហាញបញ្ជី font ដើម្បីផ្ទៀងផ្ទាត់
echo "Listing installed fonts..."
fc-list | grep -i "Khmer\|Noto\|Japanese" || true

echo "Build script finished successfully."
