const sidebarHost = $('#sidebar-host');
const ayTableBody = $('#ay-table-body');
const ayMessage = $('#ay-dashboard-message');
const ayAddBtn = $('#ay-add-btn');
const ayModalOverlay = $('#ay-modal-overlay');
const ayModalClose = $('#ay-modal-close');
const ayModalCancel = $('#ay-modal-cancel');
const ayModalSave = $('#ay-modal-save');
const ayNameInput = $('#ay-name');
const ayStartInput = $('#ay-start');
const ayEndInput = $('#ay-end');

let linkedAcademicYearId = null;

$(document).ready(() =>
{
	const instituteId = requireInstituteSession();
	if (instituteId === null)
	{
		showAySessionGate();
	}

	sidebarHost.load('sidebar.html', () =>
	{
		if (typeof window.initSidebarNav === 'function')
		{
			window.initSidebarNav();
		}
	});

	ayAddBtn.on('click', openAyModal);
	ayModalClose.on('click', closeAyModal);
	ayModalCancel.on('click', closeAyModal);
	ayModalSave.on('click', saveAy);

	if (instituteId !== null)
	{
		loadAcademicYears();
	}
	else
	{
		ayAddBtn.prop('disabled', true);
	}
});

function showAySessionGate()
{
	const html = `
		<div class="session-banner" role="alert">
			<div class="session-banner-inner">
				<strong>Sign in required</strong>
				<span>Sign in to manage academic years for your institution.</span>
				<a class="session-banner-btn" href="admin.html">Go to sign in</a>
			</div>
		</div>
	`;
	const $target = $('.dashboard-main-body').length ? $('.dashboard-main-body') : $('.dashboard-main');
	$target.prepend(html);
}

function showAyMessage(message, type)
{
	ayMessage.removeClass('success error').addClass('show');
	ayMessage.toggleClass('success', type === 'success');
	ayMessage.toggleClass('error', type !== 'success');
	ayMessage.text(message);
}

async function loadAcademicYears()
{
	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		return;
	}

	try
	{
		const url = BASE_URL_LIVE + 'users/listAcademicYears';
		const response = await promisingAjaxCall(url, 'POST', { institute_id: instituteId }, 'application/json');

		if (!response || !response.isOk)
		{
			showAyMessage((response && response.message) || 'Unable to load academic years.', 'error');
			return;
		}

		const data = response.data || {};
		const rows = data.rows || [];
		linkedAcademicYearId = data.linked_academic_year_id != null ? Number(data.linked_academic_year_id) : null;
		renderAyRows(rows);
	}
	catch (e)
	{
		console.error(e);
		showAyMessage('Network error while loading academic years.', 'error');
	}
}

function renderAyRows(rows)
{
	ayTableBody.empty();

	if (!rows.length)
	{
		ayTableBody.append(`
			<tr>
				<td colspan="6">
					<div class="empty-state" style="padding:36px 16px;">
						<div class="empty-title">No academic years yet</div>
						<div class="empty-subtitle">Create one to keep records for upcoming sessions.</div>
					</div>
				</td>
			</tr>
		`);
		return;
	}

	rows.forEach((row) =>
	{
		const id = Number(row.id);
		const isLinked = linkedAcademicYearId !== null && id === linkedAcademicYearId;
		const mappingHtml = isLinked
			? '<span class="ay-pill ay-pill-current">Current</span>'
			: '<span class="ay-pill ay-pill-future">Future use</span>';

		const status = escapeHtml(String(row.status || ''));
		const tr = `
			<tr>
				<td class="cell-name">${escapeHtml(row.name || '')}</td>
				<td class="cell-muted">${escapeHtml(fmtDate(row.session_start))}</td>
				<td class="cell-muted">${escapeHtml(fmtDate(row.session_end))}</td>
				<td><span class="ay-status">${status}</span></td>
				<td>${mappingHtml}</td>
				<td>
					<button type="button" class="action-btn delete ay-delete" data-id="${id}" aria-label="Remove academic year">
						<svg viewBox="0 0 24 24" fill="none">
							<path d="M4 7h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M10 11v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M14 11v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							<path d="M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
							<path d="M9 7V4h6v3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
						</svg>
					</button>
				</td>
			</tr>
		`;
		ayTableBody.append(tr);
	});

	ayTableBody.find('.ay-delete').on('click', function ()
	{
		const id = $(this).data('id');
		handleDeleteAy(id);
	});
}

function fmtDate(v)
{
	if (!v) return '—';
	return String(v).slice(0, 10);
}

function openAyModal()
{
	ayNameInput.val('');
	ayStartInput.val('');
	ayEndInput.val('');
	ayModalOverlay.addClass('open');
}

function closeAyModal()
{
	ayModalOverlay.removeClass('open');
}

async function saveAy()
{
	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		showAyMessage('Session expired. Please sign in again.', 'error');
		return;
	}

	const name = ayNameInput.val().trim();
	const sessionStart = ayStartInput.val();
	const sessionEnd = ayEndInput.val();

	if (name.length < 2)
	{
		showAyMessage('Enter a name for the academic year.', 'error');
		return;
	}
	if (!sessionStart || !sessionEnd)
	{
		showAyMessage('Session start and end are required.', 'error');
		return;
	}
	if (sessionStart > sessionEnd)
	{
		showAyMessage('Session end must be on or after session start.', 'error');
		return;
	}

	const original = ayModalSave.text();
	try
	{
		ayModalSave.prop('disabled', true).text('Saving...');
		const url = BASE_URL_LIVE + 'users/addAcademicYear';
		const payload = {
			institute_id: instituteId,
			name: name,
			session_start: sessionStart,
			session_end: sessionEnd,
			status: 'active',
			link_to_institute: false
		};
		const response = await promisingAjaxCall(url, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			showAyMessage('Academic year saved (not assigned as current).', 'success');
			closeAyModal();
			loadAcademicYears();
		}
		else
		{
			showAyMessage((response && response.message) || 'Could not save.', 'error');
		}
	}
	catch (e)
	{
		console.error(e);
		showAyMessage('Network error.', 'error');
	}
	finally
	{
		ayModalSave.prop('disabled', false).text(original);
	}
}

async function handleDeleteAy(id)
{
	if (!window.confirm('Mark this academic year as deleted?'))
	{
		return;
	}

	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		return;
	}

	try
	{
		const url = BASE_URL_LIVE + 'users/deleteAcademicYear';
		const response = await promisingAjaxCall(url, 'POST', { id: id, institute_id: instituteId }, 'application/json');
		if (response && response.isOk)
		{
			showAyMessage('Academic year removed.', 'success');
			loadAcademicYears();
		}
		else
		{
			showAyMessage((response && response.message) || 'Could not delete.', 'error');
		}
	}
	catch (e)
	{
		showAyMessage('Network error.', 'error');
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
