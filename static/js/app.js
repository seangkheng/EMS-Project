// js/app.js (Final Version - All Modules Imported and Enabled for Deployment)

import { initAuth } from './modules/auth.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderStudentModule } from './modules/student.js';
import { renderTeacherModule } from './modules/teacher.js';
import { renderSubjectModule } from './modules/subject.js';
import { renderClassModule } from './modules/class.js';
import { renderUserModule } from './modules/user.js';
import { renderAttendanceModule } from './modules/attendance.js';
import { renderGradeModule } from './modules/grade.js';
import { renderTimetableModule } from './modules/timetable.js';
import { renderAnnouncementModule } from './modules/announcement.js'; 

document.addEventListener('DOMContentLoaded', () => {

    // --- Global State and Language Resources ---
    const state = {
        currentLang: localStorage.getItem('ems-lang') || 'km',
        currentModule: 'dashboard',
        userRole: localStorage.getItem('ems-role'),
        resources: {
            "km": {
                "title": "ប្រព័ន្ធគ្រប់គ្រងអង្គការយ៉ាតៃ", "logout": "ចាកចេញ", "edit": "កែប្រែ", "delete": "លុប", "submit": "បញ្ជូន", "update": "ធ្វើបច្ចុប្បន្នភាព", "cancel": "បោះបង់", "photo": "រូបថត", "actions": "សកម្មភាព", "confirm_delete": "តើអ្នកប្រាកដទេថាចង់លុប?",
                "module_dashboard": "ផ្ទាំងគ្រប់គ្រង", "module_student": "គ្រប់គ្រងសិស្ស", "module_hr": "គ្រប់គ្រងគ្រូ", "module_academic": "គ្រប់គ្រងថ្នាក់រៀន", "module_subjects": "គ្រប់គ្រងមុខវិជ្ជា", "module_users": "គ្រប់គ្រងអ្នកប្រើប្រាស់", "module_attendance": "គ្រប់គ្រងវត្តមាន", "module_gradebook": "គ្រប់គ្រងពិន្ទុ", "module_timetable": "គ្រប់គ្រងកាលវិភាគ", "module_announcements": "សេចក្តីជូនដំណឹង",
                "module_announcements_new": "ប្រកាសសេចក្តីជូនដំណឹងថ្មី", "module_announcements_title": "ចំណងជើង", "module_announcements_content": "ខ្លឹមសារ", "module_announcements_post": "ប្រកាស",
                "student_list": "បញ្ជីសិស្ស", "form_title_add_student": "បន្ថែមសិស្សថ្មី", "form_title_edit_student": "កែប្រែព័ត៌មានសិស្ស", "student_name": "ឈ្មោះសិស្ស", "student_dob": "ថ្ងៃខែឆ្នាំកំណើត", "student_contact": "ទំនាក់ទំនង", "student_address": "អាសយដ្ឋាន", "assign_class": "ដាក់ចូលថ្នាក់", "student_name_km": "ឈ្មោះ (ខ្មែរ)", "student_name_en": "ឈ្មោះ (អង់គ្លេស)", "student_name_jp": "名前 (Japanese)",
                "teacher_list": "បញ្ជីគ្រូ", "form_title_add_teacher": "បន្ថែមគ្រូថ្មី", "form_title_edit_teacher": "កែប្រែព័ត៌មានគ្រូ", "teacher_name": "ឈ្មោះគ្រូ", "teacher_email": "អ៊ីមែល", "teacher_contact": "ទំនាក់ទំនង", "teacher_specialty": "ជំនាញ", "teacher_hire_date": "កាលបរិច្ឆេទចូលធ្វើការ",
                "subject_list": "បញ្ជីមុខវិជ្ជា", "form_title_add_subject": "បន្ថែមមុខវិជ្ជាថ្មី", "form_title_edit_subject": "កែប្រែមុខវិជ្ជា", "subject_name": "ឈ្មោះមុខវិជ្ជា", "subject_description": "ការពិពណ៌នា",
                "class_list": "បញ្ជីថ្នាក់រៀន", "form_title_add_class": "បង្កើតថ្នាក់រៀនថ្មី", "form_title_edit_class": "កែប្រែថ្នាក់រៀន", "class_name": "ឈ្មោះថ្នាក់រៀន", "academic_year": "ឆ្នាំសិក្សា", "assign_teacher": "ជ្រើសរើសគ្រូ", "assign_subject": "ជ្រើសរើសមុខវិជ្ជា", "teacher": "គ្រូបង្រៀន", "subject": "មុខវិជ្ជា",
                "full_name": "ឈ្មោះពេញ", "email": "អ៊ីមែល", "register": "ចុះឈ្មោះអ្នកប្រើប្រាស់ថ្មី",
                "no_students_in_class": "មិនមានសិស្សនៅក្នុងថ្នាក់នេះទេ", "present": "មានវត្តមាន", "absent": "អវត្តមាន", "late": "មកយឺត", "status": "ស្ថានភាព", "save_attendance": "រក្សាទុកវត្តមាន", "select_class": "ជ្រើសរើសថ្នាក់", "please_select": "សូមជ្រើសរើស", "select_date": "ជ្រើសរើសកាលបរិច្ឆេទ", "load_students": "បង្ហាញសិស្ស",
                "view_reports": "មើលរបាយការណ៍", "attendance_reports": "របាយការណ៍វត្តមាន", "back_to_attendance": "ត្រឡប់ក្រោយ", "select_month": "ជ្រើសរើសខែ", "generate_report": "បង្កើតរបាយការណ៍", "export_excel": "នាំចេញជា Excel", "legend": "កំណត់សម្គាល់", "attendance_report_for": "របាយការណ៍វត្តមានសម្រាប់ថ្នាក់", "month": "ខែ",
                "report_card_title": "ប័ណ្ណពិន្ទុសិស្ស", "report_card_student_name": "ឈ្មោះសិស្ស:", "report_card_dob": "ថ្ងៃខែឆ្នាំកំណើត:", "report_card_class": "ថ្នាក់:", "report_card_teacher": "គ្រូប្រចាំថ្នាក់:", "report_card_performance": "លទ្ធផលសិក្សា", "report_card_subject": "មុខវិជ្ជា", "report_card_score": "ពិន្ទុ", "report_card_summary": "សរុប", "report_card_total_score": "ពិន្ទុសរុប:", "report_card_average": "មធ្យមភាគ:", "report_card_rank": "ចំណាត់ថ្នាក់:", "report_card_result": "លទ្ធផល:", "report_card_attendance": "សរុបវត្តមាន", "report_card_present": "មានវត្តមាន:", "report_card_absent": "អវត្តមាន:", "report_card_late": "មកយឺត:", "report_card_days": "ថ្ងៃ", "report_card_print": "បោះពុម្ពប័ណ្ណពិន្ទុ", "report_card_no_grades": "មិនមានពិន្ទុសម្រាប់ការប្រឡងនេះទេ។",
                "profile_back_to_list": "ត្រឡប់ទៅបញ្ជីវិញ", "profile_title": "ប្រវត្តិរូបសិស្ស", "profile_personal_info": "ព័ត៌មានផ្ទាល់ខ្លួន", "profile_parent_info": "ព័ត៌មានអាណាព្យាបាល", "profile_class": "ថ្នាក់:", "profile_generate_report": "បង្កើតប័ណ្ណពិន្ទុ",
                "timetable_header": "ម៉ោង / ថ្ងៃ", "day_mon": "ចន្ទ", "day_tue": "អង្គារ", "day_wed": "ពុធ", "day_thu": "ព្រហស្បតិ៍", "day_fri": "សុក្រ", "day_sat": "សៅរ៍", "day_sun": "អាទិត្យ"
            },
            "en": {
                "title": "YATAI School EMS", "logout": "Logout", "edit": "Edit", "delete": "Delete", "submit": "Submit", "update": "Update", "cancel": "Cancel", "photo": "Photo", "actions": "Actions", "confirm_delete": "Are you sure you want to delete?",
                "module_dashboard": "Dashboard", "module_student": "Student Management", "module_hr": "Teacher Management", "module_academic": "Class Management", "module_subjects": "Subject Management", "module_users": "Users & Roles", "module_attendance": "Attendance", "module_gradebook": "Gradebook", "module_timetable": "Timetable", "module_announcements": "Announcements",
                "module_announcements_new": "Post New Announcement", "module_announcements_title": "Title", "module_announcements_content": "Content", "module_announcements_post": "Post",
                "student_list": "Student List", "form_title_add_student": "Add New Student", "form_title_edit_student": "Edit Student Info", "student_name": "Student Name", "student_dob": "Date of Birth", "student_contact": "Contact", "student_address": "Address", "assign_class": "Assign to Class", "student_name_km": "Name (Khmer)", "student_name_en": "Name (English)", "student_name_jp": "Name (Japanese)",
                "teacher_list": "Teacher List", "form_title_add_teacher": "Add New Teacher", "form_title_edit_teacher": "Edit Teacher Info", "teacher_name": "Teacher Name", "teacher_email": "Email", "teacher_contact": "Contact", "teacher_specialty": "Specialty", "teacher_hire_date": "Hire Date",
                "subject_list": "Subject List", "form_title_add_subject": "Add New Subject", "form_title_edit_subject": "Edit Subject", "subject_name": "Subject Name", "subject_description": "Description",
                "class_list": "Class List", "form_title_add_class": "Create New Class", "form_title_edit_class": "Edit Class", "class_name": "Class Name", "academic_year": "Academic Year", "assign_teacher": "Assign Teacher", "assign_subject": "Assign Subject", "teacher": "Teacher", "subject": "Subject",
                "full_name": "Full Name", "email": "Email", "register": "Register New User",
                "no_students_in_class": "No students enrolled in this class.", "present": "Present", "absent": "Absent", "late": "Late", "status": "Status", "save_attendance": "Save Attendance", "select_class": "Select Class", "please_select": "Please Select", "select_date": "Select Date", "load_students": "Load Students",
                "view_reports": "View Reports", "attendance_reports": "Attendance Reports", "back_to_attendance": "Back to Attendance Taking", "select_month": "Select Month", "generate_report": "Generate Report", "export_excel": "Export to Excel", "legend": "Legend", "attendance_report_for": "Attendance Report for", "month": "Month",
                "report_card_title": "STUDENT REPORT CARD", "report_card_student_name": "Student Name:", "report_card_dob": "Date of Birth:", "report_card_class": "Class:", "report_card_teacher": "Homeroom Teacher:", "report_card_performance": "Academic Performance", "report_card_subject": "Subject", "report_card_score": "Score", "report_card_summary": "Summary", "report_card_total_score": "Total Score:", "report_card_average": "Average:", "report_card_rank": "Rank in Class:", "report_card_result": "Result:", "report_card_attendance": "Attendance Summary", "report_card_present": "Present:", "report_card_absent": "Absent:", "report_card_late": "Late:", "report_card_days": "days", "report_card_print": "Print Report Card", "report_card_no_grades": "No grades found for this exam.",
                "profile_back_to_list": "Back to List", "profile_title": "Student Profile", "profile_personal_info": "Personal Information", "profile_parent_info": "Parent/Guardian Information", "profile_class": "Class:", "profile_generate_report": "Generate Report Card",
                "timetable_header": "Time / Day", "day_mon": "Monday", "day_tue": "Tuesday", "day_wed": "Wednesday", "day_thu": "Thursday", "day_fri": "Friday", "day_sat": "Saturday", "day_sun": "Sunday"
            },
            "jp": {
                "title": "教育管理システム", "logout": "ログアウト", "edit": "編集", "delete": "削除", "submit": "追加", "update": "更新", "cancel": "キャンセル", "photo": "写真", "actions": "操作", "confirm_delete": "この項目を削除してもよろしいですか？",
                "module_dashboard": "ダッシュボード", "module_student": "学生管理", "module_hr": "教師管理", "module_academic": "クラス管理", "module_subjects": "科目管理", "module_users": "ユーザー管理", "module_attendance": "出席管理", "module_gradebook": "成績管理", "module_timetable": "時間割管理", "module_announcements": "お知らせ",
                "module_announcements_new": "新しいお知らせを投稿", "module_announcements_title": "タイトル", "module_announcements_content": "内容", "module_announcements_post": "投稿",
                "student_list": "学生一覧", "form_title_add_student": "新しい学生を追加", "form_title_edit_student": "学生情報を編集", "student_name": "氏名", "student_dob": "生年月日", "student_contact": "連絡先", "student_address": "住所", "assign_class": "クラスに割り当て", "student_name_km": "名前 (クメール語)", "student_name_en": "名前 (英語)", "student_name_jp": "名前 (日本語)",
                "class_name": "クラス名",
                "no_students_in_class": "このクラスには学生がいません", "present": "出席", "absent": "欠席", "late": "遅刻", "status": "状態", "save_attendance": "出席を保存", "select_class": "クラスを選択", "please_select": "選択してください", "select_date": "日付を選択", "load_students": "学生を読み込む",
                "view_reports": "レポート表示", "attendance_reports": "出席レポート", "back_to_attendance": "出席入力に戻る", "select_month": "月を選択", "generate_report": "レポート作成", "export_excel": "Excelにエクスポート", "legend": "凡例", "attendance_report_for": "クラスの出席レポート", "month": "月",
                "report_card_title": "成績証明書", "report_card_student_name": "氏名:", "report_card_dob": "生年月日:", "report_card_class": "クラス:", "report_card_teacher": "担任教師:", "report_card_performance": "学業成績", "report_card_subject": "科目", "report_card_score": "点数", "report_card_summary": "概要", "report_card_total_score": "合計点:", "report_card_average": "平均点:", "report_card_rank": "クラス順位:", "report_card_result": "結果:", "report_card_attendance": "出席概要", "report_card_present": "出席:", "report_card_absent": "欠席:", "report_card_late": "遅刻:", "report_card_days": "日", "report_card_print": "成績書を印刷", "report_card_no_grades": "この試験の成績は見つかりませんでした。",
                "profile_back_to_list": "一覧に戻る", "profile_title": "学生プロフィール", "profile_personal_info": "個人情報", "profile_parent_info": "保護者情報", "profile_class": "クラス:", "profile_generate_report": "成績証明書を作成",
                "timetable_header": "時間 / 曜日", "day_mon": "月曜日", "day_tue": "火曜日", "day_wed": "水曜日", "day_thu": "木曜日", "day_fri": "金曜日", "day_sat": "土曜日", "day_sun": "日曜日"
            }
        }
    };

    // --- DOM Element References ---
    const contentEl = document.getElementById('content');
    const moduleList = document.getElementById('modules-list');
    const langSwitchButtons = document.querySelectorAll('.lang-switch button');

    /**
     * Gets the translation object for the current language.
     * @returns {object} The translation object.
     */
    function getT() {
        return state.resources[state.currentLang] || state.resources['en'];
    }

    /**
     * Manages the visibility of modules based on user role.
     * Admins see all modules, other roles have restricted views.
     */
    function manageRoleVisibility() {
        const userRole = localStorage.getItem('ems-role');
        // If user is admin, show all elements with a data-role attribute.
        if (userRole === 'admin') {
            document.querySelectorAll('[data-role]').forEach(el => {
                el.style.display = 'flex'; // Use flex for consistency with module cards
            });
            return;
        }

        // Hide elements specifically marked for admin-only access.
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            el.style.display = 'none';
        });
    }

    /**
     * Applies the current language translations to all UI elements with data-i18n attributes.
     */
    function applyTranslations() {
        const t = getT();
        document.documentElement.lang = state.currentLang;
        document.title = t.title || "YATAI School EMS";

        // Translate all elements with data-i18n keys
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        // Update active state of language buttons
        langSwitchButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
        });

        // Re-render the current module to apply new translations
        renderModule(state.currentModule);
    }

    /**
     * Renders the specified module into the main content area.
     * @param {string} moduleName - The name of the module to render.
     */
    function renderModule(moduleName) {
        state.currentModule = moduleName;
        // Highlight the active module card
        document.querySelectorAll('.module-card').forEach(card =>
            card.classList.toggle('active', card.dataset.module === moduleName)
        );

        const t = getT();
        const lang = state.currentLang; 

        // Main router for rendering different modules
        switch (moduleName) {
            case 'dashboard':
                renderDashboard(contentEl, t);
                break;
            case 'announcements':
                renderAnnouncementModule(contentEl, t);
                break;
            case 'student':
                renderStudentModule(contentEl, t, lang);
                break;
            case 'hr':
                renderTeacherModule(contentEl, t);
                break;
            case 'subjects':
                renderSubjectModule(contentEl, t);
                break;
            case 'academic':
                renderClassModule(contentEl, t);
                break;
            case 'users':
                renderUserModule(contentEl, t);
                break;
            case 'attendance':
                renderAttendanceModule(contentEl, t);
                break;
            case 'gradebook':
                renderGradeModule(contentEl, t);
                break;
            case 'timetable':
                renderTimetableModule(contentEl, t);
                break;
            default:
                const moduleTitle = t[`module_${moduleName}`] || moduleName;
                contentEl.innerHTML = `<h2>${moduleTitle}</h2><p>This module is under construction.</p>`;
        }
    }

    /**
     * Initializes the main application after successful login.
     * Sets up event listeners for navigation and language switching.
     */
    function mainAppInit() {
        state.userRole = localStorage.getItem('ems-role');
        applyTranslations();
        manageRoleVisibility(); 

        // Event listener for module navigation
        moduleList.addEventListener('click', (e) => {
            const card = e.target.closest('.module-card');
            if (card && card.dataset.module !== state.currentModule) {
                renderModule(card.dataset.module);
            }
        });

        // Event listener for language switching
        langSwitchButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const newLang = e.target.dataset.lang;
                if (newLang !== state.currentLang) {
                    state.currentLang = newLang;
                    localStorage.setItem('ems-lang', newLang);
                    applyTranslations();
                }
            });
        });
    }

    // Start the application by initializing the authentication module.
    initAuth(mainAppInit);
});
