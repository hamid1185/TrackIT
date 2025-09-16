// Bug form JavaScript

// Declare checkAuth and utils variables
const checkAuth = async () => {
  // Placeholder for authentication check
  return true // Assume user is authenticated for now
}

const utils = {
  apiRequest: async (url, options = {}) => {
    // Placeholder for API request
    return fetch(url, options).then((response) => response.json())
  },
  showError: (message) => {
    alert(message)
  },
  showSuccess: (message) => {
    alert(message)
  },
  escapeHtml: (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  },
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  const user = await checkAuth()
  if (!user) return

  // Load form data
  loadProjects()
  loadUsers()

  // Setup form submission
  const bugForm = document.getElementById("bug-form")
  if (bugForm) {
    bugForm.addEventListener("submit", handleBugSubmission)
  }

  // Setup cancel button
  const cancelBtn = document.getElementById("cancel-btn")
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "buglist.html"
    })
  }
})

async function loadProjects() {
  try {
    const response = await utils.apiRequest("projects.php?action=list")
    const projectSelect = document.getElementById("project_id")

    if (projectSelect && response.projects) {
      response.projects.forEach((project) => {
        const option = document.createElement("option")
        option.value = project.project_id
        option.textContent = project.name
        projectSelect.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Failed to load projects:", error)
  }
}

async function loadUsers() {
  try {
    console.log('Loading users for assignment...');
    
    const response = await utils.apiRequest('users.php?action=list');
    console.log('Users response:', response);
    
    const assigneeSelect = document.getElementById('assignee_id');
    if (!assigneeSelect) {
      console.warn('Assignee select element not found');
      return;
    }

    // Clear existing options except the first one
    while (assigneeSelect.children.length > 1) {
      assigneeSelect.removeChild(assigneeSelect.lastChild);
    }

    const users = response.users || [];
    if (users.length === 0) {
      console.log('No users available');
      return;
    }

    users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.user_id;
      option.textContent = `${user.name} (${user.role})`;
      assigneeSelect.appendChild(option);
    });

    console.log(`Loaded ${users.length} users`);
  } catch (error) {
    console.error('Failed to load users:', error);
    
    // Fallback to mock users if API fails
    console.log('Using fallback mock users...');
    const mockUsers = [
      { user_id: 1, name: 'Admin User', role: 'Admin' },
      { user_id: 2, name: 'Alice Johnson', role: 'Developer' },
      { user_id: 3, name: 'Bob Smith', role: 'Tester' },
      { user_id: 4, name: 'Carol Davis', role: 'Developer' },
      { user_id: 5, name: 'David Wilson', role: 'Tester' }
    ];

    const assigneeSelect = document.getElementById('assignee_id');
    if (assigneeSelect) {
      mockUsers.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.user_id;
        option.textContent = `${user.name} (${user.role})`;
        assigneeSelect.appendChild(option);
      });
    }
  }
}

async function handleBugSubmission(e) {
  e.preventDefault()

  const title = document.getElementById("title").value.trim()
  const description = document.getElementById("description").value.trim()
  const priority = document.getElementById("priority").value
  const projectId = document.getElementById("project_id").value
  const assigneeId = document.getElementById("assignee_id").value

  if (!title || !description) {
    utils.showError("Title and description are required")
    return
  }

  try {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("priority", priority)
    if (projectId) formData.append("project_id", projectId)
    if (assigneeId) formData.append("assignee_id", assigneeId)

    const response = await utils.apiRequest("bugs.php?action=create", {
      method: "POST",
      body: formData,
      headers: {},
    })

    if (response.warning && response.duplicates) {
      // Show duplicate warning
      displayDuplicateWarning(response.duplicates)
    } else if (response.success) {
      utils.showSuccess("Bug created successfully!")
      setTimeout(() => {
        window.location.href = `bugdetail.html?id=${response.bug_id}`
      }, 1500)
    }
  } catch (error) {
    console.error("Failed to create bug:", error)
    utils.showError(error.message || "Failed to create bug")
  }
}

function displayDuplicateWarning(duplicates) {
  const warningContainer = document.getElementById("duplicate-warning")
  if (!warningContainer) return

  const duplicatesList = duplicates
    .map(
      (dup) =>
        `<li><a href="bugdetail.html?id=${dup.bug_id}" class="text-blue-600 hover:text-blue-800">#${dup.bug_id}: ${utils.escapeHtml(dup.title)}</a></li>`,
    )
    .join("")

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
    `

  warningContainer.style.display = "block"

  // Setup buttons
  document.getElementById("continue-anyway").addEventListener("click", () => {
    // Force create the bug
    forceBugCreation()
  })

  document.getElementById("cancel-create").addEventListener("click", () => {
    warningContainer.style.display = "none"
  })
}

async function forceBugCreation() {
  const title = document.getElementById("title").value.trim()
  const description = document.getElementById("description").value.trim()
  const priority = document.getElementById("priority").value
  const projectId = document.getElementById("project_id").value
  const assigneeId = document.getElementById("assignee_id").value

  try {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("priority", priority)
    formData.append("force_create", "true") // Flag to bypass duplicate check
    if (projectId) formData.append("project_id", projectId)
    if (assigneeId) formData.append("assignee_id", assigneeId)

    const response = await utils.apiRequest("bugs.php?action=create", {
      method: "POST",
      body: formData,
      headers: {},
    })

    if (response.success) {
      utils.showSuccess("Bug created successfully!")
      setTimeout(() => {
        window.location.href = `bugdetail.html?id=${response.bug_id}`
      }, 1500)
    }
  } catch (error) {
    console.error("Failed to force create bug:", error)
    utils.showError(error.message || "Failed to create bug")
  }
}
