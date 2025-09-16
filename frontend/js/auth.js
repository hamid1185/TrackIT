// Authentication JavaScript

// API base URL - adjust this path according to your setup
const API_BASE = '/bugsagev3/backend/api/';

const utils = {
  apiRequest: async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;
    
    try {
      console.log('Making API request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        credentials: 'same-origin', // Include cookies
        ...options
      });
      
      console.log('Response status:', response.status);
      
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
        throw new Error("Server returned non-JSON response: " + text);
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  showError: (message, containerId = 'error-message') => {
    console.error('Error:', message);
    const container = document.getElementById(containerId);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      // Auto-hide after 5 seconds
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    } else {
      alert('Error: ' + message);
    }
  },

  showSuccess: (message, containerId = 'success-message') => {
    console.log('Success:', message);
    const container = document.getElementById(containerId);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      // Auto-hide after 3 seconds
      setTimeout(() => {
        container.style.display = 'none';
      }, 3000);
    } else {
      alert('Success: ' + message);
    }
  },

  hideMessages: () => {
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
  }
};

document.addEventListener("DOMContentLoaded", () => {
  console.log('Auth page loaded');
  
  // Check if user is already logged in
  checkAuthStatus();

  // Setup login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Setup register form
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Hide messages when user starts typing
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', utils.hideMessages);
  });
});

async function checkAuthStatus() {
  try {
    const response = await utils.apiRequest("auth.php?action=check");
    if (response.authenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      // User is already logged in, redirect to dashboard
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    // User is not logged in, stay on current page
    console.log("User not authenticated:", error.message);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  utils.hideMessages();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    utils.showError("Please fill in all fields");
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    utils.showError("Please enter a valid email address");
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const response = await utils.apiRequest("auth.php?action=login", {
      method: "POST",
      body: formData
    });

    if (response.success && response.authenticated) {
      utils.showSuccess("Login successful! Redirecting...");
      console.log('Login successful, user:', response.user);
      
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      throw new Error('Login failed - invalid response');
    }
  } catch (error) {
    console.error("Login failed:", error);
    utils.showError(error.message || "Login failed. Please try again.");
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  utils.hideMessages();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!name || !email || !password) {
    utils.showError("Please fill in all fields");
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    utils.showError("Please enter a valid email address");
    return;
  }

  if (password.length < 6) {
    utils.showError("Password must be at least 6 characters long");
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    const response = await utils.apiRequest("auth.php?action=register", {
      method: "POST",
      body: formData
    });

    if (response.success) {
      utils.showSuccess("Registration successful! Redirecting to login...");
      console.log('Registration successful');
      
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      throw new Error('Registration failed - invalid response');
    }
  } catch (error) {
    console.error("Registration failed:", error);
    utils.showError(error.message || "Registration failed. Please try again.");
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Export utils for use in other files
window.authUtils = utils;