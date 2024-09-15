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

let containerSize = 100; // Percentage
const sizeStep = 10; // Percentage

let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

/**
 * Initializes the app by setting up event listeners and starting the video stream.
 */
async function init() {
    try {
        console.log('Initializing app...');
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        capturedPhotos = [];

        if (!('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
            throw new Error("Your browser does not support camera access.");
        }

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

        initSizeControls();
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
        const constraints = {
            video: {
                facingMode: currentCameraFacing,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        track = stream.getVideoTracks()[0];

        console.log('Video stream started successfully');
    } catch (err) {
        console.error('Error accessing the camera:', err);
        let errorMessage = "An unexpected error occurred while accessing the camera.";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = "Camera access was denied. Please allow camera permissions in your browser settings and reload the page.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = "No camera devices found. Please connect a camera to your device and try again.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = "Unable to access the camera. It may be already in use by another application.";
        }
        showModal(errorMessage);
        throw err;
    }
}

/**
 * Handles orientation change events.
 */
function handleOrientationChange() {
    console.log('Handling orientation change...');
    const app = document.getElementById('app');
    const videoContainer = document.getElementById('videoContainer');
    const controlsSettingsContainer = document.querySelector('.controls-settings-container');

    if (window.innerHeight > window.innerWidth) {
        // Portrait mode
        app.style.flexDirection = 'column';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '50vh';
        controlsSettingsContainer.style.width = '100%';
        console.log('Switched to portrait mode');
    } else {
        // Landscape mode
        app.style.flexDirection = 'row';
        videoContainer.style.width = '60%';
        videoContainer.style.height = 'calc(100vh - 50px)';
        controlsSettingsContainer.style.width = '40%';
        console.log('Switched to landscape mode');
    }

    adjustLayout();
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

        const videoContainer = document.getElementById('videoContainer');
        const aspectRatio = video.videoWidth / video.videoHeight;
        
        if (window.innerHeight > window.innerWidth) {
            // Portrait mode
            videoContainer.style.height = `${videoContainer.offsetWidth / aspectRatio}px`;
        } else {
            // Landscape mode
            videoContainer.style.width = `${videoContainer.offsetHeight * aspectRatio}px`;
        }
    } else {
        console.log('Video dimensions not available, retrying in 500ms');
        setTimeout(adjustLayout, 500);
    }
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
    await downloadPhotos();
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

    if (track && track.getCapabilities().zoom) {
        try {
            await track.applyConstraints({ advanced: [{ zoom: zoom }] });
        } catch (error) {
            console.warn(`Failed to set zoom level ${zoom}: ${error}`);
        }
    }

    // Give time for zoom to adjust
    await new Promise(resolve => setTimeout(resolve, 500));

    let photoData;
    if ('ImageCapture' in window) {
        const imageCapture = new ImageCapture(track);
        const blob = await imageCapture.takePhoto();
        photoData = URL.createObjectURL(blob);
    } else {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL('image/jpeg', 0.95);
    }

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
        link.download = `${exportFileNamePrefix}_${i + 1}.jpg`;

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
 * Initializes the size controls.
 */
function initSizeControls() {
    console.log('Initializing size controls...');
    document.getElementById('sizeIncrease').addEventListener('click', increaseSize);
    document.getElementById('sizeDecrease').addEventListener('click', decreaseSize);
}

/**
 * Updates the size of the video container.
 */
function updateContainerSize() {
    console.log(`Updating container size to ${containerSize}%`);
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.style.width = `${containerSize}%`;
    videoContainer.style.height = `${containerSize}%`;
    document.getElementById('sizeLevel').textContent = `${containerSize}%`;
    adjustLayout();
}

function increaseSize() {
    if (containerSize < 200) {
        containerSize += sizeStep;
        updateContainerSize();
    }
}

function decreaseSize() {
    if (containerSize > 50) {
        containerSize -= sizeStep;
        updateContainerSize();
    }
}

/**
 * Initializes the draggable functionality for the video container.
 */
function initDraggable() {
    console.log('Initializing draggable functionality...');
    const videoContainer = document.getElementById('videoContainer');
    
    videoContainer.addEventListener('mousedown', startDragging);
    videoContainer.addEventListener('touchstart', startDragging, { passive: false });
    
    videoContainer.addEventListener('mousemove', drag);
    videoContainer.addEventListener('touchmove', drag, { passive: false });
    
    videoContainer.addEventListener('mouseup', stopDragging);
    videoContainer.addEventListener('mouseleave', stopDragging);
    videoContainer.addEventListener('touchend', stopDragging);
}

function startDragging(e) {
    isDragging = true;
    const videoContainer = document.getElementById('videoContainer');
    if (e.type === 'touchstart') {
        startX = e.touches[0].pageX - videoContainer.offsetLeft;
        startY = e.touches[0].pageY - videoContainer.offsetTop;
    } else {
        startX = e.pageX - videoContainer.offsetLeft;
        startY = e.pageY - videoContainer.offsetTop;
    }
    scrollLeft = videoContainer.scrollLeft;
    scrollTop = videoContainer.scrollTop;
    e.preventDefault();
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const videoContainer = document.getElementById('videoContainer');
    let x, y;
    if (e.type === 'touchmove') {
        x = e.touches[0].pageX - videoContainer.offsetLeft;
        y = e.touches[0].pageY - videoContainer.offsetTop;
    } else {
        x = e.pageX - videoContainer.offsetLeft;
        y = e.pageY - videoContainer.offsetTop;
    }
    const walkX = x - startX;
    const walkY = y - startY;
    videoContainer.scrollLeft = scrollLeft - walkX;
    videoContainer.scrollTop = scrollTop - walkY;
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
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    modalContent.textContent = message;
    modal.style.display = 'flex';
    
    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

/**
 * Optimizes video rendering using requestAnimationFrame
 */
function updateVideoFrame() {
    // Any video processing logic can go here
    requestAnimationFrame(updateVideoFrame);
}

// Initialize the app when the window loads
window.onload = () => {
    init();
    requestAnimationFrame(updateVideoFrame);
};
