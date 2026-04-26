const sidebarHost = $('#sidebar-host');
const tableBody = $('#course-table-body');
const dashboardMessage = $('#course-dashboard-message');
const addBtn = $('#course-add-btn');
const modalOverlay = $('#course-modal-overlay');
const modalTitle = $('#course-modal-title');
const modalClose = $('#course-modal-close');
const modalCancel = $('#course-modal-cancel');
const modalSave = $('#course-modal-save');
const courseIdInput = $('#course-id');
const courseNameInput = $('#course-name');
const courseStatusInput = $('#course-status');

let mode = 'add';

$(document).ready(() =>
{
	sidebarHost.load('sidebar.html', function ()
	{
		if (typeof window.initSidebarNav === 'function')
		{
			window.initSidebarNav();
		}
	});

	addBtn.on('click', openAddModal);
	modalClose.on('click', closeModal);
	modalCancel.on('click', closeModal);
	modalSave.on('click', saveCourse);

	loadCourses();
});

function showDashboardMessage(message, type)
{
	dashboardMessage.removeClass('success error').addClass('show').text(message);

	if (type === 'success')
	{
		dashboardMessage.addClass('success');
	}
	else
	{
		dashboardMessage.addClass('error');
	}
}

function isFetchNetworkError(error)
{
	return error instanceof TypeError
		&& String(error && error.message).toLowerCase().indexOf('fetch') >= 0;
}

async function loadCourses()
{
	try
	{
		const response = await fetch(BASE_URL_LIVE + 'courses/list', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-User-Id': USER_ID,
			},
			body: JSON.stringify({
				user_id: USER_ID != null && USER_ID !== '' ? Number(USER_ID) : null,
			}),
		});
		if (!response.ok)
		{
			showDashboardMessage('Could not load courses (HTTP ' + response.status + ').', 'error');
			return;
		}
		const result = await response.json();
		const rows = (result && result.data) ? result.data : [];

		tableBody.empty();

		rows.forEach((row) =>
		{
			tableBody.append(
				'<tr>' +
				'<td>' + escapeHtml(row.name || '') + '</td>' +
				'<td>' + escapeHtml(row.status || 'active') + '</td>' +
				'<td>' +
				'<button type="button" class="secondary-btn" data-action="edit" data-id="' + row.id + '">Edit</button> ' +
				'<button type="button" class="secondary-btn" data-action="toggle" data-id="' + row.id + '">' + ((row.status || 'active') === 'active' ? 'Deactivate' : 'Activate') + '</button>' +
				'</td>' +
				'</tr>'
			);
		});

		tableBody.find('[data-action="edit"]').on('click', function ()
		{
			const id = Number($(this).data('id'));
			const selected = rows.find((row) => Number(row.id) === id);
			if (!selected)
			{
				return;
			}

			mode = 'edit';
			modalTitle.text('Edit course');
			courseIdInput.val(String(selected.id));
			courseNameInput.val(selected.name || '');
			courseStatusInput.val(selected.status || 'active');
			modalOverlay.addClass('open');
		});

		tableBody.find('[data-action="toggle"]').on('click', async function ()
		{
			const id = Number($(this).data('id'));
			const selected = rows.find((row) => Number(row.id) === id);
			if (!selected)
			{
				return;
			}

			if ((selected.status || 'active') === 'active')
			{
				await fetch(BASE_URL_LIVE + 'courses/' + id + '?user_id=' + USER_ID, {
					method: 'DELETE',
					headers: {
						'X-User-Id': USER_ID,
					},
				});
			}
			else
			{
				await fetch(BASE_URL_LIVE + 'courses/' + id, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'X-User-Id': USER_ID,
					},
					body: JSON.stringify({
						name: selected.name,
						status: 'active',
						user_id: Number(USER_ID),
					}),
				});
			}

			loadCourses();
		});
	}
	catch (error)
	{
		if (isFetchNetworkError(error))
		{
			showDashboardMessage('Cannot connect to the API at ' + BASE_URL_LIVE + ' (nothing listening). Start the Laravel app: cd onehour-ntpc-api && php artisan serve. Or set localStorage api_base_url to your server URL, then reload.', 'error');
		}
		else
		{
			showDashboardMessage('Unable to load courses.', 'error');
		}
	}
}

function openAddModal()
{
	mode = 'add';
	modalTitle.text('Add course');
	courseIdInput.val('');
	courseNameInput.val('');
	courseStatusInput.val('active');
	modalOverlay.addClass('open');
}

function closeModal()
{
	modalOverlay.removeClass('open');
}

async function saveCourse()
{
	const name = courseNameInput.val().trim();

	if (!name)
	{
		showDashboardMessage('Course name is required.', 'error');
		return;
	}

	const status = courseStatusInput.val();

	try
	{
		if (mode === 'add')
		{
			const res = await fetch(BASE_URL_LIVE + 'courses', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Id': USER_ID,
				},
				body: JSON.stringify({
					name: name,
					status: status,
					user_id: Number(USER_ID),
				}),
			});
			if (!res.ok)
			{
				showDashboardMessage('Save failed (HTTP ' + res.status + ').', 'error');
				return;
			}
		}
		else
		{
			const id = Number(courseIdInput.val());
			const res = await fetch(BASE_URL_LIVE + 'courses/' + id, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Id': USER_ID,
				},
				body: JSON.stringify({
					name: name,
					status: status,
					user_id: Number(USER_ID),
				}),
			});
			if (!res.ok)
			{
				showDashboardMessage('Update failed (HTTP ' + res.status + ').', 'error');
				return;
			}
		}

		closeModal();
		showDashboardMessage('Course saved successfully.', 'success');
		loadCourses();
	}
	catch (error)
	{
		if (isFetchNetworkError(error))
		{
			showDashboardMessage('Cannot connect to the API at ' + BASE_URL_LIVE + '. Start php artisan serve in onehour-ntpc-api, or set localStorage api_base_url, then reload.', 'error');
		}
		else
		{
			showDashboardMessage('Unable to save course.', 'error');
		}
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
