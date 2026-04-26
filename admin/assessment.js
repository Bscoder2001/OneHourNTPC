const sidebarHost = $('#sidebar-host');
const pageName = $('body').data('assessment-page');
const messageBox = $('#assessment-message');
var testBuildOrder = [];
var testBuildMap = new Map();

$(document).ready(() =>
{
	sidebarHost.load('sidebar.html', function ()
	{
		if (window.initSidebarNav)
		{
			window.initSidebarNav();
		}
	});

	if (pageName === 'question-add')
	{
		initQuestionAddPage();
	}
	else if (pageName === 'question-list')
	{
		loadQuestionList();
	}
	else if (pageName === 'test-create')
	{
		initTestCreatePage();
	}
	else if (pageName === 'test-list')
	{
		loadTestList();
	}
	else if (pageName === 'results-overview')
	{
		initResultsOverviewPage();
	}
	else if (pageName === 'attempt-take')
	{
		initAttemptTakePage();
	}
});

function showAssessmentMessage(message, type)
{
	messageBox.removeClass('success error').addClass('show').text(message);
	if (type === 'success')
	{
		messageBox.addClass('success');
	}
	else
	{
		messageBox.addClass('error');
	}
}

function authHeaders()
{
	return {
		'X-User-Id': USER_ID,
	};
}

function setSelectOptions(selector, rows, placeholder)
{
	const select = $(selector);
	select.empty();
	select.append('<option value="">' + placeholder + '</option>');

	rows.forEach((row) =>
	{
		select.append('<option value="' + row.id + '">' + escapeHtml(row.name || ('ID ' + row.id)) + '</option>');
	});
}

async function fetchTaxonomy(path)
{
	const response = await fetch(BASE_URL_LIVE + path + '&user_id=' + USER_ID, {
		headers: authHeaders(),
	});
	const result = await response.json();
	if (!result || !result.isOk)
	{
		return [];
	}

	return result.data || [];
}

async function loadCoursesDropdown()
{
	const response = await fetch(BASE_URL_LIVE + 'courses?user_id=' + USER_ID, {
		headers: authHeaders(),
	});
	const result = await response.json();
	const rows = (result && result.data) ? result.data.filter((row) => (row.status || 'active') === 'active') : [];
	setSelectOptions('#course-id', rows, 'Select course');
	setSelectOptions('#subject-id', [], 'Select subject');
	setSelectOptions('#chapter-id', [], 'Select chapter');
	setSelectOptions('#topic-id', [], 'Select topic');
}

async function initQuestionAddPage()
{
	await loadCoursesDropdown();

	$('#course-id').on('change', async function ()
	{
		const courseId = Number($(this).val());
		setSelectOptions('#subject-id', [], 'Loading subjects...');
		setSelectOptions('#chapter-id', [], 'Select chapter');
		setSelectOptions('#topic-id', [], 'Select topic');

		if (!courseId)
		{
			setSelectOptions('#subject-id', [], 'Select subject');
			return;
		}

		const rows = await fetchTaxonomy('subjects?course_id=' + courseId);
		setSelectOptions('#subject-id', rows, 'Select subject');
	});

	$('#subject-id').on('change', async function ()
	{
		const subjectId = Number($(this).val());
		setSelectOptions('#chapter-id', [], 'Loading chapters...');
		setSelectOptions('#topic-id', [], 'Select topic');

		if (!subjectId)
		{
			setSelectOptions('#chapter-id', [], 'Select chapter');
			return;
		}

		const rows = await fetchTaxonomy('chapters?subject_id=' + subjectId);
		setSelectOptions('#chapter-id', rows, 'Select chapter');
	});

	$('#chapter-id').on('change', async function ()
	{
		const chapterId = Number($(this).val());
		setSelectOptions('#topic-id', [], 'Loading topics...');

		if (!chapterId)
		{
			setSelectOptions('#topic-id', [], 'Select topic');
			return;
		}

		const rows = await fetchTaxonomy('topics?chapter_id=' + chapterId);
		setSelectOptions('#topic-id', rows, 'Select topic');
	});

	$('#question-type').on('change', function ()
	{
		const value = $(this).val();
		$('#mcq-options-wrap').toggle(value === 'mcq');
		$('#numeric-wrap').toggle(value === 'numeric');
	});

	$('#save-question-btn').on('click', async () =>
	{
		try
		{
			const courseId = Number($('#course-id').val());
			const subjectId = Number($('#subject-id').val());
			const chapterId = Number($('#chapter-id').val());
			const topicId = Number($('#topic-id').val());
			const type = $('#question-type').val();
			const questionText = $('#question-text').val().trim();

			if (!courseId || !subjectId || !chapterId || !topicId || !questionText)
			{
				showAssessmentMessage('Please select course, subject, chapter, topic and enter question.', 'error');
				return;
			}

			const payload = {
				course_id: courseId,
				subject_id: subjectId,
				chapter_id: chapterId,
				topic_id: topicId,
				question_type: type,
				question_text: questionText,
				difficulty: $('#difficulty').val(),
				user_id: Number(USER_ID),
			};

			if (type === 'mcq')
			{
				const correct = Number($('#correct-option').val());
				payload.options = [1, 2, 3, 4].map((idx) =>
				{
					return {
						option_text: $(`#option-${idx}`).val(),
						is_correct: idx === correct,
					};
				});
			}
			else
			{
				payload.correct_numeric_answer = $('#numeric-answer').val();
			}

			const response = await fetch(BASE_URL_LIVE + 'questions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders(),
				},
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (result && result.isOk)
			{
				showAssessmentMessage('Question created successfully.', 'success');
			}
			else
			{
				showAssessmentMessage((result && result.message) || 'Unable to create question.', 'error');
			}
		}
		catch (error)
		{
			showAssessmentMessage('Network error while creating question.', 'error');
		}
	});
}

async function loadQuestionList()
{
	try
	{
		const response = await fetch(BASE_URL_LIVE + 'questions?user_id=' + USER_ID, {
			headers: authHeaders(),
		});
		const result = await response.json();
		const body = $('#question-table-body');
		body.empty();
		const rows = (result && result.data && result.data.data) ? result.data.data : [];
		rows.forEach((row) =>
		{
			body.append(`<tr><td>${row.id}</td><td>${escapeHtml(row.question_text || '')}</td><td>${row.question_type || ''}</td><td>${row.difficulty || ''}</td><td><button class="secondary-btn" data-id="${row.id}" data-action="delete">Delete</button></td></tr>`);
		});
		body.find('[data-action="delete"]').on('click', async function ()
		{
			await fetch(BASE_URL_LIVE + 'questions/' + $(this).data('id') + '?user_id=' + USER_ID, {
				method: 'DELETE',
				headers: authHeaders(),
			});
			loadQuestionList();
		});
	}
	catch (error)
	{
		showAssessmentMessage('Unable to load questions.', 'error');
	}
}

function renderTestOrderedList()
{
	const ol = $('#test-question-ordered');
	ol.empty();
	testBuildOrder.forEach((qid) =>
	{
		const row = testBuildMap.get(qid);
		const preview = row && row.question_text ? String(row.question_text) : '';
		const short = preview.length > 90 ? (preview.slice(0, 90) + '…') : preview;
		const li = $('<li style="margin:0.35rem 0;"/>');
		li.append($('<span/>').text('Q' + qid + (short ? ' — ' + short : '')));
		const rm = $('<button type="button" class="secondary-btn" style="margin-left:0.5rem;"/>').text('Remove');
		rm.on('click', () =>
		{
			testBuildOrder = testBuildOrder.filter((x) => x !== qid);
			renderTestOrderedList();
		});
		li.append(rm);
		ol.append(li);
	});
}

function addQuestionToTestOrder(qid)
{
	if (testBuildOrder.indexOf(qid) >= 0)
	{
		showAssessmentMessage('That question is already in the test list.', 'error');
		return;
	}

	testBuildOrder.push(qid);
	renderTestOrderedList();
}

async function loadQuestionBankForTest()
{
	const res = await fetch(BASE_URL_LIVE + 'questions?per_page=500&user_id=' + encodeURIComponent(USER_ID), {
		headers: authHeaders(),
	});
	const result = await res.json();
	const rows = (result && result.data && result.data.data) ? result.data.data : [];
	const box = $('#test-question-bank');
	box.empty();
	testBuildMap = new Map();
	rows.forEach((row) =>
	{
		testBuildMap.set(row.id, row);
		const rowEl = $('<div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid rgba(0,0,0,0.07);"/>');
		const label = (row.question_text || '').length > 100 ? (String(row.question_text).slice(0, 100) + '…') : (row.question_text || '');
		rowEl.append($('<span style="flex:1;font-size:0.875rem;"/>').text('Q' + row.id + ' — ' + label));
		const btn = $('<button type="button" class="secondary-btn"/>').text('Add');
		btn.on('click', () =>
		{
			addQuestionToTestOrder(row.id);
		});
		rowEl.append(btn);
		box.append(rowEl);
	});
}

function initTestCreatePage()
{
	testBuildOrder = [];
	testBuildMap = new Map();
	loadQuestionBankForTest();
	renderTestOrderedList();

	$('#create-test-btn').on('click', async () =>
	{
		try
		{
			const payload = {
				title: $('#test-title').val(),
				description: $('#test-description').val(),
				duration_minutes: Number($('#test-duration').val()),
				user_id: Number(USER_ID),
			};

			const createResponse = await fetch(BASE_URL_LIVE + 'tests', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders(),
				},
				body: JSON.stringify(payload),
			});
			const createResult = await createResponse.json();

			if (!createResult || !createResult.isOk)
			{
				showAssessmentMessage((createResult && createResult.message) || 'Unable to create test.', 'error');
				return;
			}

			const testId = createResult.data.test.id;
			if (testBuildOrder.length)
			{
				const attachRes = await fetch(BASE_URL_LIVE + 'tests/' + testId + '/questions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeaders(),
					},
					body: JSON.stringify({ question_ids: testBuildOrder, user_id: Number(USER_ID) }),
				});
				const attachResult = await attachRes.json();
				if (!attachResult || !attachResult.isOk)
				{
					showAssessmentMessage((attachResult && attachResult.message) || 'Test created but attaching questions failed.', 'error');
					return;
				}
			}

			showAssessmentMessage('Test created successfully.', 'success');
		}
		catch (error)
		{
			showAssessmentMessage('Network error while creating test.', 'error');
		}
	});
}

async function saveOneAttemptAnswer(attemptId, q)
{
	const base = { question_id: q.id, user_id: Number(USER_ID) };

	if (q.question_type === 'mcq')
	{
		const v = $('input[name="q' + q.id + '"]:checked').val();
		if (!v)
		{
			showAssessmentMessage('Select an option for question ' + q.id + '.', 'error');
			return;
		}

		base.selected_option_id = Number(v);
	}
	else
	{
		const v = $('#num-ans-' + q.id).val();
		if (v === undefined || v === null)
		{
			return;
		}

		base.numeric_answer = String(v);
	}

	const res = await fetch(BASE_URL_LIVE + 'attempts/' + attemptId + '/answer', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...authHeaders(),
		},
		body: JSON.stringify(base),
	});
	const out = await res.json();
	if (out && out.isOk)
	{
		showAssessmentMessage('Answer saved for question ' + q.id + '.', 'success');
	}
	else
	{
		showAssessmentMessage((out && out.message) || 'Could not save answer.', 'error');
	}
}

function initAttemptTakePage()
{
	const p = new URLSearchParams(window.location.search);
	const attemptId = p.get('attempt');
	if (!attemptId)
	{
		showAssessmentMessage('Missing ?attempt= id in the URL. Start a test from Manage Tests.', 'error');
		return;
	}

	$('#submit-attempt-btn').on('click', async () =>
	{
		try
		{
			const res = await fetch(BASE_URL_LIVE + 'attempts/' + attemptId + '/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders(),
				},
				body: JSON.stringify({ user_id: Number(USER_ID) }),
			});
			const out = await res.json();
			if (out && out.isOk)
			{
				const s = (out.data && (out.data.score !== undefined)) ? out.data.score : '';
				const a = (out.data && (out.data.accuracy !== undefined)) ? out.data.accuracy : '';
				const c = (out.data && (out.data.correct_answers !== undefined)) ? out.data.correct_answers : '';
				const t = (out.data && (out.data.total_questions !== undefined)) ? out.data.total_questions : '';
				showAssessmentMessage('Submitted. Score: ' + s + ' | Correct: ' + c + ' / ' + t + ' | Accuracy: ' + a + '%', 'success');
			}
			else
			{
				showAssessmentMessage((out && out.message) || 'Submit failed.', 'error');
			}
		}
		catch (e)
		{
			showAssessmentMessage('Network error on submit.', 'error');
		}
	});

	fetch(BASE_URL_LIVE + 'attempts/' + attemptId + '?user_id=' + encodeURIComponent(USER_ID), { headers: authHeaders() })
		.then((r) => r.json())
		.then((result) =>
		{
			if (!result || !result.isOk)
			{
				showAssessmentMessage((result && result.message) || 'Could not load attempt.', 'error');
				return;
			}

			const data = result.data;
			if (data.submitted)
			{
				showAssessmentMessage('This attempt is already submitted.', 'error');
				return;
			}

			const questions = data.questions || [];
			const container = $('#attempt-questions');
			container.empty();
			questions.forEach((q, i) =>
			{
				const card = $('<div class="table-card table-card--erp" style="margin-bottom:1rem;padding:1rem;"/>');
				card.append($('<h3 style="font-size:0.95rem;margin:0 0 0.5rem;"/>')
					.text('Question ' + (i + 1) + (q.question_type === 'mcq' ? ' (MCQ)' : ' (numeric)')));
				card.append($('<p style="margin:0 0 0.75rem;white-space:pre-wrap;"/>').text(String(q.question_text || '')));
				if (q.question_type === 'mcq')
				{
					(q.options || []).forEach((opt) =>
					{
						const rid = 'q' + q.id + 'opt' + opt.id;
						const line = $('<div style="margin:0.25rem 0;"/>');
						const cb = $('<input type="radio"/>')
							.attr('name', 'q' + q.id)
							.attr('id', rid)
							.val(String(opt.id));
						const lab = $('<label/>').attr('for', rid).text(String(opt.option_text || ''));
						line.append(cb).append(' ').append(lab);
						card.append(line);
					});
				}
				else
				{
					card.append($('<input type="text" class="form-input" id="num-ans-' + q.id + '" placeholder="Your answer" />'));
				}

				const save = $('<button type="button" class="secondary-btn" style="margin-top:0.75rem;"/>')
					.text('Save this answer');
				save.on('click', () =>
				{
					saveOneAttemptAnswer(attemptId, q);
				});
				card.append(save);
				container.append(card);
			});
		})
		.catch(() =>
		{
			showAssessmentMessage('Could not load attempt (network).', 'error');
		});
}

async function loadTestList()
{
	try
	{
		const response = await fetch(BASE_URL_LIVE + 'tests?user_id=' + USER_ID, { headers: authHeaders() });
		const result = await response.json();
		const rows = (result && result.data && result.data.data) ? result.data.data : [];
		const body = $('#test-table-body');
		body.empty();
		rows.forEach((row) =>
		{
			body.append(`<tr><td>${row.id}</td><td>${escapeHtml(row.title || '')}</td><td>${row.duration_minutes || 0}</td><td>${row.status || ''}</td><td><button class="secondary-btn" data-id="${row.id}" data-action="start">Start Attempt</button></td></tr>`);
		});
		body.find('[data-action="start"]').on('click', async function ()
		{
			const testId = Number($(this).data('id'));
			const responseStart = await fetch(BASE_URL_LIVE + 'tests/' + testId + '/start', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders(),
				},
				body: JSON.stringify({ user_id: Number(USER_ID) }),
			});
			const resultStart = await responseStart.json();
			if (resultStart && resultStart.isOk)
			{
				const aid = resultStart.data.attempt_id;
				window.location.href = 'attempt-take.html?attempt=' + encodeURIComponent(aid);
			}
		});
	}
	catch (error)
	{
		showAssessmentMessage('Unable to load tests.', 'error');
	}
}

function initResultsOverviewPage()
{
	$('#load-results-btn').on('click', async () =>
	{
		try
		{
			const userId = Number($('#result-user-id').val() || USER_ID);
			const response = await fetch(BASE_URL_LIVE + 'results/user/' + userId + '?user_id=' + USER_ID, { headers: authHeaders() });
			const result = await response.json();
			const rows = (result && result.data) ? result.data : [];
			const body = $('#result-table-body');
			body.empty();
			rows.forEach((row) =>
			{
				body.append(`<tr><td>${row.attempt_id}</td><td>${escapeHtml(row.test_title || '')}</td><td>${row.score || 0}</td><td>${row.accuracy || 0}%</td><td>${row.submitted_at || ''}</td></tr>`);
			});
		}
		catch (error)
		{
			showAssessmentMessage('Unable to load results.', 'error');
		}
	});
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
