// --- JMresult.js ---
// Script for the master page listing all test results.

document.addEventListener('DOMContentLoaded', () => {
    const allAttemptsListElement = document.getElementById('all-attempts-list');

    function loadAllResults() {
        if (!allAttemptsListElement) {
            console.error("Element with ID 'all-attempts-list' not found.");
            return;
        }

        try {
            const allResults = JSON.parse(localStorage.getItem('jeeMainResults') || '[]');
            allAttemptsListElement.innerHTML = ''; // Clear loading message

            if (allResults.length === 0) {
                allAttemptsListElement.innerHTML = '<li class="no-results">No test results found in storage.</li>';
                return;
            }

            // Sort results by timestamp, newest first
            allResults.sort((a, b) => b.id - a.id); // Sort by unique ID (timestamp)

            allResults.forEach(attempt => {
                // Validate essential data for display and linking
                const testName = attempt.testName || 'Unnamed Test';
                const timestamp = attempt.timestamp || 'Unknown Date';
                const score = attempt.summary?.overallScore ?? 'N/A'; // Use optional chaining and nullish coalescing
                const resultPageUrl = attempt.resultPageUrl; // Get the specific URL

                const listItem = document.createElement('li');

                // Create the link only if the resultPageUrl exists
                if (resultPageUrl) {
                    const link = document.createElement('a');
                    link.href = resultPageUrl; // Link to the specific result page
                    link.innerHTML = `
                        <span class="attempt-test-name">${testName}</span>
                        <span class="attempt-timestamp">${timestamp}</span>
                        <span class="attempt-score">Score: ${score}</span>
                    `;
                    listItem.appendChild(link);
                } else {
                    // If no URL, display as plain text (or indicate error)
                    listItem.innerHTML = `
                        <div style="padding: 15px 20px;">
                             <span class="attempt-test-name">${testName}</span>
                             <span class="attempt-timestamp">${timestamp}</span>
                             <span class="attempt-score">Score: ${score}</span>
                             <small style="color: red; display: block; margin-top: 5px;">(Cannot view details - missing result page link)</small>
                        </div>
                    `;
                    listItem.style.cursor = 'not-allowed'; // Indicate it's not clickable
                    listItem.style.opacity = '0.7';
                }

                allAttemptsListElement.appendChild(listItem);
            });

        } catch (error) {
            console.error("Error loading or parsing results from localStorage:", error);
            allAttemptsListElement.innerHTML = '<li class="no-results">Error loading results. Storage might be corrupted.</li>';
        }
    }

    // --- Initial Load ---
    loadAllResults();

});