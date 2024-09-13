let video, canvas, capturedPhotos, stream;
let zoomLevels = [1, 1.5, 2, 2.5];
let currentZoomIndex = 0;
let delayBetweenPhotos = [2, 2, 2, 5];
let numPhotos = 4;
let captureAudio;
let currentCameraFacing = 'environment';
let track = null;
let fileNameOption = 'auto';

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

    captureAudio = new Audio('https://www.soundjay.com/camera/camera-shutter-sound-effect-6.wav');
}

async function startVideoStream() {
    try {
        console.log("Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCameraFacing, zoom: true } // Use 'environment' or 'user'
        });
        video.srcObject = stream;
        await video.play();
        console.log("Camera stream started successfully.");
    } catch (err) {
        console.error("Error accessing the camera: ", err);

        // Handle different error types
        if (err.name === 'NotAllowedError') {
            showModal("Camera access was denied. Please allow camera permissions and reload the page.");
        } else if (err.name === 'NotFoundError') {
            showModal("No camera devices found. Please connect a camera and try again.");
        } else {
            showModal("An error occurred while trying to access the camera. Please check your camera settings.");
        }
    }
}

async function applySettings() {
    numPhotos = parseInt(document.getElementById('numPhotos').value);
    zoomLevels = document.getElementById('zoomLevels').value.split(',').map(parseFloat);
    delayBetweenPhotos = document.getElementById('delayBetweenPhotos').value.split(',').map(parseInt);
    currentZoomIndex = 0;
    document.getElementById('downloadPhotos').disabled = true;
}

function changeFileNameOption() {
    fileNameOption = document.getElementById('fileNameOption').value;
}

async function startCapture() {
    capturedPhotos = [];
    document.getElementById('capturedPhotos').innerHTML = '';
    currentZoomIndex = 0;
    document.getElementById('startCapture').disabled = true;
    document.getElementById('switchCamera').disabled = true;
    await captureSequence();
}

async function captureSequence() {
    if (currentZoomIndex < numPhotos) {
        if (currentZoomIndex > 0) {
            await countdown(delayBetweenPhotos[currentZoomIndex]);
        }
        await capturePhoto();
        currentZoomIndex++;
        await captureSequence();
    } else {
        document.getElementById('startCapture').disabled = false;
        document.getElementById('switchCamera').disabled = false;
        document.getElementById('downloadPhotos').disabled = false;
        await downloadPhotos();
    }
}

async function countdown(seconds) {
    const countdownElement = document.createElement('div');
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.fontSize = '24px';
    countdownElement.style.color = 'white';
    countdownElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    countdownElement.style.padding = '120px';
    countdownElement.style.borderRadius = '5px';
    countdownElement.id = 'countdown';
    document.body.appendChild(countdownElement);

    for (let i = seconds; i > 0; i--) {
        countdownElement.textContent = `Next photo in: ${i}`;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    document.body.removeChild(countdownElement);
}

async function capturePhoto() {
    const zoom = zoomLevels[currentZoomIndex];

    if (track && 'zoom' in track.getCapabilities()) {
        const capabilities = track.getCapabilities();
        if (capabilities.zoom && zoom >= capabilities.zoom.min && zoom <= capabilities.zoom.max) {
            const constraints = {
                advanced: [{ zoom: zoom }]
            };
            await track.applyConstraints(constraints);
        } else {
            console.warn(`Zoom level ${zoom} is out of range. Supported range: ${capabilities.zoom.min} - ${capabilities.zoom.max}`);
        }
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    await new Promise(resolve => setTimeout(resolve, 2000));
}

async function switchCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';

    try {
        await startVideoStream();
    } catch (err) {
        showModal("Error switching camera. Please try again.");
        console.error("Error switching camera", err);
    }
}

async function downloadPhotos() {
    // Check if the user wants to name the file manually or automatically
    let exportFileNamePrefix;
    if (fileNameOption === 'manual') {
        exportFileNamePrefix = prompt("Enter a prefix for the exported photos:");
        if (!exportFileNamePrefix) {
            exportFileNamePrefix = `captured_photo`;
        }
    } else {
        exportFileNamePrefix = `captured_photo_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    }

    // Loop through each captured photo and trigger the download
    capturedPhotos.forEach((photo, index) => {
        const link = document.createElement('a');
        link.href = photo;
        link.download = `${exportFileNamePrefix}_${index + 1}.png`; // Naming each photo with the prefix or timestamp
        link.click(); // Automatically trigger the download for each photo
    });

    document.getElementById('downloadPhotos').disabled = true; // Disable download button after photos are downloaded
}

function showModal(message) {
    const modal = document.getElementById('modal');
    document.getElementById('modalMessage').textContent = message;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

window.onload = init;
