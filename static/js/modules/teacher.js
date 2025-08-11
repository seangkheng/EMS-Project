// js/modules/teacher.js (Refactored with Profile Page, Search, and Role-Based UI)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader, renderPagination } from './ui.js';

let teachersCache = [];
let searchTimeout = null;

// --- Teacher Profile Page ---
async function renderTeacherProfile(teacherId, t) {
    const contentEl = document.getElementById('content');
    showLoader(contentEl);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teachers/${teacherId}`);
        if (!response.ok) throw new Error('Teacher not found.');
        const teacher = await response.json();

        const profilePhoto = teacher.photo_filename
            ? `<img src="/uploads/${teacher.photo_filename}" alt="${teacher.name}" class="profile-photo-large">`
            : '<div class="profile-photo-large-placeholder"></div>';

        let classesHtml = '<h4>Assigned Classes</h4>';
        if (teacher.assigned_classes && teacher.assigned_classes.length > 0) {
            const classRows = teacher.assigned_classes.map(cls => `
                <tr>
                    <td>${cls.name}</td>
                    <td>${cls.academic_year}</td>
                    <td>${cls.subject_name || 'N/A'}</td>
                </tr>
            `).join('');
            classesHtml += `
                <div class="table-responsive">
                    <table class="profile-table">
                        <thead><tr><th>Class Name</th><th>Academic Year</th><th>Subject</th></tr></thead>
                        <tbody>${classRows}</tbody>
                    </table>
                </div>
                `;
        } else {
            classesHtml += '<p>No classes assigned.</p>';
        }

        const html = `
            <div class="profile-header">
                <button id="back-to-list" class="btn"><i class="fa-solid fa-arrow-left"></i> Back to List</button>
                <h2>Teacher Profile</h2>
            </div>
            <div class="profile-container">
                <div class="profile-sidebar">
                    ${profilePhoto}
                    <h3>${teacher.name}</h3>
                    <p><strong>Specialty:</strong> ${teacher.specialty || 'N/A'}</p>
                </div>
                <div class="profile-main">
                    <h4>Contact Information</h4>
                    <table class="profile-table">
                        <tr><td><strong>Email:</strong></td><td>${teacher.email}</td></tr>
                        <tr><td><strong>Contact:</strong></td><td>${teacher.contact}</td></tr>
                        <tr><td><strong>Hire Date:</strong></td><td>${teacher.hire_date}</td></tr>
                    </table>
                    <hr>
                    ${classesHtml}
                </div>
            </div>`;
        contentEl.innerHTML = html;
        document.getElementById('back-to-list').addEventListener('click', () => renderTeacherModule(contentEl, t));
    } catch (e) {
        showNotification(e.message, 'error');
        renderTeacherModule(contentEl, t);
    }
}


// --- Main Teacher Module ---
function toggleForm(show, t) {
    const formContainer = document.getElementById('form-container-teacher');
    const toggleBtn = document.getElementById('btn-toggle-form');
    if (show) {
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = `<i class="fa-solid fa-times"></i> ${t.cancel || 'Cancel'}`;
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${t.form_title_add_teacher || 'Add New Teacher'}`;
        resetTeacherForm(t);
    }
}

async function handleTeacherFormSubmit(event, t) {
    event.preventDefault();
    const form = event.target;
    const teacherId = form.elements.teacherId.value;
    const formData = new FormData(form);
    const url = teacherId ? `${API_BASE_URL}/api/teachers/${teacherId}` : `${API_BASE_URL}/api/teachers`;
    const method = teacherId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, { method: method, body: formData });
        if (response.ok) {
            showNotification(teacherId ? 'Teacher updated successfully!' : 'Teacher added successfully!', 'success');
            toggleForm(false, t);
            await loadTeachers(1, t);
        } else {
            const data = await response.json();
            showNotification(data.message || 'An error occurred.', 'error');
        }
    } catch (error) {
        showNotification('Operation failed. Please try again.', 'error');
    }
}

function renderTeacherTable(container, teachers, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    if(teachers.length === 0) {
        container.innerHTML = '<p>No teachers found.</p>';
        return;
    }
    
    let tableRows = '';
    teachers.forEach(teacher => {
        const photoCell = teacher.photo_filename ? `<img src="/uploads/${teacher.photo_filename}" alt="${teacher.name}" class="photo-cell">` : '<div class="photo-cell-placeholder"></div>';
        
        const actionButtons = isAdmin ? `
            <button class="btn btn-edit" data-id="${teacher.id}"><i class="fa-regular fa-pen-to-square"></i> ${t.edit}</button>
            <button class="btn btn-delete" data-id="${teacher.id}"><i class="fa-regular fa-trash-can"></i> ${t.delete}</button>` : '';
        
        tableRows += `<tr>
            <td>${photoCell}</td>
            <td><a href="#" class="link-teacher-profile" data-id="${teacher.id}">${teacher.name}</a></td>
            <td>${teacher.email}</td>
            <td>${teacher.specialty || ''}</td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    });
    
    container.innerHTML = `
        <div class="table-responsive">
            <table id="teacher-table">
                <thead>
                    <tr>
                        <th>${t.photo}</th>
                        <th>${t.teacher_name} / Name / 氏名</th>
                        <th>${t.teacher_email}</th>
                        <th>${t.teacher_specialty}</th>
                        <th>${t.actions}</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function loadTeachers(page = 1, t) {
    const tableContainer = document.getElementById('teacher-table-container');
    const paginationContainer = document.getElementById('pagination-container');
    const searchInput = document.getElementById('search-teacher-input');
    const searchTerm = searchInput ? searchInput.value : '';

    showLoader(tableContainer);
    if(paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teachers?search=${encodeURIComponent(searchTerm)}&page=${page}`);
        const result = await response.json();
        teachersCache = result.data;
        renderTeacherTable(tableContainer, teachersCache, t);

        if(paginationContainer) {
            renderPagination(paginationContainer, result.current_page, result.total_pages, (newPage) => {
                loadTeachers(newPage, t);
            });
        }
    } catch (e) {
        showNotification('Failed to load teachers.', 'error');
    }
}

function editTeacher(id, t) {
    const teacher = teachersCache.find(tc => tc.id === id);
    if (!teacher) return;
    
    resetTeacherForm(t);
    toggleForm(true, t);
    
    const form = document.getElementById('teacher-form');
    document.getElementById('form-title-teacher').textContent = t.form_title_edit_teacher;

    form.elements.teacherId.value = teacher.id;
    form.elements.name.value = teacher.name;
    form.elements.email.value = teacher.email;
    form.elements.contact.value = teacher.contact;
    form.elements.specialty.value = teacher.specialty;
    form.elements.hire_date.value = new Date(teacher.hire_date).toISOString().split('T')[0];
}

function resetTeacherForm(t) {
    const form = document.getElementById('teacher-form');
    if(form) {
        form.reset();
        form.elements.teacherId.value = '';
        document.getElementById('form-title-teacher').textContent = t.form_title_add_teacher;
    }
}

async function deleteTeacher(id, t) {
    if (!confirm(t.confirm_delete)) return;
    try {
        await fetchWithAuth(`${API_BASE_URL}/api/teachers/${id}`, { method: 'DELETE' });
        showNotification('Teacher deleted successfully!', 'success');
        await loadTeachers(1, t);
    } catch(e) {
        showNotification('Failed to delete teacher.', 'error');
    }
}

export async function renderTeacherModule(contentEl, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    
    const adminActionsHTML = isAdmin ? `
        <div id="form-container-teacher" class="form-container" style="display:none;">
            <h3 id="form-title-teacher">${t.form_title_add_teacher}</h3>
            <form id="teacher-form" enctype="multipart/form-data">
                <input type="hidden" id="teacher-id" name="teacherId">
                <div class="form-group"><label for="name">${t.teacher_name}:</label><input type="text" id="name" name="name" required></div>
                <div class="form-group"><label for="email">${t.teacher_email}:</label><input type="email" id="email" name="email" required></div>
                <div class="form-group"><label for="contact">${t.teacher_contact}:</label><input type="text" id="contact" name="contact" required></div>
                <div class="form-group"><label for="specialty">${t.teacher_specialty}:</label><input type="text" id="specialty" name="specialty"></div>
                <div class="form-group"><label for="hire_date">${t.teacher_hire_date}:</label><input type="date" id="hire_date" name="hire_date"></div>
                <div class="form-group"><label for="photo">${t.photo}:</label><input type="file" id="photo" name="photo" accept="image/*"></div>
                <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.submit}</button>
            </form>
        </div>` : '';

    contentEl.innerHTML = `
        <h2>${t.teacher_list}</h2>
        <div class="page-actions">
            ${isAdmin ? `<button id="btn-toggle-form" class="btn btn-submit"><i class="fa-solid fa-user-plus"></i> ${t.form_title_add_teacher}</button>` : ''}
            <div class="search-controls">
                <input type="text" id="search-teacher-input" placeholder="Search by name or email...">
            </div>
        </div>
        ${adminActionsHTML}
        <div id="teacher-table-container" class="content-panel"></div>
        <div id="pagination-container" class="pagination-container"></div>
    `;

    const searchInput = document.getElementById('search-teacher-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadTeachers(1, t); 
        }, 300);
    });

    if (isAdmin) {
        document.getElementById('btn-toggle-form').addEventListener('click', () => {
            const formContainer = document.getElementById('form-container-teacher');
            const isVisible = formContainer.style.display === 'block';
            toggleForm(!isVisible, t);
        });

        document.getElementById('teacher-form').addEventListener('submit', (e) => handleTeacherFormSubmit(e, t));
    }
        
    contentEl.addEventListener('click', async (e) => {
        const profileLink = e.target.closest('.link-teacher-profile');
        if (profileLink) {
            e.preventDefault();
            renderTeacherProfile(parseInt(profileLink.dataset.id), t);
            return;
        }
        if (isAdmin) {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                editTeacher(parseInt(editBtn.dataset.id), t);
            }
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                await deleteTeacher(parseInt(deleteBtn.dataset.id), t);
            }
        }
    });

    await loadTeachers(1, t);
}
