(function () {
    const sheetUrlInput = document.getElementById('sheetUrl');
    const loadBtn = document.getElementById('loadBtn');
    const nextBtn = document.getElementById('nextBtn');
    const loadLocalBtn = document.getElementById('loadLocalBtn');
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

    /** App state */
    let data = [];              // { hanzi, pinyin, meaningVi, exHanzi, exPinyin, exVi }
    let currentIndex = -1;      // index vào mảng data
    let lastIndex = -1;         // để tránh lặp lại ngay
    let answered = false;       // đã trả lời đúng chưa (để sang câu)
    let correctCount = 0;       // số câu đúng
    let questionCount = 0;      // số câu đã hỏi

    function setStatus(msg) { statusEl.textContent = msg; }

    function isLikelyCsvUrl(url) {
        try {
            const u = new URL(url);
            return u.searchParams.get('output') === 'csv' ||
                u.pathname.endsWith('.csv');
        } catch { return false; }
    }

    async function fetchCsv(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Không thể tải CSV: ' + res.status);
        return await res.text();
    }

    function csvParse(text) {
        // Parser hỗ trợ dấu ngoặc kép và dấu phẩy trong ô
        const rows = [];
        let i = 0, field = '', row = [], inQuotes = false;
        const pushField = () => { row.push(field); field = ''; };
        const pushRow = () => { rows.push(row); row = []; };
        while (i < text.length) {
            const ch = text[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
                } else { field += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { pushField(); }
                else if (ch === '\n') { pushField(); pushRow(); }
                else if (ch === '\r') { /* skip */ }
                else { field += ch; }
            }
            i++;
        }
        // cuối file
        if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
        // loại bỏ dòng trống hoàn toàn
        return rows.filter(r => r.some(c => String(c).trim().length));
    }

    function normalizeHeaderName(name) {
        return String(name)
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parseVietnameseCsv(text) {
        const rows = csvParse(text);
        if (!rows.length) return [];
        const header = rows.shift().map(h => normalizeHeaderName(h));
        // Tìm các cột
        const idxWord = header.indexOf('tu moi');
        // 2 cột "phien am": một cho từ, một cho ví dụ
        const phienAmIdxs = header.map((h, idx) => h === 'phien am' ? idx : -1).filter(x => x !== -1);
        const idxExplain = header.indexOf('giai thich');
        const idxExHanzi = header.findIndex(h => h.startsWith('vi du'));
        let idxPinyin = phienAmIdxs.length ? phienAmIdxs[0] : -1;
        let idxExPinyin = -1;
        if (phienAmIdxs.length > 1) {
            // chọn cột "phien am" sau cột ví dụ nếu có
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
        // tránh trùng ngay câu trước nếu có thể
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
        hanziEl.textContent = item.hanzi;
        exampleBox.classList.add('hidden');
        exMeaningEl.textContent = '';
        exHanziEl.textContent = '';
        exPinyinEl.textContent = '';
        exViEl.textContent = '';

        const options = buildOptions(item.pinyin);
        if (options.length < 4) {
            setStatus('Cần ít nhất 4 pinyin khác nhau để tạo đáp án. Hãy bổ sung dữ liệu.');
            card.classList.add('hidden');
            nextBtn.classList.add('hidden');
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

        progressEl.textContent = 'Câu: ' + (questionCount + 1);
        setStatus('Chọn pinyin đúng cho chữ: ' + item.hanzi);
        nextBtn.classList.remove('hidden');
        card.classList.remove('hidden');
    }

    function handleAnswer(buttonEl, item) {
        if (answered) return;
        const chosen = buttonEl.dataset.value;
        const isCorrect = chosen === item.pinyin;
        if (!isCorrect) {
            // Sai: đánh dấu nút sai và vô hiệu hóa riêng nút đó, cho chọn lại
            buttonEl.classList.add('wrong');
            buttonEl.disabled = true;
            return;
        }

        // Đúng: khóa tất cả, đánh dấu đúng và hiển thị ví dụ
        answered = true;
        const all = optionsEl.querySelectorAll('.option');
        all.forEach(b => {
            b.disabled = true;
            if (b.dataset.value === item.pinyin) b.classList.add('correct');
        });

        questionCount += 1;
        correctCount += 1;
        scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
        lastIndex = currentIndex;

        // Hiển thị ví dụ nếu có
        exMeaningEl.textContent = item.meaningVi || '—';
        exHanziEl.textContent = item.exHanzi || '—';
        exPinyinEl.textContent = item.exPinyin || '—';
        exViEl.textContent = item.exVi || '—';
        exampleBox.classList.remove('hidden');

        nextBtn.classList.remove('hidden');
    }

    function nextQuestion() {
        renderQuestion();
    }

    async function loadData() {
        const url = sheetUrlInput.value.trim();
        if (!url) { setStatus('Không có link. Hãy bấm "Tải CSV nội bộ" hoặc dán link.'); return; }
        if (!isLikelyCsvUrl(url)) { setStatus('Link chưa đúng định dạng CSV (hãy Publish to the web và chọn CSV).'); }
        setStatus('Đang tải dữ liệu...');
        loadBtn.disabled = true;
        try {
            const csvText = await fetchCsv(url);
            // Thử parse theo định dạng tiếng Việt trước, nếu rỗng thì thử hanzi/pinyin chuẩn
            let rows = parseVietnameseCsv(csvText);
            if (!rows.length) {
                rows = [];
                // Fallback: hanzi,pinyin
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
            // reset state
            currentIndex = -1; lastIndex = -1; answered = false; correctCount = 0; questionCount = 0;
            scoreEl.textContent = 'Đúng: 0/0';
            nextBtn.classList.remove('hidden');
            setStatus('Đã tải ' + data.length + ' mục. Bắt đầu làm quiz!');
            renderQuestion();
        } catch (err) {
            console.error(err);
            setStatus('Lỗi: ' + (err && err.message ? err.message : String(err)));
        } finally {
            loadBtn.disabled = false;
        }
    }

    async function loadLocal() {
        try {
            setStatus('Đang tải CSV nội bộ...');
            const csvText = await fetchCsv('từ mới 1_3 - Trang tính1 (1).csv');
            const rows = parseVietnameseCsv(csvText);
            if (!rows.length) { setStatus('CSV nội bộ không đúng định dạng.'); return; }
            data = rows.filter(r => r.hanzi && r.pinyin);
            currentIndex = -1; lastIndex = -1; answered = false; correctCount = 0; questionCount = 0;
            scoreEl.textContent = 'Đúng: 0/0';
            nextBtn.classList.add('hidden');
            setStatus('Đã tải CSV nội bộ (' + data.length + ' mục).');
            renderQuestion();
        } catch (e) {
            console.error(e);
            setStatus('Không thể tải CSV nội bộ.');
        }
    }

    loadBtn.addEventListener('click', loadData);
    loadLocalBtn.addEventListener('click', loadLocal);
    nextBtn.addEventListener('click', nextQuestion);
    window.addEventListener('keydown', (e) => {
        // chọn đáp án bằng phím 1-4
        if (!card.classList.contains('hidden') && !answered) {
            if (e.key >= '1' && e.key <= '4') {
                const idx = Number(e.key) - 1;
                const btn = optionsEl.querySelectorAll('.option')[idx];
                if (btn) btn.click();
            }
        }
        // sang câu tiếp
        if (e.key === 'Enter' || e.code === 'Space') {
            if (!nextBtn.classList.contains('hidden')) nextBtn.click();
        }
    });

    // Lưu/khôi phục URL gần nhất từ localStorage cho tiện
    const KEY = 'quiz_hanzi_csv_url';
    try { const saved = localStorage.getItem(KEY); if (saved) sheetUrlInput.value = saved; } catch { }
    sheetUrlInput.addEventListener('change', () => { try { localStorage.setItem(KEY, sheetUrlInput.value.trim()); } catch { } });
    // Auto load qua ?csv=...
    try {
        const params = new URLSearchParams(location.search);
        const csvParam = params.get('csv');
        if (csvParam) {
            sheetUrlInput.value = csvParam;
            localStorage.setItem(KEY, csvParam);
            loadData();
        }
    } catch { }
})();