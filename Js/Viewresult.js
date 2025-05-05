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
    const printButton = document.getElementById('print-results-button'); // <-- Get the print button

    // --- Basic DOM Element Checks ---
    // Added check for printButton
    if (!attemptsList || !detailedResultsArea || !noResultsMessage || !resultsSectionTableBody || !reviewSectionTabsContainer || !reviewQuestionsContainer || !printButton) {
        console.error("FATAL: One or more essential result display elements (including print button) are missing from the HTML.");
        alert("Error: Result page structure is incomplete.");
        return;
    }

    let targetResults = []; // To hold results filtered for the target test name
    let currentDetailedData = []; // To store the data of the currently displayed attempt

    // --- Load and Filter Attempts ---
    function loadAndFilterAttempts() {
        if (resultsHeaderTitle) {
            resultsHeaderTitle.textContent = `${TARGET_TEST_NAME} - Results`;
        }

        try {
            const allResults = JSON.parse(localStorage.getItem('jeeMainResults') || '[]');
            targetResults = allResults.filter(attempt => attempt.testName === TARGET_TEST_NAME);

            attemptsList.innerHTML = '';

            if (targetResults.length === 0) {
                attemptsList.innerHTML = `<li class="no-attempts">No past attempts found for ${TARGET_TEST_NAME}.</li>`;
                noResultsMessage.textContent = `Select an attempt from the list (if available) to view details for ${TARGET_TEST_NAME}.`;
                noResultsMessage.style.display = 'flex';
                detailedResultsArea.style.display = 'none';
                printButton.style.display = 'none'; // Hide print button if no results
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
            printButton.style.display = 'none'; // Hide print button initially


        } catch (error) {
            console.error("Error loading or filtering results from localStorage:", error);
            attemptsList.innerHTML = '<li class="no-attempts">Error loading attempts. Check console.</li>';
            noResultsMessage.textContent = 'Could not load result data.';
            noResultsMessage.style.display = 'flex';
            detailedResultsArea.style.display = 'none';
            printButton.style.display = 'none'; // Hide print button on error
        }
    }

    // --- Display Details for Selected Attempt ---
    function displayAttemptDetails(filteredIndex) {
        const selectedAttempt = targetResults[filteredIndex];
        if (!selectedAttempt || !selectedAttempt.summary || !selectedAttempt.detailedData) {
            console.error("Selected attempt data is missing or incomplete.", selectedAttempt);
             alert("Could not load details for this attempt.");
            detailedResultsArea.style.display = 'none'; // Hide details area
            printButton.style.display = 'none';     // Hide print button
            noResultsMessage.style.display = 'flex'; // Show placeholder message
            noResultsMessage.textContent = 'Error loading details for this attempt.';
            return;
        }

        noResultsMessage.style.display = 'none';
        detailedResultsArea.style.display = 'block';
        printButton.style.display = 'inline-block'; // <-- Show the print button

        attemptTimestampEl.textContent = `Attempt Time: ${selectedAttempt.timestamp}`;

        const summary = selectedAttempt.summary;
        currentDetailedData = selectedAttempt.detailedData; // Store data for potential full print
        const sections = [...new Set(currentDetailedData.map(q => q.section).filter(Boolean))];

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
            // *** IMPORTANT: Modified click listener to allow printing all questions later ***
            tab.addEventListener('click', (e) => {
                const clickedTab = e.target;
                 // Update active tab style
                reviewSectionTabsContainer.querySelectorAll('.review-section-tab').forEach(t => {
                    t.classList.toggle('active', t === clickedTab);
                });
                // Show questions for this section only for screen view
                showDetailedReviewQuestions(clickedTab.dataset.section, currentDetailedData, true);
            });
            reviewSectionTabsContainer.appendChild(tab);
        });

        // Initially display the detailed review for the first section for screen view
         if (sections.length > 0) {
            showDetailedReviewQuestions(sections[0], currentDetailedData, true); // Show only first section initially
         } else {
             reviewQuestionsContainer.innerHTML = '<p class="no-review-questions">No questions data available for review.</p>';
         }
         detailedResultsArea.scrollTop = 0; // Scroll to top
    }

    // --- Show Questions for Selected Review Section ---
    // Added 'onlyThisSection' flag
    function showDetailedReviewQuestions(sectionName, detailedData, onlyThisSection = false) {

        // Find the questions to show
        const questionsToShow = onlyThisSection
            ? detailedData.filter(q => q.section === sectionName)
            : detailedData; // If not onlyThisSection, get all questions

        reviewQuestionsContainer.innerHTML = ''; // Clear previous questions

        if (questionsToShow.length === 0) {
            reviewQuestionsContainer.innerHTML = `<p class="no-review-questions">No questions found ${onlyThisSection ? `in the '${sectionName}' section` : ''} for this attempt.</p>`;
            return;
         }

        // Keep track of section changes if showing all questions
        let currentSection = null;

        questionsToShow.forEach((q, index) => { // Use overall index if showing all
            // If showing all questions, add a section header when the section changes
            if (!onlyThisSection && q.section !== currentSection) {
                currentSection = q.section;
                const sectionHeader = document.createElement('h4');
                sectionHeader.textContent = `Section: ${currentSection}`;
                sectionHeader.style.marginTop = '20px';
                sectionHeader.style.paddingTop = '10px';
                sectionHeader.style.borderTop = '1px solid #ccc';
                sectionHeader.classList.add('print-section-header'); // Add class for potential print styling
                reviewQuestionsContainer.appendChild(sectionHeader);
            }

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('review-question-item');
             // Add section identifier for potential filtering/styling
            itemDiv.dataset.section = q.section;

            // --- Determine Correct Answer Display ---
            let correctAnswerDisplay = q.correctAnswer ?? 'N/A';
             if (q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null && q.options[q.correctAnswer] !== undefined) {
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
                 userAnswerDisplay = `(${String.fromCharCode(65 + q.userAnswer)}) ${q.options[q.userAnswer]}`;
                 if (q.resultStatus === 'incorrect') userAnswerClass += ' incorrect-ans';
             } else if (q.type === 'integer' && q.userAnswer != null) {
                  userAnswerDisplay = q.userAnswer;
                  if (q.resultStatus === 'incorrect') userAnswerClass += ' incorrect-ans';
             }

             const resultStatusDisplay = q.resultStatus || 'unknown'; // e.g., 'correct', 'incorrect', 'unattempted'
             const statusClass = `review-status ${resultStatusDisplay}`; // Class for styling status

             // Find the original question number within its section if needed (can be complex)
             // For simplicity, just use the index in the displayed list
             const displayQuestionNumber = index + 1;

             // --- Construct Inner HTML with Solution Section ---
            itemDiv.innerHTML = `
                <div class="question-number">Question ${displayQuestionNumber} (ID: ${q.id || 'N/A'}) ${onlyThisSection ? '' : `[${q.section}]`}</div>
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
            MathJax.typesetPromise([reviewQuestionsContainer]) // Target the main container
                .catch((err) => console.error('Viewresult.js: MathJax typesetting error:', err));
        } else if (typeof MathJax === 'undefined') {
             console.warn(`Viewresult.js: MathJax is not yet available. Typesetting skipped for section: ${sectionName}`);
        }

        // Scroll only if viewing a single section interactively
        if (onlyThisSection) {
            reviewQuestionsContainer.scrollTop = 0; // Scroll review container to top
        }
    }

    // --- Add Print Button Event Listener ---
    printButton.addEventListener('click', () => {
        console.log("Print button clicked.");

        // ** Crucial Step for Printing ALL Questions **
        // Temporarily render all questions into the container before printing.
        // We re-use the showDetailedReviewQuestions function but tell it NOT to filter by section.
        // This ensures all question content is in the DOM for the print CSS to handle.
        console.log("Rendering all questions for printing...");
        showDetailedReviewQuestions(null, currentDetailedData, false); // Pass null section, false for onlyThisSection

        // Optionally wait a very short moment for MathJax rendering if it's extremely complex,
        // but usually the browser print preview handles it.
        // setTimeout(() => {
            console.log("Calling window.print()...");
            window.print(); // Trigger the browser's print dialog

            // ** Optional: Restore View After Printing **
            // After the print dialog closes (or is cancelled), restore the view
            // to show only the previously selected section's questions.
            // This might require finding the active tab again.
            setTimeout(() => { // Use a timeout to ensure print dialog is likely closed
                const activeTab = reviewSectionTabsContainer.querySelector('.review-section-tab.active');
                if (activeTab) {
                    console.log(`Restoring view to section: ${activeTab.dataset.section}`);
                    showDetailedReviewQuestions(activeTab.dataset.section, currentDetailedData, true);
                } else {
                    // If no tab was active (e.g., only one section), show the first one
                    const firstTab = reviewSectionTabsContainer.querySelector('.review-section-tab');
                    if (firstTab) {
                        console.log(`Restoring view to first section: ${firstTab.dataset.section}`);
                        showDetailedReviewQuestions(firstTab.dataset.section, currentDetailedData, true);
                    }
                }
            }, 500); // Adjust delay if needed

        // }, 100); // Short delay example

    });


    // --- Initial Load ---
    loadAndFilterAttempts();

});