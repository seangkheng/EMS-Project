// js/modules/attendance.js (With Reporting Feature + Export)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader } from './ui.js';

let classesCache = [];

// --- Reporting View ---
async function handleReportExport(t) {
    const classId = document.getElementById('class-select-report').value;
    const month = document.getElementById('month-select-report').value;
    const button = document.getElementById('export-report-btn');

    if (!classId || !month) {
        showNotification(t.generate_report_first || 'Please generate a report first before exporting.', 'warning');
        return;
    }

    const originalText = button.innerHTML;
    button.innerHTML = t.exporting || 'Exporting...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/attendance/report/export?class_id=${classId}&month=${month}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Export failed.');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `attendance_report_${classId}_${month}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showNotification(t.export_success || 'Export successful!', 'success');

    } catch (e) {
        showNotification(e.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function generateReport(t) {
    const classId = document.getElementById('class-select-report').value;
    const month = document.getElementById('month-select-report').value;
    const container = document.getElementById('report-table-container');

    if (!classId || !month) {
        showNotification(t.select_class_month || 'Please select a class and a month.', 'warning');
        return;
    }

    showLoader(container);

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/attendance/report?class_id=${classId}&month=${month}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load report data.');
        }
        
        const { report_data, month_details } = data;

        if (report_data.length === 0) {
            container.innerHTML = `<p>${t.no_students_in_class || 'No students enrolled in this class for the selected period.'}</p>`;
            return;
        }

        let headerHtml = `<th>${t.student_name || 'Student Name'}</th>`;
        for (let i = 1; i <= month_details.num_days; i++) {
            headerHtml += `<th>${i}</th>`;
        }

        const bodyRows = report_data.map(student => {
            let rowHtml = `<td>${student.student_name}</td>`;
            for (let i = 1; i <= month_details.num_days; i++) {
                const status = student.attendance[i];
                let cellContent = '';
                if (status === 'present') cellContent = `<span style="color: green;">P</span>`;
                else if (status === 'absent') cellContent = `<span style="color: red;">A</span>`;
                else if (status === 'late') cellContent = `<span style="color: orange;">L</span>`;
                rowHtml += `<td>${cellContent}</td>`;
            }
            return `<tr>${rowHtml}</tr>`;
        }).join('');

        container.innerHTML = `
            <div class="report-header">
                <h3>${t.attendance_report_for || 'Attendance Report for'} ${classesCache.find(c => c.id == classId)?.name || ''}</h3>
                <p><strong>${t.month || 'Month'}:</strong> ${month}</p>
                <button id="export-report-btn" class="btn"><i class="fa-regular fa-file-excel"></i> ${t.export_excel || 'Export to Excel'}</button>
            </div>
            <div class="table-responsive">
                <table id="attendance-report-table" class="report-table">
                    <thead><tr>${headerHtml}</tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>
            <div style="margin-top: 1rem; text-align: left;">
                <strong>${t.legend || 'Legend'}:</strong> 
                <span style="color: green;">P</span> = ${t.present || 'Present'}, 
                <span style="color: red;">A</span> = ${t.absent || 'Absent'}, 
                <span style="color: orange;">L</span> = ${t.late || 'Late'}
            </div>
        `;
        document.getElementById('export-report-btn').addEventListener('click', () => handleReportExport(t));

    } catch (e) {
        showNotification(e.message, 'error');
        container.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}

function renderReportView(t) {
    const contentEl = document.getElementById('content');
    const classOptions = classesCache.map(cls => `<option value="${cls.id}">${cls.name} - ${cls.academic_year}</option>`).join('');
    
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2);

    const html = `
        <div class="profile-header">
             <button id="back-to-attendance" class="btn"><i class="fa-solid fa-arrow-left"></i> ${t.back_to_attendance || 'Back to Attendance Taking'}</button>
             <h2>${t.attendance_reports || 'Attendance Reports'}</h2>
        </div>
        <div class="form-container">
            <div class="attendance-selector">
                <div class="form-group">
                    <label for="class-select-report">${t.select_class || 'Select Class'}:</label>
                    <select id="class-select-report">
                        <option value="">-- ${t.please_select || 'Please Select'} --</option>
                        ${classOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="month-select-report">${t.select_month || 'Select Month'}:</label>
                    <input type="month" id="month-select-report" value="${currentMonth}">
                </div>
                <button id="generate-report-btn" class="btn btn-submit"><i class="fa-solid fa-chart-pie"></i> ${t.generate_report || 'Generate Report'}</button>
            </div>
        </div>
        <div id="report-table-container" class="content-panel"></div>
    `;
    contentEl.innerHTML = html;

    document.getElementById('back-to-attendance').addEventListener('click', () => renderAttendanceModule(contentEl, t));
    document.getElementById('generate-report-btn').addEventListener('click', () => generateReport(t));
}


// --- Attendance Taking View ---
async function saveAttendance(classId, date, t) {
    const tableBody = document.querySelector('#attendance-table tbody');
    if (!tableBody) return;

    const records = [];
    const rows = tableBody.querySelectorAll('tr[data-student-id]');
    rows.forEach(row => {
        const studentId = row.dataset.studentId;
        const statusInput = row.querySelector(`input[name="status-${studentId}"]:checked`);
        if (studentId && statusInput) {
            records.push({
                student_id: parseInt(studentId),
                status: statusInput.value
            });
        }
    });

    if (records.length === 0) {
        showNotification(t.no_data_to_save || 'No attendance data to save.', 'error');
        return;
    }

    const payload = {
        date: date,
        class_id: parseInt(classId),
        records: records
    };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/attendance`, {
            method: 'POST',
            body: payload
        });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
        } else {
            throw new Error(data.message || 'Failed to save attendance.');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function renderAttendanceTable(container, students, t) {
    if (!container) return;

    if (students.length === 0) {
        container.innerHTML = `<p>${t.no_students_in_class || 'No students enrolled in this class.'}</p>`;
        return;
    }

    const tableRows = students.map(student => `
        <tr data-student-id="${student.id}">
            <td>${student.name}</td>
            <td>
                <div class="attendance-radios">
                    <label><input type="radio" name="status-${student.id}" value="present" ${student.status === 'present' || !student.status ? 'checked' : ''}> ${t.present || 'Present'}</label>
                    <label><input type="radio" name="status-${student.id}" value="absent" ${student.status === 'absent' ? 'checked' : ''}> ${t.absent || 'Absent'}</label>
                    <label><input type="radio" name="status-${student.id}" value="late" ${student.status === 'late' ? 'checked' : ''}> ${t.late || 'Late'}</label>
                </div>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table id="attendance-table">
            <thead>
                <tr>
                    <th>${t.student_name || 'Student Name'}</th>
                    <th>${t.status || 'Status'}</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

async function loadAttendanceForClass(classId, date, t) {
    const container = document.getElementById('attendance-table-container');
    const saveBtnContainer = document.getElementById('save-btn-container');
    showLoader(container);
    saveBtnContainer.innerHTML = ''; // Clear save button while loading

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/classes/${classId}/attendance?date=${date}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to load attendance data.' }));
            throw new Error(errorData.message);
        }
        const attendanceCache = await response.json();
        renderAttendanceTable(container, attendanceCache, t);

        if (attendanceCache.length > 0) {
             saveBtnContainer.innerHTML = `<button id="save-attendance-btn" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.save_attendance || 'Save Attendance'}</button>`;
        }

    } catch (error) {
        showNotification(error.message, 'error');
        container.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

export async function renderAttendanceModule(contentEl, t) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/classes`);
        const result = await response.json();
        classesCache = result.data || result;
    } catch (e) {
        showNotification('Failed to load classes.', 'error');
        contentEl.innerHTML = `<p style="color:red;">Failed to load classes.</p>`;
        return;
    }

    const classOptions = classesCache.map(cls => `<option value="${cls.id}">${cls.name} - ${cls.academic_year}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];

    const html = `
        <div class="page-actions">
            <h2>${t.module_attendance || 'Attendance Management'}</h2>
            <button id="view-reports-btn" class="btn"><i class="fa-regular fa-chart-bar"></i> ${t.view_reports || 'View Reports'}</button>
        </div>
        <div class="form-container">
            <div class="attendance-selector">
                <div class="form-group">
                    <label for="class-select-attendance">${t.select_class || 'Select Class'}:</label>
                    <select id="class-select-attendance">
                        <option value="">-- ${t.please_select || 'Please Select'} --</option>
                        ${classOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="attendance-date">${t.select_date || 'Select Date'}:</label>
                    <input type="date" id="attendance-date" value="${today}">
                </div>
                <button id="load-attendance-btn" class="btn"><i class="fa-solid fa-users"></i> ${t.load_students || 'Load Students'}</button>
            </div>
            <hr style="margin: 1rem 0;">
            <div id="attendance-table-container">
                <p>${t.select_class_and_date_msg || 'Please select a class and date, then click "Load Students".'}</p>
            </div>
            <div id="save-btn-container" style="text-align: right; margin-top: 1rem;"></div>
        </div>
    `;
    contentEl.innerHTML = html;

    document.getElementById('view-reports-btn').addEventListener('click', () => renderReportView(t));
    
    const loadBtn = document.getElementById('load-attendance-btn');
    const classSelect = document.getElementById('class-select-attendance');
    const dateInput = document.getElementById('attendance-date');

    loadBtn.addEventListener('click', () => {
        const classId = classSelect.value;
        const date = dateInput.value;
        if (classId && date) {
            loadAttendanceForClass(classId, date, t);
        } else {
            showNotification(t.select_class_and_date || 'Please select a class and a date.', 'error');
        }
    });

    contentEl.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'save-attendance-btn') {
            const classId = classSelect.value;
            const date = dateInput.value;
            saveAttendance(classId, date, t);
        }
    });
}
