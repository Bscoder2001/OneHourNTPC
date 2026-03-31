// ==========================================
// STATE MANAGEMENT
// Future-ready for backend integration
// ==========================================
const AppState = {
	currentDay: 1,
	totalXP: 0,
	targetXP: 200,
	warmupCompleted: false,
	practiceCompleted: false,
	bossCompleted: false,

	// XP values for each section
	xpValues: {
		warmup: 10,      // per question
		practice: 20,    // per question
		boss: 30         // per question
	},

	// Answers storage (future: will be sent to backend)
	userAnswers: {
		warmup: [],
		practice: [],
		boss: []
	}
};

// ==========================================
// XP MANAGEMENT SYSTEM
// ==========================================

/**
 * Updates the XP display and progress bar
 * @param {number} xpToAdd - XP points to add
 */
function updateXP(xpToAdd)
{
	AppState.totalXP += xpToAdd;

	if (AppState.totalXP > AppState.targetXP)
	{
		AppState.totalXP = AppState.targetXP;
	}

	// Update display
	const xpDisplay = $('#xp-display');
	if (xpDisplay.length > 0)
	{
		xpDisplay.text(`${AppState.totalXP} / ${AppState.targetXP} XP`);
	}

	// Update progress bar
	const progressBar = $('#xp-bar');
	const percentage = (AppState.totalXP / AppState.targetXP) * 100;
	progressBar.css('width', `${percentage}%`);

	const xpPercent = $('#xp-percent');
	if (xpPercent.length > 0)
	{
		xpPercent.text(`${Math.round(percentage)}%`);
	}

	// Add celebratory effect when reaching target
	if (AppState.totalXP === AppState.targetXP)
	{
		celebrateCompletion();
	}
}

/**
 * Visual celebration when XP target is reached
 */
function celebrateCompletion()
{
	const progressBar = $('#xp-bar');
	progressBar.css('box-shadow', '0 0 25px rgba(46, 204, 113, 0.8)');

	// Flash effect
	let count = 0;
	const flashInterval = setInterval(() => {
		progressBar.css('opacity', progressBar.css('opacity') === '1' ? '0.6' : '1');
		count++;
		if (count > 6)
		{
			clearInterval(flashInterval);
			progressBar.css('opacity', '1');
		}
	}, 200);
}

// ==========================================
// SECTION A: WARM-UP LOGIC
// ==========================================

/**
 * Checks warm-up answers and calculates XP
 */
function checkWarmup(btn)
{
	const section = $(btn).closest('.mission-section');
	const inputs = section.find('input[data-answer]');

	let correctCount = 0;
	let answers = [];

	inputs.each(function()
	{
		const userAnswer = $(this).val().trim();
		const correctAnswer = $(this).data('answer');

		answers.push(userAnswer);

		if (userAnswer === correctAnswer)
		{
			correctCount++;
			$(this).addClass('correct');
		}
		else
		{
			$(this).addClass('incorrect');
		}

		$(this).prop('disabled', true);
	});

	const xpEarned = correctCount * AppState.xpValues.warmup;
	updateXP(xpEarned);

	section.find('.result-message').text(`You got ${correctCount}/${inputs.length} correct. XP +${xpEarned}`);

	$(btn).prop('disabled', true);
	$(btn).text('Completed ✓');
}

// ==========================================
// SECTION C: PRACTICE ARENA LOGIC
// ==========================================

/**
 * Checks practice MCQ answers
 */
function checkPractice(btn)
{
	checkPracticeGeneric(btn);
}

function checkPracticeGeneric(btn)
{
	let section = null;

	if (btn)
	{
		section = $(btn).closest('.mission-section');
	}

	if (!section)
	{
		return;
	}

	let dayContainer = section.closest('.day-container');
	let dayNumber = 1;

	if (dayContainer && dayContainer.attr('id'))
	{
		let match = dayContainer.attr('id').match(/^day(\d+)-container$/);
		if (match && match[1])
		{
			dayNumber = parseInt(match[1], 10);
		}
	}

	let state = getOrCreateDayState(dayNumber);

	if (state.practiceCompleted)
	{
		let resultEl = section.find('.result-message');
		if (resultEl && resultEl.attr('id'))
		{
			showMessage(resultEl.attr('id'), 'You already completed this section!', 'partial');
		}
		return;
	}

	let questionCards = section.find('.question-card');
	let correctCount = 0;
	let totalCount = 0;
	let answers = [];

	questionCards.each(function()
	{
		let radios = $(this).find('input[type="radio"]');

		if (radios.length <= 0)
		{
			return;
		}

		totalCount++;

		let selectedRadio = $(this).find('input[type="radio"]:checked');
		let selectedLabel = null;

		if (selectedRadio.length > 0)
		{
			selectedLabel = selectedRadio.closest('.radio-option');
		}

		let correctLabel = $(this).find('.radio-option.correct-answer');

		if (correctLabel.length === 0)
		{
			correctLabel = $(this).find('.radio-option[data-answer]');
		}

		let isCorrect = false;

		if (selectedLabel && selectedLabel.hasClass('correct-answer'))
		{
			isCorrect = true;
		}

		if (!isCorrect && selectedRadio.length > 0 && correctLabel.length > 0 && !correctLabel.hasClass('correct-answer'))
		{
			let expected = correctLabel.data('answer');
			if (expected && selectedRadio.val() === expected)
			{
				isCorrect = true;
			}
		}

		if (isCorrect)
		{
			correctCount++;
		}

		if (correctLabel.length > 0)
		{
			correctLabel.addClass('show-correct');
		}

		let explanation = $(this).find('.explanation');
		if (explanation.length > 0)
		{
			explanation.addClass('show');
		}

		if (selectedRadio.length > 0)
		{
			answers.push(selectedRadio.val());
		}
		else
		{
			answers.push(null);
		}

		radios.prop('disabled', true);
	});

	state.userAnswers.practice = answers;

	let xpEarned = correctCount * AppState.xpValues.practice;
	updateXP(xpEarned);

	let resultEl = section.find('.result-message');

	if (resultEl && resultEl.attr('id'))
	{
		let message = `You got ${correctCount}/${totalCount} correct! Earned ${xpEarned} XP 💪`;
		showMessage(resultEl.attr('id'), message, 'success');
	}

	state.practiceCompleted = true;

	if (dayNumber === 1)
	{
		AppState.practiceCompleted = true;
		AppState.userAnswers.practice = answers;
	}

	if (btn)
	{
		$(btn).prop('disabled', true);
		$(btn).text('Completed ✓');
	}
}

function getOrCreateDayState(dayNumber)
{
	if (dayNumber === 1)
	{
		return AppState;
	}

	let key = 'Day' + dayNumber + 'State';

	if (!window[key])
	{
		window[key] = {
			warmupCompleted: false,
			practiceCompleted: false,
			bossCompleted: false,
			userAnswers: {
				warmup: [],
				practice: [],
				boss: []
			}
		};
	}

	return window[key];
}

// ==========================================
// SECTION E: BOSS FIGHT LOGIC
// ==========================================

/**
 * Checks boss fight answers (mixed MCQ and input)
 */
function checkBoss()
{
	// Prevent multiple submissions
	if (AppState.bossCompleted)
	{
		showMessage('boss-result', 'You already defeated the boss!', 'partial');
		return;
	}

	let correctCount = 0;
	const answers = [];

	// Question 1 (MCQ)
	const boss1 = $('input[name="boss1"]:checked');
	const boss1Answer = boss1.length > 0 ? boss1.val() : null;
	answers.push(boss1Answer);

	if (boss1Answer === 'b')
	{
		correctCount++;
	}

	// Highlight correct answer and show explanation
	const boss1Correct = $('.boss-card:nth-of-type(1) .radio-option[data-answer="b"]');
	if (boss1Correct.length > 0) boss1Correct.addClass('show-correct');

	const boss1Explanation = $('.boss-card:nth-of-type(1) .explanation');
	if (boss1Explanation.length > 0) boss1Explanation.addClass('show');

	// Disable radio buttons
	$('input[name="boss1"]').prop('disabled', true);

	// Question 2 (Input - decimal)
	const boss2Input = $('#boss-2');
	const boss2Answer = boss2Input.val().trim();
	answers.push(boss2Answer);

	if (boss2Answer === '0.5' || boss2Answer === '.5')
	{
		correctCount++;
		boss2Input.addClass('correct');
	}
	else
	{
		boss2Input.addClass('incorrect');
	}

	boss2Input.prop('disabled', true);
	const boss2Explanation = $('.boss-card:nth-of-type(2) .explanation');
	if (boss2Explanation.length > 0) boss2Explanation.addClass('show');

	// Question 3 (MCQ)
	const boss3 = $('input[name="boss3"]:checked');
	const boss3Answer = boss3.length > 0 ? boss3.val() : null;
	answers.push(boss3Answer);

	if (boss3Answer === 'd')
	{
		correctCount++;
	}

	const boss3Correct = $('.boss-card:nth-of-type(3) .radio-option[data-answer="d"]');
	if (boss3Correct.length > 0) boss3Correct.addClass('show-correct');

	const boss3Explanation = $('.boss-card:nth-of-type(3) .explanation');
	if (boss3Explanation.length > 0) boss3Explanation.addClass('show');

	$('input[name="boss3"]').prop('disabled', true);

	// Question 4 (Input - number)
	const boss4Input = $('#boss-4');
	const boss4Answer = boss4Input.val().trim();
	answers.push(boss4Answer);

	if (boss4Answer === '35')
	{
		correctCount++;
		boss4Input.addClass('correct');
	}
	else
	{
		boss4Input.addClass('incorrect');
	}

	boss4Input.prop('disabled', true);
	const boss4Explanation = $('.boss-card:nth-of-type(4) .explanation');
	if (boss4Explanation.length > 0) boss4Explanation.addClass('show');

	// Question 5 (Input - number)
	const boss5Input = $('#boss-5');
	const boss5Answer = boss5Input.val().trim();
	answers.push(boss5Answer);

	if (boss5Answer === '1')
	{
		correctCount++;
		boss5Input.addClass('correct');
	}
	else
	{
		boss5Input.addClass('incorrect');
	}

	boss5Input.prop('disabled', true);
	const boss5Explanation = $('.boss-card:nth-of-type(5) .explanation');
	if (boss5Explanation.length > 0) boss5Explanation.addClass('show');

	// Store answers (future: send to backend)
	AppState.userAnswers.boss = answers;

	// Calculate XP
	const xpEarned = correctCount * AppState.xpValues.boss;
	updateXP(xpEarned);

	// Show result
	let message;
	if (correctCount === 5)
	{
		message = `🎉 PERFECT! Boss defeated! Earned ${xpEarned} XP!`;
	}
	else if (correctCount >= 3)
	{
		message = `💪 Good fight! ${correctCount}/5 correct. Earned ${xpEarned} XP!`;
	}
	else
	{
		message = `Keep practicing! ${correctCount}/5 correct. Earned ${xpEarned} XP.`;
	}

	showMessage('boss-result', message, correctCount >= 3 ? 'success' : 'partial');

	// Mark as completed
	AppState.bossCompleted = true;

	// Disable submit button
	event.target.disabled = true;
	event.target.textContent = 'Boss Defeated ✓';
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Shows a result message with animation
 * @param {string} elementId - ID of the message container
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success/partial)
 */
function showMessage(elementId, message, type)
{
	const messageEl = $('#' + elementId);
	messageEl.text(message);
	messageEl.attr('class', `result-message show ${type}`);
}

/**
 * Redirects to WhatsApp to request Day 2 unlock
 */
function requestUnlock()
{
	const phoneNumber = '919051521161'; // India format
	const message = encodeURIComponent("I've completed day 1, please unlock day 2");
	const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

	window.open(whatsappUrl, '_blank');
}

// ==========================================
// DAY 2 STATE MANAGEMENT
// ==========================================
const Day2State = {
	warmupCompleted: false,
	practiceCompleted: false,
	bossCompleted: false,
	userAnswers: {
		warmup: [],
		practice: [],
		boss: []
	}
};

const Day3State = {
	practiceCompleted: false,
	bossCompleted: false,
	userAnswers: {
		practice: [],
		boss: []
	}
};

/**
 * Wrapper: single boss-check function for all days
 * @param {number} dayNumber - Day number (1/2/3)
 */
function checkBossFight(dayNumber, btn)
{
	checkBossGeneric(dayNumber, btn);
}


function checkBossGeneric(dayNumber, btn)
{
	let config = BossConfig[dayNumber];

	if (!config)
	{
		return;
	}

	let state = config.state();

	if (state.bossCompleted)
	{
		showMessage(config.resultId, 'You already defeated the boss!', 'partial');
		return;
	}

	let correctCount = 0;
	let answers = [];

	let section = $(config.sectionSelector);

	if (section.length === 0)
	{
		return;
	}

	let bossCards = section.find('.boss-card');

	config.questions.forEach(q => {
		let card = bossCards.eq(q.cardIndex);

		if (card.length === 0)
		{
			answers.push(null);
			return;
		}

		if (q.type === 'mcq')
		{
			let selected = $('input[name="' + q.name + '"]:checked');
			let selectedValue = null;

			if (selected.length > 0)
			{
				selectedValue = selected.val();
			}

			answers.push(selectedValue);

			if (selectedValue === q.correctValue)
			{
				correctCount++;
			}

			let correctOption = card.find(q.correctSelector);
			if (correctOption.length > 0)
			{
				correctOption.addClass('show-correct');
			}

			let explanation = card.find('.explanation');
			if (explanation.length > 0)
			{
				explanation.addClass('show');
			}

			$('input[name="' + q.name + '"]').prop('disabled', true);
		}
		else if (q.type === 'input')
		{
			let input = $('#' + q.id);

			if (input.length === 0)
			{
				answers.push(null);
				return;
			}

			let value = input.val().trim();
			answers.push(value);

			let isCorrect = false;

			q.correctValues.forEach(cv => {
				if (value === cv)
				{
					isCorrect = true;
				}
			});

			if (isCorrect)
			{
				correctCount++;
				input.addClass('correct');
			}
			else
			{
				input.addClass('incorrect');
			}

			input.prop('disabled', true);

			let explanation = card.find('.explanation');
			if (explanation.length > 0)
			{
				explanation.addClass('show');
			}
		}
	});

	state.userAnswers.boss = answers;

	let xpEarned = correctCount * AppState.xpValues.boss;
	updateXP(xpEarned);

	let message = '';
	if (correctCount === config.totalQuestions)
	{
		message = `🎉 PERFECT! Boss defeated! Earned ${xpEarned} XP!`;
	}
	else if (correctCount >= 3)
	{
		message = `💪 Good fight! ${correctCount}/${config.totalQuestions} correct. Earned ${xpEarned} XP!`;
	}
	else
	{
		message = `Keep practicing! ${correctCount}/${config.totalQuestions} correct. Earned ${xpEarned} XP.`;
	}

	if (correctCount >= 3)
	{
		showMessage(config.resultId, message, 'success');
	}
	else
	{
		showMessage(config.resultId, message, 'partial');
	}

	state.bossCompleted = true;

	if (btn)
	{
		$(btn).prop('disabled', true);
		$(btn).text(config.buttonText);
	}
}

// ==========================================
// CHATGPT INTEGRATION
// ==========================================

/**
 * Question database for ChatGPT prompts
 */
const questionDatabase = {
	// Day 2 Warmup
	'day2-warmup-1': {
		question: 'What is the HCF of 12 and 18?',
		context: 'HCF (Highest Common Factor)'
	},
	'day2-warmup-2': {
		question: 'Which of these is a living thing? Options: Rock, Tree, Water',
		context: 'Biology - Living vs Non-living'
	},

	// Day 2 Practice
	'day2-practice-q1': {
		question: 'What is the HCF of 24 and 36? Options: 6, 12, 8, 18',
		context: 'HCF calculation'
	},
	'day2-practice-q2': {
		question: 'What is the LCM of 5 and 7? Options: 12, 70, 35, 14',
		context: 'LCM with prime numbers'
	},
	'day2-practice-q3': {
		question: 'Two bells ring at intervals of 4 and 6 minutes. If they ring together now, after how many minutes will they ring together again? Options: 10, 12, 24, 2',
		context: 'LCM real-life application'
	},
	'day2-practice-q4': {
		question: 'The HCF of two numbers is 5 and their LCM is 150. If one number is 25, what is the other number? Options: 20, 30, 15, 35',
		context: 'HCF × LCM = Product formula'
	},

	// Day 2 Boss
	'day2-boss-q1': {
		question: 'Find the smallest number that is divisible by both 12 and 15',
		context: 'LCM application'
	},
	'day2-boss-q2': {
		question: 'Which of the following is NOT a characteristic of living things? Options: Respiration, Growth, Rusting, Reproduction',
		context: 'Living things characteristics'
	},
	'day2-boss-q3': {
		question: 'Three runners complete a lap in 12, 18, and 24 minutes respectively. After how many minutes will they all meet at the starting point? Options: 54, 72, 144, 36',
		context: 'LCM with three numbers'
	},
	'day2-boss-q4': {
		question: 'Which organism can make its own food? Options: Lion, Mushroom, Green plant, Bacteria',
		context: 'Autotrophs and photosynthesis'
	},
	'day2-boss-q5': {
		question: 'The product of two numbers is 360 and their HCF is 6. What is their LCM?',
		context: 'HCF × LCM formula application'
	},

	// Day 3 Warmup
	'day3-warmup-1': {
		question: 'What is 50% of 100?',
		context: 'Percentage basics (50% = half)'
	},
	'day3-warmup-2': {
		question: 'Find the next number: 2, 4, 6, 8, ?',
		context: 'Number series (add 2 each time)'
	},

	// Day 3 Practice
	'day3-practice-q1': {
		question: 'What is 25% of 200? Options: 25, 50, 75, 100',
		context: '25% = 1/4, so 200 ÷ 4 = 50'
	},
	'day3-practice-q2': {
		question: 'Convert 3/5 to percentage: Options: 30%, 50%, 60%, 35%',
		context: 'Fraction to percentage (multiply by 100)'
	},
	'day3-practice-q3': {
		question: 'If 20% of a number is 40, what is the number? Options: 80, 200, 100, 160',
		context: 'Find whole from percentage (reverse calculation)'
	},
	'day3-practice-q4': {
		question: 'What is 10% of 500? Options: 50, 100, 5, 25',
		context: '10% = 1/10, so 500 ÷ 10 = 50'
	},
	'day3-practice-q5': {
		question: '0.75 expressed as percentage is: Options: 7.5%, 75%, 0.75%, 750%',
		context: 'Decimal to percentage (×100)'
	},

	// Day 3 Boss
	'day3-boss-q1': {
		question: 'A student scored 360 marks out of 600. What is his percentage? Options: 50%, 60%, 65%, 70%',
		context: 'Percentage formula: (part/whole) × 100'
	},
	'day3-boss-q2': {
		question: 'Find the next number: 5, 10, 20, 40, ?',
		context: 'Number series (×2 each time)'
	},
	'day3-boss-q3': {
		question: 'Which is larger: 0.6 or 0.58? (Revision from Day 1)',
		context: 'Compare decimals by equal digits: 0.60 vs 0.58'
	},
	'day3-boss-q4': {
		question: 'If 30% of a number is 90, find 50% of that number:',
		context: 'Find 100% first, then calculate 50%'
	},

	// Day 4 Warmup
	'day4-warmup-1': {
		question: 'What is 10% of 250?',
		context: 'Percentage basics (10% means divide by 10)'
	},
	'day4-warmup-2': {
		question: 'Convert 0.2 into percentage:',
		context: 'Decimal to percentage (×100)'
	},

	// Day 4 Practice
	'day4-practice-q1': {
		question: 'What is 20% of 450? Options: 45, 90, 100, 75',
		context: '20% = 1/5, so 450 ÷ 5 = 90'
	},
	'day4-practice-q2': {
		question: 'If 40% of a number is 160, find the number. Options: 200, 400, 320, 160',
		context: 'Find whole from percentage (reverse calculation)'
	},
	'day4-practice-q3': {
		question: '75% of a number is 300. What is 25% of that number? Options: 75, 100, 150, 200',
		context: 'Find 100% first, then take 25% (1/4)'
	},

	// Day 4 Boss
	'day4-boss-q1': {
		question: 'A shopkeeper gives 20% discount on a ₹500 item. What is the selling price? Options: ₹350, ₹400, ₹450, ₹300',
		context: 'Discount concept (Selling Price = Marked Price − Discount)'
	},

	// Day 5 Warmup
	'day5-warmup-1': {
		question: 'What is 50% of 300?',
		context: 'Percentage basics (50% = half)'
	},
	'day5-warmup-2': {
		question: 'Find the next number: 1, 4, 9, 16, ?',
		context: 'Number series (perfect squares)'
	},

	// Day 5 Practice
	'day5-practice-q1': {
		question: 'What is 20% of 600? Options: 100, 120, 150, 200',
		context: '20% = 1/5, so 600 ÷ 5 = 120'
	},
	'day5-practice-q2': {
		question: 'Find the odd one out: 2, 4, 8, 16, 18. Options: 2, 4, 16, 18',
		context: 'Pattern recognition (powers of 2)'
	},
	'day5-practice-q3': {
		question: 'Which of the following is a non-renewable resource? Options: Wind, Solar, Coal, Water',
		context: 'General Science (renewable vs non-renewable)'
	},

	// Day 5 Boss
	'day5-boss-q1': {
		question: 'If the price of an item increases by 20%, what happens to the selling price of ₹200? Options: ₹220, ₹240, ₹250, ₹260',
		context: 'Percentage increase (New Value = Old Value + Increase)'
	},

	// Day 6 Warmup
	'day6-warmup-1': {
		question: 'What is 25% of 400?',
		context: '25% = 1/4, so divide by 4'
	},
	'day6-warmup-2': {
		question: 'Find the next number: 3, 6, 12, 24, ?',
		context: 'Number series (×2 each time)'
	},

	// Day 6 Practice
	'day6-practice-q1': {
		question: 'What is 10% of 800? Options: 40, 80, 100, 160',
		context: '10% means divide by 10'
	},
	'day6-practice-q2': {
		question: 'Find the odd one out: 5, 10, 20, 40, 45. Options: 10, 20, 40, 45',
		context: 'Pattern recognition (×2 sequence, one breaks it)'
	},
	'day6-practice-q3': {
		question: 'Which gas is essential for respiration? Options: Oxygen, Nitrogen, Carbon dioxide, Hydrogen',
		context: 'General Science (respiration basics)'
	},
	'day6-practice-q4': {
		question: 'What is 60% of 150? Options: 60, 90, 120, 75',
		context: 'Percentage calculation (60% = 0.6)'
	},

	// Day 6 Boss
	'day6-boss-q1': {
		question: 'If the cost price of an item is ₹200 and profit is 25%, what is the selling price? Options: ₹225, ₹250, ₹275, ₹300',
		context: 'Profit concept (Selling Price = Cost Price + Profit)'
	}
};

/**
 * Generates ChatGPT prompt and redirects to ChatGPT
 * @param {string} questionId - ID of the question
 */
function askChatGPT(questionId)
{
	if (window.event)
	{
		window.event.preventDefault();
	}

	const questionData = questionDatabase[questionId];

	if (!questionData)
	{
		alert('Question not found in database');
		return;
	}

	const prompt = `I am preparing for the RRB NTPC exam.
		Explain the following question in very simple terms, step by step, assuming I am weak in basics.

		Topic: ${questionData.context}

		Question:
		${questionData.question}

		Please explain:
		- Why the correct answer is correct
		- A shortcut if possible
		- How NTPC usually twists this concept
		- Give me 2-3 similar practice questions

		Use simple language and assume I'm learning from scratch.
	`;

	copyToClipboard(prompt);
	showCopyNotification();

	setTimeout(() =>
	{
		window.open('https://chat.openai.com/', '_blank');
	}, 1000);
}

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text)
{
	// Create temporary textarea
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.appendChild(textarea);

	// Select and copy
	textarea.select();
	document.execCommand('copy');

	// Remove textarea
	document.body.removeChild(textarea);
}

/**
 * Shows a notification that prompt was copied
 */
function showCopyNotification()
{
	// Create notification element
	const notification = document.createElement('div');
	notification.textContent = '✓ Prompt copied! Opening ChatGPT...';
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: linear-gradient(135deg, #10a37f, #1a7f64);
		color: white;
		padding: 15px 25px;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 10000;
		font-weight: 600;
		animation: slideIn 0.3s ease;
	`;

	document.body.appendChild(notification);

	// Remove after 3 seconds
	setTimeout(() => {
		notification.style.animation = 'slideOut 0.3s ease';
		setTimeout(() => {
			document.body.removeChild(notification);
		}, 300);
	}, 2500);
}

function requestUnlockNextDay(dayNumber)
{
	const email = 'bsubham408@gmail.com';
	const subjectText = `Request to Unlock Day ${dayNumber} - OneHourNTPC`;

	const bodyText = `Hi Team OneHourNTPC,

		I've successfully completed Day ${dayNumber - 1} of my NTPC preparation on OneHourNTPC.

		Please unlock Day ${dayNumber} for me.

		Thanks,
		A OneHourNTPC Learner
	`;

	const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1" +
		"&to=" + encodeURIComponent(email) +
		"&su=" + encodeURIComponent(subjectText) +
		"&body=" + encodeURIComponent(bodyText);

	const mailtoUrl = "mailto:" + encodeURIComponent(email) +
		"?subject=" + encodeURIComponent(subjectText) +
		"&body=" + encodeURIComponent(bodyText);

	const confirmSend = confirm(
		"Your email app will open to request unlocking the next day.\n\nDo you want to continue?"
	);

	if (!confirmSend) return;
	const win = window.open(gmailUrl, "_blank");

	if (!win)
	{
		window.location.href = mailtoUrl;
	}
}

/**
 * Updates header subtitle and day indicator
 * @param {number} dayNumber - Current day number
 */

function updateHeaderForDay(dayNumber)
{
	const subtitle = $('.subtitle');
	if (subtitle.length > 0)
	{
		subtitle.text(`Level 1 · Day ${dayNumber} of 7`);
	}

	const totalDays = 7;
	const currentDay = dayNumber;

	const dayDots = document.getElementById('day-dots');
	if (dayDots)
	{
		dayDots.innerHTML = '';
		for (let i = 1; i <= totalDays; i++)
		{
			const d = document.createElement('div');
			d.className = 'dot' + (i < currentDay ? ' done' : i === currentDay ? ' active' : '');
			dayDots.appendChild(d);
		}
	}
}

const BossConfig = {
	1: {
		state: function()
		{
			return AppState;
		},
		resultId: 'boss-result',
		sectionSelector: '#boss-section',
		totalQuestions: 5,
		buttonText: 'Boss Defeated ✓',
		questions: [
			{
				type: 'mcq',
				name: 'boss1',
				correctValue: 'b',
				cardIndex: 0,
				correctSelector: '.radio-option[data-answer="b"]'
			},
			{
				type: 'input',
				id: 'boss-2',
				correctValues: ['0.5', '.5'],
				cardIndex: 1
			},
			{
				type: 'mcq',
				name: 'boss3',
				correctValue: 'd',
				cardIndex: 2,
				correctSelector: '.radio-option[data-answer="d"]'
			},
			{
				type: 'input',
				id: 'boss-4',
				correctValues: ['35'],
				cardIndex: 3
			},
			{
				type: 'input',
				id: 'boss-5',
				correctValues: ['1'],
				cardIndex: 4
			}
		]
	},

	2: {
		state: function()
		{
			return Day2State;
		},
		resultId: 'day2-boss-result',
		sectionSelector: '#day2-boss-section',
		totalQuestions: 5,
		buttonText: 'Boss Defeated ✓',
		questions: [
			{
				type: 'input',
				id: 'day2-boss-1',
				correctValues: ['60'],
				cardIndex: 0
			},
			{
				type: 'mcq',
				name: 'day2-boss2',
				correctValue: 'c',
				cardIndex: 1,
				correctSelector: '.radio-option[data-answer="c"]'
			},
			{
				type: 'mcq',
				name: 'day2-boss3',
				correctValue: 'b',
				cardIndex: 2,
				correctSelector: '.radio-option[data-answer="b"]'
			},
			{
				type: 'mcq',
				name: 'day2-boss4',
				correctValue: 'c',
				cardIndex: 3,
				correctSelector: '.radio-option[data-answer="c"]'
			},
			{
				type: 'input',
				id: 'day2-boss-5',
				correctValues: ['60'],
				cardIndex: 4
			}
		]
	},

	3: {
		state: function()
		{
			return Day3State;
		},
		resultId: 'day3-boss-result',
		sectionSelector: '#day3-boss-section',
		totalQuestions: 4,
		buttonText: 'Boss Defeated ✓',
		questions: [
			{
				type: 'mcq',
				name: 'day3-boss1',
				correctValue: 'b',
				cardIndex: 0,
				correctSelector: '.radio-option[data-answer="b"]'
			},
			{
				type: 'input',
				id: 'day3-boss-2',
				correctValues: ['80'],
				cardIndex: 1
			},
			{
				type: 'mcq',
				name: 'day3-boss3',
				correctValue: 'a',
				cardIndex: 2,
				correctSelector: '.radio-option[data-answer="a"]'
			},
			{
				type: 'input',
				id: 'day3-boss-4',
				correctValues: ['150'],
				cardIndex: 3
			}
		]
	}
};

function goToDay(dayNumber)
{
	$('.day-container').hide();

	const targetDay = $('#day' + dayNumber + '-container');
	if (targetDay.length === 0) return;

	targetDay.show();

	AppState.currentDay = dayNumber;
	updateHeaderForDay(dayNumber);

	window.scrollTo({ top: 0, behavior: 'smooth' });
}