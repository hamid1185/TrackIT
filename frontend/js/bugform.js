// Bug form JavaScript

const bugFormApi = {
    async getProjects() {
        return await api.request("projects.php?action=list");
    },

    async getUsers() {
        return await api.request('users.php?action=list');
    },

    async createBug(formData) {
        return await api.request("bugs.php?action=create", {
            method: "POST",
            body: formData,
            headers: {},
        });
    }
};

const bugFormUI = {
    populateProjects(projects) {
        const projectSelect = document.getElementById("project_id");
        if (!projectSelect || !projects) return;

        projects.forEach(project => {
            const option = document.createElement("option");
            option.value = project.project_id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    },

    populateUsers(users) {
        const assigneeSelect = document.getElementById('assignee_id');
        if (!assigneeSelect) return;

        // Clear existing options except the first one
        while (assigneeSelect.children.length > 1) {
            assigneeSelect.removeChild(assigneeSelect.lastChild);
        }

        if (!users || users.length === 0) {
            console.log('No users available');
            return;
        }

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.user_id;
            option.textContent = `${user.name} (${user.role})`;
            assigneeSelect.appendChild(option);
        });

        console.log(`Loaded ${users.length} users`);
    },

    displayDuplicateWarning(duplicates) {
        const warningContainer = document.getElementById("duplicate-warning");
        if (!warningContainer) return;

        const duplicatesList = duplicates
            .map(dup => `
                <li>
                    <a href="bugdetail.html?id=${dup.bug_id}" class="text-blue-600 hover:text-blue-800">
                        #${dup.bug_id}: ${format.escapeHtml(dup.title)}
                    </a>
                </li>
            `)
            .join("");

        warningContainer.innerHTML = `
            <div class="mb-4">
                <strong>Potential duplicates found:</strong>
                <ul class="mt-2 ml-4 list-disc">
                    ${duplicatesList}
                </ul>
                <div class="mt-3">
                    <button type="button" id="continue-anyway" class="btn btn-warning btn-sm">Create Anyway</button>
                    <button type="button" id="cancel-create" class="btn btn-secondary btn-sm">Cancel</button>
                </div>
            </div>
        `;

        warningContainer.style.display = "block";

        // Setup buttons
        document.getElementById("continue-anyway").addEventListener("click", () => {
            bugForm.forceCreate();
        });

        document.getElementById("cancel-create").addEventListener("click", () => {
            warningContainer.style.display = "none";
        });
    }
};

const bugForm = {
    async init() {
        const user = await auth.check();
        if (!user) return;

        await this.loadFormData();
        this.setupEventListeners();
    },

    async loadFormData() {
        try {
            const [projectsResponse, usersResponse] = await Promise.all([
                bugFormApi.getProjects().catch(() => ({ projects: [] })),
                bugFormApi.getUsers().catch(() => ({ users: this.getMockUsers() }))
            ]);

            bugFormUI.populateProjects(projectsResponse.projects);
            bugFormUI.populateUsers(usersResponse.users);
        } catch (error) {
            console.error("Failed to load form data:", error);
        }
    },

    getMockUsers() {
        return [
            { user_id: 1, name: 'Admin User', role: 'Admin' },
            { user_id: 2, name: 'Alice Johnson', role: 'Developer' },
            { user_id: 3, name: 'Bob Smith', role: 'Tester' },
            { user_id: 4, name: 'Carol Davis', role: 'Developer' },
            { user_id: 5, name: 'David Wilson', role: 'Tester' }
        ];
    },

    setupEventListeners() {
        const bugFormElement = document.getElementById("bug-form");
        if (bugFormElement) {
            bugFormElement.addEventListener("submit", this.handleSubmission.bind(this));
        }

        const cancelBtn = document.getElementById("cancel-btn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                window.location.href = "buglist.html";
            });
        }
    },

    async handleSubmission(e) {
        e.preventDefault();

        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            const response = await bugFormApi.createBug(this.buildFormData(formData));

            if (response.warning && response.duplicates) {
                bugFormUI.displayDuplicateWarning(response.duplicates);
            } else if (response.success) {
                ui.showSuccess("Bug created successfully!");
                setTimeout(() => {
                    window.location.href = `bugdetail.html?id=${response.bug_id}`;
                }, 1500);
            }
        } catch (error) {
            console.error("Failed to create bug:", error);
            ui.showError(error.message || "Failed to create bug");
        }
    },

    getFormData() {
        return {
            title: document.getElementById("title").value.trim(),
            description: document.getElementById("description").value.trim(),
            priority: document.getElementById("priority").value,
            projectId: document.getElementById("project_id").value,
            assigneeId: document.getElementById("assignee_id").value
        };
    },

    validateForm(formData) {
        if (!formData.title || !formData.description) {
            ui.showError("Title and description are required");
            return false;
        }
        return true;
    },

    buildFormData(formData) {
        const form = new FormData();
        form.append("title", formData.title);
        form.append("description", formData.description);
        form.append("priority", formData.priority);
        if (formData.projectId) form.append("project_id", formData.projectId);
        if (formData.assigneeId) form.append("assignee_id", formData.assigneeId);
        return form;
    },

    async forceCreate() {
        const formData = this.getFormData();
        
        try {
            const form = this.buildFormData(formData);
            form.append("force_create", "true");

            const response = await bugFormApi.createBug(form);

            if (response.success) {
                ui.showSuccess("Bug created successfully!");
                setTimeout(() => {
                    window.location.href = `bugdetail.html?id=${response.bug_id}`;
                }, 1500);
            }
        } catch (error) {
            console.error("Failed to force create bug:", error);
            ui.showError(error.message || "Failed to create bug");
        }
    }
};

// Initialize bug form
document.addEventListener("DOMContentLoaded", () => {
    bugForm.init();
});