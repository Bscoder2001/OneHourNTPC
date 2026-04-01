// ==========================================
// CREATE ACCOUNT FORM LOGIC
// ==========================================

/**
 * Form validation and event handling for account creation
 * This file handles:
 * - Form validation (required fields, format checks, password matching)
 * - User input handling and error display
 * - Submit action with placeholder for API integration
 */

// ==========================================
// DOM ELEMENTS
// ==========================================

const createAccountForm = $('#create-account-form');
const fullNameInput = $('#full-name');
const firstNameInput = $('#first-name');
const lastNameInput = $('#last-name');
const usernameInput = $('#username');
const emailInput = $('#email');
const passwordInput = $('#password');
const confirmPasswordInput = $('#confirm-password');
const termsCheckbox = $('#terms-agree');
const formErrorDiv = $('#form-error');
const formSuccessDiv = $('#form-success');
const passwordStrengthFill = $('#password-strength-fill');

const academicYearPanel = $('#academic-year-panel');
const academicYearForm = $('#academic-year-form');
const academicYearNameInput = $('#academic-year-name');
const sessionStartInput = $('#session-start');
const sessionEndInput = $('#session-end');
const academicFormErrorDiv = $('#academic-form-error');
const academicFormSuccessDiv = $('#academic-form-success');

/** @type {{ user_id: number, institute_id: number } | null} */
let pendingSignup = null;

// ==========================================
// FORM VALIDATION CONFIGURATION
// ==========================================

const validationConfig = {
	fullName: {
		minLength: 2,
		maxLength: 100,
		pattern: /^[a-zA-Z\s'-]+$/,
		errorMessages: {
			empty: 'Full name is required',
			tooShort: 'Full name must be at least 2 characters',
			tooLong: 'Full name cannot exceed 100 characters',
			invalid: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
		}
	},
	username: {
		minLength: 3,
		maxLength: 50,
		pattern: /^[a-zA-Z0-9_-]+$/,
		errorMessages: {
			empty: 'Username is required',
			tooShort: 'Username must be at least 3 characters',
			tooLong: 'Username cannot exceed 50 characters',
			invalid: 'Username can only contain letters, numbers, hyphens, and underscores'
		}
	},
	email: {
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		errorMessages: {
			empty: 'Email address is required',
			invalid: 'Please enter a valid email address'
		}
	},
	password: {
		minLength: 8,
		maxLength: 100,
		pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
		errorMessages: {
			empty: 'Password is required',
			tooShort: 'Password must be at least 8 characters',
			tooLong: 'Password cannot exceed 100 characters',
			invalid: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
		}
	},
	confirmPassword: {
		errorMessages: {
			empty: 'Please confirm your password',
			mismatch: 'Passwords do not match'
		}
	},
	terms: {
		errorMessages: {
			notChecked: 'You must agree to the Terms and Conditions'
		}
	}
};

// ==========================================
// EVENT LISTENERS
// ==========================================

$(document).ready(() =>
{
	firstNameInput.on('input blur', syncFullName);
	lastNameInput.on('input blur', syncFullName);

	// Form submission
	createAccountForm.on('submit', handleFormSubmit);
	academicYearForm.on('submit', handleAcademicYearSubmit);

	// Real-time validation on input
	fullNameInput.on('blur', () => validateFullName());
	usernameInput.on('blur', () => validateUsername());
	emailInput.on('blur', () => validateEmail());
	passwordInput.on('blur', () => validatePassword());
	confirmPasswordInput.on('blur', () => validateConfirmPassword());
	termsCheckbox.on('change', () => validateTerms());

	// Clear errors on focus
	fullNameInput.on('focus', () => clearFieldError('full-name'));
	usernameInput.on('focus', () => clearFieldError('username'));
	emailInput.on('focus', () => clearFieldError('email'));
	passwordInput.on('focus', () => clearFieldError('password'));
	confirmPasswordInput.on('focus', () => clearFieldError('confirm-password'));

	// Password strength indicator
	passwordInput.on('input', updatePasswordStrength);
	$('.password-toggle').on('click', handlePasswordToggle);
});

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

/**
 * Validates full name field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateFullName()
{
	syncFullName();

	const fullName = fullNameInput.val().trim();
	const config = validationConfig.fullName;
	let errorMessage = '';

	// Check if empty
	if (!fullName)
	{
		errorMessage = config.errorMessages.empty;
	}
	// Check minimum length
	else if (fullName.length < config.minLength)
	{
		errorMessage = config.errorMessages.tooShort;
	}
	// Check maximum length
	else if (fullName.length > config.maxLength)
	{
		errorMessage = config.errorMessages.tooLong;
	}
	// Check pattern
	else if (!config.pattern.test(fullName))
	{
		errorMessage = config.errorMessages.invalid;
	}

	if (errorMessage)
	{
		showFieldError('full-name', errorMessage);
		return false;
	}

	clearFieldError('full-name');
	return true;
}

/**
 * Validates username field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateUsername()
{
	const username = usernameInput.val().trim();
	const config = validationConfig.username;
	let errorMessage = '';

	// Check if empty
	if (!username)
	{
		errorMessage = config.errorMessages.empty;
	}
	// Check minimum length
	else if (username.length < config.minLength)
	{
		errorMessage = config.errorMessages.tooShort;
	}
	// Check maximum length
	else if (username.length > config.maxLength)
	{
		errorMessage = config.errorMessages.tooLong;
	}
	// Check pattern
	else if (!config.pattern.test(username))
	{
		errorMessage = config.errorMessages.invalid;
	}

	if (errorMessage)
	{
		showFieldError('username', errorMessage);
		return false;
	}

	clearFieldError('username');
	return true;
}

/**
 * Validates email field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateEmail()
{
	const email = emailInput.val().trim();
	const config = validationConfig.email;
	let errorMessage = '';

	// Check if empty
	if (!email)
	{
		errorMessage = config.errorMessages.empty;
	}
	// Check pattern
	else if (!config.pattern.test(email))
	{
		errorMessage = config.errorMessages.invalid;
	}

	if (errorMessage)
	{
		showFieldError('email', errorMessage);
		return false;
	}

	clearFieldError('email');
	return true;
}

/**
 * Validates password field
 * @returns {boolean} - True if valid, false otherwise
 */
function validatePassword()
{
	const password = passwordInput.val();
	const config = validationConfig.password;
	let errorMessage = '';

	// Check if empty
	if (!password)
	{
		errorMessage = config.errorMessages.empty;
	}
	// Check minimum length
	else if (password.length < config.minLength)
	{
		errorMessage = config.errorMessages.tooShort;
	}
	// Check maximum length
	else if (password.length > config.maxLength)
	{
		errorMessage = config.errorMessages.tooLong;
	}
	// Check pattern
	else if (!config.pattern.test(password))
	{
		errorMessage = config.errorMessages.invalid;
	}

	if (errorMessage)
	{
		showFieldError('password', errorMessage);
		return false;
	}

	clearFieldError('password');
	return true;
}

/**
 * Validates confirm password field
 * @returns {boolean} - True if valid, false otherwise
 */
function validateConfirmPassword()
{
	const confirmPassword = confirmPasswordInput.val();
	const password = passwordInput.val();
	const config = validationConfig.confirmPassword;
	let errorMessage = '';

	// Check if empty
	if (!confirmPassword)
	{
		errorMessage = config.errorMessages.empty;
	}
	// Check if passwords match
	else if (confirmPassword !== password)
	{
		errorMessage = config.errorMessages.mismatch;
	}

	if (errorMessage)
	{
		showFieldError('confirm-password', errorMessage);
		return false;
	}

	clearFieldError('confirm-password');
	return true;
}

/**
 * Validates terms checkbox
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTerms()
{
	const isChecked = termsCheckbox.is(':checked');
	const config = validationConfig.terms;

	if (!isChecked)
	{
		showFieldError('terms-agree', config.errorMessages.notChecked);
		return false;
	}

	clearFieldError('terms-agree');
	return true;
}

/**
 * Validates entire form
 * @returns {boolean} - True if all fields are valid
 */
function validateForm()
{
	const isFullNameValid = validateFullName();
	const isUsernameValid = validateUsername();
	const isEmailValid = validateEmail();
	const isPasswordValid = validatePassword();
	const isConfirmPasswordValid = validateConfirmPassword();
	const isTermsValid = validateTerms();

	return isFullNameValid && isUsernameValid && isEmailValid &&
		   isPasswordValid && isConfirmPasswordValid && isTermsValid;
}

// ==========================================
// PASSWORD STRENGTH INDICATOR
// ==========================================

/**
 * Updates password strength indicator
 */
function updatePasswordStrength()
{
	const password = passwordInput.val();
	const strength = calculatePasswordStrength(password);

	// Remove existing strength classes
	passwordInput.removeClass('password-weak password-medium password-strong');

	// Add appropriate strength class
	if (password.length > 0)
	{
		if (strength >= 3)
		{
			passwordInput.addClass('password-strong');
			passwordStrengthFill.css({ width: '100%', backgroundColor: '#059669' });
		}
		else if (strength >= 2)
		{
			passwordInput.addClass('password-medium');
			passwordStrengthFill.css({ width: '66%', backgroundColor: '#d97706' });
		}
		else
		{
			passwordInput.addClass('password-weak');
			passwordStrengthFill.css({ width: '33%', backgroundColor: '#dc2626' });
		}
	}
	else
	{
		passwordStrengthFill.css({ width: '0%', backgroundColor: '#e2e8f0' });
	}
}

function syncFullName()
{
	const firstName = firstNameInput.val() ? firstNameInput.val().trim() : '';
	const lastName = lastNameInput.val() ? lastNameInput.val().trim() : '';
	fullNameInput.val([firstName, lastName].filter(Boolean).join(' ').trim());
}

function handlePasswordToggle(event)
{
	const toggle = $(event.currentTarget);
	const targetId = toggle.data('target');
	const input = $('#' + targetId);
	if (input.length === 0) return;

	const show = input.attr('type') === 'password';
	input.attr('type', show ? 'text' : 'password');
	toggle.text(show ? 'Hide' : 'Show');
	toggle.attr('aria-label', show ? 'Hide password' : 'Show password');
}

/**
 * Calculates password strength score
 * @param {string} password - Password to evaluate
 * @returns {number} - Strength score (0-4)
 */
function calculatePasswordStrength(password)
{
	let score = 0;

	// Length check
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;

	// Character variety checks
	if (/[a-z]/.test(password)) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/\d/.test(password)) score++;
	if (/[@$!%*?&]/.test(password)) score++;

	return Math.min(score, 4);
}

// ==========================================
// ERROR DISPLAY FUNCTIONS
// ==========================================

/**
 * Shows field-specific error message
 * @param {string} fieldName - Name of the field
 * @param {string} message - Error message to display
 */
function showFieldError(fieldName, message)
{
	let input, errorElement;

	switch (fieldName)
	{
		case 'full-name':
			input = fullNameInput;
			errorElement = $('#full-name-error');
			break;
		case 'username':
			input = usernameInput;
			errorElement = $('#username-error');
			break;
		case 'email':
			input = emailInput;
			errorElement = $('#email-error');
			break;
		case 'password':
			input = passwordInput;
			errorElement = $('#password-error');
			break;
		case 'confirm-password':
			input = confirmPasswordInput;
			errorElement = $('#confirm-password-error');
			break;
		case 'terms-agree':
			// For checkbox, show error in a general location
			showFormError(message);
			return;
	}

	if (input && errorElement)
	{
		input.addClass('error');
		errorElement.text(message);
		errorElement.addClass('show');

		// Log for debugging
		console.log(`Validation error - ${fieldName}: ${message}`);
	}
}

/**
 * Clears field-specific error message
 * @param {string} fieldName - Name of the field
 */
function clearFieldError(fieldName)
{
	let input, errorElement;

	switch (fieldName)
	{
		case 'full-name':
			input = fullNameInput;
			errorElement = $('#full-name-error');
			break;
		case 'username':
			input = usernameInput;
			errorElement = $('#username-error');
			break;
		case 'email':
			input = emailInput;
			errorElement = $('#email-error');
			break;
		case 'password':
			input = passwordInput;
			errorElement = $('#password-error');
			break;
		case 'confirm-password':
			input = confirmPasswordInput;
			errorElement = $('#confirm-password-error');
			break;
	}

	if (input && errorElement)
	{
		input.removeClass('error');
		errorElement.text('');
		errorElement.removeClass('show');
	}
}

/**
 * Shows general form error message
 * @param {string} message - Error message
 */
function showFormError(message)
{
	formErrorDiv.text(message);
	formErrorDiv.addClass('show');
	formSuccessDiv.removeClass('show');

	// Auto-hide after 5 seconds
	setTimeout(() =>
	{
		formErrorDiv.removeClass('show');
	}, 5000);

	// Log for debugging
	console.error(`Form error: ${message}`);
}

/**
 * Shows general form success message
 * @param {string} message - Success message
 */
function showFormSuccess(message)
{
	formSuccessDiv.text(message);
	formSuccessDiv.addClass('show');
	formErrorDiv.removeClass('show');

	// Log for debugging
	console.log(`Form success: ${message}`);
}

/**
 * Clears all error messages
 */
function clearAllErrors()
{
	clearFieldError('full-name');
	clearFieldError('username');
	clearFieldError('email');
	clearFieldError('password');
	clearFieldError('confirm-password');
	formErrorDiv.removeClass('show');
	formSuccessDiv.removeClass('show');
}

// ==========================================
// FORM SUBMISSION HANDLER
// ==========================================

/**
 * Handles form submission
 * @param {Event} event - Submit event
 */
async function handleFormSubmit(event)
{
	event.preventDefault();

	// Clear previous messages
	clearAllErrors();

	// Validate form
	if (!validateForm())
	{
		showFormError('Please correct the errors above and try again');
		return;
	}

	// Disable button during submission
	const submitBtn = createAccountForm.find('#createAccount');
	const originalBtnText = submitBtn.text();
	submitBtn.prop('disabled', true);
	submitBtn.text('Creating Account...');

	try
	{
		let url = BASE_URL_LIVE + 'users/addUser';

		let params = ['name', 'email', 'userName', 'password', 'userTypeId'];
		let values = [fullNameInput.val().trim(), emailInput.val().trim(), usernameInput.val().trim(), passwordInput.val(), USER_TYPE_ID_ADMIN];

		let dateString = createJSON(params, values);

		let response = await promisingAjaxCall(url, 'POST', dateString, 'application/json');
		console.log('response', response);

		if (response.isOk)
		{
			handleAccountCreationSuccess(response.data);
		}
		else
		{
			showFormError(response.message);
		}
	}
	catch (error)
	{
		showFormError(error.message || 'Account creation failed. Please try again.');
		submitBtn.text(originalBtnText);
		submitBtn.prop('disabled', false);
		console.error('Account creation error:', error);
	}
}

/**
 * Handles successful account creation
 * @param {Object} data - Response data from API
 */
function handleAccountCreationSuccess(data)
{
	const userId = data.user_id ?? data.userId;
	const instituteId = data.institute_id ?? data.instituteId;

	if (!userId || !instituteId)
	{
		showFormError('Account was created but missing identifiers. Please contact support.');
		return;
	}

	pendingSignup = {
		user_id: Number(userId),
		institute_id: Number(instituteId)
	};

	try
	{
		localStorage.setItem('currentUserId', String(userId));
		localStorage.setItem('currentInstituteId', String(instituteId));
	}
	catch (e)
	{
		console.warn('Could not persist signup ids', e);
	}

	showFormSuccess('✓ Account created. Now add your academic year below.');

	createAccountForm.addClass('signup-step-disabled');
	const submitBtn = createAccountForm.find('#createAccount');
	submitBtn.prop('disabled', true);

	academicYearPanel.removeClass('is-hidden');

	// Focus first field in the new section
	setTimeout(() => academicYearNameInput.trigger('focus'), 100);
}

/**
 * Validates academic year step
 * @returns {boolean}
 */
function validateAcademicYearFields()
{
	let ok = true;
	const name = academicYearNameInput.val().trim();
	const start = sessionStartInput.val();
	const end = sessionEndInput.val();

	academicFormErrorDiv.removeClass('show').text('');
	academicYearNameInput.removeClass('error');
	sessionStartInput.removeClass('error');
	sessionEndInput.removeClass('error');
	$('#academic-year-name-error').removeClass('show').text('');
	$('#session-start-error').removeClass('show').text('');
	$('#session-end-error').removeClass('show').text('');

	if (!name || name.length < 2)
	{
		academicYearNameInput.addClass('error');
		$('#academic-year-name-error').text('Enter a name for the academic year').addClass('show');
		ok = false;
	}
	if (!start)
	{
		sessionStartInput.addClass('error');
		$('#session-start-error').text('Session start is required').addClass('show');
		ok = false;
	}
	if (!end)
	{
		sessionEndInput.addClass('error');
		$('#session-end-error').text('Session end is required').addClass('show');
		ok = false;
	}
	if (start && end && start > end)
	{
		sessionEndInput.addClass('error');
		$('#session-end-error').text('Session end must be on or after session start').addClass('show');
		ok = false;
	}

	return ok;
}

/**
 * @param {Event} event
 */
async function handleAcademicYearSubmit(event)
{
	event.preventDefault();
	academicFormErrorDiv.removeClass('show').text('');
	academicFormSuccessDiv.removeClass('show').text('');

	if (!pendingSignup)
	{
		academicFormErrorDiv.text('Session expired. Refresh the page and create your account again.').addClass('show');
		return;
	}

	if (!validateAcademicYearFields())
	{
		return;
	}

	const saveBtn = academicYearForm.find('#saveAcademicYear');
	const originalText = saveBtn.text();
	saveBtn.prop('disabled', true);
	saveBtn.text('Saving...');

	try
	{
		const url = BASE_URL_LIVE + 'users/addAcademicYear';
		const payload = {
			institute_id: pendingSignup.institute_id,
			school_user_id: pendingSignup.user_id,
			name: academicYearNameInput.val().trim(),
			session_start: sessionStartInput.val(),
			session_end: sessionEndInput.val(),
			status: 'active'
		};

		const response = await promisingAjaxCall(url, 'POST', payload, 'application/json');

		if (response.isOk)
		{
			academicFormSuccessDiv.text('✓ Academic year saved. Redirecting to sign in...').addClass('show');
			try
			{
				if (response.data && response.data.academic_year_id)
				{
					localStorage.setItem('currentAcademicYearId', String(response.data.academic_year_id));
				}
			}
			catch (e) { /* ignore */ }

			setTimeout(() =>
			{
				window.location.href = 'admin.html';
			}, 1600);
		}
		else
		{
			academicFormErrorDiv.text(response.message || 'Could not save academic year.').addClass('show');
			saveBtn.prop('disabled', false);
			saveBtn.text(originalText);
		}
	}
	catch (error)
	{
		academicFormErrorDiv.text(error.message || 'Could not save academic year. Please try again.').addClass('show');
		saveBtn.prop('disabled', false);
		saveBtn.text(originalText);
		console.error('Academic year error:', error);
	}
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Gets the current form state
 * @returns {Object} - Current form state
 */
function getFormState()
{
	return {
		fullName: fullNameInput.val().trim(),
		username: usernameInput.val().trim(),
		email: emailInput.val().trim(),
		password: passwordInput.val(),
		confirmPassword: confirmPasswordInput.val(),
		termsAgreed: termsCheckbox.is(':checked')
	};
}

/**
 * Resets the form to initial state
 */
function resetFormState()
{
	createAccountForm[0].reset();
	clearAllErrors();
	console.log('Form reset');
}

// ==========================================
// DEBUG MODE (Remove in production)
// ==========================================

// Uncomment for development debugging:
/*
window.CreateAccountDebug = {
	getFormState,
	resetFormState,
	getValidationConfig: () => validationConfig,
	clearAllErrors,
	forceShowError: (msg) => showFormError(msg),
	forceShowSuccess: (msg) => showFormSuccess(msg),
	calculatePasswordStrength
};

console.log('Create Account Debug Mode Available');
console.log('Use window.CreateAccountDebug for debugging');
*/