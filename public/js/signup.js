// Signup JavaScript for Infinity Bank
document.addEventListener('DOMContentLoaded', function() {
    initSignupForm();
    initCardFormatting();
    initPasswordValidation();
    initFormSections();
});

// Initialize Signup Form
function initSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Handle Signup Form Submission
async function handleSignup(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Clear previous messages
    clearMessages(form);
    
    // Validate form
    if (!validateSignupForm(formData)) {
        return;
    }
    
    // Show loading state
    setLoadingState(submitBtn, true);
    
    try {
        // Prepare data for API
        const signupData = {
            username: formData.get('username'),
            mobile: formData.get('mobile'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            creditCard: {
                cardNumber: formData.get('creditCard[cardNumber]'),
                cardHolder: formData.get('creditCard[cardHolder]'),
                expiryDate: formData.get('creditCard[expiryDate]'),
                cvv: formData.get('creditCard[cvv]')
            },
            debitCard: {
                cardNumber: formData.get('debitCard[cardNumber]'),
                cardHolder: formData.get('debitCard[cardHolder]'),
                expiryDate: formData.get('debitCard[expiryDate]'),
                cvv: formData.get('debitCard[cvv]')
            }
        };
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signupData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Show success message
            showMessage(form, 'Account created successfully! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            showMessage(form, data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage(form, 'Network error. Please check your connection.', 'error');
    } finally {
        setLoadingState(submitBtn, false);
    }
}

// Initialize Card Formatting
function initCardFormatting() {
    // Credit card number formatting
    const creditCardNumber = document.getElementById('creditCardNumber');
    if (creditCardNumber) {
        creditCardNumber.addEventListener('input', function(e) {
            formatCardNumber(e.target);
        });
    }
    
    // Debit card number formatting
    const debitCardNumber = document.getElementById('debitCardNumber');
    if (debitCardNumber) {
        debitCardNumber.addEventListener('input', function(e) {
            formatCardNumber(e.target);
        });
    }
    
    // Credit card expiry formatting
    const creditCardExpiry = document.getElementById('creditCardExpiry');
    if (creditCardExpiry) {
        creditCardExpiry.addEventListener('input', function(e) {
            formatExpiryDate(e.target);
        });
    }
    
    // Debit card expiry formatting
    const debitCardExpiry = document.getElementById('debitCardExpiry');
    if (debitCardExpiry) {
        debitCardExpiry.addEventListener('input', function(e) {
            formatExpiryDate(e.target);
        });
    }
    
    // CVV formatting
    const cvvFields = document.querySelectorAll('input[name*="[cvv]"]');
    cvvFields.forEach(field => {
        field.addEventListener('input', function(e) {
            formatCVV(e.target);
        });
    });
}

// Format Card Number
function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 16 digits
    if (value.length > 16) {
        value = value.substring(0, 16);
    }
    
    // Add spaces every 4 digits
    if (value.length > 0) {
        value = value.match(/.{1,4}/g).join(' ');
    }
    
    input.value = value;
}

// Format Expiry Date
function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 4 digits
    if (value.length > 4) {
        value = value.substring(0, 4);
    }
    
    // Add slash after month
    if (value.length >= 2) {
        const month = value.substring(0, 2);
        const year = value.substring(2);
        
        // Validate month (01-12)
        if (parseInt(month) > 12) {
            value = '12' + year;
        }
        
        if (value.length > 2) {
            value = month + '/' + year;
        }
    }
    
    input.value = value;
}

// Format CVV
function formatCVV(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 4 digits
    if (value.length > 4) {
        value = value.substring(0, 4);
    }
    
    input.value = value;
}

// Initialize Password Validation
function initPasswordValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (password && confirmPassword) {
        // Real-time password strength validation
        password.addEventListener('input', function() {
            validatePasswordStrength(this);
        });
        
        // Real-time password confirmation validation
        confirmPassword.addEventListener('input', function() {
            validatePasswordConfirmation(password, this);
        });
    }
}

// Validate Password Strength
function validatePasswordStrength(passwordField) {
    const password = passwordField.value;
    const strengthIndicator = document.getElementById('passwordStrength') || createPasswordStrengthIndicator(passwordField);
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('One uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('One lowercase letter');
    
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('One number');
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else feedback.push('One special character');
    
    // Update strength indicator
    updatePasswordStrengthIndicator(strengthIndicator, strength, feedback);
}

// Create Password Strength Indicator
function createPasswordStrengthIndicator(passwordField) {
    const strengthDiv = document.createElement('div');
    strengthDiv.id = 'passwordStrength';
    strengthDiv.className = 'password-strength';
    
    const strengthBar = document.createElement('div');
    strengthBar.className = 'strength-bar';
    
    const strengthText = document.createElement('div');
    strengthText.className = 'strength-text';
    
    strengthDiv.appendChild(strengthBar);
    strengthDiv.appendChild(strengthText);
    
    // Insert after password field
    const inputGroup = passwordField.closest('.input-group');
    inputGroup.parentNode.insertBefore(strengthDiv, inputGroup.nextSibling);
    
    return strengthDiv;
}

// Update Password Strength Indicator
function updatePasswordStrengthIndicator(indicator, strength, feedback) {
    const strengthBar = indicator.querySelector('.strength-bar');
    const strengthText = indicator.querySelector('.strength-text');
    
    // Update strength bar
    const percentage = (strength / 5) * 100;
    strengthBar.style.width = percentage + '%';
    
    // Update colors and text
    if (strength <= 2) {
        strengthBar.className = 'strength-bar weak';
        strengthText.textContent = 'Weak';
        strengthText.className = 'strength-text weak';
    } else if (strength <= 3) {
        strengthBar.className = 'strength-bar fair';
        strengthText.textContent = 'Fair';
        strengthText.className = 'strength-text fair';
    } else if (strength <= 4) {
        strengthBar.className = 'strength-bar good';
        strengthText.textContent = 'Good';
        strengthText.className = 'strength-text good';
    } else {
        strengthBar.className = 'strength-bar strong';
        strengthText.textContent = 'Strong';
        strengthText.className = 'strength-text strong';
    }
    
    // Show feedback
    if (feedback.length > 0) {
        strengthText.textContent += ' - ' + feedback.join(', ');
    }
}

// Validate Password Confirmation
function validatePasswordConfirmation(passwordField, confirmField) {
    const password = passwordField.value;
    const confirmPassword = confirmField.value;
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            clearFieldError(confirmField);
            markFieldSuccess(confirmField);
        } else {
            showFieldError(confirmField, 'Passwords do not match');
        }
    }
}

// Initialize Form Sections
function initFormSections() {
    const formSections = document.querySelectorAll('.form-section');
    
    formSections.forEach((section, index) => {
        // Add section numbers
        const header = section.querySelector('h3');
        if (header) {
            header.innerHTML = `<span class="section-number">${index + 1}</span> ${header.textContent}`;
        }
        
        // Add progress indicator
        addProgressIndicator(section, index, formSections.length);
    });
}

// Add Progress Indicator
function addProgressIndicator(section, currentIndex, totalSections) {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'section-progress';
    progressDiv.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${((currentIndex + 1) / totalSections) * 100}%"></div>
        </div>
        <span class="progress-text">${currentIndex + 1} of ${totalSections}</span>
    `;
    
    section.insertBefore(progressDiv, section.firstChild);
}

// Validate Signup Form
function validateSignupForm(formData) {
    let isValid = true;
    
    // Basic validation
    const username = formData.get('username');
    const mobile = formData.get('mobile');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Username validation
    if (!username || username.trim().length < 3) {
        showFieldError('username', 'Username must be at least 3 characters long');
        isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showFieldError('username', 'Username can only contain letters, numbers, and underscores');
        isValid = false;
    }
    
    // Mobile validation
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
        showFieldError('mobile', 'Please enter a valid 10-digit mobile number');
        isValid = false;
    }
    
    // Password validation
    if (!password || password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    // Password confirmation validation
    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Credit card validation
    if (!validateCardInfo(formData, 'creditCard')) {
        isValid = false;
    }
    
    // Debit card validation
    if (!validateCardInfo(formData, 'debitCard')) {
        isValid = false;
    }
    
    // Terms agreement validation
    const agreeTerms = formData.get('agreeTerms');
    if (!agreeTerms) {
        showFieldError('agreeTerms', 'You must agree to the terms and conditions');
        isValid = false;
    }
    
    return isValid;
}

// Validate Card Information
function validateCardInfo(formData, cardType) {
    let isValid = true;
    
    const cardNumber = formData.get(`${cardType}[cardNumber]`);
    const cardHolder = formData.get(`${cardType}[cardHolder]`);
    const expiryDate = formData.get(`${cardType}[expiryDate]`);
    const cvv = formData.get(`${cardType}[cvv]`);
    
    // Card number validation
    if (!cardNumber || !/^[0-9]{16}$/.test(cardNumber.replace(/\s/g, ''))) {
        showFieldError(`${cardType}Number`, 'Please enter a valid 16-digit card number');
        isValid = false;
    }
    
    // Card holder validation
    if (!cardHolder || cardHolder.trim().length < 2) {
        showFieldError(`${cardType}Holder`, 'Please enter the card holder name');
        isValid = false;
    }
    
    // Expiry date validation
    if (!expiryDate || !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiryDate)) {
        showFieldError(`${cardType}Expiry`, 'Please enter a valid expiry date (MM/YY)');
        isValid = false;
    }
    
    // CVV validation
    if (!cvv || !/^[0-9]{3,4}$/.test(cvv)) {
        showFieldError(`${cardType}CVV`, 'Please enter a valid CVV (3 or 4 digits)');
        isValid = false;
    }
    
    return isValid;
}

// Add CSS for password strength and form sections
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .form-section {
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            margin-bottom: 2rem;
            background: var(--bg-secondary);
        }
        
        .form-section h3 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }
        
        .section-number {
            background: var(--primary-color);
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.875rem;
            font-weight: 600;
        }
        
        .section-progress {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
            padding: 0.5rem;
            background: white;
            border-radius: var(--border-radius);
            border: 1px solid var(--border-color);
        }
        
        .progress-bar {
            flex: 1;
            height: 8px;
            background: var(--border-color);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--primary-color);
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .password-strength {
            margin-top: 0.5rem;
        }
        
        .strength-bar {
            height: 4px;
            background: var(--border-color);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 0.25rem;
        }
        
        .strength-bar.weak { background: var(--danger-color); }
        .strength-bar.fair { background: var(--warning-color); }
        .strength-bar.good { background: var(--info-color); }
        .strength-bar.strong { background: var(--success-color); }
        
        .strength-text {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .strength-text.weak { color: var(--danger-color); }
        .strength-text.fair { color: var(--warning-color); }
        .strength-text.good { color: var(--info-color); }
        .strength-text.strong { color: var(--success-color); }
        
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize custom styles
addCustomStyles();
