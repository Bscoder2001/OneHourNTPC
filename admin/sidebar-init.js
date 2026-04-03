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

	const $active = $('.sidebar-sublink.active');
	if ($active.length)
	{
		$active.closest('details.sidebar-group').prop('open', true);
		const $inst = $active.closest('.erp-module-collapse--institution');
		if ($inst.length)
		{
			$inst.addClass('is-open');
			$inst.find('.erp-institution-summary').attr('aria-expanded', 'true');
		}
	}

	initInstitutionToggle();
	initSidebarMobile();
};

function initInstitutionToggle()
{
	const $root = $('.erp-module-collapse--institution');
	const $btn = $root.find('.erp-institution-summary').first();
	if (!$root.length || !$btn.length)
	{
		return;
	}

	$btn.off('click.institutionToggle').on('click.institutionToggle', function ()
	{
		const open = !$root.hasClass('is-open');
		$root.toggleClass('is-open', open);
		$btn.attr('aria-expanded', open ? 'true' : 'false');
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
