// ... (previous code remains the same) ...

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

// ... (other functions remain the same) ...

function updateZoom() {
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.style.transform = `scale(${currentZoom})`;
    videoContainer.style.transformOrigin = 'center center';
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

function initZoomControls() {
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
}

// Update the init function to include zoom controls initialization
async function init() {
    // ... (previous init code) ...

    initZoomControls();
}

// ... (rest of the previous code remains the same) ...
