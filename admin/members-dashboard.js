/**
 * Shared institution members UI (teachers, students) using v2users APIs.
 * Expects window.MEMBER_PAGE = { userTypeId, entitySingular, entityPlural, title, addButtonLabel, modalAddTitle, modalEditTitle, breadcrumbLeaf }
 */

const MP = () => window.MEMBER_PAGE || {};

const sidebarHost = $('#sidebar-host');
const memberTableBody = $('#member-table-body');
const dashboardMessage = $('#dashboard-message');
const addMemberBtn = $('#add-member-btn');
const memberModalOverlay = $('#member-modal-overlay');
const memberModalTitle = $('#member-modal-title');
const memberModalClose = $('#member-modal-close');
const memberModalCancel = $('#member-modal-cancel');
const memberModalSave = $('#member-modal-save');
const memberIdInput = $('#member-id');
const memberNameInput = $('#member-name');
const memberEmailInput = $('#member-email');
const memberUsernameInput = $('#member-username');
const memberPasswordInput = $('#member-password');
const memberUsernameGroup = $('#member-username-group');
const memberPasswordGroup = $('#member-password-group');
const memberPasswordToggle = $('#member-password-toggle');
const memberCount = $('#member-count');

/** Plain passwords for table eye toggle (decoded from API base64 per row id). */
let memberTablePasswordCache = {};

/** Last members array from API (for export / search). */
let lastMembersList = [];

const MEMBER_PAGE_SIZE = 10;

let memberCurrentPage = 1;

const memberState = {
	mode: 'add',
	isSaving: false
};

function entitySingular()
{
	return MP().entitySingular || 'member';
}

function entityPlural()
{
	return MP().entityPlural || 'members';
}

function userTypeId()
{
	return MP().userTypeId;
}

$(document).ready(() =>
{
	if (!MP().userTypeId)
	{
		console.error('MEMBER_PAGE.userTypeId is required');
		return;
	}

	sidebarHost.load('sidebar.html', () =>
	{
		if (typeof window.initSidebarNav === 'function')
		{
			window.initSidebarNav();
		}
	});

	addMemberBtn.on('click', openAddMemberModal);
	memberModalClose.on('click', closeMemberModal);
	memberModalCancel.on('click', closeMemberModal);
	memberModalSave.on('click', saveMember);

	memberPasswordToggle.on('click', toggleMemberPasswordVisibility);
	memberTableBody.on('click', '.cell-pass-toggle', toggleTablePasswordVisibility);

	$(document).on('click', '.dashboard-alert-dismiss', function ()
	{
		dashboardMessage.removeClass('show success error dashboard-message--erp-success').empty();
	});

	$('#member-search-input').on('input', function ()
	{
		memberCurrentPage = 1;
		renderMembersTable();
	});

	$('#export-member-btn').on('click', exportMembersCsv);

	bindMemberPagination();

	$(window).on('hashchange', syncHashToMemberModal);
	syncHashToMemberModal();

	if (INSTITUTE_ID !== null)
	{
		loadMembers();
	}
});

function showSessionGate()
{
	const html = `
		<div class="session-banner" role="alert">
			<div class="session-banner-inner">
				<strong>Sign in required</strong>
				<span>Your session has no institution context. Sign in again so we can load ${entityPlural()} for your school.</span>
				<a class="session-banner-btn" href="admin.html">Go to sign in</a>
			</div>
		</div>
	`;
	const $target = $('.dashboard-main-body').length ? $('.dashboard-main-body') : $('.dashboard-main');
	$target.prepend(html);
	addMemberBtn.prop('disabled', true);
}

function showDashboardMessage(message, type)
{
	dashboardMessage.removeClass('success error dashboard-message--erp-success').empty();
	if (type === 'success')
	{
		dashboardMessage.addClass('success show dashboard-message--erp-success').removeClass('error');
		dashboardMessage.html(
			'<div class="dashboard-alert-ico" aria-hidden="true">'
			+ '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
			+ '</div>'
			+ '<span class="dashboard-alert-msg">' + escapeHtml(message) + '</span>'
			+ '<button type="button" class="dashboard-alert-dismiss" aria-label="Dismiss">&times;</button>'
		);
	}
	else
	{
		dashboardMessage.addClass('error show').removeClass('success dashboard-message--erp-success');
		dashboardMessage.text(message);
	}
}

async function loadMembers()
{
	try
	{
		const apiUrl = BASE_URL_LIVE + 'v2users/getMembers';
		const payload = {
			userTypeId: userTypeId(),
			instituteId: INSTITUTE_ID
		};
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (!response || !response.isOk)
		{
			showDashboardMessage((response && response.message) || 'Unable to fetch ' + entityPlural() + '.', 'error');
			return;
		}

		renderMembers(response.data || []);
	}
	catch (error)
	{
		console.error('loadMembers failed:', error);
		showDashboardMessage('Network error while fetching ' + entityPlural() + '.', 'error');
	}
}

function decodeMemberPasswordB64(b64)
{
	if (!b64 || typeof b64 !== 'string')
	{
		return '';
	}
	try
	{
		return atob(b64.trim());
	}
	catch (e)
	{
		return '';
	}
}

function resetMemberPasswordVisibility()
{
	memberPasswordInput.attr('type', 'password');
	memberPasswordToggle.removeClass('is-revealed').attr('aria-pressed', 'false').attr('aria-label', 'Show password');
}

function toggleMemberPasswordVisibility()
{
	const revealed = memberPasswordInput.attr('type') === 'text';
	if (revealed)
	{
		memberPasswordInput.attr('type', 'password');
		memberPasswordToggle.removeClass('is-revealed').attr('aria-pressed', 'false').attr('aria-label', 'Show password');
	}
	else
	{
		memberPasswordInput.attr('type', 'text');
		memberPasswordToggle.addClass('is-revealed').attr('aria-pressed', 'true').attr('aria-label', 'Hide password');
	}
}

function toggleTablePasswordVisibility()
{
	const $btn = $(this);
	const id = $btn.data('member-id');
	const plain = memberTablePasswordCache[id];
	if (!plain)
	{
		return;
	}
	const $td = $btn.closest('td.cell-pass');
	const $mask = $td.find('.cell-pass-mask');
	const $plainEl = $td.find('.cell-pass-plain');
	const revealed = $btn.hasClass('is-revealed');
	if (revealed)
	{
		$mask.show();
		$plainEl.hide().text('');
		$btn.removeClass('is-revealed').attr('aria-pressed', 'false').attr('aria-label', 'Show password');
	}
	else
	{
		$mask.hide();
		$plainEl.text(plain).show();
		$btn.addClass('is-revealed').attr('aria-pressed', 'true').attr('aria-label', 'Hide password');
	}
}

function memberInitials(name)
{
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (!parts.length)
	{
		return '?';
	}
	if (parts.length === 1)
	{
		return parts[0].slice(0, 2).toUpperCase();
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateStatsFromMembers(members)
{
	lastMembersList = members.slice();
	const n = members.length;
	const ut = userTypeId();
	const teacherT = typeof USER_TYPE_ID_TEACHER !== 'undefined' ? USER_TYPE_ID_TEACHER : 3;
	const studentT = typeof USER_TYPE_ID_STUDENT !== 'undefined' ? USER_TYPE_ID_STUDENT : 4;
	if (ut === teacherT)
	{
		const $st = $('#stat-card-teachers');
		if ($st.length)
		{
			$st.text(n);
		}
		const $b = $('#stat-badge-teachers');
		if ($b.length)
		{
			if (n > 0)
			{
				$b.text('+' + n + ' new');
			}
			else
			{
				$b.text('—');
			}
		}
	}
	else if (ut === studentT)
	{
		const $st = $('#stat-card-students');
		if ($st.length)
		{
			$st.text(n);
		}
		const $b = $('#stat-badge-students');
		if ($b.length)
		{
			if (n > 0)
			{
				$b.text('+' + n + ' new');
			}
			else
			{
				$b.text('—');
			}
		}
	}
}

function clearAddMemberHash()
{
	const file = (window.location.pathname || '').split('/').pop() || '';
	if (file === 'dashboard.html' && window.location.hash.toLowerCase() === '#add-teacher')
	{
		history.replaceState(null, '', 'dashboard.html');
	}
	else if (file === 'students-add.html' && window.location.hash.toLowerCase() === '#add-student')
	{
		history.replaceState(null, '', 'students-add.html');
	}
}

function syncHashToMemberModal()
{
	const file = (window.location.pathname || '').split('/').pop() || '';
	const hash = (window.location.hash || '').toLowerCase();
	const teacherT = typeof USER_TYPE_ID_TEACHER !== 'undefined' ? USER_TYPE_ID_TEACHER : 3;
	const studentT = typeof USER_TYPE_ID_STUDENT !== 'undefined' ? USER_TYPE_ID_STUDENT : 4;
	if (file === 'dashboard.html' && userTypeId() === teacherT && hash === '#add-teacher')
	{
		openAddMemberModal();
	}
	else if (file === 'students-add.html' && userTypeId() === studentT && hash === '#add-student')
	{
		openAddMemberModal();
	}
}

function exportMembersCsv()
{
	const exportList = getFilteredMembers();
	if (!exportList.length)
	{
		return;
	}
	const rows = [['Name', 'Email', 'Username', 'Id'].join(',')];
	exportList.forEach((row) =>
	{
		const line = [
			'"' + String(row.name || '').replace(/"/g, '""') + '"',
			'"' + String(row.email || '').replace(/"/g, '""') + '"',
			'"' + String(row.user_name || '').replace(/"/g, '""') + '"',
			row.id
		].join(',');
		rows.push(line);
	});
	const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = entityPlural() + '-export.csv';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(a.href);
}

function getFilteredMembers()
{
	const q = ($('#member-search-input').val() || '').toLowerCase().trim();
	if (!q)
	{
		return lastMembersList.slice();
	}
	return lastMembersList.filter((row) =>
	{
		const t = [row.name, row.email, row.user_name].join(' ').toLowerCase();
		return t.indexOf(q) !== -1;
	});
}

function bindMemberPagination()
{
	$('#member-page-first').on('click', () =>
	{
		memberCurrentPage = 1;
		renderMembersTable();
	});
	$('#member-page-prev').on('click', () =>
	{
		memberCurrentPage = Math.max(1, memberCurrentPage - 1);
		renderMembersTable();
	});
	$('#member-page-next').on('click', () =>
	{
		memberCurrentPage += 1;
		renderMembersTable();
	});
	$('#member-page-last').on('click', () =>
	{
		const filtered = getFilteredMembers();
		const totalPages = Math.max(1, Math.ceil(filtered.length / MEMBER_PAGE_SIZE));
		memberCurrentPage = totalPages;
		renderMembersTable();
	});
}

function updateMemberPaginationBar(totalItems, page, totalPages, startIdx, endIdx)
{
	const $bar = $('#member-table-pagination');
	const $meta = $('#member-pagination-meta');
	const $status = $('#member-page-status');
	if (totalItems === 0)
	{
		$bar.attr('hidden', true);
		return;
	}
	$bar.removeAttr('hidden');
	const label = entityPlural();
	$meta.text(`Showing ${startIdx}–${endIdx} of ${totalItems} ${totalItems === 1 ? entitySingular() : label}`);
	$status.text(`Page ${page} of ${totalPages}`);
	const atFirst = page <= 1;
	const atLast = page >= totalPages;
	$('#member-page-first, #member-page-prev').prop('disabled', atFirst);
	$('#member-page-next, #member-page-last').prop('disabled', atLast);
}

function renderMembers(members)
{
	lastMembersList = members.slice();
	memberCurrentPage = 1;
	updateStatsFromMembers(members);
	renderMembersTable();
}

function renderMembersTable()
{
	memberTableBody.empty();
	memberTablePasswordCache = {};
	const label = entityPlural();
	const filtered = getFilteredMembers();
	const total = filtered.length;
	memberCount.text(`${total} ${total === 1 ? entitySingular() : label}`);

	const $pagination = $('#member-table-pagination');

	if (!lastMembersList.length)
	{
		$pagination.attr('hidden', true);
		const emptyStateHtml = `
			<tr>
				<td colspan="6">
					<div class="empty-state">
						<div class="empty-illus" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M8 7a4 4 0 118 0 4 4 0 01-8 0z" stroke="currentColor" stroke-width="1.8"/>
								<path d="M4 21a8 8 0 0116 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							</svg>
						</div>
						<div class="empty-title">No ${label} added yet</div>
						<div class="empty-subtitle">Add your first ${entitySingular()} to get started.</div>
						<button type="button" class="secondary-btn" id="empty-add-member">Add your first ${entitySingular()}</button>
					</div>
				</td>
			</tr>
		`;
		memberTableBody.append(emptyStateHtml);
		$('#empty-add-member').on('click', openAddMemberModal);
		return;
	}

	if (!total)
	{
		$pagination.attr('hidden', true);
		memberTableBody.append(`
			<tr>
				<td colspan="6">
					<div class="empty-state">
						<div class="empty-title">No results match your search</div>
						<div class="empty-subtitle">Try a different name, email, or username.</div>
					</div>
				</td>
			</tr>
		`);
		return;
	}

	const totalPages = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE));
	if (memberCurrentPage > totalPages)
	{
		memberCurrentPage = totalPages;
	}
	if (memberCurrentPage < 1)
	{
		memberCurrentPage = 1;
	}
	const start = (memberCurrentPage - 1) * MEMBER_PAGE_SIZE;
	const pageRows = filtered.slice(start, start + MEMBER_PAGE_SIZE);
	const startIdx = start + 1;
	const endIdx = start + pageRows.length;

	updateMemberPaginationBar(total, memberCurrentPage, totalPages, startIdx, endIdx);

	const roleLabel = capitalize(entitySingular());

	pageRows.forEach((row) =>
	{
		const plainPw = decodeMemberPasswordB64(row.password);
		if (plainPw && row.id != null)
		{
			memberTablePasswordCache[row.id] = plainPw;
		}
		const passCellHtml = plainPw
			? `<td class="cell-pass">
					<div class="cell-pass-row pwcell-erp">
						<span class="cell-pass-mask">••••••••</span>
						<span class="cell-pass-plain" hidden></span>
						<button type="button" class="cell-pass-toggle eyebtn-erp" data-member-id="${row.id}" aria-label="Show password" aria-pressed="false">
							<span class="cell-pass-toggle__icon cell-pass-toggle__icon--show" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</span>
							<span class="cell-pass-toggle__icon cell-pass-toggle__icon--hide" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
							</span>
						</button>
					</div>
				</td>`
			: '<td class="cell-pass"><span class="pwcell-erp">••••••••</span></td>';
		const initials = escapeHtml(memberInitials(row.name));
		const rowHtml = `
			<tr>
				<td class="cell-teacher-erp">
					<div class="ncell">
						<div class="member-av" aria-hidden="true">${initials}</div>
						<div>
							<div class="nname">${escapeHtml(row.name || '')}</div>
							<div class="nrole">${escapeHtml(roleLabel)}</div>
						</div>
					</div>
				</td>
				<td class="cell-email-erp">${escapeHtml(row.email || '')}</td>
				<td class="cell-user-erp">
					<span class="username-pill">
						<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
						${escapeHtml(row.user_name || '')}
					</span>
				</td>
				${passCellHtml}
				<td class="cell-status-erp"><span class="member-status-pill">Active</span></td>
				<td class="cell-actions-erp">
					<div class="action-group action-group--erp">
						<button class="action-btn edit erp-abtn erp-abtn--edit" data-action="edit" data-id="${row.id}" aria-label="Edit ${entitySingular()}">
							<svg viewBox="0 0 24 24" fill="none" width="13" height="13">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
							</svg>
						</button>
						<button class="action-btn delete erp-abtn erp-abtn--delete" data-action="delete" data-id="${row.id}" aria-label="Delete ${entitySingular()}">
							<svg viewBox="0 0 24 24" fill="none" width="13" height="13">
								<polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/>
								<path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="2"/>
								<path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2"/>
							</svg>
						</button>
					</div>
				</td>
			</tr>
		`;
		memberTableBody.append(rowHtml);
	});

	memberTableBody.find('[data-action="edit"]').on('click', function ()
	{
		const memberId = $(this).data('id');
		const member = lastMembersList.find((item) => Number(item.id) === Number(memberId));
		if (member)
		{
			openEditMemberModal(member);
		}
	});

	memberTableBody.find('[data-action="delete"]').on('click', function ()
	{
		const memberId = $(this).data('id');
		handleDeleteMember(memberId);
	});
}

function openAddMemberModal()
{
	memberState.mode = 'add';
	memberModalTitle.text(MP().modalAddTitle || 'Add');
	memberIdInput.val('');
	memberNameInput.val('');
	memberEmailInput.val('');
	memberUsernameInput.val('');
	memberPasswordInput.val('');
	resetMemberPasswordVisibility();
	memberUsernameGroup.hide();
	memberPasswordGroup.hide();
	memberModalSave.text('Save');
	memberModalOverlay.addClass('open');
}

function openEditMemberModal(member)
{
	memberState.mode = 'edit';
	memberModalTitle.text(MP().modalEditTitle || 'Edit');
	memberIdInput.val(member.id);
	memberNameInput.val(member.name || '');
	memberEmailInput.val(member.email || '');
	memberUsernameInput.val(member.user_name || '');
	memberPasswordInput.val('');
	memberUsernameGroup.show();
	memberPasswordGroup.show();
	memberPasswordInput.attr('placeholder', 'Leave empty to keep current password');
	resetMemberPasswordVisibility();
	memberModalSave.text('Update');
	memberModalOverlay.addClass('open');
}

function closeMemberModal()
{
	memberModalOverlay.removeClass('open');
	resetMemberPasswordVisibility();
	clearAddMemberHash();
}

function validateMemberForm()
{
	const name = memberNameInput.val().trim();
	const email = memberEmailInput.val().trim();
	const userName = memberUsernameInput.val().trim();
	const password = memberPasswordInput.val().trim();
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
	if (memberState.mode === 'edit' && !userName)
	{
		showDashboardMessage('Username is required.', 'error');
		return false;
	}
	if (memberState.mode === 'edit' && password !== '' && password.length < 6)
	{
		showDashboardMessage('Password must be at least 6 characters.', 'error');
		return false;
	}

	return true;
}

async function saveMember()
{
	if (memberState.isSaving || !validateMemberForm())
	{
		return;
	}

	const name = memberNameInput.val().trim();
	const email = memberEmailInput.val().trim();
	const userName = memberUsernameInput.val().trim();
	const password = memberPasswordInput.val().trim();

	const originalText = memberModalSave.text();

	try
	{
		memberState.isSaving = true;
		memberModalSave.prop('disabled', true).text('Saving...');

		let response = null;
		if (memberState.mode === 'add')
		{
			const apiUrl = BASE_URL_LIVE + 'v2users/addMember';
			const payload = {
				name: name,
				email: email,
				instituteId: INSTITUTE_ID,
				userName: '',
				password: '',
				userTypeId: userTypeId()
			};
			response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');
		}
		else
		{
			const apiUrl = BASE_URL_LIVE + 'v2users/updateMember';
			const payload = {
				id: memberIdInput.val(),
				name: name,
				email: email,
				userName: userName,
				password: password,
				userTypeId: userTypeId(),
				instituteId: INSTITUTE_ID
			};
			response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');
		}

		if (response && response.isOk)
		{
			let successMessage = memberState.mode === 'add'
				? `${capitalize(entitySingular())} added successfully.`
				: `${capitalize(entitySingular())} updated successfully.`;

			if (
				memberState.mode === 'add' &&
				response.data &&
				response.data.username &&
				response.data.password
			)
			{
				successMessage = `${capitalize(entitySingular())} added. Username: ${response.data.username}, Password: ${response.data.password}`;
			}

			showDashboardMessage(successMessage, 'success');
			closeMemberModal();
			loadMembers();
		}
		else
		{
			showDashboardMessage((response && response.message) || 'Unable to save.', 'error');
		}
	}
	catch (error)
	{
		console.error('saveMember failed:', error);
		showDashboardMessage('Network error while saving.', 'error');
	}
	finally
	{
		memberState.isSaving = false;
		memberModalSave.prop('disabled', false).text(originalText);
	}
}

function capitalize(s)
{
	if (!s) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

async function handleDeleteMember(memberId)
{
	const shouldDelete = window.confirm(`Are you sure you want to delete this ${entitySingular()}?`);
	if (!shouldDelete)
	{
		return;
	}

	try
	{
		const apiUrl = BASE_URL_LIVE + 'v2users/deleteMember';
		const payload = {
			id: memberId,
			userTypeId: userTypeId(),
			instituteId: INSTITUTE_ID
		};
		const response = await promisingAjaxCall(apiUrl, 'POST', payload, 'application/json');

		if (response && response.isOk)
		{
			showDashboardMessage(`${capitalize(entitySingular())} deleted successfully.`, 'success');
			loadMembers();
		}
		else
		{
			showDashboardMessage((response && response.message) || 'Unable to delete.', 'error');
		}
	}
	catch (error)
	{
		console.error('deleteMember failed:', error);
		showDashboardMessage('Network error while deleting.', 'error');
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
