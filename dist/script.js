// Quiz logic with dataset selection
(function () {
    const sheetUrlInput = document.getElementById('sheetUrl');
    const loadBtn = document.getElementById('loadBtn');
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

    // Speaking mode elements
    const speakingCard = document.getElementById('speaking-card');
    const speakingHanziEl = document.getElementById('speaking-hanzi');
    const speakingPinyinEl = document.getElementById('speaking-pinyin');
    const speakBtn = document.getElementById('speak-btn');
    const speakingNextBtn = document.getElementById('speaking-next-btn');
    const speakingProgressEl = document.getElementById('speaking-progress');

    let data = [];              // { hanzi, pinyin, meaningVi, exHanzi, exPinyin, exVi }
    let speakingData = [];      // { hanzi, pinyin } for speaking mode
    let currentIndex = -1;
    let lastIndex = -1;
    let answered = false;       // đã trả lời đúng chưa
    let correctCount = 0;
    let questionCount = 0;
    let currentDataset = '';
    let isSpeakingMode = false;
    let speakingIndex = 0;

    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    function isLikelyCsvUrl(url) {
        try {
            const u = new URL(url);
            return u.searchParams.get('output') === 'csv' || u.pathname.endsWith('.csv');
        } catch { return false; }
    }

    async function fetchCsv(url) {
        const res = await fetch(url, { cache: 'no-store' });
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
                if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
                else { field += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { pushField(); }
                else if (ch === '\n') { pushField(); pushRow(); }
                else if (ch === '\r') { }
                else { field += ch; }
            }
            i++;
        }
        if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
        return rows.filter(r => r.some(c => String(c).trim().length));
    }

    function normalizeHeaderName(name) {
        return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
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
            if (hanzi) out.push({ hanzi, pinyin, meaningVi, exHanzi, exPinyin, exVi });
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
        if (hanziEl) hanziEl.textContent = item.hanzi;
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
        optionsEl.innerHTML = '';
        for (let i = 0; i < options.length; i++) {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = options[i];
            btn.dataset.value = options[i];
            btn.addEventListener('click', () => handleAnswer(btn, item));
            optionsEl.appendChild(btn);
        }

        if (progressEl) progressEl.textContent = 'Câu: ' + (questionCount + 1);
        setStatus('Chọn pinyin đúng cho chữ: ' + item.hanzi);
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (card) card.classList.remove('hidden');
    }

    function handleAnswer(buttonEl, item) {
        if (answered) return;
        const chosen = buttonEl.dataset.value;
        const isCorrect = chosen === item.pinyin;
        if (!isCorrect) {
            buttonEl.classList.add('wrong');
            buttonEl.disabled = true;
            return;
        }

        answered = true;
        const all = optionsEl.querySelectorAll('.option');
        all.forEach(b => {
            b.disabled = true;
            if (b.dataset.value === item.pinyin) b.classList.add('correct');
        });

        questionCount += 1;
        correctCount += 1;
        if (scoreEl) scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
        lastIndex = currentIndex;

        if (exMeaningEl) exMeaningEl.textContent = item.meaningVi || '—';
        if (exHanziEl) exHanziEl.textContent = item.exHanzi || '—';
        if (exPinyinEl) exPinyinEl.textContent = item.exPinyin || '—';
        if (exViEl) exViEl.textContent = item.exVi || '—';
        if (exampleBox) exampleBox.classList.remove('hidden');

        if (nextBtn) nextBtn.classList.remove('hidden');
    }

    function nextQuestion() { renderQuestion(); }

    async function loadData() {
        const url = sheetUrlInput.value.trim();
        if (!url) { setStatus('Không có link. Hãy chọn bộ từ bên dưới hoặc dán link.'); return; }
        if (!isLikelyCsvUrl(url)) { setStatus('Link chưa đúng định dạng CSV (hãy Publish to the web và chọn CSV).'); }
        setStatus('Đang tải dữ liệu...');
        loadBtn.disabled = true;
        try {
            const csvText = await fetchCsv(url);
            let rows = parseVietnameseCsv(csvText);
            if (!rows.length) {
                rows = [];
                const simple = csvParse(csvText);
                if (simple.length > 1) {
                    const header = simple.shift().map(h => String(h).trim().toLowerCase());
                    const idxHanzi = header.indexOf('hanzi');
                    const idxPinyin = header.indexOf('pinyin');
                    const idxMeaning = header.indexOf('meaning');
                    for (const r of simple) {
                        const hanzi = (r[idxHanzi] || '').trim();
                        const pinyin = (r[idxPinyin] || '').trim();
                        const meaningVi = idxMeaning >= 0 ? (r[idxMeaning] || '').trim() : '';
                        if (hanzi) rows.push({ hanzi, pinyin, meaningVi, exHanzi: '', exPinyin: '', exVi: '' });
                    }
                }
            }
            if (!rows.length) {
                setStatus('Không đọc được dữ liệu. Hỗ trợ: hanzi,pinyin hoặc sheet tiếng Việt (Từ mới, Phiên âm, Ví dụ (chữ hán), Phiên âm, Dịch).');
                loadBtn.disabled = false;
                return;
            }
            data = rows.filter(r => r.hanzi && r.pinyin);
            currentIndex = -1; lastIndex = -1; answered = false; correctCount = 0; questionCount = 0;
            if (scoreEl) scoreEl.textContent = 'Đúng: 0/0';
            if (nextBtn) nextBtn.classList.remove('hidden');
            setStatus('Đã tải ' + data.length + ' mục từ link. Bắt đầu làm quiz!');
            renderQuestion();
        } catch (err) {
            console.error(err);
            setStatus('Lỗi: ' + (err && err.message ? err.message : String(err)));
        } finally {
            loadBtn.disabled = false;
        }
    }

    function parseSpeakingText(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const questions = [];

        for (const line of lines) {
            // Parse format: "1.  你现在在哪个城市生活？ Nǐ xiànzài zài nǎge chéngshì shēnghuó? "
            // Hoặc: "76.  在路上，碰到一个很久没见的朋友，你会过来跟他打招呼吗？ Zài lùshàng, pèngdào yīgè hěnjiǔ méi jiàn de péngyǒu, nǐ huì guòlái gēn tā dǎzhāohu ma?"

            // Tìm số thứ tự, sau đó là tiếng Hán, cuối cùng là pinyin (có thể có hoặc không có dấu câu cuối)
            const match = line.match(/^\d+\.\s+(.+?)\s+([A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s\?！。，、；：""''（）【】《》]+?)\s*$/);
            if (match) {
                let hanzi = match[1].trim();
                let pinyin = match[2].trim();

                // Làm sạch phần tiếng Hán - chỉ giữ lại ký tự Trung Quốc và dấu câu
                hanzi = hanzi.replace(/[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\d\s\?！。，、；：""''（）【】《》]/g, '');
                hanzi = hanzi.trim();

                // Làm sạch pinyin - giữ lại chữ cái Latin, dấu và dấu câu cuối
                pinyin = pinyin.replace(/[^A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s\?！。，、；：""''（）【】《》]/g, '');
                pinyin = pinyin.trim();

                if (hanzi && pinyin) {
                    questions.push({ hanzi, pinyin });
                    console.log('Parsed:', { hanzi, pinyin }); // Debug log
                }
            } else {
                console.log('Failed to parse line:', line); // Debug log
            }
        }
        return questions;
    }

    function speakText(text) {
        if ('speechSynthesis' in window) {
            // Stop any current speech
            speechSynthesis.cancel();

            // Debug: log text being spoken
            console.log('Speaking text:', text);

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.8;
            utterance.pitch = 1;

            // Try to use Chinese voice if available
            const voices = speechSynthesis.getVoices();
            const chineseVoice = voices.find(voice =>
                voice.lang.startsWith('zh') ||
                voice.name.includes('Chinese') ||
                voice.name.includes('Mandarin')
            );
            if (chineseVoice) {
                utterance.voice = chineseVoice;
                console.log('Using Chinese voice:', chineseVoice.name);
            } else {
                console.log('No Chinese voice found, using default');
            }

            speechSynthesis.speak(utterance);
        } else {
            setStatus('Trình duyệt không hỗ trợ text-to-speech');
        }
    }

    function renderSpeakingQuestion() {
        if (!speakingData.length) return;
        const item = speakingData[speakingIndex];
        if (speakingHanziEl) speakingHanziEl.textContent = item.hanzi;
        if (speakingPinyinEl) speakingPinyinEl.textContent = item.pinyin;
        if (speakingProgressEl) speakingProgressEl.textContent = 'Câu: ' + (speakingIndex + 1);
    }

    function nextSpeakingQuestion() {
        speakingIndex = (speakingIndex + 1) % speakingData.length;
        renderSpeakingQuestion();
    }

    async function loadDataset(filePath) {
        try {
            setStatus('Đang tải dữ liệu...');

            // Check if it's the speaking file
            if (filePath.includes('onhsk3.txt')) {
                const text = await fetchCsv(filePath);
                speakingData = parseSpeakingText(text);
                if (!speakingData.length) {
                    setStatus('Không thể parse file speaking: ' + filePath);
                    return;
                }

                isSpeakingMode = true;
                speakingIndex = 0;
                currentDataset = filePath;

                // Hide quiz mode, show speaking mode
                if (card) card.classList.add('hidden');
                if (speakingCard) speakingCard.classList.remove('hidden');

                setStatus('Đã tải ' + speakingData.length + ' câu nói từ ' + filePath);
                renderSpeakingQuestion();
            } else {
                // Regular CSV quiz mode
                const csvText = await fetchCsv(filePath);
                const rows = parseVietnameseCsv(csvText);
                if (!rows.length) {
                    setStatus('CSV không đúng định dạng: ' + filePath);
                    return;
                }

                data = rows.filter(r => r.hanzi && r.pinyin);
                currentIndex = -1; lastIndex = -1; answered = false; correctCount = 0; questionCount = 0;
                if (scoreEl) scoreEl.textContent = 'Đúng: 0/0';
                currentDataset = filePath;
                isSpeakingMode = false;

                // Hide speaking mode, show quiz mode
                if (speakingCard) speakingCard.classList.add('hidden');
                if (card) card.classList.remove('hidden');

                setStatus('Đã tải ' + data.length + ' mục từ ' + filePath);
                renderQuestion();
            }
        } catch (e) {
            console.error(e);
            setStatus('Không thể tải: ' + filePath);
        }
    }

    // Event listeners
    if (loadBtn) loadBtn.addEventListener('click', loadData);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);

    // Speaking mode event listeners
    if (speakBtn) {
        speakBtn.addEventListener('click', () => {
            if (speakingData.length && speakingData[speakingIndex]) {
                speakText(speakingData[speakingIndex].hanzi);
            }
        });
    }

    if (speakingNextBtn) {
        speakingNextBtn.addEventListener('click', nextSpeakingQuestion);
    }

    // Dataset button listeners
    const datasetBtns = document.querySelectorAll('.dataset-btn');
    datasetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filePath = btn.dataset.file;
            loadDataset(filePath);
        });
    });

    window.addEventListener('keydown', (e) => {
        if (isSpeakingMode) {
            // Speaking mode keyboard shortcuts
            if (e.key === 'Enter' || e.code === 'Space') {
                if (speakingNextBtn) speakingNextBtn.click();
            }
            if (e.key === 's' || e.key === 'S') {
                if (speakBtn) speakBtn.click();
            }
        } else {
            // Quiz mode keyboard shortcuts
            if (!card.classList.contains('hidden') && !answered) {
                if (e.key >= '1' && e.key <= '4') {
                    const idx = Number(e.key) - 1;
                    const btn = optionsEl.querySelectorAll('.option')[idx];
                    if (btn) btn.click();
                }
            }
            if (e.key === 'Enter' || e.code === 'Space') {
                if (!nextBtn.classList.contains('hidden')) nextBtn.click();
            }
        }
    });

    const KEY = 'quiz_hanzi_csv_url';
    try { const saved = localStorage.getItem(KEY); if (saved && sheetUrlInput) sheetUrlInput.value = saved; } catch { }
    if (sheetUrlInput) sheetUrlInput.addEventListener('change', () => { try { localStorage.setItem(KEY, sheetUrlInput.value.trim()); } catch { } });
    try {
        const params = new URLSearchParams(location.search);
        const csvParam = params.get('csv');
        if (csvParam && sheetUrlInput) {
            sheetUrlInput.value = csvParam;
            localStorage.setItem(KEY, csvParam);
            loadData();
        }
    } catch { }
})();