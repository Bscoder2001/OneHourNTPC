// ===============================
// DAY 7 – NTPC MOCK EXAM LOGIC
// ===============================

const READING_TIME = 5 * 60;   // 5 minutes
const EXAM_TIME = 30 * 60;    // 30 minutes

let readingTimer = READING_TIME;
let examTimer = EXAM_TIME;
let phase = "reading"; // reading | exam | finished

let timerInterval;

// Start automatically when Day 7 opens
$(document).ready(() =>
{
	disableAllOptions();
	startReadingTimer();
});

// -------------------------------
// TIMER DISPLAY
// -------------------------------
function updateTimerDisplay(text)
{
	$("#exam-timer").text(text);
}

function formatTime(sec)
{
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

// -------------------------------
// READING TIME
// -------------------------------
function startReadingTimer()
{
	updateTimerDisplay(`📖 Reading Time Left: ${formatTime(readingTimer)}`);

	timerInterval = setInterval(() =>
	{
		readingTimer--;
		updateTimerDisplay(`📖 Reading Time Left: ${formatTime(readingTimer)}`);

		if (readingTimer <= 0)
		{
			clearInterval(timerInterval);
			startExamTimer();
		}
	}, 1000);
}

// -------------------------------
// EXAM TIME
// -------------------------------
function startExamTimer()
{
	phase = "exam";
	enableAllOptions();
	updateTimerDisplay(`📝 Exam Time Left: ${formatTime(examTimer)}`);

	timerInterval = setInterval(() =>
	{
		examTimer--;
		updateTimerDisplay(`📝 Exam Time Left: ${formatTime(examTimer)}`);

		if (examTimer <= 0)
		{
			clearInterval(timerInterval);
			finishExam();
		}
	}, 1000);
}

// -------------------------------
// FINISH EXAM
// -------------------------------
function finishExam()
{
	phase = "finished";
	disableAllOptions();
	updateTimerDisplay("⛔ Time Over – Exam Submitted");

	checkBossFight(7); // your existing result function
}

// -------------------------------
// OPTION CONTROL
// -------------------------------
function disableAllOptions()
{
	$("#day7-mock-form input[type='radio']").prop('disabled', true);
}

function enableAllOptions()
{
	$("#day7-mock-form input[type='radio']").each(function()
	{
		$(this).prop('disabled', false);
		lockAfterSelect($(this));
	});
}

// -------------------------------
// ONE-TIME ATTEMPT LOGIC
// -------------------------------
function lockAfterSelect(input)
{
	input.on("change", function()
	{
		if (phase !== "exam") return;

		const groupName = $(this).attr('name');
		$(`input[name="${groupName}"]`).prop('disabled', true);
	});
}
