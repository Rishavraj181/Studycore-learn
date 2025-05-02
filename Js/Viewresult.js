// --- Viewresult.js ---

// Ensure this script is included AFTER the specific target test name is defined in the HTML.
// EXPECTED GLOBAL VARIABLE defined in HTML before this script:
// - TARGET_TEST_NAME (String, e.g., "JEE Main 8 April S2")

document.addEventListener('DOMContentLoaded', () => {

    // --- MathJax Loading ---
    function loadMathJax() {
        if (typeof MathJax !== 'undefined') {
            console.log("Viewresult.js: MathJax already loaded or loading.");
            return;
        }
        console.log("Viewresult.js: Configuring and loading MathJax...");
        window.MathJax = {
            tex: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']],
                processEscapes: true
            },
            svg: {
                fontCache: 'global'
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            },
            startup: {
                ready: () => {
                    console.log('Viewresult.js: MathJax is loaded and ready.');
                    MathJax.startup.defaultReady();
                }
            }
        };
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.id = 'MathJax-script-results'; // Give a unique ID if needed
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true;
        document.head.appendChild(script);
    }

    // --- Load MathJax ASAP ---
    loadMathJax();

    // --- Validate required global variable ---
    if (typeof TARGET_TEST_NAME === 'undefined' || typeof TARGET_TEST_NAME !== 'string') {
        console.error("FATAL: 'TARGET_TEST_NAME' string is not defined globally in the HTML before Viewresult.js.");
        alert("Error: Results configuration is missing. Cannot load results.");
        const attemptsListEl = document.getElementById('attempts-list');
        const noResultsMsgEl = document.getElementById('no-results-message');
        if (attemptsListEl) attemptsListEl.innerHTML = '<li class="no-attempts">Configuration Error</li>';
        if (noResultsMsgEl) {
            noResultsMsgEl.style.display = 'flex';
            noResultsMsgEl.textContent = 'Page configuration error.';
        }
        return;
    }

    // --- DOM Elements ---
    const attemptsList = document.getElementById('attempts-list');
    const detailedResultsArea = document.getElementById('detailed-results-area');
    const noResultsMessage = document.getElementById('no-results-message');
    const attemptTimestampEl = document.getElementById('attempt-timestamp');
    const resultTotalScoreEl = document.getElementById('result-total-score');
    const resultTotalCorrectEl = document.getElementById('result-total-correct');
    const resultTotalIncorrectEl = document.getElementById('result-total-incorrect');
    const resultTotalUnattemptedEl = document.getElementById('result-total-unattempted');
    const resultTotalQuestionsEl = document.getElementById('result-total-questions');
    const resultsSectionTableBody = document.querySelector('#results-section-table tbody');
    const reviewSectionTabsContainer = document.getElementById('review-section-tabs');
    const reviewQuestionsContainer = document.getElementById('review-questions-container');
    const resultsHeaderTitle = document.querySelector('.results-header h1');

    // --- Basic DOM Element Checks ---
    if (!attemptsList || !detailedResultsArea || !noResultsMessage || !resultsSectionTableBody || !reviewSectionTabsContainer || !reviewQuestionsContainer) {
        console.error("FATAL: One or more essential result display elements are missing from the HTML.");
        alert("Error: Result page structure is incomplete.");
        return;
    }

    let targetResults = []; // To hold results filtered for the target test name

    // --- Load and Filter Attempts ---
    function loadAndFilterAttempts() {
        if (resultsHeaderTitle) {
            resultsHeaderTitle.textContent = `${TARGET_TEST_NAME} - Results`;
        }

        try {
            // *** FIXED: Removed trailing '?' from default string ***
            const allResults = JSON.parse(localStorage.getItem('jeeMainResults') || '[]');
            targetResults = allResults.filter(attempt => attempt.testName === TARGET_TEST_NAME);

            attemptsList.innerHTML = '';

            if (targetResults.length === 0) {
                attemptsList.innerHTML = `<li class="no-attempts">No past attempts found for ${TARGET_TEST_NAME}.</li>`;
                noResultsMessage.textContent = `Select an attempt from the list (if available) to view details for ${TARGET_TEST_NAME}.`;
                noResultsMessage.style.display = 'flex';
                detailedResultsArea.style.display = 'none';
                return;
            }

            targetResults.sort((a, b) => b.id - a.id); // Sort newest first

            targetResults.forEach((attempt, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.attemptIndex = index;
                listItem.innerHTML = `
                    ${attempt.timestamp}
                    <span>Score: ${attempt.summary?.overallScore ?? 'N/A'}</span>
                `;
                listItem.addEventListener('click', () => {
                    document.querySelectorAll('#attempts-list li.selected-attempt').forEach(el => el.classList.remove('selected-attempt'));
                    listItem.classList.add('selected-attempt');
                    displayAttemptDetails(index);
                });
                attemptsList.appendChild(listItem);
            });

            noResultsMessage.textContent = `Select an attempt from the list to view details for ${TARGET_TEST_NAME}.`;
            noResultsMessage.style.display = 'flex';
            detailedResultsArea.style.display = 'none';

        } catch (error) {
            console.error("Error loading or filtering results from localStorage:", error);
            attemptsList.innerHTML = '<li class="no-attempts">Error loading attempts. Check console.</li>';
            noResultsMessage.textContent = 'Could not load result data.';
            noResultsMessage.style.display = 'flex';
            detailedResultsArea.style.display = 'none';
        }
    }

    // --- Display Details for Selected Attempt ---
    function displayAttemptDetails(filteredIndex) {
        const selectedAttempt = targetResults[filteredIndex];
        if (!selectedAttempt || !selectedAttempt.summary || !selectedAttempt.detailedData) {
            console.error("Selected attempt data is missing or incomplete.", selectedAttempt);
             alert("Could not load details for this attempt.");
            return;
        }

        noResultsMessage.style.display = 'none';
        detailedResultsArea.style.display = 'block';

        attemptTimestampEl.textContent = `Attempt Time: ${selectedAttempt.timestamp}`;

        const summary = selectedAttempt.summary;
        const detailedData = selectedAttempt.detailedData;
        const sections = [...new Set(detailedData.map(q => q.section).filter(Boolean))];

        // Populate Overall Summary
        resultTotalScoreEl.textContent = summary.overallScore ?? 'N/A';
        resultTotalCorrectEl.textContent = summary.overallCorrect ?? 'N/A';
        resultTotalIncorrectEl.textContent = summary.overallIncorrect ?? 'N/A';
        resultTotalUnattemptedEl.textContent = summary.overallUnattempted ?? 'N/A';
        resultTotalQuestionsEl.textContent = summary.totalQuestions ?? 'N/A';

        // Populate Section-wise Summary Table
        resultsSectionTableBody.innerHTML = '';
        const sectionStats = summary.sectionStats || {};
        sections.forEach(sec => {
            const stats = sectionStats[sec] || { score: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 };
            const row = resultsSectionTableBody.insertRow();
            row.innerHTML = `<td>${sec}</td><td>${stats.correct}</td><td>${stats.incorrect}</td><td>${stats.unattempted}</td><td>${stats.score}</td><td>${stats.total}</td>`;
        });

        // Populate Detailed Review Section Tabs
        reviewSectionTabsContainer.innerHTML = '';
        sections.forEach((sec, tabIndex) => {
            const tab = document.createElement('button');
            tab.classList.add('review-section-tab');
             if (tabIndex === 0) tab.classList.add('active');
            tab.textContent = sec;
            tab.dataset.section = sec;
            tab.addEventListener('click', () => showDetailedReviewQuestions(sec, detailedData));
            reviewSectionTabsContainer.appendChild(tab);
        });

        // Initially display the detailed review for the first section
         if (sections.length > 0) {
            showDetailedReviewQuestions(sections[0], detailedData);
         } else {
             reviewQuestionsContainer.innerHTML = '<p class="no-review-questions">No questions data available for review.</p>';
         }
         detailedResultsArea.scrollTop = 0; // Scroll to top
    }

    // --- Show Questions for Selected Review Section ---
    function showDetailedReviewQuestions(sectionName, detailedData) {
        // Update active tab style
        reviewSectionTabsContainer.querySelectorAll('.review-section-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === sectionName);
        });

        const questionsToShow = detailedData.filter(q => q.section === sectionName);
        reviewQuestionsContainer.innerHTML = ''; // Clear previous questions

        if (questionsToShow.length === 0) {
            reviewQuestionsContainer.innerHTML = `<p class="no-review-questions">No questions found in the '${sectionName}' section for this attempt.</p>`;
            return;
         }

        questionsToShow.forEach((q, indexInSection) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('review-question-item');

            // --- Determine Correct Answer Display ---
            let correctAnswerDisplay = q.correctAnswer ?? 'N/A';
             if (q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null && q.options[q.correctAnswer] !== undefined) {
                 // Display the option text itself, and option number
                 correctAnswerDisplay = `(${String.fromCharCode(65 + q.correctAnswer)}) ${q.options[q.correctAnswer]}`;
             } else if (q.type === 'integer' && q.correctAnswer != null) {
                 correctAnswerDisplay = q.correctAnswer;
             }

             // --- Determine User Answer Display ---
             let userAnswerDisplay = 'N/A';
             let userAnswerClass = 'user-answer';
             if (q.userAnswer === null || q.userAnswer === undefined || q.resultStatus === 'unattempted') {
                 userAnswerDisplay = 'Not Answered';
             } else if (q.type === 'mcq' && Array.isArray(q.options) && q.userAnswer != null && q.options[q.userAnswer] !== undefined) {
                 // Display the option text itself, and option number
                 userAnswerDisplay = `(${String.fromCharCode(65 + q.userAnswer)}) ${q.options[q.userAnswer]}`;
                 if (q.resultStatus === 'incorrect') userAnswerClass += ' incorrect-ans';
             } else if (q.type === 'integer' && q.userAnswer != null) {
                  userAnswerDisplay = q.userAnswer;
                  if (q.resultStatus === 'incorrect') userAnswerClass += ' incorrect-ans';
             }

             const resultStatusDisplay = q.resultStatus || 'unknown'; // e.g., 'correct', 'incorrect', 'unattempted'
             const statusClass = `review-status ${resultStatusDisplay}`; // Class for styling status

             // --- Construct Inner HTML with Solution Section ---
            itemDiv.innerHTML = `
                <div class="question-number">Question ${indexInSection + 1} (ID: ${q.id || 'N/A'})</div>
                <div class="question-text">${q.questionText || '[No Question Text Provided]'}</div>
                ${q.type === 'mcq' && Array.isArray(q.options) ? `<div class="review-options">${q.options.map((opt, i) => `<div>(${String.fromCharCode(65 + i)}) ${opt}</div>`).join('')}</div>` : ''}
                <div class="review-details">
                     <div>Status: <span class="${statusClass}">${resultStatusDisplay.charAt(0).toUpperCase() + resultStatusDisplay.slice(1)}</span></div>
                     <div>Your Answer: <span class="${userAnswerClass}">${userAnswerDisplay}</span></div>
                     ${(resultStatusDisplay === 'incorrect' || resultStatusDisplay === 'unattempted') ? `<div>Correct Answer: <span class="correct-answer">${correctAnswerDisplay}</span></div>` : ''}
                     <div>Marks: ${q.marksAwarded != null ? q.marksAwarded : 'N/A'}</div>
                </div>
                <div class="review-solution">
                    <strong>Solution:</strong>
                    <div>${q.solution || 'Solution not provided.'}</div>
                </div>
            `;
            reviewQuestionsContainer.appendChild(itemDiv);
        });

        // *** Trigger MathJax Typesetting AFTER adding all items ***
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            // console.log(`Viewresult.js: Queueing MathJax typesetting for section: ${sectionName}`);
            MathJax.typesetPromise([reviewQuestionsContainer]) // Target the main container
                .catch((err) => console.error('Viewresult.js: MathJax typesetting error:', err));
        } else if (typeof MathJax === 'undefined') {
             console.warn(`Viewresult.js: MathJax is not yet available. Typesetting skipped for section: ${sectionName}`);
        }

        reviewQuestionsContainer.scrollTop = 0; // Scroll review container to top
    }


    // --- Initial Load ---
    loadAndFilterAttempts();

});