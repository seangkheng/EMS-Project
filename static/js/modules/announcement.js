// js/modules/announcement.js (NEW MODULE)
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showNotification, showLoader } from './ui.js';

let announcementsCache = [];

function renderAnnouncementsList(container, t) {
    if (announcementsCache.length === 0) {
        container.innerHTML = '<p>No announcements found.</p>';
        return;
    }

    const isAdmin = localStorage.getItem('ems-role') === 'admin';

    const announcementCards = announcementsCache.map(ann => {
        const postDate = new Date(ann.created_at).toLocaleString();
        const deleteButton = isAdmin ? `<button class="btn btn-delete btn-sm" data-id="${ann.id}"><i class="fa-regular fa-trash-can"></i></button>` : '';

        return `
            <div class="announcement-card">
                <div class="announcement-header">
                    <h3>${ann.title}</h3>
                    ${deleteButton}
                </div>
                <div class="announcement-body">
                    <p>${ann.content.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="announcement-footer">
                    <span>By: ${ann.author_name}</span>
                    <span>${postDate}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = announcementCards;
}

async function loadAnnouncements(container, t) {
    showLoader(container);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/announcements`);
        if (!response.ok) throw new Error('Failed to load announcements.');
        announcementsCache = await response.json();
        renderAnnouncementsList(container, t);
    } catch (e) {
        showNotification(e.message, 'error');
        container.innerHTML = `<p style="color:red;">${e.message}</p>`;
    }
}

async function handleAnnouncementSubmit(event, t) {
    event.preventDefault();
    const form = event.target;
    const title = form.elements.title.value;
    const content = form.elements.content.value;

    const payload = { title, content };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/announcements`, {
            method: 'POST',
            body: payload
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to post announcement.');
        }
        showNotification('Announcement posted successfully!', 'success');
        form.reset();
        await loadAnnouncements(document.getElementById('announcements-list-container'), t);
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

async function deleteAnnouncement(id, t) {
    if (!confirm(t.confirm_delete || 'Are you sure you want to delete this?')) return;

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/announcements/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete.');
        showNotification('Announcement deleted!', 'success');
        await loadAnnouncements(document.getElementById('announcements-list-container'), t);
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

export async function renderAnnouncementModule(contentEl, t) {
    const userRole = localStorage.getItem('ems-role');
    const canPost = userRole === 'admin' || userRole === 'teacher';

    const formHtml = canPost ? `
        <div class="form-container">
            <h3>${t.module_announcements_new || 'Post New Announcement'}</h3>
            <form id="announcement-form">
                <div class="form-group">
                    <label for="announcement-title">${t.module_announcements_title || 'Title'}</label>
                    <input type="text" id="announcement-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="announcement-content">${t.module_announcements_content || 'Content'}</label>
                    <textarea id="announcement-content" name="content" rows="4" required></textarea>
                </div>
                <button type="submit" class="btn btn-submit"><i class="fa-solid fa-paper-plane"></i> ${t.module_announcements_post || 'Post'}</button>
            </form>
        </div>
    ` : '';

    const html = `
        <h2>${t.module_announcements || 'Announcements'}</h2>
        ${formHtml}
        <div id="announcements-list-container" class="content-panel"></div>
    `;
    contentEl.innerHTML = html;

    const listContainer = document.getElementById('announcements-list-container');

    if (canPost) {
        document.getElementById('announcement-form').addEventListener('submit', (e) => handleAnnouncementSubmit(e, t));
    }

    listContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            deleteAnnouncement(id, t);
        }
    });

    await loadAnnouncements(listContainer, t);
}
