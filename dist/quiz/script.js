// Quiz logic for vocabulary practice - Enhanced version with 3 modes + AI Grammar Check
console.log('Quiz script loaded successfully - v2025-AI');

(function () {
    // ============================================
    // AI GRAMMAR CHECK - Google Gemini Integration
    // ============================================
    
    // Danh sách models để thử (ưu tiên từ trên xuống) - Từ API list 2025
    // Thử Gemma trước (có thể có quota riêng), sau đó Gemini
    const GEMINI_MODELS = [
        'gemma-3-4b-it',              // Gemma nhẹ, có thể quota riêng
        'gemma-3-1b-it',              // Gemma siêu nhẹ
        'gemini-2.0-flash',           // Ổn định, không thinking
        'gemini-2.0-flash-001',       // Ổn định, không thinking  
        'gemini-2.0-flash-exp',       // Experimental, không thinking
    ];
    
    // Lưu model đang dùng và trạng thái rate limit
    let currentAIModel = null;
    let rateLimitUntil = 0;
    
    async function callGeminiAPI(prompt) {
        if (!isAIConfigured()) {
            console.log('AI not configured, skipping AI check');
            return null;
        }
        
        // Kiểm tra rate limit
        const now = Date.now();
        if (rateLimitUntil > now) {
            const waitSec = Math.ceil((rateLimitUntil - now) / 1000);
            console.warn(`⏳ Rate limited. Chờ ${waitSec}s...`);
            return { rateLimited: true, waitSeconds: waitSec };
        }
        
        const apiKey = AI_CONFIG.GEMINI_API_KEY;
        const models = AI_CONFIG.MODEL ? [AI_CONFIG.MODEL, ...GEMINI_MODELS] : GEMINI_MODELS;
        
        for (const model of models) {
            try {
                console.log(`🔄 Trying model: ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT || 15000);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 1024,
                            candidateCount: 1
                        }
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMsg = errorData.error?.message || 'Unknown error';
                    
                    // Xử lý rate limit (429)
                    if (response.status === 429) {
                        // Trích xuất thời gian chờ từ error message
                        const waitMatch = errorMsg.match(/retry in (\d+)/i);
                        const waitSec = waitMatch ? parseInt(waitMatch[1]) + 5 : 65;
                        rateLimitUntil = Date.now() + (waitSec * 1000);
                        console.warn(`⏳ Rate limit hit. Chờ ${waitSec}s trước khi thử lại.`);
                        return { rateLimited: true, waitSeconds: waitSec };
                    }
                    
                    console.warn(`❌ Model ${model} failed:`, errorMsg);
                    continue; // Thử model tiếp theo
                }
                
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`✅ Success with model: ${model}`);
                currentAIModel = model; // Lưu model thành công
                return text.trim();
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.error('⏰ AI request timeout');
                    return null;
                }
                console.warn(`❌ Model ${model} error:`, error.message);
                continue; // Thử model tiếp theo
            }
        }
        
        console.error('❌ All AI models failed');
        return null;
    }
    
    async function checkChineseGrammarWithAI(userAnswer, correctAnswer, vietnameseMeaning, word) {
        console.log('🔍 AI Check Request:', { userAnswer, correctAnswer, vietnameseMeaning, word });
        
        const prompt = `Bạn là giáo viên tiếng Trung. Kiểm tra câu tiếng Trung của học sinh.

Từ vựng đang học: ${word}
Nghĩa tiếng Việt cần dịch: ${vietnameseMeaning}
Đáp án mẫu: ${correctAnswer}
Học sinh viết: ${userAnswer}

Yêu cầu:
1. Kiểm tra câu của học sinh có ĐÚNG NGỮ PHÁP tiếng Trung không
2. Kiểm tra câu có ĐÚNG NGHĨA với câu tiếng Việt không
3. Không cần giống y hệt đáp án mẫu, chỉ cần đúng ngữ pháp và nghĩa

Trả lời theo format JSON (CHỈ trả về JSON, không giải thích thêm):
{"correct": true/false, "explanation": "giải thích ngắn gọn bằng tiếng Việt"}`;

        const response = await callGeminiAPI(prompt);
        
        console.log('📥 AI Raw Response:', response);
        console.log('📥 Response length:', response?.length || 0);
        console.log('📥 Full response text:', JSON.stringify(response));
        
        if (!response) {
            return { correct: false, explanation: 'Không thể kết nối AI. Vui lòng kiểm tra API key.', aiError: true };
        }
        
        // Xử lý rate limit
        if (response.rateLimited) {
            return { 
                correct: false, 
                explanation: `⏳ API bị giới hạn. Vui lòng chờ ${response.waitSeconds} giây rồi thử lại.`, 
                aiError: true,
                rateLimited: true
            };
        }
        
        try {
            // Remove markdown code blocks if present (```json ... ```)
            let cleanResponse = response;
            if (response.includes('```')) {
                cleanResponse = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                console.log('🧹 Cleaned response:', cleanResponse);
                console.log('🧹 Cleaned length:', cleanResponse.length);
            }
            
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            console.log('🔎 JSON match found:', !!jsonMatch);
            
            if (jsonMatch) {
                console.log('📋 Extracted JSON:', jsonMatch[0]);
                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ Parsed Result:', result);
                console.log('✅ Correct:', result.correct);
                console.log('✅ Explanation:', result.explanation);
                return {
                    correct: result.correct === true,
                    explanation: result.explanation || '',
                    aiError: false
                };
            } else {
                console.warn('⚠️ No JSON found in response');
            }
        } catch (e) {
            console.error('❌ Failed to parse AI response:', response, e);
        }
        
        // Fallback: try to detect if response contains positive indicators
        const isPositive = response.includes('đúng') || response.includes('correct') || response.includes('true');
        return {
            correct: isPositive,
            explanation: response.substring(0, 100),
            aiError: false
        };
    }
    
    // ============================================
    // DOM Elements - Basic
    // ============================================
    const nextBtn = document.getElementById('nextBtn');
    const statusEl = document.getElementById('status');
    const card = document.getElementById('card');
    const hanziEl = document.getElementById('hanzi');
    const meaningHintEl = document.getElementById('meaning-hint');
    const optionsEl = document.getElementById('options');
    const progressEl = document.getElementById('progress');
    const scoreEl = document.getElementById('score');
    const exampleBox = document.getElementById('example');
    const exHanziAnswerEl = document.getElementById('exHanziAnswer');
    const exPinyinAnswerEl = document.getElementById('exPinyinAnswer');
    const exMeaningEl = document.getElementById('exMeaning');
    const exHanziEl = document.getElementById('exHanzi');
    const exPinyinEl = document.getElementById('exPinyin');
    const exViEl = document.getElementById('exVi');
    const modeSection = document.getElementById('mode-section');
    const tipsText = document.getElementById('tips-text');
    const feedbackEl = document.getElementById('feedback');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackText = document.getElementById('feedback-text');

    // DOM Elements - Easy mode input
    const inputArea = document.getElementById('input-area');
    const answerInput = document.getElementById('answer-input');
    const submitBtn = document.getElementById('submit-btn');
    const hintBtn = document.getElementById('hint-btn');
    const hintText = document.getElementById('hint-text');

    // DOM Elements - Hard mode inputs
    const hardInputArea = document.getElementById('hard-input-area');
    const hanziInput = document.getElementById('hanzi-input');
    const hanziInputStatus = document.getElementById('hanzi-input-status');
    const hanziMeaningHint = document.getElementById('hanzi-meaning-hint');
    const hintBtnHanzi = document.getElementById('hint-btn-hanzi');
    const hintTextHanzi = document.getElementById('hint-text-hanzi');
    const sentencePrompt = document.getElementById('sentence-prompt');
    const sentenceInput = document.getElementById('sentence-input');
    const sentenceStatus = document.getElementById('sentence-status');
    const hintBtnSentence = document.getElementById('hint-btn-sentence');
    const hintTextSentence = document.getElementById('hint-text-sentence');
    const submitHardBtn = document.getElementById('submit-hard-btn');

    // State variables
    let data = [];
    let currentIndex = -1;
    let lastIndex = -1;
    let answered = false;
    let correctCount = 0;
    let questionCount = 0;
    let currentDataset = '';
    let currentMode = 'quiz';
    let hintLevel = 0;
    let hintLevelHanzi = 0;
    let hintLevelSentence = 0;
    let attempts = 0;
    let hanziPartCorrect = false;
    let sentenceCorrect = false;

    // Tips text for each mode
    const tipsByMode = {
        quiz: '1–4 để chọn đáp án; Enter/Space để sang câu tiếp.',
        easy: 'Nhập pinyin (không dấu cũng được); Enter kiểm tra; Tab gợi ý.',
        hard: isAIConfigured() 
            ? '🤖 AI sẽ kiểm tra ngữ pháp! Không cần viết chính xác từng chữ.'
            : 'Phần 1: Viết Hán tự. Phần 2: Dịch câu sang tiếng Trung. (Thêm API key để AI check)'
    };

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
        if (/^https?:\/\//i.test(inputPath)) return inputPath;
        if (inputPath.startsWith('../')) return inputPath;
        
        const normalized = (inputPath || '').replace(/^\/+/, '');
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/WEBBN/dist/quiz/')) {
            return '/WEBBN/dist/' + normalized;
        } else if (currentPath.match(/^\/quiz\//)) {
            return '/' + normalized;
        } else {
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
                    if (text[i + 1] === '"') { field += '"'; i++; } 
                    else { inQuotes = false; } 
                } else { field += ch; }
            } else {
                if (ch === '"') { inQuotes = true; } 
                else if (ch === ',') { pushField(); } 
                else if (ch === '\n') { pushField(); pushRow(); } 
                else if (ch !== '\r') { field += ch; }
            }
            i++;
        }
        if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
        return rows.filter(r => r.some(c => String(c).trim().length));
    }

    function normalizeHeaderName(name) {
        return String(name).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ').trim();
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

    function normalizePinyin(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z]/g, '');
    }

    function normalizeHanzi(str) {
        return str.replace(/[。！？，、；：""''（）【】《》\s\.!\?,]/g, '');
    }

    function checkPinyinAnswer(userInput, correctAnswer) {
        return normalizePinyin(userInput.trim()) === normalizePinyin(correctAnswer.trim());
    }

    function checkHanziAnswer(userInput, correctAnswer) {
        return normalizeHanzi(userInput.trim()) === normalizeHanzi(correctAnswer.trim());
    }

    function generatePinyinHint(answer, level) {
        const normalized = answer.toLowerCase();
        if (level === 1) return `Bắt đầu: "${normalized.charAt(0)}..."`;
        if (level === 2) {
            const half = Math.ceil(normalized.length / 2);
            return `${normalized.substring(0, half)}...`;
        }
        return `Đáp án: ${answer}`;
    }

    function generateSentenceHint(item, level) {
        const answer = item.exHanzi || item.hanzi;
        if (level === 1) return `Pinyin: ${item.exPinyin || '—'}`;
        if (level === 2 && answer.length > 2) {
            const third = Math.ceil(answer.length / 3);
            return `Bắt đầu: ${answer.substring(0, third)}...`;
        }
        return `Đáp án: ${answer}`;
    }

    function resetQuestionState() {
        answered = false;
        hintLevel = 0;
        hintLevelHanzi = 0;
        hintLevelSentence = 0;
        attempts = 0;
        hanziPartCorrect = false;
        sentenceCorrect = false;
        
        // Reset Easy mode UI
        if (hintText) { hintText.classList.add('hidden'); hintText.textContent = ''; }
        if (hintBtn) { hintBtn.disabled = false; hintBtn.textContent = '💡 Gợi ý'; }
        if (feedbackEl) feedbackEl.classList.add('hidden');
        if (answerInput) {
            answerInput.value = '';
            answerInput.classList.remove('correct', 'wrong');
            answerInput.disabled = false;
        }
        if (submitBtn) submitBtn.disabled = false;
        
        // Reset Hard mode UI - Part 1 (Hanzi)
        if (hanziInput) {
            hanziInput.value = '';
            hanziInput.classList.remove('correct', 'wrong');
            hanziInput.disabled = false;
        }
        if (hanziInputStatus) { hanziInputStatus.textContent = ''; hanziInputStatus.className = 'input-status'; }
        if (hintTextHanzi) { hintTextHanzi.classList.add('hidden'); hintTextHanzi.textContent = ''; }
        if (hintBtnHanzi) { hintBtnHanzi.disabled = false; hintBtnHanzi.textContent = '💡 Gợi ý'; }
        
        // Reset Hard mode UI - Part 2 (Sentence)
        if (sentenceInput) {
            sentenceInput.value = '';
            sentenceInput.classList.remove('correct', 'wrong');
            sentenceInput.disabled = false;
        }
        if (sentenceStatus) { sentenceStatus.textContent = ''; sentenceStatus.className = 'input-status'; }
        if (hintTextSentence) { hintTextSentence.classList.add('hidden'); hintTextSentence.textContent = ''; }
        if (hintBtnSentence) { hintBtnSentence.disabled = false; hintBtnSentence.textContent = '💡 Gợi ý'; }
        
        if (submitHardBtn) submitHardBtn.disabled = false;
        if (exampleBox) exampleBox.classList.add('hidden');
        
        // Reset AI feedback
        const aiFeedbackEl = document.getElementById('ai-feedback');
        if (aiFeedbackEl) {
            aiFeedbackEl.classList.add('hidden');
            aiFeedbackEl.innerHTML = '';
        }
    }

    function renderQuestion() {
        if (!data.length) return;
        
        currentIndex = pickNextIndex();
        if (currentIndex < 0) return;
        
        resetQuestionState();
        const item = data[currentIndex];
        
        // Hide all input areas first
        if (optionsEl) optionsEl.classList.add('hidden');
        if (inputArea) inputArea.classList.add('hidden');
        if (hardInputArea) hardInputArea.classList.add('hidden');
        if (meaningHintEl) meaningHintEl.classList.add('hidden');
        
        if (currentMode === 'quiz') {
            // Quiz mode: Multiple choice
            if (hanziEl) {
                hanziEl.textContent = item.hanzi;
                hanziEl.className = 'hanzi';
            }
            if (optionsEl) optionsEl.classList.remove('hidden');
            
            const options = buildOptions(item.pinyin);
            if (options.length < 4) {
                setStatus('Cần ít nhất 4 pinyin khác nhau.');
                if (card) card.classList.add('hidden');
                return;
            }
            
            optionsEl.innerHTML = '';
            for (let i = 0; i < options.length; i++) {
                const btn = document.createElement('button');
                btn.className = 'option';
                btn.textContent = options[i];
                btn.dataset.value = options[i];
                btn.addEventListener('click', () => handleQuizAnswer(btn, item));
                optionsEl.appendChild(btn);
            }
            setStatus('Chọn pinyin đúng cho: ' + item.hanzi);
            
        } else if (currentMode === 'easy') {
            // Easy mode: Type pinyin
            if (hanziEl) {
                hanziEl.textContent = item.hanzi;
                hanziEl.className = 'hanzi';
            }
            if (inputArea) inputArea.classList.remove('hidden');
            if (answerInput) {
                answerInput.placeholder = 'Nhập pinyin...';
                setTimeout(() => answerInput.focus(), 100);
            }
            setStatus('Nhập pinyin cho: ' + item.hanzi);
            
        } else if (currentMode === 'hard') {
            // Hard mode: 2 inputs
            // Part 1: Show Hanzi, user writes same Hanzi (practice writing)
            if (hanziEl) {
                hanziEl.textContent = item.hanzi;
                hanziEl.className = 'hanzi';
            }
            if (hanziMeaningHint) {
                hanziMeaningHint.textContent = item.meaningVi ? `(${item.meaningVi})` : '';
            }
            // Part 2: Show Vietnamese sentence, user writes Chinese sentence
            if (hardInputArea) hardInputArea.classList.remove('hidden');
            if (sentencePrompt) {
                sentencePrompt.textContent = item.exVi || '—';
            }
            setTimeout(() => { if (hanziInput) hanziInput.focus(); }, 100);
            setStatus('Hoàn thành cả 2 phần');
        }

        if (progressEl) progressEl.textContent = 'Câu: ' + (questionCount + 1);
        if (nextBtn) nextBtn.classList.add('hidden');
        if (card) card.classList.remove('hidden');
    }

    function handleQuizAnswer(buttonEl, item) {
        if (answered) return;
        
        const chosen = buttonEl.dataset.value;
        const isCorrect = chosen === item.pinyin;

        buttonEl.classList.add('loading');
        setTimeout(() => {
            buttonEl.classList.remove('loading');
            if (!isCorrect) {
                buttonEl.classList.add('wrong');
                buttonEl.disabled = true;
                attempts++;
                setStatus(`Sai! Thử lại. (${attempts} lần)`);
                return;
            }
            
            answered = true;
            optionsEl?.querySelectorAll('.option').forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.value === item.pinyin) btn.classList.add('correct');
            });
            
            questionCount++;
            correctCount++;
            if (scoreEl) scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
            lastIndex = currentIndex;
            showExampleInfo(item);
            if (nextBtn) { nextBtn.classList.remove('hidden'); nextBtn.focus(); }
            setStatus(`Chính xác! Điểm: ${correctCount}/${questionCount}`);
        }, 200);
    }

    function handleEasyAnswer() {
        if (answered || !answerInput) return;
        
        const item = data[currentIndex];
        const userAnswer = answerInput.value.trim();
        
        if (!userAnswer) { setStatus('Vui lòng nhập pinyin!'); return; }
        
        if (checkPinyinAnswer(userAnswer, item.pinyin)) {
            answered = true;
            answerInput.classList.add('correct');
            answerInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            
            if (feedbackEl) {
                feedbackIcon.textContent = '✅';
                feedbackText.textContent = 'Chính xác!';
                feedbackEl.className = 'feedback correct';
                feedbackEl.classList.remove('hidden');
            }
            
            questionCount++;
            correctCount++;
            if (scoreEl) scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
            lastIndex = currentIndex;
            showExampleInfo(item);
            if (nextBtn) { nextBtn.classList.remove('hidden'); nextBtn.focus(); }
            setStatus(`Chính xác! Điểm: ${correctCount}/${questionCount}`);
        } else {
            attempts++;
            answerInput.classList.add('wrong');
            if (feedbackEl) {
                feedbackIcon.textContent = '❌';
                feedbackText.textContent = `Sai! (${attempts} lần)`;
                feedbackEl.className = 'feedback wrong';
                feedbackEl.classList.remove('hidden');
            }
            setStatus('Sai! Thử lại hoặc bấm Gợi ý.');
            setTimeout(() => { answerInput.classList.remove('wrong'); answerInput.select(); }, 500);
        }
    }

    // Track if AI is currently checking
    let aiCheckingInProgress = false;
    
    async function handleHardAnswer() {
        if (answered || aiCheckingInProgress) return;
        
        const item = data[currentIndex];
        const hanziAnswer = hanziInput?.value.trim() || '';
        const sentenceAnswer = sentenceInput?.value.trim() || '';
        
        // Check Hanzi (Part 1)
        if (!hanziPartCorrect) {
            if (!hanziAnswer) {
                setStatus('Vui lòng viết Hán tự!');
                hanziInput?.focus();
                return;
            }
            if (checkHanziAnswer(hanziAnswer, item.hanzi)) {
                hanziPartCorrect = true;
                if (hanziInput) hanziInput.classList.add('correct');
                if (hanziInputStatus) { hanziInputStatus.textContent = '✅'; hanziInputStatus.className = 'input-status correct'; }
            } else {
                if (hanziInput) hanziInput.classList.add('wrong');
                if (hanziInputStatus) { hanziInputStatus.textContent = '❌'; hanziInputStatus.className = 'input-status wrong'; }
                setTimeout(() => { hanziInput?.classList.remove('wrong'); }, 500);
                setStatus('Hán tự sai! Thử lại.');
                return;
            }
        }
        
        // Check sentence (Part 2) - WITH AI SUPPORT
        if (!sentenceCorrect) {
            if (!sentenceAnswer) {
                setStatus('Vui lòng nhập câu tiếng Trung!');
                sentenceInput?.focus();
                return;
            }
            
            const correctSentence = item.exHanzi || item.hanzi;
            
            // BƯỚC 1: So sánh chính xác trước (Hybrid - step 1)
            if (checkHanziAnswer(sentenceAnswer, correctSentence)) {
                sentenceCorrect = true;
                if (sentenceInput) sentenceInput.classList.add('correct');
                if (sentenceStatus) { sentenceStatus.textContent = '✅'; sentenceStatus.className = 'input-status correct'; }
                showAIFeedback(true, 'Chính xác! Câu trả lời khớp hoàn toàn.');
            } else {
                // BƯỚC 2: Không khớp → Gọi AI kiểm tra ngữ pháp (Hybrid - step 2)
                if (isAIConfigured()) {
                    aiCheckingInProgress = true;
                    setStatus('🤖 AI đang kiểm tra ngữ pháp...');
                    if (submitHardBtn) {
                        submitHardBtn.disabled = true;
                        submitHardBtn.textContent = '🔄 Đang kiểm tra...';
                    }
                    
                    try {
                        const vietnameseMeaning = item.exVi || item.meaningVi || '';
                        const aiResult = await checkChineseGrammarWithAI(
                            sentenceAnswer,
                            correctSentence,
                            vietnameseMeaning,
                            item.hanzi
                        );
                        
                        if (aiResult.correct) {
                            // AI xác nhận đúng ngữ pháp!
                            sentenceCorrect = true;
                            if (sentenceInput) sentenceInput.classList.add('correct');
                            if (sentenceStatus) { sentenceStatus.textContent = '✅'; sentenceStatus.className = 'input-status correct'; }
                            showAIFeedback(true, aiResult.explanation || 'AI xác nhận: Câu đúng ngữ pháp!');
                        } else {
                            // AI xác nhận sai
                            if (sentenceInput) sentenceInput.classList.add('wrong');
                            if (sentenceStatus) { sentenceStatus.textContent = '❌'; sentenceStatus.className = 'input-status wrong'; }
                            setTimeout(() => { sentenceInput?.classList.remove('wrong'); }, 500);
                            
                            if (aiResult.aiError) {
                                showAIFeedback(false, '⚠️ ' + aiResult.explanation);
                                setStatus('Không khớp đáp án. Kiểm tra API key để dùng AI.');
                            } else {
                                showAIFeedback(false, aiResult.explanation || 'Câu chưa đúng ngữ pháp hoặc nghĩa.');
                                setStatus('AI: Câu chưa đúng! Thử lại.');
                            }
                        }
                    } catch (error) {
                        console.error('AI check failed:', error);
                        if (sentenceInput) sentenceInput.classList.add('wrong');
                        setTimeout(() => { sentenceInput?.classList.remove('wrong'); }, 500);
                        setStatus('Lỗi khi gọi AI. Thử lại.');
                    } finally {
                        aiCheckingInProgress = false;
                        if (submitHardBtn) {
                            submitHardBtn.disabled = false;
                            submitHardBtn.textContent = 'Kiểm tra cả hai';
                        }
                    }
                } else {
                    // AI không được cấu hình → so sánh chính xác như cũ
                    if (sentenceInput) sentenceInput.classList.add('wrong');
                    if (sentenceStatus) { sentenceStatus.textContent = '❌'; sentenceStatus.className = 'input-status wrong'; }
                    setTimeout(() => { sentenceInput?.classList.remove('wrong'); }, 500);
                    setStatus('Câu tiếng Trung sai! Thử lại. (Cấu hình AI để kiểm tra ngữ pháp)');
                    return;
                }
            }
            
            if (!sentenceCorrect) return;
        }
        
        // Both correct!
        if (hanziPartCorrect && sentenceCorrect) {
            answered = true;
            if (hanziInput) hanziInput.disabled = true;
            if (sentenceInput) sentenceInput.disabled = true;
            if (submitHardBtn) submitHardBtn.disabled = true;
            
            questionCount++;
            correctCount++;
            if (scoreEl) scoreEl.textContent = 'Đúng: ' + correctCount + '/' + questionCount;
            lastIndex = currentIndex;
            showExampleInfo(item);
            if (nextBtn) { nextBtn.classList.remove('hidden'); nextBtn.focus(); }
            setStatus(`Xuất sắc! Điểm: ${correctCount}/${questionCount}`);
        }
    }
    
    // Hiển thị feedback từ AI
    function showAIFeedback(isCorrect, message) {
        const aiFeedbackEl = document.getElementById('ai-feedback');
        if (aiFeedbackEl) {
            aiFeedbackEl.classList.remove('hidden', 'correct', 'wrong');
            aiFeedbackEl.classList.add(isCorrect ? 'correct' : 'wrong');
            
            const icon = isCorrect ? '🤖✅' : '🤖❌';
            const modelInfo = currentAIModel ? `<span class="ai-model">[${currentAIModel}]</span>` : '';
            aiFeedbackEl.innerHTML = `<span class="ai-icon">${icon}</span><span class="ai-message">${message}</span>${modelInfo}`;
        }
    }

    function showHintEasy() {
        if (answered) return;
        const item = data[currentIndex];
        hintLevel++;
        const hint = generatePinyinHint(item.pinyin, hintLevel);
        if (hintText) { hintText.textContent = hint; hintText.classList.remove('hidden'); }
        if (hintBtn) {
            if (hintLevel >= 3) { hintBtn.textContent = '💡 Đã hiện'; hintBtn.disabled = true; }
            else { hintBtn.textContent = `💡 Gợi ý (${hintLevel}/3)`; }
        }
    }

    function generateHanziHint(item, level) {
        const answer = item.hanzi;
        if (level === 1) {
            // Show first character if multi-character word
            if (answer.length > 1) return `Chữ đầu: ${answer.charAt(0)}...`;
            return `Số nét: khoảng ${answer.length * 8} nét`;
        }
        if (level === 2 && answer.length > 1) {
            const half = Math.ceil(answer.length / 2);
            return `${answer.substring(0, half)}...`;
        }
        return `Đáp án: ${answer}`;
    }

    function showHintHanzi() {
        if (hanziPartCorrect) return;
        const item = data[currentIndex];
        // Show pinyin immediately
        if (hintTextHanzi) { 
            hintTextHanzi.textContent = `Pinyin: ${item.pinyin}`; 
            hintTextHanzi.classList.remove('hidden'); 
        }
        if (hintBtnHanzi) { 
            hintBtnHanzi.textContent = '💡 Đã hiện'; 
            hintBtnHanzi.disabled = true; 
        }
    }

    function showHintSentence() {
        if (sentenceCorrect) return;
        const item = data[currentIndex];
        hintLevelSentence++;
        const hint = generateSentenceHint(item, hintLevelSentence);
        if (hintTextSentence) { hintTextSentence.textContent = hint; hintTextSentence.classList.remove('hidden'); }
        if (hintBtnSentence) {
            if (hintLevelSentence >= 3) { hintBtnSentence.textContent = '💡 Đã hiện'; hintBtnSentence.disabled = true; }
            else { hintBtnSentence.textContent = `💡 (${hintLevelSentence}/3)`; }
        }
    }

    function showExampleInfo(item) {
        if (exHanziAnswerEl) exHanziAnswerEl.textContent = item.hanzi || '—';
        if (exPinyinAnswerEl) exPinyinAnswerEl.textContent = item.pinyin || '—';
        if (exMeaningEl) exMeaningEl.textContent = item.meaningVi || '—';
        if (exHanziEl) exHanziEl.textContent = item.exHanzi || '—';
        if (exPinyinEl) exPinyinEl.textContent = item.exPinyin || '—';
        if (exViEl) exViEl.textContent = item.exVi || '—';
        if (exampleBox) exampleBox.classList.remove('hidden');
    }

    function nextQuestion() { 
        renderQuestion();
        // Scroll to hanzi element
        if (hanziEl) {
            hanziEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function switchMode(mode) {
        currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        if (tipsText) tipsText.textContent = tipsByMode[mode] || tipsByMode.quiz;
        
        if (data.length > 0) {
            correctCount = 0;
            questionCount = 0;
            if (scoreEl) scoreEl.textContent = 'Đúng: 0/0';
            renderQuestion();
        }
    }

    async function loadDataset(file) {
        try {
            setStatus('Đang tải...');
            const resolvedPath = resolveDatasetPath(file);
            const text = await fetchCsv(resolvedPath);
            data = parseVietnameseCsv(text);
            
            if (data.length === 0) throw new Error('Không có dữ liệu');
            
            currentDataset = file;
            correctCount = 0;
            questionCount = 0;
            currentIndex = -1;
            lastIndex = -1;
            
            if (modeSection) modeSection.classList.remove('hidden');
            if (scoreEl) scoreEl.textContent = 'Đúng: 0/0';
            
            renderQuestion();
            setStatus(`Đã tải ${data.length} từ. Bắt đầu!`);
        } catch (error) {
            setStatus('Lỗi: ' + error.message);
            if (card) card.classList.add('hidden');
        }
    }

    function setupEventListeners() {
        // Dataset buttons
        document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const file = btn.dataset.file;
                if (file) {
                    document.querySelectorAll('.dataset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    loadDataset(file);
                }
            });
        });

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode) switchMode(mode);
            });
        });

        // Next button
        if (nextBtn) nextBtn.addEventListener('click', nextQuestion);

        // Easy mode
        if (submitBtn) submitBtn.addEventListener('click', handleEasyAnswer);
        if (hintBtn) hintBtn.addEventListener('click', showHintEasy);
        if (answerInput) {
            answerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); answered ? nextQuestion() : handleEasyAnswer(); }
                else if (e.key === 'Tab' && !answered) { e.preventDefault(); showHintEasy(); }
            });
        }

        // Hard mode
        if (submitHardBtn) submitHardBtn.addEventListener('click', handleHardAnswer);
        if (hintBtnHanzi) hintBtnHanzi.addEventListener('click', showHintHanzi);
        if (hintBtnSentence) hintBtnSentence.addEventListener('click', showHintSentence);
        
        if (hanziInput) {
            hanziInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleHardAnswer(); }
                else if (e.key === 'Tab' && !hanziPartCorrect) { e.preventDefault(); showHintHanzi(); }
            });
        }
        if (sentenceInput) {
            sentenceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleHardAnswer(); }
                else if (e.key === 'Tab' && !sentenceCorrect) { e.preventDefault(); showHintSentence(); }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            const key = e.key.toLowerCase();
            
            if (currentMode === 'quiz' && ['1', '2', '3', '4'].includes(key)) {
                const idx = parseInt(key) - 1;
                const options = optionsEl?.querySelectorAll('.option');
                if (options?.[idx] && !options[idx].disabled) {
                    options[idx].click();
                    e.preventDefault();
                }
            }
            
            if ((key === 'enter' || key === ' ') && answered) {
                nextQuestion();
                e.preventDefault();
            }
        });
    }

    function updateAIStatusUI() {
        const btn = document.getElementById('ai-config-btn');
        const icon = document.getElementById('ai-status-icon');
        const text = document.getElementById('ai-status-text');
        
        if (btn && icon && text) {
            if (isAIConfigured()) {
                btn.className = 'ai-config-btn active';
                icon.textContent = '🤖✅';
                text.textContent = 'AI đã bật';
            } else {
                btn.className = 'ai-config-btn inactive';
                icon.textContent = '🤖❌';
                text.textContent = 'Cấu hình AI';
            }
        }
    }
    
    function init() {
        setupEventListeners();
        updateAIStatusUI();
        setStatus('Chọn một bộ từ để bắt đầu.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.quizDebug = { loadDataset, data: () => data, switchMode, renderQuestion };
})();
