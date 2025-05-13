// common-subject-page.js
document.addEventListener('DOMContentLoaded', () => {
    const subjectCards = document.querySelectorAll('.subject-card');
    const allChapterSections = document.querySelectorAll('.chapter-display-section');

    // Function to get the currently active page from URL or a body class
    function getCurrentPageContext() {
        const bodyClasses = document.body.className.split(' ');
        if (bodyClasses.includes('jee-page')) return 'jee';
        if (bodyClasses.includes('neet-page')) return 'neet';
        if (bodyClasses.includes('class12-page')) return 'class12';
        // Fallback or more robust detection might be needed
        const path = window.location.pathname.toLowerCase();
        if (path.includes("jee.html")) return "jee";
        if (path.includes("neet.html")) return "neet";
        if (path.includes("class12.html")) return "class12";
        return null; // Or a default
    }
    const pageContext = getCurrentPageContext();


    subjectCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove 'active' class from all cards
            subjectCards.forEach(c => c.classList.remove('active'));
            // Add 'active' class to the clicked card
            card.classList.add('active');

            const targetChapterSectionId = card.dataset.target;

            // Hide all chapter sections first
            allChapterSections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('visible');
            });

            // Show the target chapter section
            if (targetChapterSectionId) {
                const targetSection = document.getElementById(targetChapterSectionId);
                if (targetSection) {
                    targetSection.style.display = 'block'; // Make it block first
                    // Use a tiny timeout to allow the 'display: block' to apply before adding 'visible' for transition
                    setTimeout(() => {
                        targetSection.classList.add('visible');
                        // Scroll to the chapter list smoothly
                        // Only scroll if the section is not already in view near the top
                        const rect = targetSection.getBoundingClientRect();
                        if (rect.top < 0 || rect.bottom > window.innerHeight * 0.8) { // Check if it's mostly out of view
                           targetSection.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                        }
                    }, 10); // A small delay (10ms) is often enough
                } else {
                    console.warn(`Chapter section with ID "${targetChapterSectionId}" not found.`);
                }
            }
        });
    });

    // Optional: Automatically open the first subject's chapters if on a specific page
    // and no card is pre-selected (e.g., via URL hash or local storage)
    // This requires knowing which subject is "first" for each page.
    // Example: If on jee.html, and physics is the first card:
    if (pageContext === 'jee' && subjectCards.length > 0) {
        // Find the first card that corresponds to the page context or a default
        const firstJeeCard = document.querySelector('.subject-card[data-target^="jee-"]');
        if (firstJeeCard) {
            // firstJeeCard.click(); // Simulate a click to open it
        }
    }
    // Similar logic for neet and class12 if desired for auto-opening
});