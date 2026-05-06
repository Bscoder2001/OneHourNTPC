/**
 * ERP Messages — modular realtime chat (Pusher + chat_token).
 * Extensible hooks: conversation scope is 1:1 peer today; thread_id can be added later.
 */
const ChatApp = (function ()
{
	const SCROLL_NEAR_BOTTOM_PX = 110;
	const TYPING_DEBOUNCE_MS = 380;
	const TYPING_IDLE_MS = 2800;
	const DELIVER_ACK_DEBOUNCE_MS = 450;
	const ROSTER_REFRESH_MS = 120000;
	const NEAR_CHAR_WARN_RATIO = 0.92;
	const ARCHIVED_PEERS_STORAGE_KEY = 'chat_erp_archived_peers_v1';
	const DELETED_FOR_EVERYONE_LABEL = 'This message was deleted.';

	let apiBase = '';
	let pusher = null;
	let channel = null;
	let currentUserId = 0;
	let currentUserName = '';
	let activePeerId = null;
	let activePeerName = '';
	let composerMaxChars = 10000;
	let presenceTimer = null;
	let rosterRefreshTimer = null;
	let typingDebounceTimer = null;
	let typingIdleTimer = null;
	let lastTypingSent = false;
	let pendingDeliverIds = [];
	let deliverFlushTimer = null;
	let composerSending = false;
	let conversationLoadSeq = 0;
	let chatCtxMenuEl = null;
	let archivedToggleBound = false;
	let ctxEscBound = false;

	function getArchivedPeerIds()
	{
		try
		{
			const raw = localStorage.getItem(ARCHIVED_PEERS_STORAGE_KEY) || '[]';
			const arr = JSON.parse(raw);
			if (!Array.isArray(arr))
			{
				return [];
			}
			return arr.map(function (x)
			{
				return parseInt(String(x), 10);
			}).filter(function (n)
			{
				return !isNaN(n) && n > 0;
			});
		}
		catch (e)
		{
			return [];
		}
	}

	function setArchivedPeerIds(ids)
	{
		try
		{
			localStorage.setItem(ARCHIVED_PEERS_STORAGE_KEY, JSON.stringify(ids));
		}
		catch (e)
		{
		}
	}

	function unarchivePeer(peerId)
	{
		const id = parseInt(String(peerId), 10);
		if (isNaN(id))
		{
			return;
		}
		const next = getArchivedPeerIds().filter(function (x)
		{
			return x !== id;
		});
		setArchivedPeerIds(next);
	}

	function archivePeerAndMaybeClear(peerId)
	{
		const id = parseInt(String(peerId), 10);
		if (isNaN(id))
		{
			return;
		}
		const cur = getArchivedPeerIds();
		if (cur.indexOf(id) === -1)
		{
			cur.push(id);
			setArchivedPeerIds(cur);
		}
		if (activePeerId === id)
		{
			clearThreadSelection();
		}
		loadRoster();
	}

	function unarchivePeerFromUrlIfNeeded()
	{
		try
		{
			const raw = new URLSearchParams(window.location.search || '').get('peer');
			if (!raw)
			{
				return;
			}
			const pid = parseInt(raw, 10);
			if (isNaN(pid) || pid <= 0)
			{
				return;
			}
			unarchivePeer(pid);
		}
		catch (e)
		{
		}
	}

	function clearThreadSelection()
	{
		activePeerId = null;
		activePeerName = '';
		stopTyping();
		showTypingLine('', false);
		document.querySelectorAll('.chat-erp-user-row').forEach(function (el)
		{
			el.classList.remove('is-active');
		});
		const headTitle = document.getElementById('chat-thread-peer-name');
		const headSub = document.getElementById('chat-thread-peer-sub');
		if (headTitle)
		{
			headTitle.textContent = 'Select a contact';
		}
		if (headSub)
		{
			headSub.textContent = 'Choose someone from the list to start messaging.';
		}
		showEmptyThread(true);
	}

	function hideChatContextMenu()
	{
		if (chatCtxMenuEl)
		{
			chatCtxMenuEl.hidden = true;
		}
	}

	function showChatContextMenu(clientX, clientY, items)
	{
		if (!items || !items.length)
		{
			return;
		}
		hideChatContextMenu();
		if (!chatCtxMenuEl)
		{
			chatCtxMenuEl = document.createElement('div');
			chatCtxMenuEl.className = 'chat-erp-context-menu';
			chatCtxMenuEl.setAttribute('role', 'menu');
			document.body.appendChild(chatCtxMenuEl);
			document.addEventListener('click', hideChatContextMenu);
			document.addEventListener('scroll', hideChatContextMenu, true);
		}
		chatCtxMenuEl.innerHTML = '';
		for (let i = 0; i < items.length; i++)
		{
			(function (item)
			{
				const b = document.createElement('button');
				b.type = 'button';
				b.className = 'chat-erp-context-menu-item' + (item.danger ? ' chat-erp-context-menu-item--danger' : '');
				b.textContent = item.label;
				b.addEventListener('click', function (ev)
				{
					ev.stopPropagation();
					hideChatContextMenu();
					item.action();
				});
				chatCtxMenuEl.appendChild(b);
			})(items[i]);
		}
		chatCtxMenuEl.hidden = false;
		chatCtxMenuEl.style.position = 'fixed';
		const rect = chatCtxMenuEl.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;
		let left = Math.min(clientX, window.innerWidth - w - 8);
		let top = Math.min(clientY, window.innerHeight - h - 8);
		left = Math.max(8, left);
		top = Math.max(8, top);
		chatCtxMenuEl.style.left = left + 'px';
		chatCtxMenuEl.style.top = top + 'px';
	}

	function applyMessageDeletedInUi(messageId)
	{
		const row = document.querySelector('.chat-erp-msg[data-msg-id="' + messageId + '"]');
		if (!row)
		{
			return;
		}
		const body = row.querySelector('.chat-erp-msg-body');
		if (!body)
		{
			return;
		}
		body.textContent = DELETED_FOR_EVERYONE_LABEL;
		body.classList.add('chat-erp-msg-body--deleted');
	}

	async function deleteMessageForEveryoneRequest(msgId)
	{
		const id = parseInt(String(msgId), 10);
		if (isNaN(id))
		{
			return;
		}
		if (!window.confirm('Delete this message for everyone in the chat?'))
		{
			return;
		}
		try
		{
			const res = await apiFetch('api/chat/deleteMessageForEveryone', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message_id: id })
			});
			const json = await res.json().catch(function () { return null; });
			if (!res.ok)
			{
				let msg = 'Could not delete message.';
				if (json && json.errors && json.errors.message_id && json.errors.message_id[0])
				{
					msg = String(json.errors.message_id[0]);
				}
				else if (json && json.message)
				{
					msg = String(json.message);
				}
				window.alert(msg);
				return;
			}
			applyMessageDeletedInUi(id);
			loadRoster();
		}
		catch (e)
		{
			window.alert('Could not delete message.');
		}
	}

	function bindMessageContextMenu()
	{
		const wrap = document.getElementById('chat-messages');
		if (!wrap || wrap.dataset.ctxMenuBound === '1')
		{
			return;
		}
		wrap.dataset.ctxMenuBound = '1';
		if (!ctxEscBound)
		{
			ctxEscBound = true;
			document.addEventListener('keydown', function (e)
			{
				if (e.key === 'Escape')
				{
					hideChatContextMenu();
				}
			});
		}
		wrap.addEventListener('contextmenu', function (e)
		{
			const row = e.target.closest('.chat-erp-msg.is-sent');
			if (!row || row.classList.contains('is-sending'))
			{
				return;
			}
			const mid = row.dataset.msgId;
			if (!mid)
			{
				return;
			}
			e.preventDefault();
			showChatContextMenu(e.clientX, e.clientY, [
				{
					label: 'Delete for everyone',
					danger: true,
					action: function ()
					{
						deleteMessageForEveryoneRequest(mid);
					}
				}
			]);
		});
	}

	function bindArchivedToggleOnce()
	{
		if (archivedToggleBound)
		{
			return;
		}
		const t = document.getElementById('chat-archived-toggle');
		const list = document.getElementById('chat-archived-list');
		if (!t || !list)
		{
			return;
		}
		archivedToggleBound = true;
		t.addEventListener('click', function (e)
		{
			e.stopPropagation();
			const open = list.hidden;
			list.hidden = !open;
			t.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	}

	function apiFetch(path, options)
	{
		const opts = options || {};
		let chatToken = '';
		try
		{
			chatToken = localStorage.getItem('chat_token') || '';
		}
		catch (e)
		{
		}
		const headers = Object.assign({
			Accept: 'application/json',
			'X-Requested-With': 'XMLHttpRequest'
		}, opts.headers || {});
		if (chatToken !== '')
		{
			headers['Authorization'] = 'Bearer ' + chatToken;
		}

		return fetch(apiBase.replace(/\/?$/, '/') + path.replace(/^\//, ''), Object.assign({}, opts, {
			credentials: 'omit',
			headers: headers
		}));
	}

	function showAuthGate()
	{
		const gate = document.getElementById('chat-auth-gate');
		const shell = document.getElementById('chat-shell');
		const head = document.querySelector('.dashboard-page-head');
		const rosterLoad = document.getElementById('chat-roster-loading');
		const rosterList = document.getElementById('chat-user-list');
		if (gate)
		{
			gate.hidden = false;
		}
		if (shell)
		{
			shell.hidden = true;
		}
		if (head)
		{
			head.hidden = true;
		}
		if (rosterLoad)
		{
			rosterLoad.hidden = true;
		}
		if (rosterList)
		{
			rosterList.hidden = true;
		}
		const rosterErr = document.getElementById('chat-roster-error');
		if (rosterErr)
		{
			rosterErr.hidden = true;
		}
		if (typeof window.closeDashboardTopbarPopover === 'function')
		{
			window.closeDashboardTopbarPopover();
		}
	}

	function hideAuthGate()
	{
		const gate = document.getElementById('chat-auth-gate');
		const shell = document.getElementById('chat-shell');
		const head = document.querySelector('.dashboard-page-head');
		if (gate)
		{
			gate.hidden = true;
		}
		if (shell)
		{
			shell.hidden = false;
		}
		if (head)
		{
			head.hidden = false;
		}
	}

	function isNearBottom(el, thresholdPx)
	{
		if (!el)
		{
			return true;
		}
		return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
	}

	function scrollMessagesIfAppropriate(force)
	{
		const el = document.getElementById('chat-messages');
		if (!el)
		{
			return;
		}
		if (force || isNearBottom(el, SCROLL_NEAR_BOTTOM_PX))
		{
			el.scrollTo({ top: el.scrollHeight, behavior: force ? 'auto' : 'smooth' });
		}
	}

	function setComposerEnabled(on)
	{
		const input = document.getElementById('chat-composer-input');
		const btn = document.getElementById('chat-send-btn');
		if (input)
		{
			input.disabled = !on;
		}
		if (btn)
		{
			btn.disabled = !on || composerSending;
		}
	}

	function showThreadLoading(show)
	{
		const loading = document.getElementById('chat-thread-loading');
		const messages = document.getElementById('chat-messages');
		const empty = document.getElementById('chat-thread-empty');
		if (!loading || !messages)
		{
			return;
		}
		loading.hidden = !show;
		if (show)
		{
			messages.innerHTML = '';
			messages.hidden = false;
			if (empty)
			{
				empty.hidden = true;
			}
		}
		else
		{
			if (empty)
			{
				empty.hidden = activePeerId !== null;
			}
			if (activePeerId === null)
			{
				messages.hidden = true;
			}
		}
	}

	function showEmptyThread(show)
	{
		const empty = document.getElementById('chat-thread-empty');
		const messages = document.getElementById('chat-messages');
		const headTitle = document.getElementById('chat-thread-peer-name');
		const headSub = document.getElementById('chat-thread-peer-sub');
		if (empty)
		{
			empty.hidden = !show;
		}
		if (messages)
		{
			messages.hidden = show;
			if (show)
			{
				messages.innerHTML = '';
			}
		}
		if (show && headTitle)
		{
			headTitle.textContent = 'Select a contact';
		}
		if (show && headSub)
		{
			headSub.textContent = 'Choose someone from the list to start messaging.';
		}
		setComposerEnabled(!show && activePeerId !== null);
	}

	function setDeliveryFoot(foot, state)
	{
		if (!foot)
		{
			return;
		}
		foot.className = 'chat-erp-msg-foot chat-erp-delivery--' + state;
	}

	function appendBubble(isSent, text, msgId, deliveryState, bubbleOpts)
	{
		bubbleOpts = bubbleOpts || {};
		const wrap = document.getElementById('chat-messages');
		if (!wrap)
		{
			return null;
		}
		const side = isSent ? 'sent' : 'received';
		const last = wrap.lastElementChild;
		let continuation = false;
		if (last && last.classList && last.classList.contains('chat-erp-msg') && last.classList.contains('is-' + side))
		{
			continuation = true;
		}

		const row = document.createElement('div');
		row.className = 'chat-erp-msg is-' + side + (continuation ? ' is-continuation' : '');
		if (msgId != null && msgId !== '')
		{
			row.dataset.msgId = String(msgId);
		}
		if (!isSent && !continuation)
		{
			const meta = document.createElement('div');
			meta.className = 'chat-erp-msg-meta';
			meta.textContent = activePeerName || 'Contact';
			row.appendChild(meta);
		}
		else if (isSent && !continuation)
		{
			const meta = document.createElement('div');
			meta.className = 'chat-erp-msg-meta';
			meta.textContent = 'You';
			row.appendChild(meta);
		}

		const body = document.createElement('div');
		body.className = 'chat-erp-msg-body';
		if (bubbleOpts.deletedForEveryone)
		{
			body.classList.add('chat-erp-msg-body--deleted');
		}
		body.textContent = text;
		row.appendChild(body);

		if (isSent)
		{
			const foot = document.createElement('div');
			foot.className = 'chat-erp-msg-foot';
			setDeliveryFoot(foot, deliveryState || 'sending');
			row.appendChild(foot);
			if (deliveryState === 'sending')
			{
				row.classList.add('is-sending');
			}
		}

		wrap.appendChild(row);
		scrollMessagesIfAppropriate(isSent);
		return row;
	}

	function renderHistory(messages)
	{
		const wrap = document.getElementById('chat-messages');
		if (!wrap)
		{
			return;
		}
		wrap.innerHTML = '';
		for (let i = 0; i < messages.length; i++)
		{
			const m = messages[i];
			const isSent = m.sender_id === currentUserId;
			appendBubble(isSent, m.message, m.id, isSent ? 'sent' : null, {
				deletedForEveryone: !!m.deleted_for_everyone
			});
		}
		const nodes = wrap.querySelectorAll('.chat-erp-msg.is-sent .chat-erp-msg-foot');
		nodes.forEach(function (f)
		{
			setDeliveryFoot(f, 'sent');
		});
		scrollMessagesIfAppropriate(true);
	}

	function updateRosterUnread(peerId, count)
	{
		const row = document.querySelector('.chat-erp-user-row[data-user-id="' + peerId + '"]');
		if (!row)
		{
			return;
		}
		const badge = row.querySelector('.chat-erp-badge');
		if (!badge)
		{
			return;
		}
		if (count > 0)
		{
			badge.hidden = false;
			badge.textContent = count > 99 ? '99+' : String(count);
		}
		else
		{
			badge.hidden = true;
			badge.textContent = '';
		}
	}

	function bumpUnreadForPeer(peerId)
	{
		if (peerId === activePeerId)
		{
			return;
		}
		const row = document.querySelector('.chat-erp-user-row[data-user-id="' + peerId + '"]');
		if (!row)
		{
			return;
		}
		const badge = row.querySelector('.chat-erp-badge');
		let n = parseInt(badge && badge.textContent ? badge.textContent : '0', 10);
		if (isNaN(n))
		{
			n = 0;
		}
		updateRosterUnread(peerId, n + 1);
	}

	async function postMarkRead(peerId, lastMessageId)
	{
		if (!lastMessageId || lastMessageId <= 0)
		{
			return;
		}
		try
		{
			await apiFetch('api/chat/markRead', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ peer_id: peerId, last_message_id: lastMessageId })
			});
		}
		catch (e)
		{
		}
		updateRosterUnread(peerId, 0);
	}

	function flushTypingToServer(typing)
	{
		if (activePeerId === null)
		{
			return;
		}
		apiFetch('api/chat/typing', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ peer_id: activePeerId, typing: typing })
		}).catch(function () {});
		lastTypingSent = typing;
	}

	function scheduleTypingFromComposer()
	{
		if (typingDebounceTimer)
		{
			clearTimeout(typingDebounceTimer);
		}
		typingDebounceTimer = setTimeout(function ()
		{
			if (!lastTypingSent)
			{
				flushTypingToServer(true);
			}
		}, TYPING_DEBOUNCE_MS);

		if (typingIdleTimer)
		{
			clearTimeout(typingIdleTimer);
		}
		typingIdleTimer = setTimeout(function ()
		{
			if (lastTypingSent)
			{
				flushTypingToServer(false);
			}
		}, TYPING_IDLE_MS);
	}

	function stopTyping()
	{
		if (typingDebounceTimer)
		{
			clearTimeout(typingDebounceTimer);
		}
		if (typingIdleTimer)
		{
			clearTimeout(typingIdleTimer);
		}
		if (lastTypingSent)
		{
			flushTypingToServer(false);
		}
	}

	function showTypingLine(name, show)
	{
		const el = document.getElementById('chat-typing-line');
		if (!el)
		{
			return;
		}
		if (!show)
		{
			el.hidden = true;
			el.textContent = '';
			return;
		}
		el.hidden = false;
		el.textContent = name + ' is typing…';
	}

	function queueDeliverAck(ids)
	{
		for (let i = 0; i < ids.length; i++)
		{
			if (pendingDeliverIds.indexOf(ids[i]) === -1)
			{
				pendingDeliverIds.push(ids[i]);
			}
		}
		if (deliverFlushTimer)
		{
			clearTimeout(deliverFlushTimer);
		}
		deliverFlushTimer = setTimeout(flushDeliverAck, DELIVER_ACK_DEBOUNCE_MS);
	}

	function flushDeliverAck()
	{
		deliverFlushTimer = null;
		if (pendingDeliverIds.length === 0 || activePeerId === null)
		{
			pendingDeliverIds = [];
			return;
		}
		const ids = pendingDeliverIds.slice();
		pendingDeliverIds = [];
		apiFetch('api/chat/ackDelivered', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ peer_id: activePeerId, message_ids: ids })
		}).catch(function () {});
	}

	function applyDeliveredToMessages(ids)
	{
		const set = {};
		for (let i = 0; i < ids.length; i++)
		{
			set[String(ids[i])] = true;
		}
		document.querySelectorAll('.chat-erp-msg.is-sent[data-msg-id]').forEach(function (row)
		{
			const id = row.dataset.msgId;
			if (set[id])
			{
				const foot = row.querySelector('.chat-erp-msg-foot');
				setDeliveryFoot(foot, 'delivered');
				row.classList.remove('is-sending');
			}
		});
	}

	function applyReadUpTo(peerReaderId, upToId)
	{
		if (peerReaderId !== activePeerId)
		{
			return;
		}
		document.querySelectorAll('.chat-erp-msg.is-sent[data-msg-id]').forEach(function (row)
		{
			const mid = parseInt(row.dataset.msgId, 10);
			if (!isNaN(mid) && mid <= upToId)
			{
				const foot = row.querySelector('.chat-erp-msg-foot');
				setDeliveryFoot(foot, 'read');
			}
		});
	}

	function bindPusherHandlers()
	{
		channel.bind('message.sent', function (data)
		{
			if (data.sender_id === currentUserId)
			{
				return;
			}
			let inActiveThread = false;
			if (activePeerId !== null && data.sender_id === activePeerId)
			{
				if (document.querySelector('[data-msg-id="' + data.id + '"]'))
				{
					return;
				}
				inActiveThread = true;
				appendBubble(false, data.message, data.id, null);
				queueDeliverAck([data.id]);
				scrollMessagesIfAppropriate(false);
			}
			else
			{
				bumpUnreadForPeer(data.sender_id);
			}
			if (typeof window.handleMessageSentForNotifications === 'function')
			{
				window.handleMessageSentForNotifications(data, {
					inActiveThread: inActiveThread,
					activePeerId: activePeerId
				});
			}
		});

		channel.bind('user.typing', function (data)
		{
			if (data.typer_id !== activePeerId)
			{
				return;
			}
			showTypingLine(data.typer_name || 'Someone', !!data.typing);
		});

		channel.bind('messages.delivered', function (data)
		{
			const ids = data.message_ids || [];
			applyDeliveredToMessages(ids);
		});

		channel.bind('conversation.read', function (data)
		{
			applyReadUpTo(data.reader_id, data.up_to_message_id);
		});

		channel.bind('message.deleted_everyone', function (data)
		{
			const mid = data && data.message_id;
			if (mid == null)
			{
				return;
			}
			applyMessageDeletedInUi(mid);
			loadRoster();
		});
	}

	function connectPusher(key, cluster)
	{
		if (typeof Pusher === 'undefined')
		{
			console.warn('Pusher not loaded');
			return;
		}
		if (pusher)
		{
			pusher.disconnect();
			pusher = null;
			channel = null;
		}
		pusher = new Pusher(key, { cluster: cluster });
		channel = pusher.subscribe('chat.' + currentUserId);
		bindPusherHandlers();
	}

	async function bootstrap()
	{
		const res = await apiFetch('api/chat/bootstrap', { method: 'GET' });
		const json = await res.json().catch(function () { return null; });
		if (res.status === 401)
		{
			showAuthGate();
			return null;
		}
		if (!res.ok || !json || !json.data || !json.data.user)
		{
			console.error('bootstrap failed', json);
			showAuthGate();
			return null;
		}
		hideAuthGate();
		const d = json.data;
		currentUserId = d.user.id;
		currentUserName = (typeof window.resolveDashboardTopbarDisplayName === 'function'
			? window.resolveDashboardTopbarDisplayName(d.user)
			: String(d.user.name || '').trim()) || 'You';
		composerMaxChars = typeof d.composer_max_chars === 'number' ? d.composer_max_chars : 10000;
		if (typeof window.applyDashboardTopbarUser === 'function')
		{
			window.applyDashboardTopbarUser(d.user);
		}
		try
		{
			localStorage.setItem('user_id', String(d.user.id));
			if (d.user.institute_id != null)
			{
				localStorage.setItem('institute_id', String(d.user.institute_id));
			}
			if (d.user.user_type_id != null)
			{
				localStorage.setItem('user_type_id', String(d.user.user_type_id));
			}
		}
		catch (e)
		{
		}
		const ta = document.getElementById('chat-composer-input');
		if (ta)
		{
			ta.maxLength = composerMaxChars;
		}
		connectPusher(d.pusher_key, d.pusher_cluster);
		if (typeof window.clearChatMessageNotifications === 'function')
		{
			window.clearChatMessageNotifications();
		}
		return d;
	}

	function buildRosterRow(u, archivedSection)
	{
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'chat-erp-user-row' + (archivedSection ? ' is-archived-roster' : '');
		btn.dataset.userId = String(u.id);
		if (activePeerId === u.id)
		{
			btn.classList.add('is-active');
		}

		const av = document.createElement('div');
		av.className = 'chat-erp-user-av';
		av.textContent = (u.name || '?').trim().charAt(0).toUpperCase();

		const meta = document.createElement('div');
		meta.className = 'chat-erp-user-meta';

		const nameRow = document.createElement('div');
		nameRow.className = 'chat-erp-user-name-row';
		const name = document.createElement('span');
		name.className = 'chat-erp-user-name';
		name.textContent = u.name || 'Contact';
		const badge = document.createElement('span');
		badge.className = 'chat-erp-badge';
		const unread = parseInt(u.unread_count, 10) || 0;
		if (unread > 0)
		{
			badge.textContent = unread > 99 ? '99+' : String(unread);
		}
		else
		{
			badge.hidden = true;
		}
		nameRow.appendChild(name);
		nameRow.appendChild(badge);

		const preview = document.createElement('div');
		preview.className = 'chat-erp-user-preview' + (u.last_message_from_self ? ' is-from-you' : '');
		preview.textContent = u.last_message_preview || 'No messages yet';

		const line = document.createElement('div');
		line.className = 'chat-erp-user-line';
		const dot = document.createElement('span');
		dot.className = 'chat-erp-presence-dot' + (u.online ? ' is-online' : '');
		line.appendChild(dot);
		line.appendChild(document.createTextNode(u.online ? 'Online' : 'Offline'));

		meta.appendChild(nameRow);
		meta.appendChild(preview);
		meta.appendChild(line);
		btn.appendChild(av);
		btn.appendChild(meta);
		btn.addEventListener('click', function ()
		{
			selectPeer(u.id, u.name || 'Contact');
			if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
			{
				document.body.classList.add('chat-roster-collapsed');
				const t = document.getElementById('chat-mobile-roster-toggle');
				if (t)
				{
					t.setAttribute('aria-expanded', 'false');
				}
			}
		});
		btn.addEventListener('contextmenu', function (e)
		{
			e.preventDefault();
			const peerLabel = u.name || 'Contact';
			if (archivedSection)
			{
				showChatContextMenu(e.clientX, e.clientY, [
					{
						label: 'Open chat',
						action: function ()
						{
							unarchivePeer(u.id);
							loadRoster().then(function ()
							{
								selectPeer(u.id, peerLabel);
							});
						}
					}
				]);
			}
			else
			{
				showChatContextMenu(e.clientX, e.clientY, [
					{
						label: 'Close chat',
						action: function ()
						{
							archivePeerAndMaybeClear(u.id);
						}
					}
				]);
			}
		});
		return btn;
	}

	function setRosterLoadError(visible, message)
	{
		const errEl = document.getElementById('chat-roster-error');
		const msgEl = document.getElementById('chat-roster-error-msg');
		const listEl = document.getElementById('chat-user-list');
		if (msgEl)
		{
			msgEl.textContent = visible ? (message || '') : '';
		}
		if (errEl)
		{
			errEl.hidden = !visible;
		}
		if (listEl && visible)
		{
			listEl.hidden = true;
		}
	}

	function applyPeerFromUrl()
	{
		try
		{
			const q = new URLSearchParams(window.location.search || '');
			const raw = q.get('peer');
			if (!raw)
			{
				return;
			}
			const pid = parseInt(raw, 10);
			if (isNaN(pid) || pid <= 0)
			{
				return;
			}
			const row = document.querySelector('.chat-erp-user-row[data-user-id="' + pid + '"]');
			let label = 'Contact';
			if (row)
			{
				const nameEl = row.querySelector('.chat-erp-user-name');
				if (nameEl && nameEl.textContent)
				{
					label = String(nameEl.textContent).trim() || label;
				}
			}
			selectPeer(pid, label);
		}
		catch (e)
		{
		}
	}

	async function loadRoster()
	{
		const listEl = document.getElementById('chat-user-list');
		const loading = document.getElementById('chat-roster-loading');
		if (loading)
		{
			loading.hidden = false;
		}
		setRosterLoadError(false, '');
		const res = await apiFetch('api/chat/users', { method: 'GET' });
		const json = await res.json().catch(function () { return null; });
		if (loading)
		{
			loading.hidden = true;
		}
		if (!res.ok || !json || !json.data)
		{
			let hint = 'Could not load contacts. Check your connection and try again.';
			if (res.status >= 500)
			{
				hint = 'The server could not load the directory (error ' + String(res.status) + '). Please try again in a moment.';
			}
			else if (res.status === 401 || res.status === 403)
			{
				hint = 'Your session may have expired. Refresh the page or sign in again.';
			}
			setRosterLoadError(true, hint);
			return;
		}
		const users = json.data.users || [];
		if (!listEl)
		{
			return;
		}
		setRosterLoadError(false, '');
		listEl.hidden = false;
		listEl.innerHTML = '';
		const archivedSet = new Set(getArchivedPeerIds());
		const activeUsers = [];
		const archivedUsers = [];
		for (let u = 0; u < users.length; u++)
		{
			const usr = users[u];
			if (archivedSet.has(usr.id))
			{
				archivedUsers.push(usr);
			}
			else
			{
				activeUsers.push(usr);
			}
		}
		for (let i = 0; i < activeUsers.length; i++)
		{
			listEl.appendChild(buildRosterRow(activeUsers[i], false));
		}
		const archWrap = document.getElementById('chat-archived-wrap');
		const archList = document.getElementById('chat-archived-list');
		if (archWrap && archList)
		{
			bindArchivedToggleOnce();
			archList.innerHTML = '';
			if (archivedUsers.length === 0)
			{
				archWrap.hidden = true;
				archList.hidden = true;
			}
			else
			{
				archWrap.hidden = false;
				for (let j = 0; j < archivedUsers.length; j++)
				{
					archList.appendChild(buildRosterRow(archivedUsers[j], true));
				}
				const toggle = document.getElementById('chat-archived-toggle');
				const expanded = toggle && toggle.getAttribute('aria-expanded') === 'true';
				archList.hidden = !expanded;
			}
		}
		if (activePeerId !== null)
		{
			document.querySelectorAll('.chat-erp-user-row').forEach(function (el)
			{
				el.classList.toggle('is-active', String(activePeerId) === el.dataset.userId);
			});
		}
	}

	async function loadConversation(peerId)
	{
		const mySeq = ++conversationLoadSeq;
		showThreadLoading(true);
		showTypingLine('', false);
		try
		{
			const res = await apiFetch('api/chat/conversation?peer_id=' + encodeURIComponent(String(peerId)), { method: 'GET' });
			const json = await res.json().catch(function () { return null; });
			if (mySeq !== conversationLoadSeq)
			{
				return;
			}
			const wrap = document.getElementById('chat-messages');
			const empty = document.getElementById('chat-thread-empty');
			if (!wrap)
			{
				return;
			}
			wrap.innerHTML = '';
			if (empty)
			{
				empty.hidden = true;
			}
			if (!res.ok || !json || !json.data || !json.data.messages)
			{
				return;
			}
			const list = json.data.messages;
			renderHistory(list);
			let maxId = 0;
			for (let i = 0; i < list.length; i++)
			{
				if (list[i].id > maxId)
				{
					maxId = list[i].id;
				}
			}
			if (maxId > 0)
			{
				postMarkRead(peerId, maxId);
			}
			const toAck = [];
			for (let j = 0; j < list.length; j++)
			{
				if (list[j].sender_id === peerId && list[j].receiver_id === currentUserId)
				{
					toAck.push(list[j].id);
				}
			}
			if (toAck.length)
			{
				queueDeliverAck(toAck);
			}
		}
		finally
		{
			if (mySeq === conversationLoadSeq)
			{
				showThreadLoading(false);
			}
		}
	}

	function selectPeer(peerId, peerName)
	{
		activePeerId = peerId;
		activePeerName = peerName || '';
		stopTyping();
		showTypingLine('', false);
		document.querySelectorAll('.chat-erp-user-row').forEach(function (el)
		{
			el.classList.toggle('is-active', String(peerId) === el.dataset.userId);
		});
		const headTitle = document.getElementById('chat-thread-peer-name');
		const headSub = document.getElementById('chat-thread-peer-sub');
		const empty = document.getElementById('chat-thread-empty');
		const messages = document.getElementById('chat-messages');
		if (headTitle)
		{
			headTitle.textContent = peerName;
		}
		if (headSub)
		{
			headSub.textContent = 'Direct message · end-to-end realtime';
		}
		if (empty)
		{
			empty.hidden = true;
		}
		if (messages)
		{
			messages.hidden = false;
		}
		setComposerEnabled(true);
		loadConversation(peerId);
	}

	function updateCharCount()
	{
		const ta = document.getElementById('chat-composer-input');
		const cc = document.getElementById('chat-char-count');
		if (!ta || !cc)
		{
			return;
		}
		const n = ta.value.length;
		cc.textContent = n + ' / ' + composerMaxChars;
		cc.classList.remove('is-near-limit', 'is-at-limit');
		if (n >= composerMaxChars)
		{
			cc.classList.add('is-at-limit');
		}
		else if (n >= composerMaxChars * NEAR_CHAR_WARN_RATIO)
		{
			cc.classList.add('is-near-limit');
		}
	}

	function autosizeComposer()
	{
		const ta = document.getElementById('chat-composer-input');
		if (!ta)
		{
			return;
		}
		ta.style.height = 'auto';
		ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
	}

	async function sendMessage()
	{
		const ta = document.getElementById('chat-composer-input');
		if (!ta || activePeerId === null || composerSending)
		{
			return;
		}
		const text = ta.value.replace(/\r\n/g, '\n').trim();
		if (!text)
		{
			return;
		}
		if (text.length > composerMaxChars)
		{
			return;
		}
		stopTyping();
		composerSending = true;
		setComposerEnabled(true);
		const row = appendBubble(true, text, null, 'sending');
		ta.value = '';
		updateCharCount();
		autosizeComposer();

		try
		{
			const res = await apiFetch('api/chat/sendMessage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ receiver_id: activePeerId, message: text })
			});
			const json = await res.json().catch(function () { return null; });
			if (!res.ok)
			{
				console.error('send failed', json);
				if (row)
				{
					row.classList.add('is-send-failed');
					const foot = row.querySelector('.chat-erp-msg-foot');
					if (foot)
					{
						foot.className = 'chat-erp-msg-foot';
						foot.textContent = 'Failed to send · tap resend from composer';
					}
				}
				return;
			}
			const saved = json && json.data && json.data.message;
			if (saved && saved.id && row)
			{
				row.dataset.msgId = String(saved.id);
				row.classList.remove('is-sending');
				const foot = row.querySelector('.chat-erp-msg-foot');
				setDeliveryFoot(foot, 'sent');
			}
			loadRoster();
		}
		finally
		{
			composerSending = false;
			setComposerEnabled(true);
		}
	}

	function startPresenceHeartbeat()
	{
		if (presenceTimer)
		{
			clearInterval(presenceTimer);
		}
		presenceTimer = setInterval(function ()
		{
			apiFetch('api/chat/presence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			}).catch(function () {});
		}, 60000);
	}

	function startRosterRefresh()
	{
		if (rosterRefreshTimer)
		{
			clearInterval(rosterRefreshTimer);
		}
		rosterRefreshTimer = setInterval(loadRoster, ROSTER_REFRESH_MS);
	}

	function bindComposer()
	{
		const btn = document.getElementById('chat-send-btn');
		const ta = document.getElementById('chat-composer-input');
		if (btn)
		{
			btn.addEventListener('click', sendMessage);
		}
		if (ta)
		{
			ta.addEventListener('input', function ()
			{
				updateCharCount();
				autosizeComposer();
				if (ta.value.length > 0)
				{
					scheduleTypingFromComposer();
				}
			});
			ta.addEventListener('keydown', function (e)
			{
				if (e.key === 'Enter' && !e.shiftKey)
				{
					e.preventDefault();
					sendMessage();
				}
			});
		}
	}

	function bindMobileRoster()
	{
		const t = document.getElementById('chat-mobile-roster-toggle');
		if (!t)
		{
			return;
		}
		t.addEventListener('click', function ()
		{
			const collapsed = document.body.classList.toggle('chat-roster-collapsed');
			t.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
		});
	}

	function bindRosterRetry()
	{
		const b = document.getElementById('chat-roster-retry');
		if (!b)
		{
			return;
		}
		b.addEventListener('click', function ()
		{
			loadRoster();
		});
	}

	async function init()
	{
		apiBase = typeof BASE_URL_LIVE !== 'undefined' ? BASE_URL_LIVE : '';
		bindComposer();
		bindMobileRoster();
		bindRosterRetry();
		setComposerEnabled(false);
		showEmptyThread(true);
		const th = document.getElementById('chat-thread-loading');
		if (th)
		{
			th.hidden = true;
		}

		const data = await bootstrap();
		if (!data)
		{
			return;
		}

		await apiFetch('api/chat/presence', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{}'
		});

		unarchivePeerFromUrlIfNeeded();
		await loadRoster();
		applyPeerFromUrl();
		bindMessageContextMenu();
		startPresenceHeartbeat();
		startRosterRefresh();

		document.addEventListener('visibilitychange', function ()
		{
			if (document.visibilityState === 'visible')
			{
				loadRoster();
			}
		});
	}

	return {
		init: init
	};
})();

$(function ()
{
	const topbarHost = $('#topbar-host');
	const sidebarHost = $('#sidebar-host');

	function startChatApp()
	{
		if (sidebarHost.length)
		{
			sidebarHost.load('sidebar.html', function ()
			{
				if (typeof window.initSidebarNav === 'function')
				{
					window.initSidebarNav();
				}
				else if (typeof initSidebarNav === 'function')
				{
					initSidebarNav();
				}
				ChatApp.init();
			});
		}
		else
		{
			ChatApp.init();
		}
	}

	if (topbarHost.length && typeof window.loadDashboardTopbar === 'function')
	{
		window.loadDashboardTopbar('#topbar-host', function ()
		{
			const slot = document.getElementById('topbar-extra-actions');
			if (slot)
			{
				slot.innerHTML = '<button type="button" class="chat-mobile-roster-toggle btn-erp-outline" id="chat-mobile-roster-toggle" aria-expanded="true" aria-controls="chat-roster-panel">Contacts</button>';
			}
			startChatApp();
		});
	}
	else
	{
		startChatApp();
	}
});
