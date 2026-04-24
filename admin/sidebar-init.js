/**
 * Highlights active sidebar link and opens parent disclosure(s).
 */
window.initSidebarNav = function initSidebarNav()
{
	const path = window.location.pathname || '';
	let file = (path.split('/').pop() || '').toLowerCase();
	if (!file || file === '')
	{
		file = 'dashboard.html';
	}

	$('.sidebar-sublink[data-page]').removeClass('active');

	$('.sidebar-sublink[data-page]').each(function ()
	{
		const $link = $(this);
		const p = ($link.data('page') || '').toString().toLowerCase();
		if (p && p === file)
		{
			$link.addClass('active');
		}
	});

	initModuleToggles();
	initSidebarMobile();
};

function initModuleToggles()
{
	const roots = document.querySelectorAll('.erp-module-collapse');
	roots.forEach((root, index) => {
		const btn = root.querySelector('.erp-institution-summary');
		const panel = root.querySelector('.erp-institution-anim');
		if (!btn || !panel) return;

		// Keep aria-controls/labelledby valid automatically for copied modules.
		if (!panel.id)
		{
			panel.id = `erp-module-panel-${index + 1}`;
		}
		if (!btn.id)
		{
			btn.id = `erp-module-toggle-${index + 1}`;
		}
		btn.setAttribute('aria-controls', panel.id);
		panel.setAttribute('aria-labelledby', btn.id);

		const requestedExpanded = btn.getAttribute('aria-expanded') === 'true';
		const isOpen = root.classList.contains('is-open') || requestedExpanded;
		root.classList.toggle('is-open', isOpen);
		btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

		btn.addEventListener('click', function ()
		{
			const open = !root.classList.contains('is-open');
			root.classList.toggle('is-open', open);
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	});
}

function initSidebarMobile()
{
	const $btn = $('#sidebar-menu-btn');
	const $backdrop = $('#sidebar-backdrop');

	function setOpen(open)
	{
		$('body').toggleClass('sidebar-open', open);
		$btn.attr('aria-expanded', open);
		if ($backdrop.length)
		{
			$backdrop.prop('hidden', !open).attr('aria-hidden', !open);
		}
	}

	$btn.off('click.sidebarNav').on('click.sidebarNav', function ()
	{
		setOpen(!$('body').hasClass('sidebar-open'));
	});

	$backdrop.off('click.sidebarNav').on('click.sidebarNav', function ()
	{
		setOpen(false);
	});

	$(document).off('keydown.sidebarNav').on('keydown.sidebarNav', function (e)
	{
		if (e.key === 'Escape')
		{
			setOpen(false);
		}
	});

	$('.sidebar-sublink[href]').off('click.sidebarNavClose').on('click.sidebarNavClose', function ()
	{
		if (window.matchMedia('(max-width: 767px)').matches)
		{
			setOpen(false);
		}
	});
}
