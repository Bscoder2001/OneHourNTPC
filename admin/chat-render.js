/**
 * Premium message rendering — attachments, replies, date separators, lazy-friendly DOM.
 */
const ChatRender = (function ()
{
	const DELETED_LABEL = 'This message was deleted.';

	function formatDateLabel(ts)
	{
		const d = new Date(ts);
		const today = new Date();
		const y = d.getFullYear();
		const m = d.getMonth();
		const day = d.getDate();
		if (y === today.getFullYear() && m === today.getMonth() && day === today.getDate())
		{
			return 'Today';
		}
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		if (y === yesterday.getFullYear() && m === yesterday.getMonth() && day === yesterday.getDate())
		{
			return 'Yesterday';
		}
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatFileSize(bytes)
	{
		const n = parseInt(String(bytes), 10) || 0;
		if (n < 1024)
		{
			return n + ' B';
		}
		if (n < 1024 * 1024)
		{
			return (n / 1024).toFixed(1) + ' KB';
		}
		return (n / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function formatAudioDuration(sec)
	{
		const s = Math.max(0, Math.floor(sec || 0));
		const m = Math.floor(s / 60);
		const r = s % 60;
		return m + ':' + String(r).padStart(2, '0');
	}

	function buildReplyQuote(replyTo, isSent)
	{
		if (!replyTo || !replyTo.id)
		{
			return null;
		}
		const q = document.createElement('button');
		q.type = 'button';
		q.className = 'chat-erp-reply-quote' + (isSent ? ' is-sent' : '');
		q.dataset.scrollToMsg = String(replyTo.id);
		const who = replyTo.sender_id === (window.__chatCurrentUserId || 0) ? 'You' : 'Contact';
		q.innerHTML = '<span class="chat-erp-reply-quote-bar"></span><span class="chat-erp-reply-quote-who">' + who + '</span><span class="chat-erp-reply-quote-text">' + (replyTo.preview || 'Message') + '</span>';
		return q;
	}

	function buildAttachmentEl(att, isSent)
	{
		const wrap = document.createElement('div');
		wrap.className = 'chat-erp-attach';
		const type = String(att.file_type || 'file');
		const url = String(att.url || '');
		const name = String(att.file_name || 'File');

		if (type === 'image')
		{
			const img = document.createElement('img');
			img.className = 'chat-erp-attach-img';
			img.src = url;
			img.alt = name;
			img.loading = 'lazy';
			img.addEventListener('click', function (e)
			{
				e.stopPropagation();
				ChatRender.openLightbox(url, name);
			});
			wrap.appendChild(img);
		}
		else if (type === 'audio')
		{
			const player = document.createElement('div');
			player.className = 'chat-erp-audio-player';
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'chat-erp-audio-play';
			btn.setAttribute('aria-label', 'Play voice message');
			btn.textContent = '▶';
			const audio = document.createElement('audio');
			audio.src = url;
			audio.preload = 'metadata';
			const dur = document.createElement('span');
			dur.className = 'chat-erp-audio-dur';
			dur.textContent = '0:00';
			audio.addEventListener('loadedmetadata', function ()
			{
				dur.textContent = formatAudioDuration(audio.duration);
			});
			btn.addEventListener('click', function ()
			{
				if (audio.paused)
				{
					document.querySelectorAll('.chat-erp-audio-player audio').forEach(function (a)
					{
						if (a !== audio)
						{
							a.pause();
						}
					});
					audio.play();
					btn.textContent = '❚❚';
				}
				else
				{
					audio.pause();
					btn.textContent = '▶';
				}
			});
			audio.addEventListener('ended', function ()
			{
				btn.textContent = '▶';
			});
			player.appendChild(btn);
			player.appendChild(dur);
			player.appendChild(audio);
			wrap.appendChild(player);
		}
		else if (type === 'video')
		{
			const vid = document.createElement('video');
			vid.className = 'chat-erp-attach-video';
			vid.src = url;
			vid.controls = true;
			vid.preload = 'metadata';
			wrap.appendChild(vid);
		}
		else
		{
			const card = document.createElement('a');
			card.className = 'chat-erp-attach-file';
			card.href = url;
			card.target = '_blank';
			card.rel = 'noopener';
			card.innerHTML = '<span class="chat-erp-attach-file-icon">📎</span><span class="chat-erp-attach-file-meta"><strong>' + name + '</strong><span>' + formatFileSize(att.file_size) + '</span></span>';
			wrap.appendChild(card);
		}
		return wrap;
	}

	function openLightbox(url, caption)
	{
		let lb = document.getElementById('chat-lightbox');
		if (!lb)
		{
			lb = document.createElement('div');
			lb.id = 'chat-lightbox';
			lb.className = 'chat-erp-lightbox';
			lb.innerHTML = '<button type="button" class="chat-erp-lightbox-close" aria-label="Close">×</button><img class="chat-erp-lightbox-img" alt=""><p class="chat-erp-lightbox-cap"></p>';
			lb.addEventListener('click', function (e)
			{
				if (e.target === lb || e.target.classList.contains('chat-erp-lightbox-close'))
				{
					lb.hidden = true;
				}
			});
			document.body.appendChild(lb);
		}
		lb.querySelector('.chat-erp-lightbox-img').src = url;
		lb.querySelector('.chat-erp-lightbox-cap').textContent = caption || '';
		lb.hidden = false;
	}

	/**
	 * @param {object} m message DTO from API
	 * @param {object} opts { isSent, peerName, continuation }
	 */
	const ICON_REPLY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v4"/><path d="M15 15l6-6-6-6"/></svg>';
	const ICON_COPY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
	const ICON_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
	const ICON_DOWNLOAD = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';

	function createMsgActionBtn(action, title, svgHtml, danger)
	{
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'chat-erp-msg-action' + (danger ? ' is-danger' : '');
		b.dataset.action = action;
		b.title = title;
		b.setAttribute('aria-label', title);
		b.innerHTML = svgHtml;
		return b;
	}

	function buildMessageActions(isSent, hasDownload, isSending, isDeleted)
	{
		const bar = document.createElement('div');
		bar.className = 'chat-erp-msg-actions';
		if (isSending)
		{
			bar.hidden = true;
			return bar;
		}
		bar.appendChild(createMsgActionBtn('reply', 'Reply', ICON_REPLY, false));
		if (!isDeleted)
		{
			bar.appendChild(createMsgActionBtn('copy', 'Copy', ICON_COPY, false));
		}
		if (hasDownload)
		{
			bar.appendChild(createMsgActionBtn('download', 'Download', ICON_DOWNLOAD, false));
		}
		if (!isDeleted)
		{
			bar.appendChild(createMsgActionBtn('delete-me', 'Delete for me', ICON_TRASH, false));
		}
		if (isSent && !isDeleted)
		{
			bar.appendChild(createMsgActionBtn('delete-everyone', 'Delete for everyone', ICON_TRASH, true));
		}
		return bar;
	}

	function buildMessageRow(m, opts)
	{
		opts = opts || {};
		const isSent = !!opts.isSent;
		const deleted = !!m.deleted_for_everyone;
		const isSending = opts.deliveryState === 'sending';
		const side = isSent ? 'sent' : 'received';

		const wrap = document.createElement('div');
		wrap.className = 'chat-erp-msg-wrap is-' + side + (opts.continuation ? ' is-continuation' : '') + (deleted ? ' is-deleted' : '') + (isSending ? ' is-sending' : '');
		if (m.id != null)
		{
			wrap.dataset.msgId = String(m.id);
		}
		if (m.message_type)
		{
			wrap.dataset.msgType = m.message_type;
		}

		const row = document.createElement('div');
		row.className = 'chat-erp-msg is-' + side + (opts.continuation ? ' is-continuation' : '');

		if (!isSent && !opts.continuation)
		{
			const meta = document.createElement('div');
			meta.className = 'chat-erp-msg-meta';
			meta.textContent = opts.peerName || 'Contact';
			row.appendChild(meta);
		}
		const replyQ = buildReplyQuote(m.reply_to, isSent);
		if (replyQ)
		{
			row.appendChild(replyQ);
		}

		const atts = m.attachments || [];
		for (let i = 0; i < atts.length; i++)
		{
			row.appendChild(buildAttachmentEl(atts[i], isSent));
		}

		const text = deleted ? DELETED_LABEL : String(m.message || '').trim();
		const attachPlaceholder = /^(attachment|file|image|audio|video)$/i.test(text);
		const showBody = text && (deleted || !(atts.length > 0 && attachPlaceholder && m.message_type !== 'text'));
		if (showBody && (m.message_type === 'text' || deleted || atts.length === 0))
		{
			const body = document.createElement('div');
			body.className = 'chat-erp-msg-body' + (deleted ? ' chat-erp-msg-body--deleted' : '');
			body.textContent = text;
			row.appendChild(body);
		}
		else if (showBody && m.message_type !== 'text' && !deleted)
		{
			const cap = document.createElement('div');
			cap.className = 'chat-erp-msg-caption';
			cap.textContent = text;
			row.appendChild(cap);
		}

		if (isSent)
		{
			const footRow = document.createElement('div');
			footRow.className = 'chat-erp-msg-foot-row';
			const foot = document.createElement('span');
			foot.className = 'chat-erp-msg-foot chat-erp-delivery--' + (opts.deliveryState || 'sent');
			footRow.appendChild(foot);
			row.appendChild(footRow);
		}

		const hasFile = atts.length > 0;
		wrap.appendChild(row);
		wrap.appendChild(buildMessageActions(isSent, hasFile, isSending, deleted));

		return wrap;
	}

	function maybeInsertDateSeparator(wrap, msgId)
	{
		/* Date separators use message id ordering as proxy when created_at unavailable */
	}

	return {
		buildMessageRow: buildMessageRow,
		buildAttachmentEl: buildAttachmentEl,
		openLightbox: openLightbox,
		formatDateLabel: formatDateLabel,
		DELETED_LABEL: DELETED_LABEL
	};
})();
