// Authentication JavaScript for Infinity Bank
document.addEventListener('DOMContentLoaded', function() {
    initAuthForms();
    initPasswordToggle();
    initForgotPassword();
    initFormValidation();
});

// Initialize Authentication Forms
function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
}

// Handle Login Form Submission
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Clear previous messages
    clearMessages(form);
    
    // Validate form
    if (!validateLoginForm(formData)) {
        return;
    }
    
    // Show loading state
    setLoadingState(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Show success message
            showMessage(form, 'Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showMessage(form, data.message || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(form, 'Network error. Please check your connection.', 'error');
    } finally {
        setLoadingState(submitBtn, false);
    }
}

// Handle Forgot Password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Clear previous messages
    clearMessages(form);
    
    // Validate form
    if (!validateForgotPasswordForm(formData)) {
        return;
    }
    
    // Show loading state
    setLoadingState(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: formData.get('username'),
                mobile: formData.get('mobile')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(form, `Password reset successful! Your temporary password is: ${data.tempPassword}`, 'success');
            
            // Close modal after 3 seconds
            setTimeout(() => {
                closeForgotPasswordModal();
            }, 3000);
        } else {
            showMessage(form, data.message || 'Password reset failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showMessage(form, 'Network error. Please check your connection.', 'error');
    } finally {
        setLoadingState(submitBtn, false);
    }
}

// Initialize Password Toggle
function initPasswordToggle() {
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = passwordToggle.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
}

// Initialize Forgot Password Modal
function initForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const modal = document.getElementById('forgotPasswordModal');
    const closeBtn = document.getElementById('closeForgotModal');
    
    if (forgotPasswordLink && modal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', closeForgotPasswordModal);
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeForgotPasswordModal();
            }
        });
    }
}

// Open Forgot Password Modal
function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Close Forgot Password Modal
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            clearMessages(form);
        }
    }
}

// Initialize Form Validation
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

// Validate Login Form
function validateLoginForm(formData) {
    let isValid = true;
    
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (!username || username.trim().length < 3) {
        showFieldError('username', 'Username must be at least 3 characters long');
        isValid = false;
    }
    
    if (!password || password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    return isValid;
}

// Validate Forgot Password Form
function validateForgotPasswordForm(formData) {
    let isValid = true;
    
    const username = formData.get('username');
    const mobile = formData.get('mobile');
    
    if (!username || username.trim().length < 3) {
        showFieldError('forgotUsername', 'Username must be at least 3 characters long');
        isValid = false;
    }
    
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
        showFieldError('forgotMobile', 'Please enter a valid 10-digit mobile number');
        isValid = false;
    }
    
    return isValid;
}

// Validate Individual Field
function validateField(input) {
    const value = input.value.trim();
    const fieldName = input.name;
    
    switch (fieldName) {
        case 'username':
            if (!value) {
                showFieldError(input, 'Username is required');
            } else if (value.length < 3) {
                showFieldError(input, 'Username must be at least 3 characters long');
            } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                showFieldError(input, 'Username can only contain letters, numbers, and underscores');
            } else {
                clearFieldError(input);
                markFieldSuccess(input);
            }
            break;
            
        case 'password':
            if (!value) {
                showFieldError(input, 'Password is required');
            } else if (value.length < 6) {
                showFieldError(input, 'Password must be at least 6 characters long');
            } else {
                clearFieldError(input);
                markFieldSuccess(input);
            }
            break;
            
        case 'mobile':
            if (!value) {
                showFieldError(input, 'Mobile number is required');
            } else if (!/^[0-9]{10}$/.test(value)) {
                showFieldError(input, 'Please enter a valid 10-digit mobile number');
            } else {
                clearFieldError(input);
                markFieldSuccess(input);
            }
            break;
    }
}

// Show Field Error
function showFieldError(fieldId, message) {
    let field;
    
    if (typeof fieldId === 'string') {
        field = document.getElementById(fieldId);
    } else {
        field = fieldId;
    }
    
    if (!field) return;
    
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    
    const inputGroup = field.closest('.input-group') || field.parentNode;
    inputGroup.appendChild(errorDiv);
    
    // Add error styling
    if (inputGroup.classList.contains('input-group')) {
        inputGroup.classList.add('error');
    }
    field.classList.add('error');
}

// Clear Field Error
function clearFieldError(field) {
    if (!field) return;
    
    const inputGroup = field.closest('.input-group') || field.parentNode;
    const existingError = inputGroup.querySelector('.field-error');
    
    if (existingError) {
        existingError.remove();
    }
    
    // Remove error styling
    if (inputGroup.classList.contains('input-group')) {
        inputGroup.classList.remove('error');
    }
    field.classList.remove('error', 'success');
}

// Mark Field Success
function markFieldSuccess(field) {
    if (!field) return;
    
    const inputGroup = field.closest('.input-group') || field.parentNode;
    
    if (inputGroup.classList.contains('input-group')) {
        inputGroup.classList.add('success');
    }
    field.classList.add('success');
}

// Show Message
function showMessage(form, message, type = 'info') {
    clearMessages(form);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert message after form header or at the beginning of the form
    const formHeader = form.querySelector('.auth-header');
    if (formHeader) {
        formHeader.insertAdjacentElement('afterend', messageDiv);
    } else {
        form.insertBefore(messageDiv, form.firstChild);
    }
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Clear Messages
function clearMessages(form) {
    const messages = form.querySelectorAll('.message');
    messages.forEach(message => message.remove());
}

// Set Loading State
function setLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Check Authentication Status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        // Verify token validity (you can add JWT expiration check here)
        return {
            isAuthenticated: true,
            token: token,
            user: JSON.parse(userData)
        };
    }
    
    return {
        isAuthenticated: false,
        token: null,
        user: null
    };
}

// Logout Function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/';
}

// Auto-logout on token expiration
function initTokenExpirationCheck() {
    const token = localStorage.getItem('authToken');
    
    if (token) {
        try {
            // Decode JWT token (basic check)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            
            if (Date.now() >= expirationTime) {
                // Token expired
                logout();
            } else {
                // Set timeout for when token expires
                const timeUntilExpiration = expirationTime - Date.now();
                setTimeout(() => {
                    logout();
                }, timeUntilExpiration);
            }
        } catch (error) {
            console.error('Token validation error:', error);
            logout();
        }
    }
}

// Initialize token expiration check
initTokenExpirationCheck();

// Check if user is already logged in
function checkExistingAuth() {
    const authStatus = checkAuthStatus();
    
    if (authStatus.isAuthenticated) {
        // User is already logged in, redirect to dashboard
        if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            window.location.href = '/dashboard';
        }
    } else {
        // User is not logged in, redirect to login if trying to access protected pages
        const protectedPages = ['/dashboard'];
        if (protectedPages.includes(window.location.pathname)) {
            window.location.href = '/login';
        }
    }
}

// Run auth check on page load
checkExistingAuth();

// Handle page visibility change (for security)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, could implement additional security measures here
    } else {
        // Page is visible again, check auth status
        checkExistingAuth();
    }
});

// Handle storage events (for multi-tab logout)
window.addEventListener('storage', function(e) {
    if (e.key === 'authToken' && !e.newValue) {
        // Token was removed in another tab
        logout();
    }
});

// Export functions for use in other scripts
window.authUtils = {
    checkAuthStatus,
    logout,
    checkExistingAuth
};
