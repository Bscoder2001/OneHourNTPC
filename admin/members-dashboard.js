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

	const instituteId = requireInstituteSession();
	if (instituteId === null)
	{
		showSessionGate();
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

	if (instituteId !== null)
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

async function loadMembers()
{
	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		return;
	}

	try
	{
		const apiUrl = BASE_URL_LIVE + 'v2users/getMembers';
		const payload = {
			userTypeId: userTypeId(),
			instituteId: instituteId
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


function renderMembers(members)
{
	memberTableBody.empty();
	memberTablePasswordCache = {};
	const label = entityPlural();
	memberCount.text(`${members.length} ${members.length === 1 ? entitySingular() : label}`);

	if (!members.length)
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

	members.forEach((row) =>
	{
		const plainPw = decodeMemberPasswordB64(row.password);
		if (plainPw && row.id != null)
		{
			memberTablePasswordCache[row.id] = plainPw;
		}
		const passCellHtml = plainPw
			? `<td class="cell-pass">
					<div class="cell-pass-row">
						<span class="cell-pass-mask">••••••••</span>
						<span class="cell-pass-plain" hidden></span>
						<button type="button" class="cell-pass-toggle" data-member-id="${row.id}" aria-label="Show password" aria-pressed="false">
							<span class="cell-pass-toggle__icon cell-pass-toggle__icon--show" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</span>
							<span class="cell-pass-toggle__icon cell-pass-toggle__icon--hide" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
							</span>
						</button>
					</div>
				</td>`
			: '<td class="cell-pass">••••••••</td>';
		const rowHtml = `
			<tr>
				<td class="cell-name">${escapeHtml(row.name || '')}</td>
				<td class="cell-muted">${escapeHtml(row.email || '')}</td>
				<td class="cell-muted">${escapeHtml(row.user_name || '')}</td>
				${passCellHtml}
				<td>
					<div class="action-group">
						<button class="action-btn edit" data-action="edit" data-id="${row.id}" aria-label="Edit ${entitySingular()}">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4.2-4.2L4 15.8V20z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
								<path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							</svg>
						</button>
						<button class="action-btn delete" data-action="delete" data-id="${row.id}" aria-label="Delete ${entitySingular()}">
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
		memberTableBody.append(rowHtml);
	});

	memberTableBody.find('[data-action="edit"]').on('click', function ()
	{
		const memberId = $(this).data('id');
		const member = members.find((item) => Number(item.id) === Number(memberId));
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

	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		showDashboardMessage('Session expired. Please sign in again.', 'error');
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
				instituteId: instituteId,
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
				instituteId: instituteId
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

	const instituteId = getSessionInstituteId();
	if (instituteId === null)
	{
		showDashboardMessage('Session expired. Please sign in again.', 'error');
		return;
	}

	try
	{
		const apiUrl = BASE_URL_LIVE + 'v2users/deleteMember';
		const payload = {
			id: memberId,
			userTypeId: userTypeId(),
			instituteId: instituteId
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
