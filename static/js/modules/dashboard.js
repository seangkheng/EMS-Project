// js/modules/dashboard.js
import { fetchWithAuth, API_BASE_URL } from '../api.js';
import { showLoader, showNotification } from './ui.js';

function createClassSizeChart(data, t) {
    const ctx = document.getElementById('class-size-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.class_name),
            datasets: [{
                label: t.dashboard_chart_class_size_label || 'Number of Students',
                data: data.map(item => item.student_count),
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: t.dashboard_chart_class_size_title || 'Number of Students per Class'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createUserRolesChart(data, t) {
    const ctx = document.getElementById('user-roles-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.role),
            datasets: [{
                label: t.dashboard_chart_user_role_label || 'User Count',
                data: data.map(item => item.count),
                backgroundColor: [
                    'rgba(79, 70, 229, 0.7)',
                    'rgba(30, 64, 175, 0.7)',
                    'rgba(14, 165, 233, 0.7)',
                ],
                borderColor: [
                    'rgba(79, 70, 229, 1)',
                    'rgba(30, 64, 175, 1)',
                    'rgba(14, 165, 233, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: t.dashboard_chart_user_role_title || 'Active User Roles'
                }
            }
        }
    });
}

// --- NEW: Function to render recent announcements ---
function renderRecentAnnouncements(container, announcements, t) {
    if (announcements.length === 0) {
        container.innerHTML = `<p>${t.dashboard_no_announcements || 'No recent announcements.'}</p>`;
        return;
    }

    // Get the latest 5 announcements
    const recent = announcements.slice(0, 5);

    const announcementItems = recent.map(ann => {
        const postDate = new Date(ann.created_at).toLocaleDateString();
        return `
            <li class="announcement-item">
                <div class="announcement-item-header">
                    <strong>${ann.title}</strong>
                    <span class="announcement-item-meta">${ann.author_name} - ${postDate}</span>
                </div>
                <p class="announcement-item-content">${ann.content.substring(0, 150)}${ann.content.length > 150 ? '...' : ''}</p>
            </li>
        `;
    }).join('');

    container.innerHTML = `<ul class="announcement-list">${announcementItems}</ul>`;
}


export async function renderDashboard(contentEl, t) {
    showLoader(contentEl);
    
    const html = `
        <div class="dashboard-stats">
            <div class="stat-card">
                <i class="fa-solid fa-user-graduate"></i>
                <div class="info">
                    <h3 id="stats-students">0</h3>
                    <p>${t.dashboard_total_students || 'Total Students'}</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fa-solid fa-chalkboard-user"></i>
                <div class="info">
                    <h3 id="stats-teachers">0</h3>
                    <p>${t.dashboard_total_teachers || 'Total Teachers'}</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fa-solid fa-school"></i>
                <div class="info">
                    <h3 id="stats-classes">0</h3>
                    <p>${t.dashboard_total_classes || 'Total Classes'}</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fa-solid fa-users"></i>
                <div class="info">
                    <h3 id="stats-users">0</h3>
                    <p>${t.dashboard_active_users || 'Active Users'}</p>
                </div>
            </div>
        </div>

        <div class="dashboard-main-grid">
            <div class="dashboard-announcements card">
                 <h3>${t.dashboard_recent_announcements || 'Recent Announcements'}</h3>
                 <div id="recent-announcements-container"></div>
            </div>
            <div class="charts-grid">
                <div class="card"><canvas id="class-size-chart"></canvas></div>
                <div class="card"><canvas id="user-roles-chart"></canvas></div>
            </div>
        </div>
    `;
    contentEl.innerHTML = html;

    try {
        // Fetch all data concurrently
        const [statsRes, classSizesRes, userRolesRes, announcementsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/dashboard/stats`),
            fetchWithAuth(`${API_BASE_URL}/api/dashboard/class-sizes`),
            fetchWithAuth(`${API_BASE_URL}/api/dashboard/user-roles`),
            fetchWithAuth(`${API_BASE_URL}/api/announcements`) // Fetch announcements
        ]);

        if (!statsRes.ok || !classSizesRes.ok || !userRolesRes.ok || !announcementsRes.ok) {
            throw new Error('Failed to load some dashboard data.');
        }

        const stats = await statsRes.json();
        const classSizes = await classSizesRes.json();
        const userRoles = await userRolesRes.json();
        const announcements = await announcementsRes.json();

        // Update stat cards
        document.getElementById('stats-students').textContent = stats.students;
        document.getElementById('stats-teachers').textContent = stats.teachers;
        document.getElementById('stats-classes').textContent = stats.classes;
        document.getElementById('stats-users').textContent = stats.active_users;

        // Render announcements
        renderRecentAnnouncements(document.getElementById('recent-announcements-container'), announcements, t);

        // Create charts
        createClassSizeChart(classSizes, t);
        createUserRolesChart(userRoles, t);

    } catch (error) {
        showNotification(error.message, 'error');
        contentEl.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}
