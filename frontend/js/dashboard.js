// Dashboard JavaScript

const dashboardApi = {
    async getStats() {
        return await api.request('dashboard.php?action=stats');
    },

    async getRecentBugs() {
        return await api.request('dashboard.php?action=recent');
    },

    async getMyBugs() {
        return await api.request('bugs.php?action=list&assignee=me&per_page=5');
    }
};

const dashboardUI = {
    displayStats(stats) {
        console.log('Displaying stats:', stats);
        
        const elements = {
            'total-bugs': stats.total_bugs || 0,
            'my-bugs': stats.my_bugs || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Calculate active bugs (New + In Progress)
        let activeCount = 0;
        if (stats.status_counts && Array.isArray(stats.status_counts)) {
            activeCount = stats.status_counts.reduce((sum, status) => {
                if (status.status === 'New' || status.status === 'In Progress') {
                    return sum + parseInt(status.count || 0);
                }
                return sum;
            }, 0);
        }
        
        const activeBugs = document.getElementById('active-bugs');
        if (activeBugs) activeBugs.textContent = activeCount;

        // Get critical bugs count
        let criticalCount = 0;
        if (stats.priority_counts && Array.isArray(stats.priority_counts)) {
            const criticalPriority = stats.priority_counts.find(p => p.priority === 'Critical');
            criticalCount = criticalPriority ? parseInt(criticalPriority.count || 0) : 0;
        }
        
        const criticalBugs = document.getElementById('critical-bugs');
        if (criticalBugs) criticalBugs.textContent = criticalCount;

        if (stats.status_counts) {
            this.displayStatusOverview(stats.status_counts);
        }
    },

    displayStatusOverview(statusCounts) {
        const container = document.getElementById('status-overview');
        if (!container) return;

        console.log('Displaying status overview:', statusCounts);

        const statusMap = {
            'New': { color: 'new', count: 0 },
            'In Progress': { color: 'progress', count: 0 },
            'Resolved': { color: 'resolved', count: 0 },
            'Closed': { color: 'closed', count: 0 }
        };

        if (statusCounts && Array.isArray(statusCounts)) {
            statusCounts.forEach(status => {
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
    },

    displayRecentBugs(bugsList) {
        console.log('Displaying recent bugs:', bugsList);
        
        const tbody = document.querySelector('#recent-bugs-table tbody');
        if (!tbody) return;

        if (!bugsList || !Array.isArray(bugsList) || bugsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500">No recent bugs</td></tr>';
            return;
        }

        tbody.innerHTML = bugsList
            .slice(0, 10)
            .map(bug => `
                <tr>
                    <td>
                        <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                            #${bug.bug_id}: ${format.text(bug.title ? bug.title.substring(0, 40) : 'Untitled', 40)}${(bug.title && bug.title.length > 40) ? '...' : ''}
                        </a>
                    </td>
                    <td class="hidden-mobile">
                        <span class="badge ${css.getPriorityClass(bug.priority)}">
                            ${bug.priority || 'Medium'}
                        </span>
                    </td>
                    <td class="hidden-tablet">
                        <span class="badge ${css.getStatusClass(bug.status)}">
                            ${bug.status || 'New'}
                        </span>
                    </td>
                    <td class="hidden-desktop">${format.date(bug.created_at)}</td>
                </tr>
            `)
            .join('');
    },

    displayMyBugs(bugsList) {
        console.log('Displaying my bugs:', bugsList);
        
        const container = document.getElementById('my-bugs-list');
        if (!container) return;

        if (!bugsList || !Array.isArray(bugsList) || bugsList.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-check-circle text-3xl mb-2 text-green-400"></i>
                    <p>All caught up! No bugs assigned to you.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bugsList
            .slice(0, 5)
            .map(bug => `
                <div class="bug-item">
                    <div class="bug-item-header">
                        <a href="bugdetail.html?id=${bug.bug_id}" class="bug-item-title">
                            #${bug.bug_id}: ${format.text(bug.title ? bug.title.substring(0, 50) : 'Untitled', 50)}${(bug.title && bug.title.length > 50) ? '...' : ''}
                        </a>
                        <div class="bug-item-badges">
                            <span class="badge ${css.getPriorityClass(bug.priority)}">
                                ${bug.priority || 'Medium'}
                            </span>
                            <span class="badge ${css.getStatusClass(bug.status)}">
                                ${bug.status || 'New'}
                            </span>
                        </div>
                    </div>
                </div>
            `)
            .join('');
    }
};

const dashboard = {
    async init() {
        console.log('Dashboard loading...');
        
        const user = await auth.check();
        if (!user) return;

        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentBugs(),
                this.loadMyBugs()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            ui.showError('Failed to load dashboard data');
        }
    },

    async loadStats() {
        try {
            console.log('Loading dashboard stats...');
            const response = await dashboardApi.getStats();
            console.log('Stats response:', response);
            
            dashboardUI.displayStats(response);
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            ui.showError('Failed to load dashboard statistics');
            
            dashboardUI.displayStats({
                total_bugs: 0,
                my_bugs: 0,
                status_counts: [],
                priority_counts: []
            });
        }
    },

    async loadRecentBugs() {
        try {
            console.log('Loading recent bugs...');
            const response = await dashboardApi.getRecentBugs();
            console.log('Recent bugs response:', response);
            
            const bugsList = response.recent_bugs || response.bugs || [];
            dashboardUI.displayRecentBugs(bugsList);
        } catch (error) {
            console.error('Failed to load recent bugs:', error);
            const tbody = document.querySelector('#recent-bugs-table tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">Failed to load recent bugs</td></tr>';
            }
        }
    },

    async loadMyBugs() {
        try {
            console.log('Loading my bugs...');
            const response = await dashboardApi.getMyBugs();
            console.log('My bugs response:', response);
            
            const bugsList = response.bugs || [];
            dashboardUI.displayMyBugs(bugsList);
        } catch (error) {
            console.error('Failed to load my bugs:', error);
            const container = document.getElementById('my-bugs-list');
            if (container) {
                container.innerHTML = '<div class="text-center text-red-500">Failed to load assigned bugs</div>';
            }
        }
    }
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});