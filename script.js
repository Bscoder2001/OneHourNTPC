/* ==========================================
   NTPC MISSION MODE - DAY 1
   JavaScript Logic for Gamification System
   ========================================== */

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
function updateXP(xpToAdd) {
    AppState.totalXP += xpToAdd;
    
    // Ensure XP doesn't exceed target
    if (AppState.totalXP > AppState.targetXP) {
        AppState.totalXP = AppState.targetXP;
    }
    
    // Update display
    const xpDisplay = document.getElementById('xp-display');
    xpDisplay.textContent = `${AppState.totalXP} / ${AppState.targetXP}`;
    
    // Update progress bar
    const progressBar = document.getElementById('xp-bar');
    const percentage = (AppState.totalXP / AppState.targetXP) * 100;
    progressBar.style.width = `${percentage}%`;
    
    // Add celebratory effect when reaching target
    if (AppState.totalXP === AppState.targetXP) {
        celebrateCompletion();
    }
}

/**
 * Visual celebration when XP target is reached
 */
function celebrateCompletion() {
    const progressBar = document.getElementById('xp-bar');
    progressBar.style.boxShadow = '0 0 25px rgba(46, 204, 113, 0.8)';
    
    // Flash effect
    let count = 0;
    const flashInterval = setInterval(() => {
        progressBar.style.opacity = progressBar.style.opacity === '1' ? '0.6' : '1';
        count++;
        if (count > 6) {
            clearInterval(flashInterval);
            progressBar.style.opacity = '1';
        }
    }, 200);
}

// ==========================================
// SECTION A: WARM-UP LOGIC
// ==========================================

/**
 * Checks warm-up answers and calculates XP
 */
function checkWarmup() {
    // Prevent multiple submissions
    if (AppState.warmupCompleted) {
        showMessage('warmup-result', 'You already completed this section!', 'partial');
        return;
    }
    
    const inputs = [
        document.getElementById('warmup-1'),
        document.getElementById('warmup-2'),
        document.getElementById('warmup-3'),
        document.getElementById('warmup-4')
    ];
    
    let correctCount = 0;
    const answers = [];
    
    // Check each answer
    inputs.forEach((input, index) => {
        const userAnswer = input.value.trim();
        const correctAnswer = input.dataset.answer;
        answers.push(userAnswer);
        
        if (userAnswer === correctAnswer) {
            input.classList.add('correct');
            input.classList.remove('incorrect');
            correctCount++;
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
        }
        
        // Disable input after checking
        input.disabled = true;
    });
    
    // Store answers (future: send to backend)
    AppState.userAnswers.warmup = answers;
    
    // Calculate XP
    const xpEarned = correctCount * AppState.xpValues.warmup;
    updateXP(xpEarned);
    
    // Show result
    const message = `You got ${correctCount}/4 correct! Earned ${xpEarned} XP 🎯`;
    showMessage('warmup-result', message, 'success');
    
    // Mark as completed
    AppState.warmupCompleted = true;
    
    // Disable submit button
    event.target.disabled = true;
    event.target.textContent = 'Completed ✓';
}

// ==========================================
// SECTION C: PRACTICE ARENA LOGIC
// ==========================================

/**
 * Checks practice MCQ answers
 */
function checkPractice() {
    // Prevent multiple submissions
    if (AppState.practiceCompleted) {
        showMessage('practice-result', 'You already completed this section!', 'partial');
        return;
    }
    
    const questions = ['q1', 'q2', 'q3', 'q4', 'q5'];
    const correctAnswers = {
        q1: 'c',
        q2: 'c',
        q3: 'b',
        q4: 'c',
        q5: 'c'
    };
    
    let correctCount = 0;
    const answers = [];
    
    // Check each question
    questions.forEach(q => {
        const selected = document.querySelector(`input[name="${q}"]:checked`);
        const userAnswer = selected ? selected.value : null;
        answers.push(userAnswer);
        
        // Highlight correct answer
        const correctOption = document.querySelector(`.radio-option[data-answer="${correctAnswers[q]}"]`);
        if (correctOption) {
            correctOption.classList.add('show-correct');
        }
        
        // Show explanation
        const questionCard = selected ? selected.closest('.question-card') : document.querySelector(`input[name="${q}"]`).closest('.question-card');
        const explanation = questionCard.querySelector('.explanation');
        if (explanation) {
            explanation.classList.add('show');
        }
        
        // Check if correct
        if (userAnswer === correctAnswers[q]) {
            correctCount++;
        }
        
        // Disable all radio buttons for this question
        document.querySelectorAll(`input[name="${q}"]`).forEach(radio => {
            radio.disabled = true;
        });
    });
    
    // Store answers (future: send to backend)
    AppState.userAnswers.practice = answers;
    
    // Calculate XP
    const xpEarned = correctCount * AppState.xpValues.practice;
    updateXP(xpEarned);
    
    // Show result
    const message = `You got ${correctCount}/5 correct! Earned ${xpEarned} XP 💪`;
    showMessage('practice-result', message, 'success');
    
    // Mark as completed
    AppState.practiceCompleted = true;
    
    // Disable submit button
    event.target.disabled = true;
    event.target.textContent = 'Completed ✓';
}

// ==========================================
// SECTION E: BOSS FIGHT LOGIC
// ==========================================

/**
 * Checks boss fight answers (mixed MCQ and input)
 */
function checkBoss() {
    // Prevent multiple submissions
    if (AppState.bossCompleted) {
        showMessage('boss-result', 'You already defeated the boss!', 'partial');
        return;
    }
    
    let correctCount = 0;
    const answers = [];
    
    // Question 1 (MCQ)
    const boss1 = document.querySelector('input[name="boss1"]:checked');
    const boss1Answer = boss1 ? boss1.value : null;
    answers.push(boss1Answer);
    
    if (boss1Answer === 'b') {
        correctCount++;
    }
    
    // Highlight correct answer and show explanation
    const boss1Correct = document.querySelector('.boss-card:nth-of-type(1) .radio-option[data-answer="b"]');
    if (boss1Correct) boss1Correct.classList.add('show-correct');
    
    const boss1Explanation = document.querySelector('.boss-card:nth-of-type(1) .explanation');
    if (boss1Explanation) boss1Explanation.classList.add('show');
    
    // Disable radio buttons
    document.querySelectorAll('input[name="boss1"]').forEach(radio => {
        radio.disabled = true;
    });
    
    // Question 2 (Input - decimal)
    const boss2Input = document.getElementById('boss-2');
    const boss2Answer = boss2Input.value.trim();
    answers.push(boss2Answer);
    
    if (boss2Answer === '0.5' || boss2Answer === '.5') {
        correctCount++;
        boss2Input.classList.add('correct');
    } else {
        boss2Input.classList.add('incorrect');
    }
    
    boss2Input.disabled = true;
    const boss2Explanation = document.querySelector('.boss-card:nth-of-type(2) .explanation');
    if (boss2Explanation) boss2Explanation.classList.add('show');
    
    // Question 3 (MCQ)
    const boss3 = document.querySelector('input[name="boss3"]:checked');
    const boss3Answer = boss3 ? boss3.value : null;
    answers.push(boss3Answer);
    
    if (boss3Answer === 'd') {
        correctCount++;
    }
    
    const boss3Correct = document.querySelector('.boss-card:nth-of-type(3) .radio-option[data-answer="d"]');
    if (boss3Correct) boss3Correct.classList.add('show-correct');
    
    const boss3Explanation = document.querySelector('.boss-card:nth-of-type(3) .explanation');
    if (boss3Explanation) boss3Explanation.classList.add('show');
    
    document.querySelectorAll('input[name="boss3"]').forEach(radio => {
        radio.disabled = true;
    });
    
    // Question 4 (Input - number)
    const boss4Input = document.getElementById('boss-4');
    const boss4Answer = boss4Input.value.trim();
    answers.push(boss4Answer);
    
    if (boss4Answer === '35') {
        correctCount++;
        boss4Input.classList.add('correct');
    } else {
        boss4Input.classList.add('incorrect');
    }
    
    boss4Input.disabled = true;
    const boss4Explanation = document.querySelector('.boss-card:nth-of-type(4) .explanation');
    if (boss4Explanation) boss4Explanation.classList.add('show');
    
    // Question 5 (Input - number)
    const boss5Input = document.getElementById('boss-5');
    const boss5Answer = boss5Input.value.trim();
    answers.push(boss5Answer);
    
    if (boss5Answer === '1') {
        correctCount++;
        boss5Input.classList.add('correct');
    } else {
        boss5Input.classList.add('incorrect');
    }
    
    boss5Input.disabled = true;
    const boss5Explanation = document.querySelector('.boss-card:nth-of-type(5) .explanation');
    if (boss5Explanation) boss5Explanation.classList.add('show');
    
    // Store answers (future: send to backend)
    AppState.userAnswers.boss = answers;
    
    // Calculate XP
    const xpEarned = correctCount * AppState.xpValues.boss;
    updateXP(xpEarned);
    
    // Show result
    let message;
    if (correctCount === 5) {
        message = `🎉 PERFECT! Boss defeated! Earned ${xpEarned} XP!`;
    } else if (correctCount >= 3) {
        message = `💪 Good fight! ${correctCount}/5 correct. Earned ${xpEarned} XP!`;
    } else {
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
function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `result-message show ${type}`;
}

/**
 * Redirects to WhatsApp to request Day 2 unlock
 */
function requestUnlock() {
    const phoneNumber = '919051521161'; // India format
    const message = encodeURIComponent("I've completed day 1, please unlock day 2");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
}

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the app when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('NTPC Mission Mode - Day 1 Loaded');
    console.log('Current State:', AppState);
    
    // Initialize XP display
    updateXP(0);
    
    // Add event listeners for radio button selection highlighting
    document.querySelectorAll('.radio-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Remove selected class from all options in this question
            const questionName = this.name;
            document.querySelectorAll(`input[name="${questionName}"]`).forEach(r => {
                r.parentElement.classList.remove('selected');
            });
            
            // Add selected class to chosen option
            this.parentElement.classList.add('selected');
        });
    });
    
    // Smooth scroll to sections when clicking (future enhancement)
    // Can be used for navigation menu
});

// ==========================================
// FUTURE BACKEND INTEGRATION POINTS
// ==========================================

/**
 * Example function for saving progress to backend
 * To be implemented when backend is ready
 */
async function saveProgress() {
    const progressData = {
        userId: 'USER_ID', // Will come from auth system
        day: AppState.currentDay,
        xp: AppState.totalXP,
        answers: AppState.userAnswers,
        completedSections: {
            warmup: AppState.warmupCompleted,
            practice: AppState.practiceCompleted,
            boss: AppState.bossCompleted
        },
        timestamp: new Date().toISOString()
    };
    
    // Future API call
    // const response = await fetch('/api/save-progress', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(progressData)
    // });
    
    console.log('Progress to be saved:', progressData);
}

/**
 * Example function for loading user progress
 * To be implemented when backend is ready
 */
async function loadProgress(userId) {
    // Future API call
    // const response = await fetch(`/api/load-progress/${userId}`);
    // const data = await response.json();
    
    // Update AppState with loaded data
    // AppState.totalXP = data.xp;
    // AppState.warmupCompleted = data.completedSections.warmup;
    // etc.
    
    console.log('Load progress for user:', userId);
}

/**
 * Example function for checking if Day 2 should be unlocked
 * To be implemented when backend is ready
 */
function checkDayUnlock() {
    // Check if all sections are completed
    const allCompleted = AppState.warmupCompleted && 
                        AppState.practiceCompleted && 
                        AppState.bossCompleted;
    
    // Future: Check with backend if day is unlocked
    // Can implement minimum XP requirement, time-based unlocks, etc.
    
    return allCompleted;
}