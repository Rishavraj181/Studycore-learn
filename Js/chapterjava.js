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

                // --- Optional: Clear PDF viewer when switching AWAY from notes ---
                // Check if we are switching AWAY from the notes tab
                // And if the notes viewer elements exist
                const pdfEmbedContainerNotes = document.getElementById('pdf-embed-container-notes');
                const pdfTitleElementNotes = document.getElementById('pdf-title-notes');

                if (targetId !== 'notes-content' && pdfEmbedContainerNotes && pdfTitleElementNotes) {
                    pdfEmbedContainerNotes.innerHTML = '<p>PDF viewer will appear here.</p>'; // Reset placeholder
                    pdfTitleElementNotes.textContent = 'Select a Note above to view'; // Reset title
                }
                // --- End Optional Clear ---

            });
        });
    }
    // --- End Main Tab Switching Logic ---


    // --- Exercise Filter Logic (Your Existing Code) ---
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


    // =============================================
    // === NEW Code for Inline PDF Viewer (Notes Tab) ===
    // =============================================
    const notesTabContent = document.getElementById('notes-content'); // Get the specific tab content div

    // Only proceed if the notes tab container exists on this page
    if (notesTabContent) {
        // Select elements *within* the notesTabContent to avoid conflicts
        const pdfEmbedContainerNotes = notesTabContent.querySelector('#pdf-embed-container-notes');
        const pdfTitleElementNotes = notesTabContent.querySelector('#pdf-title-notes');
        const pdfLinksNotes = notesTabContent.querySelectorAll('.pdf-viewer-link'); // Select only links in notes

        // Check if the necessary elements for the PDF viewer were found inside the notes tab
        if (pdfEmbedContainerNotes && pdfTitleElementNotes && pdfLinksNotes.length > 0) {

            // Function to load the PDF into the iframe within the Notes tab
            function loadPdfInNotes(gdriveId, title) {
                // Check for missing or placeholder ID
                if (!gdriveId || gdriveId.trim() === '' || gdriveId === 'YOUR_GDRIVE_ID_HERE') {
                    pdfTitleElementNotes.textContent = 'Error: PDF Not Configured';
                    pdfEmbedContainerNotes.innerHTML = '<p>A valid Google Drive ID is required for this note.</p>';
                    console.warn("Attempted to load PDF with missing/placeholder ID:", gdriveId);
                    return;
                }

                // Update the title
                pdfTitleElementNotes.textContent = title || 'Loading PDF...';

                // Clear the container and create the iframe
                pdfEmbedContainerNotes.innerHTML = ''; // Clear previous content/iframe
                const iframe = document.createElement('iframe');

                // Construct the Google Drive embed URL
                const embedUrl = `https://drive.google.com/file/d/${gdriveId}/preview`;

                // Set iframe attributes
                iframe.src = embedUrl;
                // Width and Height are controlled by CSS (100%)
                iframe.allow = "autoplay"; // Recommended by Google Drive embed
                iframe.setAttribute('frameborder', '0'); // Ensure no border

                // Append the new iframe to the container
                pdfEmbedContainerNotes.appendChild(iframe);
            }

            // Add click event listeners to all PDF links *within the Notes tab*
            pdfLinksNotes.forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault(); // Prevent the link default # navigation

                    // Use .closest() to ensure we get the link element,
                    // even if the user clicks an icon/span inside it
                    const clickedLink = event.target.closest('.pdf-viewer-link');
                    if (!clickedLink) {
                        console.warn("Could not find parent '.pdf-viewer-link' for clicked element:", event.target);
                        return; // Exit if click wasn't on a link or its child
                    }

                    // Get the ID and title from the clicked link's data attributes
                    const gdriveId = clickedLink.dataset.gdriveId;
                    const title = clickedLink.dataset.title;

                    // Load the PDF using the function
                    loadPdfInNotes(gdriveId, title);

                    // Optional: Scroll the viewer area into view smoothly
                    const displayArea = notesTabContent.querySelector('#pdf-display-area-notes');
                    if (displayArea) {
                        // Use 'nearest' to avoid excessive scrolling if already visible
                        displayArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            });

        } else {
            // This is normal if the page doesn't have the notes PDF viewer structure
            // console.log('PDF viewer elements not found within the notes tab (this might be expected).');
            // Optionally hide the display area if elements are missing but the area exists
             const displayArea = notesTabContent.querySelector('#pdf-display-area-notes');
             if(displayArea) {
                 // Only hide if links are missing, otherwise show placeholder
                 if (pdfLinksNotes.length === 0) {
                    displayArea.style.display = 'none';
                 }
             }
        }
    } // End check for notesTabContent existence
    // === End NEW Code for Inline PDF Viewer ===


}); // End DOMContentLoaded listener