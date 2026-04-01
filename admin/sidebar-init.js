/**
 * Highlights active sidebar link and opens the parent disclosure for that section.
 */
window.initSidebarNav = function initSidebarNav()
{
	const path = window.location.pathname || '';
	let file = (path.split('/').pop() || '').toLowerCase();
	if (!file || file === '') file = 'dashboard.html';

	$('.sidebar-sublink[data-page]').removeClass('active');

	$('.sidebar-sublink[data-page]').each(function ()
	{
		const $link = $(this);
		const p = ($link.data('page') || '').toString().toLowerCase();
		const navRaw = $link.data('nav');
		const nav = (navRaw !== undefined && navRaw !== null)
			? String(navRaw).toLowerCase()
			: '';

		if (!p || p !== file)
		{
			return;
		}

		if (!nav)
		{
			$link.addClass('active');
		}
	});

	const $active = $('.sidebar-sublink.active');
	if ($active.length)
	{
		$active.closest('details.sidebar-group').prop('open', true);
	}

	initSidebarMobile();
};

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

$(window).on('hashchange', function ()
{
	if ($('.sidebar').length && typeof window.initSidebarNav === 'function')
	{
		window.initSidebarNav();
	}
});

