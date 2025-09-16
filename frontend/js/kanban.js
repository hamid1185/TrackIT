// Kanban board JavaScript

// Use the API base from main.js if available, otherwise set default
const API_BASE = window.API_BASE || '/bugsagev3/backend/api/';

const kanbanData = {
  'New': [],
  'In Progress': [],
  'Resolved': [],
  'Closed': []
};

// Use utils from main.js if available, otherwise create basic version
const utils = window.utils || {
  apiRequest: async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;
    
    try {
      console.log('Making API request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        credentials: 'same-origin',
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  getPriorityClass: (priority) => {
    const classes = {
      'Low': 'priority-low',
      'Medium': 'priority-medium',
      'High': 'priority-high', 
      'Critical': 'priority-critical'
    };
    return classes[priority] || 'priority-medium';
  },
  
  escapeHtml: (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  formatDate: (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  },
  
  showError: (message) => {
    console.error('Error:', message);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }
};

// Use checkAuth from main.js if available
const checkAuth = window.checkAuth || (async () => {
  try {
    const response = await utils.apiRequest('auth.php?action=check');
    if (response.authenticated) {
      return response.user;
    }
    window.location.href = 'login.html';
    return null;
  } catch (error) {
    window.location.href = 'login.html';
    return null;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Kanban board loading...');
  
  // Check authentication
  const user = await checkAuth();
  if (!user) return;

  // Update user name
  const userNameElement = document.getElementById('user-name');
  if (userNameElement) {
    userNameElement.textContent = user.name;
  }

  // Load kanban data and setup
  try {
    await loadKanbanData();
    setupDragAndDrop();
  } catch (error) {
    console.error('Failed to initialize kanban:', error);
    utils.showError('Failed to load kanban board');
  }
});

async function loadKanbanData() {
  try {
    console.log('Loading kanban data...');
    const response = await utils.apiRequest('bugs.php?action=list&per_page=100');
    console.log('Kanban data response:', response);
    
    // Clear existing data
    Object.keys(kanbanData).forEach((status) => {
      kanbanData[status] = [];
    });

    // Handle response format
    const bugs = response.bugs || [];
    
    if (!Array.isArray(bugs)) {
      console.warn('Expected bugs array, got:', bugs);
      throw new Error('Invalid response format from server');
    }

    // Group bugs by status
    bugs.forEach((bug) => {
      if (bug.status && kanbanData[bug.status]) {
        kanbanData[bug.status].push(bug);
      } else {
        // Default to 'New' if status is invalid
        kanbanData['New'].push(bug);
      }
    });

    console.log('Grouped kanban data:', kanbanData);

    // Display the kanban board
    displayKanbanBoard();
    updateBugCounts();
    
  } catch (error) {
    console.error('Failed to load kanban data:', error);
    utils.showError('Failed to load kanban data: ' + error.message);
    
    // Show empty columns instead of failing completely
    displayKanbanBoard();
    updateBugCounts();
  }
}

function displayKanbanBoard() {
  console.log('Displaying kanban board...');
  
  Object.keys(kanbanData).forEach((status) => {
    const columnId = getColumnId(status);
    const column = document.getElementById(columnId);

    if (!column) {
      console.warn(`Column not found: ${columnId} for status: ${status}`);
      return;
    }

    const bugs = kanbanData[status] || [];
    
    if (bugs.length === 0) {
      column.innerHTML = `
        <div class="kanban-empty">
          <i class="fas fa-inbox"></i>
          <p>No ${status.toLowerCase()} bugs</p>
        </div>
      `;
    } else {
      column.innerHTML = bugs.map((bug) => createKanbanCard(bug)).join('');
    }
  });
}

function createKanbanCard(bug) {
  const priorityClass = bug.priority ? bug.priority.toLowerCase() : 'medium';
  
  return `
    <div class="kanban-card priority-${priorityClass}" 
         draggable="true" 
         data-bug-id="${bug.bug_id}"
         data-status="${bug.status || 'New'}">
      <div class="card-header">
        <span class="card-id">#${bug.bug_id}</span>
        <span class="card-priority badge ${utils.getPriorityClass(bug.priority)}">
          ${bug.priority || 'Medium'}
        </span>
      </div>
      <div class="card-title">
        <a href="bugdetail.html?id=${bug.bug_id}">
          ${utils.escapeHtml(bug.title || 'Untitled Bug')}
        </a>
      </div>
      <div class="card-meta">
        <div class="card-assignee">
          <i class="fas fa-user"></i>
          <span>${bug.assignee_name || 'Unassigned'}</span>
        </div>
        <div class="card-date">
          ${utils.formatDate(bug.created_at)}
        </div>
      </div>
    </div>
  `;
}

function getColumnId(status) {
  const columnMap = {
    'New': 'new-column',
    'In Progress': 'progress-column',
    'Resolved': 'resolved-column',
    'Closed': 'closed-column'
  };
  return columnMap[status] || 'new-column';
}

function updateBugCounts() {
  Object.keys(kanbanData).forEach((status) => {
    const countId = getCountId(status);
    const countElement = document.getElementById(countId);
    if (countElement) {
      const count = kanbanData[status] ? kanbanData[status].length : 0;
      countElement.textContent = count;
    }
  });
}

function getCountId(status) {
  const countMap = {
    'New': 'new-count',
    'In Progress': 'progress-count',
    'Resolved': 'resolved-count',
    'Closed': 'closed-count'
  };
  return countMap[status] || 'new-count';
}

function setupDragAndDrop() {
  console.log('Setting up drag and drop...');
  
  // Add drag event listeners to cards
  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('dragend', handleDragEnd);

  // Add drop event listeners to columns
  document.querySelectorAll('.column-content').forEach((column) => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  if (!e.target.classList.contains('kanban-card')) return;

  console.log('Drag start:', e.target.dataset.bugId);
  
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', e.target.dataset.bugId);
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      bugId: e.target.dataset.bugId,
      currentStatus: e.target.dataset.status
    })
  );
}

function handleDragEnd(e) {
  if (!e.target.classList.contains('kanban-card')) return;

  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDragEnter(e) {
  if (e.target.classList.contains('column-content')) {
    e.target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (e.target.classList.contains('column-content')) {
    e.target.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();

  if (!e.target.classList.contains('column-content')) return;

  e.target.classList.remove('drag-over');

  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    const column = e.target.closest('.kanban-column');
    const newStatus = column ? column.dataset.status : null;

    console.log('Drop event:', { data, newStatus });

    if (!newStatus || data.currentStatus === newStatus) {
      console.log('No status change needed');
      return; // No change needed
    }

    // Update bug status via API
    await updateBugStatusKanban(data.bugId, newStatus);

    // Reload kanban data
    await loadKanbanData();
    
  } catch (error) {
    console.error('Drop failed:', error);
    utils.showError('Failed to update bug status: ' + error.message);
  }
}

async function updateBugStatusKanban(bugId, newStatus) {
  try {
    console.log('Updating bug status:', { bugId, newStatus });
    
    const formData = new FormData();
    formData.append('bug_id', bugId);
    formData.append('status', newStatus);

    await utils.apiRequest('updatebugstatus.php', {
      method: 'POST',
      body: formData
    });

    // Show success message briefly
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-size: 14px;
    `;
    toast.textContent = `Bug #${bugId} moved to ${newStatus}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Failed to update bug status:', error);
    throw error;
  }
}