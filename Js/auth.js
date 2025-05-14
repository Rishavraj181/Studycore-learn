/**
 * auth.js
 * Handles login, logout, and persistent state using localStorage.
 * Updates header UI on main pages.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Constants ---
    const USER_STORAGE_KEY = 'studyCoreUserData'; // Key for localStorage

    // --- Helper Functions for localStorage ---
    function getUserData() {
        const userDataString = localStorage.getItem(USER_STORAGE_KEY);
        try {
            return userDataString ? JSON.parse(userDataString) : null;
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            localStorage.removeItem(USER_STORAGE_KEY); // Clear corrupted data
            return null;
        }
    }

    function saveUserData(userData) {
        if (!userData || typeof userData !== 'object') {
            console.error("Attempted to save invalid user data:", userData);
            return;
        }
        try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        } catch (error) {
            console.error("Error saving user data to localStorage:", error);
        }
    }

    function clearUserData() {
        localStorage.removeItem(USER_STORAGE_KEY);
    }

    // --- UI Update Function (for Main Site Pages) ---
    function updateHeaderUI() {
        // Elements expected on main site pages (Index, JEE, etc.)
        const userProfileSection = document.getElementById('user-profile-section');
        const usernameDisplay = document.getElementById('username-display');
        const userProfileIcon = document.getElementById('user-profile-icon');
        const loginLink = document.getElementById('login-link'); // Changed from button
        const logoutButton = document.getElementById('logout-button');

        const currentUser = getUserData();

        if (currentUser && currentUser.name) { // Check if user data and name exist
            // User is logged in
            if (usernameDisplay) usernameDisplay.textContent = currentUser.name;
            if (userProfileIcon) userProfileIcon.textContent = currentUser.name.charAt(0).toUpperCase();
            if (userProfileSection) userProfileSection.style.display = 'flex';
            if (loginLink) loginLink.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'inline-block'; // Make sure it's visible

        } else {
            // User is logged out
            if (userProfileSection) userProfileSection.style.display = 'none';
            if (loginLink) loginLink.style.display = 'inline-block'; // Show login link
            if (logoutButton) logoutButton.style.display = 'none'; // Hide logout button
        }
    }

    // --- Logout Logic (for Main Site Pages) ---
    function handleLogout() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                console.log("Logout button clicked.");
                clearUserData();
                updateHeaderUI(); // Update UI immediately
                // Optional: Redirect after logout
                // window.location.href = 'Index.html';
                // Or redirect to login page:
                // window.location.href = 'Login.html';
            });
        }
    }

    // --- Login Logic (for Login.html Page) ---
    function handleLogin() {
        const loginForm = document.getElementById('login-form');
        const nameInput = document.getElementById('login-name');
        const emailInput = document.getElementById('login-email');

        if (loginForm && nameInput && emailInput) {
            loginForm.addEventListener('submit', (event) => {
                event.preventDefault(); // Prevent actual form submission

                const userName = nameInput.value.trim();
                const userEmail = emailInput.value.trim();

                if (userName && userEmail) {
                    // Basic validation passed (replace with real validation if needed)
                    const userData = {
                        name: userName,
                        email: userEmail
                        // You could add more fields here if needed later
                    };
                    saveUserData(userData);
                    console.log("User data saved:", userData);

                    // Redirect to the main index page after "login"
                    // *** Adjust this path if Login.html is not in the root ***
                    window.location.href = '../index.html';
                } else {
                    alert("Please fill in both Name and Email.");
                }
            });
        }
    }

    // --- Execution Control ---
    // Determine which page we are on and run the appropriate logic

    // Check if we are on the Login page by looking for the login form
    if (document.getElementById('login-form')) {
        console.log("Auth script running on Login page.");
        handleLogin();
    }
    // Otherwise, assume we are on a main site page
    else {
        console.log("Auth script running on Main site page.");
        updateHeaderUI(); // Check and update header on page load
        handleLogout();   // Attach logout listener if logout button exists
    }

}); // End DOMContentLoaded listener