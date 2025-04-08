// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const changeImageBtn = document.getElementById('change-image');
const editorSection = document.getElementById('editor-section');
const resultSection = document.getElementById('result-section');
const originalWidth = document.getElementById('original-width');
const originalHeight = document.getElementById('original-height');
const originalSize = document.getElementById('original-size');
const originalFormat = document.getElementById('original-format');
const maxWidthInput = document.getElementById('max-width');
const maxHeightInput = document.getElementById('max-height');
const lockAspectRatio = document.getElementById('lock-aspect-ratio');
const maxSizeInput = document.getElementById('max-size');
const outputFormatSelect = document.getElementById('output-format');
const resizeButton = document.getElementById('resize-button');
const resultImage = document.getElementById('result-image');
const resultWidth = document.getElementById('result-width');
const resultHeight = document.getElementById('result-height');
const resultSize = document.getElementById('result-size');
const resultFormat = document.getElementById('result-format');
const downloadButton = document.getElementById('download-button');
const resizeAgainBtn = document.getElementById('resize-again');
const alertContainer = document.getElementById('alert-container');

// Global variables
let currentFile = null;
let originalImageData = null;
let resultImageData = null;
let aspectRatio = 1;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // File upload events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);
    changeImageBtn.addEventListener('click', resetUpload);
    
    // Resize settings events
    lockAspectRatio.addEventListener('change', toggleAspectRatio);
    maxWidthInput.addEventListener('input', handleDimensionChange('width'));
    maxHeightInput.addEventListener('input', handleDimensionChange('height'));
    resizeButton.addEventListener('click', processImage);
    
    // Result events
    downloadButton.addEventListener('click', downloadImage);
    resizeAgainBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        editorSection.classList.remove('hidden');
    });
}

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    // Validate if file is an image
    if (!file.type.match('image.*')) {
        showAlert('Please select a valid image file.', 'error');
        return;
    }
    
    currentFile = file;
    
    // Display image preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewContainer.classList.remove('hidden');
        document.querySelector('.upload-prompt').classList.add('hidden');
        
        // Create an image object to get dimensions
        const img = new Image();
        img.onload = function() {
            // Store original image data
            originalImageData = {
                width: img.width,
                height: img.height,
                size: file.size / 1024, // Convert to KB
                format: file.type.split('/')[1].toUpperCase()
            };
            
            // Display original image properties
            originalWidth.textContent = originalImageData.width;
            originalHeight.textContent = originalImageData.height;
            originalSize.textContent = originalImageData.size.toFixed(2);
            originalFormat.textContent = originalImageData.format;
            
            // Set aspect ratio
            aspectRatio = originalImageData.width / originalImageData.height;
            
            // Prefill max dimensions with original values
            maxWidthInput.value = originalImageData.width;
            maxHeightInput.value = originalImageData.height;
            
            // Prefill max size with original size
            maxSizeInput.value = Math.ceil(originalImageData.size);
            
            // Prefill output format with original format
            setOutputFormat(originalImageData.format);
            
            // Show editor section
            editorSection.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setOutputFormat(format) {
    format = format.toLowerCase();
    if (format === 'jpeg') {
        outputFormatSelect.value = 'jpeg';
    } else if (format === 'jpg') {
        outputFormatSelect.value = 'jpg';
    } else if (format === 'png') {
        outputFormatSelect.value = 'png';
    } else if (format === 'webp') {
        outputFormatSelect.value = 'webp';
    }
}

function resetUpload() {
    currentFile = null;
    previewImage.src = '';
    previewContainer.classList.add('hidden');
    document.querySelector('.upload-prompt').classList.remove('hidden');
    editorSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    fileInput.value = '';
}

// Dimension Handlers
function toggleAspectRatio() {
    if (lockAspectRatio.checked && maxWidthInput.value) {
        const newHeight = Math.round(maxWidthInput.value / aspectRatio);
        maxHeightInput.value = newHeight;
    }
}

function handleDimensionChange(dimension) {
    return function() {
        if (lockAspectRatio.checked) {
            if (dimension === 'width' && maxWidthInput.value) {
                const newHeight = Math.round(maxWidthInput.value / aspectRatio);
                maxHeightInput.value = newHeight;
            } else if (dimension === 'height' && maxHeightInput.value) {
                const newWidth = Math.round(maxHeightInput.value * aspectRatio);
                maxWidthInput.value = newWidth;
            }
        }
    };
}

// Image Processing
async function processImage() {
    if (!currentFile) {
        showAlert('Please upload an image first.', 'error');
        return;
    }
    
    // Validate inputs
    const maxWidth = parseInt(maxWidthInput.value);
    const maxHeight = parseInt(maxHeightInput.value);
    const maxSize = parseInt(maxSizeInput.value);
    const outputFormat = outputFormatSelect.value;
    
    if (!maxWidth || !maxHeight) {
        showAlert('Please enter valid dimensions.', 'error');
        return;
    }
    
    if (!maxSize) {
        showAlert('Please enter a valid maximum file size.', 'error');
        return;
    }
    
    try {
        showAlert('Processing image...', 'success');
        
        // Step 1: Resize the image (and strip metadata)
        const resizedImageBlob = await resizeImage(
            currentFile, 
            maxWidth, 
            maxHeight, 
            outputFormat
        );
        
        // Step 2: Compress the image to meet size requirements
        let compressedImageBlob = resizedImageBlob;
        if (resizedImageBlob.size / 1024 > maxSize) {
            compressedImageBlob = await compressImage(
                resizedImageBlob, 
                maxSize, 
                outputFormat
            );
        }
        
        // Get final image information
        const img = await createImageFromBlob(compressedImageBlob);
        resultImageData = {
            width: img.width,
            height: img.height,
            size: compressedImageBlob.size / 1024,
            format: outputFormat.toUpperCase(),
            blob: compressedImageBlob,
            url: URL.createObjectURL(compressedImageBlob)
        };
        
        // Display result
        displayResult();
        
    } catch (error) {
        console.error('Error processing image:', error);
        showAlert('Error processing image: ' + error.message, 'error');
    }
}

async function resizeImage(file, maxWidth, maxHeight, outputFormat) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                // Resize if needed
                if (width > maxWidth || height > maxHeight) {
                    if (width / maxWidth > height / maxHeight) {
                        // Width is the limiting factor
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    } else {
                        // Height is the limiting factor
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                
                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Draw image with white background (for transparent images)
                if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                }
                
                // Draw the image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    blob => resolve(blob),
                    'image/' + outputFormat,
                    outputFormat === 'jpeg' || outputFormat === 'jpg' ? 0.92 : 1
                );
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressImage(imageBlob, maxSizeKB, outputFormat) {
    try {
        // Use browser-image-compression library for efficient compression
        const options = {
            maxSizeMB: maxSizeKB / 1024, // Convert KB to MB
            maxWidthOrHeight: 4096, // Use original dimensions as we've already resized
            useWebWorker: true,
            fileType: `image/${outputFormat}`,
        };
        
        return await imageCompression(imageBlob, options);
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress image to the requested size');
    }
}

function createImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}

function displayResult() {
    // Update result image and details
    resultImage.src = resultImageData.url;
    resultWidth.textContent = resultImageData.width;
    resultHeight.textContent = resultImageData.height;
    resultSize.textContent = resultImageData.size.toFixed(2);
    resultFormat.textContent = resultImageData.format;
    
    // Check if requirements were met
    const maxSize = parseInt(maxSizeInput.value);
    const isWithinSize = resultImageData.size <= maxSize;
    
    if (!isWithinSize) {
        showAlert('Warning: Could not compress to the requested file size while maintaining acceptable quality.', 'warning');
    } else {
        showAlert('Image processed successfully!', 'success');
    }
    
    // Show result section
    editorSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
}

function downloadImage() {
    if (!resultImageData) return;
    
    const a = document.createElement('a');
    a.href = resultImageData.url;
    
    // Create filename
    const originalName = currentFile.name.split('.')[0];
    const extension = resultImageData.format.toLowerCase();
    a.download = `${originalName}_resized.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// UI Helper Functions
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
    }
    
    alert.innerHTML = `
        ${icon}
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;
    
    // Add close button functionality
    alert.querySelector('.close-btn').addEventListener('click', () => {
        alertContainer.removeChild(alert);
    });
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode === alertContainer) {
            alertContainer.removeChild(alert);
        }
    }, 5000);
}