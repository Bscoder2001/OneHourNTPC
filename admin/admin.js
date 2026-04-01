// ==========================================
// ADMIN LOGIN FORM LOGIC
// ==========================================

/**
 * Form validation and event handling for admin login
 * This file handles:
 * - Form validation (required fields, format checks)
 * - User input handling and error display
 * - Submit action with placeholder for API integration
 */

// ==========================================
// DOM ELEMENTS
// ==========================================

const loginForm = $('#admin-login-form');
const usernameInput = $('#username');
const passwordInput = $('#password');
const rememberMeCheckbox = $('#remember-me');
const forgotPasswordLink = $('#forgot-password-link');
const createAccountLink = $('#create-account-link');
const formErrorDiv = $('#form-error');
const formSuccessDiv = $('#form-success');
const otpPanel = $('#otp-panel');
const otpEmailInput = $('#otp-email');
const otpCodeInput = $('#otp-code');
const otpEmailError = $('#otp-email-error');
const otpCodeError = $('#otp-code-error');
const otpMessage = $('#otp-message');
const otpVerifyWrap = $('#otp-verify-wrap');
const otpResetWrap = $('#otp-reset-wrap');
const sendOtpBtn = $('#send-otp-btn');
const verifyOtpBtn = $('#verify-otp-btn');
const resetPasswordBtn = $('#reset-password-btn');
const resetPasswordInput = $('#reset-password');
const resetConfirmPasswordInput = $('#reset-confirm-password');
const resetPasswordError = $('#reset-password-error');
const resetConfirmPasswordError = $('#reset-confirm-password-error');

const otpState = {
	isOpen: false,
	isSent: false,
	isSending: false,
	isVerifying: false,
	isVerified: false,
	isResetting: false
};

// ==========================================
// FORM VALIDATION CONFIGURATION
// ==========================================

const validationConfig = {
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
	password: {
		minLength: 6,
		maxLength: 100,
		errorMessages: {
			empty: 'Password is required',
			tooShort: 'Password must be at least 6 characters',
			tooLong: 'Password cannot exceed 100 characters'
		}
	}
};

// ==========================================
// EVENT LISTENERS
// ==========================================

$(document).ready(() =>
{
	// Form submission
	loginForm.on('submit', handleFormSubmit);

	// Real-time validation on input
	usernameInput.on('blur', () => validateUsername());
	passwordInput.on('blur', () => validatePassword());

	// Clear errors on focus
	usernameInput.on('focus', () => clearFieldError('username'));
	passwordInput.on('focus', () => clearFieldError('password'));

	// Link handlers
	forgotPasswordLink.on('click', handleForgotPassword);
	createAccountLink.on('click', handleCreateAccount);
	$('.password-toggle').on('click', handlePasswordToggle);
	sendOtpBtn.on('click', handleSendOtp);
	verifyOtpBtn.on('click', handleVerifyOtp);
	resetPasswordBtn.on('click', handleResetPassword);

	otpEmailInput.on('focus', clearOtpErrors);
	otpCodeInput.on('focus', () =>
	{
		otpCodeError.removeClass('show').text('');
	});
	resetPasswordInput.on('focus', clearResetPasswordErrors);
	resetConfirmPasswordInput.on('focus', clearResetPasswordErrors);

	// Load saved username if "Remember me" was checked
	loadSavedCredentials();
});

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

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

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

	if (errorMessage)
	{
		showFieldError('password', errorMessage);
		return false;
	}

	clearFieldError('password');
	return true;
}

/**
 * Validates entire form
 * @returns {boolean} - True if all fields are valid
 */
function validateForm()
{
	const isUsernameValid = validateUsername();
	const isPasswordValid = validatePassword();

	return isUsernameValid && isPasswordValid;
}

// ==========================================
// ERROR DISPLAY FUNCTIONS
// ==========================================

/**
 * Shows field-specific error message
 * @param {string} fieldName - Name of the field (username or password)
 * @param {string} message - Error message to display
 */
function showFieldError(fieldName, message)
{
	const input = fieldName === 'username' ? usernameInput : passwordInput;
	const errorElement = $(`#${fieldName}-error`);

	input.addClass('error');
	errorElement.text(message);
	errorElement.addClass('show');

	// Log for debugging
	console.log(`Validation error - ${fieldName}: ${message}`);
}

/**
 * Clears field-specific error message
 * @param {string} fieldName - Name of the field
 */
function clearFieldError(fieldName)
{
	const input = fieldName === 'username' ? usernameInput : passwordInput;
	const errorElement = $(`#${fieldName}-error`);

	input.removeClass('error');
	errorElement.text('');
	errorElement.removeClass('show');
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
	clearFieldError('username');
	clearFieldError('password');
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
	const submitBtn = loginForm.find('.login-btn');
	const originalBtnText = submitBtn.text();
	submitBtn.prop('disabled', true);
	submitBtn.text('Logging in...');

	const username = usernameInput.val().trim();
	const password = passwordInput.val();
	const rememberMe = rememberMeCheckbox.is(':checked');

	try
	{
		const apiUrl = BASE_URL_LIVE + 'users/login';
		const loginData = createJSON(
			['username', 'password'],
			[username, password]
		);
		const response = await promisingAjaxCall(apiUrl, 'POST', loginData, 'application/json');

		if (!response || !response.isOk)
		{
			showFormError((response && response.message) || 'Login failed. Please try again.');
			return;
		}

		handleLoginSuccess(response.data || {}, rememberMe);

	}
	catch (error)
	{
		console.error('Login error:', error);
		showFormError('Network error. Please try again.');
	}
	finally
	{
		// Re-enable button
		submitBtn.prop('disabled', false);
		submitBtn.text(originalBtnText);
	}
}

/**
 * Handles successful login
 * @param {Object} data - Response data from API
 * @param {boolean} rememberMe - Whether to save credentials
 */
function handleLoginSuccess(data, rememberMe)
{
	showFormSuccess('✓ Login successful! Redirecting...');

	// Save credentials if "Remember me" is checked
	if (rememberMe)
	{
		saveCredentials(usernameInput.val().trim());
	}
	else
	{
		clearSavedCredentials();
	}

	// Save auth token (if provided by API)
	if (data.token)
	{
		localStorage.setItem('admin-auth-token', data.token);
		console.log('Auth token saved');
	}

	try
	{
		if (data.user_id !== undefined && data.user_id !== null)
		{
			localStorage.setItem('ntpc_user_id', String(data.user_id));
		}
		if (data.institute_id !== undefined && data.institute_id !== null)
		{
			localStorage.setItem('ntpc_institute_id', String(data.institute_id));
		}
		if (data.user_type_id !== undefined && data.user_type_id !== null)
		{
			localStorage.setItem('ntpc_user_type_id', String(data.user_type_id));
		}
	}
	catch (e)
	{
		console.warn('Failed to persist session', e);
	}

	// Redirect after brief delay
	setTimeout(() =>
	{
		window.location.href = 'dashboard.html';
	}, 1500);
}

// ==========================================
// CREDENTIALS MANAGEMENT
// ==========================================

/**
 * Saves username to localStorage if "Remember me" is checked
 * @param {string} username - Username to save
 */
function saveCredentials(username)
{
	try
	{
		localStorage.setItem('admin-username-saved', username);
		console.log('Credentials saved');
	}
	catch (error)
	{
		console.warn('Failed to save credentials:', error);
	}
}

/**
 * Loads saved username from localStorage
 */
function loadSavedCredentials()
{
	try
	{
		const savedUsername = localStorage.getItem('admin-username-saved');
		if (savedUsername)
		{
			usernameInput.val(savedUsername);
			rememberMeCheckbox.prop('checked', true);
			// Focus on password field for better UX
			passwordInput.focus();
			console.log('Saved credentials loaded');
		}
	}
	catch (error)
	{
		console.warn('Failed to load credentials:', error);
	}
}

/**
 * Clears saved credentials from localStorage
 */
function clearSavedCredentials()
{
	try
	{
		localStorage.removeItem('admin-username-saved');
		console.log('Saved credentials cleared');
	}
	catch (error)
	{
		console.warn('Failed to clear credentials:', error);
	}
}

// ==========================================
// LINK HANDLERS
// ==========================================

/**
 * Handles "Forgot Password?" link click
 * @param {Event} event - Click event
 */
function handleForgotPassword(event)
{
	event.preventDefault();
	otpState.isOpen = !otpState.isOpen;
	otpPanel.toggleClass('open', otpState.isOpen);

	if (otpState.isOpen)
	{
		otpEmailInput.focus();
	}
}

function clearOtpErrors()
{
	otpEmailError.removeClass('show').text('');
	otpCodeError.removeClass('show').text('');
	otpMessage.removeClass('show success error').text('');
}

function clearResetPasswordErrors()
{
	resetPasswordError.removeClass('show').text('');
	resetConfirmPasswordError.removeClass('show').text('');
}

function showOtpMessage(message, type)
{
	otpMessage.removeClass('success error').addClass('show');
	if (type === 'success')
	{
		otpMessage.addClass('success');
	}
	else
	{
		otpMessage.addClass('error');
	}
	otpMessage.text(message);
}

function validateOtpEmail()
{
	const email = otpEmailInput.val().trim();
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!email)
	{
		otpEmailError.text('Email is required').addClass('show');
		return false;
	}
	if (!emailPattern.test(email))
	{
		otpEmailError.text('Please enter a valid email address').addClass('show');
		return false;
	}
	return true;
}

function validateOtpCode()
{
	const otpCode = otpCodeInput.val().trim();
	const otpPattern = /^\d{6}$/;

	if (!otpCode)
	{
		otpCodeError.text('OTP is required').addClass('show');
		return false;
	}
	if (!otpPattern.test(otpCode))
	{
		otpCodeError.text('OTP must be a 6-digit number').addClass('show');
		return false;
	}
	return true;
}

async function handleSendOtp()
{
	clearOtpErrors();
	clearResetPasswordErrors();
	otpState.isVerified = false;
	otpResetWrap.removeClass('open');

	if (!validateOtpEmail())
	{
		return;
	}

	if (otpState.isSending)
	{
		return;
	}

	const email = otpEmailInput.val().trim();
	const apiUrl = BASE_URL_LIVE + 'users/sendOtp';
	const originalText = sendOtpBtn.text();

	try
	{
		otpState.isSending = true;
		sendOtpBtn.prop('disabled', true).text('Sending...');

		const payload = createJSON(['email'], [email]);
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			otpState.isSent = true;
			otpVerifyWrap.addClass('open');
			otpResetWrap.removeClass('open');
			showOtpMessage('OTP sent successfully. Please check your email.', 'success');
			otpCodeInput.focus();
		}
		else
		{
			showOtpMessage((response && response.message) || 'Unable to send OTP right now.', 'error');
		}
	}
	catch ( error )
	{
		showOtpMessage(error.message || 'Email not found.', 'error');
	}
	finally
	{
		otpState.isSending = false;
		sendOtpBtn.prop('disabled', false).text(originalText);
	}
}

async function handleVerifyOtp()
{
	clearOtpErrors();
	clearResetPasswordErrors();

	if (!otpState.isSent)
	{
		showOtpMessage('Please send OTP first.', 'error');
		return;
	}

	if (!validateOtpEmail() || !validateOtpCode())
	{
		return;
	}

	if (otpState.isVerifying)
	{
		return;
	}

	const email = otpEmailInput.val().trim();
	const otpCode = otpCodeInput.val().trim();
	const apiUrl = BASE_URL_LIVE + 'users/verifyOtp';
	const originalText = verifyOtpBtn.text();

	try
	{
		otpState.isVerifying = true;
		verifyOtpBtn.prop('disabled', true).text('Verifying...');

		const payload = createJSON(['email', 'otp'], [email, otpCode]);
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			otpState.isVerified = true;
			otpResetWrap.addClass('open');
			showOtpMessage('OTP verified successfully. You can reset your password now.', 'success');
			resetPasswordInput.focus();
		}
		else
		{
			showOtpMessage((response && response.message) || 'Invalid OTP. Please try again.', 'error');
		}
	}
	catch (error)
	{
		console.error('verifyOtp failed:', error);
		showOtpMessage('Network error while verifying OTP. Please try again.', 'error');
	}
	finally
	{
		otpState.isVerifying = false;
		verifyOtpBtn.prop('disabled', false).text(originalText);
	}
}

function validateResetPasswordForm()
{
	clearResetPasswordErrors();

	const password = resetPasswordInput.val().trim();
	const confirmPassword = resetConfirmPasswordInput.val().trim();

	if (!password)
	{
		resetPasswordError.text('New password is required').addClass('show');
		return false;
	}
	if (password.length < 6)
	{
		resetPasswordError.text('Password must be at least 6 characters').addClass('show');
		return false;
	}
	if (!confirmPassword)
	{
		resetConfirmPasswordError.text('Confirm password is required').addClass('show');
		return false;
	}
	if (password !== confirmPassword)
	{
		resetConfirmPasswordError.text('Passwords do not match').addClass('show');
		return false;
	}

	return true;
}

async function handleResetPassword()
{
	clearOtpErrors();

	if (!otpState.isVerified)
	{
		showOtpMessage('Please verify OTP first.', 'error');
		return;
	}
	if (!validateOtpEmail() || !validateResetPasswordForm())
	{
		return;
	}
	if (otpState.isResetting)
	{
		return;
	}

	const apiUrl = BASE_URL_LIVE + 'users/resetPassword';
	const email = otpEmailInput.val().trim();
	const password = resetPasswordInput.val().trim();
	const originalText = resetPasswordBtn.text();

	try
	{
		otpState.isResetting = true;
		resetPasswordBtn.prop('disabled', true).text('Resetting...');

		const payload = createJSON(['email', 'password'], [email, password]);
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			showOtpMessage('Password reset successfully. You can sign in now.', 'success');
			resetPasswordInput.val('');
			resetConfirmPasswordInput.val('');
			setTimeout(() =>
			{
				otpPanel.removeClass('open');
				otpVerifyWrap.removeClass('open');
				otpResetWrap.removeClass('open');
				otpState.isOpen = false;
				otpState.isSent = false;
				otpState.isVerified = false;
				otpCodeInput.val('');
			}, 1000);
		}
		else
		{
			showOtpMessage((response && response.message) || 'Unable to reset password right now.', 'error');
		}
	}
	catch (error)
	{
		console.error('resetPassword failed:', error);
		showOtpMessage('Network error while resetting password. Please try again.', 'error');
	}
	finally
	{
		otpState.isResetting = false;
		resetPasswordBtn.prop('disabled', false).text(originalText);
	}
}

/**
 * Handles "Create New Account" link click
 * @param {Event} event - Click event
 */
function handleCreateAccount(event)
{
	event.preventDefault();
	console.log('Create account clicked - redirecting to create account page');

	// Redirect to create account page
	window.location.href = 'create-account.html';
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
		username: usernameInput.val().trim(),
		password: passwordInput.val(),
		rememberMe: rememberMeCheckbox.is(':checked')
	};
}

/**
 * Resets the form to initial state
 */
function resetFormState()
{
	loginForm[0].reset();
	clearAllErrors();
	rememberMeCheckbox.prop('checked', false);
	usernameInput.focus();
	console.log('Form reset');
}

// ==========================================
// DEBUG MODE (Remove in production)
// ==========================================

// Uncomment for development debugging:
/*
window.AdminLoginDebug = {
	getFormState,
	resetFormState,
	getValidationConfig: () => validationConfig,
	clearAllErrors,
	forceShowError: (msg) => showFormError(msg),
	forceShowSuccess: (msg) => showFormSuccess(msg)
};

console.log('Admin Login Debug Mode Available');
console.log('Use window.AdminLoginDebug for debugging');
*/
