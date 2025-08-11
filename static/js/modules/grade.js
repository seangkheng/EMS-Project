// js/modules/grade.js (NEW MODULE)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader } from './ui.js';

let classesCache = [];
let subjectsCache = [];
let currentGradesCache = []; // Cache for export

async function saveGrades(t) {
    const form = document.getElementById('grade-entry-form');
    if (!form) return;

    const classId = form.dataset.classId;
    const subjectId = form.dataset.subjectId;
    const examType = form.dataset.examType;
    const gradeDate = form.dataset.gradeDate;

    const gradeInputs = form.querySelectorAll('.score-input');
    const grades = [];
    gradeInputs.forEach(input => {
        grades.push({
            student_id: parseInt(input.dataset.studentId),
            score: input.value
        });
    });

    const payload = { class_id: classId, subject_id: subjectId, exam_type: examType, grade_date: gradeDate, grades };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/grades`, {
            method: 'POST',
            body: payload
        });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
        } else {
            throw new Error(data.message || 'Failed to save grades.');
        }
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

// --- NEW: Handle Grade Sheet Export ---
async function handleGradeExport(t) {
    const form = document.getElementById('grade-entry-form');
    if (!form || currentGradesCache.length === 0) {
        showNotification('Please load a grade sheet first.', 'warning');
        return;
    }

    const lang = localStorage.getItem('ems-lang') || 'km';
    const className = classesCache.find(c => c.id == form.dataset.classId)?.name;
    const subjectName = subjectsCache.find(s => s.id == form.dataset.subjectId)?.name;

    // Get current values from the form for export
    const gradeInputs = form.querySelectorAll('.score-input');
    const currentScores = {};
    gradeInputs.forEach(input => {
        currentScores[input.dataset.studentId] = input.value;
    });
    
    const exportData = currentGradesCache.map(student => ({
        ...student,
        score: currentScores[student.student_id] || ''
    }));

    const payload = {
        grades: exportData,
        className: className,
        subjectName: subjectName,
        examType: form.dataset.examType,
        lang: lang
    };

    const button = document.getElementById('btn-export-grades');
    const originalText = button.innerHTML;
    button.innerHTML = 'Exporting...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/grades/export/excel`, {
            method: 'POST',
            body: payload
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Export failed.');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Grade_Sheet_${className}.xlsx`;
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


async function loadGradeEntryForm(t) {
    const classId = document.getElementById('class-select-grade').value;
    const subjectId = document.getElementById('subject-select-grade').value;
    const examType = document.getElementById('exam-type-select').value;
    const gradeDate = document.getElementById('grade-date').value;
    const container = document.getElementById('grade-entry-container');

    if (!classId || !subjectId || !examType || !gradeDate) {
        showNotification('Please select all fields to load students.', 'warning');
        return;
    }

    showLoader(container);

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/grades/class-view?class_id=${classId}&subject_id=${subjectId}&exam_type=${examType}&grade_date=${gradeDate}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to load students for grading.');
        }
        const students = await response.json();
        currentGradesCache = students; // Cache the loaded students for export

        if (students.length === 0) {
            container.innerHTML = '<p>No students enrolled in this class.</p>';
            return;
        }

        const studentRows = students.map(s => `
            <tr>
                <td>${s.student_name_km || ''}</td>
                <td>${s.student_name_en || ''}</td>
                <td>
                    <input type="number" class="score-input" data-student-id="${s.student_id}" value="${s.score !== null ? s.score : ''}" min="0" max="100" step="0.5">
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <form id="grade-entry-form" 
                  data-class-id="${classId}" 
                  data-subject-id="${subjectId}" 
                  data-exam-type="${examType}" 
                  data-grade-date="${gradeDate}">
                <table id="grade-entry-table">
                    <thead>
                        <tr>
                            <th>${t.student_name_km || 'Name (Khmer)'}</th>
                            <th>${t.student_name_en || 'Name (English)'}</th>
                            <th>${t.report_card_score || 'Score'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentRows}
                    </tbody>
                </table>
                <div class="form-actions">
                    <button type="button" id="btn-export-grades" class="btn"><i class="fa-regular fa-file-excel"></i> ${t.export_excel || 'Export to Excel'}</button>
                    <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.save_attendance || 'Save Grades'}</button>
                </div>
            </form>
        `;
        
        document.getElementById('grade-entry-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveGrades(t);
        });

        document.getElementById('btn-export-grades').addEventListener('click', () => handleGradeExport(t));

    } catch (e) {
        showNotification(e.message, 'error');
        container.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}

export async function renderGradeModule(contentEl, t) {
    showLoader(contentEl);
    try {
        const [classesRes, subjectsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/classes`),
            fetchWithAuth(`${API_BASE_URL}/api/subjects`)
        ]);
        if (!classesRes.ok || !subjectsRes.ok) throw new Error('Failed to load initial data.');

        const classesResult = await classesRes.json();
        const subjectsResult = await subjectsRes.json();
        
        classesCache = classesResult.data || classesResult;
        subjectsCache = subjectsResult.data || subjectsResult;


        const classOptions = classesCache.map(c => `<option value="${c.id}">${c.name} - ${c.academic_year}</option>`).join('');
        const subjectOptions = subjectsCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        const today = new Date().toISOString().split('T')[0];

        const html = `
            <h2>${t.module_gradebook || 'Gradebook'}</h2>
            <div class="form-container">
                <div class="attendance-selector">
                    <div class="form-group">
                        <label>Select Class:</label>
                        <select id="class-select-grade">
                            <option value="">-- Please Select --</option>
                            ${classOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Select Subject:</label>
                        <select id="subject-select-grade">
                            <option value="">-- Please Select --</option>
                            ${subjectOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Exam Type:</label>
                        <select id="exam-type-select">
                            <option value="Monthly">Monthly</option>
                            <option value="Mid-Term">Mid-Term</option>
                            <option value="Final">Final</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="grade-date" value="${today}">
                    </div>
                    <button id="load-grades-btn" class="btn"><i class="fa-solid fa-users"></i> Load Students</button>
                </div>
            </div>
            <div id="grade-entry-container" class="content-panel"></div>
        `;
        contentEl.innerHTML = html;

        document.getElementById('load-grades-btn').addEventListener('click', () => loadGradeEntryForm(t));

    } catch (e) {
        showNotification(e.message, 'error');
        contentEl.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}
