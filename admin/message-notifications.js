/**
 * Message notifications: Facebook-style dropdown, sound, Web Notifications, Pusher on non-chat pages.
 */
(function ()
{
	const ITEMS_KEY = 'chat-msg-notify-items';
	const LEGACY_COUNT_KEY = 'chat-msg-notify-count';
	const MAX_ITEMS = 35;
	let notifyUserId = null;
	let notifyPusher = null;
	let notifyChannel = null;
	let bellBound = false;
	let docBound = false;
	let notifyItems = [];
	let pusherConnecting = false;
	let audioCtx = null;
	let audioUnlockArmed = false;

	function isChatPage()
	{
		return /(^|\/)chat\.html([?#]|$)/i.test(window.location.pathname || '')
			|| /chat\.html/i.test(String(window.location.href || ''));
	}

	function loadPusherScript(done)
	{
		if (typeof Pusher !== 'undefined')
		{
			done();
			return;
		}
		const s = document.createElement('script');
		s.src = 'https://js.pusher.com/8.4.0/pusher.min.js';
		s.async = true;
		s.onload = function ()
		{
			done();
		};
		s.onerror = function ()
		{
			console.warn('Pusher failed to load for message notifications');
			done();
		};
		document.head.appendChild(s);
	}

	function ensureAudioContext()
	{
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx)
		{
			return null;
		}
		if (!audioCtx)
		{
			audioCtx = new Ctx();
		}
		return audioCtx;
	}

	/**
	 * Browsers start AudioContext suspended without a user gesture; resume is async.
	 */
	function armNotificationAudioUnlock()
	{
		if (audioUnlockArmed)
		{
			return;
		}
		audioUnlockArmed = true;
		function tryResume()
		{
			const ctx = ensureAudioContext();
			if (ctx && ctx.state === 'suspended')
			{
				ctx.resume().catch(function () {});
			}
		}
		document.addEventListener('pointerdown', tryResume, { capture: true, passive: true });
		document.addEventListener('keydown', tryResume, { capture: true, passive: true });
		document.addEventListener('touchstart', tryResume, { capture: true, passive: true });
		document.addEventListener('visibilitychange', function ()
		{
			if (document.visibilityState === 'visible')
			{
				tryResume();
			}
		});
	}

	function playTone(ctx, freq, start, dur, gain)
	{
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sine';
		o.frequency.value = freq;
		o.connect(g);
		g.connect(ctx.destination);
		g.gain.setValueAtTime(0.0001, start);
		g.gain.linearRampToValueAtTime(gain, start + 0.02);
		g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		o.start(start);
		o.stop(start + dur + 0.02);
	}

	function playMessageNotificationSound()
	{
		const ctx = ensureAudioContext();
		if (!ctx)
		{
			return;
		}
		function ding()
		{
			const t = ctx.currentTime;
			try
			{
				playTone(ctx, 784, t, 0.13, 0.12);
				playTone(ctx, 988, t + 0.14, 0.14, 0.1);
			}
			catch (e)
			{
			}
		}
		if (ctx.state === 'suspended')
		{
			ctx.resume().then(function ()
			{
				ding();
			}).catch(function ()
			{
				ding();
			});
		}
		else
		{
			ding();
		}
	}

	function unreadCount()
	{
		let n = 0;
		for (let i = 0; i < notifyItems.length; i++)
		{
			if (!notifyItems[i].read)
			{
				n++;
			}
		}
		return n;
	}

	function persistItems()
	{
		try
		{
			localStorage.setItem(ITEMS_KEY, JSON.stringify(notifyItems));
		}
		catch (e)
		{
		}
	}

	function loadPersistedItems()
	{
		notifyItems = [];
		try
		{
			const raw = localStorage.getItem(ITEMS_KEY);
			if (raw)
			{
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed))
				{
					notifyItems = parsed.filter(function (x)
					{
						return x && x.id != null && x.sender_id != null;
					});
				}
			}
		}
		catch (e)
		{
			notifyItems = [];
		}
		if (notifyItems.length === 0)
		{
			try
			{
				const legacy = parseInt(localStorage.getItem(LEGACY_COUNT_KEY) || '0', 10);
				if (!isNaN(legacy) && legacy > 0)
				{
					for (let k = 0; k < Math.min(legacy, 5); k++)
					{
						notifyItems.push({
							id: 'legacy-' + k + '-' + Date.now(),
							sender_id: 0,
							sender_display_name: 'Messages',
							preview: 'You have unread messages',
							at: Date.now() - k * 1000,
							read: false
						});
					}
					localStorage.removeItem(LEGACY_COUNT_KEY);
					persistItems();
				}
			}
			catch (e2)
			{
			}
		}
	}

	function updateBellDom()
	{
		const n = unreadCount();
		const dot = document.querySelector('.dashboard-bell-dot');
		const badge = document.getElementById('dashboard-message-notify-badge');
		const bell = document.getElementById('dashboard-notify-bell') || document.querySelector('.dashboard-bell');
		if (dot)
		{
			dot.hidden = n === 0;
		}
		if (badge)
		{
			if (n <= 0)
			{
				badge.hidden = true;
				badge.textContent = '';
			}
			else
			{
				badge.hidden = false;
				badge.textContent = n > 99 ? '99+' : String(n);
			}
		}
		if (bell)
		{
			bell.setAttribute('aria-label', n ? ('Notifications, ' + n + ' unread') : 'Notifications');
		}
	}

	function formatTimeAgo(ts)
	{
		const sec = Math.floor((Date.now() - ts) / 1000);
		if (sec < 45)
		{
			return 'Just now';
		}
		const min = Math.floor(sec / 60);
		if (min < 60)
		{
			return min + 'm';
		}
		const hr = Math.floor(min / 60);
		if (hr < 24)
		{
			return hr + 'h';
		}
		const day = Math.floor(hr / 24);
		if (day < 7)
		{
			return day + 'd';
		}
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function resolveChatUrl()
	{
		const path = window.location.pathname || '';
		const i = path.lastIndexOf('/');
		const base = i >= 0 ? path.slice(0, i + 1) : '/';
		return base + 'chat.html';
	}

	function chatUrlWithPeer(peerId)
	{
		const u = resolveChatUrl();
		if (peerId == null || peerId === 0)
		{
			return u;
		}
		return u + (u.indexOf('?') === -1 ? '?' : '&') + 'peer=' + encodeURIComponent(String(peerId));
	}

	function renderNotifyList()
	{
		const ul = document.getElementById('dashboard-notify-list');
		const emptyEl = document.getElementById('dashboard-notify-empty');
		if (!ul)
		{
			return;
		}
		ul.innerHTML = '';
		const sorted = notifyItems.slice().sort(function (a, b)
		{
			return (b.at || 0) - (a.at || 0);
		});
		if (sorted.length === 0)
		{
			if (emptyEl)
			{
				emptyEl.hidden = false;
			}
			return;
		}
		if (emptyEl)
		{
			emptyEl.hidden = true;
		}
		for (let i = 0; i < sorted.length; i++)
		{
			const it = sorted[i];
			const li = document.createElement('li');
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'dashboard-notify-item' + (it.read ? '' : ' is-unread');
			const av = document.createElement('span');
			av.className = 'dashboard-notify-item-av';
			const name = String(it.sender_display_name || 'Someone').trim() || 'Someone';
			av.textContent = (name.charAt(0) || '?').toUpperCase();
			const body = document.createElement('div');
			body.className = 'dashboard-notify-item-body';
			const top = document.createElement('div');
			top.className = 'dashboard-notify-item-top';
			const nm = document.createElement('span');
			nm.className = 'dashboard-notify-item-name';
			nm.textContent = name;
			const tm = document.createElement('span');
			tm.className = 'dashboard-notify-item-time';
			tm.textContent = formatTimeAgo(it.at || Date.now());
			top.appendChild(nm);
			top.appendChild(tm);
			const prev = document.createElement('div');
			prev.className = 'dashboard-notify-item-preview';
			prev.textContent = String(it.preview || 'New message');
			body.appendChild(top);
			body.appendChild(prev);
			btn.appendChild(av);
			btn.appendChild(body);
			const peer = parseInt(String(it.sender_id), 10);
			btn.addEventListener('click', function ()
			{
				it.read = true;
				persistItems();
				updateBellDom();
				renderNotifyList();
				window.location.href = chatUrlWithPeer(isNaN(peer) ? null : peer);
			});
			li.appendChild(btn);
			ul.appendChild(li);
		}
	}

	function setPanelOpen(open)
	{
		const panel = document.getElementById('dashboard-notify-panel');
		const bell = document.getElementById('dashboard-notify-bell') || document.querySelector('.dashboard-bell');
		if (!panel)
		{
			return;
		}
		panel.hidden = !open;
		if (bell)
		{
			bell.setAttribute('aria-expanded', open ? 'true' : 'false');
		}
		if (open)
		{
			renderNotifyList();
			try
			{
				if (typeof window.closeDashboardTopbarPopover === 'function')
				{
					window.closeDashboardTopbarPopover();
				}
			}
			catch (e)
			{
			}
		}
	}

	function togglePanel()
	{
		const panel = document.getElementById('dashboard-notify-panel');
		if (!panel)
		{
			return;
		}
		setPanelOpen(panel.hidden);
	}

	window.closeDashboardNotifyPanel = function ()
	{
		setPanelOpen(false);
	};

	function bindDocumentOnce()
	{
		if (docBound)
		{
			return;
		}
		docBound = true;
		document.addEventListener('click', function (e)
		{
			const wrap = document.querySelector('.dashboard-notify-wrap');
			if (wrap && e.target && wrap.contains(e.target))
			{
				return;
			}
			window.closeDashboardNotifyPanel();
		});
		document.addEventListener('keydown', function (e)
		{
			if (e.key === 'Escape')
			{
				window.closeDashboardNotifyPanel();
			}
		});
	}

	function previewText(msg, maxLen)
	{
		const s = String(msg || '').replace(/\s+/g, ' ').trim();
		if (!s)
		{
			return 'New message';
		}
		if (s.length > maxLen)
		{
			return s.slice(0, maxLen) + '…';
		}
		return s;
	}

	function addUnreadNotificationItem(data, playSound)
	{
		const mid = data.id;
		for (let i = 0; i < notifyItems.length; i++)
		{
			if (String(notifyItems[i].id) === String(mid))
			{
				return;
			}
		}
		const item = {
			id: mid,
			sender_id: parseInt(String(data.sender_id), 10) || 0,
			sender_display_name: String(data.sender_display_name || '').trim(),
			preview: previewText(data.message, 160),
			at: Date.now(),
			read: false
		};
		notifyItems.unshift(item);
		if (notifyItems.length > MAX_ITEMS)
		{
			notifyItems.length = MAX_ITEMS;
		}
		persistItems();
		updateBellDom();
		const panel = document.getElementById('dashboard-notify-panel');
		if (panel && !panel.hidden)
		{
			renderNotifyList();
		}
		if (playSound)
		{
			playMessageNotificationSound();
		}
	}

	window.bumpChatMessageNotification = function ()
	{
		addUnreadNotificationItem({
			id: 'bump-' + Date.now(),
			sender_id: 0,
			sender_display_name: 'Messages',
			message: 'New activity'
		}, true);
	};

	window.clearChatMessageNotifications = function ()
	{
		loadPersistedItems();
		for (let i = 0; i < notifyItems.length; i++)
		{
			notifyItems[i].read = true;
		}
		persistItems();
		try
		{
			localStorage.removeItem(LEGACY_COUNT_KEY);
		}
		catch (e)
		{
		}
		updateBellDom();
		renderNotifyList();
	};

	window.handleMessageSentForNotifications = function (data, opts)
	{
		opts = opts || {};
		if (!data || data.sender_id == null || notifyUserId == null)
		{
			return;
		}
		const sid = parseInt(String(data.sender_id), 10);
		if (isNaN(sid) || sid === notifyUserId)
		{
			return;
		}
		const activePeerId = opts.activePeerId != null ? parseInt(String(opts.activePeerId), 10) : null;
		const inActiveThread = opts.inActiveThread === true;
		const isHidden = document.visibilityState === 'hidden';
		const samePeer = activePeerId !== null && !isNaN(activePeerId) && activePeerId === sid;
		const shouldAlert = !inActiveThread || isHidden || !samePeer;
		if (shouldAlert)
		{
			addUnreadNotificationItem(data, true);
		}
		const showDesktop = typeof Notification !== 'undefined'
			&& (isHidden || !inActiveThread || !samePeer);
		if (showDesktop && Notification.permission === 'granted')
		{
			const title = String(data.sender_display_name || '').trim() || 'New message';
			const body = previewText(data.message, 140);
			try
			{
				const n = new Notification(title, { body: body, tag: 'chat-' + String(data.id) });
				n.onclick = function ()
				{
					window.focus();
					n.close();
					window.location.href = chatUrlWithPeer(sid);
				};
			}
			catch (e)
			{
			}
		}
	};

	function bindBellOnce()
	{
		if (bellBound)
		{
			return;
		}
		const bell = document.getElementById('dashboard-notify-bell') || document.querySelector('.dashboard-bell');
		if (!bell)
		{
			return;
		}
		bellBound = true;
		bindDocumentOnce();
		bell.addEventListener('click', function (e)
		{
			e.stopPropagation();
			const ctx = ensureAudioContext();
			if (ctx && ctx.state === 'suspended')
			{
				ctx.resume().catch(function () {});
			}
			togglePanel();
		});
		const markRead = document.getElementById('dashboard-notify-mark-read');
		if (markRead)
		{
			markRead.addEventListener('click', function (e)
			{
				e.stopPropagation();
				window.clearChatMessageNotifications();
			});
		}
		const seeAll = document.getElementById('dashboard-notify-see-all');
		if (seeAll)
		{
			seeAll.href = resolveChatUrl();
			seeAll.addEventListener('click', function (e)
			{
				e.stopPropagation();
			});
		}
	}

	window.initMessageNotificationsFromBootstrap = function (data)
	{
		if (!data || !data.user)
		{
			return;
		}
		const uid = parseInt(String(data.user.id), 10);
		if (isNaN(uid))
		{
			return;
		}
		notifyUserId = uid;
		armNotificationAudioUnlock();
		loadPersistedItems();
		bindBellOnce();
		const seeAll = document.getElementById('dashboard-notify-see-all');
		if (seeAll)
		{
			seeAll.href = resolveChatUrl();
		}
		requestAnimationFrame(function ()
		{
			updateBellDom();
			renderNotifyList();
		});

		if (isChatPage())
		{
			return;
		}

		const key = data.pusher_key;
		const cluster = data.pusher_cluster;
		if (!key || !cluster)
		{
			return;
		}
		if (notifyPusher || pusherConnecting)
		{
			return;
		}
		pusherConnecting = true;
		loadPusherScript(function ()
		{
			pusherConnecting = false;
			if (typeof Pusher === 'undefined' || notifyPusher)
			{
				return;
			}
			try
			{
				notifyPusher = new Pusher(key, { cluster: cluster });
				notifyChannel = notifyPusher.subscribe('chat.' + uid);
				notifyChannel.bind('message.sent', function (payload)
				{
					window.handleMessageSentForNotifications(payload, {});
				});
			}
			catch (e)
			{
				console.warn('Message notifications Pusher failed', e);
			}
		});
	};
})();
