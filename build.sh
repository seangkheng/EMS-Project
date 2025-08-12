#!/usr/bin/env bash
# exit on error
set -o errexit

# ជំហានទី១៖ ដំឡើង Python dependencies ជាមុន
# Render នឹង​បាន​ដំឡើង system packages ពី apt.txt រួចរាល់​ហើយ​មុន​នឹង​ដំណើរការ​ script នេះ។
pip install -r requirements.txt

# ជំហានទី២៖ បង្កើត​ថត​សម្រាប់​ហ្វុन्ट​នៅ​ក្នុង​ទីតាំង​របស់​អ្នក​ប្រើប្រាស់ (user's home directory)
# ទីតាំង​នេះ​ជា​ទូទៅ​អាច​សរសេរ​ចូល​បាន​នៅ​ក្នុង​ដំណាក់កាល build។
mkdir -p ~/.fonts/

# ជំហានទី៣៖ ចម្លង​ហ្វុन्ट​ខ្មែរ និង​ជប៉ុន​ពី​ថត​โปรเจกต์​របស់​យើង​ទៅ​កាន់​ថត​ថ្មី​នោះ
echo "Copying custom fonts to user's font directory..."
cp fonts/*.ttf ~/.fonts/

# ជំហានទី៤៖ ធ្វើ​បច្ចុប្បន្នភាព​ឃ្លាំង​សម្ងាត់​ហ្វុन्ट​ឡើងវិញ ដើម្បី​ឲ្យ​ប្រព័ន្ធ​ស្គាល់​ហ្វុन्ट​ថ្មី
echo "Updating font cache..."
fc-cache -fv

echo "Build script finished successfully."