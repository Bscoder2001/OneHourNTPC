const sidebarHost = $('#sidebar-host');
const teacherTableBody = $('#teacher-table-body');
const dashboardMessage = $('#dashboard-message');
const addTeacherBtn = $('#add-teacher-btn');
const teacherModalOverlay = $('#teacher-modal-overlay');
const teacherModalTitle = $('#teacher-modal-title');
const teacherModalClose = $('#teacher-modal-close');
const teacherModalCancel = $('#teacher-modal-cancel');
const teacherModalSave = $('#teacher-modal-save');
const teacherIdInput = $('#teacher-id');
const teacherNameInput = $('#teacher-name');
const teacherEmailInput = $('#teacher-email');
const teacherUsernameInput = $('#teacher-username');
const teacherPasswordInput = $('#teacher-password');
const teacherUsernameGroup = $('#teacher-username-group');
const teacherPasswordGroup = $('#teacher-password-group');
const teacherCount = $('#teacher-count');

const teacherState = {
	mode: 'add',
	isSaving: false
};

$(document).ready(() =>
{
	sidebarHost.load('sidebar.html');
	addTeacherBtn.on('click', openAddTeacherModal);
	teacherModalClose.on('click', closeTeacherModal);
	teacherModalCancel.on('click', closeTeacherModal);
	teacherModalSave.on('click', saveTeacher);
	loadTeachers();
});

function showDashboardMessage(message, type)
{
	dashboardMessage.removeClass('success error').addClass('show');
	if (type === 'success')
	{
		dashboardMessage.addClass('success');
	}
	else
	{
		dashboardMessage.addClass('error');
	}
	dashboardMessage.text(message);
}

async function loadTeachers()
{
	try
	{
		const apiUrl = BASE_URL_LIVE + 'users/getTeachers';
		const response = await promisingAjaxCall(apiUrl, 'GET', {}, 'application/json');

		if (!response || !response.isOk)
		{
			showDashboardMessage((response && response.message) || 'Unable to fetch teachers.', 'error');
			return;
		}

		renderTeachers(response.data || []);
	}
	catch (error)
	{
		console.error('loadTeachers failed:', error);
		showDashboardMessage('Network error while fetching teachers.', 'error');
	}
}

function renderTeachers(teachers)
{
	teacherTableBody.empty();
	teacherCount.text(`${teachers.length} ${teachers.length === 1 ? 'teacher' : 'teachers'}`);

	if (!teachers.length)
	{
		const emptyStateHtml = `
			<tr>
				<td colspan="5">
					<div class="empty-state">
						<div class="empty-illus" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M8 7a4 4 0 118 0 4 4 0 01-8 0z" stroke="currentColor" stroke-width="1.8"/>
								<path d="M4 21a8 8 0 0116 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							</svg>
						</div>
						<div class="empty-title">No teachers added yet</div>
						<div class="empty-subtitle">Add your first teacher to get started.</div>
						<button type="button" class="secondary-btn" id="empty-add-teacher">Add your first teacher</button>
					</div>
				</td>
			</tr>
		`;
		teacherTableBody.append(emptyStateHtml);
		$('#empty-add-teacher').on('click', openAddTeacherModal);
		return;
	}

	teachers.forEach((teacher) =>
	{
		const rowHtml = `
			<tr>
				<td class="cell-name">${escapeHtml(teacher.name || '')}</td>
				<td class="cell-muted">${escapeHtml(teacher.email || '')}</td>
				<td class="cell-muted">${escapeHtml(teacher.user_name || '')}</td>
				<td class="cell-pass">••••••••</td>
				<td>
					<div class="action-group">
						<button class="action-btn edit" data-action="edit" data-id="${teacher.id}" aria-label="Edit teacher">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4.2-4.2L4 15.8V20z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
								<path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							</svg>
						</button>
						<button class="action-btn delete" data-action="delete" data-id="${teacher.id}" aria-label="Delete teacher">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M4 7h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
								<path d="M10 11v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
								<path d="M14 11v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
								<path d="M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
								<path d="M9 7V4h6v3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
							</svg>
						</button>
					</div>
				</td>
			</tr>
		`;
		teacherTableBody.append(rowHtml);
	});

	teacherTableBody.find('[data-action="edit"]').on('click', function()
	{
		const teacherId = $(this).data('id');
		const teacher = teachers.find((item) => Number(item.id) === Number(teacherId));
		if (teacher)
		{
			openEditTeacherModal(teacher);
		}
	});

	teacherTableBody.find('[data-action="delete"]').on('click', function()
	{
		const teacherId = $(this).data('id');
		handleDeleteTeacher(teacherId);
	});
}

function openAddTeacherModal()
{
	teacherState.mode = 'add';
	teacherModalTitle.text('Add Teacher');
	teacherIdInput.val('');
	teacherNameInput.val('');
	teacherEmailInput.val('');
	teacherUsernameInput.val('');
	teacherPasswordInput.val('');
	teacherUsernameGroup.hide();
	teacherPasswordGroup.hide();
	teacherModalSave.text('Save');
	teacherModalOverlay.addClass('open');
}

function openEditTeacherModal(teacher)
{
	teacherState.mode = 'edit';
	teacherModalTitle.text('Edit Teacher');
	teacherIdInput.val(teacher.id);
	teacherNameInput.val(teacher.name || '');
	teacherEmailInput.val(teacher.email || '');
	teacherUsernameInput.val(teacher.user_name || '');
	teacherPasswordInput.val('');
	teacherUsernameGroup.show();
	teacherPasswordGroup.show();
	teacherPasswordInput.attr('placeholder', 'Leave empty to keep current password');
	teacherModalSave.text('Update');
	teacherModalOverlay.addClass('open');
}

function closeTeacherModal()
{
	teacherModalOverlay.removeClass('open');
}

function validateTeacherForm()
{
	const name = teacherNameInput.val().trim();
	const email = teacherEmailInput.val().trim();
	const userName = teacherUsernameInput.val().trim();
	const password = teacherPasswordInput.val().trim();
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!name)
	{
		showDashboardMessage('Name is required.', 'error');
		return false;
	}
	if (!email || !emailPattern.test(email))
	{
		showDashboardMessage('Valid email is required.', 'error');
		return false;
	}
	if (teacherState.mode === 'edit' && !userName)
	{
		showDashboardMessage('Username is required.', 'error');
		return false;
	}
	if (teacherState.mode === 'edit' && password !== '' && password.length < 6)
	{
		showDashboardMessage('Password must be at least 6 characters.', 'error');
		return false;
	}

	return true;
}

async function saveTeacher()
{
	if (teacherState.isSaving || !validateTeacherForm())
	{
		return;
	}

	const name = teacherNameInput.val().trim();
	const email = teacherEmailInput.val().trim();
	const userName = teacherUsernameInput.val().trim();
	const password = teacherPasswordInput.val().trim();

	const originalText = teacherModalSave.text();

	try
	{
		teacherState.isSaving = true;
		teacherModalSave.prop('disabled', true).text('Saving...');

		let response = null;
		if (teacherState.mode === 'add')
		{
			const apiUrl = BASE_URL_LIVE + 'users/addUser';
			const payload = createJSON(
				['name', 'email', 'userTypeId'],
				[name, email, 3]
			);
			response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');
		}
		else
		{
			const apiUrl = BASE_URL_LIVE + 'users/updateTeacher';
			const payload = createJSON(
				['id', 'name', 'email', 'userName', 'password'],
				[teacherIdInput.val(), name, email, userName, password]
			);
			response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');
		}

		if (response && response.isOk)
		{
			let successMessage = teacherState.mode === 'add'
				? 'Teacher added successfully.'
				: 'Teacher updated successfully.';

			if (
				teacherState.mode === 'add' &&
				response.data &&
				response.data.username &&
				response.data.password
			)
			{
				successMessage = `Teacher added successfully. Username: ${response.data.username}, Password: ${response.data.password}`;
			}

			showDashboardMessage(
				successMessage,
				'success'
			);
			closeTeacherModal();
			loadTeachers();
		}
		else
		{
			showDashboardMessage((response && response.message) || 'Unable to save teacher.', 'error');
		}
	}
	catch (error)
	{
		console.error('saveTeacher failed:', error);
		showDashboardMessage('Network error while saving teacher.', 'error');
	}
	finally
	{
		teacherState.isSaving = false;
		teacherModalSave.prop('disabled', false).text(originalText);
	}
}

async function handleDeleteTeacher(teacherId)
{
	const shouldDelete = window.confirm('Are you sure you want to delete this teacher?');
	if (!shouldDelete)
	{
		return;
	}

	try
	{
		const apiUrl = BASE_URL_LIVE + 'users/deleteTeacher';
		const payload = createJSON(['id'], [teacherId]);
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			showDashboardMessage('Teacher deleted successfully.', 'success');
			loadTeachers();
		}
		else
		{
			showDashboardMessage((response && response.message) || 'Unable to delete teacher.', 'error');
		}
	}
	catch (error)
	{
		console.error('deleteTeacher failed:', error);
		showDashboardMessage('Network error while deleting teacher.', 'error');
	}
}

function escapeHtml(value)
{
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
