// Authentication JavaScript

const API_BASE = '/bugsagev3/backend/api/';

const authApi = {
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : API_BASE + url;
        
        try {
            console.log('Making API request to:', fullUrl);
            
            const response = await fetch(fullUrl, {
                credentials: 'same-origin',
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
    }
};

const authUI = {
    showError(message, containerId = 'error-message') {
        console.error('Error:', message);
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            setTimeout(() => container.style.display = 'none', 5000);
        } else {
            alert('Error: ' + message);
        }
    },

    showSuccess(message, containerId = 'success-message') {
        console.log('Success:', message);
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
            setTimeout(() => container.style.display = 'none', 3000);
        } else {
            alert('Success: ' + message);
        }
    },

    hideMessages() {
        const errorMsg = document.getElementById('error-message');
        const successMsg = document.getElementById('success-message');
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    },

    setButtonLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (originalText.includes('Sign') ? 'Signing in...' : 'Creating Account...');
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
};

const authValidation = {
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validateLoginForm(email, password) {
        if (!email || !password) {
            throw new Error("Please fill in all fields");
        }

        if (!this.isValidEmail(email)) {
            throw new Error("Please enter a valid email address");
        }
    },

    validateRegisterForm(name, email, password) {
        if (!name || !email || !password) {
            throw new Error("Please fill in all fields");
        }

        if (!this.isValidEmail(email)) {
            throw new Error("Please enter a valid email address");
        }

        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }
    }
};

const authHandlers = {
    async checkAuthStatus() {
        try {
            const response = await authApi.request("auth.php?action=check");
            if (response.authenticated) {
                console.log('User already authenticated, redirecting to dashboard');
                window.location.href = "dashboard.html";
            }
        } catch (error) {
            console.log("User not authenticated:", error.message);
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        
        authUI.hideMessages();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            authValidation.validateLoginForm(email, password);
        } catch (error) {
            authUI.showError(error.message);
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        authUI.setButtonLoading(submitBtn, true, originalText);

        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("password", password);

            const response = await authApi.request("auth.php?action=login", {
                method: "POST",
                body: formData
            });

            if (response.success && response.authenticated) {
                authUI.showSuccess("Login successful! Redirecting...");
                console.log('Login successful, user:', response.user);
                
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            } else {
                throw new Error('Login failed - invalid response');
            }
        } catch (error) {
            console.error("Login failed:", error);
            authUI.showError(error.message || "Login failed. Please try again.");
        } finally {
            authUI.setButtonLoading(submitBtn, false, originalText);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        
        authUI.hideMessages();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        try {
            authValidation.validateRegisterForm(name, email, password);
        } catch (error) {
            authUI.showError(error.message);
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        authUI.setButtonLoading(submitBtn, true, originalText);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("role", role);

            const response = await authApi.request("auth.php?action=register", {
                method: "POST",
                body: formData
            });

            if (response.success) {
                authUI.showSuccess("Registration successful! Redirecting to login...");
                console.log('Registration successful');
                
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
            } else {
                throw new Error('Registration failed - invalid response');
            }
        } catch (error) {
            console.error("Registration failed:", error);
            authUI.showError(error.message || "Registration failed. Please try again.");
        } finally {
            authUI.setButtonLoading(submitBtn, false, originalText);
        }
    }
};

// Initialize authentication page
document.addEventListener("DOMContentLoaded", () => {
    console.log('Auth page loaded');
    
    // Check if user is already logged in
    authHandlers.checkAuthStatus();

    // Setup login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", authHandlers.handleLogin);
    }

    // Setup register form
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", authHandlers.handleRegister);
    }

    // Hide messages when user starts typing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', authUI.hideMessages);
    });
});

// Export for compatibility
window.authUtils = { ...authUI, apiRequest: authApi.request };