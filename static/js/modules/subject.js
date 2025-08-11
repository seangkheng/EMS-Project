// js/modules/subject.js (Refactored for Cleaner UI)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader, renderPagination } from './ui.js';

let subjectsCache = [];
let searchTimeout = null;

function toggleForm(show, t) {
    const formContainer = document.getElementById('form-container-subject');
    const toggleBtn = document.getElementById('btn-toggle-form');
    if (show) {
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = `<i class="fa-solid fa-times"></i> ${t.cancel || 'Cancel'}`;
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = `<i class="fa-solid fa-plus-circle"></i> ${t.form_title_add_subject || 'Add New Subject'}`;
        resetSubjectForm(t);
    }
}

async function handleSubjectFormSubmit(event, t) {
    event.preventDefault();
    const form = event.target;
    const subjectId = form.elements.subjectId.value;
    const subjectData = {
        name: form.querySelector('#subject-name').value,
        description: form.querySelector('#subject-description').value
    };
    const url = subjectId ? `${API_BASE_URL}/api/subjects/${subjectId}` : `${API_BASE_URL}/api/subjects`;
    const method = subjectId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, { method, body: subjectData });
        if (response.ok) {
            showNotification(subjectId ? 'Subject updated successfully!' : 'Subject added successfully!', 'success');
            toggleForm(false, t);
            await loadSubjects(1, t);
        } else {
            const data = await response.json();
            showNotification(data.message || 'An error occurred.', 'error');
        }
    } catch (error) {
        showNotification('Operation failed. Please try again.', 'error');
    }
}

function renderSubjectTable(container, subjects, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    if (subjects.length === 0) {
        container.innerHTML = '<p>No subjects found.</p>';
        return;
    }

    let tableRows = '';
    subjects.forEach(subject => {
        const actionButtons = isAdmin ? `
            <button class="btn btn-edit" data-id="${subject.id}"><i class="fa-regular fa-pen-to-square"></i> ${t.edit}</button>
            <button class="btn btn-delete" data-id="${subject.id}"><i class="fa-regular fa-trash-can"></i> ${t.delete}</button>` : '';
        tableRows += `<tr>
            <td>${subject.name}</td>
            <td>${subject.description || ''}</td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    });
    
    container.innerHTML = `
        <div class="table-responsive">
            <table id="subject-table">
                <thead>
                    <tr>
                        <th>${t.subject_name} / Subject Name / 科目名</th>
                        <th>${t.subject_description}</th>
                        <th>${t.actions}</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function loadSubjects(page = 1, t) {
    const tableContainer = document.getElementById('subject-table-container');
    const paginationContainer = document.getElementById('pagination-container');

    showLoader(tableContainer);
    if(paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/subjects?page=${page}`);
        const result = await response.json();
        subjectsCache = result.data;
        renderSubjectTable(tableContainer, subjectsCache, t);
        
        if(paginationContainer) {
            renderPagination(paginationContainer, result.current_page, result.total_pages, (newPage) => {
                loadSubjects(newPage, t);
            });
        }
    } catch (e) {
        showNotification('Failed to load subjects.', 'error');
        container.innerHTML = '<p style="color:red;">Failed to load subjects.</p>';
    }
}

function editSubject(id, t) {
    const subject = subjectsCache.find(s => s.id === id);
    if (!subject) return;

    resetSubjectForm(t);
    toggleForm(true, t);

    const form = document.getElementById('subject-form');
    document.getElementById('form-title-subject').textContent = t.form_title_edit_subject || "Edit Subject";
    
    form.elements.subjectId.value = subject.id;
    form.querySelector('#subject-name').value = subject.name;
    form.querySelector('#subject-description').value = subject.description;
}

function resetSubjectForm(t) {
    const form = document.getElementById('subject-form');
    if(form) {
        form.reset();
        form.elements.subjectId.value = '';
        document.getElementById('form-title-subject').textContent = t.form_title_add_subject || "Add New Subject";
    }
}

async function deleteSubject(id, t) {
    if (!confirm(t.confirm_delete)) return;
    try {
        await fetchWithAuth(`${API_BASE_URL}/api/subjects/${id}`, { method: 'DELETE' });
        showNotification('Subject deleted successfully!', 'success');
        await loadSubjects(1, t);
    } catch(e) {
        showNotification('Failed to delete subject.', 'error');
    }
}

export async function renderSubjectModule(contentEl, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';

    const adminActionsHTML = isAdmin ? `
        <div id="form-container-subject" class="form-container" style="display:none;">
            <h3 id="form-title-subject">${t.form_title_add_subject}</h3>
            <form id="subject-form">
                <input type="hidden" id="subject-id" name="subjectId">
                <div class="form-group"><label for="subject-name">${t.subject_name}:</label><input type="text" id="subject-name" required></div>
                <div class="form-group"><label for="subject-description">${t.subject_description}:</label><textarea id="subject-description"></textarea></div>
                <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.submit}</button>
            </form>
        </div>` : '';
    
    contentEl.innerHTML = `
        <h2>${t.subject_list || "Subject List"}</h2>
        <div class="page-actions">
            ${isAdmin ? `<button id="btn-toggle-form" class="btn btn-submit"><i class="fa-solid fa-plus-circle"></i> ${t.form_title_add_subject}</button>` : ''}
        </div>
        ${adminActionsHTML}
        <div id="subject-table-container" class="content-panel"></div>
        <div id="pagination-container" class="pagination-container"></div>
    `;
    
    if (isAdmin) {
        document.getElementById('btn-toggle-form').addEventListener('click', () => {
            const formContainer = document.getElementById('form-container-subject');
            const isVisible = formContainer.style.display === 'block';
            toggleForm(!isVisible, t);
        });

        document.getElementById('subject-form').addEventListener('submit', (e) => handleSubjectFormSubmit(e, t));
        
        contentEl.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                editSubject(parseInt(editBtn.dataset.id), t);
            }
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                await deleteSubject(parseInt(deleteBtn.dataset.id), t);
            }
        });
    }

    await loadSubjects(1, t);
}
