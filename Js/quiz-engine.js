/**
 * quiz-engine.js - REVISED FOR REVIEW MODE & ROBUSTNESS
 * Handles quiz logic: loading, navigation, timing, answers, submission,
 * and transitions to an interactive review mode using the same UI.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    // Wrap element fetching in checks to prevent early errors if HTML is missing elements
    const questionContentEl = document.getElementById('question-content');
    const paletteListContainerEl = document.getElementById('palette-list-container');
    const currentQuestionNumberEl = document.getElementById('current-question-number');
    const totalQuestionNumberEl = document.getElementById('total-question-number');
    const timeDisplayEl = document.getElementById('time-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const solutionBtn = document.getElementById('solution-btn');
    const submitBtn = document.getElementById('submit-btn');
    const allQuestionsDataContainer = document.getElementById('all-questions-data');
    const submitConfirmModal = document.getElementById('submit-confirm-modal');
    const cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    const closeModalButton = submitConfirmModal ? submitConfirmModal.querySelector('.close-modal-button') : null;
    const backToChapterBtn = document.getElementById('back-to-chapter-btn');
    const scoreDisplayHeaderEl = document.getElementById('score-display-header');
    const finalScoreValueEl = document.getElementById('final-score-value');
    const totalScoreValueEl = document.getElementById('total-score-value');
    const timerContainerEl = timeDisplayEl ? timeDisplayEl.closest('.timer') : null; // Get the timer container

    // --- State Variables ---
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let timerInterval = null; // Initialize timerInterval to null
    let timeLeft = 1800; // Example: 30 minutes (adjust as needed)
    let isReviewMode = false;
    let finalScore = 0;

    // --- Initialization Function ---
    function initializeQuiz() {
        console.log("Initializing Quiz..."); // Debug log

        // Validate essential container exists
        if (!allQuestionsDataContainer) {
            console.error("CRITICAL: Cannot find #all-questions-data container in HTML. Quiz cannot load.");
            if(questionContentEl) questionContentEl.innerHTML = "<p>Error: Question data container not found. Please check HTML structure.</p>";
            disableAllControls(); // Disable buttons if setup fails
            return;
        }

        parseQuestionData();
        if (questions.length === 0) {
            console.error("CRITICAL: No questions parsed from HTML. Check .question-data elements.");
            if(questionContentEl) questionContentEl.innerHTML = "<p>Error: No valid questions found. Please check question data in HTML.</p>";
            disableAllControls();
            return;
        }

        console.log(`Parsed ${questions.length} questions.`); // Debug log

        userAnswers = questions.map((_, index) => ({
            questionIndex: index,
            selectedOption: null,
            status: 'pending'
        }));

        if(totalQuestionNumberEl) totalQuestionNumberEl.textContent = questions.length;
        if(totalScoreValueEl) totalScoreValueEl.textContent = questions.length; // For score display

        buildPalette();
        setupEventListeners(); // Setup listeners early
        displayQuestion(currentQuestionIndex); // Display first question *after* setup
        startTimer();

        console.log("Quiz Initialized Successfully."); // Debug log
    }

    // --- Disable Controls Function (Helper) ---
    function disableAllControls() {
        [prevBtn, nextBtn, solutionBtn, submitBtn, backToChapterBtn].forEach(btn => {
            if (btn) btn.disabled = true;
        });
        if (paletteListContainerEl) paletteListContainerEl.style.pointerEvents = 'none';
    }

    // --- Parse Question Data ---
    function parseQuestionData() {
        const questionDataElements = allQuestionsDataContainer.querySelectorAll('.question-data');
        console.log(`Found ${questionDataElements.length} potential question data elements.`); // Debug log

        questions = Array.from(questionDataElements).map((el, i) => { // Use index i for logging
            const questionIndexAttr = el.dataset.questionIndex;
            const questionMetaEl = el.querySelector('.question-meta');
            const questionTextEl = el.querySelector('.question-text');
            const optionsContainerEl = el.querySelector('.options-container');
            const solutionAreaEl = el.querySelector('.solution-area');

            // Validation for each question element
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
                metaHTML: questionMetaEl.innerHTML,
                textHTML: questionTextEl.innerHTML,
                optionsHTML: optionsContainerEl.innerHTML,
                solutionHTML: solutionAreaEl ? solutionAreaEl.innerHTML : '<p>No solution provided.</p>',
                correctOption: correctOptionEl ? correctOptionEl.dataset.optionValue : null
            };
        }).filter(q => q !== null); // Remove skipped questions

        questions.sort((a, b) => a.index - b.index); // Ensure correct order
    }

    // --- Build Question Palette ---
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

            // Add click listener within the loop
            a.addEventListener('click', (e) => {
                e.preventDefault();
                 if (!isReviewMode && userAnswers[index].status === 'answered') {
                     // Maybe prompt if they want to change answer? For now, allow navigation.
                 }
                navigateToQuestion(index);
            });
        });
        updatePaletteStatus(); // Set initial states
    }

    // --- Display Specific Question ---
    function displayQuestion(index) {
        if (index < 0 || index >= questions.length || !questionContentEl) {
             console.error(`displayQuestion called with invalid index (${index}) or missing content element.`); return;
        }
        console.log(`Displaying question index: ${index}`); // Debug log

        currentQuestionIndex = index;
        const questionData = questions[index];

        // Basic check on question data structure
        if (!questionData || !questionData.metaHTML || !questionData.textHTML || !questionData.optionsHTML) {
            console.error(`Invalid question data for index ${index}.`, questionData);
            questionContentEl.innerHTML = "<p>Error: Could not load question content.</p>";
            return;
        }

        // Inject HTML
        questionContentEl.innerHTML = `
            <div class="question-meta">${questionData.metaHTML}</div>
            <div class="question-text">${questionData.textHTML}</div>
            <div class="options-container">${questionData.optionsHTML}</div>
            <div class="solution-area">${questionData.solutionHTML}</div>
        `;

        // Update header counter
        if(currentQuestionNumberEl) currentQuestionNumberEl.textContent = index + 1;

        // Reset solution visibility/button
        const solutionAreaEl = questionContentEl.querySelector('.solution-area');
        if (solutionAreaEl) {
            solutionAreaEl.style.display = 'none';
            if (solutionBtn) solutionBtn.textContent = 'Solution';
        } else {
             console.warn(`Solution area not found for question index ${index}.`);
        }

        // Attach option listeners only if NOT in review mode
        if (!isReviewMode) {
            attachOptionListeners();
        }

        restoreSelection(); // Restore user's previous selection visual state

        // Handle Review Mode Specifics
        if (isReviewMode) {
            revealAnswers(); // Reveal correct/incorrect and disable options
             if (solutionBtn) solutionBtn.disabled = false; // Ensure solution button is usable
        } else {
             if (solutionBtn) solutionBtn.disabled = false; // Ensure enabled during quiz
             // Ensure options are enabled (revealAnswers disables them)
              const options = questionContentEl.querySelectorAll('.option-item');
              options.forEach(option => {
                 const radioInput = option.querySelector('input[type="radio"]');
                 if(radioInput) radioInput.disabled = false;
                 option.style.pointerEvents = 'auto';
              });
        }

        updateNavigationButtons(); // Update footer button visibility
        updatePaletteHighlight(); // Highlight current number in palette
    }

    // --- Attach Option Listeners ---
    function attachOptionListeners() {
        const options = questionContentEl.querySelectorAll('.option-item');
        if (options.length === 0) {
             console.warn("No options found to attach listeners to for question:", currentQuestionIndex);
             return;
        }
        options.forEach(option => {
            // Remove previous listener if any (prevent duplicates - simple way)
            option.replaceWith(option.cloneNode(true));
        });
         // Re-query and add listener
         questionContentEl.querySelectorAll('.option-item').forEach(option => {
             option.addEventListener('click', handleOptionSelection);
         });
    }

    // --- Handle Option Selection ---
    function handleOptionSelection(event) {
        if (isReviewMode) return; // Don't allow changes in review mode

        const selectedLabel = event.target.closest('.option-item');
        if (!selectedLabel) return;

        const selectedValue = selectedLabel.dataset.optionValue;
        const radioInput = selectedLabel.querySelector('input[type="radio"]');

        if (!selectedValue) {
             console.warn("Clicked option label is missing data-option-value."); return;
        }

        if (radioInput) { radioInput.checked = true; }

        // Update state
        userAnswers[currentQuestionIndex].selectedOption = selectedValue;
        userAnswers[currentQuestionIndex].status = 'answered';

        // Update UI
        const allOptions = questionContentEl.querySelectorAll('.option-item');
        allOptions.forEach(opt => opt.classList.remove('selected'));
        selectedLabel.classList.add('selected');

        updatePaletteStatus(); // Update palette immediately
    }

    // --- Restore User's Selection Visual State ---
    function restoreSelection() {
        const answerData = userAnswers[currentQuestionIndex];
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
        } else {
             // Ensure no options are marked selected if no answer stored
             const options = questionContentEl.querySelectorAll('.option-item');
             options.forEach(option => option.classList.remove('selected'));
        }
    }

    // --- Update Navigation Buttons Visibility ---
    function updateNavigationButtons() {
        const isFirstQuestion = currentQuestionIndex === 0;
        const isLastQuestion = currentQuestionIndex === questions.length - 1;

        if (isReviewMode) {
            if(prevBtn) prevBtn.style.display = isFirstQuestion ? 'none' : 'inline-block';
            if(nextBtn) nextBtn.style.display = isLastQuestion ? 'none' : 'inline-block';
            if(submitBtn) submitBtn.style.display = 'none';
            if(backToChapterBtn) backToChapterBtn.style.display = 'inline-block';
            if(solutionBtn) solutionBtn.disabled = false; // Always enable in review
        } else {
            if(prevBtn) prevBtn.style.display = isFirstQuestion ? 'none' : 'inline-block';
            if(nextBtn) nextBtn.style.display = isLastQuestion ? 'none' : 'inline-block';
            if(submitBtn) submitBtn.style.display = isLastQuestion ? 'inline-block' : 'none';
            if(backToChapterBtn) backToChapterBtn.style.display = 'none';
            if(solutionBtn) solutionBtn.disabled = false; // Always enable during quiz
        }
    }

    // --- Update Palette Highlighting ---
    function updatePaletteHighlight() {
        if (!paletteListContainerEl) return;
        const paletteItems = paletteListContainerEl.querySelectorAll('.palette-item');
        paletteItems.forEach((item) => {
             // Use loose comparison for dataset attribute (string) vs index (number)
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

            const status = userAnswers[index].status;
            item.classList.remove('pending', 'answered', 'reviewed'); // Clear previous

            if (isReviewMode) {
                // In review mode, color based on correctness if answered
                 const qData = questions[index];
                 const uAnswer = userAnswers[index];
                 if (uAnswer.status === 'answered' && qData) {
                    item.classList.add(uAnswer.selectedOption === qData.correctOption ? 'correct' : 'incorrect'); // Use correct/incorrect classes if defined in CSS for palette
                     // Fallback to 'answered' class if no correct/incorrect palette styles
                     item.classList.add('answered');
                 } else {
                    item.classList.add('pending'); // Mark unanswered as pending
                 }
            } else {
                 // During quiz, just mark based on status
                 if (status === 'answered') item.classList.add('answered');
                 else if (status === 'reviewed') item.classList.add('reviewed'); // If review marking is implemented
                 else item.classList.add('pending');
            }

             // Re-apply current highlight
             item.classList.toggle('current', index === currentQuestionIndex);
        });
    }

    // --- Navigation Functions ---
    function navigateToQuestion(index) {
        if (index >= 0 && index < questions.length) {
            displayQuestion(index);
        } else {
            console.warn(`Attempted to navigate to invalid index: ${index}`);
        }
    }
    function goToNextQuestion() { navigateToQuestion(currentQuestionIndex + 1); }
    function goToPrevQuestion() { navigateToQuestion(currentQuestionIndex - 1); }

    // --- Toggle Solution Visibility ---
    function toggleSolution() {
        if (!questionContentEl || !solutionBtn) return;
        const solutionAreaEl = questionContentEl.querySelector('.solution-area');
        if (solutionAreaEl) {
            const isVisible = solutionAreaEl.style.display === 'block';
            solutionAreaEl.style.display = isVisible ? 'none' : 'block';
            solutionBtn.textContent = isVisible ? 'Solution' : 'Hide Solution';

            // If showing solution in review mode, ensure answers are marked
            if (isReviewMode && !isVisible) {
                revealAnswers();
            }
        } else {
             console.warn("Solution area not found for current question.");
        }
    }

    // --- Reveal Correct/Incorrect Answers ---
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
            option.classList.remove('selected', 'correct', 'incorrect'); // Reset states

            // Mark the correct answer
            if (optionValue === correctAnswer) {
                option.classList.add('correct');
            }
            // Mark the user's selection (correct or incorrect)
            if (optionValue === userAnswer) {
                option.classList.add('selected'); // Always show what user picked
                if (optionValue !== correctAnswer) {
                    option.classList.add('incorrect'); // Add incorrect style only if it wasn't the right one
                }
            }

            // Disable option interaction
            const radioInput = option.querySelector('input[type="radio"]');
            if (radioInput) radioInput.disabled = true;
            option.style.pointerEvents = 'none';
        });
    }

    // --- Timer Functions ---
    function startTimer() {
        if (timerInterval !== null) clearInterval(timerInterval); // Clear existing if any
        if (!timeDisplayEl || !timerContainerEl) { console.warn("Timer element(s) not found."); return; }

        timerContainerEl.style.display = 'inline-flex'; // Ensure visible
        updateTimerDisplay(); // Initial display
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                stopTimer();
                alert("Time's up! Submitting the quiz.");
                submitQuiz(true); // Auto-submit
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("Timer stopped."); // Debug log
        }
        // Hide timer visually
        if (timerContainerEl) timerContainerEl.style.display = 'none';
    }

    function updateTimerDisplay() {
        if (!timeDisplayEl) return;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // --- Submit Confirmation Modal ---
    function showSubmitConfirmation() {
        if (submitConfirmModal) submitConfirmModal.style.display = 'flex';
    }
    function hideSubmitConfirmation() {
        if (submitConfirmModal) submitConfirmModal.style.display = 'none';
    }

    // --- Submit Quiz Logic ---
    function submitQuiz(isAutoSubmit = false) {
        console.log("Attempting to submit quiz..."); // Debug log
        if (!isAutoSubmit) hideSubmitConfirmation();
        stopTimer();

        // Calculate score
        finalScore = 0;
        userAnswers.forEach((answer, index) => {
            if (questions[index] && answer.selectedOption === questions[index].correctOption) {
                finalScore++;
            }
        });
        console.log(`Quiz Submitted! Final Score: ${finalScore} / ${questions.length}`);

        // Display Score in Header
        if (scoreDisplayHeaderEl && finalScoreValueEl) {
            finalScoreValueEl.textContent = finalScore;
            if(totalScoreValueEl) totalScoreValueEl.textContent = questions.length; // Ensure total is correct
            scoreDisplayHeaderEl.style.display = 'inline-block';
        } else {
             console.warn("Score display elements not found in header.");
        }

        // Enter Review Mode
        isReviewMode = true;
        updatePaletteStatus(); // Update palette to show correct/incorrect based on new mode

        // Navigate to first question for review
        // DisplayQuestion will handle revealing answers and setting button states
        navigateToQuestion(0);

         // Optionally disable solution button initially in review?
         // if (solutionBtn) solutionBtn.disabled = true; // Uncomment if needed
    }

    // --- Setup Event Listeners ---
    function setupEventListeners() {
        console.log("Setting up event listeners..."); // Debug log
        if(nextBtn) nextBtn.addEventListener('click', goToNextQuestion); else console.warn("Next button not found.");
        if(prevBtn) prevBtn.addEventListener('click', goToPrevQuestion); else console.warn("Previous button not found.");
        if(solutionBtn) solutionBtn.addEventListener('click', toggleSolution); else console.warn("Solution button not found.");
        if(submitBtn) submitBtn.addEventListener('click', showSubmitConfirmation); else console.warn("Submit button not found.");
        if(backToChapterBtn) backToChapterBtn.addEventListener('click', goBackToChapter); // Use global function from HTML
        else console.warn("Back to Chapter button not found.");

        // Modal listeners
        if (closeModalButton) closeModalButton.addEventListener('click', hideSubmitConfirmation);
        if (cancelSubmitBtn) cancelSubmitBtn.addEventListener('click', hideSubmitConfirmation);
        if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', () => submitQuiz(false));

        window.addEventListener('click', (event) => {
            if (event.target == submitConfirmModal) hideSubmitConfirmation();
        });
        console.log("Event listeners setup complete."); // Debug log
    }

    // --- Start the Quiz ---
    // Add a small delay or ensure DOM is fully ready beyond DOMContentLoaded if needed
    // setTimeout(initializeQuiz, 0); // Example of slight delay
    initializeQuiz(); // Direct call is usually fine

}); // End DOMContentLoaded listener