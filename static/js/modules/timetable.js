// js/modules/timetable.js (កំណែចុងក្រោយพร้อมការគាំទ្រពហុភាសា និងការនាំចេញជា PDF)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader } from './ui.js';

// --- អថេរឃ្លាំងសម្ងាត់កម្រិតម៉ូឌុល ---
let classesCache = [];
let teachersCache = [];
let subjectsCache = [];
let timetableCache = [];

/**
 * គ្រប់គ្រងមុខងារនាំចេញជា PDF សម្រាប់កាលវិភាគរបស់ថ្នាក់ដែលបានជ្រើសរើស។
 * @param {string} classId - លេខសម្គាល់របស់ថ្នាក់ដែលត្រូវនាំចេញ។
 * @param {string} lang - លេខកូដភាសា hiện tại (ឧ. 'km', 'en')។
 * @param {object} t - Object បកប្រែសម្រាប់ភាសាปัจจุบัน។
 */
async function handleTimetableExport(classId, lang, t) {
    const button = document.getElementById('btn-export-timetable-pdf');
    if (!button) return;

    const originalText = button.innerHTML;
    button.innerHTML = t.exporting || 'កំពុងនាំចេញ...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/timetables/export/pdf?class_id=${classId}&lang=${lang}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'ការនាំចេញបានបរាជ័យ');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const className = classesCache.find(c => c.id == classId)?.name || 'timetable';
        a.href = downloadUrl;
        a.download = `${className}_timetable.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showNotification('ការនាំចេញបានជោគជ័យ!', 'success');

    } catch (e) {
        showNotification(e.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * បង្ហាញក្រឡាចត្រង្គកាលវិភាគដោយផ្អែកលើទិន្នន័យកាលវិភាគដែលបានរក្សាទុកក្នុងឃ្លាំងសម្ងាត់។
 * @param {HTMLElement} container - ធាតុសម្រាប់បង្ហាញក្រឡាចត្រង្គ។
 * @param {object} t - Object បកប្រែសម្រាប់ភាសាปัจจุบัน។
 */
function renderTimetableGrid(container, t) {
    // ប្រើ translation keys សម្រាប់ថ្ងៃនៃសប្តាហ៍
    const days = [
        t.day_mon || 'ចន្ទ', t.day_tue || 'អង្គារ', t.day_wed || 'ពុធ',
        t.day_thu || 'ព្រហស្បតិ៍', t.day_fri || 'សុក្រ', t.day_sat || 'សៅរ៍',
        t.day_sun || 'អាទិត្យ'
    ];
    const timeSlots = [
        '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
    ];

    // ប្រើ translation key សម្រាប់បឋមកថាតារាង
    let headerHtml = `<th>${t.timetable_header || 'ម៉ោង / ថ្ងៃ'}</th>`;
    days.forEach(day => headerHtml += `<th>${day}</th>`);

    let bodyHtml = '';
    timeSlots.forEach(slot => {
        const startTime = slot.split(' - ')[0];
        bodyHtml += `<tr><td class="time-slot-label">${slot}</td>`;
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            // Data attributes ទាក់ទងនឹងតម្លៃក្នុងฐานข้อมูล (1-7 សម្រាប់ day_of_week)
            bodyHtml += `<td data-day="${dayIndex + 1}" data-time="${startTime}"></td>`;
        }
        bodyHtml += '</tr>';
    });

    container.innerHTML = `<div class="table-responsive"><table class="timetable-grid"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;

    // បញ្ចូលទិន្នន័យจากឃ្លាំងសម្ងាត់ទៅក្នុងក្រឡាចត្រង្គបន្ទាប់ពីបង្ហាញโครงสร้าง
    timetableCache.forEach(entry => {
        const cell = container.querySelector(`td[data-day='${entry.day_of_week}'][data-time='${entry.start_time}']`);
        if (cell) {
            // បន្ថែម HTML របស់รายการកាលវិភាគទៅក្នុងក្រឡាที่ถูกต้อง
            cell.innerHTML += `
                <div class="schedule-entry">
                    <strong>${entry.subject_name}</strong>
                    <p>${entry.teacher_name}</p>
                    <button class="btn-delete-entry" data-id="${entry.id}">&times;</button>
                </div>
            `;
        }
    });
}

/**
 * មុខងារหลักสำหรับแสดงម៉ូឌុលកាលវិភាគทั้งหมด។
 * @param {HTMLElement} contentEl - ធាតុเนื้อหาหลักของแอปพลิเคชัน។
 * @param {object} t - Object បកប្រែสำหรับភាសាปัจจุบัน។
 */
export async function renderTimetableModule(contentEl, t) {
    const lang = localStorage.getItem('ems-lang') || 'km';
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    showLoader(contentEl);
    
    try {
        // ទាញទិន្នន័យที่จำเป็นพร้อมกันเพื่อประสิทธิภาพที่ดีขึ้น
        const [classesRes, teachersRes, subjectsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/classes`),
            fetchWithAuth(`${API_BASE_URL}/api/teachers`),
            fetchWithAuth(`${API_BASE_URL}/api/subjects`)
        ]);

        if (!classesRes.ok || !teachersRes.ok || !subjectsRes.ok) {
            throw new Error('ការផ្ទុកទិន្នន័យដំបូងសម្រាប់កាលវិភាគបានបរាជ័យ');
        }

        const classesResult = await classesRes.json();
        const teachersResult = await teachersRes.json();
        const subjectsResult = await subjectsRes.json();

        // បញ្ចូលข้อมูลลงในឃ្លាំងសម្ងាត់
        classesCache = classesResult.data || classesResult;
        teachersCache = teachersResult.data || teachersResult;
        subjectsCache = subjectsResult.data || subjectsResult;

        // រៀបចំตัวเลือกสำหรับ dropdown จากข้อมูลในឃ្លាំងសម្ងាត់
        const classOptions = classesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const teacherOptions = teachersCache.map(tc => `<option value="${tc.id}">${tc.name}</option>`).join('');
        const subjectOptions = subjectsCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        // បង្ហាញฟอร์มเพิ่มตารางเวลาตามเงื่อนไขสำหรับ admin
        const adminFormHtml = isAdmin ? `
            <div id="add-schedule-form-container" class="form-container" style="display:none;">
                <h3>បន្ថែមកាលវិភាគថ្មី</h3>
                <form id="add-schedule-form">
                    <div class="form-group"><label>ថ្ងៃ:</label>
                        <select name="day_of_week" required>
                            <option value="1">${t.day_mon}</option><option value="2">${t.day_tue}</option><option value="3">${t.day_wed}</option>
                            <option value="4">${t.day_thu}</option><option value="5">${t.day_fri}</option><option value="6">${t.day_sat}</option>
                            <option value="7">${t.day_sun}</option>
                        </select>
                    </div>
                    <div class="form-group"><label>ម៉ោងចាប់ផ្តើម:</label><input type="time" name="start_time" required></div>
                    <div class="form-group"><label>ម៉ោងបញ្ចប់:</label><input type="time" name="end_time" required></div>
                    <div class="form-group"><label>មុខវិជ្ជា:</label><select name="subject_id" required>${subjectOptions}</select></div>
                    <div class="form-group"><label>គ្រូបង្រៀន:</label><select name="teacher_id" required>${teacherOptions}</select></div>
                    <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> រក្សាទុក</button>
                </form>
            </div>` : '';

        // โครงสร้าง HTML หลักของម៉ូឌុល
        const html = `
            <h2>${t.module_timetable || 'កាលវិភាគសិក្សា'}</h2>
            <div class="form-container">
                <div class="attendance-selector">
                    <div class="form-group">
                        <label>ជ្រើសរើសថ្នាក់:</label>
                        <select id="class-select-timetable">
                            <option value="">-- ${t.please_select} --</option>
                            ${classOptions}
                        </select>
                    </div>
                    <div id="timetable-actions" style="display:none;">
                        <button id="btn-export-timetable-pdf" class="btn"><i class="fa-regular fa-file-pdf"></i> ${t.export_pdf || 'នាំចេញជា PDF'}</button>
                    </div>
                </div>
            </div>

            <div id="timetable-grid-container" class="content-panel">
                <p>សូមជ្រើសរើសថ្នាក់ដើម្បីមើលកាលវិភាគ។</p>
            </div>
            
            ${adminFormHtml}
        `;
        contentEl.innerHTML = html;

        // --- Event Listeners ---
        const classSelect = document.getElementById('class-select-timetable');
        const gridContainer = document.getElementById('timetable-grid-container');
        const addFormContainer = document.getElementById('add-schedule-form-container');
        const actionsContainer = document.getElementById('timetable-actions');

        // គ្រប់គ្រងការផ្លាស់ប្តូរការเลือกថ្នាក់
        classSelect.addEventListener('change', async () => {
            const classId = classSelect.value;
            if (classId) {
                showLoader(gridContainer);
                if (addFormContainer) addFormContainer.style.display = 'block';
                actionsContainer.style.display = 'block';
                const scheduleResponse = await fetchWithAuth(`${API_BASE_URL}/api/timetables/class/${classId}`);
                timetableCache = await scheduleResponse.json();
                renderTimetableGrid(gridContainer, t);
            } else {
                gridContainer.innerHTML = '<p>សូមជ្រើសរើសថ្នាក់ដើម្បីមើលកាលវិភាគ។</p>';
                if (addFormContainer) addFormContainer.style.display = 'none';
                actionsContainer.style.display = 'none';
            }
        });

        // គ្រប់គ្រងการส่งฟอร์มสำหรับเพิ่มรายการใหม่ (เฉพาะ admin)
        if (isAdmin) {
            document.getElementById('add-schedule-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const classId = classSelect.value;
                if (!classId) {
                    showNotification('សូមជ្រើសរើសថ្នាក់ជាមុនសិន', 'error');
                    return;
                }
                const payload = {
                    class_id: parseInt(classId),
                    teacher_id: form.elements.teacher_id.value,
                    subject_id: form.elements.subject_id.value,
                    day_of_week: form.elements.day_of_week.value,
                    start_time: form.elements.start_time.value,
                    end_time: form.elements.end_time.value
                };

                try {
                    const response = await fetchWithAuth(`${API_BASE_URL}/api/timetables`, { method: 'POST', body: payload });
                    if (!response.ok) throw new Error('ការរក្សាទុកកាលវិភាគបានបរាជ័យ');
                    showNotification('បានបន្ថែមកាលវិភាគដោយជោគជ័យ!', 'success');
                    classSelect.dispatchEvent(new Event('change')); // ធ្វើឱ្យក្រឡាចត្រង្គស្រស់ชื่น
                    form.reset();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
        }
        
        // គ្រប់គ្រងการคลิกปุ่มនាំចេញជា PDF
        actionsContainer.addEventListener('click', (e) => {
            if (e.target.id === 'btn-export-timetable-pdf') {
                const classId = classSelect.value;
                handleTimetableExport(classId, lang, t);
            }
        });

        // គ្រប់គ្រងការលុបรายการកាលវិភាគ (เฉพาะ admin)
        gridContainer.addEventListener('click', async (e) => {
            if (isAdmin && e.target.classList.contains('btn-delete-entry')) {
                const entryId = e.target.dataset.id;
                if (confirm(t.confirm_delete || 'តើអ្នកប្រាកដទេថាចង់លុបវា?')) {
                    try {
                        const response = await fetchWithAuth(`${API_BASE_URL}/api/timetables/${entryId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('ការលុបបានបរាជ័យ');
                        showNotification('បានលុបដោយជោគជ័យ', 'success');
                        classSelect.dispatchEvent(new Event('change')); // ធ្វើឱ្យក្រឡាចត្រង្គស្រស់ชื่น
                    } catch (err) {
                        showNotification(err.message, 'error');
                    }
                }
            }
        });

    } catch (e) {
        showNotification(e.message, 'error');
        contentEl.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}
