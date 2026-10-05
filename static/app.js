const YELLOW = '#f0e226';
const SAND = '#d9d7ce';

const el = (id) => document.getElementById(id);

let originals = [];
let playing = null;
let painted = [];


function prep(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 84;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const mid = height / 2;
  ctx.strokeStyle = '#272727';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid + 0.5);
  ctx.lineTo(width, mid + 0.5);
  ctx.stroke();

  return { ctx, mid, room: mid - 2, width };
}

function band(ctx, peaks, mid, room, width, colour, alpha) {
  const x = (i) => (i / (peaks.length - 1)) * width;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  peaks.forEach(([lo, hi], i) => {
    const y = mid - hi * room;
    if (i === 0) ctx.moveTo(x(i), y);
    else ctx.lineTo(x(i), y);
  });
  for (let i = peaks.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(x(i), mid - peaks[i][0] * room);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawOne(canvas, peaks, colour) {
  const { ctx, mid, room, width } = prep(canvas);
  band(ctx, peaks, mid, room, width, colour, 0.9);
}

function drawCompare(canvas, recovered, original) {
  const { ctx, mid, room, width } = prep(canvas);
  band(ctx, recovered, mid, room, width, YELLOW, 0.85);

  ctx.strokeStyle = SAND;
  ctx.lineWidth = 1;
  for (const edge of [0, 1]) {
    ctx.beginPath();
    original.forEach((pair, i) => {
      const y = mid - pair[edge] * room;
      const x = (i / (original.length - 1)) * width;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function remember(canvas, draw) {
  const entry = { canvas, draw };
  const at = painted.findIndex((e) => e.canvas === canvas);
  if (at >= 0) painted[at] = entry;
  else painted.push(entry);
  draw();
}

window.addEventListener('resize', () => {
  painted = painted.filter((entry) => document.body.contains(entry.canvas));
  painted.forEach((entry) => entry.draw());
});


function addRow(container, signal, colour) {
  const row = document.createElement('article');
  row.className = 'row';

  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'row__title';
  title.textContent = signal.label;
  const meta = document.createElement('p');
  meta.className = 'row__meta';
  meta.textContent = signal.meta;
  info.append(title, meta);

  const canvas = document.createElement('canvas');
  canvas.className = 'wave';

  const button = document.createElement('button');
  button.className = 'pill play';
  button.type = 'button';
  button.textContent = 'Play';
  button.setAttribute('aria-pressed', 'false');

  const audio = new Audio(signal.url);
  audio.preload = 'none';

  const reset = () => {
    button.textContent = 'Play';
    button.setAttribute('aria-pressed', 'false');
    if (playing === audio) playing = null;
  };

  button.addEventListener('click', () => {
    if (!audio.paused) return audio.pause();
    if (playing) playing.pause();
    audio.play().catch(() => say('Playback was blocked.', 'error'));
  });

  audio.addEventListener('play', () => {
    button.textContent = 'Pause';
    button.setAttribute('aria-pressed', 'true');
    playing = audio;
  });
  audio.addEventListener('pause', reset);
  audio.addEventListener('ended', reset);

  row.append(info, canvas, button);
  container.appendChild(row);
  remember(canvas, () => drawOne(canvas, signal.peaks, colour));
}

function addCompare(label, recovered, original) {
  const box = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'compare__label';
  name.textContent = label;

  const canvas = document.createElement('canvas');
  canvas.className = 'wave';

  box.append(name, canvas);
  el('compare-rows').appendChild(box);
  remember(canvas, () => drawCompare(canvas, recovered, original));
}


async function getJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function say(text, state) {
  const node = el('status');
  node.textContent = text;
  if (state) node.dataset.state = state;
  else delete node.dataset.state;
}

function clearPending(only) {
  document.querySelectorAll('[data-pending]').forEach((node) => {
    if (!only || node.textContent.trim() === only) node.remove();
  });
}

function fill(id, signals, data, colour, tag) {
  const box = el(id);
  box.innerHTML = '';
  const stamp = `${data.duration.toFixed(1)} s · ${data.rate} Hz · ${tag}`;
  signals.forEach((signal) => addRow(box, { ...signal, meta: stamp }, colour));
}


async function loadOriginals() {
  const data = await getJSON('/api/sources');
  originals = data.signals.map((s) => s.peaks);
  fill('source-rows', data.signals, data, SAND, 'original');
  clearPending('Loading…');
}

async function run() {
  const button = el('run');
  button.disabled = true;
  say('Mixing and recovering…', 'busy');

  try {
    const data = await getJSON('/api/run', { method: 'POST' });

    fill('mic-rows', data.microphones, data, SAND, 'mixed');
    fill('recovered-rows', data.recovered, data, YELLOW, 'recovered');

    el('compare-rows').innerHTML = '';
    data.recovered.forEach((signal, i) => {
      addCompare(signal.label, signal.peaks, originals[i] || signal.peaks);
    });

    el('error-value').textContent = `‖E‖ = ${data.error.toExponential(2)}`;
    clearPending();
    say('Done.');
  } catch (err) {
    say(err.message, 'error');
  } finally {
    button.disabled = false;
  }
}

el('run').addEventListener('click', run);

loadOriginals().catch((err) => say(err.message, 'error'));
