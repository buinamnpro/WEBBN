// HSK3 App logic for speaking practice
console.log('HSK3 script loaded successfully');

(function () {
    // Elements
    const statusEl = document.getElementById('status');
    const speakingCard = document.getElementById('speaking-card');
    const speakingHanziEl = document.getElementById('speaking-hanzi');
    const speakingPinyinEl = document.getElementById('speaking-pinyin');
    const speakBtn = document.getElementById('speak-btn');
    const speakingNextBtn = document.getElementById('speaking-next-btn');
    const speakingProgressEl = document.getElementById('speaking-progress');
    const ttsRateInput = document.getElementById('ttsRate');
    const ttsRateValue = document.getElementById('ttsRateValue');
    const viZhBtn = document.getElementById('viZhBtn');
    const autoplayToggle = document.getElementById('autoplayToggle');
    const randomToggleBtn = document.getElementById('random-toggle-btn');

    // Data and state
    let speakingData = [];
    let speakingIndex = 0;
    let isRandomMode = false;
    let currentFile = '';
    let isDichMode = false;

    function setStatus(msg) { 
        if (statusEl) statusEl.textContent = msg; 
    }

    function withCacheBust(url) {
        try {
            const u = new URL(url, window.location.origin);
            u.searchParams.set('v', Date.now().toString());
            return u.toString();
        } catch {
            return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        }
    }

    function resolveDatasetPath(inputPath) {
        // Keep absolute URLs untouched
        if (/^https?:\/\//i.test(inputPath)) return inputPath;

        if (inputPath.startsWith('../')) {
            return inputPath;
        }

        const normalized = (inputPath || '').replace(/^\/+/, '');
        const currentPath = window.location.pathname;
        console.log('Resolving path for:', normalized, 'from:', currentPath);
        
        // If we're in /WEBBN/dist/hsk3/ structure (Live Server from project root)
        if (currentPath.includes('/WEBBN/dist/hsk3/')) {
            return '/WEBBN/dist/' + normalized;
        }
        // If we're in /hsk3/ structure (served from dist/)
        else if (currentPath.match(/^\/hsk3\//)) {
            return '/' + normalized;
        }
        // Default: assume served from dist/
        else {
            return '../' + normalized;
        }
    }

    async function fetchTextData(url) {
        const busted = withCacheBust(url);
        const res = await fetch(busted, { cache: 'no-store' });
        if (!res.ok) throw new Error('Không thể tải dữ liệu: ' + res.status);
        return await res.text();
    }

    function parseSpeakingText(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const questions = [];

        for (const line of lines) {
            const match = line.match(/^\d+\.\s+(.+?)\s+([A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s\?！。，、；：""''（）【】《》]+?)\s*$/);
            if (match) {
                let hanzi = match[1].trim();
                let pinyin = match[2].trim();
                
                // Clean pinyin
                pinyin = pinyin.replace(/[？?！。，、；：""''（）【】《》]/g, '').trim();
                
                if (hanzi && pinyin) {
                    questions.push({ hanzi, pinyin });
                }
            }
        }
        return questions;
    }

    function parseDichText(text) {
        const rawLines = text.split(/\r?\n/);
        const lines = rawLines.map(l => l.trim()).filter(l => l.length >= 0);
        const items = [];
        
        const nextNonEmpty = (start) => {
            for (let j = start; j < lines.length; j++) {
                if (lines[j].trim()) return { idx: j, val: lines[j].trim() };
            }
            return { idx: lines.length, val: '' };
        };
        
        for (let i = 0; i < lines.length; i++) {
            const a = lines[i].trim();
            if (!a) continue;
            
            const m1 = a.match(/^\uFEFF?\s*\d+[\.\u3002\uFF0E\u3001\uFF61]?\s*(.+)$/);
            if (!m1) continue;
            
            const hanzi = m1[1].trim();
            const b = nextNonEmpty(i + 1); 
            const pinyinLine = b.val;
            const c = nextNonEmpty(b.idx + 1); 
            const viLine = c.val;
            
            let pinyin = '';
            const m2 = pinyinLine.match(/^\((.+)\)$/);
            if (m2) pinyin = m2[1].trim(); 
            else pinyin = pinyinLine;
            
            if (hanzi && pinyin && viLine) {
                items.push({ hanzi, pinyin, vi: viLine });
                i = c.idx;
            }
        }
        return items;
    }

    async function loadSpeakingData(file) {
        try {
            setStatus('Đang tải dữ liệu...');
            const resolvedPath = resolveDatasetPath(file);
            console.log('Loading speaking data:', file, '->', resolvedPath);
            
            const text = await fetchTextData(resolvedPath);
            
            isDichMode = file.includes('dich.txt');
            
            if (isDichMode) {
                speakingData = parseDichText(text);
                console.log('Loaded dich data:', speakingData.length, 'items');
            } else {
                speakingData = parseSpeakingText(text);
                console.log('Loaded speaking data:', speakingData.length, 'items');
            }
            
            if (speakingData.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ trong file');
            }
            
            currentFile = file;
            speakingIndex = 0;
            isRandomMode = false;
            
            // Update UI
            if (randomToggleBtn) {
                randomToggleBtn.classList.remove('active');
                randomToggleBtn.textContent = '🎲 Random';
            }
            
            if (viZhBtn) {
                if (isDichMode) {
                    viZhBtn.classList.remove('hidden');
                } else {
                    viZhBtn.classList.add('hidden');
                }
            }
            
            // Show speaking card and hide mode selection
            if (speakingCard) speakingCard.classList.remove('hidden');
            const modeSelection = document.querySelector('.mode-selection');
            if (modeSelection) modeSelection.style.display = 'none';
            
            renderSpeakingQuestion();
            setStatus(`Đã tải ${speakingData.length} câu. Bấm "Đọc" để nghe phát âm.`);
            
        } catch (error) {
            console.error('Error loading speaking data:', error);
            setStatus('Lỗi: ' + error.message);
        }
    }

    function renderSpeakingQuestion() {
        if (!speakingData.length) return;
        
        const item = speakingData[speakingIndex];
        
        if (speakingHanziEl) {
            if (isDichMode && item.vi) {
                // Show Vietnamese for translation mode
                speakingHanziEl.textContent = item.vi;
                speakingHanziEl.setAttribute('aria-label', `Câu tiếng Việt cần dịch: ${item.vi}`);
            } else {
                speakingHanziEl.textContent = item.hanzi;
                speakingHanziEl.setAttribute('aria-label', `Câu tiếng Trung: ${item.hanzi}`);
            }
        }
        
        if (speakingPinyinEl) {
            if (isDichMode) {
                // Show Chinese characters as the answer for translation mode
                speakingPinyinEl.textContent = `${item.hanzi} (${item.pinyin})`;
                speakingPinyinEl.setAttribute('aria-label', `Đáp án: ${item.hanzi}, phiên âm: ${item.pinyin}`);
            } else {
                speakingPinyinEl.textContent = item.pinyin;
                speakingPinyinEl.setAttribute('aria-label', `Phiên âm: ${item.pinyin}`);
            }
        }
        
        if (speakingProgressEl) {
            speakingProgressEl.textContent = `Câu: ${speakingIndex + 1}/${speakingData.length}`;
        }

        // Auto-play if enabled
        if (autoplayToggle && autoplayToggle.checked) {
            setTimeout(() => speakChinese(item.hanzi), 500);
        }

        setTimeout(() => {
            if (speakBtn) speakBtn.focus();
        }, 100);
    }

    function nextSpeakingQuestion() {
        if (!speakingData.length) return;
        
        if (isRandomMode) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * speakingData.length);
            } while (newIndex === speakingIndex && speakingData.length > 1);
            speakingIndex = newIndex;
        } else {
            speakingIndex = (speakingIndex + 1) % speakingData.length;
        }
        
        renderSpeakingQuestion();
    }

    function toggleRandomMode() {
        isRandomMode = !isRandomMode;
        
        if (randomToggleBtn) {
            if (isRandomMode) {
                randomToggleBtn.classList.add('active');
                randomToggleBtn.textContent = '🎲 Random ON';
            } else {
                randomToggleBtn.classList.remove('active');
                randomToggleBtn.textContent = '🎲 Random';
            }
        }
        
        console.log('Random mode toggled:', isRandomMode);
    }

    // TTS Rate management
    function getSavedRate() {
        try {
            const saved = localStorage.getItem('ttsRate');
            const rate = saved ? parseFloat(saved) : 0.8;
            return !isNaN(rate) && rate >= 0.5 && rate <= 1.5 ? rate : 0.8;
        } catch {
            return 0.8;
        }
    }

    function setSavedRate(rate) {
        try {
            localStorage.setItem('ttsRate', String(rate));
        } catch { }
    }

    function speakChinese(text, onComplete) {
        if (!text || !('speechSynthesis' in window)) return;
        
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = getSavedRate();
        
        try {
            const voices = speechSynthesis.getVoices();
            const zhVoice = voices.find(v => 
                v.lang.toLowerCase().startsWith('zh') || 
                v.name.includes('Chinese') || 
                v.name.includes('Mandarin')
            );
            if (zhVoice) utterance.voice = zhVoice;
        } catch { }
        
        if (typeof onComplete === 'function') {
            utterance.onend = () => {
                try { onComplete(); } catch { }
            };
        }
        
        speechSynthesis.speak(utterance);
    }

    function speakVietnameseThenChinese() {
        if (!speakingData.length) return;
        
        const item = speakingData[speakingIndex];
        if (!item.vi) return;
        
        speechSynthesis.cancel();
        
        // Speak Vietnamese first
        const viUtterance = new SpeechSynthesisUtterance(item.vi);
        viUtterance.lang = 'vi-VN';
        viUtterance.rate = getSavedRate();
        
        viUtterance.onend = () => {
            // Then speak Chinese
            setTimeout(() => {
                speakChinese(item.hanzi);
            }, 300);
        };
        
        speechSynthesis.speak(viUtterance);
    }

    // Initialize TTS Rate UI
    function initTtsRate() {
        const rate = getSavedRate();
        if (ttsRateInput) ttsRateInput.value = String(rate);
        if (ttsRateValue) ttsRateValue.textContent = rate.toFixed(1) + 'x';
        
        if (ttsRateInput) {
            ttsRateInput.addEventListener('input', () => {
                const val = parseFloat(ttsRateInput.value);
                if (!isNaN(val)) {
                    if (ttsRateValue) ttsRateValue.textContent = val.toFixed(1) + 'x';
                }
            });
            
            ttsRateInput.addEventListener('change', () => {
                const val = parseFloat(ttsRateInput.value);
                if (!isNaN(val)) setSavedRate(val);
            });
        }
    }

    // Event Listeners
    function setupEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const file = btn.dataset.file;
                if (file) {
                    loadSpeakingData(file);
                }
            });
        });

        // Speaking controls
        if (speakBtn) {
            speakBtn.addEventListener('click', () => {
                if (speakingData.length) {
                    const item = speakingData[speakingIndex];
                    speakChinese(item.hanzi);
                }
            });
        }

        if (speakingNextBtn) {
            speakingNextBtn.addEventListener('click', nextSpeakingQuestion);
        }

        if (randomToggleBtn) {
            randomToggleBtn.addEventListener('click', toggleRandomMode);
        }

        if (viZhBtn) {
            viZhBtn.addEventListener('click', speakVietnameseThenChinese);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case 's':
                    if (speakingData.length) {
                        const item = speakingData[speakingIndex];
                        speakChinese(item.hanzi);
                    }
                    e.preventDefault();
                    break;
                case ' ':
                case 'enter':
                    if (speakingCard && !speakingCard.classList.contains('hidden')) {
                        nextSpeakingQuestion();
                        e.preventDefault();
                    }
                    break;
                case 'r':
                    if (speakingCard && !speakingCard.classList.contains('hidden')) {
                        toggleRandomMode();
                        e.preventDefault();
                    }
                    break;
                case 'escape':
                    if (speakBtn) speakBtn.focus();
                    e.preventDefault();
                    break;
            }
        });
    }

    // Initialize
    function init() {
        initTtsRate();
        setupEventListeners();
        setStatus('Chọn một chế độ để bắt đầu luyện tập.');
        
        // Load voices after page load
        setTimeout(() => {
            if ('speechSynthesis' in window) {
                speechSynthesis.getVoices();
            }
        }, 100);
    }

    // Wait for DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions for debugging
    window.hsk3Debug = {
        loadSpeakingData,
        speakingData: () => speakingData,
        toggleRandomMode,
        speakChinese,
        currentIndex: () => speakingIndex,
        isRandomMode: () => isRandomMode
    };

})();