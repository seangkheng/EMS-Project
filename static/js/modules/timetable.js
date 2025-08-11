// js/modules/timetable.js
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader } from './ui.js';

let classesCache = [];
let teachersCache = [];
let subjectsCache = [];
let timetableCache = [];

// --- NEW: Handle Timetable Export ---
async function handleTimetableExport(classId, lang, t) {
    const button = document.getElementById('btn-export-timetable-pdf');
    if (!button) return;

    const originalText = button.innerHTML;
    button.innerHTML = 'Exporting...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/timetables/export/pdf?class_id=${classId}&lang=${lang}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Export failed');
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
        showNotification('Export successful!', 'success');

    } catch (e) {
        showNotification(e.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}


// --- Helper function to render the timetable grid ---
function renderTimetableGrid(container, t) {
    const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];
    const timeSlots = [
        '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
    ];

    let headerHtml = '<th>ម៉ោង / ថ្ងៃ</th>';
    days.forEach(day => headerHtml += `<th>${day}</th>`);

    let bodyHtml = '';
    timeSlots.forEach(slot => {
        const startTime = slot.split(' - ')[0];
        bodyHtml += `<tr><td class="time-slot-label">${slot}</td>`;
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            bodyHtml += `<td data-day="${dayIndex + 1}" data-time="${startTime}"></td>`;
        }
        bodyHtml += '</tr>';
    });

    container.innerHTML = `<div class="table-responsive"><table class="timetable-grid"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;

    // Populate the grid with cached data
    timetableCache.forEach(entry => {
        const cell = container.querySelector(`td[data-day='${entry.day_of_week}'][data-time='${entry.start_time}']`);
        if (cell) {
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

// --- Main render function for the module ---
export async function renderTimetableModule(contentEl, t) {
    const lang = localStorage.getItem('ems-lang') || 'km';
    showLoader(contentEl);
    try {
        const [classesRes, teachersRes, subjectsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/classes`),
            fetchWithAuth(`${API_BASE_URL}/api/teachers`),
            fetchWithAuth(`${API_BASE_URL}/api/subjects`)
        ]);

        if (!classesRes.ok || !teachersRes.ok || !subjectsRes.ok) {
            throw new Error('Failed to load initial data for timetable.');
        }

        const classesResult = await classesRes.json();
        const teachersResult = await teachersRes.json();
        const subjectsResult = await subjectsRes.json();

        classesCache = classesResult.data || classesResult;
        teachersCache = teachersResult.data || teachersResult;
        subjectsCache = subjectsResult.data || subjectsResult;

        const classOptions = classesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const teacherOptions = teachersCache.map(tc => `<option value="${tc.id}">${tc.name}</option>`).join('');
        const subjectOptions = subjectsCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const html = `
            <h2>${t.module_timetable || 'កាលវិភាគសិក្សា'}</h2>
            <div class="form-container">
                <div class="attendance-selector">
                    <div class="form-group">
                        <label>ជ្រើសរើសថ្នាក់:</label>
                        <select id="class-select-timetable">
                            <option value="">-- សូមជ្រើសរើស --</option>
                            ${classOptions}
                        </select>
                    </div>
                     <!-- NEW: Export button container -->
                    <div id="timetable-actions" style="display:none;">
                        <button id="btn-export-timetable-pdf" class="btn"><i class="fa-regular fa-file-pdf"></i> Export to PDF</button>
                    </div>
                </div>
            </div>

            <div id="timetable-grid-container" class="content-panel">
                <p>សូមជ្រើសរើសថ្នាក់ដើម្បីមើលកាលវិភាគ។</p>
            </div>

            <div id="add-schedule-form-container" class="form-container" style="display:none;">
                <h3>បន្ថែមកាលវិភាគថ្មី</h3>
                <form id="add-schedule-form">
                    <div class="form-group"><label>ថ្ងៃ:</label>
                        <select name="day_of_week" required>
                            <option value="1">ចន្ទ</option><option value="2">អង្គារ</option><option value="3">ពុធ</option>
                            <option value="4">ព្រហស្បតិ៍</option><option value="5">សុក្រ</option><option value="6">សៅរ៍</option>
                            <option value="7">អាទិត្យ</option>
                        </select>
                    </div>
                    <div class="form-group"><label>ម៉ោងចាប់ផ្តើម:</label><input type="time" name="start_time" required></div>
                    <div class="form-group"><label>ម៉ោងបញ្ចប់:</label><input type="time" name="end_time" required></div>
                    <div class="form-group"><label>មុខវិជ្ជា:</label><select name="subject_id" required>${subjectOptions}</select></div>
                    <div class="form-group"><label>គ្រូបង្រៀន:</label><select name="teacher_id" required>${teacherOptions}</select></div>
                    <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> រក្សាទុក</button>
                </form>
            </div>
        `;
        contentEl.innerHTML = html;

        const classSelect = document.getElementById('class-select-timetable');
        const gridContainer = document.getElementById('timetable-grid-container');
        const addFormContainer = document.getElementById('add-schedule-form-container');
        const actionsContainer = document.getElementById('timetable-actions');

        classSelect.addEventListener('change', async () => {
            const classId = classSelect.value;
            if (classId) {
                showLoader(gridContainer);
                addFormContainer.style.display = 'block';
                actionsContainer.style.display = 'block'; // Show export button
                const scheduleResponse = await fetchWithAuth(`${API_BASE_URL}/api/timetables/class/${classId}`);
                timetableCache = await scheduleResponse.json();
                renderTimetableGrid(gridContainer, t);
            } else {
                gridContainer.innerHTML = '<p>សូមជ្រើសរើសថ្នាក់ដើម្បីមើលកាលវិភាគ។</p>';
                addFormContainer.style.display = 'none';
                actionsContainer.style.display = 'none'; // Hide export button
            }
        });

        document.getElementById('add-schedule-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const classId = classSelect.value;
            if (!classId) {
                showNotification('Please select a class first.', 'error');
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
                if (!response.ok) throw new Error('Failed to save schedule.');
                showNotification('Schedule added successfully!', 'success');
                classSelect.dispatchEvent(new Event('change'));
                form.reset();
            } catch (err) {
                showNotification(err.message, 'error');
            }
        });
        
        // Add event listener for the export button
        actionsContainer.addEventListener('click', (e) => {
            if (e.target.id === 'btn-export-timetable-pdf') {
                const classId = classSelect.value;
                handleTimetableExport(classId, lang, t);
            }
        });

        gridContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete-entry')) {
                const entryId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this schedule entry?')) {
                    try {
                        const response = await fetchWithAuth(`${API_BASE_URL}/api/timetables/${entryId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Failed to delete.');
                        showNotification('Deleted successfully.', 'success');
                        classSelect.dispatchEvent(new Event('change')); // Refresh
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
