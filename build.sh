#!/usr/bin/env bash
# exit on error
set -o errexit

# ជំហានទី១៖ ដំឡើង Library ដែល​ចាំបាច់​សម្រាប់​ហ្វុन्ट និង​ការ​បង្កើត PDF
apt-get update && apt-get install -y \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libcairo2 \
  libgdk-pixbuf2.0-0 \
  fonts-noto \
  fonts-noto-cjk \
  fontconfig # Library សំខាន់​សម្រាប់​គ្រប់គ្រង​ឃ្លាំង​សម្ងាត់​ហ្វុन्ट

# ជំហានទី២៖ បង្កើត​ថត​ផ្ទាល់ខ្លួន​សម្រាប់​ហ្វុन्ट​របស់​យើង​នៅ​ក្នុង​ប្រព័ន្ធ
mkdir -p /usr/share/fonts/truetype/custom/

# ជំហានទី៣៖ ចម្លង​ហ្វុन्ट​ខ្មែរ និង​ជប៉ុន​ពី​ថត​โปรเจกต์​របស់​យើង​ទៅ​កាន់​ថត​របស់​ប្រព័ន្ធ
# คำสั่ง​នេះ​សន្មត​ថា​ script ត្រូវ​បាន​ដំណើរការ​ពី​ថត​ឫស​នៃ​โปรเจกต์​ដែល​មាន​ថត 'fonts'។
cp fonts/*.ttf /usr/share/fonts/truetype/custom/

# ជំហានទី៤៖ ធ្វើ​បច្ចុប្បន្នភាព​ឃ្លាំង​សម្ងាត់​ហ្វុन्ट​ឡើងវិញ ដើម្បី​ឲ្យ​ប្រព័ន្ធ​ស្គាល់​ហ្វុन्ट​ថ្មី
echo "កំពុង​ធ្វើ​បច្ចុប្បន្នភាព​ឃ្លាំង​សម្ងាត់​ហ្វុन्ट..."
fc-cache -fv

# ជំហានទី៥៖ ដំឡើង Python dependencies
pip install -r requirements.txt
