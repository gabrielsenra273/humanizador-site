// app.js — frontend logic
(() => {
  // DOM
  const inputText = document.getElementById('inputText');
  const previewText = document.getElementById('previewText');
  const previewBtn = document.getElementById('previewBtn');
  const aiBtn = document.getElementById('aiBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const speakBtn = document.getElementById('speakBtn');
  const saveBtn = document.getElementById('saveBtn');
  const historyList = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearBtn');
  const templateSelect = document.getElementById('templateSelect');
  const fileInput = document.getElementById('fileInput');
  const exampleBtns = document.querySelectorAll('.example');

  const toneEl = document.getElementById('tone');
  const levelEl = document.getElementById('level');
  const contractionsEl = document.getElementById('contractions');
  const fillersEl = document.getElementById('fillers');
  const emojisEl = document.getElementById('emojis');
  const regionEl = document.getElementById('region');
  const modelInput = document.getElementById('modelInput');

  // Local history (localStorage)
  const HISTORY_KEY = 'humanizador_history_v1';
  function loadHistory(){
    try{
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    }catch(e){ return []; }
  }
  function saveHistory(arr){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0,12)));
    renderHistory();
  }
  function addHistory(item){
    const h = loadHistory();
    h.unshift(item);
    saveHistory(h);
  }
  function renderHistory(){
    const h = loadHistory();
    historyList.innerHTML = '';
    if(!h.length){ historyList.innerHTML = '<li style="color:var(--muted)">Sem histórico</li>'; return; }
    h.forEach((entry, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<div style="flex:1"><strong>${new Date(entry.ts).toLocaleString()}</strong><div style="font-size:13px;color:var(--muted)">${entry.preview}</div></div>
        <div style="margin-left:8px"><button data-idx="${idx}" class="useBtn">Usar</button></div>`;
      historyList.appendChild(li);
    });
    document.querySelectorAll('.useBtn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const idx = +e.currentTarget.dataset.idx;
        const h = loadHistory();
        inputText.value = h[idx].full;
        window.scrollTo({top:0, behavior:'smooth'});
      });
    });
  }

  // Templates
  const TEMPLATES = {
    "email": "Prezado(a) [Nome],\n\nEscrevo para ...\n\nAtenciosamente,\n[Seu nome]",
    "linkedin": "Compartilho um aprendizado importante sobre ...\n\nO que aprendi: ",
    "instagram": "Hoje foi um dia inesquecível porque ... #vida #historia",
    "resume": "A 2ª Guerra Mundial foi um conflito global entre 1939 e 1945 que envolveu..."
  };
  templateSelect.addEventListener('change', ()=>{
    const k = templateSelect.value;
    if(!k) return;
    inputText.value = TEMPLATES[k] || '';
  });

  // File load
  fileInput.addEventListener('change', async (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    const txt = await f.text();
    inputText.value = txt;
  });

  // Example buttons
  exampleBtns.forEach(b=>{
    b.addEventListener('click', ()=> inputText.value = b.dataset.text );
  });

  // Utilities local engine
  function splitSentences(text){
    return text.match(/[^.!?]+[.!?]?/g) || [text];
  }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function applyContractions_ptBR(s){
    const map = [[" para "," pra "],[" Para "," Pra "],[" está "," tá "],[" Está "," Tá "]];
    map.forEach(([a,b]) => s = s.split(a).join(b));
    return s;
  }
  function addFillerWords_ptBR(sentence, intensity=0.18){
    const fillers = ["tipo","sabe","na real","então","é que","olha"];
    if(Math.random() > intensity) return sentence;
    const parts = sentence.split(/,\s*/);
    const pos = Math.min(parts.length-1, Math.floor(Math.random()*(parts.length+1)));
    const f = pick(fillers);
    if(pos>=0 && pos<parts.length){ parts[pos] = f + ", " + parts[pos]; return parts.join(", "); }
    return f + " " + sentence;
  }
  function varyPunctuation(sentence, intensity=0.12){
    if(!sentence.trim()) return sentence;
    if(Math.random() < intensity){
      if(Math.random() < 0.6) sentence = sentence.replace(/\.\s*$/,"...");
      else sentence = sentence.replace(/[.!?]*\s*$/,"!");
    }
    return sentence;
  }
  function regionalismoReplace(s, region){
    if(!region) return s;
    const nordeste = [["você","ocê"],["gostar","curtir"]];
    const sp = [["você","vc"],["para","pra"]];
    const mapa = { "Nordeste": nordeste, "SP/RS": sp };
    const regras = mapa[region] || [];
    regras.forEach(([a,b]) => s = s.replace(new RegExp("\\b"+a+"\\b","gi"), (m)=> {
      return (m[0]===m[0].toUpperCase()) ? b.charAt(0).toUpperCase()+b.slice(1) : b;
    }));
    return s;
  }

  function naturalizeSentence(sentence, options){
    let s = sentence.trim();
    if(Math.random() < 0.09 && options.tone === "Conversacional") s = pick(["Olha,","Então,","Bom,","Ah,"]) + " " + s;
    if(options.useContractions && options.level !== "Conservador") s = applyContractions_ptBR(s);
    if(options.useFills && Math.random() < (options.level === "Agressivo" ? 0.5 : 0.18)) s = addFillerWords_ptBR(s, options.level === "Agressivo" ? 0.5 : 0.18);
    s = varyPunctuation(s, options.level === "Agressivo" ? 0.28 : 0.12);
    if(Math.random() < 0.06 && options.tone !== "Formal") s = s.replace(/(, )/, (m) => m + "sabe, ");
    if(options.region) s = regionalismoReplace(s, options.region);
    if(options.useEmoji && Math.random() < (options.level === "Agressivo" ? 0.22 : 0.08)) s = s + " " + pick(["🙂","😉","👍","🔥","🙌"]);
    // tone sanitization
    if(options.tone === "Profissional") s = s.replace(/\b(tipo|na real|pq|vc)\b/gi, (m)=> {
      if(m.toLowerCase()==='pq') return 'porque';
      if(m.toLowerCase()==='vc') return 'você';
      return m;
    }).replace(/[🙂😉🙌🔥]/g,'');
    if(options.tone === "Formal") s = s.replace(/\bpra\b/gi,'para').replace(/\btá\b/gi,'está').replace(/\bvc\b/gi,'você').replace(/\b(tipo|na real|pq)\b/gi,'').replace(/[🙂😉🙌🔥]/g,'');
    return s;
  }

  function adjustParagraphs(text, options){
    const sentences = splitSentences(text);
    let out = sentences.map(s => naturalizeSentence(s, options)).join(" ");
    if(options.level !== "Conservador") out = out.replace(/\.\s+/g, ".\n");
    out = out.replace(/\s{2,}/g, " ").trim();
    return out;
  }

  // Actions
  previewBtn.addEventListener('click', ()=>{
    const text = inputText.value.trim();
    if(!text){ alert('Cole ou escreva um texto antes.'); return; }
    const options = {
      tone: toneEl.value,
      level: levelEl.value,
      useContractions: contractionsEl.checked,
      useFills: fillersEl.checked,
      useEmoji: emojisEl.checked,
      region: regionEl.value
    };
    const out = adjustParagraphs(text, options);
    previewText.value = out;
  });

  // AI generation via server proxy
  aiBtn.addEventListener('click', async ()=>{
    const text = inputText.value.trim();
    if(!text){ alert('Cole ou escreva um texto antes.'); return; }
    const model = modelInput.value || 'gpt-4o-mini';
    const payload = {
      model,
      prompt: buildAIPrompt(text),
      options: {
        tone: toneEl.value,
        level: levelEl.value,
        useContractions: contractionsEl.checked,
        useFills: fillersEl.checked,
        useEmoji: emojisEl.checked,
        region: regionEl.value
      }
    };
    // call server (server.js must be running at /api/generate)
    try {
      aiBtn.disabled = true; aiBtn.textContent = 'Gerando...';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Resposta do servidor: ' + res.status);
      const data = await res.json();
      const out = data.text || data.output || '';
      previewText.value = out;
    } catch (err){
      alert('Erro ao gerar com IA: ' + err.message + '\nVerifique se o servidor está ativo.');
    } finally { aiBtn.disabled=false; aiBtn.textContent='Gerar com IA (OpenAI)'; }
  });

  function buildAIPrompt(text){
    // instrução para o modelo: transformar com as opções
    return `Você é um assistente que "humaniza" textos em português brasileiro.
Entrada:
${text}

Regras:
- Respeite o tom: ${toneEl.value}
- Nível de alteração: ${levelEl.value}
- Aplicar contrações: ${contractionsEl.checked}
- Aplicar fillers: ${fillersEl.checked}
- Adicionar emojis sutis: ${emojisEl.checked}
- Regionalismo: ${regionEl.value || "nenhum"}
Produza a versão humanizada e explique brevemente as mudanças (5-15 palavras) no final, separadas por duas linhas.`;
  }

  // Copy / download / speak / save
  copyBtn.addEventListener('click', async ()=>{
    if(!previewText.value) return alert('Gere o texto primeiro.');
    await navigator.clipboard.writeText(previewText.value);
    alert('Texto copiado.');
  });

  downloadBtn.addEventListener('click', ()=>{
    if(!previewText.value) return alert('Gere o texto primeiro.');
    const blob = new Blob([previewText.value], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'humanizado.txt';
    document.body.appendChild(a); a.click(); a.remove();
  });

  speakBtn.addEventListener('click', ()=>{
    if(!previewText.value) return alert('Gere o texto primeiro.');
    if('speechSynthesis' in window){
      const ut = new SpeechSynthesisUtterance(previewText.value);
      ut.lang = 'pt-BR';
      speechSynthesis.cancel();
      speechSynthesis.speak(ut);
    } else alert('Navegador não suporta SpeechSynthesis.');
  });

  saveBtn.addEventListener('click', ()=>{
    if(!previewText.value) return alert('Gere o texto primeiro.');
    addHistory({ ts: Date.now(), preview: previewText.value.slice(0,120), full: previewText.value });
    alert('Salvo no histórico local.');
  });

  clearBtn.addEventListener('click', ()=> {
    inputText.value = '';
    previewText.value = '';
  });

  // small helpers
  function downloadJSON(obj, name){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  // init
  renderHistory();
})();
