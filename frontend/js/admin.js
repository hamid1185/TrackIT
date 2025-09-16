// Admin panel JavaScript

const adminApi = {
    async getProjects() {
        return await api.request("projects.php?action=list");
    },

    async createProject(formData) {
        return await api.request("projects.php?action=create", {
            method: "POST",
            body: formData,
            headers: {},
        });
    }
};

const adminUI = {
    displayProjects(projects) {
        const container = document.getElementById("projects-list");
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500">No projects found</div>';
            return;
        }

        container.innerHTML = projects
            .map(project => `
                <div class="project-item">
                    <div class="project-header">
                        <h4 class="project-title">${format.escapeHtml(project.name)}</h4>
                        <div class="admin-item-actions">
                            <button class="btn btn-sm btn-secondary" onclick="admin.editProject(${project.project_id})">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                        </div>
                    </div>
                    ${project.description ? `<div class="project-description">${format.escapeHtml(project.description)}</div>` : ""}
                    <div class="project-stats">
                        <div class="project-stat">
                            <i class="fas fa-bug"></i>
                            <span>${project.bug_count || 0} bugs</span>
                        </div>
                        <div class="project-stat">
                            <i class="fas fa-calendar"></i>
                            <span>Created ${format.date(project.created_at)}</span>
                        </div>
                    </div>
                </div>
            `)
            .join("");
    },

    displayUsers(users) {
        const container = document.getElementById("users-list");
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500">No users found</div>';
            return;
        }

        container.innerHTML = users
            .map(user => `
                <div class="user-item">
                    <div class="user-info">
                        <h4>${format.escapeHtml(user.name)}</h4>
                        <div class="user-email">${format.escapeHtml(user.email)}</div>
                    </div>
                    <div class="user-role ${user.role.toLowerCase()}">${user.role}</div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-secondary" onclick="admin.editUser(${user.user_id})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                    </div>
                </div>
            `)
            .join("");
    },

    showProjectModal() {
        const modal = document.getElementById("project-modal");
        if (modal) {
            modal.style.display = "flex";
            document.getElementById("project-name").value = "";
            document.getElementById("project-description").value = "";
        }
    },

    closeModal() {
        const modals = document.querySelectorAll(".modal");
        modals.forEach(modal => {
            modal.style.display = "none";
        });
    }
};

const admin = {
    async init() {
        const user = await auth.check();
        if (!user) return;

        if (user.role !== "Admin") {
            ui.showError("Access denied. Admin privileges required.");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 2000);
            return;
        }

        await this.loadData();
        this.setupEventListeners();
    },

    async loadData() {
        try {
            await Promise.all([
                this.loadProjects(),
                this.loadUsers()
            ]);
        } catch (error) {
            console.error("Failed to load admin data:", error);
            ui.showError("Failed to load admin data");
        }
    },

    async loadProjects() {
        try {
            const response = await adminApi.getProjects();
            adminUI.displayProjects(response.projects);
        } catch (error) {
            console.error("Failed to load projects:", error);
            const container = document.getElementById("projects-list");
            if (container) {
                container.innerHTML = '<div class="text-center text-red-500">Failed to load projects</div>';
            }
        }
    },

    async loadUsers() {
        try {
            const mockUsers = [
                { user_id: 1, name: "Admin User", email: "admin@bugsage.com", role: "Admin" },
                { user_id: 2, name: "Alice Johnson", email: "alice@bugsage.com", role: "Developer" },
                { user_id: 3, name: "Bob Smith", email: "bob@bugsage.com", role: "Tester" },
                { user_id: 4, name: "Carol Davis", email: "carol@bugsage.com", role: "Developer" },
                { user_id: 5, name: "David Wilson", email: "david@bugsage.com", role: "Tester" },
            ];

            adminUI.displayUsers(mockUsers);
        } catch (error) {
            console.error("Failed to load users:", error);
            const container = document.getElementById("users-list");
            if (container) {
                container.innerHTML = '<div class="text-center text-red-500">Failed to load users</div>';
            }
        }
    },

    setupEventListeners() {
        const addProjectBtn = document.getElementById("add-project-btn");
        if (addProjectBtn) {
            addProjectBtn.addEventListener("click", adminUI.showProjectModal);
        }

        const projectForm = document.getElementById("project-form");
        if (projectForm) {
            projectForm.addEventListener("submit", this.handleProjectSubmission.bind(this));
        }

        document.querySelectorAll(".modal-close").forEach(btn => {
            btn.addEventListener("click", adminUI.closeModal);
        });

        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("modal")) {
                adminUI.closeModal();
            }
        });
    },

    async handleProjectSubmission(e) {
        e.preventDefault();

        const name = document.getElementById("project-name").value.trim();
        const description = document.getElementById("project-description").value.trim();

        if (!name) {
            ui.showError("Project name is required");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);

            const response = await adminApi.createProject(formData);

            if (response.success) {
                ui.showSuccess("Project created successfully!");
                adminUI.closeModal();
                this.loadProjects();
            }
        } catch (error) {
            console.error("Failed to create project:", error);
            ui.showError(error.message || "Failed to create project");
        }
    },

    editProject(projectId) {
        ui.showError("Edit project functionality not implemented yet");
    },

    editUser(userId) {
        ui.showError("Edit user functionality not implemented yet");
    }
};

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
    admin.init();
});

// Global functions for button onclick handlers
window.admin = admin;