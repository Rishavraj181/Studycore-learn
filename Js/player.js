/**
 * player.js
 * Handles functionality for the video player page (player.html).
 * - Loads video based on URL parameters.
 * - Populates study materials dynamically.
 * - Populates related videos dynamically.
 * - Handles tab switching.
 * - Manages back button navigation.
 * - Includes placeholder for star ratings.
 */

document.addEventListener('DOMContentLoaded', function() {

    // --- Get References to HTML Elements ---
    const iframePlayer = document.getElementById('gdrive-iframe');
    const videoContainer = document.getElementById('video-container');
    const errorMessage = document.getElementById('error-message');
    const pageTitleElement = document.querySelector('title');
    const headingElement = document.querySelector('.video-title-h1');
    const backButton = document.getElementById('backBtn');
    const tabsContainer = document.querySelector('.tabs');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const studyMaterialList = document.getElementById('study-material-list');
    const ratingStars = document.querySelectorAll('.star-rating span');
    const relatedVideosContainer = document.getElementById('related-videos-container');

    // --- Data Mappings (NEEDS USER DATA) ---

    // 1. Study Materials: Map VIDEO ID -> Array of Document Objects {title, id}
    const studyMaterialsMap = {
        "1pTm1TwpaEpFsNx8mvJxPyyL7kQWOK6CR": [
            { title: "NCERT (PDF)", id: "1rN-NYRmIOIDFFohpBjOQ9FDj-Xt2zqeP" }, // Replace with ACTUAL Document ID
            { title: "NOTES L-1", id: "GDRIVE_ID_FOR_MATHS_PRACTICE_PDF" } 
        ],
        "YOUR_FILE_ID_2": [ // Replace "YOUR_FILE_ID_2" with the ACTUAL GDrive ID for Video 2
            { title: "Unit and Dimension Slides", id: "GDRIVE_ID_FOR_UD_SLIDES_PDF" },
            { title: "Notes L-1",id: ""}
        ],
        "YOUR_FILE_ID_3": [], 
    };

    // 2. Related Videos: Map VIDEO ID -> Array of Related Video Objects {title, author, thumbnailUrl, gdriveId}
    const relatedVideosMap = {
        "1pTm1TwpaEpFsNx8mvJxPyyL7kQWOK6CR": [ // Related videos for Video 1
            {
                title: "Basic Maths_Lec_02",
                author: "Shantanu Singh",
                thumbnailUrl: "https://via.placeholder.com/320x180.png?text=Basic+Maths+Lec+02", 
                gdriveId: "YOUR_FILE_ID_RELATED_1" 
            },
            {
                title: "Unit and Dimension_Lec_01",
                author: "Shantanu Singh",
                thumbnailUrl: "https://via.placeholder.com/320x180.png?text=Unit+Dimension+Lec+01",
                gdriveId: "YOUR_FILE_ID_2" // Replace with GDrive ID for Video "Unit and Dimension_Lec_01"
            }
        ],
        "YOUR_FILE_ID_2": [ // Related videos for Video 2
            {
                title: "Basic Maths_Lec_01",
                author: "Shantanu Singh",
                thumbnailUrl: "https://via.placeholder.com/320x180.png?text=Basic+Maths+Lec+01",
                gdriveId: "YOUR_FILE_ID_1"
            },
             {
                title: "Unit and Dimension_Lec_02",
                author: "Shantanu Singh",
                thumbnailUrl: "https://via.placeholder.com/320x180.png?text=Unit+Dimension+Lec+02",
                gdriveId: "UNIT_DIM_LEC_02_ID" 
            }
        ],
        "YOUR_FILE_ID_3": [], 
    };
    // --------------------------------------------------------------------

    // --- Get URL Parameters ---
    const params = new URLSearchParams(window.location.search);
    const currentVideoId = params.get('gdriveId');
    let videoTitle = params.get('title');

    // --- Back Button Event Listener ---
    if (backButton) {
        backButton.addEventListener('click', () => {
            history.back(); // Go to the previous page in history
        });
    } else {
        console.warn("Back button element not found.");
    }

    // --- Main Function to Load Page Content ---
    function loadVideoContent() {
        if (currentVideoId) {
            // 1. Load Main Video
            if (iframePlayer) {
                const embedUrl = `https://drive.google.com/file/d/${currentVideoId}/preview`;
                iframePlayer.setAttribute('src', embedUrl);
            } else {
                console.error("Video iframe element not found.");
            }

            // 2. Set Page Title and Heading
            if (videoTitle) {
                try {
                    videoTitle = decodeURIComponent(videoTitle.replace(/\+/g, ' '));
                } catch (e) {
                    console.warn("Could not decode video title:", e);
                    // Use the raw title if decoding fails
                }
            } else {
                videoTitle = "Watch Video"; // Default title
            }
            if (pageTitleElement) pageTitleElement.textContent = videoTitle;
            if (headingElement) headingElement.textContent = videoTitle;

            // 3. Hide Error Message (since we have an ID)
            if (errorMessage) errorMessage.style.display = 'none';

            // 4. Populate Dynamic Content Sections
            populateStudyMaterials(currentVideoId);
            populateRelatedVideos(currentVideoId);

        } else {
            // --- Handle Case Where No Video ID is Provided ---
            console.error("No Google Drive File ID specified in URL parameter 'gdriveId'.");
            if (videoContainer) videoContainer.style.display = 'none'; // Hide player
            if (tabsContainer) tabsContainer.style.display = 'none'; // Hide tabs
            if (errorMessage) {
                 errorMessage.textContent = "Error: Video ID not found in URL. Cannot load video."; // More specific message
                 errorMessage.style.display = 'block'; // Show error message
            }
            if (headingElement) headingElement.textContent = `Error: Video Not Found`;
            if (pageTitleElement) pageTitleElement.textContent = "Error Loading Video";
            // Display error messages in dynamic sections too
            if (studyMaterialList) studyMaterialList.innerHTML = '<li class="no-material">Cannot load materials: Video ID missing.</li>';
             if (relatedVideosContainer) relatedVideosContainer.innerHTML = '<p class="loading-placeholder">Cannot load related videos: Video ID missing.</p>';
        }
    }

    // --- Function to Populate Study Materials Tab ---
    function populateStudyMaterials(videoId) {
        if (!studyMaterialList) {
            console.error("Study material list element not found.");
            return;
        }

        const materials = studyMaterialsMap[videoId]; // Find materials using video ID
        studyMaterialList.innerHTML = ''; // Clear existing list items

        if (materials && Array.isArray(materials) && materials.length > 0) {
            materials.forEach(doc => {
                if (!doc || !doc.id || !doc.title) {
                    console.warn("Skipping invalid study material entry:", doc);
                    return;
                }

                const listItem = document.createElement('li');
                const titleSpan = document.createElement('span');
                titleSpan.textContent = doc.title;
                listItem.appendChild(titleSpan);

                const viewLink = document.createElement('a');
                viewLink.href = `https://drive.google.com/file/d/${doc.id}/preview`; // Preview link
                viewLink.textContent = 'View';
                viewLink.classList.add('view-button'); // Use the class defined in CSS
                viewLink.setAttribute('target', '_blank');
                viewLink.setAttribute('rel', 'noopener noreferrer');
                listItem.appendChild(viewLink);

                studyMaterialList.appendChild(listItem);
            });
        } else {
            // No materials found or empty array
            const noMaterialItem = document.createElement('li');
            noMaterialItem.textContent = 'No study materials available for this video.';
            noMaterialItem.classList.add('no-material');
            studyMaterialList.appendChild(noMaterialItem);
        }
    }

    // --- Function to Populate Related Videos Tab ---
    function populateRelatedVideos(videoId) {
        if (!relatedVideosContainer) {
            console.error("Related videos container element not found.");
            return;
        }

        const relatedVids = relatedVideosMap[videoId]; // Find related videos for this ID
        relatedVideosContainer.innerHTML = ''; // Clear existing content

        if (relatedVids && Array.isArray(relatedVids) && relatedVids.length > 0) {
            relatedVids.forEach(vid => {
                if (!vid || !vid.gdriveId || !vid.title || !vid.author || !vid.thumbnailUrl) {
                    console.warn("Skipping invalid related video entry:", vid);
                    return;
                }

                // Create elements for the card
                const cardDiv = document.createElement('div');
                cardDiv.classList.add('related-video-card');

                const img = document.createElement('img');
                img.src = vid.thumbnailUrl;
                img.alt = vid.title;
                cardDiv.appendChild(img);

                const infoDiv = document.createElement('div');
                infoDiv.classList.add('info');

                const titleH4 = document.createElement('h4');
                titleH4.textContent = vid.title;
                infoDiv.appendChild(titleH4);

                const authorP = document.createElement('p');
                authorP.textContent = vid.author;
                infoDiv.appendChild(authorP);

                const watchButton = document.createElement('a');
                const encodedTitle = encodeURIComponent(vid.title).replace(/%20/g, '+');
                watchButton.href = `player.html?gdriveId=${vid.gdriveId}&title=${encodedTitle}`;
                watchButton.classList.add('related-watch-button'); // Defined in CSS
                watchButton.textContent = 'Watch Now';
                infoDiv.appendChild(watchButton);

                cardDiv.appendChild(infoDiv);
                relatedVideosContainer.appendChild(cardDiv);
            });
        } else {
            // No related videos found
            const noVidsMessage = document.createElement('p');
            noVidsMessage.textContent = 'No related videos available.';
            noVidsMessage.classList.add('loading-placeholder'); // Reuse style
            relatedVideosContainer.appendChild(noVidsMessage);
        }
    }

    // --- Tab Switching Logic ---
    if (tabLinks.length > 0 && tabContents.length > 0) {
        tabLinks.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTabId = tab.getAttribute('data-tab');
                if (!targetTabId) return; // Prevent errors if data-tab is missing

                // Deactivate all tabs and content panels
                tabLinks.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Activate the clicked tab and its corresponding content panel
                tab.classList.add('active');
                const targetContent = document.getElementById(targetTabId + '-content');
                if (targetContent) {
                    targetContent.classList.add('active');
                } else {
                    console.warn(`Content panel not found for tab: ${targetTabId}`);
                }
            });
        });
    } else {
        console.warn("Tab elements not found. Tab switching disabled.");
    }

    // --- Placeholder Star Rating Interaction ---
    if (ratingStars.length > 0) {
        ratingStars.forEach((star, index) => {
            star.addEventListener('click', () => {
                // Remove 'selected' from all stars first
                ratingStars.forEach(s => s.classList.remove('selected'));
                // Add 'selected' up to the clicked star (index is 0-based)
                for (let i = 0; i <= index; i++) {
                    if(ratingStars[i]) ratingStars[i].classList.add('selected');
                }
                const rating = index + 1;
                console.log(`Rated: ${rating} stars`); // Demo output
                // In a real app, you would send 'rating' to a backend here.
            });
        });
    } else {
        console.warn("Rating star elements not found.");
    }

    // --- Initial Load ---
    // Call the main function to start loading content when the DOM is ready.
    loadVideoContent();

}); // End of DOMContentLoaded