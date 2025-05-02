// --- testattempt.js ---

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
        // Set default if missing, but relying on HTML definition is better
        window.TEST_DURATION_MINUTES = 180;
    }

    // --- State Variables ---
    let currentSection = testData.length > 0 ? testData[0].section : null;
    let currentQuestionIndex = 0;
    // Initialize timeLeft using the globally defined variable
    let timeLeft = typeof TEST_DURATION_MINUTES !== 'undefined' ? TEST_DURATION_MINUTES * 60 : 180 * 60;
    let timerInterval = null;
    let testSubmitted = false;

    // --- DOM Elements ---
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
    const testTitleElement = document.querySelector('.header-left h1');

    // --- Marking Scheme ---
    const MARKING_SCHEME = {
        mcq: { correct: 4, incorrect: -1, unattempted: 0 },
        integer: { correct: 4, incorrect: -1, unattempted: 0 }
        // Add other types if needed
    };

    // --- MathJax Loading ---
    function loadMathJax() {
        if (typeof MathJax !== 'undefined') {
            // console.log("MathJax already loaded or loading.");
            return; // Avoid loading multiple times
        }
        console.log("Configuring and loading MathJax...");
        window.MathJax = {
            tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']], processEscapes: true },
            svg: { fontCache: 'global' },
            options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
            startup: {
                ready: () => {
                    console.log('MathJax is loaded and ready.');
                    MathJax.startup.defaultReady();
                }
            }
        };
        const script = document.createElement('script');
        script.type = 'text/javascript'; script.id = 'MathJax-script';
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true; document.head.appendChild(script);
    }


    // --- Core Functions ---

    const sections = [...new Set(testData.map(q => q.section))];

    function getSectionQuestions() {
        if (!currentSection) return [];
        return testData.filter(q => q.section === currentSection);
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.max(0, seconds % 60).toString().padStart(2, '0'); // Ensure seconds don't go negative visually
        return `${h}:${m}:${s}`;
    }

    function updateTimer() {
        if (timerEl) { // Check if element exists
             timerEl.textContent = formatTime(timeLeft);
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null; // Clear interval ID
            if (!testSubmitted) {
                 alert("Time's up! The test will be submitted automatically.");
                 submitTest(); // Auto-submit
            }
        } else if (!testSubmitted) { // Only decrement if time is left and not submitted
             timeLeft--;
        }
    }


    function renderSectionTabs() {
        if (!sectionNav) return;
        sectionNav.innerHTML = '';
        sections.forEach(section => {
            const tab = document.createElement('button');
            tab.classList.add('section-tab');
            tab.textContent = section;
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
        handleLeavingQuestion(); // Save state of current question before switching
        currentSection = sectionName;
        // Find the first question index in the new section
        const firstIndexInNewSection = testData.findIndex(q => q.section === sectionName);
        currentQuestionIndex = (firstIndexInNewSection !== -1) ? firstIndexInNewSection : 0; // Go to first question or 0 if section empty
        renderSectionTabs(); // Update active tab style
        renderQuestionPalette(); // Render palette for the new section
        // Find the actual index within the filtered array for the new section
        const questionsInNewSection = getSectionQuestions();
        const actualIndexToLoad = questionsInNewSection.findIndex(q => q.id === testData[currentQuestionIndex]?.id);
        loadQuestion(actualIndexToLoad >= 0 ? actualIndexToLoad : 0); // Load the first question of the new section
    }


    function handleLeavingQuestion() {
        // Find the global index of the current question based on section and index within section
        const currentQuestionGlobalIndex = testData.findIndex(q => q.section === currentSection &&
           testData.filter(t => t.section === currentSection).findIndex(qs => qs.id === q.id) === currentQuestionIndex);


        if (currentQuestionGlobalIndex !== -1 && currentQuestionGlobalIndex < testData.length) {
            const currentQ = testData[currentQuestionGlobalIndex];
            if (currentQ) {
                const answer = getSelectedAnswer(); // Get answer from UI before potentially reloading question
                currentQ.userAnswer = answer;


                // Update status only if it's 'not-visited' - it becomes 'not-answered'
                // Other statuses ('answered', 'marked-review', etc.) are set explicitly by user actions
                if (currentQ.status === 'not-visited') {
                    currentQ.status = 'not-answered';
                    // We update the button visually when the palette is re-rendered or question loaded
                    // No need to call updatePaletteButtonByIndex here as it might update the wrong button if mid-switch
                }
            }
        }
     }


    function renderQuestionPalette() {
        if (!questionPalette || !paletteSectionNameEl) return;
        questionPalette.innerHTML = '';
        paletteSectionNameEl.textContent = currentSection || 'Palette';
        const questions = getSectionQuestions(); // Get questions for the *current* section
        questions.forEach((q, indexInSection) => { // indexInSection is 0, 1, 2... within the current section
            const btn = document.createElement('button');
            btn.classList.add('q-btn');
            btn.textContent = indexInSection + 1; // Display 1-based index for the section
            btn.dataset.indexInSection = indexInSection; // Store 0-based index within section
            btn.dataset.id = q.id; // Store global unique ID if needed
            updatePaletteButtonClass(btn, q.status);


             // Highlight if it's the current question *being viewed*
             const currentQuestionObject = getSectionQuestions()[currentQuestionIndex];
            if (currentQuestionObject && q.id === currentQuestionObject.id) {
                 btn.classList.add('active-question');
            }


            btn.addEventListener('click', () => jumpToQuestion(indexInSection)); // Use index within section to jump
            questionPalette.appendChild(btn);
        });
     }


    function updatePaletteButtonClass(buttonElement, status) {
        if(!buttonElement) return;
        // Keep active-question class if it exists, manage others
        const isActive = buttonElement.classList.contains('active-question');
        buttonElement.className = 'q-btn'; // Reset classes except base
        if (isActive) buttonElement.classList.add('active-question'); // Re-apply if it was active

        switch (status) {
            case 'answered': buttonElement.classList.add('answered'); break;
            case 'marked-review': buttonElement.classList.add('marked-review'); break;
            case 'answered-marked-review': buttonElement.classList.add('answered-marked-review'); break;
            case 'not-answered': buttonElement.classList.add('not-answered'); break;
            case 'not-visited': default: buttonElement.classList.add('not-visited'); break;
        }
    }

    // Updates the status in testData and the visual class of the button
    function updateQuestionStatus(indexInSection, newStatus) {
        const questions = getSectionQuestions();
        if (indexInSection >= 0 && indexInSection < questions.length) {
            const question = questions[indexInSection];
            if (question) {
                question.status = newStatus;
                const btn = questionPalette.querySelector(`.q-btn[data-index-in-section="${indexInSection}"]`);
                if (btn) {
                    updatePaletteButtonClass(btn, newStatus);
                }
            }
        }
    }


    function loadQuestion(indexInSection) { // Parameter is index WITHIN the current section
        if (testSubmitted) return;
        const questions = getSectionQuestions();


        if (!questions || indexInSection < 0 || indexInSection >= questions.length) {
             console.error("Attempted to load invalid question index:", indexInSection, "in section:", currentSection);
             // Optionally default to first question if possible
             if (questions && questions.length > 0) {
                 indexInSection = 0;
             } else {
                 // Handle case where section might be empty or data error
                 questionTextEl.innerHTML = 'Error: No questions available in this section.';
                 optionsContainer.innerHTML = '';
                 return;
             }
        }


        currentQuestionIndex = indexInSection; // Update the state variable
        const question = questions[indexInSection];


        if (!question) {
            console.error("Question object not found at index", indexInSection, "for section", currentSection);
            return;
        }


        // Mark as 'not-answered' if first visit
        if (question.status === 'not-visited') {
            updateQuestionStatus(indexInSection, 'not-answered'); // Update status and button
        } else {
             // Ensure palette button class reflects current status even if not 'not-visited'
             const btn = questionPalette.querySelector(`.q-btn[data-index-in-section="${indexInSection}"]`);
             if(btn) updatePaletteButtonClass(btn, question.status);
         }


        // Update UI Elements
        if (currentSectionNameEl) currentSectionNameEl.textContent = currentSection;
        if (questionNumberEl) questionNumberEl.textContent = `Question No. ${indexInSection + 1}`; // Use 1-based section index
        if (questionTextEl) questionTextEl.innerHTML = question.questionText || 'Question text not loaded.'; // Set HTML content


        // Update palette highlighting
        if (questionPalette) {
            questionPalette.querySelectorAll('.q-btn.active-question').forEach(btn => btn.classList.remove('active-question'));
            const currentPaletteBtn = questionPalette.querySelector(`.q-btn[data-index-in-section="${indexInSection}"]`);
            if (currentPaletteBtn) {
                currentPaletteBtn.classList.add('active-question');
            }
        }


        // Render options/input
        if (optionsContainer) {
            optionsContainer.innerHTML = ''; // Clear previous options
            if (question.type === 'mcq' && question.options) {
                question.options.forEach((option, i) => {
                    const optionId = `q${question.id}_opt${i}`;
                    const div = document.createElement('div');
                    div.classList.add('option');
                    // Ensure userAnswer is compared correctly (it's stored as index number)
                    const isChecked = question.userAnswer === i;
                    div.innerHTML = `
                        <label for="${optionId}">
                            <input type="radio" id="${optionId}" name="q${question.id}_options" value="${i}" ${isChecked ? 'checked' : ''}>
                            <span>${option || ''}</span>
                        </label>
                    `; // Added span for better structure if option is complex HTML
                    optionsContainer.appendChild(div);
                });
            } else if (question.type === 'integer') {
                const inputId = `q${question.id}_input`;
                 const input = document.createElement('input');
                 input.setAttribute('type', 'text'); // Use text initially, can add validation
                 input.setAttribute('id', inputId);
                 input.classList.add('integer-input');
                 input.placeholder = "Enter your answer";
                 // Handle null/undefined for initial value
                 input.value = (question.userAnswer !== null && question.userAnswer !== undefined) ? question.userAnswer : '';
                 optionsContainer.appendChild(input);
            }
         }


        // *** Trigger MathJax Typesetting ***
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            // console.log("Queueing MathJax typesetting for question:", question.id);
            // Ensure elements exist before passing them
            const elementsToTypeset = [questionTextEl, optionsContainer].filter(el => el !== null);
            if (elementsToTypeset.length > 0) {
                 MathJax.typesetPromise(elementsToTypeset)
                     .catch((err) => console.error('MathJax typesetting error:', err));
             }
        } else if (typeof MathJax === 'undefined') {
            console.warn("MathJax is not yet available. Typesetting skipped for question:", question.id);
        }
    }


    function getSelectedAnswer() {
        const questions = getSectionQuestions();
        if (!questions || currentQuestionIndex >= questions.length) return null;
        const question = questions[currentQuestionIndex];
        if (!question || !optionsContainer) return null;


        if (question.type === 'mcq') {
            const selectedRadio = optionsContainer.querySelector(`input[name="q${question.id}_options"]:checked`);
            // Return the integer index, or null if nothing selected
            return selectedRadio ? parseInt(selectedRadio.value, 10) : null;
        } else if (question.type === 'integer') {
             const input = optionsContainer.querySelector('.integer-input');
             // Return the trimmed string value, or null if empty/whitespace only
             return input && input.value.trim() !== '' ? input.value.trim() : null;
         }
         return null;
     }


    // --- Button Action Handlers ---


     function saveAndNext() {
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (!questions || currentQuestionIndex >= questions.length) return;


        const question = questions[currentQuestionIndex];
        const selectedAnswer = getSelectedAnswer();
        question.userAnswer = selectedAnswer; // Store the answer


        let newStatus;
        if (selectedAnswer !== null) {
            // Answered: If it was 'marked-review' or 'answered-marked-review', keep the mark aspect, otherwise just 'answered'.
            newStatus = (question.status === 'marked-review' || question.status === 'answered-marked-review')
                      ? 'answered-marked-review'
                      : 'answered';
        } else {
            // Not answered: If it was 'marked-review' or 'answered-marked-review', keep 'marked-review', otherwise 'not-answered'.
             newStatus = (question.status === 'marked-review' || question.status === 'answered-marked-review')
                       ? 'marked-review'
                       : 'not-answered';
        }


        updateQuestionStatus(currentQuestionIndex, newStatus); // Update data and palette button
        moveToNextQuestion();
    }


    function markForReviewAndNext() {
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (!questions || currentQuestionIndex >= questions.length) return;


        const question = questions[currentQuestionIndex];
        const selectedAnswer = getSelectedAnswer();
        question.userAnswer = selectedAnswer; // Store the answer even if marking


        // Determine the new status based on whether an answer was provided
        const newStatus = (selectedAnswer !== null) ? 'answered-marked-review' : 'marked-review';


        updateQuestionStatus(currentQuestionIndex, newStatus); // Update data and palette button
        moveToNextQuestion();
    }


    function clearResponse() {
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (!questions || currentQuestionIndex >= questions.length) return;


        const question = questions[currentQuestionIndex];
        question.userAnswer = null; // Clear the stored answer


        // Decide the new status: If it was marked (with or without answer), revert to just 'marked-review'.
        // Otherwise, it becomes 'not-answered'.
        const newStatus = (question.status === 'marked-review' || question.status === 'answered-marked-review')
                          ? 'marked-review'
                          : 'not-answered';


        updateQuestionStatus(currentQuestionIndex, newStatus); // Update data and palette button


        // Clear the UI input display
        if (question.type === 'mcq' && optionsContainer) {
            optionsContainer.querySelectorAll(`input[name="q${question.id}_options"]`).forEach(radio => radio.checked = false);
        } else if (question.type === 'integer' && optionsContainer) {
            const input = optionsContainer.querySelector('.integer-input');
            if (input) input.value = '';
        }
    }




    function moveToNextQuestion() {
         const questions = getSectionQuestions();
         if (currentQuestionIndex < questions.length - 1) {
             // Move to the next question within the current section
             loadQuestion(currentQuestionIndex + 1);
         } else {
             // End of current section, try moving to the next section
             const currentSectionGlobalIndex = sections.indexOf(currentSection);
             if (currentSectionGlobalIndex < sections.length - 1) {
                 // Switch to the first question of the next section
                 switchSection(sections[currentSectionGlobalIndex + 1]);
             } else {
                 // End of the last section
                 alert("You have reached the end of the last section.");
                 // Optionally stay on the last question or loop back
                 // For now, just stay - loadQuestion was implicitly called by switchSection if it happened
             }
         }
     }


    function jumpToQuestion(indexInSection) { // Parameter is index WITHIN the current section
        if (testSubmitted) return;
        const questions = getSectionQuestions();
        if (indexInSection >= 0 && indexInSection < questions.length && indexInSection !== currentQuestionIndex) {
             handleLeavingQuestion(); // Save state of the question we are leaving
             loadQuestion(indexInSection); // Load the clicked question
        }
    }


    function showSummary() {
         if (testSubmitted || !summaryOverlay || !summaryTableBody) return;
         handleLeavingQuestion(); // Capture current answer state before showing summary


        summaryTableBody.innerHTML = ''; // Clear previous summary
        let totals = { total: testData.length, answered: 0, notAnswered: 0, markedReview: 0, answeredMarkedReview: 0, notVisited: 0 };


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
                     default: counts.notVisited++; // Count unknown status as not visited
                }
            });


             // Add row for this section
             const row = summaryTableBody.insertRow();
             row.innerHTML = `<td>${section}</td><td>${counts.total}</td><td>${counts.answered}</td><td>${counts.notAnswered}</td><td>${counts.markedReview}</td><td>${counts.answeredMarkedReview}</td><td>${counts.notVisited}</td>`;


             // Accumulate totals
             totals.answered += counts.answered;
             totals.notAnswered += counts.notAnswered;
             totals.markedReview += counts.markedReview;
             totals.answeredMarkedReview += counts.answeredMarkedReview;
             totals.notVisited += counts.notVisited;
        });


         // Add total row
         const totalRow = summaryTableBody.insertRow();
         totalRow.style.fontWeight = 'bold';
         totalRow.innerHTML = `<td>Total</td><td>${totals.total}</td><td>${totals.answered}</td><td>${totals.notAnswered}</td><td>${totals.markedReview}</td><td>${totals.answeredMarkedReview}</td><td>${totals.notVisited}</td>`;


        summaryOverlay.style.display = 'flex'; // Show the summary overlay
    }


    // --- Result Calculation & Submission ---
    function submitTest() {
        if (testSubmitted) return;
        testSubmitted = true;
        if (timerInterval) {
             clearInterval(timerInterval);
             timerInterval = null;
        }
        if (timerEl) timerEl.textContent = formatTime(0); // Display 00:00:00
        if (summaryOverlay) summaryOverlay.style.display = 'none'; // Hide summary if open


        // Disable UI elements to prevent further interaction
         const elementsToDisable = [
            saveNextBtn, markReviewBtn, clearResponseBtn, submitTestBtn, confirmSubmitBtn, cancelSubmitBtn,
            ...(sectionNav ? Array.from(sectionNav.querySelectorAll('button')) : []),
            ...(questionPalette ? Array.from(questionPalette.querySelectorAll('button')) : []),
            ...(optionsContainer ? Array.from(optionsContainer.querySelectorAll('input, button, label')) : [])
        ];
        elementsToDisable.forEach(el => {
            if (el) {
                 el.disabled = true;
                 // Also prevent clicks visually
                 if (el.tagName === 'LABEL') {
                     el.style.cursor = 'default';
                 }
            }
         });
         if(optionsContainer) {
             optionsContainer.style.pointerEvents = 'none'; // Prevent interactions within options area
             optionsContainer.style.opacity = '0.7'; // Visually indicate disabled state
         }


        console.log("Test Submitted. Calculating and saving results...");


        handleLeavingQuestion(); // Ensure the very last state is captured


        // --- Calculate Results ---
        let overallScore = 0;
        let overallCorrect = 0;
        let overallIncorrect = 0;
        let overallUnattempted = 0;
        const uniqueSections = [...new Set(testData.map(q => q.section))];
        const sectionStats = {};
        // Create a deep copy to avoid modifying the original testData if needed elsewhere later
        const processedTestData = JSON.parse(JSON.stringify(testData));


        uniqueSections.forEach(sec => {
            sectionStats[sec] = { score: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 };
        });


        processedTestData.forEach(q => {
            const scheme = MARKING_SCHEME[q.type] || { correct: 0, incorrect: 0, unattempted: 0 };
            let marksAwarded = 0;
            let resultStatus = 'unattempted'; // Default status
            if (sectionStats[q.section]) { // Ensure section exists
                sectionStats[q.section].total++;
            } else {
                 console.warn(`Section "${q.section}" not found in stats for question ID ${q.id}`);
            }


            // Determine if the question was actually attempted
            // Attempted = Answered OR Answered & Marked for Review
            let attempted = (q.status === 'answered' || q.status === 'answered-marked-review');


             // Additional check: ensure userAnswer is not null/empty for integer questions if marked as attempted
             if (q.type === 'integer' && attempted && (q.userAnswer === null || q.userAnswer === undefined || String(q.userAnswer).trim() === '')) {
                  attempted = false; // Treat as unattempted if integer answer is missing despite status
             }


            if (attempted) {
                let userAnswerCompared = q.userAnswer;
                let correctAnswerCompared = q.correctAnswer;


                // Convert integer types for accurate comparison
                if (q.type === 'integer') {
                    // Use parseFloat for flexibility, handle potential errors carefully
                    const userNum = parseFloat(userAnswerCompared);
                    const correctNum = parseFloat(correctAnswerCompared);
                    if (!isNaN(userNum) && !isNaN(correctNum) && userNum === correctNum) {
                        marksAwarded = scheme.correct; resultStatus = 'correct'; overallCorrect++; sectionStats[q.section].correct++;
                    } else if (!isNaN(userNum)){ // Attempted with a number, but incorrect
                        marksAwarded = scheme.incorrect; resultStatus = 'incorrect'; overallIncorrect++; sectionStats[q.section].incorrect++;
                    } else {
                         // If userAnswer couldn't be parsed as a number, treat as incorrect/unattempted
                         attempted = false; // Reclassify as unattempted
                    }
                } else if (q.type === 'mcq') {
                     // MCQ answers are typically indices (integers)
                     userAnswerCompared = parseInt(userAnswerCompared, 10);
                     correctAnswerCompared = parseInt(correctAnswerCompared, 10);
                     if (!isNaN(userAnswerCompared) && userAnswerCompared === correctAnswerCompared) {
                        marksAwarded = scheme.correct; resultStatus = 'correct'; overallCorrect++; sectionStats[q.section].correct++;
                     } else { // Incorrect MCQ choice
                        marksAwarded = scheme.incorrect; resultStatus = 'incorrect'; overallIncorrect++; sectionStats[q.section].incorrect++;
                     }
                 } else {
                      // Handle other potential question types if necessary
                 }
            }


             // If not attempted (includes 'not-visited', 'not-answered', 'marked-review', or reclassified invalid integer attempts)
             if (!attempted) {
                marksAwarded = scheme.unattempted; resultStatus = 'unattempted'; overallUnattempted++; sectionStats[q.section].unattempted++;
                q.userAnswer = null; // Standardize unattempted answer representation
            }


            q.marksAwarded = marksAwarded;
            q.resultStatus = resultStatus; // Add status ('correct', 'incorrect', 'unattempted')
            overallScore += marksAwarded;
             if (sectionStats[q.section]) {
                sectionStats[q.section].score += marksAwarded;
             }
        });


        const finalResults = {
             summary: { overallScore, overallCorrect, overallIncorrect, overallUnattempted, totalQuestions: processedTestData.length, sectionStats },
             detailedData: processedTestData // This now includes resultStatus and marksAwarded
         };
        // --- End Calculation ---


        // --- Save to localStorage ---
        const resultEntry = {
            id: Date.now(), // Unique ID for this test attempt
            timestamp: new Date().toLocaleString(),
            testName: CURRENT_TEST_NAME,
            resultPageUrl: RESULT_PAGE_URL,
            summary: finalResults.summary,
            detailedData: finalResults.detailedData // Include detailed results
        };


        try {
            // **FIXED LINE BELOW**
            const existingResults = JSON.parse(localStorage.getItem('jeeMainResults') || '[]'); // Default to empty array string
            existingResults.push(resultEntry);
            localStorage.setItem('jeeMainResults', JSON.stringify(existingResults));
            console.log("Results saved to localStorage successfully.");


            // Redirect only AFTER successful save
            console.log(`Redirecting to results page: ${RESULT_PAGE_URL}`);
            if (RESULT_PAGE_URL) {
                window.location.href = RESULT_PAGE_URL;
            } else {
                 console.warn("RESULT_PAGE_URL is not defined, staying on current page.");
                 alert("Test submitted successfully. Results saved locally. (No redirect configured)");
            }


        } catch (error) {
            console.error("Failed to save results to localStorage:", error);
            // Log the specific error for debugging
             console.error("Error name:", error.name);
             console.error("Error message:", error.message);
             if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                 alert("Could not save results: LocalStorage quota exceeded. Please clear some space.");
             } else {
                 alert("An error occurred while saving your results. Your test is submitted, but results might not be saved in your browser history.");
             }
            // Decide if you still want to redirect even if saving failed
             // if (RESULT_PAGE_URL) {
             //     window.location.href = RESULT_PAGE_URL;
             // }
        }
    }




    // --- Event Listeners Setup ---
    // Use optional chaining (?) in case elements don't exist in specific HTML files
    saveNextBtn?.addEventListener('click', saveAndNext);
    markReviewBtn?.addEventListener('click', markForReviewAndNext);
    clearResponseBtn?.addEventListener('click', clearResponse);
    submitTestBtn?.addEventListener('click', showSummary);
    confirmSubmitBtn?.addEventListener('click', submitTest);
    cancelSubmitBtn?.addEventListener('click', () => {
        if (summaryOverlay) summaryOverlay.style.display = 'none';
    });


    // --- Initialization ---
    function initTest() {
        console.log(`Initializing test: ${CURRENT_TEST_NAME}`);


        // Load MathJax FIRST
        loadMathJax(); // Call the function to load MathJax


        if (testTitleElement) {
            testTitleElement.textContent = CURRENT_TEST_NAME;
        } else {
             console.warn("Test title element not found.");
        }


        if (!currentSection && sections.length > 0) {
            currentSection = sections[0];
        }


        if (!currentSection) {
            console.error("No sections found in testData or initial section couldn't be set. Cannot initialize test.");
            alert("Error: Test data appears to be empty or invalid.");
            // Display error message in the question area
            if(questionTextEl) questionTextEl.innerHTML = "Error: Test data could not be loaded.";
            if(optionsContainer) optionsContainer.innerHTML = "";
            return; // Stop initialization
        }


        renderSectionTabs();
        renderQuestionPalette();


        // Load the first question (index 0 within the first section)
        loadQuestion(0);


        // Start the timer ONLY if timeLeft is positive
        if (timeLeft > 0) {
             if (timerInterval) clearInterval(timerInterval); // Clear any existing interval first
             timerInterval = setInterval(updateTimer, 1000);
             updateTimer(); // Initial display update
        } else if(timerEl) {
             timerEl.textContent = formatTime(0); // Show 00:00:00 if duration is 0 or less
        }


        if (summaryOverlay) summaryOverlay.style.display = 'none'; // Ensure summary is hidden initially
        console.log("Test initialized.");
    }


    // Start the test initialization process
    initTest();


});