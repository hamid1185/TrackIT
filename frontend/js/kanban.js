// Kanban board JavaScript

const kanbanData = {
    'New': [],
    'In Progress': [],
    'Resolved': [],
    'Closed': []
};

const kanbanApi = {
    async getBugs() {
        return await api.request('bugs.php?action=list&per_page=100');
    },

    async updateBugStatus(bugId, newStatus) {
        const formData = new FormData();
        formData.append('bug_id', bugId);
        formData.append('status', newStatus);

        return await api.request('updatebugstatus.php', {
            method: 'POST',
            body: formData
        });
    }
};

const kanbanUI = {
    displayBoard() {
        console.log('Displaying kanban board...');
        
        Object.keys(kanbanData).forEach(status => {
            const columnId = this.getColumnId(status);
            const column = document.getElementById(columnId);

            if (!column) {
                console.warn(`Column not found: ${columnId} for status: ${status}`);
                return;
            }

            const bugsList = kanbanData[status] || [];
            
            if (bugsList.length === 0) {
                column.innerHTML = `
                    <div class="kanban-empty">
                        <i class="fas fa-inbox"></i>
                        <p>No ${status.toLowerCase()} bugs</p>
                    </div>
                `;
            } else {
                column.innerHTML = bugsList.map(bug => this.createCard(bug)).join('');
            }
        });
    },

    createCard(bug) {
        const priorityClass = bug.priority ? bug.priority.toLowerCase() : 'medium';
        
        return `
            <div class="kanban-card priority-${priorityClass}" 
                 draggable="true" 
                 data-bug-id="${bug.bug_id}"
                 data-status="${bug.status || 'New'}">
                <div class="card-header">
                    <span class="card-id">#${bug.bug_id}</span>
                    <span class="card-priority badge ${css.getPriorityClass(bug.priority)}">
                        ${bug.priority || 'Medium'}
                    </span>
                </div>
                <div class="card-title">
                    <a href="bugdetail.html?id=${bug.bug_id}">
                        ${format.escapeHtml(bug.title || 'Untitled Bug')}
                    </a>
                </div>
                <div class="card-meta">
                    <div class="card-assignee">
                        <i class="fas fa-user"></i>
                        <span>${bug.assignee_name || 'Unassigned'}</span>
                    </div>
                    <div class="card-date">
                        ${format.date(bug.created_at).split(',')[0]}
                    </div>
                </div>
            </div>
        `;
    },

    getColumnId(status) {
        const columnMap = {
            'New': 'new-column',
            'In Progress': 'progress-column',
            'Resolved': 'resolved-column',
            'Closed': 'closed-column'
        };
        return columnMap[status] || 'new-column';
    },

    updateBugCounts() {
        Object.keys(kanbanData).forEach(status => {
            const countId = this.getCountId(status);
            const countElement = document.getElementById(countId);
            if (countElement) {
                const count = kanbanData[status] ? kanbanData[status].length : 0;
                countElement.textContent = count;
            }
        });
    },

    getCountId(status) {
        const countMap = {
            'New': 'new-count',
            'In Progress': 'progress-count',
            'Resolved': 'resolved-count',
            'Closed': 'closed-count'
        };
        return countMap[status] || 'new-count';
    },

    showSuccessToast(message) {
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
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2000);
    }
};

const kanbanDragDrop = {
    setup() {
        console.log('Setting up drag and drop...');
        
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));

        document.querySelectorAll('.column-content').forEach(column => {
            column.addEventListener('dragover', this.handleDragOver.bind(this));
            column.addEventListener('drop', this.handleDrop.bind(this));
            column.addEventListener('dragenter', this.handleDragEnter.bind(this));
            column.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },

    handleDragStart(e) {
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
    },

    handleDragEnd(e) {
        if (!e.target.classList.contains('kanban-card')) return;
        e.target.classList.remove('dragging');
    },

    handleDragOver(e) {
        e.preventDefault();
    },

    handleDragEnter(e) {
        if (e.target.classList.contains('column-content')) {
            e.target.classList.add('drag-over');
        }
    },

    handleDragLeave(e) {
        if (e.target.classList.contains('column-content')) {
            e.target.classList.remove('drag-over');
        }
    },

    async handleDrop(e) {
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
                return;
            }

            await kanbanApi.updateBugStatus(data.bugId, newStatus);
            kanbanUI.showSuccessToast(`Bug #${data.bugId} moved to ${newStatus}`);
            
            await kanban.loadData();
            
        } catch (error) {
            console.error('Drop failed:', error);
            ui.showError('Failed to update bug status: ' + error.message);
        }
    }
};

const kanban = {
    async init() {
        console.log('Kanban board loading...');
        
        const user = await auth.check();
        if (!user) return;

        try {
            await this.loadData();
            kanbanDragDrop.setup();
        } catch (error) {
            console.error('Failed to initialize kanban:', error);
            ui.showError('Failed to load kanban board');
        }
    },

    async loadData() {
        try {
            console.log('Loading kanban data...');
            const response = await kanbanApi.getBugs();
            console.log('Kanban data response:', response);
            
            // Clear existing data
            Object.keys(kanbanData).forEach(status => {
                kanbanData[status] = [];
            });

            const bugsList = response.bugs || [];
            
            if (!Array.isArray(bugsList)) {
                console.warn('Expected bugs array, got:', bugsList);
                throw new Error('Invalid response format from server');
            }

            // Group bugs by status
            bugsList.forEach(bug => {
                if (bug.status && kanbanData[bug.status]) {
                    kanbanData[bug.status].push(bug);
                } else {
                    kanbanData['New'].push(bug);
                }
            });

            console.log('Grouped kanban data:', kanbanData);

            kanbanUI.displayBoard();
            kanbanUI.updateBugCounts();
            
        } catch (error) {
            console.error('Failed to load kanban data:', error);
            ui.showError('Failed to load kanban data: ' + error.message);
            
            kanbanUI.displayBoard();
            kanbanUI.updateBugCounts();
        }
    }
};

// Initialize kanban board
document.addEventListener('DOMContentLoaded', () => {
    kanban.init();
});