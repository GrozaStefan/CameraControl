// app.js

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

/**
 * Initializes the app by setting up event listeners and starting the video stream.
 */
async function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    capturedPhotos = [];

    document.getElementById('switchCamera').addEventListener('click', switchCamera);
    document.getElementById('startCapture').addEventListener('click', startCapture);
    document.getElementById('applySettings').addEventListener('click', applySettings);
    document.getElementById('fileNameOption').addEventListener('change', changeFileNameOption);

    try {
        await startVideoStream();
    } catch (err) {
        showModal("Error accessing the camera. Please allow camera permissions and refresh the page.");
        console.error("Error accessing the camera", err);
    }

    // Load capture sound
    captureAudio = new Audio('https://www.soundjay.com/camera/sounds/camera-shutter-click-03.mp3');

    // Adjust canvas size when orientation changes
    window.addEventListener('resize', adjustLayout);
    window.addEventListener('orientationchange', adjustLayout);
}

/**
 * Starts the video stream with the current camera facing mode.
 */
async function startVideoStream() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showModal("Your browser does not support camera access. Please use a compatible browser.");
            return;
        }

        console.log("Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCameraFacing, zoom: true }
        });
        video.srcObject = stream;
        await video.play();
        track = stream.getVideoTracks()[0];
        // Set canvas dimensions to match video dimensions
        adjustLayout();
        console.log("Camera stream started successfully.");
    } catch (err) {
        console.error("Error accessing the camera: ", err);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showModal("Camera access was denied. Please allow camera permissions in your browser settings and reload the page.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showModal("No camera devices found. Please connect a camera to your device and try again.");
        } else {
            showModal(`An unexpected error occurred: ${err.message}`);
        }
    }
}

/**
 * Adjusts the layout and canvas size to match the video size.
 */
function adjustLayout() {
    // Adjust video container size
    const videoContainer = document.getElementById('videoContainer');
    const aspectRatio = video.videoWidth / video.videoHeight;

    if (aspectRatio) {
        if (window.innerWidth > window.innerHeight) {
            // Landscape
            video.style.width = 'auto';
            video.style.height = '100%';
        } else {
            // Portrait
            video.style.width = '100%';
            video.style.height = 'auto';
        }
    } else {
        // Retry after video metadata is loaded
        video.addEventListener('loadedmetadata', adjustLayout);
    }

    // Adjust canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

/**
 * Applies user-defined settings for the capture sequence.
 */
function applySettings() {
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
}

/**
 * Changes the file naming option based on user selection.
 */
function changeFileNameOption() {
    fileNameOption = document.getElementById('fileNameOption').value;
}

/**
 * Starts the capture sequence.
 */
async function startCapture() {
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
}

/**
 * Displays a countdown before capturing the next photo.
 * @param {number} seconds - Number of seconds for the countdown.
 */
async function countdown(seconds) {
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
}

/**
 * Captures a photo with the current zoom level.
 */
async function capturePhoto() {
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

    captureAudio.play();

    // Keep the delay if necessary
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Hide loading spinner
    document.body.classList.remove('loading');
}

/**
 * Switches between front and back cameras.
 */
async function switchCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    track = null;
    currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';

    try {
        await startVideoStream();
    } catch (err) {
        showModal("Error switching camera. Please try again.");
        console.error("Error switching camera", err);
    }
}

/**
 * Downloads the captured photos separately.
 */
async function downloadPhotos() {
    let exportFileNamePrefix;
    if (fileNameOption === 'manual') {
        exportFileNamePrefix = prompt("Enter a prefix for the exported photos:");
        if (!exportFileNamePrefix) {
            exportFileNamePrefix = `captured_photo`;
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
}

/**
 * Displays a modal with a message.
 * @param {string} message - The message to display in the modal.
 */
function showModal(message) {
    const modal = document.getElementById('modal');
    document.getElementById('modalMessage').textContent = message;
    modal.style.display = 'block';
}

/**
 * Closes the modal.
 */
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

window.onload = init;
