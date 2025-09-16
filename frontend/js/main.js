
const API_BASE = '/bugsagev3/backend/api/';

const utils = {
  async apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      credentials: 'same-origin',
      headers: {
        ...options.headers,
      },
      ...options,
    };

    if (config.body && config.body instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      console.log('Making API request to:', url, config);
      const response = await fetch(url, config);
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log('Response data:', data);
        
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
  },

  // Show error message
  showError(message, containerId = 'error-message') {
    console.error('Error:', message);
    const container = document.getElementById(containerId);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    }
    
    // Also show as toast notification
    this.showToast(message, 'error');
  },

  // Show success message
  showSuccess(message, containerId = 'success-message') {
    console.log('Success:', message);
    const container = document.getElementById(containerId);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      setTimeout(() => {
        container.style.display = 'none';
      }, 3000);
    }
    
    // Also show as toast notification
    this.showToast(message, 'success');
  },

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
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
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  },

  // Format date
  formatDate(dateString) {
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

  // Get priority color class
  getPriorityClass(priority) {
    const classes = {
      'Low': 'priority-low',
      'Medium': 'priority-medium',
      'High': 'priority-high',
      'Critical': 'priority-critical',
    };
    return classes[priority] || 'priority-medium';
  },

  // Get status color class
  getStatusClass(status) {
    const classes = {
      'New': 'status-new',
      'In Progress': 'status-progress',
      'Resolved': 'status-resolved',
      'Closed': 'status-closed',
    };
    return classes[status] || 'status-new';
  },

  // Sanitize HTML
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Format text for display (truncate if needed)
  formatText(text, maxLength = 100) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return this.escapeHtml(text);
    return this.escapeHtml(text.substring(0, maxLength)) + '...';
  },

  // Loading state management
  setLoading(elementId, isLoading = true) {
    const element = document.getElementById(elementId);
    if (element) {
      if (isLoading) {
        element.innerHTML = '<div class="loading">Loading...</div>';
      }
    }
  }
};

// Authentication functions
async function checkAuth() {
  try {
    const response = await utils.apiRequest('auth.php?action=check');
    if (response.authenticated) {
      updateUserInfo(response.user);
      return response.user;
    } else {
      // Redirect to login if not authenticated and not on auth pages
      if (!isAuthPage()) {
        window.location.href = 'login.html';
      }
      return null;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    if (!isAuthPage()) {
      window.location.href = 'login.html';
    }
    return null;
  }
}

function isAuthPage() {
  const pathname = window.location.pathname.toLowerCase();
  return pathname.includes('login.html') || 
         pathname.includes('registration.html') || 
         pathname.includes('index.html') ||
         pathname.endsWith('/');
}

function updateUserInfo(user) {
  const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
  userNameElements.forEach((element) => {
    if (element) {
      element.textContent = user.name;
    }
  });

  // Show admin menu if user is admin
  if (user.role === 'Admin') {
    const adminLinks = document.querySelectorAll('.admin-only');
    adminLinks.forEach(link => {
      link.style.display = 'block';
    });
    
    // Add admin link to navigation if not present
    const nav = document.querySelector('.nav-menu');
    if (nav && !document.querySelector('a[href="admin.html"]')) {
      const adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.className = 'nav-link admin-only';
      adminLink.innerHTML = '<i class="fas fa-cog"></i> Admin';
      nav.appendChild(adminLink);
    }
  }
}

// Logout function
async function logout() {
  try {
    await utils.apiRequest('auth.php?action=logout', { method: 'POST' });
    utils.showSuccess('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  } catch (error) {
    console.error('Logout failed:', error);
    // Force redirect even if logout fails
    window.location.href = 'login.html';
  }
}

// Bug list functions
let currentFilters = {};
let currentPage = 1;

async function loadBugList(page = 1, filters = {}) {
  currentPage = page;
  currentFilters = { ...filters };
  
  try {
    console.log('Loading bug list...', { page, filters });
    
    const tbody = document.querySelector('#bugs-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading bugs...</td></tr>';
    }
    
    const params = new URLSearchParams({
      page: page,
      ...filters,
    });

    const response = await utils.apiRequest(`bugs.php?action=list&${params}`);
    console.log('Bug list response:', response);
    
    if (response.bugs) {
      displayBugList(response.bugs);
      if (response.pagination) {
        displayPagination(response.pagination);
      }
    } else {
      throw new Error('Invalid response format - missing bugs array');
    }
  } catch (error) {
    console.error('Failed to load bugs:', error);
    utils.showError('Failed to load bugs: ' + error.message);
    
    // Show error in table
    const tbody = document.querySelector('#bugs-table tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Failed to load bugs: ${error.message}</td></tr>`;
    }
  }
}

function displayBugList(bugs) {
  const tbody = document.querySelector('#bugs-table tbody');
  if (!tbody) return;

  if (bugs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No bugs found</td></tr>';
    return;
  }

  tbody.innerHTML = bugs
    .map(
      (bug) => `
        <tr>
            <td>#${bug.bug_id}</td>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                    ${utils.formatText(bug.title, 60)}
                </a>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getPriorityClass(bug.priority)}">
                    ${bug.priority}
                </span>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getStatusClass(bug.status)}">
                    ${bug.status}
                </span>
            </td>
            <td class="hidden-tablet">${bug.assignee_name || 'Unassigned'}</td>
            <td class="hidden-desktop">${utils.formatDate(bug.created_at).split(',')[0]}</td>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="btn btn-sm btn-primary">View</a>
            </td>
        </tr>
    `,
    )
    .join('');
}

function displayPagination(pagination) {
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
           ${current_page > 1 ? `onclick="loadBugList(${current_page - 1}, currentFilters)"` : 'disabled'}>
           Previous</button>`;

  // Page numbers
  const startPage = Math.max(1, current_page - 2);
  const endPage = Math.min(total_pages, current_page + 2);

  if (startPage > 1) {
    html += `<button class="btn btn-sm" onclick="loadBugList(1, currentFilters)">1</button>`;
    if (startPage > 2) {
      html += '<span class="pagination-ellipsis">...</span>';
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="btn btn-sm ${i === current_page ? 'active' : ''}" 
             onclick="loadBugList(${i}, currentFilters)">${i}</button>`;
  }

  if (endPage < total_pages) {
    if (endPage < total_pages - 1) {
      html += '<span class="pagination-ellipsis">...</span>';
    }
    html += `<button class="btn btn-sm" onclick="loadBugList(${total_pages}, currentFilters)">${total_pages}</button>`;
  }

  // Next button
  html += `<button class="btn btn-sm ${current_page >= total_pages ? 'disabled' : ''}"
           ${current_page < total_pages ? `onclick="loadBugList(${current_page + 1}, currentFilters)"` : 'disabled'}>
           Next</button>`;

  html += '</div>';
  html += `<div class="pagination-info">Showing page ${current_page} of ${total_pages} (${total_bugs} total bugs)</div>`;

  container.innerHTML = html;
}

// Bug details functions
async function loadBugDetails(bugId) {
  if (!bugId) {
    utils.showError('Invalid bug ID');
    return;
  }

  try {
    utils.setLoading('bug-title', true);
    
    const response = await utils.apiRequest(`bugs.php?action=details&id=${bugId}`);
    displayBugDetails(response.bug);
    displayComments(response.comments);
    displayAttachments(response.attachments);
  } catch (error) {
    console.error('Failed to load bug details:', error);
    utils.showError('Failed to load bug details: ' + error.message);
  }
}

function displayBugDetails(bug) {
  // Update page elements
  const elements = {
    'bug-title': `#${bug.bug_id}: ${bug.title}`,
    'bug-id': bug.bug_id,
    'bug-status': bug.status,
    'bug-priority': bug.priority,
    'bug-reporter': bug.reporter_name || 'Unknown',
    'bug-assignee': bug.assignee_name || 'Unassigned',
    'bug-created': utils.formatDate(bug.created_at),
    'bug-description-content': bug.description
  };

  Object.entries(elements).forEach(([id, content]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = content;
    }
  });

  // Update status and priority badges with proper classes
  const statusElement = document.getElementById('bug-status');
  if (statusElement) {
    statusElement.className = `badge ${utils.getStatusClass(bug.status)}`;
  }

  const priorityElement = document.getElementById('bug-priority');
  if (priorityElement) {
    priorityElement.className = `badge ${utils.getPriorityClass(bug.priority)}`;
  }

  // Update page title
  document.title = `Bug #${bug.bug_id}: ${bug.title} - BugSage`;
}

function displayComments(comments) {
  const container = document.getElementById('comments-list');
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 py-4">No comments yet</div>';
    return;
  }

  container.innerHTML = comments
    .map(
      (comment) => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">
                    <i class="fas fa-user-circle"></i>
                    ${utils.escapeHtml(comment.user_name)}
                </span>
                <span class="comment-date">${utils.formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-text">${utils.escapeHtml(comment.comment_text)}</div>
        </div>
    `,
    )
    .join('');
}

function displayAttachments(attachments) {
  const container = document.getElementById('attachments-list');
  if (!container) return;

  if (attachments.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 py-4">No attachments</div>';
    return;
  }

  container.innerHTML = attachments
    .map(
      (attachment) => `
        <div class="attachment-item">
            <a href="${attachment.file_path}" target="_blank" class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-paperclip"></i>
                ${utils.escapeHtml(attachment.original_name)}
                <small class="text-gray-500">(${formatFileSize(attachment.file_size)})</small>
            </a>
        </div>
    `,
    )
    .join('');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Status update function
async function updateBugStatus(bugId, newStatus) {
  if (!bugId || !newStatus) {
    utils.showError('Invalid bug ID or status');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('bug_id', bugId);
    formData.append('status', newStatus);

    await utils.apiRequest('updatebugstatus.php', {
      method: 'POST',
      body: formData
    });

    utils.showSuccess(`Status updated to ${newStatus}`);
    
    // Reload the page to show updated status
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Failed to update status:', error);
    utils.showError('Failed to update status: ' + error.message);
  }
}

// Comment submission
async function submitComment(bugId, commentText) {
  if (!bugId || !commentText.trim()) {
    utils.showError('Comment text is required');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('bug_id', bugId);
    formData.append('comment', commentText.trim());

    await utils.apiRequest('bugs.php?action=comment', {
      method: 'POST',
      body: formData
    });

    utils.showSuccess('Comment added successfully');
    
    // Clear the comment form
    const commentTextArea = document.getElementById('comment-text');
    if (commentTextArea) {
      commentTextArea.value = '';
    }
    
    // Reload bug details to show new comment
    setTimeout(() => {
      loadBugDetails(bugId);
    }, 1000);
  } catch (error) {
    console.error('Failed to add comment:', error);
    utils.showError('Failed to add comment: ' + error.message);
  }
}

// Setup filters
function setupFilters() {
  const applyBtn = document.getElementById('apply-filters');
  const clearBtn = document.getElementById('clear-filters');
  const searchInput = document.getElementById('search-input');

  if (applyBtn) {
    applyBtn.addEventListener('click', applyFilters);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }

  // Search on Enter key
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyFilters();
      }
    });
  }
}

function applyFilters() {
  const filters = {};
  
  const statusFilter = document.getElementById('status-filter');
  const priorityFilter = document.getElementById('priority-filter');
  const searchInput = document.getElementById('search-input');

  if (statusFilter?.value) filters.status = statusFilter.value;
  if (priorityFilter?.value) filters.priority = priorityFilter.value;
  if (searchInput?.value.trim()) filters.search = searchInput.value.trim();

  loadBugList(1, filters);
}

function clearFilters() {
  const statusFilter = document.getElementById('status-filter');
  const priorityFilter = document.getElementById('priority-filter');
  const searchInput = document.getElementById('search-input');

  if (statusFilter) statusFilter.value = '';
  if (priorityFilter) priorityFilter.value = '';
  if (searchInput) searchInput.value = '';

  loadBugList(1, {});
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Main.js loaded');

  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  }

  // Setup status buttons in bug details
  const statusButtons = document.querySelectorAll('.status-btn');
  statusButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const bugId = urlParams.get('id');
      const newStatus = btn.dataset.status;
      if (bugId && newStatus) {
        if (confirm(`Change status to ${newStatus}?`)) {
          updateBugStatus(bugId, newStatus);
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
        utils.showError('Please enter a comment');
        return;
      }

      if (bugId) {
        await submitComment(bugId, commentText);
      }
    });
  }

  // Setup responsive menu toggle (if needed)
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // Auto-hide messages after user interaction
  document.addEventListener('click', () => {
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');
    
    if (errorMsg && errorMsg.style.display === 'block') {
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 3000);
    }
    
    if (successMsg && successMsg.style.display === 'block') {
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 2000);
    }
  });
});

// Export functions for global use
window.utils = utils;
window.checkAuth = checkAuth;
window.loadBugList = loadBugList;
window.loadBugDetails = loadBugDetails;
window.updateBugStatus = updateBugStatus;
window.setupFilters = setupFilters;
window.currentFilters = currentFilters;
window.logout = logout;