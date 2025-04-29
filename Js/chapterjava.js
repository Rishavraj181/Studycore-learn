document.addEventListener('DOMContentLoaded', function() {
    // --- Main Tab Switching Logic (Your Existing Code) ---
    const tabs = document.querySelectorAll('.chapter-nav ul li a');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabs.length > 0 && tabContents.length > 0) { // Check added for safety
        tabs.forEach(tab => {
            tab.addEventListener('click', function(event) {
                event.preventDefault();
                const targetId = this.getAttribute('data-tab');
                if (!targetId) {
                    console.error("Clicked tab is missing 'data-tab' attribute:", this);
                    return;
                }
                const targetContent = document.getElementById(targetId);
                if (!targetContent) {
                    console.error(`Tab content with ID "${targetId}" not found.`);
                    return;
                }
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                this.classList.add('active');
                targetContent.classList.add('active');
            });
        });
    }
    // --- End Main Tab Switching Logic ---


    // --- NEW: Exercise Filter Logic (Pasted Here) ---
    const exerciseFiltersContainer = document.querySelector('.exercise-filters');

    if (exerciseFiltersContainer) {
        const filterButtons = exerciseFiltersContainer.querySelectorAll('.filter-button');
        // NOTE: You removed the span for link text, so we don't need to select/update it unless you add it back
        // const linkModeTexts = document.querySelectorAll('.exercise-list .link-mode-text');

        const setActiveFilter = (filterValue) => {
            filterButtons.forEach(btn => {
                if (btn.getAttribute('data-filter') === filterValue) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            sessionStorage.setItem('activeExerciseFilter', filterValue);
            // --- Update Links (Optional - IF you add spans back) ---
            // const linkText = filterValue === 'practice' ? 'Practice' : 'Test';
            // linkModeTexts.forEach(span => {
            //     span.textContent = linkText;
            // });
            // TODO LATER: Update the actual `href` of the links if "Practice" mode needs different URLs.
        };

        filterButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                const selectedFilter = this.getAttribute('data-filter');
                setActiveFilter(selectedFilter);
            });
        });

        const storedFilter = sessionStorage.getItem('activeExerciseFilter');
        if (storedFilter) {
            setActiveFilter(storedFilter);
        } else {
           // setActiveFilter('test'); // Set default if needed, otherwise HTML default applies
        }
    }
    // --- End Exercise Filter Logic ---

}); // End DOMContentLoaded listener