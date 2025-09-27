// Simple random fix script - không dùng IIFE
console.log('Random fix script loaded');

// Global variables
let isRandomMode = false;
let speakingData = [];
let speakingIndex = 0;

// Function to toggle random mode
function toggleRandomMode(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    isRandomMode = !isRandomMode;
    console.log('Random mode toggled:', isRandomMode);

    const randomBtn = document.getElementById('random-toggle-btn');
    if (randomBtn) {
        randomBtn.classList.toggle('active', isRandomMode);
        randomBtn.textContent = isRandomMode ? '🎲 Random ON' : '🎲 Random';
    }

    // Update global variable
    window.isRandomMode = isRandomMode;
}

// Function to go to next speaking question
function nextSpeakingQuestion() {
    if (speakingData.length === 0) {
        console.log('No speaking data available');
        return;
    }

    console.log('nextSpeakingQuestion called, random mode:', isRandomMode);

    if (isRandomMode) {
        // Random speaking question
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * speakingData.length);
        } while (newIndex === speakingIndex && speakingData.length > 1);
        speakingIndex = newIndex;
        console.log('🎲 RANDOM question selected:', speakingIndex, 'of', speakingData.length);
    } else {
        // Sequential speaking question
        speakingIndex = (speakingIndex + 1) % speakingData.length;
        console.log('➡️ SEQUENTIAL question selected:', speakingIndex, 'of', speakingData.length);
    }

    // Update UI
    const item = speakingData[speakingIndex];
    const speakingHanziEl = document.getElementById('speaking-hanzi');
    const speakingPinyinEl = document.getElementById('speaking-pinyin');
    const speakingProgressEl = document.getElementById('speaking-progress');

    if (speakingHanziEl) speakingHanziEl.textContent = item.hanzi;
    if (speakingPinyinEl) speakingPinyinEl.textContent = item.pinyin;
    if (speakingProgressEl) speakingProgressEl.textContent = 'Câu: ' + (speakingIndex + 1);
}

// Setup event listeners when DOM is ready
function setupEventListeners() {
    console.log('Setting up event listeners');

    // Random button event listener
    const randomBtn = document.getElementById('random-toggle-btn');
    if (randomBtn) {
        // Remove any existing event listeners
        randomBtn.onclick = null;
        randomBtn.removeEventListener('click', toggleRandomMode);

        // Add our event listener
        randomBtn.addEventListener('click', toggleRandomMode);
        console.log('Random button event listener added');
    } else {
        console.log('Random button not found');
    }

    // Speaking next button event listener
    const speakingNextBtn = document.getElementById('speaking-next-btn');
    if (speakingNextBtn) {
        speakingNextBtn.removeEventListener('click', nextSpeakingQuestion);
        speakingNextBtn.addEventListener('click', nextSpeakingQuestion);
        console.log('Speaking next button event listener added');
    } else {
        console.log('Speaking next button not found');
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}

// Capture speaking data from script.js
setTimeout(() => {
    if (window.speakingData && window.speakingData.length > 0) {
        speakingData = window.speakingData;
        speakingIndex = window.speakingIndex || 0;
        console.log('Captured speaking data:', speakingData.length, 'items');
    }
}, 1000);

// Also try to capture speaking data periodically
setInterval(() => {
    if (window.speakingData && window.speakingData.length > 0 && speakingData.length === 0) {
        speakingData = window.speakingData;
        speakingIndex = window.speakingIndex || 0;
        console.log('Periodically captured speaking data:', speakingData.length, 'items');
    }
}, 2000);

// Expose functions globally
window.toggleRandomMode = toggleRandomMode;
window.nextSpeakingQuestion = nextSpeakingQuestion;
window.isRandomMode = isRandomMode;
window.speakingData = speakingData;
window.speakingIndex = speakingIndex;

console.log('Random fix script setup complete');
