// player.js

/**
 * Function to display an error message to the user, typically replacing the player area.
 * @param {string} message The error message to display.
 */
function displayError(message) {
    console.error("Player Error:", message); // Log detailed error to console
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.innerHTML = `<p style="color: red; background-color: #ffe0e0; padding: 20px; border: 1px solid red; text-align: center;">Error loading video: ${message}</p>`;
    }
    // Optionally hide the tabs as well if the core video failed
    const tabs = document.querySelector('.video-info-tabs');
    if (tabs) {
        tabs.style.display = 'none';
    }
}

/**
 * Handles switching between content tabs below the video player.
 * @param {Event|null} evt The click event object (or null if called programmatically).
 * @param {string} tabName The ID of the tab content element to display.
 */
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;

    // Hide all tab content sections
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }

    // Remove 'active' class from all tab buttons
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Show the target tab content
    const currentTab = document.getElementById(tabName);
    if (currentTab) {
        currentTab.style.display = "block";
        currentTab.classList.add("active"); // For potential styling
    } else {
        console.warn(`Tab content with ID '${tabName}' not found.`);
    }

    // Add 'active' class to the clicked button (if called by event)
    // Or find the button corresponding to tabName if called programmatically
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    } else if (tabName) {
         // Find the button whose onclick contains the target tabName
         const initialButton = document.querySelector(`.tab-button[onclick*="'${tabName}'"]`);
         if (initialButton) {
             initialButton.classList.add('active');
         }
    }
}


/**
 * Placeholder function to load timeline data (replace with actual logic).
 * @param {string|null} videoId The unique ID of the video.
 * @param {HTMLElement|null} listElement The UL element to populate.
 */
function loadTimelineData(videoId, listElement) {
    console.log(`Attempting to load timeline for videoId: ${videoId || 'N/A'}`);
    if (!listElement) {
        console.warn("Timeline list element not found.");
        return;
    }
    // --- Replace with your actual timeline loading logic ---
    // Example: Fetch data based on videoId, then populate the list.
    // You might have a mapping in JS or fetch from an API if you add a backend.
    listElement.innerHTML = `<li>Timeline data for '${videoId || 'this video'}' is not yet implemented.</li>`;
    // Example of how seeking would work if you had items like <li data-time="120">...</li>
    /*
    listElement.querySelectorAll('li[data-time]').forEach(item => {
        item.style.cursor = 'pointer';
        item.onclick = (event) => {
            const time = parseFloat(event.currentTarget.dataset.time);
            const player = videojs.getPlayer('lecture-player'); // Get player instance
            if (player && !isNaN(time)) {
                player.currentTime(time);
                player.play(); // Optional: start playing after seeking
            }
        };
    });
    */
}

/**
 * Placeholder function to load related videos (replace with actual logic).
 * @param {string|null} videoId The unique ID of the video.
 * @param {HTMLElement|null} containerElement The DIV element to populate.
 */
function loadRelatedVideos(videoId, containerElement) {
    console.log(`Attempting to load related videos for videoId: ${videoId || 'N/A'}`);
     if (!containerElement) {
         console.warn("Related videos container element not found.");
         return;
     }
    // --- Replace with your actual related videos loading logic ---
    // Example: Fetch data based on videoId or current category, then create cards.
    containerElement.innerHTML = `<p>Loading related videos for '${videoId || 'this video'}' is not yet implemented.</p>`;
    /* Example card structure if you loaded data:
       const relatedVideo = { title: "Another Lecture", instructor: "Some Instructor", link: "player.html?videoId=...", thumb: "..." };
       containerElement.innerHTML += `
           <div class="related-video-card">
               <img src="${relatedVideo.thumb}" alt="Instructor">
               <div>
                   <h4>${relatedVideo.title}</h4>
                   <p>by ${relatedVideo.instructor}</p>
                   <a href="${relatedVideo.link}" class="watch-button">Watch Now</a>
               </div>
           </div>
       `;
    */
}


// --- Main Execution Logic ---
// Wait for the HTML document structure to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // --- 1. Get and Validate URL Parameters ---
    const params = new URLSearchParams(window.location.search);
    console.log("URL Search Params:", params.toString());

    const videoId = params.get('videoId'); // Optional, but useful for related data
    const videoSrc = params.get('videoSrc');
    const title = params.get('title');
    const posterSrc = params.get('posterSrc');
    const studyMaterialSrc = params.get('studyMaterialSrc');

    console.log(`Extracted Params: videoId=${videoId}, videoSrc=${videoSrc}, title=${title}, posterSrc=${posterSrc}, studyMaterialSrc=${studyMaterialSrc}`);

    // **Critical Validation:** We absolutely need a video source.
    if (!videoSrc) {
        displayError("No video source (videoSrc) provided in the URL.");
        return; // Stop execution
    }

    // --- 2. Update Static HTML Elements ---
    const breadcrumbsContainer = document.getElementById('breadcrumbs-container');
    const notesTitle = document.getElementById('notes-lecture-title');
    const ratingsTitle = document.getElementById('ratings-lecture-title');
    const studyMaterialContent = document.getElementById('study-material-content');

    // Set Page Title
    document.title = title ? `${title} | Video Player` : 'Video Player';

    // Set Breadcrumbs (customize path as needed)
    if (breadcrumbsContainer) {
        breadcrumbsContainer.textContent = `Physics > ${title || 'Current Lecture'}`;
    }

    // Set Titles within Tabs
    const lectureDisplayName = title || 'this Lecture';
    if (notesTitle) notesTitle.textContent = lectureDisplayName;
    if (ratingsTitle) ratingsTitle.textContent = lectureDisplayName;

    // Update Study Material Tab
    if (studyMaterialContent) {
        if (studyMaterialSrc) {
            // Use textContent for safety if the title might have HTML, but innerHTML is needed for the link
             studyMaterialContent.innerHTML = `
                <a href="${studyMaterialSrc}" download="StudyMaterial_${videoId || 'Lecture'}.pdf"> <!-- Optional: Suggest a filename -->
                    Download Study Material for ${lectureDisplayName}
                    <span class="download-icon">📥</span>
                </a>`;
        } else {
            studyMaterialContent.textContent = 'No study material available for this lecture.';
        }
    } else {
         console.warn("Study material content element not found.");
    }


    // --- 3. Prepare Video.js Options ---
    const playerOptions = {
        controls: true,
        autoplay: false, // Standard practice unless specifically required
        preload: 'auto', // 'auto' (load metadata + maybe some data), 'metadata' (only metadata), 'none'
        playbackRates: [0.5, 1, 1.5, 2, 2.5, 3, 4], // Customize speeds as needed
        sources: [
            {
                src: videoSrc,
                // Determine type dynamically if needed, but mp4 is common
                type: 'video/mp4'
                // Example for other types:
                // type: videoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4'
            }
        ]
        // Add other Video.js options here if necessary
    };

    // **Safely Add Poster:** Only add the poster option if posterSrc is a valid, non-empty string.
    if (posterSrc && typeof posterSrc === 'string' && posterSrc.trim() !== '') {
        playerOptions.poster = posterSrc;
        console.log("Applying poster image:", posterSrc);
    } else if (posterSrc) {
         console.warn("posterSrc parameter provided but seems invalid or empty. Ignoring.");
    }

    console.log("Final Video.js options:", JSON.stringify(playerOptions, null, 2)); // Log options for inspection

    // --- 4. Initialize Video.js Player ---
    const playerElementId = 'lecture-player';
    const playerElement = document.getElementById(playerElementId);

    if (!playerElement) {
        displayError(`Cannot find video element with ID '${playerElementId}'. Check player.html.`);
        return; // Stop execution
    }

    try {
        const player = videojs(playerElementId, playerOptions);

        // --- 5. Setup Player Event Listeners (Optional but Recommended) ---
        player.ready(() => {
            console.log("Video.js Player is Ready!");
            // You can perform actions here once the player is fully initialized
            // E.g., load dynamic timeline markers based on video duration: player.duration()
        });

        player.on('error', () => {
            const error = player.error();
            console.error("Video.js Playback Error:", error);
            // Display a more user-friendly error in the player itself if needed
             displayError(`Could not play video. Code: ${error.code}, Message: ${error.message}`);
        });

        player.on('loadedmetadata', () => {
            console.log(`Video metadata loaded. Duration: ${player.duration()} seconds.`);
             // Now is a good time to load timeline data if it depends on duration
             const timelineList = document.getElementById('timeline-list');
             loadTimelineData(videoId, timelineList); // Load timeline now we know video details
        });

         // --- 6. Load Other Dynamic Tab Content ---
         // Related videos might not depend on the player being ready
         const relatedVideosList = document.getElementById('related-videos-list');
         loadRelatedVideos(videoId, relatedVideosList);


    } catch (error) {
        // Catch errors during the synchronous videojs() initialization call itself
        displayError(`Failed to initialize Video.js player. ${error.message}`);
        console.error("Video.js Initialization Error Details:", error);
        return; // Stop execution
    }

    // --- 7. Activate the Default Tab ---
    // Ensure this happens after potential player errors might have hidden the tabs
    const tabsContainer = document.querySelector('.video-info-tabs');
    if (tabsContainer && tabsContainer.style.display !== 'none') {
        openTab(null, 'myNotes'); // Or whichever tab should be active by default
        console.log("Default tab 'myNotes' activated.");
    }

}); // End DOMContentLoaded listener