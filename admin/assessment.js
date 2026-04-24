const sidebarHost = $('#sidebar-host');
const pageName = $('body').data('assessment-page');
const messageBox = $('#assessment-message');

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

function initTestCreatePage()
{
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
			const questionIds = ($('#test-question-ids').val() || '').split(',').map((v) => Number(v.trim())).filter((v) => v > 0);
			if (questionIds.length)
			{
				await fetch(BASE_URL_LIVE + 'tests/' + testId + '/questions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeaders(),
					},
					body: JSON.stringify({ question_ids: questionIds, user_id: Number(USER_ID) }),
				});
			}

			showAssessmentMessage('Test created successfully.', 'success');
		}
		catch (error)
		{
			showAssessmentMessage('Network error while creating test.', 'error');
		}
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
				showAssessmentMessage('Attempt started. Attempt ID: ' + resultStart.data.attempt_id, 'success');
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
