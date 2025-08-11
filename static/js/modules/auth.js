// js/modules/auth.js
import { API_BASE_URL } from '../api.js';
import { showNotification } from './ui.js';

const loginForm = document.getElementById('login-form');
const authSection = document.getElementById('auth-section');
const mainAppSection = document.getElementById('main-app-section');
const logoutButton = document.getElementById('logout-button');
const usernameDisplay = document.getElementById('username-display');

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function showMainAppUI(mainAppInitCallback) {
    authSection.style.display = 'none';
    mainAppSection.style.display = 'flex'; // Use flex to enable footer positioning

    const username = localStorage.getItem('ems-username');
    if (username) {
        usernameDisplay.textContent = username;
    }

    mainAppInitCallback();
}

export function initAuth(mainAppInitCallback) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginForm.querySelector('#login-username').value;
        const password = loginForm.querySelector('#login-password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('ems-token', data.token);
                const decodedToken = parseJwt(data.token);
                if (decodedToken) {
                    localStorage.setItem('ems-role', decodedToken.role);
                    localStorage.setItem('ems-username', decodedToken.username);
                }
                showMainAppUI(mainAppInitCallback);
            } else {
                showNotification(data.message, 'error');
            }
        } catch (error) {
            showNotification('Login failed. Please check network connection.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('ems-token');
        localStorage.removeItem('ems-role');
        localStorage.removeItem('ems-username');
        window.location.reload();
    });

    if (localStorage.getItem('ems-token')) {
        showMainAppUI(mainAppInitCallback);
    }
}
