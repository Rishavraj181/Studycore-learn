/**
 * quiz-engine.js - REVISED FOR PRACTICE MODE (IMMEDIATE FEEDBACK) & PER-QUESTION TIMER
 * Handles quiz logic: loading, navigation, per-question timing, immediate answers/feedback.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    const questionContentEl = document.getElementById('question-content');
    const paletteListContainerEl = document.getElementById('palette-list-container');
    const currentQuestionNumberEl = document.getElementById('current-question-number');
    const totalQuestionNumberEl = document.getElementById('total-question-number');
    const timeDisplayEl = document.getElementById('time-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const solutionBtn = document.getElementById('solution-btn');
    // REMOVED: submitBtn and related modal elements are no longer needed for core logic
    // const submitBtn = document.getElementById('submit-btn');
    // const submitConfirmModal = document.getElementById('submit-confirm-modal');
    // const cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    // const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    // const closeModalButton = submitConfirmModal ? submitConfirmModal.querySelector('.close-modal-button') : null;
    const allQuestionsDataContainer = document.getElementById('all-questions-data');
    const backToChapterBtn = document.getElementById('back-to-chapter-btn');
    // REMOVED: Score display elements are no longer needed
    // const scoreDisplayHeaderEl = document.getElementById('score-display-header');
    // const finalScoreValueEl = document.getElementById('final-score-value');
    // const totalScoreValueEl = document.getElementById('total-score-value');
    const timerContainerEl = timeDisplayEl ? timeDisplayEl.closest('.timer') : null;

    // --- State Variables ---
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = []; // Stores { questionIndex, selectedOption, status ('pending', 'answered'), timeSpentSeconds }
    let timerInterval = null;
    let elapsedTimeCurrentQuestion = 0; // Time spent on the currently active, unanswered question
    // REMOVED: isReviewMode, finalScore, totalQuizTimeSeconds

    // --- Initialization Function ---
    function initializeQuiz() {
        console.log("Initializing Practice Mode...");

        if (!allQuestionsDataContainer) {
            console.error("CRITICAL: Cannot find #all-questions-data container in HTML. Quiz cannot load.");
            if(questionContentEl) questionContentEl.innerHTML = "<p>Error: Question data container not found. Please check HTML structure.</p>";
            disableAllControls();
            return;
        }

        parseQuestionData();
        if (questions.length === 0) {
            console.error("CRITICAL: No questions parsed from HTML. Check .question-data elements.");
            if(questionContentEl) questionContentEl.innerHTML = "<p>Error: No valid questions found. Please check question data in HTML.</p>";
            disableAllControls();
            return;
        }

        console.log(`Parsed ${questions.length} questions.`);

        // Initialize userAnswers with timeSpentSeconds
        userAnswers = questions.map((_, index) => ({
            questionIndex: index,
            selectedOption: null,
            status: 'pending', // Status: 'pending' or 'answered'
            timeSpentSeconds: 0
        }));

        if(totalQuestionNumberEl) totalQuestionNumberEl.textContent = questions.length;
        // REMOVED: Score display setup

        buildPalette();
        setupEventListeners();
        displayQuestion(currentQuestionIndex); // Display first question (will also start its timer)

        console.log("Practice Mode Initialized Successfully.");
    }

    // --- Disable Controls Function (Helper) ---
    function disableAllControls() {
        // Include solutionBtn here as well initially
        [prevBtn, nextBtn, solutionBtn, backToChapterBtn].forEach(btn => {
            if (btn) btn.disabled = true;
        });
        if (paletteListContainerEl) paletteListContainerEl.style.pointerEvents = 'none';
        // Hide timer initially if desired
        if(timerContainerEl) timerContainerEl.style.display = 'none';
    }

    // --- Parse Question Data --- (No changes needed)
    function parseQuestionData() {
        const questionDataElements = allQuestionsDataContainer.querySelectorAll('.question-data');
        console.log(`Found ${questionDataElements.length} potential question data elements.`);

        questions = Array.from(questionDataElements).map((el, i) => {
            const questionIndexAttr = el.dataset.questionIndex;
            const questionMetaEl = el.querySelector('.question-meta');
            const questionTextEl = el.querySelector('.question-text');
            const optionsContainerEl = el.querySelector('.options-container');
            const solutionAreaEl = el.querySelector('.solution-area');

            if (questionIndexAttr === undefined || questionIndexAttr === null || isNaN(parseInt(questionIndexAttr, 10))) {
                 console.warn(`Skipping question element ${i + 1}: Missing or invalid data-question-index.`); return null;
            }
            const questionIndex = parseInt(questionIndexAttr, 10);
            if (!questionMetaEl) { console.warn(`Skipping question ${questionIndex}: Missing .question-meta.`); return null; }
            if (!questionTextEl) { console.warn(`Skipping question ${questionIndex}: Missing .question-text.`); return null; }
            if (!optionsContainerEl) { console.warn(`Skipping question ${questionIndex}: Missing .options-container.`); return null; }

            const correctOptionEl = optionsContainerEl.querySelector('[data-correct="true"]');

            return {
                index: questionIndex,
                metaHTML: questionMetaEl.innerHTML, // Keep original meta
                textHTML: questionTextEl.innerHTML,
                optionsHTML: optionsContainerEl.innerHTML,
                solutionHTML: solutionAreaEl ? solutionAreaEl.innerHTML : '<p>No solution provided.</p>',
                correctOption: correctOptionEl ? correctOptionEl.dataset.optionValue : null
            };
        }).filter(q => q !== null);

        questions.sort((a, b) => a.index - b.index);
    }

    // --- Build Question Palette --- (No changes needed in structure)
    function buildPalette() {
         if (!paletteListContainerEl) {
            console.warn("Palette container not found."); return;
        }
        paletteListContainerEl.innerHTML = ''; // Clear first
        questions.forEach((q, index) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.classList.add('palette-item');
            a.textContent = index + 1;
            a.href = "#";
            a.dataset.questionIndex = index;
            li.appendChild(a);
            paletteListContainerEl.appendChild(li);

            a.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToQuestion(index);
            });
        });
        updatePaletteStatus();
    }

    // --- Helper Function to Format Time --- (No changes needed)
    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) {
            return "00:00";
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // --- Display Specific Question ---
    function displayQuestion(index) {
        if (index < 0 || index >= questions.length || !questionContentEl) {
            console.error(`displayQuestion called with invalid index (${index}) or missing content element.`);
            return;
        }
        console.log(`Displaying question index: ${index}`);

        // Stop timer for the *previous* question if it was running
        // (This shouldn't strictly be necessary if stopTimer is called correctly on navigate/answer, but acts as a safeguard)
        stopTimer();

        currentQuestionIndex = index;
        const questionData = questions[index];
        const answerData = userAnswers[index];

        if (!questionData || !questionData.metaHTML || !questionData.textHTML || !questionData.optionsHTML) {
            console.error(`Invalid question data for index ${index}.`, questionData);
            questionContentEl.innerHTML = "<p>Error: Could not load question content.</p>";
            return;
        }

        // Inject base HTML (without dynamic time initially)
        questionContentEl.innerHTML = `
            <div class="question-meta">${questionData.metaHTML}</div>
            <div class="question-text">${questionData.textHTML}</div>
            <div class="options-container">${questionData.optionsHTML}</div>
            <div class="solution-area" style="display: none;">${questionData.solutionHTML}</div>
        `;

        if(currentQuestionNumberEl) currentQuestionNumberEl.textContent = index + 1;

        const solutionAreaEl = questionContentEl.querySelector('.solution-area');
        if (solutionBtn) solutionBtn.textContent = 'Solution'; // Reset button text
        if (solutionAreaEl) solutionAreaEl.style.display = 'none'; // Ensure solution hidden initially

        if (answerData.status === 'answered') {
            // --- Question Already Answered ---
            console.log(`Question ${index} already answered.`);
            restoreSelection(); // Restore visual state (includes calling revealAnswers)
            if (solutionBtn) solutionBtn.disabled = false; // Allow viewing solution again
            if (timerContainerEl) timerContainerEl.style.display = 'none'; // Hide timer for answered questions
            // Make sure options are visually disabled (revealAnswers should handle this)
             const options = questionContentEl.querySelectorAll('.option-item');
             options.forEach(option => {
                  option.style.pointerEvents = 'none';
                  const radioInput = option.querySelector('input[type="radio"]');
                 if(radioInput) radioInput.disabled = true;
             });


        } else {
            // --- New/Unanswered Question ---
             console.log(`Displaying unanswered question ${index}. Starting timer.`);
            attachOptionListeners(); // Attach listeners only for unanswered questions
            restoreSelection(); // Restore selection if they navigated away and back without answering
            if (solutionBtn) solutionBtn.disabled = true; // Disable solution until answered
            startTimer(); // Start the timer for this question
        }

        updateNavigationButtons();
        updatePaletteHighlight();
        updatePaletteStatus(); // Update palette based on current state
    }


    // --- Attach Option Listeners --- (No changes needed)
     function attachOptionListeners() {
        const options = questionContentEl.querySelectorAll('.option-item');
        if (options.length === 0) {
             console.warn("No options found to attach listeners to for question:", currentQuestionIndex);
             return;
        }
         // Ensure options are interactive
         options.forEach(option => {
             option.style.pointerEvents = 'auto';
              const radioInput = option.querySelector('input[type="radio"]');
                 if(radioInput) radioInput.disabled = false;

             // Re-binding listeners to avoid duplicates if displayQuestion is called rapidly
             const newOption = option.cloneNode(true);
             option.parentNode.replaceChild(newOption, option);
             newOption.addEventListener('click', handleOptionSelection);
         });
    }


    // --- Handle Option Selection (Immediate Feedback Trigger) ---
    function handleOptionSelection(event) {
        // Double check if already answered (shouldn't happen if listeners are detached/options disabled)
        if (userAnswers[currentQuestionIndex].status === 'answered') return;

        const selectedLabel = event.target.closest('.option-item');
        if (!selectedLabel) return;

        const selectedValue = selectedLabel.dataset.optionValue;
        const radioInput = selectedLabel.querySelector('input[type="radio"]');

        if (!selectedValue) {
             console.warn("Clicked option label is missing data-option-value."); return;
        }

        console.log(`Answer selected for question ${currentQuestionIndex}: ${selectedValue}`);

        // --- Stop Timer and Record Time ---
        stopTimer(); // Stop the timer immediately
        userAnswers[currentQuestionIndex].timeSpentSeconds = elapsedTimeCurrentQuestion; // Record time
        console.log(`Time recorded for question ${currentQuestionIndex}: ${elapsedTimeCurrentQuestion}s`);
         if (timerContainerEl) timerContainerEl.style.display = 'none'; // Hide timer after answering


        // --- Update State ---
        userAnswers[currentQuestionIndex].selectedOption = selectedValue;
        userAnswers[currentQuestionIndex].status = 'answered';

        // --- Update UI ---
        if (radioInput) { radioInput.checked = true; } // Ensure radio is checked visually

        revealAnswers(); // Show correct/incorrect, disable options, show time
        if (solutionBtn) solutionBtn.disabled = false; // Enable solution button now
        updatePaletteStatus(); // Update palette with correct/incorrect status
        // Optional: Automatically show solution after a short delay?
        // setTimeout(() => { toggleSolution(); }, 1000);
    }

    // --- Restore User's Selection Visual State ---
    function restoreSelection() {
        const answerData = userAnswers[currentQuestionIndex];

        // Clear any previous time display in meta before potentially adding a new one
        const metaElement = questionContentEl.querySelector('.question-meta');
        const existingTimeDisplay = metaElement?.querySelector('.time-spent-display');
        if(existingTimeDisplay) existingTimeDisplay.remove();
        const existingSeparator = Array.from(metaElement?.childNodes ?? []).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '|');
         if(existingSeparator) existingSeparator.remove();


        if (answerData && answerData.selectedOption !== null) {
            const options = questionContentEl.querySelectorAll('.option-item');
            options.forEach(option => {
                option.classList.remove('selected'); // Clear selection first
                if (option.dataset.optionValue === answerData.selectedOption) {
                    option.classList.add('selected');
                    const radioInput = option.querySelector('input[type="radio"]');
                    if (radioInput) radioInput.checked = true;
                }
            });

            // If the question was already answered, immediately show the result state
            if (answerData.status === 'answered') {
                revealAnswers(); // This will mark correct/incorrect, disable options, and show time
            }
        } else {
            // Ensure no options are marked selected if no answer stored/pending
            const options = questionContentEl.querySelectorAll('.option-item');
            options.forEach(option => {
                option.classList.remove('selected', 'correct', 'incorrect');
                 // Ensure options are enabled visually if pending
                  const radioInput = option.querySelector('input[type="radio"]');
                  if (radioInput) radioInput.disabled = false;
                  option.style.pointerEvents = 'auto';
            });
        }
    }


    // --- Update Navigation Buttons Visibility ---
    function updateNavigationButtons() {
        const isFirstQuestion = currentQuestionIndex === 0;
        const isLastQuestion = currentQuestionIndex === questions.length - 1;

        // Simplified: No review mode, no submit button
        if(prevBtn) prevBtn.style.display = isFirstQuestion ? 'none' : 'inline-block';
        if(nextBtn) nextBtn.style.display = isLastQuestion ? 'none' : 'inline-block';
        // Submit button is assumed removed from HTML or hidden via CSS
        if(backToChapterBtn) backToChapterBtn.style.display = 'inline-block'; // Always show back button? Or adjust as needed.

        // Solution button state is handled in displayQuestion/handleOptionSelection
        // Timer visibility is handled in displayQuestion/handleOptionSelection/stopTimer
    }


    // --- Update Palette Highlighting --- (No changes needed)
    function updatePaletteHighlight() {
        if (!paletteListContainerEl) return;
        const paletteItems = paletteListContainerEl.querySelectorAll('.palette-item');
        paletteItems.forEach((item) => {
            item.classList.toggle('current', item.dataset.questionIndex == currentQuestionIndex);
        });
    }

    // --- Update Palette Status ---
    function updatePaletteStatus() {
        if (!paletteListContainerEl) return;
        const paletteItems = paletteListContainerEl.querySelectorAll('.palette-item');
        paletteItems.forEach((item) => {
            const index = parseInt(item.dataset.questionIndex, 10);
            if (isNaN(index) || !userAnswers[index]) return;

            const uAnswer = userAnswers[index];
            const qData = questions[index];
            item.classList.remove('pending', 'answered', 'correct', 'incorrect'); // Clear previous state classes

            if (uAnswer.status === 'answered') {
                item.classList.add('answered');
                if (qData && uAnswer.selectedOption === qData.correctOption) {
                    item.classList.add('correct');
                } else {
                    item.classList.add('incorrect');
                }
            } else {
                item.classList.add('pending');
            }

            // Re-apply current highlight regardless of status
            item.classList.toggle('current', index === currentQuestionIndex);
        });
    }

    // --- Navigation Functions ---
    function navigateToQuestion(index) {
        // Stop timer for the outgoing question *before* displaying the new one
        // This is important if the user navigates without answering.
        if (userAnswers[currentQuestionIndex].status === 'pending') {
             stopTimer();
             // Optionally record the time spent even if unanswered?
             // userAnswers[currentQuestionIndex].timeSpentSeconds = elapsedTimeCurrentQuestion;
             // console.log(`Navigated away from pending question ${currentQuestionIndex}, time was ${elapsedTimeCurrentQuestion}s`);
         }

        if (index >= 0 && index < questions.length) {
            displayQuestion(index);
        } else {
            console.warn(`Attempted to navigate to invalid index: ${index}`);
        }
    }
    function goToNextQuestion() { navigateToQuestion(currentQuestionIndex + 1); }
    function goToPrevQuestion() { navigateToQuestion(currentQuestionIndex - 1); }

    // --- Toggle Solution Visibility --- (No functional change needed)
    function toggleSolution() {
        if (!questionContentEl || !solutionBtn) return;
         // Ensure it only works if the question has been answered
         if (userAnswers[currentQuestionIndex].status !== 'answered') return;

        const solutionAreaEl = questionContentEl.querySelector('.solution-area');
        if (solutionAreaEl) {
            const isVisible = solutionAreaEl.style.display === 'block';
            solutionAreaEl.style.display = isVisible ? 'none' : 'block';
            solutionBtn.textContent = isVisible ? 'Solution' : 'Hide Solution';
        } else {
             console.warn("Solution area not found for current question.");
        }
    }


    // --- Reveal Correct/Incorrect Answers (and disable options) ---
    function revealAnswers() {
        if (!questionContentEl) return;
        const currentQData = questions[currentQuestionIndex];
        if (!currentQData) { console.error("Cannot reveal answers: current question data is missing."); return; }

        const correctAnswer = currentQData.correctOption;
        const options = questionContentEl.querySelectorAll('.option-item');
        if (options.length === 0) { console.warn("No options found to reveal answers for."); return; }

        const userAnswerData = userAnswers[currentQuestionIndex];
        const userAnswer = userAnswerData ? userAnswerData.selectedOption : null;

        options.forEach(option => {
            const optionValue = option.dataset.optionValue;
            option.classList.remove('selected', 'correct', 'incorrect'); // Reset states potentially set by restoreSelection

            // Mark the correct answer
            if (optionValue === correctAnswer) {
                option.classList.add('correct');
            }
            // Mark the user's selection (correct or incorrect)
            if (optionValue === userAnswer) {
                option.classList.add('selected'); // Keep showing what user picked
                if (optionValue !== correctAnswer) {
                    option.classList.add('incorrect'); // Add incorrect style only if it wasn't the right one
                }
            }

            // --- Disable option interaction ---
            const radioInput = option.querySelector('input[type="radio"]');
            if (radioInput) radioInput.disabled = true;
            option.style.pointerEvents = 'none'; // Prevent clicks
        });

         // --- Display Time Spent ---
         const timeSpent = userAnswerData?.timeSpentSeconds ?? 0;
         const formattedTimeSpent = formatTime(timeSpent);
         const metaElement = questionContentEl.querySelector('.question-meta');
         if (metaElement) {
              // Remove previous time display if any exists from restoreSelection race condition
             let existingTimeDisplay = metaElement.querySelector('.time-spent-display');
             if(existingTimeDisplay) existingTimeDisplay.remove();
             let existingSeparator = Array.from(metaElement.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '|');
             if(existingSeparator) existingSeparator.remove();


             // Add the time display
             let timeDisplay = document.createElement('span');
             timeDisplay.classList.add('time-spent-display');
             timeDisplay.style.marginLeft = '15px';
             timeDisplay.style.fontStyle = 'italic';
             timeDisplay.style.color = '#555'; // Example style

             // Add separator "|" if meta has existing content
             if (metaElement.textContent.trim().length > 0) {
                 metaElement.appendChild(document.createTextNode(' | '));
             }
             timeDisplay.textContent = `(Time: ${formattedTimeSpent})`;
             metaElement.appendChild(timeDisplay);
         }
    }


    // --- Timer Functions (Per Question) ---
    function startTimer() {
        if (timerInterval !== null) clearInterval(timerInterval); // Clear any residual interval
        if (!timeDisplayEl || !timerContainerEl) { console.warn("Timer element(s) not found."); return; }

        console.log("Starting timer for current question.");
        elapsedTimeCurrentQuestion = 0; // Reset timer for this question
        timerContainerEl.style.display = 'inline-flex'; // Make timer visible
        updateTimerDisplay(); // Show 00:00

        timerInterval = setInterval(() => {
            elapsedTimeCurrentQuestion++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
             console.log(`Timer stopped for question ${currentQuestionIndex}. Elapsed: ${elapsedTimeCurrentQuestion}s`);
            // Timer display might be hidden by handleOptionSelection or displayQuestion later
             // if (timerContainerEl) timerContainerEl.style.display = 'none'; // Option: hide immediately
        }
    }

    function updateTimerDisplay() {
        if (!timeDisplayEl) return;
        timeDisplayEl.textContent = formatTime(elapsedTimeCurrentQuestion);
    }

    // --- REMOVED: Submit Confirmation Modal Functions ---
    // --- REMOVED: submitQuiz Function ---

    // --- Setup Event Listeners ---
    function setupEventListeners() {
        console.log("Setting up practice mode event listeners...");
        if(nextBtn) nextBtn.addEventListener('click', goToNextQuestion); else console.warn("Next button not found.");
        if(prevBtn) prevBtn.addEventListener('click', goToPrevQuestion); else console.warn("Previous button not found.");
        if(solutionBtn) solutionBtn.addEventListener('click', toggleSolution); else console.warn("Solution button not found.");
        // REMOVED: submitBtn listener
        if(backToChapterBtn) {
            // Assuming goBackToChapter is globally defined or handle navigation here
            backToChapterBtn.addEventListener('click', () => {
                console.log("Navigating back to chapter...");
                // Add actual navigation logic here, e.g.:
                // window.location.href = '/path/to/chapter/index';
                if (typeof goBackToChapter === 'function') {
                    goBackToChapter();
                } else {
                    alert("Navigation logic for 'Back to Chapter' is not defined.");
                }
            });
        } else {
            console.warn("Back to Chapter button not found.");
        }

        // REMOVED: Modal listeners
        console.log("Event listeners setup complete.");
    }

    // --- Start the Quiz ---
    initializeQuiz();

}); // End DOMContentLoaded listener