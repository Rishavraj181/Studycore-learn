document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selection ---
    const youtubePlayer = document.getElementById('youtubePlayer');
    const videoTitleElement = document.getElementById('videoTitle');
    const studyMaterialTab = document.getElementById('studyMaterialTab');
    const relatedVideosTab = document.getElementById('relatedVideosTab');
    const videoTimelineList = document.getElementById('videoTimelineList');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const calculatorBtn = document.getElementById('calculatorBtn');
    const doubtsBtn = document.getElementById('doubtsBtn');
    const notesTextarea = document.getElementById('notesTextarea');
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    const notesStatus = document.getElementById('notesStatus');
    const starRatingContainer = document.querySelector('.star-rating');
    const stars = document.querySelectorAll('.star-rating .star');
    const currentRatingDisplay = document.getElementById('currentRating');
    const calculatorModal = document.getElementById('calculatorModal');
    const doubtsModal = document.getElementById('doubtsModal');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');
    const doubtForm = document.getElementById('doubtForm');
    const doubtStatus = document.getElementById('doubtStatus');
    const doubtFile = document.getElementById('doubtFile');
    const calcCurrentInputDisplay = document.getElementById('calcCurrentInput');
    const calcExpressionDisplay = document.getElementById('calcExpression');
    const calculatorButtons = document.querySelector('.calculator-buttons');

    // --- State Variables ---
    let currentVideoData = null;
    let currentYoutubeId = '';
    let calculatorState = {
        currentInput: '0',
        expression: '',
        operator: null,
        previousValue: null,
        shouldResetInput: false,
    };

    // --- Initialization ---
    function initPlayer() {
        const params = new URLSearchParams(window.location.search);
        currentYoutubeId = params.get('youtubeId');
        const titleFromUrl = params.get('title') || 'Lecture Video';

        if (!currentYoutubeId) {
            videoTitleElement.textContent = 'Error: Video ID not provided.';
            studyMaterialTab.innerHTML = '<p>No video selected.</p>';
            relatedVideosTab.innerHTML = '<p>No video selected.</p>';
            videoTimelineList.innerHTML = '<p>No video selected.</p>';
            return;
        }

        videoTitleElement.textContent = decodeURIComponent(titleFromUrl);
        const currentOrigin = `${window.location.protocol}//${window.location.host}`;
        youtubePlayer.src = `https://www.youtube.com/embed/${currentYoutubeId}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}`;

        fetch('video_data.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                currentVideoData = data.find(video => video.youtubeId === currentYoutubeId);
                if (currentVideoData) {
                    if (titleFromUrl === 'Lecture Video' && currentVideoData.title) {
                        videoTitleElement.textContent = currentVideoData.title;
                    }
                    loadStudyMaterial(currentVideoData.studyMaterial);
                    loadRelatedVideos(currentVideoData.relatedVideos);
                    loadTimeline(currentVideoData.timeline);
                    loadNotes();
                    loadRating();
                } else {
                    console.warn("No data found for this video");
                    studyMaterialTab.innerHTML = '<p>Study material not found for this video.</p>';
                    relatedVideosTab.innerHTML = '<p>Related videos not found.</p>';
                    videoTimelineList.innerHTML = '<p>Timeline not found for this video.</p>';
                }
            })
            .catch(error => {
                console.error('Error loading video data:', error);
                studyMaterialTab.innerHTML = `<p>Error loading study material: ${error.message}</p>`;
                relatedVideosTab.innerHTML = `<p>Error loading related videos: ${error.message}</p>`;
                videoTimelineList.innerHTML = `<p>Error loading timeline: ${error.message}</p>`;
            });

        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('light-mode');
            darkModeToggle.textContent = 'Toggle Dark Mode';
        } else {
            document.body.classList.remove('light-mode');
            darkModeToggle.textContent = 'Toggle Light Mode';
        }
        resetCalculator();
    }

    // --- Content Loading ---
    function loadStudyMaterial(materials) {
        if (!materials || materials.length === 0) {
            studyMaterialTab.innerHTML = '<p>No study material available for this video.</p>';
            return;
        }
        const ul = document.createElement('ul');
        materials.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.url;
            a.textContent = item.name;
            if (item.type === "PDF" || item.type === "Link" || item.external === true) {
                a.target = "_blank";
            }
            li.appendChild(a);
            if (item.type) {
                const typeSpan = document.createElement('span');
                typeSpan.className = 'material-type';
                typeSpan.textContent = `(${item.type})`;
                li.appendChild(typeSpan);
            }
            ul.appendChild(li);
        });
        studyMaterialTab.innerHTML = '';
        studyMaterialTab.appendChild(ul);
    }

    function loadRelatedVideos(videos) {
        if (!videos || videos.length === 0) {
            relatedVideosTab.innerHTML = '<p>No related videos available.</p>';
            return;
        }
        const ul = document.createElement('ul');
        videos.forEach(video => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = video.targetUrl;
            a.textContent = video.title;
            li.appendChild(a);
            ul.appendChild(li);
        });
        relatedVideosTab.innerHTML = '';
        relatedVideosTab.appendChild(ul);
    }

    // --- Timeline & Seeking ---
    function loadTimeline(timelineItems) {
        if (!timelineItems || timelineItems.length === 0) {
            videoTimelineList.innerHTML = '<li>No timeline available for this video.</li>';
            return;
        }
        videoTimelineList.innerHTML = '';
        timelineItems.forEach(item => {
            const li = document.createElement('li');
            const timeSpan = document.createElement('span');
            timeSpan.className = 'timeline-time';
            timeSpan.textContent = item.time;
            const descSpan = document.createElement('span');
            descSpan.textContent = item.description;
            li.appendChild(timeSpan);
            li.appendChild(descSpan);
            li.addEventListener('click', () => seekVideoToTimestamp(item.time));
            videoTimelineList.appendChild(li);
        });
    }

    function timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else if (parts.length === 1) seconds = parts[0];
        return seconds;
    }

    function seekVideoToTimestamp(time) {
        const seconds = timeToSeconds(time);
        if (youtubePlayer.contentWindow) {
            youtubePlayer.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*');
            youtubePlayer.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        } else {
            console.warn("Cannot communicate with iframe to seek.");
        }
    }

    // --- Tab Functionality ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // --- Hamburger Menu ---
    function toggleMenu() { sideMenu.classList.toggle('open'); menuOverlay.classList.toggle('active'); }
    hamburgerBtn.addEventListener('click', toggleMenu);
    closeMenuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);

    // --- Modal Management ---
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            if (sideMenu.classList.contains('open')) toggleMenu();
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.modalId)));
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal') && event.target.classList.contains('show')) {
            event.target.classList.remove('show');
        }
    });

    // --- Menu Options ---
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('darkMode', 'enabled');
            darkModeToggle.textContent = 'Toggle Dark Mode';
        } else {
            localStorage.setItem('darkMode', 'disabled');
            darkModeToggle.textContent = 'Toggle Light Mode';
        }
    });
    calculatorBtn.addEventListener('click', () => openModal('calculatorModal'));
    doubtsBtn.addEventListener('click', () => { openModal('doubtsModal'); doubtStatus.textContent = ''; doubtForm.reset(); });

    // --- Calculator Logic ---
    function updateCalculatorDisplay() { calcCurrentInputDisplay.textContent = calculatorState.currentInput; calcExpressionDisplay.textContent = calculatorState.expression; }
    function resetCalculator() { calculatorState = { currentInput: '0', expression: '', operator: null, previousValue: null, shouldResetInput: false }; updateCalculatorDisplay(); }
    function inputNumber(number) { if (calculatorState.shouldResetInput) { calculatorState.currentInput = ''; calculatorState.shouldResetInput = false; } calculatorState.currentInput = calculatorState.currentInput === '0' ? number : calculatorState.currentInput + number; updateCalculatorDisplay(); }
    function inputDecimal() { if (calculatorState.shouldResetInput) { calculatorState.currentInput = '0.'; calculatorState.shouldResetInput = false; updateCalculatorDisplay(); return; } if (!calculatorState.currentInput.includes('.')) calculatorState.currentInput += '.'; updateCalculatorDisplay(); }
    function performCalculation(val1, val2, operator) { const n1 = parseFloat(val1); const n2 = parseFloat(val2); switch (operator) { case '+': return n1 + n2; case '-': return n1 - n2; case '*': return n1 * n2; case '/': return n2 === 0 ? 'Error' : n1 / n2; default: return n2; } }
    function handleOperator(nextOperator) { const iv = parseFloat(calculatorState.currentInput); if (calculatorState.operator && calculatorState.previousValue !== null && !calculatorState.shouldResetInput) { const r = performCalculation(calculatorState.previousValue, iv, calculatorState.operator); calculatorState.currentInput = String(r); calculatorState.previousValue = r; calculatorState.expression += ` ${iv} ${nextOperator}`; } else { calculatorState.previousValue = iv; calculatorState.expression = `${iv} ${nextOperator}`; } calculatorState.operator = nextOperator; calculatorState.shouldResetInput = true; updateCalculatorDisplay(); }
    function handleEquals() { if (calculatorState.operator && calculatorState.previousValue !== null) { const iv = parseFloat(calculatorState.currentInput); const r = performCalculation(calculatorState.previousValue, iv, calculatorState.operator); calculatorState.expression += ` ${iv} =`; calculatorState.currentInput = String(r); calculatorState.previousValue = null; calculatorState.operator = null; calculatorState.shouldResetInput = true; updateCalculatorDisplay(); } }
    function handleToggleSign() { if (calculatorState.currentInput === '0' || calculatorState.currentInput === 'Error') return; calculatorState.currentInput = (parseFloat(calculatorState.currentInput) * -1).toString(); updateCalculatorDisplay(); }
    function handlePercent() { if (calculatorState.currentInput === 'Error') return; if (calculatorState.previousValue !== null && calculatorState.operator) { calculatorState.currentInput = ((parseFloat(calculatorState.previousValue) * parseFloat(calculatorState.currentInput)) / 100).toString(); } else { calculatorState.currentInput = (parseFloat(calculatorState.currentInput) / 100).toString(); } calculatorState.shouldResetInput = true; updateCalculatorDisplay(); }
    function handleDelete() { if (calculatorState.currentInput === 'Error') { resetCalculator(); return; } calculatorState.currentInput = calculatorState.currentInput.length > 1 ? calculatorState.currentInput.slice(0, -1) : '0'; updateCalculatorDisplay(); }
    calculatorButtons.addEventListener('click', (e) => { if (!e.target.matches('button')) return; const { action, number, operator } = e.target.dataset; if (number) inputNumber(number); if (action === 'decimal') inputDecimal(); if (operator) handleOperator(operator); if (action === 'equals') handleEquals(); if (action === 'clear') resetCalculator(); if (action === 'toggle-sign') handleToggleSign(); if (action === 'percent') handlePercent(); if (action === 'backspace') handleDelete(); });

    // --- Doubts Form Logic ---
    doubtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('doubtName').value;
        const email = document.getElementById('doubtEmail').value;
        const question = document.getElementById('doubtQuestion').value;
        let fileInfo = "";
        if (doubtFile.files.length > 0) {
            fileInfo = `\n\nFile: ${doubtFile.files[0].name} (MANUALLY ATTACH THIS FILE!).`;
        }
        const subject = `Doubt: ${currentVideoData ? currentVideoData.title : 'N/A'} (ID: ${currentYoutubeId || 'N/A'})`;
        const body = `Name: ${name}\nEmail: ${email}\n\nQuestion:\n${question}\n${fileInfo}`;
        window.location.href = `mailto:rishvrajbgp@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        doubtStatus.textContent = 'Please send the email. Remember to attach files manually.';
    });

    // --- My Notes ---
    function getNotesKey() { return `videoNotes_${currentYoutubeId}`; }
    function loadNotes() { if (!currentYoutubeId) return; const savedNotes = localStorage.getItem(getNotesKey()); notesTextarea.value = savedNotes ? savedNotes : ''; notesStatus.textContent = ''; }
    saveNotesBtn.addEventListener('click', () => { if (!currentYoutubeId) { notesStatus.textContent = 'Cannot save: No video loaded.'; return; } localStorage.setItem(getNotesKey(), notesTextarea.value); notesStatus.textContent = 'Notes saved!'; setTimeout(() => notesStatus.textContent = '', 3000); });

    // --- Ratings ---
    function getRatingKey() { return `videoRating_${currentYoutubeId}`; }
    function loadRating() { if (!currentYoutubeId) return; const savedRating = localStorage.getItem(getRatingKey()); if (savedRating) { setStars(parseInt(savedRating)); currentRatingDisplay.textContent = `Your rating: ${savedRating} star(s)`; } else { setStars(0); currentRatingDisplay.textContent = `Your rating: Not rated`; } }
    function setStars(ratingValue) { stars.forEach(star => star.classList.toggle('selected', parseInt(star.dataset.value) <= ratingValue)); }
    starRatingContainer.addEventListener('click', (e) => { if (e.target.classList.contains('star')) { if (!currentYoutubeId) { currentRatingDisplay.textContent = 'Cannot rate: No video loaded.'; return; } const ratingValue = parseInt(e.target.dataset.value); setStars(ratingValue); localStorage.setItem(getRatingKey(), ratingValue.toString()); currentRatingDisplay.textContent = `Your rating: ${ratingValue} star(s)`; } });
    starRatingContainer.addEventListener('mouseover', (e) => { if (e.target.classList.contains('star')) { const hoverValue = parseInt(e.target.dataset.value); stars.forEach(star => { star.style.color = parseInt(star.dataset.value) <= hoverValue ? 'gold' : (document.body.classList.contains('light-mode') ? '#aaa' : '#ccc'); }); } });
    starRatingContainer.addEventListener('mouseout', () => { const savedRating = localStorage.getItem(getRatingKey()); setStars(savedRating ? parseInt(savedRating) : 0); stars.forEach(star => star.style.color = ''); });

    // --- Start the player ---
    initPlayer();
});