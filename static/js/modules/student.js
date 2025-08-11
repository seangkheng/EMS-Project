// js/modules/student.js (Refactored for Cleaner UI + Profile Page + Search + Report Card)
import { fetchWithAuth, API_BASE_URL, UPLOADS_URL } from '../api.js';
import { showNotification, showLoader, renderPagination } from './ui.js';

let studentsCache = [];
let classesCache = [];
let searchTimeout = null;

// --- Student Report Card ---
async function generateReportCard(studentId, t) {
    const examType = document.getElementById('exam-type-report-card').value;
    const container = document.getElementById('report-card-container');
    if (!examType) {
        showNotification('Please select an exam type.', 'warning');
        return;
    }
    showLoader(container);

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/results/student-report/${studentId}?exam_type=${examType}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to generate report card.');

        const { student_info, grades, attendance, total_score, average, rank, result } = data;
        
        const gradeRows = grades.map(g => `
            <tr>
                <td>${g.subject_name}</td>
                <td>${g.score !== null ? g.score : 'N/A'}</td>
            </tr>
        `).join('') || `<tr><td colspan="2">${t.report_card_no_grades || 'No grades found for this exam.'}</td></tr>`;

        const resultClass = result === 'Pass' ? 'result-pass' : 'result-fail';

        container.innerHTML = `
            <div class="report-card" id="printable-report-card">
                <div class="report-card-header">
                    <h3>${t.report_card_title || 'STUDENT REPORT CARD'}</h3>
                    <p>${student_info.academic_year || ''}</p>
                </div>
                <div class="report-card-student-info">
                    <div>
                        <p><strong>${t.report_card_student_name || 'Student Name:'}</strong></p>
                        <div class="report-card-student-names">
                            <div class="name-km">${student_info.name_km || ''}</div>
                            <div class="name-en">${student_info.name_en || ''}</div>
                            <div class="name-jp">${student_info.name_jp || ''}</div>
                        </div>
                        <p style="margin-top: 10px;"><strong>${t.report_card_dob || 'Date of Birth:'}</strong> ${student_info.dob}</p>
                    </div>
                    <div>
                        <p><strong>${t.report_card_class || 'Class:'}</strong> ${student_info.class_name}</p>
                        <p><strong>${t.report_card_teacher || 'Homeroom Teacher:'}</strong> ${student_info.teacher_name || 'N/A'}</p>
                    </div>
                </div>
                <div class="report-card-body">
                    <div class="report-card-section">
                        <h4>${t.report_card_performance || 'Academic Performance'} (${examType})</h4>
                        <table>
                            <thead><tr><th>${t.report_card_subject || 'Subject'}</th><th>${t.report_card_score || 'Score'}</th></tr></thead>
                            <tbody>${gradeRows}</tbody>
                        </table>
                    </div>
                    <div class="report-card-section">
                        <h4>${t.report_card_summary || 'Summary'}</h4>
                        <table class="summary-table">
                            <tr><td>${t.report_card_total_score || 'Total Score:'}</td><td>${total_score}</td></tr>
                            <tr><td>${t.report_card_average || 'Average:'}</td><td>${average}</td></tr>
                            <tr><td>${t.report_card_rank || 'Rank in Class:'}</td><td>${rank !== -1 ? rank : 'N/A'}</td></tr>
                            <tr><td>${t.report_card_result || 'Result:'}</td><td><span class="result-summary-box ${resultClass}">${result}</span></td></tr>
                        </table>
                        <hr>
                        <h4>${t.report_card_attendance || 'Attendance Summary'}</h4>
                        <table class="summary-table">
                            <tr><td>${t.report_card_present || 'Present:'}</td><td>${attendance.present} ${t.report_card_days || 'days'}</td></tr>
                            <tr><td>${t.report_card_absent || 'Absent:'}</td><td>${attendance.absent} ${t.report_card_days || 'days'}</td></tr>
                            <tr><td>${t.report_card_late || 'Late:'}</td><td>${attendance.late} ${t.report_card_days || 'days'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
            <div class="page-actions" style="justify-content: flex-end;">
                <button id="btn-print-report" class="btn"><i class="fa-solid fa-print"></i> ${t.report_card_print || 'Print Report Card'}</button>
            </div>
        `;

        document.getElementById('btn-print-report').addEventListener('click', () => {
             const reportContent = document.getElementById('printable-report-card').innerHTML;
             const printWindow = window.open('', '_blank', 'height=800,width=800');
             
             printWindow.document.write('<html><head><title>Student Report Card</title>');
             printWindow.document.write('<link rel="stylesheet" href="/static/style.css" type="text/css" media="all" />');
             printWindow.document.write(`
                <style>
                    body { 
                        font-family: "Kantumruy Pro", "Battambang", sans-serif;
                        -webkit-print-color-adjust: exact !important; /* For Chrome, Safari */
                        color-adjust: exact !important; /* For Firefox */
                    }
                    .report-card { border: 1px solid #ccc !important; box-shadow: none !important; }
                    .result-summary-box { color: #fff !important; padding: 4px 8px; border-radius: 6px; }
                    .result-pass { background-color: #10b981 !important; }
                    .result-fail { background-color: #ef4444 !important; }
                </style>
             `);
             printWindow.document.write('</head><body>');
             printWindow.document.write(reportContent);
             printWindow.document.write('</body></html>');
             
             setTimeout(() => { // Timeout to ensure styles are loaded
                printWindow.document.close();
                printWindow.focus(); 
                printWindow.print();
                printWindow.close();
             }, 750);
        });

    } catch (e) {
        showNotification(e.message, 'error');
        container.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}


// --- Student Profile Page ---
async function renderStudentProfile(studentId, t, lang) {
    const contentEl = document.getElementById('content');
    showLoader(contentEl);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/students/${studentId}`);
        if (!response.ok) throw new Error('Student not found.');
        const student = await response.json();

        const profilePhoto = student.photo_filename
            ? `<img src="${UPLOADS_URL}${student.photo_filename}" alt="${student.name}" class="profile-photo-large">`
            : '<div class="profile-photo-large-placeholder"></div>';

        const html = `
            <div class="profile-header">
                <button id="back-to-list" class="btn"><i class="fa-solid fa-arrow-left"></i> ${t.profile_back_to_list || 'Back to List'}</button>
                <h2>${t.profile_title || 'Student Profile'}</h2>
            </div>
            <div class="profile-container">
                <div class="profile-sidebar">
                    ${profilePhoto}
                    <h3>${student.name_km || student.name}</h3>
                    <p><strong>${t.profile_class || 'Class:'}</strong> ${student.class_name || 'Not Assigned'}</p>
                </div>
                <div class="profile-main">
                    <h4>${t.profile_personal_info || 'Personal Information'}</h4>
                    <table class="profile-table">
                        <tr><td><strong>Name (EN):</strong></td><td>${student.name_en || ''}</td></tr>
                        <tr><td><strong>Name (JP):</strong></td><td>${student.name_jp || ''}</td></tr>
                        <tr><td><strong>${t.student_dob || 'Date of Birth'}:</strong></td><td>${student.dob}</td></tr>
                        <tr><td><strong>${t.student_contact || 'Contact'}:</strong></td><td>${student.contact}</td></tr>
                        <tr><td><strong>${t.student_address || 'Address'}:</strong></td><td>${student.address || ''}</td></tr>
                    </table>
                    <hr>
                    <h4>${t.profile_parent_info || 'Parent/Guardian Information'}</h4>
                     <table class="profile-table">
                        <tr><td><strong>Name:</strong></td><td>${student.parent_name || ''}</td></tr>
                        <tr><td><strong>Contact:</strong></td><td>${student.parent_contact || ''}</td></tr>
                    </table>
                    <hr>
                    <div class="form-container">
                        <h3>${t.profile_generate_report || 'Generate Report Card'}</h3>
                        <div class="attendance-selector">
                            <div class="form-group">
                                <label>Exam Type:</label>
                                <select id="exam-type-report-card">
                                    <option value="Monthly">Monthly</option>
                                    <option value="Mid-Term">Mid-Term</option>
                                    <option value="Final">Final</option>
                                </select>
                            </div>
                            <button id="btn-generate-report-card" class="btn btn-submit"><i class="fa-solid fa-file-invoice"></i> Generate</button>
                        </div>
                    </div>
                    <div id="report-card-container"></div>
                </div>
            </div>`;
        contentEl.innerHTML = html;
        document.getElementById('back-to-list').addEventListener('click', () => renderStudentModule(contentEl, t, lang));
        document.getElementById('btn-generate-report-card').addEventListener('click', () => generateReportCard(studentId, t));
    } catch (e) {
        showNotification(e.message, 'error');
        renderStudentModule(contentEl, t, lang); // Go back to list on error
    }
}


// --- Main Student Module ---

function toggleForm(show, t) {
    const formContainer = document.getElementById('form-container-student');
    const toggleBtn = document.getElementById('btn-toggle-form');
    if (show) {
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = `<i class="fa-solid fa-times"></i> ${t.cancel || 'Cancel'}`;
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${t.form_title_add_student || 'Add New Student'}`;
        resetStudentForm(t);
    }
}

async function handleExport(format, lang) {
    const url = `${API_BASE_URL}/api/students/export/${format}?lang=${lang}`;
    const button = document.querySelector(`#btn-export-${format}`);
    if (!button) return;

    const originalText = button.innerHTML;
    button.innerHTML = 'Exporting...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(url);
        if (!response.ok) {
             const err = await response.json().catch(() => ({ message: 'Export failed due to a server error.' }));
             throw new Error(err.message);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `students_export_${lang}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showNotification('Export successful!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function handleStudentFormSubmit(event, t, lang) {
    event.preventDefault();
    const form = event.target;
    const studentId = form.elements.studentId.value;
    const formData = new FormData(form);
    const url = studentId ? `${API_BASE_URL}/api/students/${studentId}` : `${API_BASE_URL}/api/students`;
    const method = studentId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, { method: method, body: formData });
        if (response.ok) {
            showNotification(studentId ? 'Student updated successfully!' : 'Student added successfully!', 'success');
            toggleForm(false, t);
            await loadStudents(1, t, lang);
        } else {
            const data = await response.json();
            showNotification(data.message || 'An error occurred.', 'error');
        }
    } catch (error) {
        showNotification('Operation failed. Please try again.', 'error');
    }
}

function renderStudentTable(container, students, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    if (students.length === 0) {
        container.innerHTML = '<p>No students found.</p>';
        return;
    }
    
    let tableRows = '';
    students.forEach(student => {
        const photoCell = student.photo_filename ? `<img src="/uploads/${student.photo_filename}" alt="${student.name_km}" class="photo-cell">` : '<div class="photo-cell-placeholder"></div>';
        
        const actionButtons = isAdmin ? `
            <button class="btn btn-edit" data-id="${student.id}"><i class="fa-regular fa-pen-to-square"></i> ${t.edit}</button>
            <button class="btn btn-delete" data-id="${student.id}"><i class="fa-regular fa-trash-can"></i> ${t.delete}</button>` : '';
        
        tableRows += `<tr>
            <td>${photoCell}</td>
            <td><a href="#" class="link-student-profile" data-id="${student.id}">${student.name_km || ''}</a></td>
            <td>${student.name_en || ''}</td>
            <td>${student.name_jp || ''}</td>
            <td>${student.class_name || 'N/A'}</td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    });

    container.innerHTML = `
        <div class="table-responsive">
            <table id="student-table">
                <thead>
                    <tr>
                        <th>${t.photo}</th>
                        <th>${t.student_name_km}</th>
                        <th>${t.student_name_en}</th>
                        <th>${t.student_name_jp}</th>
                        <th>${t.class_name}</th>
                        <th>${t.actions}</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function loadStudents(page = 1, t, lang) {
    const contentEl = document.getElementById('content');
    const tableContainer = contentEl.querySelector('#student-table-container');
    const paginationContainer = contentEl.querySelector('#pagination-container');
    const searchInput = contentEl.querySelector('#search-student-input');
    const searchTerm = searchInput ? searchInput.value : '';

    showLoader(tableContainer);
    if(paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/students?search=${encodeURIComponent(searchTerm)}&page=${page}`);
        const result = await response.json();
        
        studentsCache = result.data;
        renderStudentTable(tableContainer, studentsCache, t);

        if(paginationContainer) {
            renderPagination(paginationContainer, result.current_page, result.total_pages, (newPage) => {
                loadStudents(newPage, t, lang);
            });
        }

    } catch (e) {
        showNotification('Failed to load students.', 'error');
        tableContainer.innerHTML = `<p style="color:red;">Failed to load students.</p>`;
    }
}

function editStudent(id, t) {
    const student = studentsCache.find(s => s.id === id);
    if (!student) return;
    
    resetStudentForm(t);
    toggleForm(true, t);

    const form = document.getElementById('student-form');
    document.getElementById('form-title-student').textContent = t.form_title_edit_student;
    
    form.elements.studentId.value = student.id;
    form.elements.name_km.value = student.name_km || student.name;
    form.elements.name_en.value = student.name_en || '';
    form.elements.name_jp.value = student.name_jp || '';
    form.elements.dob.value = new Date(student.dob).toISOString().split('T')[0];
    form.elements.contact.value = student.contact;
    form.elements.address.value = student.address;
    form.elements.parent_name.value = student.parent_name || '';
    form.elements.parent_contact.value = student.parent_contact || '';
    form.elements.class_id.value = student.class_id || "";
}

function resetStudentForm(t) {
    const form = document.getElementById('student-form');
    if(form) {
        form.reset();
        form.elements.studentId.value = '';
        document.getElementById('form-title-student').textContent = t.form_title_add_student;
    }
}

async function deleteStudent(id, t, lang) {
    if (!confirm(t.confirm_delete)) return;
    try {
        await fetchWithAuth(`${API_BASE_URL}/api/students/${id}`, { method: 'DELETE' });
        showNotification('Student deleted successfully!', 'success');
        await loadStudents(1, t, lang);
    } catch(e) {
        showNotification('Failed to delete student.', 'error');
    }
}

export async function renderStudentModule(contentEl, t, lang) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    
    let classOptions = '';
    if (isAdmin) {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/classes`);
            const result = await response.json();
            classesCache = result.data || result;
            classOptions = classesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        } catch (e) {
            showNotification('Failed to load classes for form.', 'error');
        }
    }

    const adminActionsHTML = isAdmin ? `
        <div id="form-container-student" class="form-container" style="display:none;">
            <h3 id="form-title-student">${t.form_title_add_student}</h3>
            <form id="student-form" enctype="multipart/form-data">
                <input type="hidden" id="student-id" name="studentId">
                <div class="form-group"><label for="name_km">${t.student_name_km || 'Name (Khmer)'}:</label><input type="text" id="name_km" name="name_km" required></div>
                <div class="form-group"><label for="name_en">${t.student_name_en || 'Name (English)'}:</label><input type="text" id="name_en" name="name_en"></div>
                <div class="form-group"><label for="name_jp">名前 (Japanese):</label><input type="text" id="name_jp" name="name_jp"></div>
                <div class="form-group"><label for="dob">${t.student_dob}:</label><input type="date" id="dob" name="dob" required></div>
                <div class="form-group"><label for="contact">${t.student_contact}:</label><input type="text" id="contact" name="contact" required></div>
                <div class="form-group"><label for="address">${t.student_address}:</label><textarea id="address" name="address"></textarea></div>
                <div class="form-group"><label for="parent_name">Parent Name:</label><input type="text" id="parent_name" name="parent_name"></div>
                <div class="form-group"><label for="parent_contact">Parent Contact:</label><input type="text" id="parent_contact" name="parent_contact"></div>
                <div class="form-group"><label for="class-select">${t.assign_class}:</label><select id="class-select" name="class_id"><option value="">-- ${t.please_select || 'None'} --</option>${classOptions}</select></div>
                <div class="form-group"><label for="photo">${t.photo}:</label><input type="file" id="photo" name="photo" accept="image/*"></div>
                <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.submit}</button>
            </form>
        </div>` : '';

    contentEl.innerHTML = `
        <h2>${t.student_list}</h2>
        <div class="page-actions">
            ${isAdmin ? `<button id="btn-toggle-form" class="btn btn-submit"><i class="fa-solid fa-user-plus"></i> ${t.form_title_add_student}</button>` : ''}
            <div class="search-controls">
                <input type="text" id="search-student-input" placeholder="Search by name...">
            </div>
            <div class="export-controls">
                <button id="btn-export-excel" class="btn"><i class="fa-regular fa-file-excel"></i> Export to Excel</button>
                <button id="btn-export-pdf" class="btn"><i class="fa-regular fa-file-pdf"></i> Export to PDF</button>
            </div>
        </div>
        ${adminActionsHTML}
        <div id="student-table-container" class="content-panel"></div>
        <div id="pagination-container" class="pagination-container"></div>
    `;

    const searchInput = document.getElementById('search-student-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadStudents(1, t, lang); 
        }, 300);
    });

    if (isAdmin) {
        document.getElementById('btn-toggle-form').addEventListener('click', () => {
            const formContainer = document.getElementById('form-container-student');
            const isVisible = formContainer.style.display === 'block';
            toggleForm(!isVisible, t);
        });
        
        document.getElementById('student-form').addEventListener('submit', (e) => handleStudentFormSubmit(e, t, lang));
    }
    
    document.getElementById('btn-export-excel').addEventListener('click', () => handleExport('excel', lang));
    document.getElementById('btn-export-pdf').addEventListener('click', () => handleExport('pdf', lang));
    
    contentEl.addEventListener('click', async (e) => {
        const profileLink = e.target.closest('.link-student-profile');
        if (profileLink) {
            e.preventDefault();
            const studentId = parseInt(profileLink.dataset.id);
            renderStudentProfile(studentId, t, lang);
            return;
        }

        if (isAdmin) {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                editStudent(parseInt(editBtn.dataset.id), t);
                return;
            }
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                await deleteStudent(parseInt(deleteBtn.dataset.id), t, lang);
                return;
            }
        }
    });

    await loadStudents(1, t, lang); 
}
