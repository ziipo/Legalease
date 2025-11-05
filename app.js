// API endpoint - Vercel production URL
const API_ENDPOINT = 'https://legalease-phi.vercel.app/api/analyze-document';

// DOM elements
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const focusArea = document.getElementById('focusArea');
const analyzeBtn = document.getElementById('analyzeBtn');
const inputSection = document.getElementById('inputSection');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const reviewResult = document.getElementById('reviewResult');
const errorMessage = document.getElementById('errorMessage');
const copyBtn = document.getElementById('copyBtn');
const newDocBtn = document.getElementById('newDocBtn');
const retryBtn = document.getElementById('retryBtn');

// Load saved focus area preference
window.addEventListener('DOMContentLoaded', () => {
    const savedFocusArea = localStorage.getItem('focusArea');
    if (savedFocusArea) {
        focusArea.value = savedFocusArea;
    }
});

// Save focus area preference
focusArea.addEventListener('change', () => {
    localStorage.setItem('focusArea', focusArea.value);
});

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
        showError('Please select a file to upload.');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
    }

    await analyzeDocument(file);
});

// Analyze document
async function analyzeDocument(file) {
    try {
        // Show loading state
        inputSection.classList.add('hidden');
        errorSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('focusArea', focusArea.value);

        // Call API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze document');
        }

        const data = await response.json();

        // Show results
        displayResults(data.review);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred while analyzing your document. Please try again.');
    }
}

// Display results
function displayResults(review) {
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    // Format the review with proper sections
    const formattedReview = formatReview(review);
    reviewResult.innerHTML = formattedReview;
}

// Format review text into HTML
function formatReview(review) {
    // Split by common section headers and format
    let formatted = review
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n- /g, '</li><li>')
        .replace(/(<li>)/g, '<ul><li>')
        .replace(/(<\/li>)(?![\s\S]*<li>)/g, '</li></ul>');

    return `<p>${formatted}</p>`;
}

// Show error
function showError(message) {
    loadingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    inputSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    errorMessage.textContent = message;
}

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
    const reviewText = reviewResult.innerText;

    try {
        await navigator.clipboard.writeText(reviewText);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
});

// Analyze another document
newDocBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    fileInput.value = '';
    reviewResult.innerHTML = '';
});

// Retry after error
retryBtn.addEventListener('click', () => {
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
});
