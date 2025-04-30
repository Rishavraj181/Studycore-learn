document.addEventListener('DOMContentLoaded', () => {
    // --- Get Elements ---
    const playerContainer = document.getElementById('player-container');
    const video = document.getElementById('videoPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const volumeBar = document.getElementById('volumeBar');
    const progressBar = document.getElementById('progressBar');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const timeDisplay = document.getElementById('timeDisplay');
    const videoTitleElement = document.getElementById('videoTitle');
    const errorMessageElement = document.getElementById('error-message');

    let isDraggingProgress = false; // Flag for dragging progress bar

    // --- Helper Functions ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1); // Remove '?'
        const regex = /([^&=]+)=([^&]*)/g;
        let m;
        while (m = regex.exec(queryString)) {
            // Decode URI components for both key and value
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        return params;
    }

    function displayError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
        playerContainer.style.display = 'none'; // Hide the player
        videoTitleElement.style.display = 'none'; // Hide the title area too
        document.title = "Error"; // Update page title
    }

    // --- Core Player Functions --- (Mostly same as before)
    function togglePlay() {
        if (!video.src) return; // Don't try to play if no source loaded
        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    }

    function updatePlayPauseIcon() {
        const icon = playPauseBtn.querySelector('i');
        if (video.paused || video.ended) {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            playerContainer.classList.add('paused'); // Keep controls visible
        } else {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            playerContainer.classList.remove('paused');
        }
    }

    function updateProgress() {
         if (isNaN(video.duration)) return; // Don't update if duration isn't available yet
        const percentage = (video.currentTime / video.duration) * 100;
        progressBar.value = percentage;
        const currentTime = formatTime(video.currentTime);
        const duration = formatTime(video.duration);
        timeDisplay.textContent = `${currentTime} / ${duration}`;
    }

    function scrub(e) {
         if (isNaN(video.duration)) return;
        const scrubTime = (e.offsetX / progressBar.offsetWidth) * video.duration;
        video.currentTime = scrubTime;
    }

    function handleProgressMouseDown(e) {
        if (isNaN(video.duration)) return;
        isDraggingProgress = true;
        scrub(e);
    }
    function handleProgressMouseMove(e) {
        if (!isDraggingProgress || isNaN(video.duration)) return;
        e.preventDefault();
        scrub(e);
    }
    function handleProgressMouseUp() {
         if (!isDraggingProgress) return;
        isDraggingProgress = false;
    }

    function toggleMute() {
        video.muted = !video.muted;
    }

    function updateMuteIcon() {
        const icon = muteBtn.querySelector('i');
        if (video.muted || video.volume === 0) {
            icon.classList.remove('fa-volume-up');
            icon.classList.add('fa-volume-mute');
            volumeBar.value = 0;
        } else {
            icon.classList.remove('fa-volume-mute');
            icon.classList.add('fa-volume-up');
            volumeBar.value = video.volume;
        }
    }

    function handleVolumeChange() {
        video.volume = volumeBar.value;
        video.muted = volumeBar.value === 0;
        updateMuteIcon();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement && !document.mozFullScreenElement &&
            !document.webkitFullscreenElement && !document.msFullscreenElement) {
            if (playerContainer.requestFullscreen) {
                playerContainer.requestFullscreen();
            } else if (playerContainer.mozRequestFullScreen) { playerContainer.mozRequestFullScreen(); }
            else if (playerContainer.webkitRequestFullscreen) { playerContainer.webkitRequestFullscreen(); }
            else if (playerContainer.msRequestFullscreen) { playerContainer.msRequestFullscreen(); }
             updateFullscreenIcon(true);
        } else {
            if (document.exitFullscreen) { document.exitFullscreen(); }
            else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
            else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
            else if (document.msExitFullscreen) { document.msExitFullscreen(); }
             updateFullscreenIcon(false);
        }
    }

    function updateFullscreenIcon(isFullscreen) {
        const icon = fullscreenBtn.querySelector('i');
        if (isFullscreen) {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
        } else {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
        }
    }

    // --- Initialization and URL Parameter Handling ---
    function initializePlayer() {
        const params = getQueryParams();
        const videoSrc = params['src']; // Use bracket notation for safety
        const videoTitle = params['title'] || 'Video Player'; // Default title
        const videoPoster = params['poster'];

        // **Crucial: Check if video source exists**
        if (!videoSrc) {
            displayError("Error: No video source specified in the URL. Please provide a 'src' parameter (e.g., player.html?src=path/to/video.mp4).");
            return; // Stop execution if no source
        }

        // Set title
        videoTitleElement.textContent = videoTitle;
        document.title = videoTitle; // Set browser tab title

        // Set video source and poster
        video.src = videoSrc;
        if (videoPoster) {
            video.poster = videoPoster;
        }

        // Load the video (browser often does this automatically when src is set, but explicit load() is good practice)
        video.load();

        // Initialize UI
        updatePlayPauseIcon();
        updateMuteIcon();
        volumeBar.value = video.volume;
        progressBar.value = 0;
        timeDisplay.textContent = "00:00 / 00:00";

        // Add Event Listeners
        video.addEventListener('play', updatePlayPauseIcon);
        video.addEventListener('pause', updatePlayPauseIcon);
        video.addEventListener('ended', updatePlayPauseIcon);
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('volumechange', updateMuteIcon);
        video.addEventListener('loadedmetadata', updateProgress); // Initial duration
        video.addEventListener('durationchange', updateProgress); // Duration might change

        // Robust Error Handling for the specific video
        video.addEventListener('error', (e) => {
            console.error("Video Error:", video.error);
            let errorMsg = `Error loading video: ${videoSrc}`;
            switch (video.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg += ' (Playback aborted).'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg += ' (Network error).'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg += ' (Decoding error or unsupported feature).'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg += ' (Format not supported or server/network error).'; break;
                default: errorMsg += ' (Unknown error).'; break;
            }
            displayError(errorMsg);
        });

        playPauseBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay); // Click video to play/pause
        muteBtn.addEventListener('click', toggleMute);
        volumeBar.addEventListener('input', handleVolumeChange);

        progressBar.addEventListener('mousedown', handleProgressMouseDown);
        document.addEventListener('mousemove', handleProgressMouseMove); // Listen globally for drag outside bar
        document.addEventListener('mouseup', handleProgressMouseUp); // Listen globally

        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Listen for fullscreen changes (e.g., user pressing Esc)
        document.addEventListener('fullscreenchange', () => updateFullscreenIcon(!!document.fullscreenElement));
        document.addEventListener('webkitfullscreenchange', () => updateFullscreenIcon(!!document.webkitFullscreenElement));
        document.addEventListener('mozfullscreenchange', () => updateFullscreenIcon(!!document.mozFullScreenElement));
        document.addEventListener('MSFullscreenChange', () => updateFullscreenIcon(!!document.msFullscreenElement));
    }

    // --- Start the Initialization ---
    initializePlayer();

});