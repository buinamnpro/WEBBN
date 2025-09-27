// Simple random fix script - không dùng IIFE
console.log('Random fix script loaded');

// Global variables
let isRandomMode = false;
let speakingData = [];
let speakingIndex = 0;

// Function to toggle random mode
function toggleRandomMode() {
    isRandomMode = !isRandomMode;
    console.log('Random mode toggled:', isRandomMode);

    const randomBtn = document.getElementById('random-toggle-btn');
    if (randomBtn) {
        randomBtn.classList.toggle('active', isRandomMode);
        randomBtn.textContent = isRandomMode ? '🎲 Random ON' : '🎲 Random';
    }
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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM ready, setting up event listeners');

    // Random button event listener
    const randomBtn = document.getElementById('random-toggle-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', toggleRandomMode);
        console.log('Random button event listener added');
    } else {
        console.log('Random button not found');
    }

    // Speaking next button event listener
    const speakingNextBtn = document.getElementById('speaking-next-btn');
    if (speakingNextBtn) {
        speakingNextBtn.addEventListener('click', nextSpeakingQuestion);
        console.log('Speaking next button event listener added');
    } else {
        console.log('Speaking next button not found');
    }

    // Override speaking data when it's loaded
    const originalLoadDataset = window.loadDataset;
    if (originalLoadDataset) {
        window.loadDataset = function (filePath) {
            console.log('Overriding loadDataset for:', filePath);
            const result = originalLoadDataset.apply(this, arguments);

            // If it's speaking data, capture it
            if (filePath.includes('onhsk3.txt')) {
                setTimeout(() => {
                    // Try to get speaking data from the main script
                    if (window.speakingData) {
                        speakingData = window.speakingData;
                        speakingIndex = window.speakingIndex || 0;
                        console.log('Captured speaking data:', speakingData.length, 'items');
                    }
                }, 100);
            }

            return result;
        };
    }
});

// Expose functions globally
window.toggleRandomMode = toggleRandomMode;
window.nextSpeakingQuestion = nextSpeakingQuestion;
window.isRandomMode = isRandomMode;
window.speakingData = speakingData;
window.speakingIndex = speakingIndex;

console.log('Random fix script setup complete');
