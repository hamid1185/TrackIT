// Dashboard JavaScript

// Use the API base from main.js if available, otherwise set default
const API_BASE = window.API_BASE || '/bugsagev3/backend/api/';

// Use utils from main.js if available, otherwise create basic version
const utils = window.utils || {
  apiRequest: async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;
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
  },
  
  showError: (message) => {
    console.error('Error:', message);
    const container = document.getElementById('error-message');
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
    }
  },
  
  escapeHtml: (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  
  getStatusClass: (status) => {
    const classes = {
      'New': 'status-new',
      'In Progress': 'status-progress',
      'Resolved': 'status-resolved', 
      'Closed': 'status-closed'
    };
    return classes[status] || 'status-new';
  },
  
  formatDate: (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  console.log('Dashboard loading...');
  
  // Check authentication
  const user = await checkAuth();
  if (!user) return;

  // Update user name
  const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
  userNameElements.forEach(element => {
    if (element) {
      element.textContent = user.name;
    }
  });

  // Load dashboard data
  try {
    await Promise.all([
      loadDashboardStats(),
      loadRecentBugs(),
      loadMyBugs()
    ]);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    utils.showError('Failed to load dashboard data');
  }
});

async function loadDashboardStats() {
  try {
    console.log('Loading dashboard stats...');
    const response = await utils.apiRequest('dashboard.php?action=stats');
    console.log('Stats response:', response);
    
    displayStats(response);
    
    if (response.status_counts) {
      displayStatusOverview(response.status_counts);
    }
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    utils.showError('Failed to load dashboard statistics');
    
    // Set default values to prevent errors
    displayStats({
      total_bugs: 0,
      my_bugs: 0,
      status_counts: [],
      priority_counts: []
    });
  }
}

function displayStats(stats) {
  console.log('Displaying stats:', stats);
  
  // Update stat cards with safe defaults
  const totalBugs = document.getElementById('total-bugs');
  const activeBugs = document.getElementById('active-bugs');
  const criticalBugs = document.getElementById('critical-bugs');
  const myBugs = document.getElementById('my-bugs');

  if (totalBugs) totalBugs.textContent = stats.total_bugs || 0;
  if (myBugs) myBugs.textContent = stats.my_bugs || 0;

  // Calculate active bugs (New + In Progress) with safe array handling
  let activeCount = 0;
  if (stats.status_counts && Array.isArray(stats.status_counts)) {
    activeCount = stats.status_counts.reduce((sum, status) => {
      if (status.status === 'New' || status.status === 'In Progress') {
        return sum + parseInt(status.count || 0);
      }
      return sum;
    }, 0);
  }
  if (activeBugs) activeBugs.textContent = activeCount;

  // Get critical bugs count with safe array handling
  let criticalCount = 0;
  if (stats.priority_counts && Array.isArray(stats.priority_counts)) {
    const criticalPriority = stats.priority_counts.find(p => p.priority === 'Critical');
    criticalCount = criticalPriority ? parseInt(criticalPriority.count || 0) : 0;
  }
  if (criticalBugs) criticalBugs.textContent = criticalCount;
}

function displayStatusOverview(statusCounts) {
  const container = document.getElementById('status-overview');
  if (!container) return;

  console.log('Displaying status overview:', statusCounts);

  const statusMap = {
    'New': { color: 'new', count: 0 },
    'In Progress': { color: 'progress', count: 0 },
    'Resolved': { color: 'resolved', count: 0 },
    'Closed': { color: 'closed', count: 0 }
  };

  // Update counts from API response with safe array handling
  if (statusCounts && Array.isArray(statusCounts)) {
    statusCounts.forEach((status) => {
      if (statusMap[status.status]) {
        statusMap[status.status].count = parseInt(status.count || 0);
      }
    });
  }

  container.innerHTML = Object.entries(statusMap)
    .map(([status, data]) => `
        <div class="status-item">
            <div class="status-item-label">
                <div class="status-dot ${data.color}"></div>
                <span>${status}</span>
            </div>
            <span class="font-medium">${data.count}</span>
        </div>
    `)
    .join('');
}

async function loadRecentBugs() {
  try {
    console.log('Loading recent bugs...');
    const response = await utils.apiRequest('dashboard.php?action=recent');
    console.log('Recent bugs response:', response);
    
    // Handle both possible response formats
    const bugs = response.recent_bugs || response.bugs || [];
    displayRecentBugs(bugs);
  } catch (error) {
    console.error('Failed to load recent bugs:', error);
    const tbody = document.querySelector('#recent-bugs-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">Failed to load recent bugs</td></tr>';
    }
  }
}

function displayRecentBugs(bugs) {
  console.log('Displaying recent bugs:', bugs);
  
  const tbody = document.querySelector('#recent-bugs-table tbody');
  if (!tbody) return;

  // Safe array handling
  if (!bugs || !Array.isArray(bugs) || bugs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500">No recent bugs</td></tr>';
    return;
  }

  tbody.innerHTML = bugs
    .slice(0, 10) // Limit to 10 recent bugs
    .map((bug) => `
        <tr>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                    #${bug.bug_id}: ${utils.escapeHtml(bug.title ? bug.title.substring(0, 40) : 'Untitled')}${(bug.title && bug.title.length > 40) ? '...' : ''}
                </a>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getPriorityClass(bug.priority)}">
                    ${bug.priority || 'Medium'}
                </span>
            </td>
            <td class="hidden-tablet">
                <span class="badge ${utils.getStatusClass(bug.status)}">
                    ${bug.status || 'New'}
                </span>
            </td>
            <td class="hidden-desktop">${utils.formatDate(bug.created_at)}</td>
        </tr>
    `)
    .join('');
}

async function loadMyBugs() {
  try {
    console.log('Loading my bugs...');
    // Try to get bugs assigned to current user
    const response = await utils.apiRequest('bugs.php?action=list&assignee=me&per_page=5');
    console.log('My bugs response:', response);
    
    // Handle response format
    const bugs = response.bugs || [];
    displayMyBugs(bugs);
  } catch (error) {
    console.error('Failed to load my bugs:', error);
    const container = document.getElementById('my-bugs-list');
    if (container) {
      container.innerHTML = '<div class="text-center text-red-500">Failed to load assigned bugs</div>';
    }
  }
}

function displayMyBugs(bugs) {
  console.log('Displaying my bugs:', bugs);
  
  const container = document.getElementById('my-bugs-list');
  if (!container) return;

  // Safe array handling
  if (!bugs || !Array.isArray(bugs) || bugs.length === 0) {
    container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-check-circle text-3xl mb-2 text-green-400"></i>
                <p>All caught up! No bugs assigned to you.</p>
            </div>
        `;
    return;
  }

  container.innerHTML = bugs
    .slice(0, 5) // Limit to 5 bugs
    .map((bug) => `
        <div class="bug-item">
            <div class="bug-item-header">
                <a href="bugdetail.html?id=${bug.bug_id}" class="bug-item-title">
                    #${bug.bug_id}: ${utils.escapeHtml(bug.title ? bug.title.substring(0, 50) : 'Untitled')}${(bug.title && bug.title.length > 50) ? '...' : ''}
                </a>
                <div class="bug-item-badges">
                    <span class="badge ${utils.getPriorityClass(bug.priority)}">
                        ${bug.priority || 'Medium'}
                    </span>
                    <span class="badge ${utils.getStatusClass(bug.status)}">
                        ${bug.status || 'New'}
                    </span>
                </div>
            </div>
        </div>
    `)
    .join('');
}