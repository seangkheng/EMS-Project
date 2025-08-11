// js/api.js

// កំណត់ API base URL សម្រាប់ fetch
// ប្រើ window.__API_BASE_URL__ ប្រសិនបើមាន (override នៅ HTML <script>)
// ប្រសិនបើអត់ មាន ត្រូវប្រើ window.location.origin
export const API_BASE_URL = window.__API_BASE_URL__ || window.location.origin;

// URL សម្រាប់ចូលដំណើរការឯកសារផ្ទុក
export const UPLOADS_URL = `${API_BASE_URL}/uploads/`;

// Function fetch ជាមួយ Authorization Token
export async function fetchWithAuth(url, options = {}) {
    // អាន token ពី localStorage
    const token = localStorage.getItem('ems-token');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // បើមិនប្រើ FormData ត្រូវប្រើ Content-Type: application/json
    if (!(options.body instanceof FormData) && options.body) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
        method: options.method || 'GET',
        headers,
        body: options.body ? (
            headers['Content-Type'] === 'application/json'
                ? JSON.stringify(options.body)
                : options.body
        ) : undefined,
    };

    try {
        const response = await fetch(url, fetchOptions);

        // ប្រសិនបើ Unauthorized ឬ Forbidden → clear storage ហើយ reload
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('ems-token');
            localStorage.removeItem('ems-role');
            localStorage.removeItem('ems-username');
            window.location.reload();
            return Promise.reject(new Error('Unauthorized'));
        }

        return response;

    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}