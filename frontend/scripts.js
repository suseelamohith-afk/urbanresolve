// Global variable to hold the map instance for the location input
let locationInputMap = null;
let locationMarker = null;

// NEW: Global variable for Nearest Bin Map
let nearestBinMap = null;
let userLocationMarker = null;
let locationWatcherId = null; // To hold the watcher ID for live updates


const simulatedBins = [
    { lat: 15.8500, lng: 74.5050, name: "City Bus Stand Bin", type: "Dry/Wet" },
    { lat: 15.8480, lng: 74.5005, name: "CBT Market Bin", type: "Dry Only" },
    { lat: 15.8525, lng: 74.5080, name: "Railway Station Gate", type: "Mixed" },
    { lat: 15.8450, lng: 74.5100, name: "Azam Nagar Circle", type: "Dry/Wet" },
    { lat: 15.8490, lng: 74.4950, name: "Belagavi Fort Road", type: "Mixed" },
    { lat: 15.8540, lng: 74.5030, name: "Court Road Bin", type: "Dry Only" },
    { lat: 15.8515, lng: 74.5120, name: "Shahapur Corner", type: "Dry/Wet" },
    { lat: 15.8430, lng: 74.5020, name: "KLE Hospital Area", type: "Mixed" },
    { lat: 15.8560, lng: 74.4980, name: "Goaves Circle Bin", type: "Dry/Wet" },
    { lat: 15.8400, lng: 74.5060, name: "Khasbagh Road", type: "Mixed" },
    { lat: 15.8580, lng: 74.5000, name: "Patil Estate Bin", type: "Dry Only" },
    { lat: 15.8380, lng: 74.4950, name: "Hindwadi Main Rd", type: "Dry/Wet" },
    { lat: 15.8570, lng: 74.5100, name: "Mandoli Road Corner", type: "Mixed" },
    { lat: 15.8475, lng: 74.5130, name: "Shivaji Garden", type: "Dry/Wet" },
    { lat: 15.8550, lng: 74.4930, name: "JNMC Campus Bin", type: "Dry Only" },
    { lat: 15.8350, lng: 74.5080, name: "Malmaruti Extension", type: "Mixed" },
    { lat: 15.8600, lng: 74.5060, name: "Vishveshwarya Nagar", type: "Dry/Wet" },
    { lat: 15.8420, lng: 74.4980, name: "Gogte Circle", type: "Dry Only" },
    { lat: 15.8390, lng: 74.5150, name: "Fort Area Market", type: "Mixed" },
    { lat: 15.8620, lng: 74.5020, name: "Udyambag Corner", type: "Dry/Wet" }
];

// Icon for the Trash Bins
const binIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Icon for the User's live location
const userIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function initNearestBinMap() {
    const mapContainer = document.getElementById('nearest-bin-map-container');
    const statusMessageEl = document.getElementById('bin-map-status');

    if (nearestBinMap) {
        nearestBinMap.remove(); 
    }

    // Initialize map centered at Belagavi's center (15.8497, 74.5000)
    nearestBinMap = L.map('nearest-bin-map-container').setView([15.8497, 74.5000], 13); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap contributors'
    }).addTo(nearestBinMap);

    // Reset markers
    userLocationMarker = null;

    // Add simulated bins to the map
    simulatedBins.forEach(bin => {
        const marker = L.marker([bin.lat, bin.lng], { icon: binIcon }).addTo(nearestBinMap);
        // Corrected the directions URL syntax
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}`;
    
        marker.bindPopup(`
            <strong>${bin.name}</strong><br>
            Type: ${bin.type}<br>
            <a href="${directionsUrl}" target="_blank" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-top: 5px;">
                <i class="fas fa-route"></i> Get Directions
            </a>
        `);
    });

    // Start watching user's live location
    if (navigator.geolocation) {
        statusMessageEl.textContent = 'Attempting to get live location... Please approve location access.';
    
        // CRITICAL FIX: Clear any existing watch to prevent multiple location services running
        if (locationWatcherId !== null) {
            navigator.geolocation.clearWatch(locationWatcherId);
        }
    
        locationWatcherId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                const latLng = [lat, lng];

                if (!userLocationMarker) {
                    userLocationMarker = L.marker(latLng, { icon: userIcon }).addTo(nearestBinMap);
                    nearestBinMap.setView(latLng, 14); // Zoom in on first successful fix
                } else {
                    userLocationMarker.setLatLng(latLng);
                }
            
                // Update status message with live accuracy
                statusMessageEl.textContent = `Your Location: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Accuracy: ±${accuracy.toFixed(0)}m)`;
            
            },
            (error) => {
                // If permission is denied or service unavailable, show default Belagavi view
                statusMessageEl.textContent = 'Location access denied or unavailable. Showing simulated bin locations near Belagavi.';
                nearestBinMap.setView([15.8497, 74.5000], 13); 
                console.error("Geolocation Error:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 
            }
        );
    } else {
        statusMessageEl.textContent = 'Geolocation is not supported by this browser. Showing simulated bin locations.';
    }
}

// NEW: Firebase Client Configuration and Initialization
// CRITICAL: We only use the required configuration object and initialize Auth later.
const firebaseConfig = {
    apiKey: "AIzaSyAHUOuqPCz_rTZVu1QpY6H9xb0lFEy9cbQ",
    authDomain: "urbanresolve-56e5c.firebaseapp.com",
    projectId: "urbanresolve-56e5c",
    storageBucket: "urbanresolve-56e5c.firebasestorage.app",
    messagingSenderId: "18295943036",
    appId: "1:18295943036:web:af85d860aa6669190d7ef9"
    // measurementId is optional and can be omitted
};

// Global variables for Firebase objects
let firebaseApp = null;
let firebaseAuth = null;


document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '/api';

    // --- NEW FIREBASE INITIALIZATION ---
    // CRITICAL: Initialize the app and the Auth service immediately on DOM load.
    // This MUST be the first thing to run inside DOMContentLoaded after API_URL.
    try {
        // FIX: Initialize the app and Auth using the global variables
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebaseApp.auth();
    } catch (error) {
        console.error("❌ Firebase Initialization Error. Check firebaseConfig:", error);
        alert("Fatal Error: Could not initialize authentication service.");
        return; // Stop execution if critical services fail
    }
    // --- END NEW FIREBASE INITIALIZATION ---

    const pages = document.querySelectorAll('.page');
    const logo = document.getElementById('logo');
    
    // --- NEW ELEMENTS FOR FORGOT PASSWORD ---
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const forgotPasswordModalCloseBtn = document.getElementById('forgot-password-modal-close-btn');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetEmailInput = document.getElementById('reset-email-input');
    const resetStatusMessage = document.getElementById('reset-status-message');
    const sendResetEmailBtn = document.getElementById('send-reset-email-btn');

    const citizenForgotPasswordLink = document.getElementById('citizen-forgot-password-link');
    // --- END NEW ELEMENTS ---
    
    // ... rest of your existing JS code follows ...

    // NEW: Mic-to-Text Elements
    const micToTextBtn = document.getElementById('mic-to-text-btn');
    const issueDescriptionEl = document.getElementById('issue-description');
    const micStatusMessageEl = document.getElementById('mic-status-message');
    
    // --- NEW ELEMENTS FOR FORGOT PASSWORD (Declaration repeated for scoping) ---
    // These are already declared above the document.addEventListener for global scope access, 
    // but re-declared here for easy reference:
    // const forgotPasswordModal = document.getElementById('forgot-password-modal');
    // ... etc ...
    // --- END NEW ELEMENTS ---

    // NEW: Speech Recognition Logic (using Web Speech API)
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
    
    // Settings
        recognition.continuous = false; // Capture only one phrase at a time
        recognition.lang = 'en-IN'; // Set language to Indian English
        recognition.interimResults = false; // Wait for the final result

        micToTextBtn.addEventListener('click', () => {
            if (micToTextBtn.classList.contains('active-recording')) {
                // If already recording, stop it manually
                recognition.stop();
                return;
            }
            // Clear previous text
            issueDescriptionEl.value = '';
            recognition.start();
        });

        recognition.onstart = () => {
            micToTextBtn.classList.add('active-recording');
            micToTextBtn.innerHTML = '<i class="fas fa-microphone-alt-slash"></i>';
            micToTextBtn.style.backgroundColor = 'var(--danger-color)';
            micToTextBtn.style.color = 'var(--white-color)';
            micStatusMessageEl.textContent = 'Listening... Click again to stop.';
            micStatusMessageEl.style.display = 'block';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            issueDescriptionEl.value = transcript;
        };

        recognition.onend = () => {
            micToTextBtn.classList.remove('active-recording');
            micToTextBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micToTextBtn.style.backgroundColor = 'var(--light-bg-color)';
            micToTextBtn.style.color = 'var(--dark-color)';
            micStatusMessageEl.textContent = 'Recording stopped. Text captured.';
            // Hide message after a short delay
            setTimeout(() => {
                micStatusMessageEl.style.display = 'none';
            }, 3000);
        };

        recognition.onerror = (event) => {
            micToTextBtn.classList.remove('active-recording');
            micToTextBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micToTextBtn.style.backgroundColor = 'var(--light-bg-color)';
            micToTextBtn.style.color = 'var(--dark-color)';
            micStatusMessageEl.textContent = `Error: ${event.error}`;
            micStatusMessageEl.style.color = 'var(--danger-color)';
            micStatusMessageEl.style.display = 'block';
            setTimeout(() => {
                micStatusMessageEl.style.display = 'none';
                micStatusMessageEl.style.color = 'var(--primary-color)';
            }, 5000);
        };

    } else {
        // Fallback for browsers without SpeechRecognition
        micToTextBtn.disabled = true;
        micToTextBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        micStatusMessageEl.textContent = 'Speech recognition not supported in this browser.';
        micStatusMessageEl.style.color = 'var(--danger-color)';
        micStatusMessageEl.style.display = 'block';
    }
    
    
    // --- Navigation Links ---
    const aboutLink = document.getElementById('about-link');
    const signupLink = document.getElementById('signup-link');
    const citizenDashboardLinkNav = document.getElementById('citizen-dashboard-link-nav');
    const adminDashboardLinkNav = document.getElementById('admin-dashboard-link-nav');
    const bbmpDashboardLinkNav = document.getElementById('bbmp-dashboard-link-nav'); 
    const workerDashboardLinkNav = document.getElementById('worker-dashboard-link-nav'); 

    
    const homeFooterLink = document.getElementById('home-footer-link');
    const aboutFooterLink = document.getElementById('about-footer-link');
    const adminFooterLink = document.getElementById('admin-footer-link');

    const backToHomeBtn = document.getElementById('back-to-home-btn');
    const reportIssueMainBtn = document.getElementById('report-issue-main-btn');
    // NEW: Nearest Bin Button
    const nearestBinMainBtn = document.getElementById('nearest-bin-main-btn');
    
    const showReportIssueBtn = document.getElementById('show-report-issue');
    
    const signUpForm = document.getElementById('sign-up-form');
    const citizenLoginForm = document.getElementById('citizen-login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const bbmpLoginForm = document.getElementById('bbmp-login-form'); 
    const workerLoginForm = document.getElementById('worker-login-form'); 
    const issueReportForm = document.getElementById('issue-report-form');
    const signOutBtn = document.getElementById('sign-out-btn');
    const adminSignOutBtn = document.getElementById('admin-sign-out-btn');
    const bbmpSignOutBtn = document.getElementById('bbmp-sign-out-btn'); 
    const workerSignOutBtn = document.getElementById('worker-sign-out-btn'); 

    
    const loginToSignupLink = document.getElementById('login-to-signup-link');
    
    const manageAreasBtn = document.getElementById('manage-areas-btn');
    const areaManagementModal = document.getElementById('area-management-modal');
    const areaModalCloseBtn = document.getElementById('area-modal-close-btn');
    const addAreaForm = document.getElementById('add-area-form');
    const currentAreasList = document.getElementById('current-areas-list');
    const areaInput = document.getElementById('issue-area-input');
    const areaIdInput = document.getElementById('issue-area-id');
    const areaAutocompleteList = document.getElementById('area-autocomplete-list');
    const adminMenuToggle = document.getElementById('admin-menu-toggle');
    const adminMenuContent = document.getElementById('admin-menu-content');
    
    const manageBBMPAccountsBtn = document.getElementById('manage-bbmp-accounts-btn');
    
    // MODIFIED: BBMP Worker Management elements
    const bbmpManageWorkersBtn = document.getElementById('bbmp-manage-workers-btn');
    const bbmpManageWorkerAccountsBtn = document.getElementById('bbmp-manage-worker-accounts-btn');
    const bbmpAccountModal = document.getElementById('bbmp-account-modal');
    const bbmpModalCloseBtn = document.getElementById('bbmp-modal-close-btn');
    const bbmpAreaSelect = document.getElementById('bbmp-area-select'); 
    const createBBMPAccountBtn = document.getElementById('create-bbmp-account-btn');
    const bbmpResetForm = document.getElementById('bbmp-reset-form');
    
    // NEW: Assignment Modal Elements
    const assignWorkerModal = document.getElementById('assign-worker-modal');
    const assignModalCloseBtn = document.getElementById('assign-modal-close-btn');
    const assignWorkerListEl = document.getElementById('assign-worker-list');
    const assignStatusMessageEl = document.getElementById('assign-status-message');
    let currentReportIdToAssign = null; // Stores the report ID being assigned
    
    // NEW WORKER PROFILE MODAL ELEMENTS
    const workerProfileModal = document.getElementById('worker-profile-modal');
    const workerProfileModalCloseBtn = document.getElementById('worker-profile-modal-close-btn');
    const workerUpdateProfileBtn = document.getElementById('worker-update-profile-btn');
    const workerProfileUpdateForm = document.getElementById('worker-profile-update-form');
    
    const bbmpWorkerManagementModal = document.getElementById('bbmp-worker-management-modal');
    const workerMgmtModalCloseBtn = document.getElementById('worker-mgmt-modal-close-btn');
    const addWorkerForm = document.getElementById('add-worker-form');
    const newWorkerNameInput = document.getElementById('new-worker-name');
    
    // NEW WORKER RESOLUTION MODAL ELEMENTS
    const workerResolutionModal = document.getElementById('worker-resolution-modal');
    const resolutionModalCloseBtn = document.getElementById('resolution-modal-close-btn');
    const resolutionUploadForm = document.getElementById('resolution-upload-form');
    const resolutionMediaFile = document.getElementById('resolution-media-file');
    const submitResolutionProofBtn = document.getElementById('submit-resolution-proof');
    
    // NEW LEAVE MODAL ELEMENTS (Feature B)
    const workerLeaveModal = document.getElementById('worker-leave-modal');
    const leaveModalCloseBtn = document.getElementById('leave-modal-close-btn');
    const applyLeaveForm = document.getElementById('apply-leave-form');
    const leaveWorkerSelect = document.getElementById('leave-worker-select');
    const bbmpApplyLeaveBtn = document.getElementById('bbmp-apply-leave-btn');
    
    // NEW LEAVE LIST MODAL ELEMENTS (Feature C)
    const workerLeavesListModal = document.getElementById('worker-leaves-list-modal');
    const leavesListModalCloseBtn = document.getElementById('leaves-list-modal-close-btn');
    const bbmpViewLeavesBtn = document.getElementById('bbmp-view-leaves-btn');

    // NEW LOCATION INPUT ELEMENTS
    const getCurrentLocationBtn = document.getElementById('get-location-btn');
    const manualAddressFields = document.getElementById('manual-address-fields');
    const addressLine1Input = document.getElementById('address-line-1');
    const addressLine2Input = document.getElementById('address-line-2');
    const cityInput = document.getElementById('city-input');

    // NEW: Chatbot variables
    const urboAssistantButton = document.getElementById('urbo-assistant-button');
    const urboChatWindow = document.getElementById('urbo-chat-window');
    const urboChatCloseBtn = document.getElementById('urbo-chat-close-btn');
    const urboChatBody = document.querySelector('.urbo-chat-body'); // Added for auto-scroll
    const urboChatInput = document.getElementById('urbo-chat-input-text');
    const urboChatSendBtn = document.getElementById('urbo-chat-send-btn');
    // --- END CHATBOT ELEMENTS ---
    
    // NEW REJECTION MODAL ELEMENTS (Worker/Supervisor)
    const workerRejectionModal = document.getElementById('worker-rejection-modal');
    const rejectionModalCloseBtn = document.getElementById('rejection-modal-close-btn');
    const rejectionForm = document.getElementById('rejection-form');
    const rejectionReasonInput = document.getElementById('rejection-reason');

    const supervisorRejectionModal = document.getElementById('supervisor-rejection-modal');
    const supervisorModalCloseBtn = document.getElementById('supervisor-modal-close-btn');
    const supervisorRejectionForm = document.getElementById('supervisor-rejection-form');
    const supervisorReasonInput = document.getElementById('supervisor-rejection-reason');
    const supervisorOverrideBtn = document.getElementById('supervisor-override-btn');
    
    const issueCategorySelect = document.getElementById('issue-category');
    const otherCategoryGroup = document.getElementById('other-category-group');
    const otherCategoryNameInput = document.getElementById('other-category-name');
    
    // ********** START MODIFICATION: SEGREGATED STORAGE **********
    
    // Use local storage for persistent tokens, but use role-specific keys
    const CITIZEN_TOKEN_KEY = 'citizenAuthToken';
    const BBMP_TOKEN_KEY = 'bbmpAuthToken';
    const WORKER_TOKEN_KEY = 'workerAuthToken';
    const ADMIN_TOKEN_KEY = 'adminAuthToken';
    
    const CITIZEN_NAME_KEY = 'citizenUserName';
    const CITIZEN_EMAIL_KEY = 'citizenUserEmail';
    const WORKER_NAME_KEY = 'workerUserName';
    const WORKER_EMAIL_KEY = 'workerUserEmail';
    const WORKER_AADHAAR_KEY = 'workerAadhaar';
    const WORKER_AREA_NAME_KEY = 'workerAreaName';
    const BBMP_AREA_NAME_KEY = 'bbmpAreaName';

    // Helper to retrieve the active token based on current session
    const getActiveToken = () => {
         // ⚠️ SECURITY NOTE: In production, tokens/credentials should be stored in HttpOnly cookies to prevent XSS.
         if (sessionStorage.getItem('isCitizenLoggedIn') === 'true') return localStorage.getItem(CITIZEN_TOKEN_KEY);
         if (sessionStorage.getItem('isBBMPLoggedIn') === 'true') return localStorage.getItem(BBMP_TOKEN_KEY);
         if (sessionStorage.getItem('isWorkerLoggedIn') === 'true') return localStorage.getItem(WORKER_TOKEN_KEY);
         if (sessionStorage.getItem('isAdminLoggedIn') === 'true') return localStorage.getItem(ADMIN_TOKEN_KEY);
         return null;
    }

    let authToken = getActiveToken(); // Initialize with whatever is active
    // ********** END MODIFICATION: SEGREGATED STORAGE **********

    // MODIFICATION 1: Captcha logic changed to letters/numbers
    let captchaAnswer = ''; 
    const captchaCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let availableAreas = []; // For Citizen Reporting/Admin Area Management
    let availableWorkers = []; // For BBMP Worker Management

    // NEW FUNCTION: Resets all hidden coordinate inputs and the map display message
function clearHiddenCoordinates() {
    document.getElementById('issue-location').value = '';
    document.getElementById('issue-latitude').value = '';
    document.getElementById('issue-longitude').value = '';
    document.getElementById('map-coordinates-display').textContent = "Drag the pin to set the issue location.";

// Clear manual fields
    document.getElementById('address-line-1').value = '';
    document.getElementById('address-line-2').value = '';
    document.getElementById('city-input').value = '';
}
    // --- PERFORMANCE FIX: Debounce Function ---
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
    // --- END DEBOUNCE ---
    
    // --- NAVIGATION & EVENT LISTENERS SETUP ---

    adminMenuToggle.addEventListener('click', () => {
         adminMenuContent.style.display = adminMenuContent.style.display === 'block' ? 'none' : 'block';
    });

    // BBMP MENU TOGGLE
    document.getElementById('bbmp-menu-toggle').addEventListener('click', () => {
         document.getElementById('bbmp-menu-content').style.display = document.getElementById('bbmp-menu-content').style.display === 'block' ? 'none' : 'block';
    });
    
    // NEW: Add listener for the new assignment modal close button
    assignModalCloseBtn.addEventListener('click', () => assignWorkerModal.classList.remove('active'));
    
    // NEW: Worker Profile Modal Listeners
    workerProfileModalCloseBtn.addEventListener('click', () => workerProfileModal.classList.remove('active'));
    workerUpdateProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        workerProfileModal.classList.add('active');
        // Populate form with current user details
        document.getElementById('worker-update-name').value = localStorage.getItem(WORKER_NAME_KEY); 
        // Removed Aadhaar field population as requested
        document.getElementById('worker-update-password').value = ''; 
        document.getElementById('worker-update-message').style.display = 'none';
    });
    
    document.getElementById('worker-profile-icon').addEventListener('click', () => {
         const dropdown = document.getElementById('worker-profile-dropdown');
         dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
         const dropdown = document.getElementById('worker-profile-dropdown');
         const icon = document.getElementById('worker-profile-icon');
         if (!icon.contains(e.target) && !dropdown.contains(e.target)) {
             dropdown.style.display = 'none';
         }
    });
    
    // NEW: Worker Resolution Modal Listeners
    resolutionModalCloseBtn.addEventListener('click', () => {
         workerResolutionModal.classList.remove('active');
         resolutionUploadForm.reset();
         document.getElementById('resolution-file-preview-container').innerHTML = '';
         document.getElementById('resolution-upload-message').style.display = 'none';
         submitResolutionProofBtn.disabled = true;
    });
    
    // NEW: Worker Leave Modal Listeners (Feature B)
    leaveModalCloseBtn.addEventListener('click', () => workerLeaveModal.classList.remove('active'));
    
    // NEW: Worker Leave List Modal Listeners (Feature C)
    leavesListModalCloseBtn.addEventListener('click', () => workerLeavesListModal.classList.remove('active'));

    bbmpApplyLeaveBtn.addEventListener('click', async () => { // ADDED ASYNC
         document.getElementById('bbmp-menu-content').style.display = 'none';
         
         // CRITICAL FIX: Ensure worker list is fetched before opening the modal
         // Set loading state immediately (to avoid the 'No workers found' flash)
         leaveWorkerSelect.innerHTML = '<option value="" disabled selected>-- Loading Workers... --</option>';
         
         await fetchAreas(false, false); // Fetch and update availableWorkers
         
         workerLeaveModal.classList.add('active');
         populateWorkerLeaveSelect(); // Now guaranteed to have the latest list
         document.getElementById('leave-status-message').style.display = 'none';
         applyLeaveForm.reset();
    });
    
    // NEW: View Applied Leaves Button Listener
    bbmpViewLeavesBtn.addEventListener('click', async () => { // ADDED ASYNC
         document.getElementById('bbmp-menu-content').style.display = 'none';
         
         // CRITICAL FIX: Ensure worker list is fetched before opening the modal
         await fetchAreas(false, false); // Fetch and update availableWorkers (needed for name lookup)
         
         workerLeavesListModal.classList.add('active');
         fetchAndRenderWorkerLeaves();
    });
    
    // --- NEW REJECTION MODAL LISTENERS ---
    rejectionModalCloseBtn.addEventListener('click', () => workerRejectionModal.classList.remove('active'));
    supervisorModalCloseBtn.addEventListener('click', () => supervisorRejectionModal.classList.remove('active'));
    // --- END NEW REJECTION MODAL LISTENERS ---
    
    resolutionModalCloseBtn.addEventListener('click', () => {
    workerResolutionModal.classList.remove('active');
    resolutionUploadForm.reset();
    document.getElementById('resolution-file-preview-container').innerHTML = '';
    document.getElementById('resolution-upload-message').style.display = 'none';
    submitResolutionProofBtn.disabled = true;
});

// NEW FIX: Ensure the close button for the Worker Profile modal works
workerProfileModalCloseBtn.addEventListener('click', () => workerProfileModal.classList.remove('active'));
    // --- ISSUE CATEGORY TOGGLE ---
    issueCategorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'Others') {
            otherCategoryGroup.style.display = 'block';
            otherCategoryNameInput.setAttribute('required', 'true');
        } else {
            otherCategoryGroup.style.display = 'none';
            otherCategoryNameInput.removeAttribute('required');
            otherCategoryNameInput.value = ''; // Clear input when switching away
        }
    });
    
    // ----------------------------------------------------
    // --- CHATBOT LOGIC (FIXED & ENHANCED) ---
    // ----------------------------------------------------
    
    // Configuration for Gemini API
    const CHAT_API_URL = `${API_URL}/chat`;
    const GEMINI_API_KEY = "AIzaSyBen542--Kceqh9URiKMh9Xy0yFHteRVDQ"; // Canvas environment will inject this.
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=AIzaSyBen542--Kceqh9URiKMh9Xy0yFHteRVDQ`;
    const EXPOSED_GEMINI_API_KEY = "AIzaSyBen542--Kceqh9URiKMh9Xy0yFHteRVDQ";

    // Chat history array to maintain context (used by Urbo Assistant)
    let urboChatHistory = [];

    /**
    * Handles user input, sends the query to the Gemini API with Google Search grounding, 
    * and processes the response.
    */
    function handleUrboChatInput(e) {
        e.preventDefault();
        const message = urboChatInput.value.trim();
        if (!message) return;

        // 1. Display user message and add to history
        const userMessage = document.createElement('div');
        userMessage.style.cssText = 'text-align: right; margin-bottom: 10px;';
        userMessage.innerHTML = `<span style="background-color: var(--primary-color); color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; display: inline-block;">${message}</span>`;
        urboChatBody.appendChild(userMessage);

        // CRITICAL: Add the user message to history before calling the API
        urboChatHistory.push({ role: 'user', parts: [{ text: message }] });

        urboChatInput.value = '';
        urboChatInput.disabled = true;
        urboChatSendBtn.disabled = true;

        // 2. Display 'thinking' indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.style.cssText = 'text-align: left; margin-bottom: 10px;';
        typingIndicator.innerHTML = `<span style="background-color: var(--white-color); color: var(--secondary-color); padding: 8px 12px; border-radius: 15px 15px 15px 0; display: inline-block;"><i class="fas fa-ellipsis-h fa-spin"></i> Urbo is thinking...</span>`;
        urboChatBody.appendChild(typingIndicator);
        urboChatBody.scrollTop = urboChatBody.scrollHeight;

        // Start API call to your Node.js backend
        callBackendChatAPI()
            .then(response => {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.remove();

                if (response.error || !response.reply) {
                    // Use a fallback message if the reply is empty or an error occurred
                    displayBotResponse(`❌ Error: ${response.error || response.reply || 'Could not fetch a response from the backend.'}`, false);
                } else {
                    displayBotResponse(response.reply, response.sources);
                    // CRITICAL: Add model response to history for subsequent context
                    urboChatHistory.push({ role: 'model', parts: [{ text: response.reply }] });
                }
            })
            .catch(error => {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.remove();
                console.error("Backend Chat API Fatal Error:", error);
                displayBotResponse('❌ Sorry, the virtual assistant service is temporarily unavailable (Check Node.js server).', false);
            })
            .finally(() => {
                urboChatInput.disabled = false;
                urboChatSendBtn.disabled = false;
                urboChatInput.focus();
            });
    }

    /**
    * Handles the actual API call to the Gemini model with exponential backoff.
     */
    async function fetchAndRenderTopWorkers() {
        const container = document.getElementById('bbmp-top-workers-list');
        const token = localStorage.getItem(BBMP_TOKEN_KEY);
        
        if (!token) {
             container.innerHTML = '<p style="color: var(--danger-color); padding: 10px;">Login required to view rankings.</p>';
             return;
        }

        container.innerHTML = '<p style="text-align:center; color: var(--secondary-color); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading rankings...</p>';

        try {
            // CRITICAL FIX: Use API_URL concatenation correctly (assuming API_URL is defined as http://localhost:8080/api)
            const response = await fetch(`${API_URL}/workers/top-rewards`, {
                headers: { 'x-access-token': token }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch top worker data.');
            }
            
            const workers = await response.json();
            
            container.innerHTML = '';

            if (workers.length === 0) {
                 container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">No workers found in your area or no points recorded.</p>';
                 return;
            }
            
            workers.forEach((worker, index) => {
                const rank = index + 1;
                const name = worker.fullName || 'N/A';
                const points = worker.resolutionPoints || 0;
                
                const item = document.createElement('div');
                item.className = 'trend-item';
                item.style.cssText = 'margin-bottom: 1rem;';
                item.innerHTML = `
                    <div class="trend-label">
                        <span style="font-size: 1.1rem; font-weight: 700; color: ${rank === 1 ? 'gold' : (rank === 2 ? 'silver' : '#CD7F32')}; margin-right: 5px;">#${rank}</span>
                        <span>${name}</span>
                        <span style="font-weight: 700; color: var(--primary-color);">${points.toLocaleString()} pts</span>
                    </div>
                    <div class="trend-bar-bg" style="background-color: #E0F8FF;">
                        <div class="trend-bar" style="width: ${Math.min(100, (points / workers[0].resolutionPoints) * 100)}%; background-color: var(--primary-color);"></div>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error("Top Workers Fetch Error:", error);
            // The API returned an error page (non-JSON) due to the 404, causing the "Unexpected token '<'" error.
            container.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error loading rankings: The API route was not found. (404/Check Server Restart)</p>`;
        }
    }
    
    async function callBackendChatAPI() {
        try {
            // CRITICAL: Send the full, updated conversation history
            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    history: urboChatHistory // Send the full array of messages
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 4xx or 5xx server errors
                return { error: data.error || data.reply || "Server returned an error." };
            }
    
            // Data structure expected from backend: {reply: '...', sources: [...]}
            return { reply: data.reply, sources: data.sources };

        } catch (error) {
            console.error("Fetch failed:", error);
            return { error: "Network or server connection failed." };
        }
    }

    /**
    * Renders the bot's response in the chat window, including sources if available.
    */
    function displayBotResponse(text, sources) {
        const aiMessage = document.createElement('div');
        aiMessage.style.cssText = 'text-align: left; margin-bottom: 10px;';

        // Basic Markdown to HTML conversion for strong tags (**)
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Add main text bubble
        aiMessage.innerHTML = `<span style="background-color: var(--white-color); color: var(--dark-color); padding: 8px 12px; border-radius: 15px 15px 15px 0; display: inline-block;">${formattedText}</span>`;

        // Add sources (if available and not empty)
        if (sources && sources.length > 0) {
            let sourcesHTML = '<div style="font-size: 0.75rem; color: #555; margin-top: 5px; border-top: 1px dashed #eee; padding-top: 5px;">Sources:';
            sources.slice(0, 3).forEach((source, index) => {
                sourcesHTML += ` <a href="${source.uri}" target="_blank" style="color: var(--primary-color); text-decoration: none; display: block;">${index + 1}. ${source.title}</a>`;
            });
            sourcesHTML += '</div>';
            aiMessage.innerHTML += sourcesHTML;
        }

        urboChatBody.appendChild(aiMessage);
        urboChatBody.scrollTop = urboChatBody.scrollHeight;
    }

// --- END NEW GEMINI API CHATBOT LOGIC ---

    // Attach listeners here, outside the function definition
    urboAssistantButton.addEventListener('click', () => {
        if (urboChatWindow.style.display === 'flex') {
            urboChatWindow.style.display = 'none';
        } else {
            urboChatWindow.style.display = 'flex';
            urboChatInput.focus();
            urboChatBody.scrollTop = urboChatBody.scrollHeight;
        }
    });
    
    urboChatCloseBtn.addEventListener('click', () => {
        urboChatWindow.style.display = 'none';
    });

    urboChatSendBtn.addEventListener('click', handleUrboChatInput);
    urboChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUrboChatInput(e);
        }
    });
    
    // ********** START MODIFICATION: SEGREGATED STORAGE **********
    
    // FIX: Re-evaluating the current active token ensures the correct token is used
    const showPage = (pageId) => {
        pages.forEach(page => page.classList.remove('active'));
        const newPage = document.getElementById(pageId);
        if (newPage) newPage.classList.add('active');
        window.scrollTo(0, 0);
        
        // Re-fetch active token based on the new page's expected role. This is crucial for requests.
        authToken = getActiveToken(); 

        if (pageId === 'sign-up-page') generateCaptcha();
        
        // Only initialize the dashboard if the corresponding session is active
        if (pageId === 'admin-dashboard-page') { 
            if (sessionStorage.getItem('isAdminLoggedIn') === 'true') { initializeAdminDashboard(); adminMenuContent.style.display = 'none'; } else { showPage('admin-login-page'); }
        }
        if (pageId === 'bbmp-dashboard-page') { 
            if (sessionStorage.getItem('isBBMPLoggedIn') === 'true') { initializeBBMPDashboard(); document.getElementById('bbmp-menu-content').style.display = 'none'; } else { showPage('bbmp-login-page'); }
        } 
        if (pageId === 'worker-dashboard-page') { 
            if (sessionStorage.getItem('isWorkerLoggedIn') === 'true') { initializeWorkerDashboard(); document.getElementById('worker-profile-dropdown').style.display = 'none'; } else { showPage('worker-login-page'); }
        } 
        if (pageId === 'citizen-dashboard-page') {
            if (sessionStorage.getItem('isCitizenLoggedIn') === 'true') { initializeCitizenDashboard(); } else { showPage('citizen-login-page'); }
        }
        
        if (pageId === 'report-issue-page') {
            fetchAreas(false, true); // Fetch Areas for dropdown
            
            // 💻 UX FIX: Initialize map immediately on page load to prevent tile loading issues
            initLocationMap(12.9716, 77.5946, false); // Default to Bengaluru

            document.getElementById('map-coordinates-display').textContent = "Drag the pin to set the issue location.";
            document.getElementById('manual-address-fields').style.display = 'none';
            getCurrentLocationBtn.disabled = false;
            getCurrentLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Current Location';
            // Removed manualLocationBtn logic as it's merged into the GPS button's output

            // Clear hidden coordinates on page change
            updateCoordinates('', '');
            addressLine1Input.value = '';
            addressLine2Input.value = '';
            cityInput.value = '';
        }
        
        // NEW: Initialize Nearest Bin Map on page load
        if (pageId === 'nearest-bin-page') {
            initNearestBinMap();
        } else {
             // Stop watching location when leaving the bin page
            if (locationWatcherId !== null) {
                navigator.geolocation.clearWatch(locationWatcherId);
                locationWatcherId = null;
            }
            if (nearestBinMap) {
                nearestBinMap.remove();
                nearestBinMap = null;
            }
        }
        
    };
    // ********** END MODIFICATION: SEGREGATED STORAGE **********
    
    // ----------------------------------------------------
    // --- FIX: Navigation Links (Ensure preventDefault and proper page load) ---
    // ----------------------------------------------------

    // 1. Logo/Home
    logo.addEventListener('click', () => showPage('landing-page'));
    homeFooterLink.addEventListener('click', (e) => { e.preventDefault(); showPage('landing-page'); });
    
    // 2. About Us
    aboutLink.addEventListener('click', (e) => { e.preventDefault(); showPage('about-us-page'); });
    aboutFooterLink.addEventListener('click', (e) => { e.preventDefault(); showPage('about-us-page'); });
    
    // 3. Sign Up
    signupLink.addEventListener('click', (e) => { e.preventDefault(); showPage('sign-up-page'); });
    
    // 4. Dashboard Links (Unified Handler to ensure close)
    document.querySelectorAll('.dropdown-content a').forEach(link => {
         link.addEventListener('click', (e) => {
             e.preventDefault();
             const id = link.id;
             if (id === 'citizen-dashboard-link-nav') showPage('citizen-dashboard-page');
             else if (id === 'bbmp-dashboard-link-nav') showPage('bbmp-dashboard-page');
             else if (id === 'worker-dashboard-link-nav') showPage('worker-dashboard-page');
             else if (id === 'admin-dashboard-link-nav') showPage('admin-dashboard-page');
             
             // FIX START: Removed the extra logic that was closing the dropdown prematurely
         });
    });
    
    // 5. Admin Footer Link
    adminFooterLink.addEventListener('click', (e) => { e.preventDefault(); showPage('admin-dashboard-page'); });

    // ----------------------------------------------------
    // --- END FIX ---
    // ----------------------------------------------------

    if (backToHomeBtn) backToHomeBtn.addEventListener('click', () => showPage('landing-page'));
    
    // 1. MODIFICATION: Logic for 'Report an Issue' button
    reportIssueMainBtn.addEventListener('click', () => {
         const token = localStorage.getItem(CITIZEN_TOKEN_KEY);
         const isLoggedInSession = sessionStorage.getItem('isCitizenLoggedIn') === 'true';

         // Check if both the token is present AND the session is active
         if (token && isLoggedInSession) { 
            showPage('report-issue-page'); 
         } else { 
            // If token is missing, or session is not active, clear session flag just in case
            sessionStorage.removeItem('isCitizenLoggedIn');
            localStorage.removeItem(CITIZEN_TOKEN_KEY); 
            showPage('citizen-login-page'); 
         }
    });
    
    // NEW BUTTON LISTENER
    nearestBinMainBtn.addEventListener('click', () => {
        showPage('nearest-bin-page');
    });

    
    if (showReportIssueBtn) showReportIssueBtn.addEventListener('click', () => showPage('report-issue-page'));
    
    if (loginToSignupLink) {
        loginToSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('sign-up-page');
        });
    }
    
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const otpGroup = document.getElementById('otp-group');
    const phoneInput = document.getElementById('signup-phone');
    const signupError = document.getElementById('signup-error');
    const captchaReloadBtn = document.getElementById('captcha-reload-btn');

    // MODIFICATION 1: Captcha logic changed to letters/numbers
    function generateCaptcha(length = 6) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += captchaCharacters.charAt(Math.floor(Math.random() * captchaCharacters.length));
        }
        captchaAnswer = result;
        // Removed captcha element updates as the HTML structure changed (captcha removed)
    }

    // if (captchaReloadBtn) {
    //     captchaReloadBtn.addEventListener('click', generateCaptcha);
    // }
    // END MODIFICATION 1

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', () => {
        // VALIDATION FIX: Check for exactly 10 digits and only numbers
        if (phoneInput.value.length === 10 && /^\d{10}$/.test(phoneInput.value)) { 
            alert('A 6-digit OTP has been sent to your registered mobile number.');
            otpGroup.style.display = 'block';
            sendOtpBtn.textContent = 'OTP Sent';
            sendOtpBtn.disabled = true;
            phoneInput.disabled = true; 
        } else {
            alert('Please enter a valid 10-digit Phone number.'); 
        }
    });
}
    
    // ... (inside document.addEventListener('DOMContentLoaded', ...) )

if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.style.display = 'none';

        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        const phoneNumber = document.getElementById('signup-phone').value; // Used as aadhaarNumber

        if (password !== confirmPassword) {
            signupError.textContent = 'Passwords do not match.';
            signupError.style.display = 'block';
            return;
        }

    // The backend now handles Firebase user creation and email verification.

        try {
            // CRITICAL: Call the Node.js endpoint, which now handles Firebase user creation 
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // phoneNumber is still sent as aadhaarNumber for MongoDB compatibility
                body: JSON.stringify({ fullName, email, password, aadhaarNumber: phoneNumber }), 
            });

            const data = await response.json();
            if (!response.ok) {
                // Display specific Firebase/Mongoose errors passed from the backend
                throw new Error(data.message || 'Something went wrong during registration.');
            }
            
            // *** CRITICAL FIX: Trigger Email Sending using Client SDK ***
            
            // 1. Sign in the newly created user temporarily (backend confirmed successful creation)
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            
            // 2. Send the verification email using the Client SDK
            await userCredential.user.sendEmailVerification(); 
            
            // 3. Immediately sign out the user
            await firebaseAuth.signOut(); 
            
            // *** END CRITICAL FIX ***

            alert('Account created! A verification link has been sent to your email. Please verify and proceed to login.');
            signUpForm.reset();
            showPage('citizen-login-page');

        } catch (error) {
            // If sign-in or send verification fails, the user remains logged out.
            // We show the error, and the user must try logging in again.
            signupError.textContent = error.message.replace('Firebase: ', ''); 
            signupError.style.display = 'block';
        }
    });
}

    // ... (inside document.addEventListener('DOMContentLoaded', ...) )

if (citizenLoginForm) {
    citizenLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('citizen-login-error');
        errorEl.style.display = 'none';

        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // 1. Authenticate with Firebase Client SDK (Client-side password check)
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Check for Email Verification Status
            if (!user.emailVerified) {
                throw new Error('Please verify your email address by clicking the link sent to your inbox before logging in.');
            }

        // 3. Get the Firebase ID Token
            const firebaseIdToken = await user.getIdToken();

        // 4. Send the Firebase ID Token to your custom Node.js backend for exchange (server-side token validation)
            const response = await fetch(`${API_URL}/auth/signin`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // CRITICAL: Send the Firebase ID token in the Authorization header for the backend to verify
                    'Authorization': `Bearer ${firebaseIdToken}` 
                },
                // Send basic data to trigger the Citizen/Firebase path on the backend
                body: JSON.stringify({ email: user.email, isCitizenLogin: true }), 
            });
        
            const data = await response.json();

            if (!response.ok || !data.accessToken) {
                throw new Error(data.message || 'Login failed.');
            }
        
            if (data.role !== 'Citizen') { 
                throw new Error('Unauthorized: Staff/Worker accounts cannot use the Citizen portal.');
            }
        
            // ... (existing logic to set local storage and show dashboard)
            sessionStorage.setItem('isCitizenLoggedIn', 'true');
            localStorage.setItem(CITIZEN_TOKEN_KEY, data.accessToken);
            localStorage.setItem(CITIZEN_NAME_KEY, data.fullName);
            localStorage.setItem(CITIZEN_EMAIL_KEY, data.email);
        
            authToken = data.accessToken;
        
            showPage('citizen-dashboard-page');
        
        } catch (error) {
            // Display Firebase errors (e.g., auth/user-not-found, auth/wrong-password)
            // or your custom verification error.
            errorEl.textContent = error.message.replace('Firebase: ', '');
            errorEl.style.display = 'block';
        }
    });
}

    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            // ********** START MODIFICATION: CITIZEN LOGOUT **********
            alert('You have been signed out.');
            sessionStorage.removeItem('isCitizenLoggedIn');
            localStorage.removeItem(CITIZEN_TOKEN_KEY);
            localStorage.removeItem(CITIZEN_NAME_KEY);
            localStorage.removeItem(CITIZEN_EMAIL_KEY);
            authToken = getActiveToken(); // Re-evaluate active token
            // ********** END MODIFICATION: CITIZEN LOGOUT **********
            showPage('landing-page');
        });
    }
    
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-username').value;
            const pass = document.getElementById('admin-password').value;
            const errorEl = document.getElementById('admin-login-error');

            if (user === 'admin' && pass === 'password123') {
                // ********** START MODIFICATION: ADMIN LOGIN **********
                // Clear other sessions for a cleaner switch (optional, but safer)
                sessionStorage.removeItem('isBBMPLoggedIn');
                sessionStorage.removeItem('isWorkerLoggedIn');
                sessionStorage.removeItem('isCitizenLoggedIn');
                
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                errorEl.style.display = 'none';

                // FIX: Set a fake token needed by the backend middleware for Admin actions
                const fakeToken = 'FAKE_ADMIN_TOKEN_12345';
                localStorage.setItem(ADMIN_TOKEN_KEY, fakeToken); 
                authToken = fakeToken; // Update global variable
                // ********** END MODIFICATION: ADMIN LOGIN **********
                
                showPage('admin-dashboard-page');
            } else {
                errorEl.textContent = 'Invalid username or password.';
                errorEl.style.display = 'block';
            }
        });
    }
    
    // BBMP LOGIN LOGIC - Validates against persistent credentials
    if (bbmpLoginForm) {
         bbmpLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('bbmp-username').value;
            const password = document.getElementById('bbmp-password').value;
            const errorEl = document.getElementById('bbmp-login-error');
            errorEl.style.display = 'none';
            
            try {
                const response = await fetch(`${API_URL}/auth/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, isBBMPLogin: true }), // NEW: Add BBMP login flag
                });
                
                const data = await response.json();

                if (!response.ok || !data.accessToken) {
                     throw new Error(data.message || 'Login failed.');
                }
                
                // 2. Validate that this user is a BBMP staff/worker (has an areaId assigned)
                if (data.role !== 'BBMP') {
                     throw new Error('Unauthorized: Please use the designated BBMP/Worker portal for this account.');
                }
                
                // ********** START MODIFICATION: BBMP LOGIN **********
                // Clear other sessions for a cleaner switch (optional, but safer)
                sessionStorage.removeItem('isCitizenLoggedIn');
                sessionStorage.removeItem('isWorkerLoggedIn');
                
                // Use role-specific keys
                sessionStorage.setItem('isBBMPLoggedIn', 'true');
                localStorage.setItem(BBMP_TOKEN_KEY, data.accessToken);
                localStorage.setItem(BBMP_AREA_NAME_KEY, data.areaName); 
                
                authToken = data.accessToken; // Update active token
                // ********** END MODIFICATION: BBMP LOGIN **********

                errorEl.style.display = 'none';
                showPage('bbmp-dashboard-page');

            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            }
         });
    }
    
    // NEW WORKER LOGIN LOGIC (FIXED)
    if (workerLoginForm) {
         workerLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('worker-username').value;
            const password = document.getElementById('worker-password').value;
            const errorEl = document.getElementById('worker-login-error');
            errorEl.style.display = 'none';
            
            try {
                const response = await fetch(`${API_URL}/auth/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, isWorkerLogin: true }), // NEW: Add Worker login flag
                });
                
                const data = await response.json();

                if (!response.ok || !data.accessToken) {
                     throw new Error(data.message || 'Login failed.');
                }
                
                // CRITICAL FIX: Validate this user is a Worker user
                if (data.role !== 'Worker') {
                     throw new Error('This account is not provisioned for the Worker Portal.');
                }
                
                // ********** START MODIFICATION: WORKER LOGIN **********
                // Clear other sessions for a cleaner switch (optional, but safer)
                sessionStorage.removeItem('isCitizenLoggedIn');
                sessionStorage.removeItem('isBBMPLoggedIn');
                
                // Use role-specific keys
                sessionStorage.setItem('isWorkerLoggedIn', 'true');
                localStorage.setItem(WORKER_TOKEN_KEY, data.accessToken);
                localStorage.setItem(WORKER_NAME_KEY, data.fullName); // Worker Name
                localStorage.setItem(WORKER_EMAIL_KEY, data.email); // Worker Email
                localStorage.setItem(WORKER_AADHAAR_KEY, 'XX-XX-XX-XXXX'); // Placeholder Aadhaar
                localStorage.setItem(WORKER_AREA_NAME_KEY, data.areaName); // Worker's assigned area name (for display)

                authToken = data.accessToken; // Update active token
                // ********** END MODIFICATION: WORKER LOGIN **********

                errorEl.style.display = 'none';
                showPage('worker-dashboard-page');

            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            }
         });
    }


    if (adminSignOutBtn) {
        adminSignOutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            localStorage.removeItem(ADMIN_TOKEN_KEY); // Clear the token
            authToken = getActiveToken();
            showPage('landing-page');
        });
    }
    
    // BBMP SIGN OUT LOGIC
    if (bbmpSignOutBtn) {
         bbmpSignOutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isBBMPLoggedIn');
            localStorage.removeItem(BBMP_TOKEN_KEY); // Clear token
            localStorage.removeItem(BBMP_AREA_NAME_KEY); // Clear persistent area name
            authToken = getActiveToken();
            showPage('landing-page');
         });
    }
    
    // NEW WORKER SIGN OUT LOGIC
    if (workerSignOutBtn) {
         workerSignOutBtn.addEventListener('click', () => {
            alert('You have been signed out.');
            // ********** START MODIFICATION: WORKER LOGOUT **********
            sessionStorage.removeItem('isWorkerLoggedIn');
            localStorage.removeItem(WORKER_TOKEN_KEY); 
            localStorage.removeItem(WORKER_NAME_KEY);
            localStorage.removeItem(WORKER_EMAIL_KEY);
            localStorage.removeItem(WORKER_AADHAAR_KEY);
            localStorage.removeItem(WORKER_AREA_NAME_KEY);
            authToken = getActiveToken();
            // ********** END MODIFICATION: WORKER LOGOUT **********
            showPage('landing-page');
        });
    }
    
    // NEW WORKER PROFILE UPDATE LOGIC (Simulated PUT to a profile endpoint)
    if (workerProfileUpdateForm) {
        workerProfileUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('worker-update-name').value;
            const newPassword = document.getElementById('worker-update-password').value;
            const messageEl = document.getElementById('worker-update-message');
            messageEl.style.display = 'none';
            
            try {
                 const currentWorkerName = localStorage.getItem(WORKER_NAME_KEY);
                 if (newName !== currentWorkerName) {
                    // Simulate name update
                     localStorage.setItem(WORKER_NAME_KEY, newName);
                     // Display update message
                     messageEl.textContent = 'Profile updated successfully!';
                     messageEl.style.color = 'var(--success-color)';
                     messageEl.style.display = 'block';
                     initializeWorkerDashboard(); // Refresh dashboard name
                 }
                 
                 if (newPassword) {
                     // Simulate password reset via the BBMP reset endpoint
                     const email = localStorage.getItem(WORKER_EMAIL_KEY);
                     const token = localStorage.getItem(WORKER_TOKEN_KEY);
                     const response = await fetch(`${API_URL}/auth/bbmp-reset-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                        body: JSON.stringify({ email: email, newPassword: newPassword }),
                     });

                     const data = await response.json();
                     if (!response.ok) {
                         throw new Error(data.message || 'Failed to update password.');
                     }
                     
                     messageEl.textContent = 'Profile & Password updated successfully!';
                     messageEl.style.color = 'var(--success-color)';
                     messageEl.style.display = 'block';
                 } else if (newName === currentWorkerName) {
                     // If only password was empty and name didn't change
                     messageEl.textContent = 'No changes made.';
                     messageEl.style.color = 'var(--secondary-color)';
                     messageEl.style.display = 'block';
                 }
                 
            } catch (error) {
                messageEl.textContent = `Error: ${error.message}`;
                messageEl.style.color = 'var(--danger-color)';
                messageEl.style.display = 'block';
            }
        });
    }


    
    if(issueReportForm) {
        issueReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // CRITICAL FIX START: Use the dedicated latitude and longitude fields updated by the map.
            const latitude = document.getElementById('issue-latitude').value;
            const longitude = document.getElementById('issue-longitude').value;
            
            // Reconstruct the string for the backend controller to parse: Lat:X,Lon:Y
            const locationValue = `Lat:${latitude},Lon:${longitude}`; 
            
            const fileInputEl = document.getElementById('issue-photo');
            if (!fileInputEl.files.length) {
                alert('Please select or capture a photo/video before submitting.');
                return;
            }
            if (!latitude || !longitude) {
                alert('Please set your location using the map tool.');
                return;
            }
            // CRITICAL FIX END

            
            const categoryValue = issueCategorySelect.value;
            let finalCategoryName;
            
            // CRITICAL FIX: Use the 'other-category-name' input value if 'Others' is selected
            if (categoryValue === 'Others') {
                finalCategoryName = otherCategoryNameInput.value.trim();
                if (!finalCategoryName) {
                    alert('Please enter a specific report name for the "Others" category.');
                    return; // Stop submission if required field is empty
                }
            } else {
                finalCategoryName = categoryValue;
            }
            
            const formData = new FormData();
            formData.append('category', finalCategoryName); // Use the final determined category name
            formData.append('description', document.getElementById('issue-description').value);
            formData.append('location', locationValue); // Use map-updated coordinate string
            formData.append('area', document.getElementById('issue-area-id').value);
            formData.append('issuePhoto', fileInputEl.files[0]);
            
            try {
                const token = localStorage.getItem(CITIZEN_TOKEN_KEY);
                const response = await fetch(`${API_URL}/reports`, {
                    method: 'POST',
                    headers: { 'x-access-token': token },
                    body: formData,
                });
                
                if (!response.ok) {
                    try {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Server error: ${response.status}`);
                    } catch (jsonError) {
                        throw new Error(`Authentication failed or server error: ${response.status}. Please log out and log back in.`);
                    }
                }
                
                const data = await response.json();
                alert('Report submitted successfully and automatically assigned!');
                issueReportForm.reset();
                document.getElementById('file-preview-container').innerHTML = '';
                
                // CRITICAL FIX: Ensure map state is reset
                // The map is now always present, but we reset its pin/center
                if (locationInputMap) {
                     initLocationMap(12.9716, 77.5946, false); 
                     document.getElementById('map-coordinates-display').textContent = "Drag the pin to set the issue location.";
                     updateCoordinates('', '');
                }
                
                showPage('citizen-dashboard-page');

            } catch(error) {
                alert(`Error: ${error.message}`);
            }
        });
    }
    
    let bbmpWeeklyChart, bbmpDeptChart, bbmpAnalyticsMap; 

    async function initializeBBMPDashboard() {
        const tabs = document.querySelectorAll(
            '#bbmp-dashboard-page .admin-tab-button'
        );
        const contents = document.querySelectorAll(
            '#bbmp-dashboard-page .admin-tab-content'
        );

        Chart.defaults.color = '#64748B';
        Chart.defaults.borderColor = '#E2E8F0';

        const loadingOverlay = document.getElementById('bbmp-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        const token = localStorage.getItem(BBMP_TOKEN_KEY);
        if (!token) {
            showPage('bbmp-login-page');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }

        // --- 1. Fetch all reports for the staff's area ---
        const dashboardReports = await fetchBBMPReportsForDashboard();
        allFetchedBBMPReports = dashboardReports; // Store unfiltered reports for dashboard stats

        // --- 2. Fetch and render Top Workers (Reward System) ---
        await fetchAndRenderTopWorkers(); // This function is already defined but needs to be called

        // Tab click behaviour (Dashboard / Manage / Analytics)
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');

                const activeTab = document.getElementById('bbmp-tab-' + tab.dataset.tab);
                if (activeTab) activeTab.classList.add('active');

                if (tab.dataset.tab === 'analytics') {
                    updateAnalyticsTab(dashboardReports, 'bbmp');
                    // Use a short timeout to ensure the map container is rendered and sized correctly
                    setTimeout(
                        () => initAnalyticsMap(dashboardReports, 'bbmp-analytics-map-container'),
                        50
                    );
                } else if (tab.dataset.tab === 'dashboard') {
                    updateDashboardStats(dashboardReports, 'bbmp'); // Use the common helper
                } else if (tab.dataset.tab === 'manage') {
                    // Manage tab should apply its default/current filters
                    applyFilters('bbmp', true); // Pass true to force the initial filter render
                }
            });
        });

        // --- 3. Initialize Charts ---
        // Weekly Chart
        if (bbmpWeeklyChart) bbmpWeeklyChart.destroy();
        bbmpWeeklyChart = new Chart(document.getElementById('bbmpWeeklyActivityChart'), {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Reports',
                    data: [],
                    backgroundColor: 'rgba(0, 198, 255, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });

        // Department Donut Chart
        if (bbmpDeptChart) bbmpDeptChart.destroy();
        bbmpDeptChart = new Chart(document.getElementById('bbmpDepartmentDonutChart'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#F59E0B',
                        '#EF4444',
                        '#00C6FF',
                        '#3B82F6',
                        '#64748B'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#64748B' }
                    }
                }
            }
        });
        
        // --- 4. Setup Filter and Tab Listeners ---
        setupFilterEventListeners('bbmp');
        document.querySelectorAll('#bbmp-report-tabs .citizen-tab-button').forEach(button => {
            button.removeEventListener('click', handleBBMPTabClick); 
            button.addEventListener('click', handleBBMPTabClick);
        });
        // Default to Dashboard tab
        const defaultTab = document.querySelector(
            '#bbmp-dashboard-page .admin-tab-button[data-tab="dashboard"]'
        );
        if (defaultTab) defaultTab.click();

        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
    // ********** START MODIFICATION: LOCATION MAP FEATURE (REAL GEOCODING) **********
    
    // NEW FUNCTION: Updates the hidden coordinates and display text
    function updateCoordinates(lat, lng) {
        if (lat === '' && lng === '') {
             // CRITICAL FIX: Use a dedicated clear function that does NOT remove the map marker
             if (locationMarker) locationMarker.remove();
             locationMarker = null; // Ensure marker variable is cleared when coordinates is reset
             clearHiddenCoordinates(); // Clears hidden inputs and display message
             return;
        }
        
        const locationString = `Lat:${lat.toFixed(5)},Lon:${lng.toFixed(5)}`;
        // FIX: Set values for the dedicated hidden fields
        document.getElementById('issue-location').value = locationString; // Keep for legacy/debug, but submission now uses lat/lon fields
        document.getElementById('issue-latitude').value = lat.toFixed(5);
        document.getElementById('issue-longitude').value = lng.toFixed(5);
        document.getElementById('map-coordinates-display').textContent = `Current Coordinates: ${locationString}`;
    }
        
        
    // --- NEW REAL GEOCoding & Reverse Geocoding Functions (Using Nominatim) ---

    // 1. Implements Reverse Geocoding (Lat/Lng to Address)
    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Reverse geocoding failed.');
            }
            const data = await response.json();
            
            const address = data.address;
            
            const street = address.road || address.pedestrian || '';
            const suburb = address.suburb || address.quarter || '';
            const city = address.city || address.town || address.village || address.county || '';
            const state = address.state || '';
            const postcode = address.postcode || '';

            // Update the manual address fields with real data
            document.getElementById('address-line-1').value = `${street}, ${suburb}`.replace(/,\s*$/, '');
            document.getElementById('address-line-2').value = data.display_name; 
            document.getElementById('city-input').value = `${city}, ${state} ${postcode}`.replace(/,\s*$/, ''); 
            
        } catch (error) {
            console.error("Reverse Geocoding Error (Falling back to empty fields):", error);
            document.getElementById('address-line-1').value = 'Address lookup failed.';
            document.getElementById('address-line-2').value = '';
            document.getElementById('city-input').value = '';
        }
    }


    // 2. Implements Geocoding (Address to Lat/Lng)
    const updateMapFromAddress = debounce(async () => {
        const addressLine1 = document.getElementById('address-line-1').value;
        const addressLine2 = document.getElementById('address-line-2').value;
        const cityInput = document.getElementById('city-input').value;
        
        const fullAddress = `${addressLine1}, ${addressLine2}, ${cityInput}`;
        
        if (fullAddress.length < 10) {
             return;
        }

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Geocoding failed.');
            }
            const data = await response.json();
            
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                if (locationMarker) {
                    const newLatLng = L.latLng(lat, lng);
                    locationMarker.setLatLng(newLatLng);
                    locationInputMap.setView(newLatLng, 15); 
                    updateCoordinates(lat, lng);
                } else {
                     // If marker doesn't exist (e.g., manual mode was selected first) initialize the map
                     initLocationMap(lat, lng, true); 
                }
                
            } else {
                console.warn("Address not found.");
            }
            
        } catch (error) {
            console.error("Geocoding Error:", error);
        }
    }, 1000);

    // --- END NEW REAL GEOCoding & Reverse Geocoding Functions ---

    // NEW FUNCTION: Initializes the map
    function initLocationMap(lat, lng, isManual = false) {
        const mapContainer = document.getElementById('issue-location-map');
        mapContainer.style.display = 'block';

        if (locationInputMap) {
             locationInputMap.remove(); // Remove existing instance to prevent errors
        }
        
        // Set initial coordinates for map initialization
        const initialLat = lat || 12.9716; // Default to Bengaluru if no GPS/manual input
        const initialLng = lng || 77.5946;

        // Re-initialize map and set view
        // The map container must be visible before L.map is called
        locationInputMap = L.map('issue-location-map').setView([initialLat, initialLng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '© OpenStreetMap contributors'
        }).addTo(locationInputMap);
        
        // Add Draggable Marker
        // Ensure locationMarker is reset
        if (locationMarker) { locationMarker.remove(); } 
        locationMarker = L.marker([initialLat, initialLng], { draggable: true }).addTo(locationInputMap);
        
        // Event listener for dragging the marker
        locationMarker.on('dragend', (e) => {
            const newLatLng = locationMarker.getLatLng();
            updateCoordinates(newLatLng.lat, newLatLng.lng);
            
            // If in manual mode, call REAL reverse geocoding on drag
            if (manualAddressFields.style.display === 'block') {
                reverseGeocode(newLatLng.lat, newLatLng.lng);
            }
        });
        
        // Update initial coordinates and address fields
        updateCoordinates(initialLat, initialLng);
        if (isManual) {
             // Call REAL reverse geocoding on map initialization if starting in manual mode
             reverseGeocode(initialLat, initialLng); 
             manualAddressFields.style.display = 'block';
        } else {
             manualAddressFields.style.display = 'none';
             // Clear manual fields if GPS is used
             addressLine1Input.value = '';
             addressLine2Input.value = '';
             cityInput.value = '';
        }
        
        locationInputMap.invalidateSize(); // Fix map tile loading issues
    }

    // --- HANDLER 1: Get Current Location (FINAL FIX) ---
    getCurrentLocationBtn.addEventListener('click', (e) => {
        const locationBtn = e.currentTarget;
        
        // CRITICAL FIX: Ensure manual address fields are visible for user modification
        manualAddressFields.style.display = 'block'; 
        
        if (navigator.geolocation) {
            locationBtn.disabled = true;
            locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding you...';
            // manualLocationBtn.disabled = true; <-- REMOVED THIS LINE

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // CRITICAL: Initialize map, setting isManual=true to ensure reverseGeocode is called, 
                    // and the fields are populated for citizen modification.
                    initLocationMap(lat, lng, true); 

                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Redetect Location (Pin is Draggable)';
                    // manualLocationBtn.disabled = false; <-- REMOVED THIS LINE
                    
                }, 
                (error) => {
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get Current Location';
                    // manualLocationBtn.disabled = false; <-- REMOVED THIS LINE
                    document.getElementById('map-coordinates-display').textContent = 'Location detection failed. Please try again or enter manually.';
                    updateCoordinates('', '');
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                        case error.POSITION_UNAVAILABLE:
                        case error.TIMEOUT:
                            alert("Location error. Please try setting the location manually.");
                            break;
                        default:
                            alert("An unknown error occurred while fetching location.");
                            break;
                    }
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });

    
    
    
    // ********** END MODIFICATION: LOCATION MAP FEATURE (REAL GEOCODING) **********
    
    // ********** START NEW NEAREST BIN MAP LOGIC **********

    // Icon for the Trash Bins
    const binIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    // Icon for the User's live location
    const userIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    function initNearestBinMap() {
        const mapContainer = document.getElementById('nearest-bin-map-container');
        const statusMessageEl = document.getElementById('bin-map-status');

        if (nearestBinMap) {
             nearestBinMap.remove(); 
        }

        // Initialize map centered at Bengaluru's center
        nearestBinMap = L.map('nearest-bin-map-container').setView([12.9716, 77.5946], 12); 
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '© OpenStreetMap contributors'
        }).addTo(nearestBinMap);
        
        // Reset markers
        userLocationMarker = null;

        // Add simulated bins to the map
        simulatedBins.forEach(bin => {
            const marker = L.marker([bin.lat, bin.lng], { icon: binIcon }).addTo(nearestBinMap);
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}`;
            
            marker.bindPopup(`
                <strong>${bin.name}</strong><br>
                Type: ${bin.type}<br>
                <a href="${directionsUrl}" target="_blank" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-top: 5px;">
                    <i class="fas fa-route"></i> Get Directions
                </a>
            `);
        });
        
        // Start watching user's live location
        if (navigator.geolocation) {
            statusMessageEl.textContent = 'Attempting to get live location...';
            
            // CRITICAL: Use watchPosition for "live accurate tracking"
            locationWatcherId = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    const latLng = [lat, lng];

                    if (!userLocationMarker) {
                        userLocationMarker = L.marker(latLng, { icon: userIcon }).addTo(nearestBinMap);
                        nearestBinMap.setView(latLng, 14); // Zoom in on first successful fix
                    } else {
                        userLocationMarker.setLatLng(latLng);
                    }
                    
                    // Update status message with live accuracy
                    statusMessageEl.textContent = `Your Location: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Accuracy: ±${accuracy.toFixed(0)}m)`;
                    
                    // Optional: Adjust map center smoothly
                    // nearestBinMap.panTo(latLng);

                },
                (error) => {
                    statusMessageEl.textContent = 'Location access denied or unavailable. Showing generalized bin locations.';
                    nearestBinMap.setView([12.9716, 77.5946], 12); // Fallback to Bengaluru view
                    console.error("Geolocation Error:", error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0 
                }
            );
        } else {
            statusMessageEl.textContent = 'Geolocation is not supported by this browser.';
        }
    }

    // ********** END NEW NEAREST BIN MAP LOGIC **********


    let allCitizenReports = []; // Store all reports fetched for the citizen

    async function initializeCitizenDashboard() {
        const name = localStorage.getItem(CITIZEN_NAME_KEY);
        const email = localStorage.getItem(CITIZEN_EMAIL_KEY);
        const token = localStorage.getItem(CITIZEN_TOKEN_KEY);
        
        if (!token) { 
             showPage('citizen-login-page');
             return;
        }
        
        document.getElementById('dashboard-user-name').textContent = name;
        document.getElementById('dashboard-user-email').textContent = email;
        
        // --- UX FIX: Set initial loading states ---
        ['total', 'pending', 'progress', 'resolved'].forEach(stat => { 
            document.getElementById(`citizen-stat-${stat}`).innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        document.getElementById('citizen-reports-tbody').innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</td></tr>';
        // --- END UX FIX ---
        
        // Setup Tab Listeners only once
        document.querySelectorAll('#citizen-report-tabs .citizen-tab-button').forEach(button => {
            button.removeEventListener('click', handleCitizenTabClick);
            button.addEventListener('click', handleCitizenTabClick);
        });


        try {
            // 1. Fetch Reports
            const reportsResponse = await fetch(`${API_URL}/reports/my-reports`, {
                headers: { 'x-access-token': token }
            });
            
            if (!reportsResponse.ok) {
                const errorData = await reportsResponse.json();
                if (response.status === 429) {
                    // Display the specific rate-limit message from the backend
                    throw new Error(errorData.message || 'Submission limit reached. Status: 429');
            }
                throw new Error(errorData.message || `Could not fetch your reports. Status: ${reportsResponse.status}`);
            }
            
            const reports = await reportsResponse.json();
            allCitizenReports = reports;
            
            // Initialize/Attach Listeners (assuming they are defined globally or elsewhere)
            document.getElementById('modal-close-btn').addEventListener('click', closeReportModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeReportModal();
                }
            });
            
            // Render the default tab (Submitted Reports)
            handleCitizenTabClick({ 
                currentTarget: document.querySelector('#citizen-report-tabs .citizen-tab-button.active') || document.querySelector('#citizen-report-tabs .citizen-tab-button[data-tab="submitted"]')
            });
            
            // FINAL STEP: Update stats 
            updateCitizenStats(reports); 

        } catch (error) {
            console.error("Dashboard initialization error:", error);
            // ALERT THE USER that the data failed to load
            alert(`Report Data Load Failed: ${error.message}. Please try logging in again.`); 
            
            document.getElementById('citizen-reports-tbody').innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--danger-color);">${error.message}</td></tr>`;
            
             // Ensure all loading states are replaced on failure
            ['total', 'pending', 'progress', 'resolved'].forEach(stat => {
                document.getElementById(`citizen-stat-${stat}`).textContent = 'N/A';
            });
        }
    }
    
    // MODIFIED: Update stats function to accept and display reward data
    function updateCitizenStats(reports) {
        document.getElementById('citizen-stat-total').textContent = reports.length;
        // CRITICAL FIX: Include 'Rejected' and 'Review Required' in the pending count for the citizen view
        document.getElementById('citizen-stat-pending').textContent = reports.filter(r => r.status === 'Pending' || r.status === 'Review Required').length; 
        document.getElementById('citizen-stat-progress').textContent = reports.filter(r => r.status === 'In Progress').length;
        document.getElementById('citizen-stat-resolved').textContent = reports.filter(r => r.status === 'Resolved' || r.status === 'Rejected').length; // Show resolved/rejected as finalized
    }
    
    
    
    
    
    function handleCitizenTabClick(e) {
        const selectedTab = e.currentTarget;
        const tabName = selectedTab.dataset.tab;
        
        // 1. Update active tab visual state
        document.querySelectorAll('#citizen-report-tabs .citizen-tab-button').forEach(btn => btn.classList.remove('active'));
        selectedTab.classList.add('active');
        
        // 2. Filter reports based on the selected tab
        let filteredReports = [];
        if (tabName === 'submitted') {
            // Submitted Reports = Pending OR In Progress OR Review Required
            filteredReports = allCitizenReports.filter(r => r.status === 'Pending' || r.status === 'In Progress' || r.status === 'Review Required');
        } else if (tabName === 'resolved') {
            // Resolved Reports = Resolved OR Rejected (as both are finalized states)
            filteredReports = allCitizenReports.filter(r => r.status === 'Resolved' || r.status === 'Rejected');
        }
        
        // 3. Render the filtered reports
        renderCitizenReports(filteredReports);
    }


    function renderCitizenReports(reports) {
        const tbody = document.getElementById('citizen-reports-tbody');
        tbody.innerHTML = '';

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No reports found in this view.</td></tr>';
        } else {
             reports.forEach(report => {
                // CRITICAL FIX: Include new statuses in the map
                const statusClassMap = {'Pending': 'status-pending', 'In Progress': 'status-in-progress', 'Resolved': 'status-resolved', 'Review Required': 'status-pending', 'Rejected': 'status-rejected'}; 
                const row = `
                    <tr>
                        <td>
                            <strong>${report.category} - ${report.area ? report.area.name : 'N/A'}</strong>
                            <p style="color: var(--secondary-color); font-size: 0.9em; margin: 0;">${report.description.substring(0, 100)}...</p>
                        </td>
                        <td><span class="badge ${statusClassMap[report.status]}">${report.status}</span></td>
                        <td>${new Date(report.createdAt).toLocaleDateString()}</td>
                        <td style="text-align: right;"><button class="btn btn-secondary view-details-btn" data-report-id="${report._id}" style="padding: 0.5rem 1rem;">View Details</button></td>
                    </tr>
                `;
                tbody.innerHTML += row;
             });
             // Attach event listeners to the new View Details buttons on the citizen table
             document.querySelectorAll('#citizen-reports-tbody .view-details-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                     const reportId = e.currentTarget.dataset.reportId;
                     // Fetch the full report details since the table doesn't have all the data
                     try {
                        const token = localStorage.getItem(CITIZEN_TOKEN_KEY);
                        const response = await fetch(`${API_URL}/reports/${reportId}`, {
                            headers: { 'x-access-token': token }
                        });
                        const reportData = await response.json();
                        if (!response.ok) throw new Error(reportData.message || 'Failed to fetch report details.');
                        openReportModal(reportData, 'citizen');
                     } catch (error) {
                         alert(`Error fetching details: ${error.message}`);
                     }
                });
             });
        }
    }
    
    // NEW: Worker Dashboard Initialization
    async function initializeWorkerDashboard() {
        // ********** START MODIFICATION: WORKER DASHBOARD INIT **********
        const name = localStorage.getItem(WORKER_NAME_KEY);
        const email = localStorage.getItem(WORKER_EMAIL_KEY);
        const areaName = localStorage.getItem(WORKER_AREA_NAME_KEY);
        const token = localStorage.getItem(WORKER_TOKEN_KEY);
        
        if (!token) {
             showPage('worker-login-page');
             return;
        }
        
        document.getElementById('worker-dashboard-name').textContent = name;
        
        document.getElementById('worker-profile-name').textContent = name;
        document.getElementById('worker-profile-email').textContent = email;
        document.getElementById('worker-profile-area').textContent = areaName;
        
        // FIX: Set loading state for resolved count and new reward stats
        document.getElementById('worker-profile-resolved-count').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('worker-stat-points').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('worker-stat-rank').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';


        // --- UX FIX: Set initial loading states ---
        // 💻 UX FIX: Updated stat IDs
        ['total', 'pending', 'progress', 'resolved-today'].forEach(stat => {
            document.getElementById(`worker-stat-${stat}`).innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        document.getElementById('worker-assigned-reports').innerHTML = '<p style="text-align:center; color: var(--secondary-color); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading assignments...</p>';
        // --- END UX FIX ---
        
        // Setup Tab Listeners only once
        document.querySelectorAll('#worker-report-tabs .citizen-tab-button').forEach(button => {
            button.removeEventListener('click', handleWorkerTabClick); 
            button.addEventListener('click', handleWorkerTabClick);
        });


        try {
            // 1. Fetch Resolved Count
            const countResponse = await fetch(`${API_URL}/reports/resolved-count`, {
                headers: { 'x-access-token': token }
            });
            if (!countResponse.ok) throw new Error('Could not fetch resolved count.');
            const countData = await countResponse.json();
            const resolvedCount = countData.count || 0; 
            // 💻 UX FIX: Update worker profile stat correctly
            document.getElementById('worker-profile-resolved-count').textContent = resolvedCount; 
            localStorage.setItem('workerResolvedCount', resolvedCount); 
            
            // 2. Fetch Reward Data (New)
            const rewardResponse = await fetch(`${API_URL}/auth/worker-rewards`, {
                headers: { 'x-access-token': token }
            });
            if (!rewardResponse.ok) throw new Error('Could not fetch reward data.');
            const rewardData = await rewardResponse.json();
            
            document.getElementById('worker-stat-points').textContent = rewardData.resolutionPoints.toLocaleString();
            document.getElementById('worker-stat-rank').textContent = `#${rewardData.rank}`;


            // 3. Fetch Assignments
            const reportsResponse = await fetch(`${API_URL}/reports/my-assignments`, {
                headers: { 'x-access-token': token }
            });
            if (!reportsResponse.ok) throw new Error('Could not fetch your assignments.');

            const reports = await reportsResponse.json();
            allFetchedWorkerReports = reports; // Store ALL reports

            // Client-side filter: Render default 'Active Assignments' tab view
            const activeTab = document.querySelector('#worker-report-tabs .citizen-tab-button[data-tab="active"]');
            handleWorkerTabClick({ currentTarget: activeTab });
            
        } catch (error) {
            console.error(error);
            document.getElementById('worker-assigned-reports').innerHTML = `<p style="text-align:center; color: var(--danger-color); padding: 20px;">${error.message}</p>`;
            
            // CRITICAL UX FIX: Set stats to 0/N/A on failure or zero reports
            document.getElementById('worker-stat-total').textContent = '0';
            document.getElementById('worker-stat-pending').textContent = '0';
            document.getElementById('worker-stat-progress').textContent = '0';
            document.getElementById('worker-stat-resolved-today').textContent = '0'; 
            document.getElementById('worker-profile-resolved-count').textContent = 'N/A'; 
            document.getElementById('worker-stat-points').textContent = 'N/A';
            document.getElementById('worker-stat-rank').textContent = 'N/A';
        }
         // ********** END MODIFICATION: WORKER DASHBOARD INIT **********
    }
    
    // NEW FUNCTION: Handle Worker Tab Click (segregation logic)
    function handleWorkerTabClick(e) {
        const selectedTab = e.currentTarget;
        const tabName = selectedTab.dataset.tab;
        
        // 1. Update active tab visual state
        document.querySelectorAll('#worker-report-tabs .citizen-tab-button').forEach(btn => btn.classList.remove('active'));
        selectedTab.classList.add('active');
        
        // 2. Filter reports based on the selected tab
        let filteredReports = [];
        if (tabName === 'active') {
            // Active = Pending OR In Progress OR Review Required
            filteredReports = allFetchedWorkerReports.filter(r => r.status === 'Pending' || r.status === 'In Progress' || r.status === 'Review Required');
        } else if (tabName === 'resolved') {
            // Resolved = Resolved OR Rejected (Finalized reports)
            filteredReports = allFetchedWorkerReports.filter(r => r.status === 'Resolved' || r.status === 'Rejected');
        }
        
        // 3. Render the filtered reports
        renderWorkerAssignedReports(filteredReports);
    }

    
    function openWorkerRejectionModal(reportId) {
        document.getElementById('rejection-modal-report-id').textContent = `#${reportId.slice(-6)}`;
        document.getElementById('rejection-report-id-input').value = reportId;
        workerRejectionModal.classList.add('active');
        rejectionForm.reset();
        document.getElementById('rejection-status-message').style.display = 'none';
    }


    // --- 2. MODIFIED FUNCTION: renderWorkerAssignedReports ---
    // REPLACE your entire existing renderWorkerAssignedReports function with this code.

    function renderWorkerAssignedReports(reports) {
        const container = document.getElementById('worker-assigned-reports');
        container.innerHTML = '';

        // Dummy definition for priorityClassMap to prevent error in prototype execution
        //const priorityClassMap = {'Low': 'status-pending', 'Medium': 'status-in-progress', 'High': 'status-resolved'};

        // --- MODIFIED: Stat calculation logic based on ALL reports stored in `allFetchedWorkerReports` ---
        const total = allFetchedWorkerReports.length;
        // Count Pending and Review Required reports together
        const pending = allFetchedWorkerReports.filter(r => r.status === 'Pending' || r.status === 'Review Required').length;
        const inProgress = allFetchedWorkerReports.filter(r => r.status === 'In Progress').length;

        // 💻 UX FIX: Display Total Resolved Count fetched during init
        const totalResolvedCount = localStorage.getItem('workerResolvedCount') || '0';

        document.getElementById('worker-stat-total').textContent = total;
        document.getElementById('worker-stat-pending').textContent = pending;
        document.getElementById('worker-stat-progress').textContent = inProgress;
        // 💻 UX FIX: Use the variable name that matches the stat card title (Total Resolved)
        document.getElementById('worker-stat-resolved-today').textContent = totalResolvedCount;
        // --- END MODIFIED STATS ---


        if (reports.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--secondary-color); padding: 20px;">No reports found in this view.</p>';
            return;
        }

        reports.forEach(report => {
            // CRITICAL FIX: Used 'status-rejected' for the final Rejected status.
            const statusClassMap = {'Pending': 'status-pending', 'In Progress': 'status-in-progress', 'Resolved': 'status-resolved', 'Review Required': 'status-pending', 'Rejected': 'status-rejected'}; 
    
            // CRITICAL: Actions are blocked if Resolved or if rejection is pending supervisor review
            const isResolvedOrFinalized = report.status === 'Resolved' || report.status === 'Review Required' || report.status === 'Rejected';
    
            // MODIFIED RESOLUTION ACTIONS BLOCK: Removed separate reject button
            const resolutionActions = isResolvedOrFinalized ? 
                // Display current status or resolution confirmation
                `<span class="badge ${statusClassMap[report.status]}" style="padding: 0.5rem 1rem;">${report.status === 'Review Required' ? 'Rejection Pending' : report.status}</span>` : 
                `
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-resolve resolve-media-btn" data-report-id="${report._id}" style="width: 100%;">
                        <i class="fas fa-upload"></i> Resolve
                    </button>
                </div>
                <select class="btn btn-secondary update-status-select" data-report-id="${report._id}" data-current-status="${report.status}" style="margin-top: 5px;">
                    <option value="" disabled>Change Status</option>
                    <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Rejected">Request Rejection</option>
                    <option value="Resolved" disabled>Resolved (via Upload)</option>
                </select>
                `;

            const submittedByName = report.submittedBy?.fullName || 'Citizen (Deleted)'; 
    
            const cardHTML = `
                <div class="report-card">
                    <div class="report-card-header">
                        <h4>${report.category} in ${report.area ? report.area.name : 'N/A'}</h4>
                        <div class="badges">
                            <span class="badge ${statusClassMap[report.status]}">${report.status}</span>
                            <span class="badge priority-${report.trashPriorityTag.toLowerCase()}">${report.trashPriorityTag}</span>
                        </div>
                    </div>
                    <div class="report-body">
                        <p><strong>Report ID:</strong> #${report.customReportId}</p>
                        <p><strong>Description:</strong> ${report.description.substring(0, 100)}...</p>
                        <p><strong>Submitted:</strong> ${new Date(report.createdAt).toLocaleDateString()} </p>
                    </div>
                    <div class="report-card-footer">
                        <div class="worker-resolve-actions" style="flex-grow: 1;">
                            ${resolutionActions}
                        </div>
                        <div class="actions">
                            <button class="btn btn-primary view-details-btn" data-report-id="${report._id}" style="padding: 0.5rem 1rem;">View Details</button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

        // Setup listener for worker status change (Now handles both API calls and Modal opening)
        document.querySelectorAll('.update-status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const reportId = e.target.dataset.reportId;
                const newStatus = e.target.value;
        
                if (newStatus === 'Rejected') {
                    // Prevent the direct API call and open the modal
                    openWorkerRejectionModal(reportId);
            
                    // CRITICAL FIX: Revert the dropdown selection until rejection is processed.
                    e.target.value = e.target.dataset.currentStatus; 
                    return;
                }
                // ... (handle Pending/In Progress status via API)
            });
        });

        // Setup listener for the new Upload Proof & Resolve button
        document.querySelectorAll('.resolve-media-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                document.getElementById('resolution-modal-report-id').textContent = `#${reportId.slice(-6)}`;
                document.getElementById('resolution-report-id-input').value = reportId;
                workerResolutionModal.classList.add('active');
                // Reset modal content
                resolutionUploadForm.reset();
                document.getElementById('resolution-file-preview-container').innerHTML = '';
                document.getElementById('resolution-upload-message').style.display = 'none';
                submitResolutionProofBtn.disabled = true;
            });
        });

        // Setup listener for View Details (using worker reports array)
        document.querySelectorAll('#worker-assigned-reports .view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                const reportData = allFetchedWorkerReports.find(r => r._id === reportId);
                openReportModal(reportData, 'worker');
            });
        });
    }
        
        // Setup listener for the new Upload Proof & Resolve button
        document.querySelectorAll('.resolve-media-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                document.getElementById('resolution-modal-report-id').textContent = `#${reportId.slice(-6)}`;
                document.getElementById('resolution-report-id-input').value = reportId;
                workerResolutionModal.classList.add('active');
                // Reset modal content
                resolutionUploadForm.reset();
                document.getElementById('resolution-file-preview-container').innerHTML = '';
                document.getElementById('resolution-upload-message').style.display = 'none';
                submitResolutionProofBtn.disabled = true;
            });
        });
        
        // Setup listener for View Details (using worker reports array)
        document.querySelectorAll('#worker-assigned-reports .view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                const reportData = allFetchedWorkerReports.find(r => r._id === reportId);
                openReportModal(reportData, 'worker');
            });
        });
        
    
    // NEW EVENT LISTENER: Worker Rejection Form Submission (Place this with other form handlers)
    rejectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const reportId = document.getElementById('rejection-report-id-input').value;
        const reason = rejectionReasonInput.value;

        // Validate minimum length (backend enforces 10)
        if (reason.length < 10) {
            alert("Reason must be at least 10 characters long.");
            return;
        }

        // CRITICAL FIX: Ensure the form is submitted as a pure JSON payload.
        // The handleWorkerStatusUpdate function is designed to send JSON when no file is present.

        // We call the unified status update function with the status 'Rejected' and the reason.
        handleWorkerStatusUpdate(reportId, 'Rejected', reason)
            .then(() => {
                // Close the modal after successful submission/review queueing
                workerRejectionModal.classList.remove('active');
            })
            .catch(() => {
                // Error handling is inside handleWorkerStatusUpdate
            });
    });
    
    
    // NEW EVENT LISTENER: Supervisor Final Rejection (Submit)
    supervisorRejectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // CRITICAL: Get ID from the form's dataset
        const reportId = supervisorRejectionForm.dataset.reportId; 
        const reason = supervisorReasonInput.value;
        if (!reason || reason.length < 10) {
            alert("Final rejection requires a detailed reason (min 10 characters).");
            return;
        }
        // Call handler with 'Rejected' status
        handleSupervisorDecision(reportId, 'Rejected', reason); 
    });

    // NEW EVENT LISTENER: Supervisor Override (Button Click)
    supervisorOverrideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // CRITICAL: Get ID from the form's dataset
        const reportId = supervisorRejectionForm.dataset.reportId; 
        // Call handler with 'In Progress' status
        handleSupervisorDecision(reportId, 'In Progress', null);
});

    // NEW FUNCTION: Handle Supervisor Decision (Final Rejection/Override)
    async function handleSupervisorDecision(reportId, finalStatus, finalRejectionReason) {
        const messageEl = document.getElementById('supervisor-status-message');
        messageEl.style.display = 'none';

        try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
    
            const response = await fetch(`${API_URL}/reports/${reportId}/supervise-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ 
                    finalStatus: finalStatus, 
                    finalRejectionReason: finalRejectionReason // Only needed if finalStatus is 'Rejected'
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to finalize report status.');
            }

            messageEl.textContent = data.message;
            messageEl.style.color = 'var(--success-color)';
            messageEl.style.display = 'block';
    
            // Refresh BBMP dashboard
            setTimeout(() => {
                supervisorRejectionModal.classList.remove('active');
                applyFilters('bbmp');
            }, 1500);

        } catch (error) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.style.color = 'var(--danger-color)';
            messageEl.style.display = 'block';
        }
    }
    
    // NEW FUNCTION: Handle Worker Status Update (Now only for In Progress or Pending)
    // File: prototype133.html (Replace the entire existing function)

    // MODIFIED FUNCTION: Handle Worker Status Update (to pass rejection reason)
    // MODIFIED FUNCTION: Handle Worker Status Update (to handle JSON/Form Data for non-file updates)
    async function handleWorkerStatusUpdate(reportId, newStatus, rejectionReason) {
        // Only proceed if status is valid or if it's Rejected (which requires reason)
        if (!['Pending', 'In Progress', 'Rejected'].includes(newStatus)) return;

        if (newStatus !== 'Rejected' && !confirm(`Are you sure you want to change the status of report #${reportId.slice(-6)} to "${newStatus}"?`)) {
            initializeWorkerDashboard(); // Revert UI on cancel
            return;
        }

        // 💡 CRITICAL FIX: Use the dedicated JSON-only endpoint
        const url = `${API_URL}/reports/${reportId}/status/json`; 

        try {
            const token = localStorage.getItem(WORKER_TOKEN_KEY);

            const response = await fetch(url, {
                method: 'PUT',
                headers: { 
                    // CRITICAL: Send pure JSON for this new endpoint
                    'Content-Type': 'application/json', 
                    'x-access-token': token 
                },
                body: JSON.stringify({ status: newStatus, rejectionReason: rejectionReason }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update report status.');
            }

            // Handle success message based on status
            const message = newStatus === 'Rejected' 
                ? `Report #${reportId.slice(-6)} marked for rejection review.`
                : `Report #${reportId.slice(-6)} status updated to "${newStatus}" successfully!`;
    
            alert(message);

            // Refresh the dashboard
            initializeWorkerDashboard();

        } catch (error) {
            alert(`Error updating status: ${error.message}`);
            initializeWorkerDashboard(); // Revert/refresh
        }
    }
    
    // NEW FUNCTION: Fetches all admin reports WITHOUT filters for dashboard/analytics
    async function fetchAdminReportsForDashboard() {
        try {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            // CRITICAL FIX: Ensure no filter params are passed here
            const response = await fetch(`${API_URL}/reports/all`, {
                headers: { 'x-access-token': token }
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server responded with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch dashboard reports:", error.message);
            return [];
        }
    }


    // BBMP DASHBOARD INITIALIZATION
    let weeklyChart, deptChart, analyticsMap;

    const initializeAdminDashboard = async () => {
        const tabs = document.querySelectorAll(
            '#admin-dashboard-page .admin-tab-button'
        );
        const contents = document.querySelectorAll(
            '#admin-dashboard-page .admin-tab-content'
        );
    
        Chart.defaults.color = '#64748B';
        Chart.defaults.borderColor = '#E2E8F0';
    
        const loadingOverlay = document.getElementById('admin-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) {
            showPage('admin-login-page');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }

        // Fetch reports needed for the dashboard/analytics (unfiltered)
        const dashboardReports = await fetchAdminReportsForDashboard();
allFetchedReports = dashboardReports;

// Tab click behaviour (Dashboard / Manage / Analytics)
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');

        const activeTab = document.getElementById('tab-' + tab.dataset.tab);
        if (activeTab) activeTab.classList.add('active');

        if (tab.dataset.tab === 'analytics') {
            updateAnalyticsTab(dashboardReports, 'admin');
            setTimeout(
                () => initAnalyticsMap(dashboardReports, 'analytics-map-container'),
                50
            );
        } else if (tab.dataset.tab === 'dashboard') {
            updateDashboardStats(dashboardReports, 'admin');
        } else if (tab.dataset.tab === 'manage') {
            // Manage tab should apply its default/current filters
            applyFilters('admin', false);
        }
    });
});
        
        // Setup BBMP Report Segregation Tab Listeners only once
        document.querySelectorAll('#bbmp-report-tabs .citizen-tab-button').forEach(button => {
            button.removeEventListener('click', handleBBMPTabClick); 
            button.addEventListener('click', handleBBMPTabClick);
        });


        // Initialize charts for Admin dashboard
if (weeklyChart) weeklyChart.destroy();
weeklyChart = new Chart(document.getElementById('weeklyActivityChart'), {
    type: 'bar',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Reports',
            data: [],
            backgroundColor: 'rgba(0, 198, 255, 0.7)'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
    }
});

if (deptChart) deptChart.destroy();
deptChart = new Chart(document.getElementById('departmentDonutChart'), {
    type: 'doughnut',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [
                '#F59E0B',
                '#EF4444',
                '#00C6FF',
                '#3B82F6',
                '#64748B'
            ]
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#64748B' }
            }
        }
    }
});

// Set up filter listeners for Admin
setupFilterEventListeners('admin');

// Default to Dashboard tab
const defaultTab = document.querySelector(
    '#admin-dashboard-page .admin-tab-button[data-tab="dashboard"]'
);
if (defaultTab) defaultTab.click();

if (loadingOverlay) loadingOverlay.style.display = 'none';
};
    
    // NEW FUNCTION: Fetches all BBMP reports WITHOUT filters for dashboard/analytics
    async function fetchBBMPReportsForDashboard() {
        try {
             const token = localStorage.getItem(BBMP_TOKEN_KEY);
             // ⚠️ FIX: Fetch all staff-reports, filters are applied on the backend now.
             const response = await fetch(`${API_URL}/reports/staff-reports`, {
                headers: { 'x-access-token': token }
             });

             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || `Server responded with status ${response.status}`);
             }
             return await response.json();
        } catch (error) {
             console.error("Failed to fetch BBMP dashboard reports:", error.message);
             return [];
        }
    }
    
    // NEW FUNCTION: Handle BBMP Tab Click (segregation logic)
    function handleBBMPTabClick(e) {
        const selectedTab = e.currentTarget;
        const tabName = selectedTab.dataset.tab;
        
        // 1. Update active tab visual state
        document.querySelectorAll('#bbmp-report-tabs .citizen-tab-button').forEach(btn => btn.classList.remove('active'));
        selectedTab.classList.add('active');
        
        // 2. Filter reports based on the selected tab
        let filteredReports = [];
        // NOTE: allFetchedBBMPReports contains the result of the LATEST filter applied via applyFilters()
        if (tabName === 'active') {
            filteredReports = allFetchedBBMPReports.filter(r => r.status === 'Pending' || r.status === 'In Progress' || r.status === 'Review Required'); // Include Review Required
        } else if (tabName === 'resolved') {
            filteredReports = allFetchedBBMPReports.filter(r => r.status === 'Resolved' || r.status === 'Rejected'); // Include Rejected
        }
        
        // 3. Render the filtered reports
        renderReportCards(filteredReports, 'bbmp');
    }


    // 3. MODIFICATION: Change from L.circle to L.marker
    const initAnalyticsMap = (reports = [], mapId) => {
         const mapContainer = document.getElementById(mapId);

         // Handle map instance destruction based on ID
         let currentMap = mapId === 'analytics-map-container' ? analyticsMap : bbmpAnalyticsMap;
         if (currentMap) { currentMap.remove(); currentMap = null; }

         if (mapContainer && mapContainer.offsetParent !== null) {
             const latLngs = reports.map(report => [report.location.coordinates[1], report.location.coordinates[0]]);
             const bounds = latLngs.length ? L.latLngBounds(latLngs) : [[12.9716, 77.5946], [12.9716, 77.5946]];
             
             const newMap = L.map(mapId).setView(bounds.getCenter(), latLngs.length > 0 ? 12 : 12);
             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                 attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               }).addTo(newMap);
             
             reports.forEach(report => {
                 // *** MODIFIED: Use L.marker for standard pin display ***
                 const latLng = [report.location.coordinates[1], report.location.coordinates[0]];
                 L.marker(latLng).addTo(newMap).bindPopup(`${report.category} (${report.area ? report.area.name : 'N/A'})`);
                 // *** END MODIFIED ***
             });
             
             if (latLngs.length > 1) {
                 newMap.fitBounds(bounds, { padding: [50, 50] });
             } else if (latLngs.length === 1) {
                 newMap.setView(latLngs[0], 16); // Zoom in on a single marker
             }

             if (mapId === 'analytics-map-container') { analyticsMap = newMap; } else { bbmpAnalyticsMap = newMap; }
         }
    };
    
    const fileUploadZone = document.getElementById('file-upload-zone');
    const fileInput = document.getElementById('issue-photo');
    const filePreviewContainer = document.getElementById('file-preview-container');
    
    // NEW: Function to handle file selection/preview logic
    function handleFileSelect(e, previewContainer, fileInputEl) {
        const files = e.target.files;
        if (!files.length) { previewContainer.innerHTML = ''; return; }
        const file = files[0];
        previewContainer.innerHTML = ''; 
        
        const previewWrapper = document.createElement('div');
        const fileName = document.createElement('p');
        fileName.className = 'file-preview-name';
        fileName.textContent = file.name;
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewWrapper.appendChild(img); 
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            previewWrapper.appendChild(video); 
        } else {
            fileName.textContent = `File selected: ${file.name} (Unsupported preview type)`;
        }
        previewWrapper.appendChild(fileName);
        previewContainer.appendChild(previewWrapper);
        
        // Re-set the file input's files property to ensure the form submits the selected file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputEl.files = dataTransfer.files;
        
        // For worker resolution: enable the submit button
        if (fileInputEl.id === 'resolution-media-file') {
             document.getElementById('submit-resolution-proof').disabled = false;
        }
    }

    // NEW: Event listener for Citizen Upload Source buttons
    document.querySelectorAll('#file-upload-zone .upload-source-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const source = e.currentTarget.dataset.source;
            if (source === 'camera') {
                fileInput.setAttribute('capture', 'camera');
                fileInput.click();
            } else {
                fileInput.removeAttribute('capture');
                fileInput.click();
            }
        });
    });
    fileInput.addEventListener('change', (e) => handleFileSelect(e, filePreviewContainer, fileInput));
    
    // **RECTIFICATION:** Event listener for Worker Resolution Upload Source buttons
    document.querySelectorAll('#resolution-file-upload-zone .resolution-upload-source-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent modal form submission
            const source = e.currentTarget.dataset.source;
            if (source === 'camera') {
                resolutionMediaFile.setAttribute('capture', 'camera');
                resolutionMediaFile.click();
            } else {
                resolutionMediaFile.removeAttribute('capture');
                resolutionMediaFile.click();
            }
        });
    });
    resolutionMediaFile.addEventListener('change', (e) => {
         const previewContainer = document.getElementById('resolution-file-preview-container');
         handleFileSelect(e, previewContainer, resolutionMediaFile);
    });


    
    const modal = document.getElementById('report-details-modal');
    let reportDetailMap;
    
    // NEW: Event listener for the Copy Report ID button
    document.getElementById('copy-report-id-btn').addEventListener('click', () => {
         const reportId = document.getElementById('modal-report-id-display').textContent;
         navigator.clipboard.writeText(reportId).then(() => {
             alert(`Report ID ${reportId} copied to clipboard!`);
         }).catch(err => {
             console.error('Failed to copy text: ', err);
             alert('Failed to copy Report ID.');
         });
    });


    // NEW FUNCTION: Toggles view back to location/original media
    const showLocation = (report, latitude, longitude) => {
        const mapContainerEl = document.getElementById('modal-map');
        const locationTitleEl = document.getElementById('modal-location-title');
        const coordinatesContainerEl = document.getElementById('modal-coordinates-container');
        const resolutionMediaContainer = document.getElementById('modal-resolution-media');
        const resolvedImageBtn = document.getElementById('resolved-image-btn');
        const viewLocationBtn = document.getElementById('view-location-btn');
        
        resolutionMediaContainer.style.display = 'none';
        resolvedImageBtn.style.display = 'block';
        viewLocationBtn.style.display = 'none';
        
        locationTitleEl.style.display = 'block'; 
        locationTitleEl.textContent = 'Location';
        mapContainerEl.style.display = 'block';
        coordinatesContainerEl.style.display = 'block';
        
        // Re-render map to fix sizing if it was previously hidden
        if(reportDetailMap) reportDetailMap.remove();
        const latLng = [latitude, longitude];
        reportDetailMap = L.map('modal-map').setView(latLng, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '© OpenStreetMap'
        }).addTo(reportDetailMap);
        L.marker(latLng).addTo(reportDetailMap);
        // Invalidate size to ensure map loads correctly after being hidden
        reportDetailMap.invalidateSize(); 
    };
    
    // NEW FUNCTION: Toggles view to resolution proof
    const showProof = (report) => {
        const mapContainerEl = document.getElementById('modal-map');
        const locationTitleEl = document.getElementById('modal-location-title');
        const coordinatesContainerEl = document.getElementById('modal-coordinates-container');
        const resolutionMediaContainer = document.getElementById('modal-resolution-media');
        const resolvedImageBtn = document.getElementById('resolved-image-btn');
        const viewLocationBtn = document.getElementById('view-location-btn');
        
        mapContainerEl.style.display = 'none';
        coordinatesContainerEl.style.display = 'none';
        resolvedImageBtn.style.display = 'none';
        viewLocationBtn.style.display = 'block';

        locationTitleEl.style.display = 'block'; 
        locationTitleEl.textContent = 'Resolution Proof';
        
        resolutionMediaContainer.style.display = 'block';
        
        const resImgEl = document.getElementById('modal-resolution-image');
        const resVideoEl = document.getElementById('modal-resolution-video');
        resImgEl.style.display = 'none';
        resVideoEl.style.display = 'none';
        
        // MODIFIED LINE: Use the path directly (it's a full Azure URL)
        const resMediaUrl = report.resolutionMediaPath; 

        if (report.resolutionMediaType === 'image') {
             resImgEl.src = resMediaUrl;
             resImgEl.style.display = 'block';
        } else if (report.mediaType === 'video') {
             resVideoEl.src = resMediaUrl;
             resVideoEl.controls = true;
             resVideoEl.style.display = 'block';
        }
    };

    // NEW HELPER: Formats milliseconds into a human-readable duration (e.g., "32 hrs, 15 min")
    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} min`);
        
        if (parts.length === 0) return 'Less than a minute';

        // Limit to the two most significant units
        if (parts.length > 2) parts = parts.slice(0, 2);
        
        return parts.join(', ');
    }
    
    // File: prototype133.html (Replace the entire existing function)

    // MODIFIED FUNCTION: openReportModal (Update to display rejection reason)
    // MODIFIED FUNCTION: openReportModal (Update to display rejection reason)
    function openReportModal(report, role = 'admin') {
        if (!report) return;

        // CRITICAL FIX: Determine the ID to display. It should be the custom ID, 
        // but fall back to a sliced ObjectId if the custom ID isn't present (for old reports).
        const displayId = report.customReportId || report._id.slice(-6); 

        // NEW: Set the Report ID display to the readable custom ID
        document.getElementById('modal-report-id-display').textContent = displayId; 

        // CRITICAL FIX: Use 'status-rejected' for the final Rejected status.
        const statusClassMap = {'Pending': 'status-pending', 'In Progress': 'status-in-progress', 'Resolved': 'status-resolved', 'Review Required': 'status-pending', 'Rejected': 'status-rejected'}; 

        document.getElementById('modal-report-title').textContent = `Details for Report #${displayId}`;
        document.getElementById('modal-category').textContent = report.category;
        document.getElementById('modal-description').textContent = report.description;

        const longitude = report.location.coordinates[0];
        const latitude = report.location.coordinates[1];

        document.getElementById('modal-coordinates').textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        document.getElementById('modal-area').textContent = report.area ? report.area.name : 'N/A';


        // 💻 UX FIX: Populate the Status & Priority Badges
        const badgesHtml = `
            <span class="badge ${statusClassMap[report.status]}">${report.status}</span>
        `;
        document.getElementById('modal-badges').innerHTML = badgesHtml;

        // Ensure container is visible now that we have content
        document.getElementById('modal-badges-container').style.display = 'block'; 

        // CRITICAL MODIFICATION: Hide Submitted By element (requested by user)
        document.getElementById('modal-submitted-by-container').style.display = 'none';


        // --- NEW FEATURE IMPLEMENTATION ---
        const submittedTime = new Date(report.createdAt);
        const resolvedTime = report.resolvedAt ? new Date(report.resolvedAt) : null;
        const isResolved = report.status === 'Resolved' && !!resolvedTime;
        const isRejectedFinal = report.status === 'Rejected'; // NEW CHECK

        // 1. Issue Submitted Time
        document.getElementById('modal-date-full').textContent = submittedTime.toLocaleString();

        // 2. Resolved Time & Solved In-Time
        const resolvedTimeContainer = document.getElementById('modal-resolved-time-container');
        const solvedInTimeContainer = document.getElementById('modal-solved-in-time-container');

        if (isResolved) {
            // Show resolved time
            document.getElementById('modal-resolved-time').textContent = resolvedTime.toLocaleString();
            resolvedTimeContainer.style.display = 'block';

            // Calculate and show solved in-time
            const durationMs = resolvedTime.getTime() - submittedTime.getTime();
            document.getElementById('modal-solved-in-time').textContent = formatDuration(durationMs);
            solvedInTimeContainer.style.display = 'block';

        } else {
            // Hide if not resolved
            resolvedTimeContainer.style.display = 'none';
            solvedInTimeContainer.style.display = 'none';
        }

        // --- NEW REJECTION REASON DISPLAY ---
        const rejectionReason = report.rejectionReason;
        const insertionPoint = document.getElementById('modal-resolved-time-container');

        // First, remove any existing rejection reason element from previous modals
        const existingReasonContainer = document.getElementById('modal-rejection-reason-container');
        if (existingReasonContainer) existingReasonContainer.remove();

        if (isRejectedFinal && rejectionReason) {
            const rejectionHtml = `
                <div class="modal-info-item" id="modal-rejection-reason-container" style="border-top: 2px solid var(--danger-color); padding-top: 10px;">
                    <strong>Rejection Reason</strong>
                    <span id="modal-rejection-reason" style="font-weight: 600; color: var(--danger-color);">${rejectionReason}</span>
                </div>
            `;
            insertionPoint.insertAdjacentHTML('beforebegin', rejectionHtml);
        }
        // --- END NEW REJECTION REASON DISPLAY ---


        const imgEl = document.getElementById('modal-image');
        const videoEl = document.getElementById('modal-video');
        imgEl.style.display = 'none'; videoEl.style.display = 'none';

        // MODIFIED LINE: Use the path directly (it's a full Azure URL)
        const mediaUrl = report.mediaPath; 

        if(report.mediaType === 'image') {
            imgEl.src = mediaUrl;
            imgEl.style.display = 'block';
        } else if (report.mediaType === 'video') {
            videoEl.src = mediaUrl;
            videoEl.controls = true;
            videoEl.style.display = 'block';
        }

        // --- CRITICAL MODIFICATION: Location/Proof Toggling and Button Management ---
        const resolutionMediaContainer = document.getElementById('modal-resolution-media');
        const resolvedImageBtn = document.getElementById('resolved-image-btn');
        const viewLocationBtn = document.getElementById('view-location-btn');
        const resImgEl = document.getElementById('modal-resolution-image');
        const resVideoEl = document.getElementById('modal-resolution-video');

        // Check Resolution Status and Media Path
        const hasProof = !!report.resolutionMediaPath;
        const statusText = report.status; 

        // 1. Determine Button Visibility (Always visible per user request)
        resolvedImageBtn.style.display = 'block';
        viewLocationBtn.style.display = 'none'; // Initially hidden

        // 2. Set Button Action (Core Logic)
        if (isResolved && hasProof) {
            // Case 1: Resolved and has proof -> Set action to toggle proof view
                const resMediaUrl = report.resolutionMediaPath; 
            resImgEl.src = resMediaUrl;
            resVideoEl.src = resMediaUrl;

            resolvedImageBtn.onclick = () => showProof(report); // Click to show proof
            viewLocationBtn.onclick = () => showLocation(report, latitude, longitude); // Click to show location
            
            // Default to showing the Location/Map first
            showLocation(report, latitude, longitude);

        } else {
         // Case 2: Not Resolved / No Proof / Rejected -> Set action to show alert

            // MODIFIED ACTION: Set onclick to show status alert
            resolvedImageBtn.onclick = () => {
                alert(`The work status is currently '${statusText}'. Resolution proof is not yet available.`);
            };

            // Ensure map and location containers are displayed (default view)
            const mapContainerEl = document.getElementById('modal-map');
            const locationTitleEl = document.getElementById('modal-location-title');
            const coordinatesContainerEl = document.getElementById('modal-coordinates-container');

            viewLocationBtn.style.display = 'none';
            resolutionMediaContainer.style.display = 'none';

            locationTitleEl.style.display = 'block'; 
            locationTitleEl.textContent = 'Location';
            mapContainerEl.style.display = 'block';
            coordinatesContainerEl.style.display = 'block';

            // Initialize location map for non-resolved view
            showLocation(report, latitude, longitude);
        }
        // --- END CRITICAL MODIFICATION ---


        const directionsBtn = document.getElementById('get-directions-btn');
        const destination = `${latitude},${longitude}`;
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

        if (directionsBtn) {
            directionsBtn.onclick = () => window.open(googleMapsUrl, '_blank');
        }

        const modal = document.getElementById('report-details-modal');
        modal.classList.add('active');

        setTimeout(() => {
            // Initialize map only if the map container is visible
            const mapContainerEl = document.getElementById('modal-map');
            if (mapContainerEl.offsetParent !== null) {
    
                // --- CRITICAL FIX 1: Ensure map instance is destroyed before reuse ---
                if(reportDetailMap) reportDetailMap.remove(); 
    
                const latLng = [latitude, longitude];
    
                reportDetailMap = L.map('modal-map').setView(latLng, 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                    attribution: '© OpenStreetMap'
                }).addTo(reportDetailMap);
                L.marker(latLng).addTo(reportDetailMap);
    
                // --- CRITICAL FIX 2: Invalidate size and then move the center slightly ---
                // This combination reliably forces the tile calculation and redraw.
                reportDetailMap.invalidateSize(true);
    
                // After invalidating size, briefly pan the map to a slightly different spot 
                // and then pan back immediately. This forces the tile layer to reload.
                const slightOffset = L.latLng(latitude + 0.00001, longitude);
                reportDetailMap.panTo(slightOffset, { animate: false });
                reportDetailMap.panTo(latLng, { animate: false });
            }
        }, 300);
    }

    // MODIFIED FUNCTION: closeReportModal (Cleanup)
    function closeReportModal() {
        modal.classList.remove('active');
        if (reportDetailMap) {
            reportDetailMap.remove();
            reportDetailMap = null;
        }
        // CRITICAL CLEANUP: Remove rejection reason element when closing modal
        const existingReasonContainer = document.getElementById('modal-rejection-reason-container');
        if (existingReasonContainer) existingReasonContainer.remove();
    }

    function closeReportModal() {
        modal.classList.remove('active');
        if (reportDetailMap) {
            reportDetailMap.remove();
            reportDetailMap = null;
        }
    }
    
    let allFetchedReports = [];
    let allFetchedBBMPReports = []; 
    
    // NEW: Array for worker reports
    let allFetchedWorkerReports = []; 


    function setupModalEventListeners(dashboard) {
        let reports = [];
        let containerSelector = '';
        
        if (dashboard === 'admin') {
            reports = allFetchedReports;
            containerSelector = '#tab-manage .report-card-list';
        } else if (dashboard === 'bbmp') {
            reports = allFetchedBBMPReports;
            containerSelector = '.bbmp-report-card-list';
        } else if (dashboard === 'worker') {
            // For worker dashboard, the listener is attached directly in renderWorkerAssignedReports
            // so we skip this generic setup for workers
            return;
        }

        // Remove existing listeners to prevent duplicates
        document.querySelectorAll(`${containerSelector} .view-details-btn`).forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // Add new listeners
        document.querySelectorAll(`${containerSelector} .view-details-btn`).forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                const reportData = reports.find(r => r._id === reportId);
                openReportModal(reportData, dashboard);
            });
        });

        document.getElementById('modal-close-btn').addEventListener('click', closeReportModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeReportModal();
            }
        });
    }

    function renderReportCards(reports, dashboard) {
        const containerSelector = dashboard === 'admin' ? '#tab-manage .report-card-list' : '.bbmp-report-card-list';
        const container = document.querySelector(containerSelector);
        if (!container) return;
        container.innerHTML = '';

        if (reports.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">No reports found in this view.</p>';
            return;
        }

        reports.forEach(report => {
            // CRITICAL FIX: Include new statuses in the map
            const statusClassMap = {'Pending': 'status-pending', 'In Progress': 'status-in-progress', 'Resolved': 'status-resolved', 'Review Required': 'status-pending', 'Rejected': 'status-rejected'};
            
            // NEW: Display assigned worker if available
            const assignedWorkerName = report.assignedTo && report.assignedTo.fullName 
                ? report.assignedTo.fullName
                : 'Unassigned';
                
            const assignedWorkerColor = report.assignedTo ? '#3B82F6' : 'var(--warning-color)';
            
            // Determine if this report is in review
            const isReviewRequired = report.status === 'Review Required';
            
            const isResolved = report.status === 'Resolved';

            // **LOCATION OF THE ASSIGN WORKER BUTTON LOGIC**
            // Only show Assign button on BBMP dashboard if NOT resolved and NOT assigned AND NOT under review
            const assignmentButton = (dashboard === 'bbmp' && !isResolved && !report.assignedTo && !isReviewRequired)
                ? `<button class="btn btn-secondary assign-init-btn" data-report-id="${report._id}" style="padding: 0.5rem 1rem; margin-right: 5px;">Assign Worker</button>` 
                : '';
            
            // NEW: Supervisor Review Button
            const supervisorActionButton = (dashboard === 'bbmp' && isReviewRequired)
                ? `<button class="btn btn-sign-out supervisor-review-btn" data-report-id="${report._id}" data-reason="${report.rejectionReason || 'No reason provided.'}" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-exclamation-triangle"></i> Review Rejection
                    </button>` 
                : '';
            //
                
            
            // CRITICALLY MODIFIED: View Resolution Proof button for non-worker dashboards
            // Only show this button if the status is Resolved AND there is a resolution path
            const resolutionProofButton = (report.resolutionMediaPath && isResolved)
                ? `<button class="btn btn-success view-resolution-btn" data-report-id="${report._id}" style="padding: 0.5rem 1rem;"><i class="fas fa-camera"></i> View Proof</button>`
                : '';
            
             // Status dropdown for Admin/BBMP (Worker has a different one)
            // MODIFIED: Remove dropdown if dashboard is 'admin' or 'bbmp'
            const statusBadge = `<span class="badge ${statusClassMap[report.status]}">${report.status}</span>`;
            // 💻 UX FIX: Restore Priority badge display for all dashboards (Admin/BBMP too)

            // 💡 MODIFIED: Include the trashPriorityTag field
            const badgesHtml = `${statusBadge}`;
            
            // End modification for BBMP/Admin Dashboard

            // Combine buttons in the footer
            // MODIFIED: Group the Action buttons (View Details/Proof/Assign) and move them to the RIGHT side
            const actionButtonsBlock = `
                <div class="actions" style="display: flex; gap: 10px;">
                    ${assignmentButton} 
                    ${supervisorActionButton} 
                    ${resolutionProofButton} 
                    <button class="btn btn-secondary view-details-btn" data-report-id="${report._id}" style="padding: 0.5rem 1rem;">View Details</button>
                </div>
            `;
            
            // Determine left-side content (Status Dropdown for BBMP, nothing for Admin/Worker list view)
            // MODIFIED: Left-side content is empty for BBMP/Admin now.
            const leftSideContent = '';


            const cardHTML = `
                <div class="report-card">
                    <div class="report-card-header">
                        <h4>${report.category} in ${report.area ? report.area.name : 'N/A'}</h4>
                        <div class="badges">
                            ${badgesHtml}
                        </div>
                    </div>
                    <div class="report-body">
                        <p><strong>Description:</strong> ${report.description.substring(0, 70)}...</p>
                        <p><strong>Submitted:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
                        <p style="font-size: 0.9em; margin: 0; color: ${assignedWorkerColor};">Assigned: <strong>${assignedWorkerName}</strong></p>
                    </div>
                    <div class="report-card-footer" style="justify-content: flex-end;"> 
                        ${leftSideContent}
                        ${actionButtonsBlock}
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });
        
        // New: Set up the assignment button listeners only for BBMP dashboard
        if (dashboard === 'bbmp') {
            document.querySelectorAll('.assign-init-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const reportId = e.currentTarget.dataset.reportId;
                    document.getElementById('assign-modal-report-id-display').textContent = `#${reportId.slice(-6)}`;
                    assignWorkerModal.classList.add('active');
                    fetchWorkersForAssignment(reportId); // <-- Initiates modal data fetch
                });
            });
            
            // NEW: Supervisor Review button listener (uses event delegation on the list container)
            // Listener setup is handled after renderReportCards by the `if (document.querySelector('.bbmp-report-card-list'))` block.
        }
        
        // NEW LISTENER: Handle the View Proof button click (for Admin/BBMP lists)
        document.querySelectorAll('.view-resolution-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                
                // Determine which report list to search
                const reportsArray = dashboard === 'admin' ? allFetchedReports : allFetchedBBMPReports;
                const reportData = reportsArray.find(r => r._id === reportId);
                
                if (reportData) {
                    openReportModal(reportData, dashboard);
                    // Immediately switch the modal view to show the proof (this clicks the internal toggle button)
                    setTimeout(() => {
                        const resolvedImageBtn = document.getElementById('resolved-image-btn');
                        if (resolvedImageBtn && resolvedImageBtn.style.display !== 'none') {
                            resolvedImageBtn.click();
                        }
                    }, 100); // Small delay to ensure modal is rendered
                }
            });
        });


        setupModalEventListeners(dashboard);
    }

    // FIX 1 & 2: Modified applyFilters to support isolated filtering
    async function applyFilters(dashboard, initialLoad = false) {
        const prefix = dashboard === 'admin' ? '' : 'bbmp-';
        const listSelector = dashboard === 'admin' ? '#tab-manage .report-card-list' : '.bbmp-report-card-list';
        
        if (dashboard !== 'admin' && dashboard !== 'bbmp') return;

        // Only pull filters from inputs if it's NOT the initial dashboard load 
        const searchTerm = document.getElementById(`${prefix}filter-search`).value;
        const category = document.getElementById(`${prefix}filter-category`).value;
        
        // --- MODIFIED: Read Status for both Admin and BBMP if present ---
        let status = 'All Statuses';
        const statusEl = document.getElementById(`${prefix}filter-status`);
        if (statusEl) {
             status = statusEl.value;
        }

        // Priority parameter retrieval removed and ignored per request.
        
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (category !== 'All Categories') params.append('category', category);
        
        // FIX: If status is set (for Admin OR BBMP), include it in the URL
        if (status !== 'All Statuses') params.append('status', status);

        
        // --- UX FIX: Set Loading State for Report List ---
        document.querySelector(listSelector).innerHTML = '<p style="text-align:center; color: var(--secondary-color); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading reports...</td></tr>';
        // --- END UX FIX ---

        try {
            let url = `${API_URL}/reports/all?${params.toString()}`;
            let token = localStorage.getItem(ADMIN_TOKEN_KEY);
            
            if (dashboard === 'bbmp') {
                // CRITICAL FIX: Ensure BBMP sends filters in the staff-reports endpoint
                url = `${API_URL}/reports/staff-reports?${params.toString()}`;
                token = localStorage.getItem(BBMP_TOKEN_KEY);
            }
            
            const response = await fetch(url, {
                headers: { 'x-access-token': token }
            });
            
            if (!response.ok) {
                // FIX: Improved error message for failed authorization
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                     // Check for 401/403 status specifically for a better alert
                    if (response.status === 401 || response.status === 403) {
                         throw new Error(`Authentication Failed: Session invalid or expired. Please log in again.`);
                    }
                    throw new Error(`Could not fetch reports. Server responded with status ${response.status}`);
                }
                throw new Error(errorData.message || 'Could not fetch reports.');
            }
            
            const reports = await response.json();

            if (dashboard === 'admin') {
                allFetchedReports = reports;
                // Render reports list *only* for the manage tab
                renderReportCards(allFetchedReports, 'admin');
                
                
            } else {
                allFetchedBBMPReports = reports;
                
                // Client-side filter: Render default 'Active' tab view using the newly filtered list
                const activeTab = document.querySelector('#bbmp-report-tabs .citizen-tab-button[data-tab="active"]');
                handleBBMPTabClick({ currentTarget: activeTab });
            }


        } catch (error) {
            console.error("Filter Error:", error);
            document.querySelector(listSelector).innerHTML = `<p style="color: var(--danger-color);">${error.message}</p>`;
             // If the error is an auth failure, prompt login
             if (error.message.includes("Authentication Failed") && dashboard === 'admin') {
                  alert(error.message);
                  sessionStorage.removeItem('isAdminLoggedIn');
                  localStorage.removeItem(ADMIN_TOKEN_KEY);
                  showPage('admin-login-page');
             }
        }
    }
    
    function setupFilterEventListeners(dashboard) {
        const prefix = dashboard === 'admin' ? '' : 'bbmp-';
        
        // Create a debounced handler that waits 300ms after input stops
        const debouncedHandler = debounce(() => applyFilters(dashboard, false), 300);

        // Apply the debounced handler to the search input
        document.getElementById(`${prefix}filter-search`).addEventListener('input', debouncedHandler);
        
        // Keep the non-debounced handler for select changes
        const handler = () => applyFilters(dashboard, false);
        document.getElementById(`${prefix}filter-category`).addEventListener('change', handler);
        
        // Add Status listener for both Admin and BBMP
        const statusEl = document.getElementById(`${prefix}filter-status`);
        if(statusEl) statusEl.addEventListener('change', handler);
    }
    
    // FIX 2: Modified updateDashboardStats to update the Weekly Chart
    // FIX 2: Modified updateDashboardStats to update the Weekly Chart
function updateDashboardStats(reports, dashboard) {
const prefix = dashboard === 'admin' ? 'admin-' : 'bbmp-';
const chartWeekly = dashboard === 'admin' ? weeklyChart : bbmpWeeklyChart;
const chartDept   = dashboard === 'admin' ? deptChart   : bbmpDeptChart;

const today = new Date().toDateString();

// NEW LOGIC: Calculate reports resolved today
const resolvedTodayCount = reports.filter(r => 
    r.status === 'Resolved' && new Date(r.updatedAt).toDateString() === today
).length;

// Update Header Stats
document.getElementById(`${prefix}stat-total`).textContent = reports.length;
// CRITICAL MODIFICATION: Update the resolved today stat
document.getElementById(`${prefix}stat-resolved-today`).textContent = resolvedTodayCount;

// UX Fix: Placeholder for Avg. Resolution Time (complex to calculate in frontend)
const avgResolutionCard = document.querySelector(
    `#${prefix}dashboard-page .summary-stat-card:nth-child(2) .stat-value`
);
if (avgResolutionCard) {
    avgResolutionCard.textContent = reports.length > 0 ? '2.8 Days' : 'N/A';
}

// ---------- Category Donut Chart ----------
const categoryCounts = reports.reduce((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
}, {});

chartDept.data.labels = Object.keys(categoryCounts);
chartDept.data.datasets[0].data = Object.values(categoryCounts);
chartDept.update();

// ---------- Weekly Bar Chart (Mon–Sun) ----------
const weeklyCounts = new Array(7).fill(0); // 0 = Sun, 6 = Sat

reports.forEach(report => {
    const dayIndex = new Date(report.createdAt).getDay(); // 0–6
    weeklyCounts[dayIndex] += 1;
});

// Rotate so Monday is first: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
const rotatedCounts = [
    weeklyCounts[1], // Mon
    weeklyCounts[2],
    weeklyCounts[3],
    weeklyCounts[4],
    weeklyCounts[5],
    weeklyCounts[6],
    weeklyCounts[0]  // Sun
];

chartWeekly.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
chartWeekly.data.datasets[0].data = rotatedCounts;
chartWeekly.update();
}


    function updateAnalyticsTab(reports, dashboard) {
        const prefix = dashboard === 'admin' ? 'analytics-' : 'bbmp-analytics-';
        const total = reports.length;
        const container = document.getElementById(`${prefix}trends-list`);
        if (!container) return;
        
         // --- UX FIX: Set Loading State for Trends List ---
        container.innerHTML = '<p style="text-align:center; color: var(--secondary-color); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading trends...</p>';

        const categoryCounts = reports.reduce((acc, report) => {
            acc[report.category] = (acc[report.category] || 0) + 1;
            return acc;
        }, {});
        
        const categoryColors = {
            'Overflowing Bin': 'var(--warning-color)',
            'Illegal Dumping': 'var(--danger-color)',
            'E-Waste Pickup': 'var(--primary-color)',
            'Unsegregated Waste': '#3B82F6',
            'Hazardous Waste': '#64748B',
            'Bulk Waste': '#F59E0B',
            'Others': 'var(--secondary-color)' // Added 'Others'
        };

        container.innerHTML = '';
        if (total === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">No data available for trends.</p>';
            return;
        }
        for (const category in categoryCounts) {
            const count = categoryCounts[category];
            const percentage = ((count / total) * 100).toFixed(1);
            const color = categoryColors[category] || categoryColors['Others']; // Use 'Others' color as default
            const trendHTML = `
                <div class="trend-item">
                    <div class="trend-label">
                        <span>${category}</span>
                        <span>${percentage}%</span>
                    </div>
                    <div class="trend-bar-bg">
                        <div class="trend-bar" style="width: ${percentage}%; background-color: ${color};"></div>
                    </div>
                </div>
            `;
            container.innerHTML += trendHTML;
        }
    }

    // 2. MODIFICATION: Ensure password toggles are set up for newly wrapped fields
    function setupPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.currentTarget.previousElementSibling;
                const currentType = input.getAttribute('type');
                if (currentType === 'password') {
                    input.setAttribute('type', 'text');
                    e.currentTarget.classList.remove('fa-eye');
                    e.currentTarget.classList.add('fa-eye-slash');
                } else {
                    input.setAttribute('type', 'password');
                    e.currentTarget.classList.remove('fa-eye-slash');
                    e.currentTarget.classList.add('fa-eye');
                }
            });
        });
    }
    
    // Helper to normalize area name for deterministic credentials
    function cleanAreaName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    
    // Helper to normalize name for unique worker email generation
    function cleanNameBase(fullName) {
         const parts = fullName.split(/\s+/).filter(p => p.length > 0);
         const firstName = parts[0] || 'worker';
         const lastName = parts[parts.length - 1] || 'bbmp';
         return `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    
    function generateLocalDummyPassword(idSlice) {
        return `Ur@Wk-${idSlice}`;
    }

    // --- CORE FETCH FUNCTION FOR AREAS/WORKERS ---
    // Fetch Areas (used for Admin Area Mgmt and Citizen Autocomplete)
    async function fetchAreas(renderList = false, isAreaList = true) {
         // For Workers (isAreaList=false), we use the internal=manage flag to get all workers regardless of provisioned account status
         const url = isAreaList ? `${API_URL}/areas` : `${API_URL}/workers?internal=manage`; 
         try {
            // Use the correct token based on the caller's context
            // ⚠️ FIX: If fetching areas for citizen report (no active session), allow fetch without token.
            const token = isAreaList && !getActiveToken() ? '' : (isAreaList ? localStorage.getItem(ADMIN_TOKEN_KEY) : localStorage.getItem(BBMP_TOKEN_KEY)); 
            const fetchOptions = { headers: {} };
            if (token) {
                 fetchOptions.headers['x-access-token'] = token;
            }
            
            const response = await fetch(url, fetchOptions);
            // ⚠️ FIX: Check if response is ok OR if we are fetching public areas with no token (allow 403/401 here but don't fail)
            if (!response.ok && response.status !== 403 && response.status !== 401 && response.status !== 404) {
                const errorText = await response.json();
                throw new Error(errorText.message || `Could not fetch ${isAreaList ? 'areas' : 'workers'}. Server returned status ${response.status}.`);
            }
            
            // If it's a critical route (e.g., workers for BBMP mgmt) and auth failed, throw explicitly
             if (!isAreaList && (response.status === 403 || response.status === 401)) {
                  throw new Error('Authorization failed. Please log in to BBMP portal.');
             }
            
            const data = await response.json();

            if (isAreaList) {
                availableAreas = data;
                if (renderList) renderAreaList(data); // Render for Admin Area List
                // Populate Admin BBMP Account Select here using area data
                if (document.getElementById('bbmp-area-select').dataset.mode === 'area-admin') {
                    populateBBMPAreaSelect(data);
                }
            } else {
                // Worker data used for management is unfiltered
                availableWorkers = data; 
                if (renderList) renderWorkerList(data); // Render for BBMP Worker Management Modal
                // Populate BBMP Worker Account Select here using worker data
                if (document.getElementById('bbmp-area-select').dataset.mode === 'worker-bbmp') {
                    populateBBMPAreaSelect(data); 
                }
            }
         } catch (error) {
            console.error(`Fetch ${isAreaList ? 'Area' : 'Worker'} error:`, error);
            const targetListId = isAreaList ? 'current-areas-list' : 'current-workers-list'; 
            const errorMsg = `<p style="color: var(--danger-color); padding: 10px;">${error.message}</p>`;
            if (renderList) {
                 document.getElementById(targetListId).innerHTML = errorMsg;
            }
            // Important: clear the list on hard failure
            if (isAreaList) availableAreas = []; else availableWorkers = [];
         }
    }
    
    // --- ADMIN AREA MANAGEMENT LOGIC ---

    // ADMIN BUTTON LISTENER (Restored to original Area function)
    manageAreasBtn.addEventListener('click', () => {
         adminMenuContent.style.display = 'none';
         bbmpWorkerManagementModal.classList.remove('active'); // Close worker modal if open
         areaManagementModal.classList.add('active');
         
         // Restore Admin Area Modal defaults
         document.querySelector('#area-management-modal h3').textContent = 'Manage Areas';
         document.getElementById('add-area-form').querySelector('h4').textContent = 'Add New Area';
         
         let areaInputEl = document.getElementById('new-area-name') || document.getElementById('new-worker-name');
         areaInputEl.id = 'new-area-name';
         document.getElementById('new-area-name').placeholder = 'Enter new area name';
         document.getElementById('add-area-form').querySelector('button[type="submit"]').textContent = 'Add Area';
         document.getElementById('current-areas-list').previousElementSibling.textContent = 'Current Areas';

         fetchAreas(true, true); // Fetch and render AREAS for Admin
    });
    
    // RENDER ADMIN AREAS
    function renderAreaList(areas) {
         currentAreasList.innerHTML = '';
         if (areas.length === 0) {
             currentAreasList.innerHTML = `<p style="color: var(--secondary-color); padding: 10px; text-align: center;">No areas defined yet. Add one above.</p>`;
             return;
         }
         areas.forEach(area => {
            const item = document.createElement('div');
            item.className = 'area-list-item';
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid var(--border-color);';
            item.innerHTML = `
                <span>${area.name}</span>
                <button data-area-id="${area._id}" class="btn btn-sign-out remove-area-btn" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            currentAreasList.appendChild(item);
         });
         document.querySelectorAll('.remove-area-btn').forEach(button => {
            button.addEventListener('click', handleRemoveArea);
         });
    }
    
    // ADMIN REMOVE AREA
    async function handleRemoveArea(e) {
        const areaId = e.currentTarget.dataset.areaId;
        if (!confirm('Are you sure you want to remove this area? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            const response = await fetch(`${API_URL}/reports/all`, {
            headers: { 'x-access-token': token }
        });
    
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw new Error(`Failed to remove area. Server returned status ${response.status}.`);
                }
                throw new Error(errorData.message || 'Failed to remove area due to server error.');
            }

            // CRITICAL FIX: Refresh both the modal list (true, true) and the global area list (false, true)
            fetchAreas(true, true); // Refresh Admin Areas Modal list
            fetchAreas(false, true); // Refresh Areas for autocomplete dropdown
            alert('Area removed successfully!');

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // ADMIN ADD AREA / BBMP ADD WORKER handler
    addAreaForm.addEventListener('submit', async (e) => {
         e.preventDefault();
         // Check if the form is running in 'Area' mode (Admin) or 'Worker' mode (BBMP)
         const isWorkerAction = document.querySelector('#area-management-modal h3').textContent === 'Manage Workers';

         if (isWorkerAction) {
             // Forward to BBMP Worker Add Logic
             const workerName = document.getElementById('new-area-name').value; // FIX: Use the dynamically set ID
             handleWorkerAdd(workerName);
             return;
         }
         
         // Original Admin Area Logic
         const newAreaName = document.getElementById('new-area-name').value;
         if (!newAreaName) return;

         try {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            const response = await fetch(`${API_URL}/areas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ name: newAreaName }),
            });
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw new Error(`Failed to add area. Server returned status ${response.status}.`);
                }
                throw new Error(errorData.message || 'Failed to add area due to server error.');
            }

            document.getElementById('new-area-name').value = '';
            fetchAreas(true, true); // Refresh Admin Areas
            fetchAreas(false, true); // Refresh Areas for autocomplete dropdown
            alert('Area added successfully!');

         } catch (error) {
            alert(`Error: ${error.message}`);
         }
    });
    
    areaModalCloseBtn.addEventListener('click', () => {
         areaManagementModal.classList.remove('active');
         
         // Restore default Admin Modal structure after closing
         document.querySelector('#area-management-modal h3').textContent = 'Manage Areas';
         document.getElementById('add-area-form').querySelector('h4').textContent = 'Add New Area';
         
         let areaInputEl = document.getElementById('new-area-name');
         areaInputEl.placeholder = 'Enter new area name'; 

         document.getElementById('current-areas-list').previousElementSibling.textContent = 'Current Areas';

         fetchAreas(false, true); // Re-fetch Areas for autocomplete dropdown
    });
    
    // --- ADMIN BBMP ACCOUNT MANAGEMENT (FIXED) ---

    // --- NEW FUNCTION: Provision/Re-provision BBMP/Worker Account ---
    // --- NEW FUNCTION: Provision/Re-provision BBMP/Worker Account ---
    createBBMPAccountBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const button = e.currentTarget;
        
        // Check the operating mode (Admin Staff Account or BBMP Worker Account)
        const isAreaAdminMode = bbmpAreaSelect.dataset.mode === 'area-admin';
        
        // Collect data based on mode
        const areaId = button.dataset.areaId;
        const workerId = button.dataset.workerId; // Worker Document ID
        const areaName = button.dataset.areaName; // Area Name (for Admin)
        const workerDocumentName = button.dataset.workerDocumentName; // Worker Name (for BBMP)
        const workerFullName = button.dataset.workerFullName; // Worker's actual full name (for BBMP)
        
        // Use the correct token (Admin token for provisioning both types)
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const statusMessageEl = document.getElementById('bbmp-reset-message');
        statusMessageEl.style.display = 'none';

        if (!token) {
             alert("Access Denied: Admin login required to provision accounts.");
             return;
        }

        // Disable button during API call
        button.disabled = true;
        button.textContent = "Processing...";

        try {
            let payload = {};
            
            if (isAreaAdminMode) {
                // Payload for BBMP Staff Account
                payload = { areaId, areaName };
            } else {
                // Payload for BBMP Worker User Account
                payload = { 
                    workerId: workerId, // Worker Document ID
                    areaName: localStorage.getItem(BBMP_AREA_NAME_KEY), // Staff's own area name is needed for worker email generation
                    workerDocumentName: workerDocumentName // Name of the worker document (e.g., Ramu S)
                };
            }

            const response = await fetch(`${API_URL}/auth/bbmp-create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Account creation/reset failed.');
            }
            
            // Success: Update local storage flags (used to change button text)
            const targetId = isAreaAdminMode ? areaId : workerId;
            const storageKey = isAreaAdminMode ? `BBMP_ACCOUNT_${targetId}` : `WORKER_EMAIL_${targetId}`;
            localStorage.setItem(storageKey, data.user.email);
            
            // Update button text and status message
            statusMessageEl.textContent = data.message;
            statusMessageEl.style.color = 'var(--success-color)';
            button.textContent = isAreaAdminMode ? 'Account Exists (Re-Provision)' : 'Account Exists (Re-Provision)';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            
            // Update displayed credentials (password is returned on creation/reset)
            document.getElementById('bbmp-username-display').textContent = data.user.email;
            document.getElementById('bbmp-password-display').textContent = data.user.password;
            
        } catch (error) {
            statusMessageEl.textContent = `Error: ${error.message}`;
            statusMessageEl.style.color = 'var(--danger-color)';
            
        } finally {
            statusMessageEl.style.display = 'block';
            button.disabled = false;
            // Ensure the button text is correctly updated based on final state
            if (button.textContent === "Processing...") {
                const targetId = isAreaAdminMode ? areaId : workerId;
                const storageKey = isAreaAdminMode ? `BBMP_ACCOUNT_${targetId}` : `WORKER_EMAIL_${targetId}`;
                const isProvisioned = !!localStorage.getItem(storageKey);
                button.textContent = isProvisioned ? 'Account Exists (Re-Provision)' : (isAreaAdminMode ? 'Create Account' : 'Provision Account');
            }
        }
    });
    // --- END NEW FUNCTION: Provision/Re-provision BBMP/Worker Account ---
    // --- END NEW FUNCTION: Provision/Re-provision BBMP/Worker Account ---
    
    // ADMIN BBMP ACCOUNT BUTTON LISTENER (Fixed to use Area data)
    // File: prototype133.html (Continuation of JavaScript <script> block)

    manageBBMPAccountsBtn.addEventListener('click', () => {
        adminMenuContent.style.display = 'none';
        bbmpAccountModal.classList.add('active'); // Open the modal

         // Set Modal to Admin Area Mode
        document.querySelector('#bbmp-account-modal h3').textContent = 'Municipal Staff Account Management';
        document.querySelector('label[for="bbmp-area-select"]').textContent = 'Select Area';
        document.querySelector('#bbmp-area-name-display').textContent = 'Area';
        document.getElementById('bbmp-area-select').dataset.mode = 'area-admin'; // Set mode for generic handling
         
        // Fetch Areas and Populate Select (renderList=true to trigger renderAreaList)
        fetchAreas(true, true); // Fetches areas and calls populateBBMPAreaSelect
         
        // Setup the handlers/display elements for this mode
        setupBBMPAccountManagement();
    });
    
    // Populate Area Select for Admin BBMP Accounts / BBMP Worker Accounts
    function populateBBMPAreaSelect(data) {
        const isAreaAdminMode = document.getElementById('bbmp-area-select').dataset.mode === 'area-admin';
        
        // Determine the data array based on mode
        const dataArray = isAreaAdminMode ? availableAreas : availableWorkers;
        const label = isAreaAdminMode ? '-- Choose an Area --' : '-- Choose a Worker --';
        const idKey = isAreaAdminMode ? 'areaId' : 'workerId';


        bbmpAreaSelect.innerHTML = `<option value="" disabled selected>${label}</option>`;
        // RECTIFICATION START: Use dataArray to populate dropdown for worker accounts as well
        dataArray.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            // Use _id for both Area ID and Worker Document ID
            option.dataset[idKey] = item._id; 
            option.textContent = item.name;
            
            // NEW: Store worker full name if available (used for provisioning)
            if (item.workerUserName) {
                option.dataset.fullName = item.workerUserName;
            }
            
            bbmpAreaSelect.appendChild(option);
        });
        // RECTIFICATION END
    }
    
    // Setup BBMP Account Management (Restored to Area-based logic for Admin, separate Worker logic for BBMP)
    function setupBBMPAccountManagement() {
        const infoDiv = document.getElementById('bbmp-account-info');
        const areaMessage = document.getElementById('bbmp-area-message');
        const usernameDisplay = document.getElementById('bbmp-username-display');
        const passwordDisplay = document.getElementById('bbmp-password-display');
        const areaNameDisplay = document.getElementById('bbmp-area-name-display');
        const createBtn = document.getElementById('create-bbmp-account-btn');
        const resetSection = document.getElementById('bbmp-reset-section');
        const resetMessage = document.getElementById('bbmp-reset-message');
        
        // Clear previous worker/area logic settings
        createBtn.dataset.areaId = ''; 
        createBtn.dataset.workerId = '';
        
        bbmpAreaSelect.onchange = () => {
            const selectedOption = bbmpAreaSelect.options[bbmpAreaSelect.selectedIndex];
            const selectedName = selectedOption.value;
            const isAreaAdminMode = bbmpAreaSelect.dataset.mode === 'area-admin';
            
            // Determine IDs/Keys based on mode
            const idKey = isAreaAdminMode ? 'areaId' : 'workerId';
            const selectedId = selectedOption.dataset[idKey];
            
            if (!selectedName) {
                infoDiv.style.display = 'none';
                areaMessage.style.display = 'block';
                return;
            }
            
            let displayEmail, displayPassword, storageKeyEmail, storageKeyPass, storageKeyProvisioned;
            let finalProvisioningName = selectedName; // Default to worker name from the list
            
            if (isAreaAdminMode) {
                // ** ADMIN MODE: Area-based deterministic credentials **
                const cleanedName = cleanAreaName(selectedName);
                displayEmail = `${cleanedName}@municipalcorporation.in`;
                displayPassword = `${cleanedName}@123`;
                
                storageKeyProvisioned = `BBMP_ACCOUNT_${selectedId}`;
                storageKeyEmail = `BBMP_EMAIL_${selectedId}`;
                
                // Use locally stored email if available (in case it was previously generated/updated)
                const storedEmail = localStorage.getItem(storageKeyEmail);
                if (storedEmail) displayEmail = storedEmail;

            } else {
                // ** BBMP MODE: Worker-Area deterministic credentials **
                
                // Use the workerUserName data-attribute (Full Name of the worker) if present, otherwise fall back to worker document name
                const workerFullName = selectedOption.dataset.fullName || selectedName;
                finalProvisioningName = workerFullName;

                // Get the area name of the logged-in staff
                const staffAreaName = localStorage.getItem(BBMP_AREA_NAME_KEY) || 'bbmp'; // Use BBMP key
                
                const cleanedWorkerName = cleanAreaName(workerFullName); 
                const cleanedStaffAreaName = cleanAreaName(staffAreaName); 
                

                // Email: workername.staffareaname@}@municipalcorporation.in 
                const workerFirstName = cleanedWorkerName.split(/[^a-z0-9]/)[0] || 'worker';
                
                // Deriving the email logic to match the backend controller's creation logic:
                // cleanedWorkerDocName = cleanAreaName(workerDocumentName); // e.g., 'ramu.s'
                // finalEmail = `${workerFirstName}.${cleanedWorkerDocName}@}@municipalcorporation.in`; 
                
                // Frontend Simulation of the derived email:
                displayEmail = `${workerFirstName}.${cleanAreaName(staffAreaName)}@municipalcorporation.in`; 
                
                // Password: workername@123
                displayPassword = `${workerFirstName}@123`;
                
                storageKeyEmail = `WORKER_EMAIL_${selectedId}`;
                storageKeyPass = `WORKER_PASS_${selectedId}`;
                storageKeyProvisioned = storageKeyEmail;

                const storedEmail = localStorage.getItem(storageKeyEmail);
                const storedPass = localStorage.getItem(storageKeyPass);

                if (storedEmail) displayEmail = storedEmail;
                // 🛡️ SECURITY FIX: Do not read password from localStorage, rely only on deterministic generation for display
                // if (storedPass) displayPassword = storedPass;
            }
            
            areaNameDisplay.textContent = selectedName;
            usernameDisplay.textContent = displayEmail;
            passwordDisplay.textContent = displayPassword;
            
            infoDiv.style.display = 'block';
            areaMessage.style.display = 'none';
            createBtn.style.display = 'block';
            resetSection.style.display = 'block';
            resetMessage.style.display = 'none';
            
            const isProvisioned = !!localStorage.getItem(storageKeyProvisioned);

            createBtn.textContent = isProvisioned ? 'Account Exists (Re-Provision)' : (isAreaAdminMode ? 'Create Account' : 'Provision Account');
            createBtn.classList.toggle('btn-primary', !isProvisioned);
            createBtn.classList.toggle('btn-secondary', isProvisioned);
            
            // Set IDs and names for API calls
            if (isAreaAdminMode) {
                createBtn.dataset.areaId = selectedId;
                createBtn.dataset.areaName = selectedName;
                bbmpResetForm.dataset.areaId = selectedId; // Use areaId for reset context
            } else {
                createBtn.dataset.workerId = selectedId;
                createBtn.dataset.workerDocumentName = selectedName; // Worker Document Name
                createBtn.dataset.workerFullName = finalProvisioningName; // Use the Worker's actual full name
                bbmpResetForm.dataset.workerId = selectedId; // Use workerId for reset context
            }

            bbmpResetForm.dataset.email = displayEmail; // Set for reset functionality
        };

        // Password Reset Form Submission (Unified)
        bbmpResetForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = bbmpResetForm.dataset.email;
            const newPassword = document.getElementById('new-bbmp-password').value;
            resetMessage.style.display = 'none';

            if (!email || !newPassword) {
                 resetMessage.textContent = 'Email or new password missing.';
                 resetMessage.style.color = 'var(--danger-color)';
                 resetMessage.style.display = 'block';
                 return;
            }
            
            try {
                const isWorker = bbmpAreaSelect.dataset.mode === 'worker-bbmp';
                const token = isWorker ? localStorage.getItem(BBMP_TOKEN_KEY) : localStorage.getItem(ADMIN_TOKEN_KEY);

                const response = await fetch(`${API_URL}/auth/bbmp-reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                    body: JSON.stringify({ email: email, newPassword: newPassword }),
                });
                
                const data = await response.json();
                if (!response.ok) {
                     throw new Error(data.message || 'Failed to update password.');
                }
                
                resetMessage.textContent = data.message;
                resetMessage.style.color = 'var(--success-color)';
                document.getElementById('new-bbmp-password').value = '';
                
                // If it's a worker, update the locally stored password for deterministic credentials
                // 🛡️ SECURITY FIX: Do not store password
                // if (isWorker) {
                //      const selectedId = bbmpAreaSelect.options[bbmpAreaSelect.selectedIndex].dataset.workerId;
                //      localStorage.setItem(`WORKER_PASS_${selectedId}`, newPassword); 
                //      passwordDisplay.textContent = newPassword; // Update displayed password
                // }
                
            } catch (error) {
                resetMessage.textContent = `Error: ${error.message}`;
                resetMessage.style.color = 'var(--danger-color)';
            } finally {
                resetMessage.style.display = 'block';
            }
        };
    } // End of setupBBMPAccountManagement function


    // --- BBMP WORKER MANAGEMENT LOGIC (REPURPOSED/NEW) ---

    bbmpManageWorkersBtn.addEventListener('click', () => {
         document.getElementById('bbmp-menu-content').style.display = 'none';
         bbmpWorkerManagementModal.classList.add('active'); 
         
         // Setup modal content
         document.querySelector('#bbmp-worker-management-modal h3').textContent = 'Manage Workers';
         document.getElementById('add-worker-form').querySelector('h4').textContent = 'Add New Worker';
         
         // RECTIFICATION: Fetch the worker data
         fetchAreas(true, false); 
    });

    // Close Worker Management Modal
    workerMgmtModalCloseBtn.addEventListener('click', () => {
         bbmpWorkerManagementModal.classList.remove('active');
         newWorkerNameInput.value = ''; // Clear input on close
    });

    // Add Worker Form Submission
    addWorkerForm.addEventListener('submit', async (e) => {
         e.preventDefault();
         const workerName = newWorkerNameInput.value;
         handleWorkerAdd(workerName);
    });

    // BBMP ADD WORKER (Actual API call function)
    async function handleWorkerAdd(workerName) {
        try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);

            // Call the new Worker route
            const response = await fetch(`${API_URL}/workers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ name: workerName }), // Area ID is added by the backend controller
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw new Error(`Failed to add worker. Server returned status ${response.status}.`);
                }
                throw new Error(errorData.message || 'Failed to add worker due to server error.');
            }

            newWorkerNameInput.value = '';
            
            // --- FIX FOR WORKER LIST REFRESH ---
            await fetchAreas(true, false); 
            // --- END FIX ---

            alert('Worker added successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    // BBMP REMOVE WORKER
    async function handleRemoveWorker(e) {
         const workerId = e.currentTarget.dataset.workerId;
         if (!confirm('Are you sure you want to remove this worker? This cannot be undone.')) return;

         try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
            // Call the new Worker route
            const response = await fetch(`${API_URL}/workers/${workerId}`, {
                method: 'DELETE',
                headers: { 'x-access-token': token },
            });
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw new Error(`Failed to remove worker. Server returned status ${response.status}.`);
                }
                throw new Error(errorData.message || 'Failed to remove worker due to server error.');
            }

            fetchAreas(true, false); // Refresh Workers
            alert('Worker removed successfully!');

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    // RENDER BBMP WORKERS
    function renderWorkerList(workers) {
        const workerListEl = document.getElementById('current-workers-list'); 
        workerListEl.innerHTML = '';
        
        if (workers.length === 0) {
            workerListEl.innerHTML = `<p style="color: var(--secondary-color); padding: 10px; text-align: center;">No workers defined yet in your area. Add one above.</p>`;
            return;
        }
        workers.forEach(worker => {
            const item = document.createElement('div');
            item.className = 'worker-list-item';
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid var(--border-color);';
            // worker._id is the Worker Document ID needed for deletion
            item.innerHTML = `
                <span>${worker.name}</span>
                <button data-worker-id="${worker._id}" class="btn btn-sign-out remove-worker-btn" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i> Remove Worker
                </button>
            `;
            workerListEl.appendChild(item);
        });
        document.querySelectorAll('.remove-worker-btn').forEach(button => {
            button.addEventListener('click', handleRemoveWorker);
        });
    }
    
    bbmpManageWorkerAccountsBtn.addEventListener('click', () => {
        document.getElementById('bbmp-menu-content').style.display = 'none';
        bbmpAccountModal.classList.add('active');
        
         // Set Modal to Worker Account Mode
        document.querySelector('#bbmp-account-modal h3').textContent = 'Worker Account Management';
        document.querySelector('label[for="bbmp-area-select"]').textContent = 'Select Worker';
        document.querySelector('#bbmp-area-name-display').textContent = 'Worker';
        document.getElementById('bbmp-area-select').dataset.mode = 'worker-bbmp'; 

         // RECTIFICATION: Fetch the worker data
        fetchAreas(false, false); // Fetch Workers (which populates availableWorkers)
        setupBBMPAccountManagement();
    });


    // --- GENERIC ACCOUNTS LOGIC ---

    bbmpModalCloseBtn.addEventListener('click', () => {
        bbmpAccountModal.classList.remove('active');
         // Clear selection on close
        bbmpAreaSelect.selectedIndex = 0;
        document.getElementById('bbmp-account-info').style.display = 'none';
        document.getElementById('bbmp-area-message').style.display = 'block';
    });
    
    // Autocomplete functionality
    areaInput.addEventListener('input', () => {
        const query = areaInput.value.toLowerCase();
        areaIdInput.value = '';

        if (query.length < 1) {
            areaAutocompleteList.style.display = 'none';
            return;
        }

        // Use availableAreas array (from the actual /api/areas call)
        const filteredAreas = availableAreas.filter(area => 
            area.name.toLowerCase().startsWith(query)
        );

        renderAutocompleteList(filteredAreas);
    });

    function renderAutocompleteList(areas) {
        areaAutocompleteList.innerHTML = '';
        
        if (areas.length === 0) {
            areaAutocompleteList.style.display = 'none';
            return;
        }
        
        areas.forEach(area => {
            const item = document.createElement('div');
            item.className = 'autocomplete-list-item';
            item.textContent = area.name;
            item.dataset.areaId = area._id;
            item.dataset.areaName = area.name;
            
            item.addEventListener('click', (e) => {
                areaInput.value = e.target.dataset.areaName;
                areaIdInput.value = e.target.dataset.areaId;
                areaAutocompleteList.style.display = 'none';
            });
            areaAutocompleteList.appendChild(item);
        });
        areaAutocompleteList.style.display = 'block';
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            areaAutocompleteList.style.display = 'none';
        }
    });
    
    // --- NEW: Assignment Functions ---
    
    // NEW FUNCTION: Fetches the list of workers (User accounts)
    // --- NEW: Assignment Functions ---
    
    // NEW FUNCTION: Fetches the list of workers (User accounts)
    async function fetchWorkersForAssignment(reportId) {
        currentReportIdToAssign = reportId;
        assignWorkerListEl.innerHTML = '<p style="text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Loading workers...</p>';
        assignStatusMessageEl.style.display = 'none';
        
        try {
            // Fetch Workers from the worker endpoint (which now returns workerUserId)
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
            const workersResponse = await fetch(`${API_URL}/workers`, {
                headers: { 'x-access-token': token }
            });
            
            if (!workersResponse.ok) {
                const errorData = await workersResponse.json();
                throw new Error(errorData.message || 'Could not fetch workers.');
            }
            
            const workers = await workersResponse.json(); 
            renderAssignmentList(workers);

         } catch (error) {
            assignWorkerListEl.innerHTML = `<p style="color: var(--danger-color); padding: 10px;">Error: ${error.message}</p>`;
         }
    }
    
    // NEW FUNCTION: Renders the list of workers in the modal
    function renderAssignmentList(workers) {
        assignWorkerListEl.innerHTML = '';
        if (workers.length === 0) {
             assignWorkerListEl.innerHTML = `<p style="color: var(--secondary-color); text-align: center; padding: 10px;">No workers with provisioned accounts found in your area.</p>`;
             return;
         }
        
        workers.forEach(worker => {
            const item = document.createElement('div');
            item.className = 'worker-assignment-item';
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid var(--border-color);';
            item.innerHTML = `
                <span>${worker.workerUserName || worker.name}</span>
                <button data-worker-user-id="${worker.workerUserId}" data-worker-name="${worker.workerUserName || worker.name}" class="btn btn-primary assign-worker-btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                    Assign This Report
                </button>
            `;
            assignWorkerListEl.appendChild(item);
        });
        
        // Add click listeners to the Assign buttons
        document.querySelectorAll('.assign-worker-btn').forEach(button => {
            button.addEventListener('click', handleAssignmentClick);
        });
    }
    
    // NEW FUNCTION: Handles the API call to assign the report
    async function handleAssignmentClick(e) {
        const button = e.currentTarget;
        const workerUserId = button.dataset.workerUserId; // The actual User ID of the worker
        const workerName = button.dataset.workerName;
        
        button.disabled = true;
        button.textContent = 'Assigning...';
        assignStatusMessageEl.style.display = 'none';

        try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
            const response = await fetch(`${API_URL}/reports/assign`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-access-token': token
                },
                body: JSON.stringify({ 
                    reportId: currentReportIdToAssign, 
                    workerUserId: workerUserId // Pass the actual User ID to the backend
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to assign report.');
            }
            
            assignStatusMessageEl.textContent = `Report successfully assigned to ${workerName}! Status updated to In Progress.`;
            assignStatusMessageEl.style.color = 'var(--success-color)';
            assignStatusMessageEl.style.display = 'block';
            
            // Close modal and refresh BBMP reports after successful assignment
            setTimeout(() => {
                assignWorkerModal.classList.remove('active');
                applyFilters('bbmp'); // Refresh the BBMP report list
            }, 1500);

        } catch (error) {
            assignStatusMessageEl.textContent = `Error: ${error.message}`;
            assignStatusMessageEl.style.color = 'var(--danger-color)';
            assignStatusMessageEl.style.display = 'block';
            button.disabled = false;
            button.textContent = 'Assign This Report';
        }
    }
    // --- END NEW ASSIGNMENT FUNCTIONS ---
    
    // **********************************************
    // ********** START NEW LEAVE LOGIC *************
    // **********************************************

    // NEW FUNCTION: Populate the Worker Select for Leave Application
    function populateWorkerLeaveSelect() {
        leaveWorkerSelect.innerHTML = '<option value="" disabled selected>-- Select a Worker --</option>';
        
        // availableWorkers is populated by fetchAreas(false, false) which is called in worker management
        if (availableWorkers && availableWorkers.length > 0) {
            availableWorkers.forEach(worker => {
                // Only list workers who have a provisioned account (workerUserId is present)
                if (worker.workerUserId) {
                     const option = document.createElement('option');
                     option.value = worker.workerUserId; // The ID we need for the WorkerLeave model
                     option.textContent = worker.workerUserName || worker.name;
                     // Get the Area ID from the worker data (worker.area is the Area ID from the Worker Document)
                     option.dataset.areaId = worker.area; 
                     leaveWorkerSelect.appendChild(option);
                }
            });
        } else {
            leaveWorkerSelect.innerHTML += '<option disabled>No provisioned workers found in your area.</option>';
        }
    }
    
    // NEW EVENT LISTENER: Leave Submission (Feature B)
    applyLeaveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageEl = document.getElementById('leave-status-message');
        messageEl.style.display = 'none';

        const workerUserId = leaveWorkerSelect.value;
        const startDate = document.getElementById('leave-start-date').value;
        const endDate = document.getElementById('leave-end-date').value || startDate; // Single day leave if end date is missing
        
        // Get the Area ID from the currently selected worker's option
        const selectedOption = leaveWorkerSelect.options[leaveWorkerSelect.selectedIndex];
        // Ensure worker is selected
        if (!selectedOption || selectedOption.disabled) {
            messageEl.textContent = 'Please select a worker.';
            messageEl.style.color = 'var(--danger-color)';
            messageEl.style.display = 'block';
            return;
        }
        const areaId = selectedOption.dataset.areaId; 

        if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
             messageEl.textContent = 'End date cannot be before start date.';
             messageEl.style.color = 'var(--danger-color)';
             messageEl.style.display = 'block';
             return;
        }
        
        try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
            // NEW API ENDPOINT
            const response = await fetch(`${API_URL}/worker-leaves`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ 
                    workerUserId, 
                    startDate, 
                    endDate, 
                    areaId 
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to apply leave.');
            }

            messageEl.textContent = `Leave applied successfully for ${selectedOption.textContent} from ${startDate} to ${endDate}.`;
            messageEl.style.color = 'var(--success-color)';
            messageEl.style.display = 'block';
            
            // Refresh BBMP data after submission (optional, but ensures worker data is up-to-date)
            await fetchAreas(false, false); 
            
            // Clear the form and hide modal after a short delay
            setTimeout(() => {
                applyLeaveForm.reset(); 
                workerLeaveModal.classList.remove('active');
            }, 1500);


        } catch (error) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.style.color = 'var(--danger-color)';
            messageEl.style.display = 'block';
        }
    });
    
    // NEW FUNCTION: Fetch and Render Applied Leaves (Feature C)
    async function fetchAndRenderWorkerLeaves() {
        const tbody = document.getElementById('leaves-list-tbody');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading leaves...</td></tr>';
        
        // Create a quick lookup map of workerUserId to Worker Name
        const workerMap = {};
        availableWorkers.forEach(w => {
            if (w.workerUserId) {
                workerMap[w.workerUserId] = w.workerUserName || w.name;
            }
        });

        try {
            const token = localStorage.getItem(BBMP_TOKEN_KEY);
            
            // CRITICAL FIX: Live API call to the newly implemented backend endpoint.
            const response = await fetch(`${API_URL}/worker-leaves/my-area`, { 
                headers: { 'x-access-token': token } 
            });
            
            if (!response.ok) {
                 // Attempt to read the full error message from the body
                const errorText = await response.text();
                let errorMessage = `Failed to fetch leaves. Status: ${response.status}`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Use generic status message if body is not JSON
                }

                // Handle specific authorization/not found cases
                if (response.status === 403) {
                    errorMessage = "Access Denied: You must be a BBMP staff member assigned to an area.";
                }
                
                // If no leaves are found and the API returns a generic empty/not found message,
                // we show the friendly message (this prevents showing a big red error for an empty list)
                if (response.status === 200 || response.status === 204 || errorMessage.toLowerCase().includes('not found')) {
                     tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No upcoming or active leaves recorded.</td></tr>';
                     return;
                }
                
                throw new Error(errorMessage);
            }
            
            const leaves = await response.json();
            
            tbody.innerHTML = '';

            if (leaves.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No upcoming or active leaves recorded.</td></tr>';
                return;
            }
            
            leaves.forEach(leave => {
                 // Use the workerMap to display the worker's name
                 const workerName = workerMap[leave.workerUser] || 'Worker (ID: ' + leave.workerUser.slice(-6) + ')';
                 const startDate = new Date(leave.startDate).toLocaleDateString();
                 const endDate = new Date(leave.endDate).toLocaleDateString();
                 
                 const row = `
                    <tr>
                        <td><strong>${workerName}</strong></td>
                        <td>${startDate}</td>
                        <td>${endDate}</td>
                        </tr>
                 `;
                 tbody.innerHTML += row;
            });

        } catch (error) {
            console.error("Error fetching worker leaves:", error);
            tbody.innerHTML = `<tr><td colspan="3" style="color: var(--danger-color); text-align:center;">Failed to load leaves: ${error.message}</td></tr>`;
        }
    }
    // --- END NEW LEAVE SUBMISSION LOGIC ---
    
    // **********************************************
    // ********** START LANDING PAGE FIXES **********
    // **********************************************

    if (document.querySelector('.bbmp-report-card-list')) {
        document.querySelector('.bbmp-report-card-list').addEventListener('click', (e) => {
            if (e.target.closest('.supervisor-review-btn')) {
                const button = e.target.closest('.supervisor-review-btn');
                const reportId = button.dataset.reportId;
                const reason = button.dataset.reason;

                document.getElementById('supervisor-rejection-modal-report-id').textContent = `#${reportId.slice(-6)}`;
                document.getElementById('supervisor-report-id-input').value = reportId;
                
                // Set the reason in the editable textarea
                document.getElementById('supervisor-rejection-reason').value = reason; 
                
                // Store the report ID on the form element itself for submission handlers
                document.getElementById('supervisor-rejection-form').dataset.reportId = reportId; 

                document.getElementById('supervisor-status-message').style.display = 'none';
                supervisorRejectionModal.classList.add('active');
            }
        });
    }
    showPage('landing-page');
    
    // MODIFIED FUNCTION: Updates the three landing page stats (now uses reports length for Total Reports)
    function updateLandingPageStatsFromReports(reports) {
        
        // 1. Issues Resolved
        const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
        document.getElementById('stat-issues-resolved').textContent = resolvedCount.toLocaleString();
        
        // 2. Total Reports (NEW REQUIREMENT: Use length of all fetched reports)
        const totalReportsCount = reports.length;
        document.getElementById('stat-avg-response').textContent = totalReportsCount.toLocaleString(); 
    }

    // NEW FUNCTION: Dedicated function to fetch the total number of citizen accounts
    async function fetchCitizenCount() {
        const FAKE_ADMIN_TOKEN = 'FAKE_ADMIN_TOKEN_12345';
        
        try {
             // Call the new backend endpoint for the raw count
            const response = await fetch(`${API_URL}/auth/citizen-count`, {
                headers: { 'x-access-token': FAKE_ADMIN_TOKEN }
            });
            
            if (!response.ok) {
                console.error('API Error: Could not fetch citizen account count. Status:', response.status);
                throw new Error('API Error'); 
            }
            
            const data = await response.json();
            const totalCitizens = data.count || 0;
            
            document.getElementById('stat-active-citizens').textContent = totalCitizens.toLocaleString();

        } catch (error) {
            // Set to 'N/A' only on fetch failure, leaving other stats alone
            document.getElementById('stat-active-citizens').textContent = 'N/A'; 
        }
    }

    // MODIFIED FUNCTION: Fetch Admin data to populate landing page statistics immediately on load
    async function updateLandingPageStats() {
        // Set initial loading state for all stats
        document.getElementById('stat-issues-resolved').innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
        document.getElementById('stat-avg-response').innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
        document.getElementById('stat-active-citizens').innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
        
        // Execute the dedicated Citizen Count function immediately (fire and forget)
        fetchCitizenCount();
        
        try {
            // Fetch ALL reports (Admin endpoint) for Resolved Count and Total Reports
            const FAKE_ADMIN_TOKEN = 'FAKE_ADMIN_TOKEN_12345';
            const response = await fetch(`${API_URL}/reports/all`, {
                headers: { 'x-access-token': FAKE_ADMIN_TOKEN }
            });
            
            if (!response.ok) {
                const error = new Error(`Could not fetch global report data. Status: ${response.status}`);
                console.error("API Error during landing page stat fetch:", error);
                throw error;
            }
            
            const reports = await response.json();
            
            // Call the helper to calculate and update Resolved Count and Total Reports
            updateLandingPageStatsFromReports(reports);

        } catch (error) {
            console.error("Failed to load landing page report stats:", error);
            // CRITICAL FIX: Ensure spin icons are replaced with N/A
            document.getElementById('stat-issues-resolved').textContent = 'N/A';
            document.getElementById('stat-avg-response').textContent = 'N/A';
        }
    }
    // **********************************************
    // ********** END LANDING PAGE FIXES ************
    // **********************************************

    // ----------------------------------------------------
    // --- NEW FORGOT PASSWORD LOGIC (CITIZEN ONLY) ---
    // ----------------------------------------------------

    forgotPasswordModalCloseBtn.addEventListener('click', () => forgotPasswordModal.classList.remove('active'));

    // Function to open the modal
    function openForgotPasswordModal(prefilledEmail = '') {
        forgotPasswordModal.classList.add('active');
        forgotPasswordForm.reset();
        resetEmailInput.value = prefilledEmail;
        resetStatusMessage.style.display = 'none';
        sendResetEmailBtn.disabled = false;
        sendResetEmailBtn.textContent = 'Send Reset Link';
    }

    if (resolutionUploadForm) {
        resolutionUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reportId = document.getElementById('resolution-report-id-input').value;
            const mediaFile = document.getElementById('resolution-media-file').files[0];
            const messageEl = document.getElementById('resolution-upload-message');
    
            messageEl.style.display = 'none';

            if (!mediaFile) {
                messageEl.textContent = 'Please select a photo or video proof.';
                messageEl.style.color = 'var(--danger-color)';
                messageEl.style.display = 'block';
                return;
            }

            // 1. Prepare FormData for file upload
            const formData = new FormData();
            // The endpoint expects the file to be named 'issuePhoto' (as defined in report.routes.js)
            formData.append('issuePhoto', mediaFile); 
            // We set the status explicitly to 'Resolved' for the backend controller
            formData.append('status', 'Resolved'); 
    
            submitResolutionProofBtn.disabled = true;
            submitResolutionProofBtn.textContent = 'Uploading & Resolving...';

            try {
                const token = localStorage.getItem(WORKER_TOKEN_KEY);
                // 2. CRITICAL: Use the file-upload endpoint: /reports/:id/status (PUT)
                const url = `${API_URL}/reports/${reportId}/status`; 

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: { 
                        // IMPORTANT: Do NOT set 'Content-Type': 'application/json'. 
                        // The browser sets it automatically to 'multipart/form-data' with the correct boundary when using FormData.
                        'x-access-token': token 
                    },
                    body: formData,
                });

        const data = await response.json();

        if (!response.ok) {
            // If the response is not OK, revert the file selection to keep the UI consistent 
            // and allow the user to resubmit/fix the issue.
            document.getElementById('resolution-media-file').value = '';
            document.getElementById('resolution-file-preview-container').innerHTML = '';
            submitResolutionProofBtn.disabled = true;

            throw new Error(data.message || 'Failed to update report status.');
        }

        // Success handling
        messageEl.textContent = data.message;
        messageEl.style.color = 'var(--success-color)';
        messageEl.style.display = 'block';

        // Close modal and refresh dashboard after a short delay
        setTimeout(() => {
            workerResolutionModal.classList.remove('active');
            resolutionUploadForm.reset();
            // CRITICAL: Refresh worker assignments to see the change
            initializeWorkerDashboard(); 
        }, 1500);


    } catch (error) {
        messageEl.textContent = `Error resolving report: ${error.message}`;
        messageEl.style.color = 'var(--danger-color)';
        messageEl.style.display = 'block';
        submitResolutionProofBtn.disabled = false;
        submitResolutionProofBtn.textContent = 'Submit Proof & Resolve';

    }
});
}

    // Link Listener (Citizen Login Page)
    if (citizenForgotPasswordLink) {
        citizenForgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Pre-fill email from login form if available
            const email = document.getElementById('username').value;
            openForgotPasswordModal(email);
        });
    }

    // FORGOT PASSWORD SUBMISSION LOGIC
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resetEmailInput.value;
        
        sendResetEmailBtn.disabled = true;
        sendResetEmailBtn.textContent = 'Sending...';
        resetStatusMessage.style.display = 'none';

        try {
            // Use Firebase Client SDK to send reset link
            await firebaseAuth.sendPasswordResetEmail(email);
            
            // Security-friendly message
            resetStatusMessage.textContent = 'A reset link has been sent if an account with this email exists.';
            resetStatusMessage.style.color = 'var(--success-color)';
            
            resetStatusMessage.style.display = 'block';
            
            // Close modal after successful submission
            setTimeout(() => {
                forgotPasswordModal.classList.remove('active');
                forgotPasswordForm.reset();
            }, 4000);

        } catch (error) {
            // For Firebase reset, we use a consistent success message for security, regardless of success/failure
            resetStatusMessage.textContent = 'A reset link has been sent if an account with this email exists.';
            resetStatusMessage.style.color = 'var(--success-color)';
            
            // Close modal even on soft failure (security practice)
            setTimeout(() => {
                forgotPasswordModal.classList.remove('active');
                forgotPasswordForm.reset();
            }, 4000);
            
            resetStatusMessage.style.display = 'block';
        }
    });
    
    // ----------------------------------------------------
    // --- END FORGOT PASSWORD LOGIC ---
    // ----------------------------------------------------


    // Initialize the app on load
    showPage('landing-page');
    setupPasswordToggles();
    // Fetch initial workers on load to populate state, ensuring it's available for Apply/View Leave
    fetchAreas(false, false); // Fetch workers (isAreaList = false)
    fetchAreas(); // Fetch initial areas for the Report Issue autocomplete
    
    // CRITICAL CALL: Fetch data for the landing page statistics on page load
    updateLandingPageStats();
});