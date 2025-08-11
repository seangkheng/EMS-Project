// js/modules/ui.js

let notificationTimeout;

/**
 * Shows a notification bar at the top of the screen.
 * @param {string} message The message to display.
 * @param {string} type 'success' or 'error'.
 */
export function showNotification(message, type = 'success') {
    const notificationBar = document.getElementById('notification-bar');
    if (!notificationBar) return;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    notificationBar.textContent = message;
    notificationBar.className = ''; // Reset classes
    notificationBar.classList.add(type, 'show');

    notificationTimeout = setTimeout(() => {
        notificationBar.classList.remove('show');
    }, 3500);
}

/**
 * Renders a simple loading spinner inside a target element.
 * @param {HTMLElement} targetElement The element to show the loader in.
 */
export function showLoader(targetElement) {
    if(targetElement) {
        targetElement.innerHTML = `<div class="loader">Loading...</div>`;
    }
}

/**
 * Renders pagination controls.
 * @param {HTMLElement} container The element to render the controls in.
 * @param {number} currentPage The current active page.
 * @param {number} totalPages The total number of pages.
 * @param {function} onPageClick A callback function to execute when a page number is clicked.
 */
export function renderPagination(container, currentPage, totalPages, onPageClick) {
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHtml = '<div class="pagination-controls">';

    // Previous button
    paginationHtml += `<button class="btn-page" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Previous</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="btn-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next button
    paginationHtml += `<button class="btn-page" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;

    paginationHtml += '</div>';
    container.innerHTML = paginationHtml;

    // Add event listeners
    container.querySelectorAll('.btn-page').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            if (page) {
                onPageClick(page);
            }
        });
    });
}
