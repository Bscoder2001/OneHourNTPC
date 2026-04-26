const msg = $('#syllabus-message');

function showSyllabusMessage(text, type)
{
	msg.removeClass('success error').addClass('show').text(text);
	msg.addClass(type === 'success' ? 'success' : 'error');
}

function authHeaders()
{
	return {
		'Content-Type': 'application/json',
		'X-User-Id': USER_ID,
	};
}

async function fetchJson(path, options)
{
	const res = await fetch(BASE_URL_LIVE + path, options);
	return res.json();
}

async function loadCourseOptions()
{
	const res = await fetch(BASE_URL_LIVE + 'courses?user_id=' + encodeURIComponent(USER_ID), {
		headers: { 'X-User-Id': USER_ID },
	});
	const result = await res.json();
	const rows = (result && result.data) ? result.data : [];
	const active = rows.filter((r) => (r.status || 'active') === 'active');

	['#syllabus-subject-course', '#syllabus-chapter-course', '#syllabus-topic-course'].forEach((sel) =>
	{
		const $s = $(sel);
		$s.empty();
		$s.append('<option value="">Select course</option>');
		active.forEach((r) =>
		{
			$s.append('<option value="' + r.id + '">' + String(r.name || '').replace(/</g, '') + '</option>');
		});
	});
}

async function getSubjects(courseId)
{
	if (!courseId)
	{
		return [];
	}

	const res = await fetch(BASE_URL_LIVE + 'subjects?course_id=' + encodeURIComponent(courseId) + '&user_id=' + encodeURIComponent(USER_ID), {
		headers: { 'X-User-Id': USER_ID },
	});
	const result = await res.json();

	return (result && result.data) ? result.data : [];
}

async function getChapters(subjectId)
{
	if (!subjectId)
	{
		return [];
	}

	const res = await fetch(BASE_URL_LIVE + 'chapters?subject_id=' + encodeURIComponent(subjectId) + '&user_id=' + encodeURIComponent(USER_ID), {
		headers: { 'X-User-Id': USER_ID },
	});
	const result = await res.json();

	return (result && result.data) ? result.data : [];
}

async function getTopics(chapterId)
{
	if (!chapterId)
	{
		return [];
	}

	const res = await fetch(BASE_URL_LIVE + 'topics?chapter_id=' + encodeURIComponent(chapterId) + '&user_id=' + encodeURIComponent(USER_ID), {
		headers: { 'X-User-Id': USER_ID },
	});
	const result = await res.json();

	return (result && result.data) ? result.data : [];
}

function fillSelect($sel, rows, placeholder)
{
	$sel.empty();
	$sel.append('<option value="">' + placeholder + '</option>');
	rows.forEach((r) =>
	{
		$sel.append('<option value="' + r.id + '">' + String(r.name || '').replace(/</g, '') + '</option>');
	});
}

$(document).ready(() =>
{
	$('#sidebar-host').load('sidebar.html', function ()
	{
		if (typeof window.initSidebarNav === 'function')
		{
			window.initSidebarNav();
		}
	});

	loadCourseOptions().then(() =>
	{
		const c1 = Number($('#syllabus-subject-course').val());
		if (c1)
		{
			refreshSubjectTable(c1);
		}
	});

	$('#syllabus-subject-course').on('change', function ()
	{
		refreshSubjectTable(Number($(this).val()));
	});

	$('#syllabus-chapter-course').on('change', async function ()
	{
		const cid = Number($(this).val());
		const subs = await getSubjects(cid);
		fillSelect($('#syllabus-chapter-subject'), subs, 'Select subject');
		$('#syllabus-chapter-tbody').empty();
	});

	$('#syllabus-chapter-subject').on('change', async function ()
	{
		refreshChapterTable(Number($(this).val()));
	});

	$('#syllabus-topic-course').on('change', async function ()
	{
		const cid = Number($(this).val());
		const subs = await getSubjects(cid);
		fillSelect($('#syllabus-topic-subject'), subs, 'Select subject');
		fillSelect($('#syllabus-topic-chapter'), [], 'Select chapter');
		$('#syllabus-topic-tbody').empty();
	});

	$('#syllabus-topic-subject').on('change', async function ()
	{
		const sid = Number($(this).val());
		const chs = await getChapters(sid);
		fillSelect($('#syllabus-topic-chapter'), chs, 'Select chapter');
		$('#syllabus-topic-tbody').empty();
	});

	$('#syllabus-topic-chapter').on('change', function ()
	{
		refreshTopicTable(Number($(this).val()));
	});

	$('#syllabus-subject-add').on('click', async () =>
	{
		const courseId = Number($('#syllabus-subject-course').val());
		const name = $('#syllabus-subject-name').val().trim();

		if (!courseId || !name)
		{
			showSyllabusMessage('Select a course and enter a subject name.', 'error');
			return;
		}

		const result = await fetchJson('subjects', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ course_id: courseId, name: name, user_id: Number(USER_ID) }),
		});

		if (result && result.isOk)
		{
			showSyllabusMessage('Subject created.', 'success');
			$('#syllabus-subject-name').val('');
			refreshSubjectTable(courseId);
		}
		else
		{
			showSyllabusMessage((result && result.message) || 'Could not create subject.', 'error');
		}
	});

	$('#syllabus-chapter-add').on('click', async () =>
	{
		const subjectId = Number($('#syllabus-chapter-subject').val());
		const name = $('#syllabus-chapter-name').val().trim();

		if (!subjectId || !name)
		{
			showSyllabusMessage('Select a subject and enter a chapter name.', 'error');
			return;
		}

		const result = await fetchJson('chapters', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ subject_id: subjectId, name: name, user_id: Number(USER_ID) }),
		});

		if (result && result.isOk)
		{
			showSyllabusMessage('Chapter created.', 'success');
			$('#syllabus-chapter-name').val('');
			refreshChapterTable(subjectId);
		}
		else
		{
			showSyllabusMessage((result && result.message) || 'Could not create chapter.', 'error');
		}
	});

	$('#syllabus-topic-add').on('click', async () =>
	{
		const chapterId = Number($('#syllabus-topic-chapter').val());
		const name = $('#syllabus-topic-name').val().trim();

		if (!chapterId || !name)
		{
			showSyllabusMessage('Select a chapter and enter a topic name.', 'error');
			return;
		}

		const result = await fetchJson('topics', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ chapter_id: chapterId, name: name, user_id: Number(USER_ID) }),
		});

		if (result && result.isOk)
		{
			showSyllabusMessage('Topic created.', 'success');
			$('#syllabus-topic-name').val('');
			refreshTopicTable(chapterId);
		}
		else
		{
			showSyllabusMessage((result && result.message) || 'Could not create topic.', 'error');
		}
	});
});

async function refreshSubjectTable(courseId)
{
	const body = $('#syllabus-subject-tbody');
	body.empty();

	if (!courseId)
	{
		return;
	}

	const rows = await getSubjects(courseId);
	rows.forEach((r) =>
	{
		body.append('<tr><td>' + r.id + '</td><td>' + String(r.name || '').replace(/</g, '') + '</td></tr>');
	});
}

async function refreshChapterTable(subjectId)
{
	const body = $('#syllabus-chapter-tbody');
	body.empty();

	if (!subjectId)
	{
		return;
	}

	const rows = await getChapters(subjectId);
	rows.forEach((r) =>
	{
		body.append('<tr><td>' + r.id + '</td><td>' + String(r.name || '').replace(/</g, '') + '</td></tr>');
	});
}

async function refreshTopicTable(chapterId)
{
	const body = $('#syllabus-topic-tbody');
	body.empty();

	if (!chapterId)
	{
		return;
	}

	const rows = await getTopics(chapterId);
	rows.forEach((r) =>
	{
		body.append('<tr><td>' + r.id + '</td><td>' + String(r.name || '').replace(/</g, '') + '</td></tr>');
	});
}
