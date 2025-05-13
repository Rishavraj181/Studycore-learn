document.addEventListener('DOMContentLoaded', function() {
    // --- Main Tab Switching Logic ---
    const tabs = document.querySelectorAll('.chapter-tab-nav .tab-link'); // Corrected selector
    const tabContents = document.querySelectorAll('.tab-panel');         // Corrected selector

    if (tabs.length > 0 && tabContents.length > 0) {
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

                // Update tabs appearance and ARIA attributes
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Update tab content visibility
                tabContents.forEach(tc => {
                    tc.classList.remove('active');
                });
                targetContent.classList.add('active');


                // Optional: Clear PDF viewer when switching AWAY from notes
                // This part is tricky because the elements are *inside* the notes tab
                // We should only attempt to clear if we are NOT switching TO the notes tab
                // and the notes tab elements are available.
                if (targetId !== 'notes-content') {
                    const pdfEmbedContainerNotes = document.getElementById('pdf-embed-container-notes'); // Assumes this ID is unique
                    const pdfTitleElementNotes = document.getElementById('pdf-title-notes'); // Assumes this ID is unique

                    if (pdfEmbedContainerNotes && pdfTitleElementNotes) {
                        // Only reset if an iframe is currently loaded to avoid clearing placeholder unnecessarily
                        if (pdfEmbedContainerNotes.querySelector('iframe')) {
                            pdfEmbedContainerNotes.innerHTML = '<p>PDF viewer will appear here.</p>';
                            pdfTitleElementNotes.textContent = 'Select a Note above to view';
                        }
                    }
                }
            });
        });
    } else {
        console.warn("Chapter tabs or tab contents not found on this page. Tab functionality might be affected.");
    }
    // --- End Main Tab Switching Logic ---


    // --- Exercise Filter Logic (Your Existing Code - currently not used/styled in refined HTML) ---
    // const exerciseFiltersContainer = document.querySelector('.exercise-filters');
    // if (exerciseFiltersContainer) {
    //     // ... (your existing filter logic - ensure selectors match if you re-add filters)
    //     console.log("Exercise filters container found (if HTML for it exists).");
    // }
    // --- End Exercise Filter Logic ---


    // =============================================
    // === Code for Inline PDF Viewer (Notes Tab) ===
    // =============================================
    const notesTabPanel = document.getElementById('notes-content'); // The <section> for notes

    if (notesTabPanel) { // Only proceed if the notes tab panel itself exists
        const pdfEmbedContainerNotes = notesTabPanel.querySelector('#pdf-embed-container-notes'); // Find within notes tab
        const pdfTitleElementNotes = notesTabPanel.querySelector('#pdf-title-notes');         // Find within notes tab
        const pdfLinksNotes = notesTabPanel.querySelectorAll('.pdf-viewer-link');             // Find within notes tab

        if (pdfEmbedContainerNotes && pdfTitleElementNotes && pdfLinksNotes.length > 0) {
            function loadPdfInNotes(gdriveId, title) {
                if (!gdriveId || gdriveId.trim() === '' || gdriveId.toUpperCase() === 'YOUR_GDRIVE_ID_HERE') {
                    pdfTitleElementNotes.textContent = 'Error: PDF Not Configured';
                    pdfEmbedContainerNotes.innerHTML = '<p style="color: red; font-weight: bold;">This note is not yet configured. Please provide a valid Google Drive ID.</p>';
                    console.warn("Attempted to load PDF with missing/placeholder ID:", gdriveId);
                    return;
                }
                pdfTitleElementNotes.textContent = title || 'Loading PDF...';
                pdfEmbedContainerNotes.innerHTML = ''; // Clear previous
                const iframe = document.createElement('iframe');
                const embedUrl = `https://drive.google.com/file/d/${gdriveId}/preview`;
                iframe.src = embedUrl;
                iframe.allow = "autoplay"; // Recommended for Google Drive
                iframe.setAttribute('frameborder', '0'); // For cleaner look
                // Width and height are controlled by CSS via .pdf-embed-container iframe
                pdfEmbedContainerNotes.appendChild(iframe);
            }

            pdfLinksNotes.forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    const clickedLink = event.target.closest('.pdf-viewer-link');
                    if (!clickedLink) {
                        console.warn("Could not find '.pdf-viewer-link' for clicked element:", event.target);
                        return;
                    }
                    const gdriveId = clickedLink.dataset.gdriveId;
                    const title = clickedLink.dataset.title;

                    loadPdfInNotes(gdriveId, title);

                    const displayArea = notesTabPanel.querySelector('#pdf-display-area-notes');
                    if (displayArea) {
                        displayArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            });

        } else {
            // This block runs if essential PDF viewer elements are missing inside the notes tab,
            // OR if there are no .pdf-viewer-link elements.
            if (pdfEmbedContainerNotes && pdfTitleElementNotes) { // Check if the containers exist at least
                 if (pdfLinksNotes.length === 0) { // If no links, then definitely no notes to show
                    pdfTitleElementNotes.textContent = 'Notes';
                    pdfEmbedContainerNotes.innerHTML = '<p>No notes available for this chapter yet.</p>';
                 }
            } else {
                // console.log('PDF viewer structure (container or title) is missing within the notes tab.');
            }
        }
    } // End check for notesTabPanel
    // === End Code for Inline PDF Viewer ===

}); // End DOMContentLoaded listener