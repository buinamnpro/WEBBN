// Quiz logic for vocabulary practice
console.log('Quiz script loaded successfully');

(function () {
    // DOM Elements
    const nextBtn = document.getElementById('nextBtn');
    const statusEl = document.getElementById('status');
    const card = document.getElementById('card');
    const hanziEl = document.getElementById('hanzi');
    const optionsEl = document.getElementById('options');
    const progressEl = document.getElementById('progress');
    const scoreEl = document.getElementById('score');
    const exampleBox = document.getElementById('example');
    const exMeaningEl = document.getElementById('exMeaning');
    const exHanziEl = document.getElementById('exHanzi');
    const exPinyinEl = document.getElementById('exPinyin');
    const exViEl = document.getElementById('exVi');

    console.log('Elements found:', {
        nextBtn: !!nextBtn,
        statusEl: !!statusEl,
        card: !!card,
        hanziEl: !!hanziEl,
        optionsEl: !!optionsEl
    });

    // State variables
    let data = [];              // { hanzi, pinyin, meaningVi, exHanzi, exPinyin, exVi }
    let currentIndex = -1;
    let lastIndex = -1;
    let answered = false;       // đã trả lời đúng chưa
    let correctCount = 0;
    let questionCount = 0;
    let currentDataset = '';

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
        
        // If we're in /WEBBN/dist/quiz/ structure (Live Server from project root)
        if (currentPath.includes('/WEBBN/dist/quiz/')) {
            return '/WEBBN/dist/' + normalized;
        }
        // If we're in /quiz/ structure (served from dist/)
        else if (currentPath.match(/^\/quiz\//)) {
            return '/' + normalized;
        }
        // Default: assume served from dist/
        else {
            return '../' + normalized;
        }
    }

    async function fetchCsv(url) {
        const busted = withCacheBust(url);
        const res = await fetch(busted, { cache: 'no-store' });
        if (!res.ok) throw new Error('Không thể tải CSV: ' + res.status);
        return await res.text();
    }

    function csvParse(text) {
        const rows = [];
        let i = 0, field = '', row = [], inQuotes = false;
        
        const pushField = () => { row.push(field); field = ''; };
        const pushRow = () => { rows.push(row); row = []; };
        
        while (i < text.length) {
            const ch = text[i];
            if (inQuotes) {
                if (ch === '"') { 
                    if (text[i + 1] === '"') { 
                        field += '"'; 
                        i++; 
                    } else { 
                        inQuotes = false; 
                    } 
                } else { 
                    field += ch; 
                }
            } else {
                if (ch === '"') { 
                    inQuotes = true; 
                } else if (ch === ',') { 
                    pushField(); 
                } else if (ch === '\n') { 
                    pushField(); 
                    pushRow(); 
                } else if (ch === '\r') { 
                    // Skip
                } else { 
                    field += ch; 
                }
            }
            i++;
        }
        
        if (field.length > 0 || row.length > 0) { 
            pushField(); 
            pushRow(); 
        }
        
        return rows.filter(r => r.some(c => String(c).trim().length));
    }

    function normalizeHeaderName(name) {
        return String(name).toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parseVietnameseCsv(text) {
        const rows = csvParse(text);
        if (!rows.length) return [];
        
        const header = rows.shift().map(h => normalizeHeaderName(h));
        const idxWord = header.indexOf('tu moi');
        const phienAmIdxs = header.map((h, idx) => h === 'phien am' ? idx : -1).filter(x => x !== -1);
        const idxExplain = header.indexOf('giai thich');
        const idxExHanzi = header.findIndex(h => h.startsWith('vi du'));
        
        let idxPinyin = phienAmIdxs.length ? phienAmIdxs[0] : -1;
        let idxExPinyin = -1;
        
        if (phienAmIdxs.length > 1) {
            const afterEx = phienAmIdxs.find(i => i > idxExHanzi);
            idxExPinyin = (afterEx != null ? afterEx : phienAmIdxs[phienAmIdxs.length - 1]);
        }
        
        const idxExVi = header.indexOf('dich');

        const out = [];
        for (const r of rows) {
            const hanzi = (r[idxWord] || '').trim();
            const pinyin = (r[idxPinyin] || '').trim();
            const meaningVi = idxExplain >= 0 ? (r[idxExplain] || '').trim() : '';
            const exHanzi = idxExHanzi >= 0 ? (r[idxExHanzi] || '').trim() : '';
            const exPinyin = idxExPinyin >= 0 ? (r[idxExPinyin] || '').trim() : '';
            const exVi = idxExVi >= 0 ? (r[idxExVi] || '').trim() : '';
            
            if (hanzi) {
                out.push({ hanzi, pinyin, meaningVi, exHanzi, exPinyin, exVi });
            }
        }
        
        return out;
    }

    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function pickNextIndex() {
        if (data.length === 0) return -1;
        if (data.length === 1) return 0;
        
        let idx = Math.floor(Math.random() * data.length);
        if (idx === lastIndex) {
            idx = (idx + 1 + Math.floor(Math.random() * (data.length - 1))) % data.length;
        }
        return idx;
    }

    function buildOptions(correctPinyin) {
        const uniquePinyin = Array.from(new Set(data.map(r => r.pinyin).filter(Boolean)));
        const distractors = uniquePinyin.filter(p => p !== correctPinyin);
        shuffleInPlace(distractors);
        const choices = [correctPinyin, ...distractors.slice(0, 3)];
        return shuffleInPlace(choices);
    }

    function renderQuestion() {
        if (!data.length) return;
        
        currentIndex = pickNextIndex();
        if (currentIndex < 0) return;
        
        answered = false;
        const item = data[currentIndex];
        
        if (hanziEl) {
            hanziEl.textContent = item.hanzi;
            hanziEl.setAttribute('aria-label', `Chữ Hán: ${item.hanzi}`);
        }
        
        // Hide example box initially
        if (exampleBox) exampleBox.classList.add('hidden');
        if (exMeaningEl) exMeaningEl.textContent = '';
        if (exHanziEl) exHanziEl.textContent = '';
        if (exPinyinEl) exPinyinEl.textContent = '';
        if (exViEl) exViEl.textContent = '';

        const options = buildOptions(item.pinyin);
        if (options.length < 4) {
            setStatus('Cần ít nhất 4 pinyin khác nhau để tạo đáp án. Hãy bổ sung dữ liệu.');
            if (card) card.classList.add('hidden');
            if (nextBtn) nextBtn.classList.add('hidden');
            return;
        }
        
        // Clear and build options
        if (optionsEl) {
            optionsEl.innerHTML = '';
            for (let i = 0; i < options.length; i++) {
                const btn = document.createElement('button');
                btn.className = 'option';
                btn.textContent = options[i];
                btn.dataset.value = options[i];
                btn.setAttribute('aria-label', `Lựa chọn ${i + 1}: ${options[i]}`);
                btn.setAttribute('tabindex', '0');
                btn.addEventListener('click', () => handleAnswer(btn, item));
                optionsEl.appendChild(btn);
            }
        }

        if (progressEl) progressEl.textContent = 'Câu: ' + (questionCount + 1);
        setStatus('Chọn pinyin đúng cho chữ: ' + item.hanzi);
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (card) card.classList.remove('hidden');

        // Focus management for accessibility
        setTimeout(() => {
            const firstOption = optionsEl?.querySelector('.option');
            if (firstOption) firstOption.focus();
        }, 100);
    }

    function handleAnswer(buttonEl, item) {
        if (answered) return;
        
        const chosen = buttonEl.dataset.value;
        const isCorrect = chosen === item.pinyin;

        // Add visual feedback immediately
        buttonEl.classList.add('loading');

        setTimeout(() => {
            buttonEl.classList.remove('loading');

            if (!isCorrect) {
                // Wrong answer - show it as wrong
                buttonEl.classList.add('wrong');
                buttonEl.disabled = true;
                buttonEl.setAttribute('aria-label', buttonEl.getAttribute('aria-label') + ' - Sai');
                setStatus(`Sai! Hãy thử lại. Đáp án đúng là: ${item.pinyin}`);
                return;
            }

            // Correct answer
            answered = true;
            const allOptions = optionsEl?.querySelectorAll('.option');
            if (allOptions) {
                allOptions.forEach(btn => {
                    btn.disabled = true;
                    if (btn.dataset.value === item.pinyin) {
                        btn.classList.add('correct');
                        btn.setAttribute('aria-label', btn.getAttribute('aria-label') + ' - Đúng');
                    }
                });
            }

            questionCount += 1;
            correctCount += 1;
            if (scoreEl) scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
            lastIndex = currentIndex;

            // Show example information
            if (exMeaningEl) exMeaningEl.textContent = item.meaningVi || '—';
            if (exHanziEl) exHanziEl.textContent = item.exHanzi || '—';
            if (exPinyinEl) exPinyinEl.textContent = item.exPinyin || '—';
            if (exViEl) exViEl.textContent = item.exVi || '—';
            if (exampleBox) exampleBox.classList.remove('hidden');

            if (nextBtn) {
                nextBtn.classList.remove('hidden');
                nextBtn.focus(); // Focus next button for accessibility
            }

            setStatus(`Chính xác! Điểm: ${correctCount}/${questionCount}`);
        }, 300);
    }

    function nextQuestion() { 
        renderQuestion(); 
    }

    async function loadDataset(file) {
        try {
            setStatus('Đang tải dữ liệu...');
            const resolvedPath = resolveDatasetPath(file);
            console.log('Loading dataset:', file, '->', resolvedPath);
            
            const text = await fetchCsv(resolvedPath);
            data = parseVietnameseCsv(text);
            
            console.log('Loaded data:', data.length, 'items');
            
            if (data.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ trong file CSV');
            }
            
            currentDataset = file;
            correctCount = 0;
            questionCount = 0;
            currentIndex = -1;
            lastIndex = -1;
            answered = false;
            
            // Update UI
            if (scoreEl) scoreEl.textContent = 'Đúng: 0/0';
            
            renderQuestion();
            setStatus(`Đã tải ${data.length} từ vựng. Bắt đầu quiz!`);
            
        } catch (error) {
            console.error('Error loading dataset:', error);
            setStatus('Lỗi: ' + error.message);
            if (card) card.classList.add('hidden');
        }
    }

    // Event listeners
    function setupEventListeners() {
        // Dataset buttons
        document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const file = btn.dataset.file;
                if (file) {
                    // Update button states
                    document.querySelectorAll('.dataset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    loadDataset(file);
                }
            });
        });

        // Next button
        if (nextBtn) {
            nextBtn.addEventListener('click', nextQuestion);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            const key = e.key.toLowerCase();
            
            // Number keys for options
            if (['1', '2', '3', '4'].includes(key)) {
                const optionIndex = parseInt(key) - 1;
                const options = optionsEl?.querySelectorAll('.option');
                if (options && options[optionIndex] && !options[optionIndex].disabled) {
                    options[optionIndex].click();
                    e.preventDefault();
                }
                return;
            }

            // Enter/Space for next question
            if ((key === 'enter' || key === ' ') && answered) {
                nextQuestion();
                e.preventDefault();
                return;
            }
        });
    }

    // Initialize
    function init() {
        setupEventListeners();
        setStatus('Chọn một bộ từ để bắt đầu học.');
        console.log('Quiz initialized successfully');
    }

    // Wait for DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions for debugging
    window.quizDebug = {
        loadDataset,
        data: () => data,
        currentIndex: () => currentIndex,
        renderQuestion,
        nextQuestion
    };

})();