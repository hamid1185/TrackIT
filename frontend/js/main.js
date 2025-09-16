// Main JavaScript utilities and API handling

const API_BASE = '/bugsagev3/backend/api/';

// Centralized API utility
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            credentials: 'same-origin',
            headers: {
                ...options.headers,
            },
            ...options,
        };

        // Handle FormData properly
        if (config.body && config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        } else if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            console.log('API Request:', url, config);
            const response = await fetch(url, config);
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                console.log('API Response:', data);
                
                if (!response.ok) {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error("Server returned non-JSON response");
            }
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
};

// UI utilities
const ui = {
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${this.getToastColor(type)};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 300px;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        
        this.addToastStyles();
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    getToastColor(type) {
        const colors = {
            error: '#ef4444',
            success: '#10b981',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    },

    addToastStyles() {
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
    },

    showError(message, containerId = 'error-message') {
        console.error('Error:', message);
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            setTimeout(() => container.style.display = 'none', 5000);
        }
        this.showToast(message, 'error');
    },

    showSuccess(message, containerId = 'success-message') {
        console.log('Success:', message);
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            setTimeout(() => container.style.display = 'none', 3000);
        }
        this.showToast(message, 'success');
    },

    setLoading(elementId, isLoading = true) {
        const element = document.getElementById(elementId);
        if (element && isLoading) {
            element.innerHTML = '<div class="loading">Loading...</div>';
        }
    }
};

// Data formatting utilities
const format = {
    date(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    text(text, maxLength = 100) {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    fileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// CSS class utilities
const css = {
    getPriorityClass(priority) {
        const classes = {
            'Low': 'priority-low',
            'Medium': 'priority-medium',
            'High': 'priority-high',
            'Critical': 'priority-critical',
        };
        return classes[priority] || 'priority-medium';
    },

    getStatusClass(status) {
        const classes = {
            'New': 'status-new',
            'In Progress': 'status-progress',
            'Resolved': 'status-resolved',
            'Closed': 'status-closed',
        };
        return classes[status] || 'status-new';
    }
};

// Authentication functions
const auth = {
    async check() {
        try {
            const response = await api.request('auth.php?action=check');
            if (response.authenticated) {
                this.updateUserInfo(response.user);
                return response.user;
            } else {
                if (!this.isAuthPage()) {
                    window.location.href = 'login.html';
                }
                return null;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            if (!this.isAuthPage()) {
                window.location.href = 'login.html';
            }
            return null;
        }
    },

    isAuthPage() {
        const pathname = window.location.pathname.toLowerCase();
        return pathname.includes('login.html') || 
               pathname.includes('registration.html') || 
               pathname.includes('index.html') ||
               pathname.endsWith('/');
    },

    updateUserInfo(user) {
        const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
        userNameElements.forEach(element => {
            if (element) element.textContent = user.name;
        });

        if (user.role === 'Admin') {
            this.showAdminFeatures();
        }
    },

    showAdminFeatures() {
        const adminLinks = document.querySelectorAll('.admin-only');
        adminLinks.forEach(link => link.style.display = 'block');
        
        const nav = document.querySelector('.nav-menu');
        if (nav && !document.querySelector('a[href="admin.html"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'nav-link admin-only';
            adminLink.innerHTML = '<i class="fas fa-cog"></i> Admin';
            nav.appendChild(adminLink);
        }
    },

    async logout() {
        try {
            await api.request('auth.php?action=logout', { method: 'POST' });
            ui.showSuccess('Logged out successfully');
            setTimeout(() => window.location.href = 'login.html', 1000);
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = 'login.html';
        }
    }
};

// Bug management functions
const bugs = {
    currentFilters: {},
    currentPage: 1,

    async loadList(page = 1, filters = {}) {
        this.currentPage = page;
        this.currentFilters = { ...filters };
        
        try {
            console.log('Loading bug list...', { page, filters });
            
            const tbody = document.querySelector('#bugs-table tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading bugs...</td></tr>';
            }
            
            const params = new URLSearchParams({ page, ...filters });
            const response = await api.request(`bugs.php?action=list&${params}`);
            
            if (response.bugs) {
                this.displayList(response.bugs);
                if (response.pagination) {
                    this.displayPagination(response.pagination);
                }
            } else {
                throw new Error('Invalid response format - missing bugs array');
            }
        } catch (error) {
            console.error('Failed to load bugs:', error);
            ui.showError('Failed to load bugs: ' + error.message);
            
            const tbody = document.querySelector('#bugs-table tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Failed to load bugs: ${error.message}</td></tr>`;
            }
        }
    },

    displayList(bugsList) {
        const tbody = document.querySelector('#bugs-table tbody');
        if (!tbody) return;

        if (bugsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No bugs found</td></tr>';
            return;
        }

        tbody.innerHTML = bugsList.map(bug => `
            <tr>
                <td>#${bug.bug_id}</td>
                <td>
                    <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                        ${format.text(bug.title, 60)}
                    </a>
                </td>
                <td class="hidden-mobile">
                    <span class="badge ${css.getPriorityClass(bug.priority)}">
                        ${bug.priority}
                    </span>
                </td>
                <td class="hidden-mobile">
                    <span class="badge ${css.getStatusClass(bug.status)}">
                        ${bug.status}
                    </span>
                </td>
                <td class="hidden-tablet">${bug.assignee_name || 'Unassigned'}</td>
                <td class="hidden-desktop">${format.date(bug.created_at).split(',')[0]}</td>
                <td>
                    <a href="bugdetail.html?id=${bug.bug_id}" class="btn btn-sm btn-primary">View</a>
                </td>
            </tr>
        `).join('');
    },

    displayPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container) return;

        const { current_page, total_pages, total_bugs } = pagination;
        
        if (total_pages <= 1) {
            container.innerHTML = `<div class="pagination-info">Showing ${total_bugs} bug${total_bugs !== 1 ? 's' : ''}</div>`;
            return;
        }

        let html = '<div class="pagination-controls">';

        // Previous button
        html += `<button class="btn btn-sm ${current_page <= 1 ? 'disabled' : ''}" 
                 ${current_page > 1 ? `onclick="bugs.loadList(${current_page - 1}, bugs.currentFilters)"` : 'disabled'}>
                 Previous</button>`;

        // Page numbers
        const startPage = Math.max(1, current_page - 2);
        const endPage = Math.min(total_pages, current_page + 2);

        if (startPage > 1) {
            html += `<button class="btn btn-sm" onclick="bugs.loadList(1, bugs.currentFilters)">1</button>`;
            if (startPage > 2) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn-sm ${i === current_page ? 'active' : ''}" 
                     onclick="bugs.loadList(${i}, bugs.currentFilters)">${i}</button>`;
        }

        if (endPage < total_pages) {
            if (endPage < total_pages - 1) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
            html += `<button class="btn btn-sm" onclick="bugs.loadList(${total_pages}, bugs.currentFilters)">${total_pages}</button>`;
        }

        // Next button
        html += `<button class="btn btn-sm ${current_page >= total_pages ? 'disabled' : ''}"
                 ${current_page < total_pages ? `onclick="bugs.loadList(${current_page + 1}, bugs.currentFilters)"` : 'disabled'}>
                 Next</button>`;

        html += '</div>';
        html += `<div class="pagination-info">Showing page ${current_page} of ${total_pages} (${total_bugs} total bugs)</div>`;

        container.innerHTML = html;
    },

    async loadDetails(bugId) {
        if (!bugId) {
            ui.showError('Invalid bug ID');
            return;
        }

        try {
            ui.setLoading('bug-title', true);
            
            const response = await api.request(`bugs.php?action=details&id=${bugId}`);
            this.displayDetails(response.bug);
            this.displayComments(response.comments);
            this.displayAttachments(response.attachments);
        } catch (error) {
            console.error('Failed to load bug details:', error);
            ui.showError('Failed to load bug details: ' + error.message);
        }
    },

    displayDetails(bug) {
        const elements = {
            'bug-title': `#${bug.bug_id}: ${bug.title}`,
            'bug-id': bug.bug_id,
            'bug-status': bug.status,
            'bug-priority': bug.priority,
            'bug-reporter': bug.reporter_name || 'Unknown',
            'bug-assignee': bug.assignee_name || 'Unassigned',
            'bug-created': format.date(bug.created_at),
            'bug-description-content': bug.description
        };

        Object.entries(elements).forEach(([id, content]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = content;
        });

        // Update badges with proper classes
        const statusElement = document.getElementById('bug-status');
        if (statusElement) {
            statusElement.className = `badge ${css.getStatusClass(bug.status)}`;
        }

        const priorityElement = document.getElementById('bug-priority');
        if (priorityElement) {
            priorityElement.className = `badge ${css.getPriorityClass(bug.priority)}`;
        }

        document.title = `Bug #${bug.bug_id}: ${bug.title} - BugSage`;
    },

    displayComments(comments) {
        const container = document.getElementById('comments-list');
        if (!container) return;

        if (comments.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">No comments yet</div>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">
                        <i class="fas fa-user-circle"></i>
                        ${format.escapeHtml(comment.user_name)}
                    </span>
                    <span class="comment-date">${format.date(comment.created_at)}</span>
                </div>
                <div class="comment-text">${format.escapeHtml(comment.comment_text)}</div>
            </div>
        `).join('');
    },

    displayAttachments(attachments) {
        const container = document.getElementById('attachments-list');
        if (!container) return;

        if (attachments.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">No attachments</div>';
            return;
        }

        container.innerHTML = attachments.map(attachment => `
            <div class="attachment-item">
                <a href="${attachment.file_path}" target="_blank" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-paperclip"></i>
                    ${format.escapeHtml(attachment.original_name)}
                    <small class="text-gray-500">(${format.fileSize(attachment.file_size)})</small>
                </a>
            </div>
        `).join('');
    },

    async updateStatus(bugId, newStatus) {
        if (!bugId || !newStatus) {
            ui.showError('Invalid bug ID or status');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('bug_id', bugId);
            formData.append('status', newStatus);

            await api.request('updatebugstatus.php', {
                method: 'POST',
                body: formData
            });

            ui.showSuccess(`Status updated to ${newStatus}`);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Failed to update status:', error);
            ui.showError('Failed to update status: ' + error.message);
        }
    },

    async submitComment(bugId, commentText) {
        if (!bugId || !commentText.trim()) {
            ui.showError('Comment text is required');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('bug_id', bugId);
            formData.append('comment', commentText.trim());

            await api.request('bugs.php?action=comment', {
                method: 'POST',
                body: formData
            });

            ui.showSuccess('Comment added successfully');
            
            const commentTextArea = document.getElementById('comment-text');
            if (commentTextArea) commentTextArea.value = '';
            
            setTimeout(() => this.loadDetails(bugId), 1000);
        } catch (error) {
            console.error('Failed to add comment:', error);
            ui.showError('Failed to add comment: ' + error.message);
        }
    }
};

// Filter management
const filters = {
    setup() {
        const applyBtn = document.getElementById('apply-filters');
        const clearBtn = document.getElementById('clear-filters');
        const searchInput = document.getElementById('search-input');

        if (applyBtn) applyBtn.addEventListener('click', this.apply.bind(this));
        if (clearBtn) clearBtn.addEventListener('click', this.clear.bind(this));

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.apply();
            });
        }
    },

    apply() {
        const filterData = {};
        
        const statusFilter = document.getElementById('status-filter');
        const priorityFilter = document.getElementById('priority-filter');
        const searchInput = document.getElementById('search-input');

        if (statusFilter?.value) filterData.status = statusFilter.value;
        if (priorityFilter?.value) filterData.priority = priorityFilter.value;
        if (searchInput?.value.trim()) filterData.search = searchInput.value.trim();

        bugs.loadList(1, filterData);
    },

    clear() {
        const statusFilter = document.getElementById('status-filter');
        const priorityFilter = document.getElementById('priority-filter');
        const searchInput = document.getElementById('search-input');

        if (statusFilter) statusFilter.value = '';
        if (priorityFilter) priorityFilter.value = '';
        if (searchInput) searchInput.value = '';

        bugs.loadList(1, {});
    }
};

// Initialize common functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Main.js loaded');

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                auth.logout();
            }
        });
    }

    // Setup status buttons in bug details
    const statusButtons = document.querySelectorAll('.status-btn');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const bugId = urlParams.get('id');
            const newStatus = btn.dataset.status;
            if (bugId && newStatus) {
                if (confirm(`Change status to ${newStatus}?`)) {
                    bugs.updateStatus(bugId, newStatus);
                }
            }
        });
    });

    // Setup comment form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const urlParams = new URLSearchParams(window.location.search);
            const bugId = urlParams.get('id');
            const commentTextArea = document.getElementById('comment-text');
            const commentText = commentTextArea?.value?.trim();

            if (!commentText) {
                ui.showError('Please enter a comment');
                return;
            }

            if (bugId) {
                await bugs.submitComment(bugId, commentText);
            }
        });
    }

    // Auto-hide messages after user interaction
    document.addEventListener('click', () => {
        const errorMsg = document.getElementById('error-message');
        const successMsg = document.getElementById('success-message');
        
        if (errorMsg && errorMsg.style.display === 'block') {
            setTimeout(() => errorMsg.style.display = 'none', 3000);
        }
        
        if (successMsg && successMsg.style.display === 'block') {
            setTimeout(() => successMsg.style.display = 'none', 2000);
        }
    });
});

// Export for global use
window.api = api;
window.ui = ui;
window.format = format;
window.css = css;
window.auth = auth;
window.bugs = bugs;
window.filters = filters;

// Legacy support
window.utils = { ...ui, ...format, ...css, apiRequest: api.request };
window.checkAuth = auth.check;
window.loadBugList = bugs.loadList.bind(bugs);
window.loadBugDetails = bugs.loadDetails.bind(bugs);
window.updateBugStatus = bugs.updateStatus.bind(bugs);
window.setupFilters = filters.setup.bind(filters);
window.logout = auth.logout;