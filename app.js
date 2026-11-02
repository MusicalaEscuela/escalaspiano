'use strict';

// Fuente pedagógica de esta colección: «Escalas mayores de Primera Digitación»,
// material Musicala aportado por el usuario (páginas 1 y 2).
const RIGHT_HAND = [1, 2, 3, 1, 2, 3, 4, 5];
const LEFT_HAND = [5, 4, 3, 2, 1, 3, 2, 1];
const SCALES = [
  { id: 'do', title: 'Do mayor', tonic: 'Do', short: 'Do', sharps: 0,
    notes: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'], midi: [60, 62, 64, 65, 67, 69, 71, 72] },
  { id: 'sol', title: 'Sol mayor', tonic: 'Sol', short: 'Sol', sharps: 1,
    notes: ['Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa♯', 'Sol'], midi: [67, 69, 71, 72, 74, 76, 78, 79] },
  { id: 're', title: 'Re mayor', tonic: 'Re', short: 'Re', sharps: 2,
    notes: ['Re', 'Mi', 'Fa♯', 'Sol', 'La', 'Si', 'Do♯', 'Re'], midi: [62, 64, 66, 67, 69, 71, 73, 74] },
  { id: 'la', title: 'La mayor', tonic: 'La', short: 'La', sharps: 3,
    notes: ['La', 'Si', 'Do♯', 'Re', 'Mi', 'Fa♯', 'Sol♯', 'La'], midi: [69, 71, 73, 74, 76, 78, 80, 81] },
  { id: 'mi', title: 'Mi mayor', tonic: 'Mi', short: 'Mi', sharps: 4,
    notes: ['Mi', 'Fa♯', 'Sol♯', 'La', 'Si', 'Do♯', 'Re♯', 'Mi'], midi: [64, 66, 68, 69, 71, 73, 75, 76] }
];
const WHITE_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const CHROMATIC_IS_BLACK = new Set([1, 3, 6, 8, 10]);
const SHORTCUTS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
const FINGER_NAMES = ['pulgar', 'índice', 'medio', 'anular', 'meñique'];
const STORAGE_KEY = 'musicala-piano-escalas-v1';

function readSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {completed: Array.isArray(data.completed) ? data.completed.filter(id => SCALES.some(s => s.id === id)) : [], scaleId: SCALES.some(s => s.id === data.scaleId) ? data.scaleId : 'do'};
  } catch (_) { return {completed: [], scaleId: 'do'}; }
}
const saved = readSaved();
const state = {
  scaleId: saved.scaleId, completed: new Set(saved.completed), view: 'explorar',
  hand: 'right', direction: 'up', practiceDirection: 'up', tempo: 90,
  playing: false, playingMidi: null, playedIndex: null, activeMidi: null,
  practiceIndex: 0, wrongAttempts: 0, feedback: '', feedbackType: '',
  audioContext: null, playbackTimers: []
};
function getScale() { return SCALES.find(s => s.id === state.scaleId) || SCALES[0]; }
function getFingers() { return state.hand === 'right' ? RIGHT_HAND : LEFT_HAND; }
function currentSequence() { return createSequence(getScale(), state.practiceDirection); }
function createSequence(scale, direction) {
  const ascending = scale.midi.map((midi, index) => ({midi, index, note: scale.notes[index]}));
  if (direction === 'down') return [...ascending].reverse();
  if (direction === 'round') return ascending.concat(ascending.slice(0, -1).reverse());
  return ascending;
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({scaleId: state.scaleId, completed: [...state.completed]})); }
  catch (_) { /* La aplicación funciona aunque el navegador bloquee el almacenamiento. */ }
}
function escapable(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function showToast(message) {
  const t = document.getElementById('toast');
  t.textContent = message; t.classList.add('visible');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => t.classList.remove('visible'), 3400);
}
function updateProgress() {
  const n = state.completed.size;
  document.getElementById('sidebarProgressText').textContent = `${n} de 5 escalas`;
  document.getElementById('sidebarProgressBar').style.width = `${n / 5 * 100}%`;
}
function switchView(view) {
  if (!['explorar', 'practicar', 'guia'].includes(view)) return;
  stopPlayback();
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(el => {
    const active = el.dataset.view === view;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  document.querySelector('.hero').classList.toggle('hidden', view !== 'explorar');
  for (const name of ['explorar', 'practicar', 'guia']) document.getElementById(`view-${name}`).classList.toggle('hidden', name !== view);
  if (view === 'practicar') renderPracticeStudio();
  window.scrollTo({top: 0, behavior: 'instant'});
}
function chooseScale(id) {
  if (!SCALES.some(s => s.id === id)) return;
  stopPlayback(); state.scaleId = id; save(); resetPractice(false);
  renderScaleGrid(); renderPracticePills(); renderExploreStudio(); renderPracticeStudio();
  if (state.view === 'explorar') document.getElementById('exploreStudio').scrollIntoView({block: 'nearest', behavior: 'smooth'});
}
function selectHand(hand) {
  if (!['left', 'right'].includes(hand)) return;
  stopPlayback(); state.hand = hand; resetPractice(false); renderExploreStudio(); renderPracticeStudio();
}
function resetPractice(render = true) {
  state.practiceIndex = 0; state.wrongAttempts = 0;
  state.feedback = ''; state.feedbackType = ''; state.activeMidi = null;
  if (render) renderPracticeStudio();
}
function renderScaleGrid() {
  document.getElementById('scaleGrid').innerHTML = SCALES.map((s, i) => `
    <button class="scale-card ${state.scaleId === s.id ? 'active' : ''}" data-scale="${s.id}" aria-pressed="${state.scaleId === s.id}" aria-label="Explorar escala de ${s.title}">
      <div class="scale-card-top"><span class="scale-note-icon">${i === 0 ? '♩' : i === 1 ? '♪' : i === 2 ? '♫' : i === 3 ? '♬' : '♩'}</span>${state.completed.has(s.id) ? '<span class="scale-completed" title="Practicada">✓</span>' : '<span style="color:#d4cbdc">↗</span>'}</div>
      <h4>${escapable(s.title)}</h4><small>${s.sharps ? `${s.sharps} sostenido${s.sharps > 1 ? 's' : ''}` : 'Sin alteraciones'}</small>
    </button>`).join('');
}
function renderPracticePills() {
  document.getElementById('practiceScalePills').innerHTML = SCALES.map(s => `<button class="scale-pill ${state.scaleId === s.id ? 'active' : ''} ${state.completed.has(s.id) ? 'done' : ''}" data-scale="${s.id}" aria-pressed="${state.scaleId === s.id}">${escapable(s.title)} ${state.completed.has(s.id) ? '✓' : ''}</button>`).join('');
}
function handToggle() {
  return `<div class="hand-toggle" aria-label="Elegir mano">
    <button type="button" data-hand="right" class="${state.hand === 'right' ? 'active' : ''}" aria-pressed="${state.hand === 'right'}">Mano derecha</button>
    <button type="button" data-hand="left" class="${state.hand === 'left' ? 'active' : ''}" aria-pressed="${state.hand === 'left'}">Mano izquierda</button>
  </div>`;
}
function isBlack(midi) { return CHROMATIC_IS_BLACK.has(midi % 12); }
function naturalName(midi) {
  const note = midi % 12;
  const idx = [0, -1, 1, -1, 2, 3, -1, 4, -1, 5, -1, 6][note];
  return idx >= 0 ? WHITE_NAMES[idx] : '♯';
}
function keyboardMarkup() {
  const scale = getScale();
  const fingers = getFingers();
  const white = [], black = [];
  let whiteIndex = -1;
  for (let midi = 60; midi <= 84; midi++) {
    const blackKey = isBlack(midi);
    const idx = scale.midi.indexOf(midi);
    const inScale = idx !== -1;
    const name = inScale ? scale.notes[idx] : naturalName(midi);
    const finger = inScale ? `<span class="key-finger">${fingers[idx]}</span>` : '';
    const shortcut = inScale ? `, tecla ${SHORTCUTS[idx].toUpperCase()}` : '';
    const classes = `piano-key ${blackKey ? 'black' : 'white'} ${inScale ? 'in-scale' : ''}`;
    const key = `<button type="button" data-midi="${midi}" class="${classes}" aria-label="${escapable(name)}${shortcut}">${finger}<span class="key-label">${escapable(name)}</span></button>`;
    if (blackKey) black.push(key.replace('class="piano-key', `style="left:${((whiteIndex + 1) / 15 * 100).toFixed(5)}%" class="piano-key`));
    else { whiteIndex++; white.push(key); }
  }
  return `<div class="keyboard-wrap"><div class="piano" aria-label="Piano virtual desde Do4 hasta Do6">${white.join('')}${black.join('')}</div></div>`;
}
function sequenceDirectionSelect(id, value) {
  return `<select class="select-compact" id="${id}" aria-label="Dirección de la escala">
    <option value="up" ${value === 'up' ? 'selected' : ''}>↑ Ascendente</option>
    <option value="down" ${value === 'down' ? 'selected' : ''}>↓ Descendente</option>
    <option value="round" ${value === 'round' ? 'selected' : ''}>↕ Ida y vuelta</option>
  </select>`;
}
function renderExploreStudio() {
  const s = getScale();
  const accidentalText = s.sharps ? `Tiene ${s.sharps} sostenido${s.sharps > 1 ? 's' : ''}.` : 'No tiene sostenidos ni bemoles.';
  document.getElementById('exploreStudio').innerHTML = `
    <article class="surface-card piano-panel">
      <div class="card-head"><div><div class="panel-eyebrow">TU PIANO INTERACTIVO</div><h3>${escapable(s.title)} <span style="color:#b79cde">♫</span></h3><p>Prueba una tecla, escucha y sigue los dedos.</p></div><span class="corner-deco" aria-hidden="true">✳</span></div>
      ${handToggle()}
      ${keyboardMarkup()}
      <div class="keyboard-caption"><span class="legend"><i class="legend-dot"></i> Teclas de la escala · número = dedo</span><span>De grave a agudo →</span></div>
      <div class="audio-controls">
        <button class="btn btn-violet" data-action="play" aria-label="Escuchar la escala"><span class="play-symbol">▶</span><span class="play-label">Escuchar escala</span></button>
        ${sequenceDirectionSelect('exploreDirection', state.direction)}
        <label class="tempo" for="tempoRange">Tempo <input type="range" id="tempoRange" min="50" max="170" step="5" value="${state.tempo}"><output id="tempoValue">${state.tempo} BPM</output></label>
      </div>
    </article>
    <aside class="surface-card sheet-panel">
      <div class="panel-eyebrow">MAPA DE NOTAS Y DEDOS</div><h3>El camino de tus manos <span style="color:#bea7df">✦</span></h3>
      <p class="subtle">Cada número corresponde a un dedo. Lee de izquierda a derecha al subir.</p>
      <div class="sheet-label">NOTAS EN ORDEN</div>
      <div class="note-strip">${s.notes.map((n, i) => `<span class="note-pill" data-note-index="${i}">${escapable(n)}</span>`).join('')}</div>
      <div class="sheet-label">DIGITACIÓN ASCENDENTE</div>
      <div class="finger-rows">
        ${fingerRowMarkup('right', 'Derecha', RIGHT_HAND)}
        ${fingerRowMarkup('left', 'Izquierda', LEFT_HAND)}
      </div>
      <div class="technique-tip"><strong>Al subir con ${state.hand === 'right' ? 'la derecha' : 'la izquierda'}:</strong> ${state.hand === 'right' ? 'pasa el pulgar (1) por debajo después del dedo 3, entre la tercera y la cuarta nota.' : 'pasa el dedo 3 por encima del pulgar (1), entre la quinta y la sexta nota.'} Al bajar, invierte el movimiento. Practica lentamente, sin tensar la muñeca.</div>
      <div class="sheet-divider"></div>
      <div class="insight"><span class="insight-icon">✧</span><span><strong>Dato musical:</strong> ${accidentalText} La digitación de cada mano se mantiene igual en las cinco escalas.</span></div>
      <button class="btn btn-soft sheet-bottom-action" data-action="go-practice">Ya la escuché, ¡a practicar! ↗</button>
    </aside>`;
  syncKeyboard();
}
function fingerRowMarkup(hand, label, array) {
  return `<div class="finger-row ${state.hand === hand ? 'selected' : ''}" data-finger-row="${hand}"><span class="finger-row-label">${label}</span><div class="digit-number-list">${array.map((n, i) => `<span class="digit-number" data-finger-index="${i}">${n}</span>`).join('')}</div></div>`;
}
function renderPracticeStudio() {
  const s = getScale();
  const seq = currentSequence();
  const complete = state.practiceIndex >= seq.length;
  const pos = Math.min(state.practiceIndex, seq.length - 1);
  const next = seq[pos];
  const progress = complete ? seq.length : state.practiceIndex;
  const oldScroll = document.querySelector('#practiceStudio .keyboard-wrap')?.scrollLeft || 0;
  document.getElementById('practiceStudio').innerHTML = `
    <article class="surface-card practice-card">
      <div class="practice-card-head"><div><div class="eyebrow">RETO DE PRIMERA DIGITACIÓN</div><h3>${escapable(s.title)} <span style="color:#bba4de">✷</span></h3></div><span class="section-tag">${seq.length} notas · un reto</span></div>
      <div class="practice-controls"><label>Con qué mano:</label>${handToggle()}<label for="practiceDirection">Recorrido:</label>${sequenceDirectionSelect('practiceDirection', state.practiceDirection)}</div>
      ${complete ? `<div class="complete-screen"><div class="big-check">✦</div><h3>¡Lo lograste!</h3><p>Completaste ${escapable(s.title)} con ${state.hand === 'right' ? 'la mano derecha' : 'la mano izquierda'}. Cada nota cuenta y tu avance quedó guardado.</p><div class="complete-actions"><button class="btn btn-outline" data-action="restart">Repetir escala ↻</button><button class="btn btn-violet" data-action="next-scale">Siguiente escala ↗</button></div></div>` : `
      <div class="progress-current"><div><small>SIGUIENTE NOTA · ${progress + 1} DE ${seq.length}</small><strong>${escapable(next.note)}</strong></div><div class="current-finger">Usa el dedo <b>${getFingers()[next.index]}</b><span>(${FINGER_NAMES[getFingers()[next.index] - 1]})</span></div></div>
      <div class="practice-dots">${seq.map((_, i) => `<span class="practice-dot ${i < progress ? 'hit' : i === progress ? 'next' : ''}"></span>`).join('')}</div>
      <p class="practice-feedback ${state.feedbackType}" role="status">${escapable(state.feedback || 'Tu turno. Encuentra la nota en el piano y tócala.')}</p>`}
      ${keyboardMarkup()}
      <div class="keyboard-caption"><span>También puedes usar A · S · D · F · G · H · J · K</span><span>♫</span></div>
      <div class="practice-bottom"><span class="practice-count">${progress}/${seq.length} notas ${complete ? '✓' : '· sigue así'}</span><div class="practice-buttons"><button class="btn btn-outline" data-action="restart">↺ Reiniciar</button><button class="btn btn-violet" data-action="play"><span class="play-symbol">▶</span><span class="play-label">Escuchar ejemplo</span></button></div></div>
    </article>`;
  const wrap = document.querySelector('#practiceStudio .keyboard-wrap');
  if (wrap) wrap.scrollLeft = oldScroll;
  syncKeyboard();
}
function syncKeyboard() {
  const selectedScale = getScale();
  const seq = currentSequence();
  const isPractice = state.view === 'practicar';
  const practiceReady = isPractice && state.practiceIndex < seq.length;
  const activeMidi = state.playingMidi ?? (practiceReady ? seq[state.practiceIndex].midi : state.activeMidi);
  document.querySelectorAll('.piano-key').forEach(key => {
    const midi = +key.dataset.midi;
    key.classList.toggle('current-key', midi === activeMidi);
    key.classList.remove('wrong-key', 'correct-key');
    key.setAttribute('aria-pressed', midi === activeMidi ? 'true' : 'false');
  });
  const index = selectedScale.midi.indexOf(activeMidi);
  document.querySelectorAll('[data-note-index]').forEach(el => el.classList.toggle('current', +el.dataset.noteIndex === index));
  document.querySelectorAll('.digit-number').forEach(el => {
    el.classList.toggle('highlighted', +el.dataset.fingerIndex === index && el.closest('.finger-row')?.dataset.fingerRow === state.hand);
  });
  document.querySelectorAll('[data-action="play"]').forEach(btn => {
    const isPlaying = state.playing;
    btn.querySelector('.play-symbol').textContent = isPlaying ? '■' : '▶';
    btn.querySelector('.play-label').textContent = isPlaying ? 'Detener' : (btn.closest('#view-practicar') ? 'Escuchar ejemplo' : 'Escuchar escala');
    btn.setAttribute('aria-label', isPlaying ? 'Detener reproducción' : 'Reproducir escala');
  });
}
function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) { showToast('Este navegador no permite reproducir sonido. Las notas y ejercicios siguen funcionando.'); return null; }
  if (!state.audioContext) state.audioContext = new AudioCtx();
  if (state.audioContext.state === 'suspended') state.audioContext.resume().catch(() => {});
  return state.audioContext;
}
function playNote(midi, duration = 0.55) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const fundamental = 440 * Math.pow(2, (midi - 69) / 12);
  const notes = [1, 2, 3];
  const amp = [0.115, 0.039, 0.012];
  notes.forEach((harmonic, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(fundamental * harmonic, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(amp[i], now + 0.013);
    gain.gain.exponentialRampToValueAtTime(amp[i] * 0.52, now + 0.095);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.19, duration));
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + Math.max(0.19, duration) + 0.025);
  });
}
function stopPlayback() {
  state.playbackTimers.forEach(id => clearTimeout(id)); state.playbackTimers = [];
  state.playing = false; state.playingMidi = null; state.playedIndex = null;
  syncKeyboard();
}
function playScale() {
  if (state.playing) {stopPlayback(); return;}
  // Se obtiene al interactuar para cumplir las restricciones de sonido móvil.
  if (!getAudioContext()) return;
  const seq = createSequence(getScale(), state.view === 'practicar' ? state.practiceDirection : state.direction);
  const millis = 60000 / state.tempo;
  state.playing = true; state.playingMidi = null;
  syncKeyboard();
  seq.forEach((step, i) => {
    const t = setTimeout(() => {
      if (!state.playing) return;
      state.playedIndex = step.index; state.playingMidi = step.midi;
      playNote(step.midi, millis / 1000 * .84);
      syncKeyboard();
    }, i * millis);
    state.playbackTimers.push(t);
  });
  state.playbackTimers.push(setTimeout(stopPlayback, seq.length * millis));
}
function pianoPress(midi) {
  // El piano siempre suena, incluso cuando se pulsa una nota equivocada.
  playNote(midi, 0.48);
  if (state.view !== 'practicar' || state.playing) {
    if (!state.playing) {state.activeMidi = midi; syncKeyboard();}
    return;
  }
  const sequence = currentSequence();
  if (state.practiceIndex >= sequence.length) return;
  const expected = sequence[state.practiceIndex];
  if (midi === expected.midi) {
    state.practiceIndex++;
    state.feedback = '¡Bien! Continúa con la siguiente nota.';
    state.feedbackType = 'good';
    if (state.practiceIndex === sequence.length) {
      state.completed.add(state.scaleId); save(); updateProgress(); renderScaleGrid(); renderPracticePills();
      showToast('✦ ¡Escala completada! Tu progreso se guardó.');
    }
    renderPracticeStudio();
  } else {
    state.wrongAttempts++;
    state.feedback = `Esa tecla no es ${expected.note}. Prueba de nuevo, sin afán.`;
    state.feedbackType = 'bad';
    const feedback = document.querySelector('#practiceStudio .practice-feedback');
    if (feedback) { feedback.textContent = state.feedback; feedback.className = 'practice-feedback bad'; }
    const pressedKey = document.querySelector(`#practiceStudio [data-midi="${midi}"]`);
    if (pressedKey) { pressedKey.classList.add('wrong-key'); setTimeout(() => pressedKey.classList.remove('wrong-key'), 390); }
  }
}
function nextScale() {
  const i = SCALES.findIndex(s => s.id === state.scaleId);
  const next = SCALES[(i + 1) % SCALES.length];
  chooseScale(next.id);
  showToast(`Ahora vamos con ${next.title}. ¡Seguimos!`);
}
function openGuideForFinger() {
  switchView('guia');
  setTimeout(() => document.querySelector('.guide-card:nth-child(4)')?.scrollIntoView({behavior: 'smooth', block: 'center'}), 75);
}
function attachEvents() {
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('nav-item')) { switchView(button.dataset.view); return; }
    if (button.dataset.scale) { chooseScale(button.dataset.scale); return; }
    if (button.dataset.hand) { selectHand(button.dataset.hand); return; }
    if (button.dataset.midi) { pianoPress(+button.dataset.midi); return; }
    switch (button.dataset.action) {
      case 'play': playScale(); break;
      case 'go-practice': switchView('practicar'); break;
      case 'restart': stopPlayback(); resetPractice(); break;
      case 'next-scale': nextScale(); break;
    }
  });
  document.getElementById('heroPractice').addEventListener('click', () => switchView('practicar'));
  document.getElementById('guideExplore').addEventListener('click', () => switchView('explorar'));
  document.getElementById('whyFingerBtn').addEventListener('click', openGuideForFinger);
  document.getElementById('minorMode').addEventListener('click', () => {
    switchView('guia');
    showToast('Primero trabajamos el modo mayor. Aquí tienes una introducción al menor.');
  });
  document.getElementById('majorMode').addEventListener('click', () => showToast('Estás aprendiendo el modo mayor ☀'));
  document.getElementById('brandLink').addEventListener('click', e => {e.preventDefault(); switchView('explorar');});
  document.addEventListener('change', event => {
    if (event.target.id === 'exploreDirection') { stopPlayback(); state.direction = event.target.value; }
    if (event.target.id === 'practiceDirection') { stopPlayback(); state.practiceDirection = event.target.value; resetPractice(); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'tempoRange') {
      state.tempo = Number(event.target.value);
      document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
      if (state.playing) stopPlayback();
    }
  });
  document.addEventListener('keydown', event => {
    if (state.view !== 'practicar' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.matches('input,textarea,select') || event.target.isContentEditable) return;
    const idx = SHORTCUTS.indexOf(event.key.toLowerCase());
    if (idx !== -1) {event.preventDefault(); pianoPress(getScale().midi[idx]);}
  });
  const help = document.getElementById('helpDialog');
  document.getElementById('helpBtn').addEventListener('click', () => help.showModal());
  document.getElementById('closeHelp').addEventListener('click', () => help.close());
  document.getElementById('dialogGotIt').addEventListener('click', () => help.close());
  help.addEventListener('click', event => {if (event.target === help) help.close();});
}
function init() {
  renderScaleGrid(); renderPracticePills(); renderExploreStudio(); renderPracticeStudio();
  updateProgress(); attachEvents();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
init();
