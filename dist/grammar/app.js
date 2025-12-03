// Enhanced renderer: nicer visuals, search, formatted examples
(function(){
  const files = {
    hsk1: { url: '../data/nguphaphsk1.txt', label: 'PHẦN' },
    hsk2: { url: '../data/nguphaphsk2.txt', label: 'Bài' },
    hsk3: { url: '../data/nguphaphsk3.txt', label: 'BÀI' }
  };
  const txtUrl = files.hsk2.url;
  const sectionsEl = document.getElementById('sections');
  const textView = document.getElementById('text-view');
  const flashView = document.getElementById('flashcard-view');
  const btnToggle = document.getElementById('btn-toggle-view');
  const searchInput = document.getElementById('search');

  let cards = [];
  let cardIndex = 0;
  let sections = [];

  function loadFile(fileKey) {
    const selectedFile = files[fileKey];
    if (selectedFile) {
      fetch(selectedFile.url).then(r => r.text()).then(text => {
        sections = parseSections(text, selectedFile.label);
        renderSectionsList(sections);
        renderAllSections(sections);
        cards = extractCards(text);
        updateCard();
      }).catch(err => {
        textView.innerText = 'Không thể tải dữ liệu: ' + err.message;
      });
    }
  }

  // Load initial file (HSK1)
  loadFile('hsk1');

  // File selector change
  document.getElementById('file-selector').addEventListener('change', (e) => {
    const fileKey = e.target.value;
    loadFile(fileKey);
  });

  // Toggle view (text <-> flashcards)
  btnToggle.addEventListener('click',()=>{
    const showingFlash = !flashView.classList.contains('hidden');
    if(showingFlash){
      flashView.classList.add('hidden');
      textView.classList.remove('hidden');
      btnToggle.textContent = 'Chuyển sang Flashcards';
    } else {
      textView.classList.add('hidden');
      flashView.classList.remove('hidden');
      btnToggle.textContent = 'Quay lại chế độ đọc';
    }
  });

  // card controls
  document.getElementById('flip-card').addEventListener('click',()=>{
    document.getElementById('card-back').classList.toggle('hidden');
  });
  document.getElementById('next-card').addEventListener('click',()=>{ if(cards.length){ cardIndex = (cardIndex+1)%cards.length; updateCard(); }});
  document.getElementById('prev-card').addEventListener('click',()=>{ if(cards.length){ cardIndex = (cardIndex-1+cards.length)%cards.length; updateCard(); }});

  // search filter
  searchInput.addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    filterSections(q);
  });

  function updateCard(){
    const front = document.getElementById('card-front');
    const back = document.getElementById('card-back');
    const counter = document.getElementById('card-counter');
    if(!cards.length){ front.innerText='Không có flashcard.'; back.innerText=''; counter.innerText=''}
    else{
      const c = cards[cardIndex];
      front.innerText = c.q;
      back.innerText = c.a;
      back.classList.add('hidden');
      counter.innerText = `${cardIndex+1} / ${cards.length}`;
    }
  }

  // Parse text into parts (PHẦN or Bài) and subsections (1., 2., ...)
  function parseSections(text, label){
    const lines = text.split(/\r?\n/).map(l=>l.replace(/\u00A0/g,' '));
    const parts = [];
    let curPart = null;
    let curSub = null;

    function pushSub(){ if(curSub){ curPart.subs.push(curSub); curSub = null; } }
    function pushPart(){ if(curPart){ pushSub(); parts.push(curPart); curPart = null; } }

    // Create regex pattern based on label (PHẦN or Bài)
    // For HSK1: match "PHẦN 1:", "PHẦN 2:", etc.
    // For HSK2: match "Bài 16:", "Bài 17:", etc.
    const partRegex = new RegExp(`^\\s*${label}\\s*(\\d+)[:：\\s]*(.*)`, 'i');

    for(const line of lines){
      const partMatch = line.match(partRegex);
      const numMatch = line.match(/^\s*(\d+)\.\s*(.*)/);

      if(partMatch){
        // new part
        pushPart();
        curPart = {title: (partMatch[0].trim()), subs: []};
        curSub = null;
      } else if(numMatch){
        if(!curPart){ curPart = {title: label + ' 1', subs: []}; }
        // new subsection
        pushSub();
        curSub = {title: numMatch[1] + '. ' + numMatch[2], bodyLines: []};
      } else {
        if(!curPart){ curPart = {title:'Nội dung', subs: []}; }
        if(!curSub){ curSub = {title:'', bodyLines: []}; }
        curSub.bodyLines.push(line);
      }
    }
    pushPart();
    if(!parts.length) parts.push({title:'Nội dung', subs:[{title:'', bodyLines: lines}]});
    return parts;
  }

  // Render sidebar with parts and nested subsections
  function renderSectionsList(parts){
    sectionsEl.innerHTML = '';
    parts.forEach((p,pi)=>{
      const partLi = document.createElement('li');
      partLi.className = 'part-item';
      const header = document.createElement('div');
      header.className = 'part-header';
      header.textContent = p.title;
      partLi.appendChild(header);

      const subUl = document.createElement('ul');
      subUl.className = 'sub-list';
      p.subs.forEach((s,si)=>{
        const subLi = document.createElement('li');
        subLi.textContent = s.title || ('Mục ' + (si+1));
        subLi.addEventListener('click', (e)=>{
          e.stopPropagation();
          showSubSection(pi, si);
          setActiveSidebar(pi, si);
        });
        subUl.appendChild(subLi);
      });

      // header click: toggle visibility of sub-list
      header.addEventListener('click', ()=>{
        subUl.classList.toggle('collapsed');
      });

      partLi.appendChild(subUl);
      sectionsEl.appendChild(partLi);
    });
    // activate first visible subsection
    setActiveSidebar(0,0);
  }

  function setActiveSidebar(partIdx, subIdx){
    const parts = document.querySelectorAll('#sections > .part-item');
    parts.forEach((p,pi)=>{
      p.classList.toggle('active', pi===partIdx);
      const subs = p.querySelectorAll('.sub-list li');
      subs.forEach((s,si)=> s.classList.toggle('active', pi===partIdx && si===subIdx));
    });
  }


  function showSubSection(partIdx, subIdx){
    // hide all panels
    document.querySelectorAll('.section-panel').forEach(el=>el.classList.add('hidden'));
    const id = 'part-' + partIdx + '-sub-' + subIdx;
    const el = document.getElementById(id);
    if(el){
      // ensure panel visible
      el.classList.remove('hidden');
      // expand body if it was collapsed
      const body = el.querySelector('.section-body');
      if(body) body.classList.remove('collapsed');
      // expand corresponding sidebar part (if collapsed)
      const parts = document.querySelectorAll('#sections .part-item');
      const partEl = parts[partIdx];
      if(partEl){
        const subList = partEl.querySelector('.sub-list');
        if(subList && subList.classList.contains('collapsed')) subList.classList.remove('collapsed');
      }
      // scroll header into view for user clarity
      const header = el.querySelector('.section-title.panel-header');
      if(header && header.scrollIntoView) header.scrollIntoView({behavior:'smooth', block:'start'});
    }
    // also reset main scroll to top of panel area as fallback
    const mainEl = document.getElementById('main');
    if(mainEl) mainEl.scrollTop = 0;
  }

  // Render body lines into paragraphs, examples and notes
  function renderAllSections(parts){
    textView.innerHTML = '';
    parts.forEach((p,pi)=>{
      p.subs.forEach((s,si)=>{
        const panel = document.createElement('div');
        panel.className = 'section-panel hidden';
        panel.id = 'part-' + pi + '-sub-' + si;

        const header = document.createElement('div');
        header.className = 'section-title panel-header';
        // Only show subsection title in the main panel header (hide the PHẦN title)
        header.textContent = s.title || ('Mục ' + (si+1));

        const body = document.createElement('div');
        body.className = 'section-body';
        // collapse toggle
        const toggle = document.createElement('button');
        toggle.className = 'collapse-btn';
        toggle.textContent = 'Ẩn/Hiện';
        toggle.addEventListener('click', ()=>{
          body.classList.toggle('collapsed');
        });
        header.appendChild(toggle);

        // group lines into paragraphs by blank lines
        const groups = [];
        let cur = [];
        s.bodyLines.forEach(line=>{
          if(line.trim()===''){
            if(cur.length){ groups.push(cur); cur=[]; }
          } else { cur.push(line); }
        });
        if(cur.length) groups.push(cur);

        groups.forEach(group=>{
          if(group.every(l=>/^\s*[•◦\*\-]/.test(l))){
            group.forEach(l=>{
              const cleaned = l.replace(/^\s*[•◦\*\-]\s*/,'').trim();
              const ex = document.createElement('div');
              ex.className = 'example';
              const chi = document.createElement('div'); chi.className='chinese';
              const trans = document.createElement('div'); trans.className='trans';
              const m = cleaned.match(/^(.*?)\s*\((.*?)\)\s*$/);
              if(m){ chi.textContent = m[1].trim(); trans.textContent = m[2].trim(); }
              else { chi.textContent = cleaned; }
              ex.appendChild(chi);
              if(trans.textContent) ex.appendChild(trans);
              body.appendChild(ex);
            });
          } else {
            const pEl = document.createElement('p');
            const text = group.join(' ');
            pEl.innerHTML = highlightText(text);
            body.appendChild(pEl);
          }
        });

        panel.appendChild(header);
        panel.appendChild(body);
        textView.appendChild(panel);
      });
    });
    // show first part/subsection by default (if exists)
    if(parts.length && parts[0].subs && parts[0].subs.length){
      showSubSection(0,0);
      setActiveSidebar(0,0);
    }
  }

  // Simple highlighting: wrap Chinese characters and parenthesis translations
  function highlightText(str){
    // wrap parentheses content as translation
    let out = str.replace(/\(([^)]+)\)/g, function(_,t){ return ' <span class="translation">('+t + ')</span>'; });
    // wrap runs of CJK characters
    out = out.replace(/([\u4e00-\u9fff\u3400-\u4dbf]+)/g, '<span class="chinese">$1</span>');
    // keep bullets as normal
    return out;
  }

  function filterSections(q){
    if(!q){ document.querySelectorAll('.section-panel').forEach(el=>el.classList.remove('hidden')); setActiveSidebar(0); return; }
    document.querySelectorAll('.section-panel').forEach((el,idx)=>{
      const text = el.innerText.toLowerCase();
      const match = text.includes(q);
      el.classList.toggle('hidden', !match);
      // toggle sidebar item
      const li = document.querySelectorAll('#sections li')[idx];
      if(li) li.style.display = match? 'block' : 'none';
    });
  }

  // Extract simple flashcards from patterns: Chinese (translation)
  function extractCards(text){
    const cards = [];
    const re = /([\u4e00-\u9fff\u3400-\u4dbf\s，。！？、，a-zA-Z0-9]+?)\s*\(([^)]+)\)/g;
    let m;
    while((m = re.exec(text))){
      const q = m[1].trim();
      const a = m[2].trim();
      if(q.length && a.length) cards.push({q,a});
    }
    return cards;
  }

})();
