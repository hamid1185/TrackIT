// Admin panel JavaScript

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication and admin role
  const user = await checkAuth()
  if (!user) return

  if (user.role !== "Admin") {
    utils.showError("Access denied. Admin privileges required.")
    setTimeout(() => {
      window.location.href = "dashboard.html"
    }, 2000)
    return
  }

  // Load admin data
  loadProjects()
  loadUsers()

  // Setup event listeners
  setupEventListeners()
})

function setupEventListeners() {
  // Add project button
  const addProjectBtn = document.getElementById("add-project-btn")
  if (addProjectBtn) {
    addProjectBtn.addEventListener("click", showProjectModal)
  }

  // Project form submission
  const projectForm = document.getElementById("project-form")
  if (projectForm) {
    projectForm.addEventListener("submit", handleProjectSubmission)
  }

  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeModal)
  })

  // Close modal when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal()
    }
  })
}

async function loadProjects() {
  try {
    const response = await utils.apiRequest("projects.php?action=list")
    displayProjects(response.projects)
  } catch (error) {
    console.error("Failed to load projects:", error)
    const container = document.getElementById("projects-list")
    if (container) {
      container.innerHTML = '<div class="text-center text-red-500">Failed to load projects</div>'
    }
  }
}

function displayProjects(projects) {
  const container = document.getElementById("projects-list")
  if (!container) return

  if (projects.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500">No projects found</div>'
    return
  }

  container.innerHTML = projects
    .map(
      (project) => `
        <div class="project-item">
            <div class="project-header">
                <h4 class="project-title">${utils.escapeHtml(project.name)}</h4>
                <div class="admin-item-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editProject(${project.project_id})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                </div>
            </div>
            ${project.description ? `<div class="project-description">${utils.escapeHtml(project.description)}</div>` : ""}
            <div class="project-stats">
                <div class="project-stat">
                    <i class="fas fa-bug"></i>
                    <span>${project.bug_count || 0} bugs</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-calendar"></i>
                    <span>Created ${utils.formatDate(project.created_at)}</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}

async function loadUsers() {
  try {
    // For now, we'll create a mock user list since we don't have a users API endpoint
    const mockUsers = [
      { user_id: 1, name: "Admin User", email: "admin@bugsage.com", role: "Admin" },
      { user_id: 2, name: "Alice Johnson", email: "alice@bugsage.com", role: "Developer" },
      { user_id: 3, name: "Bob Smith", email: "bob@bugsage.com", role: "Tester" },
      { user_id: 4, name: "Carol Davis", email: "carol@bugsage.com", role: "Developer" },
      { user_id: 5, name: "David Wilson", email: "david@bugsage.com", role: "Tester" },
    ]

    displayUsers(mockUsers)
  } catch (error) {
    console.error("Failed to load users:", error)
    const container = document.getElementById("users-list")
    if (container) {
      container.innerHTML = '<div class="text-center text-red-500">Failed to load users</div>'
    }
  }
}

function displayUsers(users) {
  const container = document.getElementById("users-list")
  if (!container) return

  if (users.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500">No users found</div>'
    return
  }

  container.innerHTML = users
    .map(
      (user) => `
        <div class="user-item">
            <div class="user-info">
                <h4>${utils.escapeHtml(user.name)}</h4>
                <div class="user-email">${utils.escapeHtml(user.email)}</div>
            </div>
            <div class="user-role ${user.role.toLowerCase()}">${user.role}</div>
            <div class="user-actions">
                <button class="btn btn-sm btn-secondary" onclick="editUser(${user.user_id})">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
            </div>
        </div>
    `,
    )
    .join("")
}

function showProjectModal() {
  const modal = document.getElementById("project-modal")
  if (modal) {
    modal.style.display = "flex"
    // Clear form
    document.getElementById("project-name").value = ""
    document.getElementById("project-description").value = ""
  }
}

function closeModal() {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    modal.style.display = "none"
  })
}

async function handleProjectSubmission(e) {
  e.preventDefault()

  const name = document.getElementById("project-name").value.trim()
  const description = document.getElementById("project-description").value.trim()

  if (!name) {
    utils.showError("Project name is required")
    return
  }

  try {
    const formData = new FormData()
    formData.append("name", name)
    formData.append("description", description)

    const response = await utils.apiRequest("projects.php?action=create", {
      method: "POST",
      body: formData,
      headers: {},
    })

    if (response.success) {
      utils.showSuccess("Project created successfully!")
      closeModal()
      loadProjects() // Reload the projects list
    }
  } catch (error) {
    console.error("Failed to create project:", error)
    utils.showError(error.message || "Failed to create project")
  }
}

// Placeholder functions for edit functionality
function editProject(projectId) {
  utils.showError("Edit project functionality not implemented yet")
}

function editUser(userId) {
  utils.showError("Edit user functionality not implemented yet")
}

// Global functions for button onclick handlers
window.editProject = editProject
window.editUser = editUser
