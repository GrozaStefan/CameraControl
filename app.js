// Define variables
let video, canvas, capturedPhotos, stream;
let zoomLevels = [1, 1.5, 2, 2.5];
let currentZoomIndex = 0;
let delayBetweenPhotos = [2, 2, 2, 5];
let numPhotos = 4;
let captureAudio;
let currentCameraFacing = 'environment';
let track = null;
let fileNameOption = 'auto';

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

let isDragging = false;
let startX, startY, initialX, initialY;

/**
 * Initializes the app by setting up event listeners and starting the video stream.
 */
async function init() {
    try {
        console.log('Initializing app...');
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        capturedPhotos = [];

        document.getElementById('switchCamera').addEventListener('click', switchCamera);
        document.getElementById('startCapture').addEventListener('click', startCapture);
        document.getElementById('applySettings').addEventListener('click', applySettings);
        document.getElementById('fileNameOption').addEventListener('change', changeFileNameOption);

        await startVideoStream();

        // Load capture sound
        captureAudio = new Audio('https://www.soundjay.com/camera/sounds/camera-shutter-click-03.mp3');

        // Adjust layout when video metadata is loaded
        video.addEventListener('loadedmetadata', adjustLayout);
        // Adjust layout on orientation change
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        initZoomControls();
        initDraggable();
        handleOrientationChange();
        console.log('App initialized successfully');
    } catch (err) {
        console.error('Error during app initialization:', err);
        showModal(`Error initializing app: ${err.message}`);
    }
}

/**
 * Starts the video stream with the current camera facing mode.
 */
async function startVideoStream() {
    try {
        console.log('Starting video stream...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser does not support camera access.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCameraFacing }
        });
        video.srcObject = stream;
        await video.play();
        track = stream.getVideoTracks()[0];

        console.log('Video stream started successfully');
    } catch (err) {
        console.error('Error accessing the camera:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showModal("Camera access was denied. Please allow camera permissions in your browser settings and reload the page.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showModal("No camera devices found. Please connect a camera to your device and try again.");
        } else {
            showModal(`An unexpected error occurred: ${err.message}`);
        }
        throw err; // Re-throw the error to be caught in the init function
    }
}

/**
 * Adjusts the layout and canvas size to match the video size.
 */
function adjustLayout() {
    console.log('Adjusting layout...');
    if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`Canvas size adjusted to ${canvas.width}x${canvas.height}`);
    } else {
        console.log('Video dimensions not available, retrying in 500ms');
        setTimeout(adjustLayout, 500);
    }
}

/**
 * Handles orientation change events.
 */
function handleOrientationChange() {
    console.log('Handling orientation change...');
    const app = document.getElementById('app');
    if (window.innerHeight > window.innerWidth) {
        app.style.flexDirection = 'column';
        console.log('Switched to portrait mode');
    } else {
        app.style.flexDirection = 'row';
        console.log('Switched to landscape mode');
    }
    adjustLayout();
}

/**
 * Applies user-defined settings for the capture sequence.
 */
function applySettings() {
    console.log('Applying settings...');
    const numPhotosInput = parseInt(document.getElementById('numPhotos').value);
    if (isNaN(numPhotosInput) || numPhotosInput <= 0) {
        showModal("Please enter a valid number of photos (positive integer).");
        return;
    }
    numPhotos = numPhotosInput;

    zoomLevels = document.getElementById('zoomLevels').value.split(',').map(s => parseFloat(s.trim()));
    if (zoomLevels.some(isNaN) || zoomLevels.length < numPhotos) {
        showModal("Please enter valid zoom levels (numbers) and ensure there are enough for each photo.");
        return;
    }

    delayBetweenPhotos = document.getElementById('delayBetweenPhotos').value.split(',').map(s => parseInt(s.trim()));
    if (delayBetweenPhotos.some(isNaN) || delayBetweenPhotos.length < numPhotos) {
        showModal("Please enter valid delay times (numbers in seconds) and ensure there are enough for each photo.");
        return;
    }

    // Ensure zoomLevels and delayBetweenPhotos have sufficient elements
    if (zoomLevels.length < numPhotos) {
        const lastZoomLevel = zoomLevels[zoomLevels.length - 1];
        while (zoomLevels.length < numPhotos) {
            zoomLevels.push(lastZoomLevel);
        }
    }

    if (delayBetweenPhotos.length < numPhotos) {
        const lastDelay = delayBetweenPhotos[delayBetweenPhotos.length - 1];
        while (delayBetweenPhotos.length < numPhotos) {
            delayBetweenPhotos.push(lastDelay);
        }
    }

    currentZoomIndex = 0;
    console.log('Settings applied successfully');
}

/**
 * Changes the file naming option based on user selection.
 */
function changeFileNameOption() {
    fileNameOption = document.getElementById('fileNameOption').value;
    console.log('File naming option changed to:', fileNameOption);
}

/**
 * Starts the capture sequence.
 */
async function startCapture() {
    console.log('Starting capture sequence...');
    capturedPhotos = [];
    document.getElementById('capturedPhotos').innerHTML = '';
    currentZoomIndex = 0;
    document.getElementById('startCapture').disabled = true;
    document.getElementById('switchCamera').disabled = true;
    await captureSequence();
}

/**
 * Captures a sequence of photos based on user settings.
 */
async function captureSequence() {
    for (currentZoomIndex = 0; currentZoomIndex < numPhotos; currentZoomIndex++) {
        if (currentZoomIndex > 0) {
            await countdown(delayBetweenPhotos[currentZoomIndex]);
        }
        await capturePhoto();
    }
    document.getElementById('startCapture').disabled = false;
    document.getElementById('switchCamera').disabled = false;
    await downloadPhotos(); // Automatically start the download
    console.log('Capture sequence completed');
}

/**
 * Displays a countdown before capturing the next photo.
 * @param {number} seconds - Number of seconds for the countdown.
 */
async function countdown(seconds) {
    console.log(`Starting countdown: ${seconds} seconds`);
    let countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        document.body.removeChild(countdownElement);
    }
    countdownElement = document.createElement('div');
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.fontSize = '48px';
    countdownElement.style.color = 'white';
    countdownElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    countdownElement.style.padding = '50px';
    countdownElement.style.borderRadius = '10px';
    countdownElement.id = 'countdown';
    document.body.appendChild(countdownElement);

    for (let i = seconds; i > 0; i--) {
        countdownElement.textContent = `${i}`;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    document.body.removeChild(countdownElement);
    console.log('Countdown finished');
}

/**
 * Captures a photo with the current zoom level.
 */
async function capturePhoto() {
    console.log('Capturing photo...');
    const zoom = zoomLevels[currentZoomIndex];

    // Show loading spinner
    document.body.classList.add('loading');

    if (track && 'zoom' in track.getCapabilities()) {
        const capabilities = track.getCapabilities();
        if (capabilities.zoom && zoom >= capabilities.zoom.min && zoom <= capabilities.zoom.max) {
            const constraints = {
                advanced: [{ zoom: zoom }]
            };
            await track.applyConstraints(constraints);
        } else {
            console.warn(`Zoom level ${zoom} is out of range. Supported range: ${capabilities.zoom.min} - ${capabilities.zoom.max}`);
            showModal(`Zoom level ${zoom} is not supported by your camera. Supported range: ${capabilities.zoom.min} - ${capabilities.zoom.max}`);
        }
    }

    // Give time for zoom to adjust
    await new Promise(resolve => setTimeout(resolve, 500));

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoData = canvas.toDataURL('image/png');
    capturedPhotos.push(photoData);

    const img = document.createElement('img');
    img.src = photoData;
    img.className = 'capturedPhoto';
    img.width = 160;
    img.height = 120;
    document.getElementById('capturedPhotos').appendChild(img);

    if (captureAudio) {
        captureAudio.play();
    }

    // Hide loading spinner
    document.body.classList.remove('loading');
    console.log('Photo captured successfully');
}

/**
 * Switches between front and back cameras.
 */
async function switchCamera() {
    console.log('Switching camera...');
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    track = null;
    currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';

    try {
        await startVideoStream();
        console.log('Camera switched successfully');
    } catch (err) {
        console.error('Error switching camera:', err);
        showModal("Error switching camera. Please try again.");
    }
}

/**
 * Downloads the captured photos separately.
 */
async function downloadPhotos() {
    console.log('Downloading photos...');
    let exportFileNamePrefix;
    if (fileNameOption === 'manual') {
        exportFileNamePrefix = prompt("Enter a prefix for the exported photos:");
        if (!exportFileNamePrefix) {
            exportFileNamePrefix = 'captured_photo';
        }
    } else {
        exportFileNamePrefix = `captured_photo_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    }

    for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        const link = document.createElement('a');
        link.href = photo;
        link.download = `${exportFileNamePrefix}_${i + 1}.png`;

        // For mobile devices, simulate a click event
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Give time between downloads to ensure they start properly
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('Photos downloaded successfully');
}

/**
 * Initializes the zoom controls.
 */
function initZoomControls() {
    console.log('Initializing zoom controls...');
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
}

/**
 * Updates the zoom level of the video feed.
 */
function updateZoom() {
    console.log(`Updating zoom to ${currentZoom}`);
    const video = document.getElementById('video');
    video.style.transform = `scale(${currentZoom})`;
    video.style.transformOrigin = 'center center';
    document.getElementById('zoomLevel').textContent = `${Math.round(currentZoom * 100)}%`;
}

function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        updateZoom();
    }
}

function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        updateZoom();
    }
}

/**
 * Initializes the draggable functionality for the video container.
 */
function initDraggable() {
    console.log('Initializing draggable functionality...');
    const draggableContainer = document.getElementById('draggableContainer');
    
    draggableContainer.addEventListener('mousedown', startDragging);
    draggableContainer.addEventListener('touchstart', startDragging);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
}

function startDragging(e) {
    isDragging = true;
    if (e.type === 'touchstart') {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else {
        startX = e.clientX;
        startY = e.clientY;
    }
    initialX = draggableContainer.offsetLeft;
    initialY = draggableContainer.offsetTop;
    e.preventDefault();
}

function drag(e) {
    if (!isDragging) return;
    
    let currentX, currentY;
    if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else {
        currentX = e.clientX;
        currentY = e.clientY;
    }
    
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    draggableContainer.style.left = `${initialX + deltaX}px`;
    draggableContainer.style.top = `${initialY + deltaY}px`;
}

function stopDragging() {
    isDragging = false;
}

/**
 * Displays a modal with a message.
 * @param {string} message - The message to display in the modal.
 */
function showModal(message) {
    console.log('Showing modal:', message);
    alert(message); // Using alert for simplicity, replace with a proper modal implementation
}

// Initialize the app when the window loads
window.onload = init;
