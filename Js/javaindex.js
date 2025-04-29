/**
 * javaindex.js
 * Handles showing/hiding chapter lists on the JEE main page
 * based on clicked subject card.
 */
document.addEventListener('DOMContentLoaded', () => {

    // Get all the clickable subject cards
    const subjectCardButtons = document.querySelectorAll('.subject-card-button');

    // Get all the chapter list containers
    const chapterLists = document.querySelectorAll('.chapter-list');

    // Check if elements were found
    if (subjectCardButtons.length === 0) {
        console.warn("No subject card buttons found with class 'subject-card-button'.");
        return;
    }
    if (chapterLists.length === 0) {
        console.warn("No chapter list containers found with class 'chapter-list'.");
        return;
    }

    // Add a click event listener to each subject card
    subjectCardButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the subject identifier (e.g., "physics") from the data attribute
            const subject = button.dataset.subject;
            if (!subject) {
                console.error("Clicked card is missing 'data-subject' attribute:", button);
                return;
            }

            // Construct the ID of the target chapter list (e.g., "physics-chapters")
            const targetListId = `${subject}-chapters`;
            const targetList = document.getElementById(targetListId);

            // --- Hide all chapter lists ---
            chapterLists.forEach(list => {
                list.style.display = 'none'; // Hide the list
                list.classList.remove('active'); // Remove active class if using CSS for display
            });

            // --- Deactivate all buttons visually ---
             subjectCardButtons.forEach(btn => {
                btn.classList.remove('active'); // Remove active class from all buttons
             });


            // --- Show the target chapter list ---
            if (targetList) {
                targetList.style.display = 'block'; // Show the target list
                targetList.classList.add('active'); // Add active class if using CSS for display

                 // --- Activate the clicked button visually ---
                 button.classList.add('active'); // Add active class to the clicked button

                 // Optional: Scroll the chapter list into view if it's off-screen
                 targetList.scrollIntoView({ behavior: 'smooth', block: 'start' });

            } else {
                console.error(`Chapter list with ID "${targetListId}" not found.`);
            }
        });
    });

}); // End DOMContentLoaded listener