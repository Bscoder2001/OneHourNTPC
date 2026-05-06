/**
 * Shared dashboard topbar: dashboard-topbar.html, breadcrumb, account popover (chat bootstrap when token exists).
 */
(function ()
{
	let dashboardTopbarAccountBound = false;

	window.setDashboardBreadcrumb = function (items)
	{
		const ol = document.getElementById('dashboard-breadcrumb-trail');
		if (!ol || !items || !items.length)
		{
			return;
		}
		ol.innerHTML = '';
		for (let i = 0; i < items.length; i++)
		{
			if (i > 0)
			{
				const sep = document.createElement('li');
				sep.className = 'breadcrumb-sep';
				sep.setAttribute('aria-hidden', 'true');
				sep.textContent = '/';
				ol.appendChild(sep);
			}
			const it = items[i];
			const li = document.createElement('li');
			if (it.current)
			{
				const span = document.createElement('span');
				span.className = 'breadcrumb-current';
				span.setAttribute('aria-current', 'page');
				span.textContent = it.text;
				li.appendChild(span);
			}
			else if (it.href)
			{
				const a = document.createElement('a');
				a.href = it.href;
				a.textContent = it.text;
				li.appendChild(a);
			}
			else
			{
				li.textContent = it.text;
			}
			ol.appendChild(li);
		}
	};

	window.resolveDashboardTopbarDisplayName = function (user)
	{
		if (!user)
		{
			return 'User';
		}
		const dn = String(user.display_name || '').trim();
		if (dn)
		{
			return dn;
		}
		const n = String(user.name || '').trim();
		if (n)
		{
			return n;
		}
		const un = String(user.user_name || '').trim();
		if (un)
		{
			return un;
		}
		const em = String(user.email || '').trim();
		if (em && em.indexOf('@') !== -1)
		{
			return em.split('@')[0];
		}
		if (em)
		{
			return em;
		}
		return 'User';
	};

	function roleLabelFromUserTypeId(tid)
	{
		const t = parseInt(String(tid), 10);
		if (isNaN(t))
		{
			return 'Member';
		}
		const admin = typeof USER_TYPE_ID_ADMIN !== 'undefined' ? USER_TYPE_ID_ADMIN : 2;
		const teacher = typeof USER_TYPE_ID_TEACHER !== 'undefined' ? USER_TYPE_ID_TEACHER : 3;
		const student = typeof USER_TYPE_ID_STUDENT !== 'undefined' ? USER_TYPE_ID_STUDENT : 4;
		if (t === admin)
		{
			return 'Institution admin';
		}
		if (t === teacher)
		{
			return 'Teacher';
		}
		if (t === student)
		{
			return 'Student';
		}
		return 'Member';
	}

	function applyRolePillClass(roleEl, role)
	{
		if (!roleEl)
		{
			return;
		}
		roleEl.textContent = role;
		roleEl.className = 'dashboard-account-popover-role';
		if (role === 'Student')
		{
			roleEl.classList.add('is-student');
		}
		else if (role === 'Institution admin')
		{
			roleEl.classList.add('is-admin');
		}
		else if (role === 'Teacher')
		{
			roleEl.classList.add('is-teacher');
		}
		else
		{
			roleEl.classList.add('is-member');
		}
	}

	window.applyDashboardTopbarUser = function (user)
	{
		if (!user)
		{
			return;
		}
		const nameEl = document.getElementById('dashboard-popover-name');
		const roleEl = document.getElementById('dashboard-popover-role');
		const emailEl = document.getElementById('dashboard-popover-email');
		const avLarge = document.getElementById('dashboard-popover-av');
		const unameRow = document.getElementById('dashboard-popover-username');
		const avSmall = document.getElementById('dashboard-top-av');
		const name = window.resolveDashboardTopbarDisplayName(user);
		let role = String(user.role_label || '').trim();
		if (!role && user.user_type_id != null)
		{
			role = roleLabelFromUserTypeId(user.user_type_id);
		}
		if (!role)
		{
			role = 'Member';
		}
		if (nameEl)
		{
			nameEl.textContent = name;
		}
		applyRolePillClass(roleEl, role);
		if (emailEl)
		{
			const em = String(user.email || '').trim();
			emailEl.textContent = em;
			emailEl.hidden = !em;
		}
		if (avLarge)
		{
			avLarge.textContent = (name.charAt(0) || '?').toUpperCase();
		}
		if (avSmall)
		{
			avSmall.textContent = (name.charAt(0) || '?').toUpperCase();
		}
		if (unameRow)
		{
			const un = String(user.user_name || '').trim();
			const dup = un && name === un;
			unameRow.textContent = un && !dup ? '@' + un : '';
			unameRow.hidden = !un || dup;
		}
	};

	function clearDashboardTopbarPopoverPosition()
	{
		const pop = document.getElementById('dashboard-user-popover');
		if (!pop)
		{
			return;
		}
		pop.style.position = '';
		pop.style.top = '';
		pop.style.right = '';
		pop.style.left = '';
		pop.style.bottom = '';
		pop.style.zIndex = '';
	}

	function positionDashboardTopbarPopover()
	{
		const pop = document.getElementById('dashboard-user-popover');
		const btn = document.getElementById('dashboard-top-user-menu');
		if (!pop || !btn || pop.hidden)
		{
			return;
		}
		const r = btn.getBoundingClientRect();
		const gap = 10;
		const minInset = 12;
		pop.style.position = 'fixed';
		pop.style.top = (r.bottom + gap) + 'px';
		pop.style.right = Math.max(minInset, window.innerWidth - r.right) + 'px';
		pop.style.left = 'auto';
		pop.style.bottom = 'auto';
		pop.style.zIndex = '460';
	}

	window.closeDashboardTopbarPopover = function ()
	{
		const pop = document.getElementById('dashboard-user-popover');
		const btn = document.getElementById('dashboard-top-user-menu');
		clearDashboardTopbarPopoverPosition();
		if (pop)
		{
			pop.hidden = true;
		}
		if (btn)
		{
			btn.setAttribute('aria-expanded', 'false');
		}
	};

	function toggleDashboardTopbarPopover()
	{
		const pop = document.getElementById('dashboard-user-popover');
		const btn = document.getElementById('dashboard-top-user-menu');
		if (!pop || !btn)
		{
			return;
		}
		const willOpen = pop.hidden;
		pop.hidden = !willOpen;
		btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
		if (willOpen)
		{
			requestAnimationFrame(function ()
			{
				positionDashboardTopbarPopover();
			});
		}
		else
		{
			clearDashboardTopbarPopoverPosition();
		}
	}

	function fallbackPopulateTopbarFromStorage()
	{
		const saved = localStorage.getItem('admin-username-saved') || '';
		const uid = localStorage.getItem('user_id');
		const ut = localStorage.getItem('user_type_id');
		if (!saved && !uid)
		{
			return;
		}
		window.applyDashboardTopbarUser({
			display_name: saved || ('User #' + uid),
			role_label: ut != null ? roleLabelFromUserTypeId(ut) : 'Member',
			email: '',
			user_name: saved || ''
		});
	}

	async function refreshDashboardTopbarFromApi()
	{
		let token = '';
		try
		{
			token = localStorage.getItem('chat_token') || '';
		}
		catch (e)
		{
		}
		if (!token || typeof BASE_URL_LIVE === 'undefined')
		{
			fallbackPopulateTopbarFromStorage();
			return;
		}
		try
		{
			const res = await fetch(BASE_URL_LIVE.replace(/\/?$/, '/') + 'api/chat/bootstrap', {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					Authorization: 'Bearer ' + token
				}
			});
			const json = await res.json().catch(function () { return null; });
			if (res.ok && json && json.data && json.data.user)
			{
				window.applyDashboardTopbarUser(json.data.user);
				if (typeof window.initMessageNotificationsFromBootstrap === 'function')
				{
					window.initMessageNotificationsFromBootstrap(json.data);
				}
			}
			else
			{
				fallbackPopulateTopbarFromStorage();
			}
		}
		catch (e)
		{
			fallbackPopulateTopbarFromStorage();
		}
	}

	window.initDashboardTopbarAccount = function ()
	{
		if (dashboardTopbarAccountBound)
		{
			return;
		}
		dashboardTopbarAccountBound = true;
		const btn = document.getElementById('dashboard-top-user-menu');
		if (btn)
		{
			btn.addEventListener('click', function (e)
			{
				e.stopPropagation();
				toggleDashboardTopbarPopover();
			});
		}
		document.addEventListener('click', function (e)
		{
			const wrap = document.querySelector('.dashboard-topbar-user-wrap');
			if (wrap && e.target && wrap.contains(e.target))
			{
				return;
			}
			window.closeDashboardTopbarPopover();
		});
		document.addEventListener('keydown', function (e)
		{
			if (e.key === 'Escape')
			{
				window.closeDashboardTopbarPopover();
			}
		});
		window.addEventListener('resize', function ()
		{
			const pop = document.getElementById('dashboard-user-popover');
			if (pop && !pop.hidden)
			{
				positionDashboardTopbarPopover();
			}
		});
	};

	window.loadDashboardTopbar = function (hostSelector, done)
	{
		const sel = hostSelector || '#topbar-host';
		const $host = window.jQuery ? window.jQuery(sel) : null;
		if (!$host || !$host.length)
		{
			if (typeof done === 'function')
			{
				done();
			}
			return;
		}
		$host.load('dashboard-topbar.html', function ()
		{
			const crumbs = window.DASHBOARD_TOPBAR_BREADCRUMB
				|| (window.MEMBER_PAGE && window.MEMBER_PAGE.breadcrumb);
			if (crumbs && window.setDashboardBreadcrumb)
			{
				window.setDashboardBreadcrumb(crumbs);
			}
			window.initDashboardTopbarAccount();
			refreshDashboardTopbarFromApi();
			if (typeof done === 'function')
			{
				done();
			}
		});
	};
})();
