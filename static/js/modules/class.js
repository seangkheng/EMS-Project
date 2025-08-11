// js/modules/class.js (Refactored for Cleaner UI + Enrollment Manager + Full CRUD)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader, renderPagination } from './ui.js';

let classesCache = [];
let teachersCache = [];
let subjectsCache = [];
let allStudentsCache = [];
let searchTimeout = null;

// --- Enrollment Manager ---
async function handleEnrollmentAction(action, classId, t, payload) {
    try {
        let response;
        if(action === 'add') {
            response = await fetchWithAuth(`${API_BASE_URL}/api/enrollments`, {
                method: 'POST', body: { student_id: payload, class_id: classId }
            });
        } else { // remove
            response = await fetchWithAuth(`${API_BASE_URL}/api/enrollments/${payload}`, { method: 'DELETE' });
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Action failed');
        }
        showNotification('Success!', 'success');
        await renderEnrollManager(classId, t); // Re-render the manager view
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

async function renderEnrollManager(classId, t) {
    const contentEl = document.getElementById('content');
    showLoader(contentEl);
    
    try {
        const [enrolledRes, allStudentsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/classes/${classId}/students`),
            fetchWithAuth(`${API_BASE_URL}/api/students`)
        ]);
        if (!enrolledRes.ok || !allStudentsRes.ok) throw new Error('Failed to load student data.');

        const enrolledStudents = await enrolledRes.json();
        const allStudentsResult = await allStudentsRes.json();
        allStudentsCache = allStudentsResult.data || [];
        
        const enrolledIds = new Set(enrolledStudents.map(s => s.id));
        const availableStudents = allStudentsCache.filter(s => !enrolledIds.has(s.id));
        
        const availableOptions = availableStudents.map(s => `<option value="${s.id}">${s.name_km || s.name}</option>`).join('');

        const enrolledRows = enrolledStudents.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.contact || ''}</td>
                <td>
                    <button class="btn btn-delete btn-remove-enroll" data-enroll-id="${s.enrollment_id}">
                        <i class="fa-regular fa-trash-can"></i> Remove
                    </button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="3">${t.no_students_in_class}</td></tr>`;

        const cls = classesCache.find(c => c.id === classId);

        const html = `
            <div class="profile-header">
                <button id="back-to-classes" class="btn"><i class="fa-solid fa-arrow-left"></i> Back to Class List</button>
                <h2>Manage Students: ${cls ? cls.name : ''}</h2>
            </div>
            <div class="form-container">
                <h3>Add Student to Class</h3>
                <div class="enroll-controls">
                    <select id="student-to-enroll">
                        <option value="">-- Select a student --</option>
                        ${availableOptions}
                    </select>
                    <button id="btn-add-enroll" class="btn btn-submit"><i class="fa-solid fa-plus"></i> Add Student</button>
                </div>
            </div>
            <div class="content-panel">
                <h3>Enrolled Students</h3>
                <div class="table-responsive">
                    <table>
                        <thead><tr><th>Name</th><th>Contact</th><th>Actions</th></tr></thead>
                        <tbody>${enrolledRows}</tbody>
                    </table>
                </div>
            </div>`;
        contentEl.innerHTML = html;

        document.getElementById('back-to-classes').addEventListener('click', () => renderClassModule(contentEl, t));
        
        document.getElementById('btn-add-enroll').addEventListener('click', () => {
            const studentId = document.getElementById('student-to-enroll').value;
            if (studentId) {
                handleEnrollmentAction('add', classId, t, parseInt(studentId));
            }
        });

        contentEl.querySelectorAll('.btn-remove-enroll').forEach(btn => {
            btn.addEventListener('click', () => {
                const enrollId = parseInt(btn.dataset.enrollId);
                handleEnrollmentAction('remove', classId, t, enrollId);
            });
        });

    } catch (e) {
        showNotification(e.message, 'error');
        renderClassModule(contentEl, t);
    }
}


// --- Main Class Module ---

function toggleForm(show, t) {
    const formContainer = document.getElementById('form-container-class');
    const toggleBtn = document.getElementById('btn-toggle-form');
    if (show) {
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = `<i class="fa-solid fa-times"></i> ${t.cancel || 'Cancel'}`;
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = `<i class="fa-solid fa-plus-circle"></i> ${t.form_title_add_class || 'Add New Class'}`;
        resetClassForm(t);
    }
}

async function handleClassFormSubmit(event, t) {
    event.preventDefault();
    const form = event.target;
    const classId = form.elements.classId.value;
    const classData = {
        name: form.elements.name.value,
        academic_year: form.elements.academic_year.value,
        teacher_id: form.elements.teacher_id.value,
        subject_id: form.elements.subject_id.value
    };
    const url = classId ? `${API_BASE_URL}/api/classes/${classId}` : `${API_BASE_URL}/api/classes`;
    const method = classId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, { method, body: classData });
        if (response.ok) {
            showNotification(classId ? 'Class updated successfully!' : 'Class added successfully!', 'success');
            toggleForm(false, t);
            await loadClasses(1, t);
        } else {
            const data = await response.json();
            showNotification(data.message || 'An error occurred.', 'error');
        }
    } catch (error) {
        showNotification('Operation failed. Please try again.', 'error');
    }
}


function renderClassTable(container, classes, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    if(classes.length === 0){
        container.innerHTML = '<p>No classes found.</p>';
        return;
    }
    
    let tableRows = '';
    classes.forEach(cls => {
        const manageStudentsButton = `<button class="btn btn-manage-students" data-id="${cls.id}"><i class="fa-solid fa-user-plus"></i> Manage Students</button>`;
        const actionButtons = isAdmin ? `
            <button class="btn btn-edit" data-id="${cls.id}"><i class="fa-regular fa-pen-to-square"></i> ${t.edit}</button>
            <button class="btn btn-delete" data-id="${cls.id}"><i class="fa-regular fa-trash-can"></i> ${t.delete}</button>
            ${manageStudentsButton}
            ` : manageStudentsButton;
        tableRows += `<tr>
            <td>${cls.name}</td>
            <td>${cls.academic_year}</td>
            <td>${cls.teacher_name || 'N/A'}</td>
            <td>${cls.subject_name || 'N/A'}</td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    });

    container.innerHTML = `
        <div class="table-responsive">
            <table id="class-table">
                <thead><tr><th>${t.class_name}</th><th>${t.academic_year}</th><th>${t.teacher}</th><th>${t.subject}</th><th>${t.actions}</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function loadClasses(page = 1, t) {
    const tableContainer = document.getElementById('class-table-container');
    const paginationContainer = document.getElementById('pagination-container');
    const searchInput = document.getElementById('search-class-input');
    const searchTerm = searchInput ? searchInput.value : '';
    
    showLoader(tableContainer);
    if(paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/classes?search=${encodeURIComponent(searchTerm)}&page=${page}`);
        const result = await response.json();
        classesCache = result.data;
        renderClassTable(tableContainer, classesCache, t);

        if(paginationContainer) {
            renderPagination(paginationContainer, result.current_page, result.total_pages, (newPage) => {
                loadClasses(newPage, t);
            });
        }
    } catch (e) {
        showNotification('Failed to load classes.', 'error');
    }
}

function editClass(id, t) {
    const cls = classesCache.find(c => c.id === id);
    if (!cls) return;

    resetClassForm(t);
    toggleForm(true, t);

    const form = document.getElementById('class-form');
    document.getElementById('form-title-class').textContent = t.form_title_edit_class;
    
    form.elements.classId.value = cls.id;
    form.elements.name.value = cls.name;
    form.elements.academic_year.value = cls.academic_year;
    form.elements.teacher_id.value = cls.teacher_id || '';
    form.elements.subject_id.value = cls.subject_id || '';
}

function resetClassForm(t) {
    const form = document.getElementById('class-form');
    if(form) {
        form.reset();
        form.elements.classId.value = '';
        document.getElementById('form-title-class').textContent = t.form_title_add_class;
    }
}

async function deleteClass(id, t) {
    if (!confirm(t.confirm_delete)) return;
    try {
        await fetchWithAuth(`${API_BASE_URL}/api/classes/${id}`, { method: 'DELETE' });
        showNotification('Class deleted successfully!', 'success');
        await loadClasses(1, t);
    } catch(e) {
        showNotification('Failed to delete class.', 'error');
    }
}

export async function renderClassModule(contentEl, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    let adminActionsHTML = '';

    if (isAdmin) {
        try {
            const [teachersRes, subjectsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/api/teachers`),
                fetchWithAuth(`${API_BASE_URL}/api/subjects`)
            ]);
            const teachersResult = await teachersRes.json();
            const subjectsResult = await subjectsRes.json();
            teachersCache = teachersResult.data || [];
            subjectsCache = subjectsResult.data || [];

            const teacherOptions = teachersCache.map(tc => `<option value="${tc.id}">${tc.name}</option>`).join('');
            const subjectOptions = subjectsCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

            adminActionsHTML = `
                <div id="form-container-class" class="form-container" style="display:none;">
                    <h3 id="form-title-class">${t.form_title_add_class}</h3>
                    <form id="class-form">
                        <input type="hidden" name="classId">
                        <div class="form-group"><label>${t.class_name}:</label><input type="text" name="name" required></div>
                        <div class="form-group"><label>${t.academic_year}:</label><input type="text" name="academic_year" required></div>
                        <div class="form-group"><label>${t.assign_teacher}:</label><select name="teacher_id"><option value="">-- ${t.please_select} --</option>${teacherOptions}</select></div>
                        <div class="form-group"><label>${t.assign_subject}:</label><select name="subject_id"><option value="">-- ${t.please_select} --</option>${subjectOptions}</select></div>
                        <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.submit}</button>
                    </form>
                </div>`;
        } catch (e) {
            showNotification('Failed to load data for class form.', 'error');
        }
    }
    
    contentEl.innerHTML = `
        <h2>${t.module_academic || "Class Management"}</h2>
        <div class="page-actions">
            ${isAdmin ? `<button id="btn-toggle-form" class="btn btn-submit"><i class="fa-solid fa-plus-circle"></i> ${t.form_title_add_class}</button>` : ''}
            <div class="search-controls">
                <input type="text" id="search-class-input" placeholder="Search by name or year...">
            </div>
        </div>
        ${adminActionsHTML}
        <div id="class-table-container" class="content-panel"></div>
        <div id="pagination-container" class="pagination-container"></div>
    `;
    
    const searchInput = document.getElementById('search-class-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadClasses(1, t);
        }, 300);
    });
        
    if (isAdmin) {
        document.getElementById('btn-toggle-form').addEventListener('click', () => {
            const formContainer = document.getElementById('form-container-class');
            const isVisible = formContainer.style.display === 'block';
            toggleForm(!isVisible, t);
        });
        document.getElementById('class-form').addEventListener('submit', (e) => handleClassFormSubmit(e, t));
    }

    contentEl.addEventListener('click', async (e) => {
        const manageBtn = e.target.closest('.btn-manage-students');
        if(manageBtn){
            const classId = parseInt(manageBtn.dataset.id);
            renderEnrollManager(classId, t);
            return;
        }
        if (isAdmin) {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                editClass(parseInt(editBtn.dataset.id), t);
            }
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                await deleteClass(parseInt(deleteBtn.dataset.id), t);
            }
        }
    });

    await loadClasses(1, t);
}
