// --- Testattempt.js ---

// Ensure this script is included AFTER the specific test data variables are defined in the HTML.
// EXPECTED GLOBAL VARIABLES defined in HTML before this script:
// - testData (Array of question objects)
// - CURRENT_TEST_NAME (String, e.g., "JEE Main 8 April S2")
// - RESULT_PAGE_URL (String, e.g., "JM8aprilS2result.html")
// - TEST_DURATION_MINUTES (Number, e.g., 180)

document.addEventListener('DOMContentLoaded', () => {
    // --- Validate required global variables ---
    if (typeof testData === 'undefined' || !Array.isArray(testData)) {
        console.error("FATAL: 'testData' array is not defined globally in the HTML before Testattempt.js.");
        alert("Error: Test configuration is missing. Cannot load test.");
        return;
    }
    if (typeof CURRENT_TEST_NAME === 'undefined' || typeof CURRENT_TEST_NAME !== 'string') {
        console.error("FATAL: 'CURRENT_TEST_NAME' string is not defined globally in the HTML before Testattempt.js.");
        alert("Error: Test configuration is missing. Cannot load test.");
        return;
    }
    if (typeof RESULT_PAGE_URL === 'undefined' || typeof RESULT_PAGE_URL !== 'string') {
        console.error("FATAL: 'RESULT_PAGE_URL' string is not defined globally in the HTML before Testattempt.js.");
        alert("Error: Test configuration is missing. Cannot load test.");
        return;
    }
     if (typeof TEST_DURATION_MINUTES === 'undefined' || typeof TEST_DURATION_MINUTES !== 'number') {
        console.warn("'TEST_DURATION_MINUTES' is not defined globally in the HTML. Defaulting to 180 minutes.");
        window.TEST_DURATION_MINUTES = 180; // Set default if missing
    }


    // --- State Variables ---
    let currentSection = testData.length > 0 ? testData[0].section : null; // Initial section from first question
    let currentQuestionIndex = 0; // Index within the *filtered* section's questions
    let timeLeft = window.TEST_DURATION_MINUTES * 60; // Use duration from HTML
    let timerInterval = null;
    let testSubmitted = false;

    // --- DOM Elements ---
    // (Assume elements with these IDs/classes exist in the HTML)
    const sectionNav = document.querySelector('.section-nav');
    const timerEl = document.getElementById('timer');
    const currentSectionNameEl = document.getElementById('current-section-name');
    const paletteSectionNameEl = document.getElementById('palette-section-name');
    const questionNumberEl = document.getElementById('question-number');
    const questionTextEl = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionPalette = document.getElementById('question-palette');
    const markReviewBtn = document.getElementById('mark-review-btn');
    const clearResponseBtn = document.getElementById('clear-response-btn');
    const saveNextBtn = document.getElementById('save-next-btn');
    const submitTestBtn = document.getElementById('submit-test-btn');
    const summaryOverlay = document.getElementById('summary-overlay');
    const summaryTableBody = document.querySelector('#summary-table tbody');
    const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    const cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    const testTitleElement = document.querySelector('.header-left h1'); // For displaying test name

    // --- Marking Scheme (Could also be made configurable via HTML variable) ---
    const MARKING_SCHEME = {
        mcq: { correct: 4, incorrect: -1, unattempted: 0 },
        integer: { correct: 4, incorrect: 0, unattempted: 0 }
    };

    // --- Core Functions (Mostly same as previous script) ---

    const sections = [...new Set(testData.map(q => q.section))];

    function getSectionQuestions() {
        if (!currentSection) return [];
        return testData.filter(q => q.section === currentSection);
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updateTimer() {
        timerEl.textContent = formatTime(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (!testSubmitted) {
                 alert("Time's up! The test will be submitted automatically.");
                 submitTest();
            }
        }
        if (!testSubmitted && timeLeft > 0) {
             timeLeft--;
        }
    }

    function renderSectionTabs() {
        sectionNav.innerHTML = '';
        sections.forEach(section => {
            const tab = document.createElement('button');
            tab.classList.add('section-tab');
            tab.textContent = section; // Keep it simple
            tab.dataset.section = section;
            if (section === currentSection) {
                tab.classList.add('active');
            }
            tab.addEventListener('click', () => switchSection(section));
            sectionNav.appendChild(tab);
        });
    }

    function switchSection(sectionName) {
        if (testSubmitted || sectionName === currentSection) return;
        handleLeavingQuestion();
        currentSection = sectionName;
        currentQuestionIndex = 0;
        renderSectionTabs();
        renderQuestionPalette();
        loadQuestion(currentQuestionIndex);
    }

    function handleLeavingQuestion() {
        const questions = getSectionQuestions();
        if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
            const currentQ = questions[currentQuestionIndex];
            // Also save the answer from the DOM just before leaving
            if(currentQ) {
                currentQ.userAnswer = getSelectedAnswer();
                if (currentQ.status === 'not-visited') {
                     updatePaletteButtonByIndex(currentQuestionIndex, 'not-answered');
                }
            }
        }
    }

    function renderQuestionPalette() {
        questionPalette.innerHTML = '';
        paletteSectionNameEl.textContent = currentSection || 'Palette';
        const questions = getSectionQuestions();
        questions.forEach((q, index) => {
            const btn = document.createElement('button');
            btn.classList.add('q-btn');
            btn.textContent = index + 1;
            btn.dataset.index = index;
            btn.dataset.id = q.id;
            updatePaletteButtonClass(btn, q.status);
            if (index === currentQuestionIndex) {
                btn.classList.add('active-question');
            }
            btn.addEventListener('click', () => jumpToQuestion(index));
            questionPalette.appendChild(btn);
        });
    }

    function updatePaletteButtonClass(buttonElement, status) {
        if(!buttonElement) return;
        buttonElement.className = 'q-btn'; // Reset classes except base
        switch (status) {
            case 'answered': buttonElement.classList.add('answered'); break;
            case 'marked-review': buttonElement.classList.add('marked-review'); break;
            case 'answered-marked-review': buttonElement.classList.add('answered-marked-review'); break;
            case 'not-answered': buttonElement.classList.add('not-answered'); break;
            case 'not-visited': default: buttonElement.classList.add('not-visited'); break;
        }
        // Re-add active state if it's the current question
        const isActive = parseInt(buttonElement.dataset.index, 10) === currentQuestionIndex;
         if(isActive) {
             buttonElement.classList.add('active-question');
         }
    }

    function updatePaletteButtonByIndex(index, status) {
        const questions = getSectionQuestions();
        const btn = questionPalette.querySelector(`.q-btn[data-index="${index}"]`);
        if (btn && index >= 0 && index < questions.length) {
            const question = questions[index];
             if(question) {
                question.status = status; // Update status in the main testData array
                updatePaletteButtonClass(btn, status);
             }
        }
    }

    function loadQuestion(index) {
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (!questions || index < 0 || index >= questions.length) {
             console.error("Attempted to load invalid question index:", index, "in section:", currentSection);
             // Potentially show an error or load the first question as fallback
             if(questions.length > 0) index = 0; else return;
        }

        currentQuestionIndex = index;
        const question = questions[index];
        if (!question) {
            console.error("Question object not found at index", index);
            return;
        }


        if (question.status === 'not-visited') {
             updatePaletteButtonByIndex(index, 'not-answered');
        }

        currentSectionNameEl.textContent = currentSection;
        questionNumberEl.textContent = `Question No. ${index + 1}`;
        questionTextEl.innerHTML = question.questionText || ''; // Handle potentially missing text

        // Update palette highlighting
        document.querySelectorAll('.q-btn.active-question').forEach(btn => btn.classList.remove('active-question'));
        const currentPaletteBtn = questionPalette.querySelector(`.q-btn[data-index="${index}"]`);
        if (currentPaletteBtn) {
            currentPaletteBtn.classList.add('active-question');
        }

        optionsContainer.innerHTML = '';
        if (question.type === 'mcq') {
            (question.options || []).forEach((option, i) => { // Handle missing options array
                const optionId = `q${question.id}_opt${i}`;
                const div = document.createElement('div');
                div.classList.add('option');
                const isChecked = question.userAnswer === i;
                div.innerHTML = `
                    <input type="radio" id="${optionId}" name="q${question.id}_options" value="${i}" ${isChecked ? 'checked' : ''}>
                    <label for="${optionId}">${option}</label>
                `;
                 div.addEventListener('click', () => {
                     const radio = div.querySelector('input[type="radio"]');
                     if (radio && !radio.checked) radio.checked = true;
                 });
                optionsContainer.appendChild(div);
            });
        } else if (question.type === 'integer') {
            const inputId = `q${question.id}_input`;
             const input = document.createElement('input');
             input.setAttribute('type', 'number');
             input.setAttribute('id', inputId);
             input.classList.add('integer-input');
             input.value = (question.userAnswer !== null && question.userAnswer !== undefined) ? question.userAnswer : '';
            optionsContainer.appendChild(input);
        }
    }

    function getSelectedAnswer() {
        const question = getSectionQuestions()[currentQuestionIndex];
        if (!question) return null;

        if (question.type === 'mcq') {
            const selectedRadio = optionsContainer.querySelector(`input[name="q${question.id}_options"]:checked`);
            return selectedRadio ? parseInt(selectedRadio.value, 10) : null;
        } else if (question.type === 'integer') {
             const input = optionsContainer.querySelector('.integer-input');
             return input && input.value.trim() !== '' ? input.value.trim() : null;
         }
         return null;
     }

    function saveAndNext() {
        if (testSubmitted) return;
        const question = getSectionQuestions()[currentQuestionIndex];
        if (!question) return;
        const selectedAnswer = getSelectedAnswer();
        question.userAnswer = selectedAnswer;

        let newStatus = (selectedAnswer !== null)
            ? (question.status === 'answered-marked-review' ? 'answered-marked-review' : 'answered')
            : (question.status === 'marked-review' || question.status === 'answered-marked-review' ? 'marked-review' : 'not-answered');
        updatePaletteButtonByIndex(currentQuestionIndex, newStatus);
        moveToNextQuestion();
    }

    function markForReviewAndNext() {
        if (testSubmitted) return;
        const question = getSectionQuestions()[currentQuestionIndex];
        if (!question) return;
        const selectedAnswer = getSelectedAnswer();
        question.userAnswer = selectedAnswer;

        const newStatus = (selectedAnswer !== null) ? 'answered-marked-review' : 'marked-review';
        updatePaletteButtonByIndex(currentQuestionIndex, newStatus);
        moveToNextQuestion();
    }

    function clearResponse() {
        if (testSubmitted) return;
        const question = getSectionQuestions()[currentQuestionIndex];
        if (!question) return;
        question.userAnswer = null;

        let newStatus = 'not-answered';
         if (question.status === 'marked-review' || question.status === 'answered-marked-review') {
             newStatus = 'marked-review';
         }
        updatePaletteButtonByIndex(currentQuestionIndex, newStatus);

        if (question.type === 'mcq') {
            optionsContainer.querySelectorAll(`input[name="q${question.id}_options"]`).forEach(radio => radio.checked = false);
        } else if (question.type === 'integer') {
            const input = optionsContainer.querySelector('.integer-input');
            if (input) input.value = '';
        }
    }

    function moveToNextQuestion() {
         const questions = getSectionQuestions();
        if (currentQuestionIndex < questions.length - 1) {
            loadQuestion(currentQuestionIndex + 1);
        } else {
            const currentSectionGlobalIndex = sections.indexOf(currentSection);
            if (currentSectionGlobalIndex < sections.length - 1) {
                 switchSection(sections[currentSectionGlobalIndex + 1]);
            } else {
                 alert("You have reached the end of the test.");
                 // Stay on the last question
            }
        }
    }

    function jumpToQuestion(index) {
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (index >= 0 && index < questions.length && index !== currentQuestionIndex) {
             handleLeavingQuestion(); // Save state of current question before jumping
             loadQuestion(index);
        }
    }

    function showSummary() {
         if (testSubmitted) return;
         handleLeavingQuestion(); // Ensure current answer is captured before showing summary

        summaryTableBody.innerHTML = '';
        let totals = { answered: 0, notAnswered: 0, markedReview: 0, answeredMarkedReview: 0, notVisited: 0 };

        sections.forEach(section => {
            const questionsInSection = testData.filter(q => q.section === section);
            const counts = { total: questionsInSection.length, answered: 0, notAnswered: 0, markedReview: 0, answeredMarkedReview: 0, notVisited: 0 };
            questionsInSection.forEach(q => {
                switch(q.status) {
                    case 'answered': counts.answered++; break;
                    case 'not-answered': counts.notAnswered++; break;
                    case 'marked-review': counts.markedReview++; break;
                    case 'answered-marked-review': counts.answeredMarkedReview++; break;
                    case 'not-visited': counts.notVisited++; break;
                }
            });
             const row = summaryTableBody.insertRow();
             row.innerHTML = `<td>${section}</td><td>${counts.total}</td><td>${counts.answered}</td><td>${counts.notAnswered}</td><td>${counts.markedReview}</td><td>${counts.answeredMarkedReview}</td><td>${counts.notVisited}</td>`;
             Object.keys(totals).forEach(key => totals[key] += counts[key]); // Aggregate totals
        });
         const totalRow = summaryTableBody.insertRow();
         totalRow.style.fontWeight = 'bold';
         totalRow.innerHTML = `<td>Total</td><td>${testData.length}</td><td>${totals.answered}</td><td>${totals.notAnswered}</td><td>${totals.markedReview}</td><td>${totals.answeredMarkedReview}</td><td>${totals.notVisited}</td>`;

        summaryOverlay.style.display = 'flex';
    }

    function calculateResultsOnly(testDataToProcess) {
        // ... (Calculation logic remains exactly the same as in the previous version) ...
        // ... It should return { summary: {...}, detailedData: [...] } ...
         let overallScore = 0;
        let overallCorrect = 0;
        let overallIncorrect = 0;
        let overallUnattempted = 0;
        const uniqueSections = [...new Set(testDataToProcess.map(q => q.section))];
        const sectionStats = {};
        const processedTestData = JSON.parse(JSON.stringify(testDataToProcess));

        uniqueSections.forEach(sec => {
            sectionStats[sec] = { score: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 };
        });

        processedTestData.forEach(q => {
            const scheme = MARKING_SCHEME[q.type] || { correct: 0, incorrect: 0, unattempted: 0 };
            let marksAwarded = 0;
            let resultStatus = 'unattempted';
            sectionStats[q.section].total++;

            let attempted = (q.userAnswer !== null && q.userAnswer !== undefined && q.status !== 'not-visited');

            if (attempted) {
                const userAnswerParsed = (q.type === 'integer' && typeof q.userAnswer === 'string')
                                        ? parseFloat(q.userAnswer)
                                        : (q.type === 'mcq' ? parseInt(q.userAnswer, 10) : q.userAnswer);
                const correctAnswerParsed = (q.type === 'integer' && typeof q.correctAnswer === 'string')
                                           ? parseFloat(q.correctAnswer)
                                           : q.correctAnswer;

                if (userAnswerParsed === correctAnswerParsed) {
                    marksAwarded = scheme.correct; resultStatus = 'correct'; overallCorrect++; sectionStats[q.section].correct++;
                } else {
                    marksAwarded = scheme.incorrect; resultStatus = 'incorrect'; overallIncorrect++; sectionStats[q.section].incorrect++;
                }
            } else {
                marksAwarded = scheme.unattempted; resultStatus = 'unattempted'; overallUnattempted++; sectionStats[q.section].unattempted++;
                q.userAnswer = null; // Ensure null for storage
            }
            q.marksAwarded = marksAwarded;
            q.resultStatus = resultStatus;
            overallScore += marksAwarded;
            sectionStats[q.section].score += marksAwarded;
        });

        return {
            summary: { overallScore, overallCorrect, overallIncorrect, overallUnattempted, totalQuestions: processedTestData.length, sectionStats },
            detailedData: processedTestData
        };
    }

    function submitTest() {
        if (testSubmitted) return;
        testSubmitted = true;
        clearInterval(timerInterval);
        timerEl.textContent = formatTime(0);
        summaryOverlay.style.display = 'none';

        // Disable UI permanently
        [saveNextBtn, markReviewBtn, clearResponseBtn, submitTestBtn, confirmSubmitBtn, cancelSubmitBtn]
            .forEach(btn => btn && (btn.disabled = true));
        sectionNav.querySelectorAll('button').forEach(btn => btn.disabled = true);
        questionPalette.querySelectorAll('button').forEach(btn => btn.disabled = true);
        optionsContainer.querySelectorAll('input, button').forEach(el => el.disabled = true);
        optionsContainer.style.pointerEvents = 'none'; // Prevent clicks on labels


        console.log("Test Submitted. Calculating and saving results...");

        handleLeavingQuestion(); // Final capture of current question state

        const results = calculateResultsOnly(testData);

        // Prepare the entry for localStorage, including the result page URL
        const resultEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            testName: CURRENT_TEST_NAME, // Use the name defined in HTML
            resultPageUrl: RESULT_PAGE_URL, // Use the URL defined in HTML
            summary: results.summary,
            detailedData: results.detailedData
        };

        try {
            const existingResults = JSON.parse(localStorage.getItem('jeeMainResults') || '[]');
            existingResults.push(resultEntry);
            localStorage.setItem('jeeMainResults', JSON.stringify(existingResults));
            console.log("Results saved to localStorage successfully.");

            console.log(`Redirecting to results page: ${RESULT_PAGE_URL}`);
            window.location.href = RESULT_PAGE_URL; // Redirect using the URL from HTML

        } catch (error) {
            console.error("Failed to save results to localStorage:", error);
            alert("An error occurred while saving your results. Your test is submitted, but results might not be saved. Please contact support.");
        }
    }


    // --- Event Listeners ---
    saveNextBtn?.addEventListener('click', saveAndNext);
    markReviewBtn?.addEventListener('click', markForReviewAndNext);
    clearResponseBtn?.addEventListener('click', clearResponse);
    submitTestBtn?.addEventListener('click', showSummary);
    confirmSubmitBtn?.addEventListener('click', submitTest);
    cancelSubmitBtn?.addEventListener('click', () => { summaryOverlay.style.display = 'none'; });

    // --- Initialization ---
    function initTest() {
        console.log(`Initializing test: ${CURRENT_TEST_NAME}`);
        if (testTitleElement) {
            testTitleElement.textContent = CURRENT_TEST_NAME; // Set header title
        }
        if (!currentSection && sections.length > 0) {
            currentSection = sections[0]; // Ensure a section is selected if possible
        }
        if (!currentSection) {
            console.error("No sections found in testData. Cannot initialize.");
            alert("Error: Test data appears to be empty or invalid.");
            return;
        }

        renderSectionTabs();
        renderQuestionPalette();
        loadQuestion(currentQuestionIndex);
        timerInterval = setInterval(updateTimer, 1000);
        summaryOverlay.style.display = 'none'; // Ensure summary is hidden initially
        console.log("Test initialized.");
    }

    initTest();

});