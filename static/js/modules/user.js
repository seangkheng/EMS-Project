// js/modules/user.js (Refactored for Cleaner UI)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader, renderPagination } from './ui.js';

let usersCache = [];

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function toggleForm(show, t) {
    const formContainer = document.getElementById('form-container-user');
    const toggleBtn = document.getElementById('btn-toggle-form');
    if (show) {
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = `<i class="fa-solid fa-times"></i> ${t.cancel || 'Cancel'}`;
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${t.register || 'Register New User'}`;
        resetUserForm(t);
    }
}


async function handleUserFormSubmit(event, t) {
    event.preventDefault();
    const form = event.target;
    const userId = form.elements.userId.value;
    
    if (!userId) {
        const userData = {
            username: form.querySelector('#username').value,
            password: form.querySelector('#password').value,
            email: form.querySelector('#email').value,
            full_name: form.querySelector('#full-name').value,
            role: form.querySelector('#role').value
        };
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/register`, { method: 'POST', body: userData });
            const data = await response.json();
            if (response.ok) {
                showNotification(data.message, 'success');
                toggleForm(false, t);
                await loadUsers(1, t);
            } else {
                showNotification(data.message || 'An error occurred during registration.', 'error');
            }
        } catch (error) {
            showNotification('Registration failed.', 'error');
        }
    } else { 
        const updateData = {
            role: form.querySelector('#role').value,
            is_active: form.querySelector('#is_active').checked
        };
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/users/${userId}`, { method: 'PUT', body: updateData });
            if (response.ok) {
                showNotification('User updated successfully!', 'success');
                toggleForm(false, t);
                await loadUsers(1, t);
            } else {
                 const errorData = await response.json();
                 showNotification(errorData.message || "Update failed", 'error');
            }
        } catch(e) {
            showNotification('Failed to update user.', 'error');
        }
    }
}

function renderUserTable(container, users, t) {
    if (!container) return;
    container.innerHTML = '';
    const currentUserId = parseJwt(localStorage.getItem('ems-token'))?.id;

    if(users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
    }

    let tableRows = '';
    users.forEach(user => {
        const statusText = user.is_active ? 'Active' : 'Inactive';
        const statusColor = user.is_active ? 'var(--ok)' : 'var(--err)';
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A';
        
        const actionButtons = user.id !== currentUserId ? `
            <button class="btn btn-edit" data-id="${user.id}"><i class="fa-regular fa-pen-to-square"></i> ${t.edit}</button>
            <button class="btn btn-delete" data-id="${user.id}"><i class="fa-regular fa-trash-can"></i> ${t.delete}</button>` : '';

        tableRows += `<tr>
            <td>${user.full_name}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${statusText}</td>
            <td>${lastLogin}</td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    });

    container.innerHTML = `
        <div class="table-responsive">
            <table id="user-table">
                <thead>
                    <tr>
                        <th>${t.full_name} / Full Name / 氏名</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>${t.actions}</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function loadUsers(page = 1, t) {
    const tableContainer = document.getElementById('user-table-container');
    const paginationContainer = document.getElementById('pagination-container');

    showLoader(tableContainer);
    if(paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/users?page=${page}`);
        const result = await response.json();
        usersCache = result.data;
        renderUserTable(tableContainer, usersCache, t);

        if(paginationContainer) {
            renderPagination(paginationContainer, result.current_page, result.total_pages, (newPage) => {
                loadUsers(newPage, t);
            });
        }
    } catch (e) {
        showNotification('Failed to load users.', 'error');
    }
}

async function deleteUser(id, t) {
    if (!confirm(t.confirm_delete)) return;
    try {
        await fetchWithAuth(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' });
        showNotification('User deleted successfully!', 'success');
        await loadUsers(1, t);
    } catch(e) {
        showNotification('Failed to delete user.', 'error');
    }
}

function editUser(id, t) {
    const user = usersCache.find(u => u.id === id);
    if (!user) return;
    
    resetUserForm(t);
    toggleForm(true, t);

    const form = document.getElementById('user-form');
    document.getElementById('form-title-user').textContent = `Edit User: ${user.username}`;
    
    form.elements.userId.value = user.id;
    form.elements['full-name'].value = user.full_name;
    form.elements.email.value = user.email;
    form.elements.username.value = user.username;
    form.elements.role.value = user.role;
    form.elements.is_active.checked = user.is_active;

    form.elements.username.disabled = true;
    form.elements.password.disabled = true;
    form.elements.password.required = false;
    form.elements['full-name'].disabled = true;
    form.elements.email.disabled = true;
    document.getElementById('status-form-group').style.display = 'flex';
}

function resetUserForm(t) {
    const form = document.getElementById('user-form');
    if(form) {
        form.reset();
        form.elements.userId.value = '';
        document.getElementById('form-title-user').textContent = t.register || 'Register New User';
        
        form.elements.username.disabled = false;
        form.elements.password.disabled = false;
        form.elements.password.required = true;
        form.elements['full-name'].disabled = false;
        form.elements.email.disabled = false;
        document.getElementById('status-form-group').style.display = 'none';
    }
}

export async function renderUserModule(contentEl, t) {
    const isAdmin = localStorage.getItem('ems-role') === 'admin';
    if (!isAdmin) {
        contentEl.innerHTML = `<p>Access Denied. You must be an admin to manage users.</p>`;
        return;
    }

    const adminActionsHTML = `
        <div id="form-container-user" class="form-container" style="display:none;">
            <h3 id="form-title-user">${t.register}</h3>
            <form id="user-form">
                <input type="hidden" id="user-id" name="userId">
                <div class="form-group"><label for="full-name">${t.full_name}:</label><input type="text" id="full-name" name="full_name" required></div>
                <div class="form-group"><label for="email">${t.email}:</label><input type="email" id="email" name="email" required></div>
                <div class="form-group"><label for="username">Username:</label><input type="text" id="username" name="username" required></div>
                <div class="form-group"><label for="password">Password:</label><input type="password" id="password" name="password" required></div>
                <div class="form-group"><label for="role">Role:</label>
                    <select id="role" name="role" required>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div id="status-form-group" class="form-group" style="display:none;">
                    <label for="is_active">Active:</label>
                    <input type="checkbox" id="is_active" name="is_active" style="width: auto;">
                </div>
                <button type="submit" class="btn btn-submit"><i class="fa-regular fa-save"></i> ${t.submit}</button>
            </form>
        </div>`;
        
    contentEl.innerHTML = `
        <h2>${t.module_users}</h2>
        <div class="page-actions">
            <button id="btn-toggle-form" class="btn btn-submit"><i class="fa-solid fa-user-plus"></i> ${t.register}</button>
        </div>
        ${adminActionsHTML}
        <div id="user-table-container" class="content-panel"></div>
        <div id="pagination-container" class="pagination-container"></div>
    `;
        
    document.getElementById('btn-toggle-form').addEventListener('click', () => {
        const formContainer = document.getElementById('form-container-user');
        const isVisible = formContainer.style.display === 'block';
        toggleForm(!isVisible, t);
    });

    document.getElementById('user-form').addEventListener('submit', (e) => handleUserFormSubmit(e, t));
    
    contentEl.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            editUser(parseInt(editBtn.dataset.id), t);
        }
        
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            await deleteUser(parseInt(deleteBtn.dataset.id), t);
        }
    });

    await loadUsers(1, t);
}
