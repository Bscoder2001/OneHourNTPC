/**
 * Attachments, voice recording, camera — integrates with ChatBridge from chat.js.
 */
const ChatMedia = (function ()
{
	let bridge = null;
	let pendingFile = null;
	let mediaRecorder = null;
	let recordChunks = [];
	let recordStart = 0;
	let recordTimer = null;
	let cameraStream = null;

	function init(b)
	{
		bridge = b;
		bindComposerToolbar();
		bindDropZone();
		bindCameraModal();
		bindVoiceModal();
	}

	function bindComposerToolbar()
	{
		const attachBtn = document.getElementById('chat-attach-btn');
		const fileInput = document.getElementById('chat-file-input');
		const micBtn = document.getElementById('chat-voice-btn');
		const camBtn = document.getElementById('chat-camera-btn');
		if (attachBtn && fileInput)
		{
			attachBtn.addEventListener('click', function ()
			{
				fileInput.click();
			});
			fileInput.addEventListener('change', function ()
			{
				if (fileInput.files && fileInput.files[0])
				{
					setPendingFile(fileInput.files[0]);
				}
				fileInput.value = '';
			});
		}
		if (micBtn)
		{
			micBtn.addEventListener('click', openVoicePanel);
		}
		if (camBtn)
		{
			camBtn.addEventListener('click', openCameraModal);
		}
		const cancelPreview = document.getElementById('chat-upload-preview-cancel');
		if (cancelPreview)
		{
			cancelPreview.addEventListener('click', clearPendingFile);
		}
	}

	function bindDropZone()
	{
		const shell = document.getElementById('chat-shell');
		if (!shell)
		{
			return;
		}
		shell.addEventListener('dragover', function (e)
		{
			e.preventDefault();
			shell.classList.add('is-dragover');
		});
		shell.addEventListener('dragleave', function ()
		{
			shell.classList.remove('is-dragover');
		});
		shell.addEventListener('drop', function (e)
		{
			e.preventDefault();
			shell.classList.remove('is-dragover');
			if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0])
			{
				setPendingFile(e.dataTransfer.files[0]);
			}
		});
	}

	function setPendingFile(file)
	{
		pendingFile = file;
		const box = document.getElementById('chat-upload-preview');
		if (!box)
		{
			return;
		}
		box.hidden = false;
		const nameEl = document.getElementById('chat-upload-preview-name');
		const thumb = document.getElementById('chat-upload-preview-thumb');
		if (nameEl)
		{
			nameEl.textContent = file.name + ' (' + formatSize(file.size) + ')';
		}
		if (thumb)
		{
			thumb.innerHTML = '';
			if (file.type && file.type.indexOf('image/') === 0)
			{
				const img = document.createElement('img');
				img.src = URL.createObjectURL(file);
				thumb.appendChild(img);
			}
		}
	}

	function clearPendingFile()
	{
		pendingFile = null;
		const box = document.getElementById('chat-upload-preview');
		if (box)
		{
			box.hidden = true;
		}
	}

	function consumePendingFile()
	{
		const f = pendingFile;
		clearPendingFile();
		return f;
	}

	function formatSize(n)
	{
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

	function sendWithOptionalFile(text, replyId)
	{
		if (!bridge || !bridge.sendPayload)
		{
			return Promise.resolve();
		}
		const file = consumePendingFile();
		return bridge.sendPayload(text, replyId, file);
	}

	function openVoicePanel()
	{
		const panel = document.getElementById('chat-voice-panel');
		if (!panel)
		{
			return;
		}
		panel.hidden = false;
	}

	function bindVoiceModal()
	{
		const start = document.getElementById('chat-voice-start');
		const stop = document.getElementById('chat-voice-stop');
		const cancel = document.getElementById('chat-voice-cancel');
		const send = document.getElementById('chat-voice-send');
		const timer = document.getElementById('chat-voice-timer');
		const panel = document.getElementById('chat-voice-panel');
		if (!start)
		{
			return;
		}
		start.addEventListener('click', async function ()
		{
			try
			{
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				recordChunks = [];
				mediaRecorder = new MediaRecorder(stream);
				mediaRecorder.ondataavailable = function (e)
				{
					if (e.data.size > 0)
					{
						recordChunks.push(e.data);
					}
				};
				mediaRecorder.start();
				recordStart = Date.now();
				start.hidden = true;
				if (stop)
				{
					stop.hidden = false;
				}
				recordTimer = setInterval(function ()
				{
					const sec = Math.floor((Date.now() - recordStart) / 1000);
					if (timer)
					{
						timer.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
					}
				}, 200);
			}
			catch (e)
			{
				window.alert('Microphone access is required for voice messages.');
			}
		});
		if (stop)
		{
			stop.addEventListener('click', function ()
			{
				if (mediaRecorder && mediaRecorder.state !== 'inactive')
				{
					mediaRecorder.stop();
					mediaRecorder.stream.getTracks().forEach(function (t)
					{
						t.stop();
					});
				}
				clearInterval(recordTimer);
				stop.hidden = true;
				start.hidden = false;
				if (send)
				{
					send.hidden = false;
				}
			});
		}
		if (cancel)
		{
			cancel.addEventListener('click', function ()
			{
				recordChunks = [];
				if (panel)
				{
					panel.hidden = true;
				}
				if (send)
				{
					send.hidden = true;
				}
			});
		}
		if (send)
		{
			send.addEventListener('click', function ()
			{
				const blob = new Blob(recordChunks, { type: 'audio/webm' });
				const file = new File([blob], 'voice-' + Date.now() + '.webm', { type: 'audio/webm' });
				setPendingFile(file);
				if (panel)
				{
					panel.hidden = true;
				}
				send.hidden = true;
				if (bridge && bridge.sendPayload)
				{
					bridge.sendPayload('', bridge.getReplyId(), file);
				}
			});
		}
	}

	function bindCameraModal()
	{
		const modal = document.getElementById('chat-camera-modal');
		const video = document.getElementById('chat-camera-video');
		const snap = document.getElementById('chat-camera-capture');
		const close = document.getElementById('chat-camera-close');
		if (!modal || !video)
		{
			return;
		}
		if (close)
		{
			close.addEventListener('click', closeCameraModal);
		}
		if (snap)
		{
			snap.addEventListener('click', function ()
			{
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				canvas.getContext('2d').drawImage(video, 0, 0);
				canvas.toBlob(function (blob)
				{
					if (!blob)
					{
						return;
					}
					const file = new File([blob], 'photo-' + Date.now() + '.jpg', { type: 'image/jpeg' });
					closeCameraModal();
					if (bridge && bridge.sendPayload)
					{
						bridge.sendPayload('', bridge.getReplyId(), file);
					}
				}, 'image/jpeg', 0.92);
			});
		}
	}

	async function openCameraModal()
	{
		const modal = document.getElementById('chat-camera-modal');
		const video = document.getElementById('chat-camera-video');
		if (!modal || !video)
		{
			return;
		}
		try
		{
			cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
			video.srcObject = cameraStream;
			await video.play();
			modal.hidden = false;
		}
		catch (e)
		{
			window.alert('Camera access is required to take a photo.');
		}
	}

	function closeCameraModal()
	{
		const modal = document.getElementById('chat-camera-modal');
		if (cameraStream)
		{
			cameraStream.getTracks().forEach(function (t)
			{
				t.stop();
			});
			cameraStream = null;
		}
		if (modal)
		{
			modal.hidden = true;
		}
	}

	return {
		init: init,
		sendWithOptionalFile: sendWithOptionalFile,
		clearPendingFile: clearPendingFile
	};
})();
