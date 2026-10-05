/* Draws the waveforms and runs the experiment.
 *
 * The server sends each signal as ~900 (min, max) pairs instead of thousands
 * of samples, so all we do here is fill in a shape between the two numbers.
 */

// the two colours we draw with
const YELLOW = '#f0e226';
const SAND = '#d9d7ce';

// shortcut so we dont type getElementById everywhere
const el = (id) => document.getElementById(id);

// shapes of the two originals, we need these later for the compare view
let originals = [];

// the clip thats playing right now, so only one plays at a time
let playing = null;

// every canvas we drew, so we can redraw them if the window changes size
let painted = [];

/* ------------------------------------------------------------ waveforms */

// get the canvas ready to draw on, and draw the flat line down the middle
function prep(canvas) {
  // make it sharp on high dpi screens
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 84;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // the middle of the canvas is where silence sits
  const mid = height / 2;

  // draw the zero line so silence still looks like something
  ctx.strokeStyle = '#272727';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid + 0.5);
  ctx.lineTo(width, mid + 0.5);
  ctx.stroke();

  // mid is the centre, room is how far up and down we can go
  return { ctx, mid, room: mid - 2, width };
}

// fill in the shape between the smallest and biggest sample of each bit
function band(ctx, peaks, mid, room, width, colour, alpha) {
  // work out where on the page each bit goes
  const x = (i) => (i / (peaks.length - 1)) * width;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;

  // go along the top using the biggest sample
  ctx.beginPath();
  peaks.forEach(([lo, hi], i) => {
    const y = mid - hi * room;
    if (i === 0) ctx.moveTo(x(i), y);
    else ctx.lineTo(x(i), y);
  });

  // come back along the bottom using the smallest sample
  for (let i = peaks.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(x(i), mid - peaks[i][0] * room);
  }

  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// one waveform on its own
function drawOne(canvas, peaks, colour) {
  const { ctx, mid, room, width } = prep(canvas);
  band(ctx, peaks, mid, room, width, colour, 0.9);
}

// recovered in yellow underneath, original as a thin line on top, so both
// shapes stay readable where they overlap
function drawCompare(canvas, recovered, original) {
  const { ctx, mid, room, width } = prep(canvas);
  band(ctx, recovered, mid, room, width, YELLOW, 0.85);

  // draw the original as a line, once for the top and once for the bottom
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

// remember this canvas so we can draw it again after a resize
function remember(canvas, draw) {
  const entry = { canvas, draw };
  const at = painted.findIndex((e) => e.canvas === canvas);
  if (at >= 0) painted[at] = entry;
  else painted.push(entry);
  draw();
}

// the windows a different size now so the canvases are the wrong size,
// so throw away the old ones and draw them all again
window.addEventListener('resize', () => {
  painted = painted.filter((entry) => document.body.contains(entry.canvas));
  painted.forEach((entry) => entry.draw());
});

/* ----------------------------------------------------------------- rows */

// add one line: name and info on the left, waveform, play button
function addRow(container, signal, colour) {
  const row = document.createElement('article');
  row.className = 'row';

  // the left bit with the name and the info under it
  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'row__title';
  title.textContent = signal.label;
  const meta = document.createElement('p');
  meta.className = 'row__meta';
  meta.textContent = signal.meta;
  info.append(title, meta);

  // the waveform goes in the middle
  const canvas = document.createElement('canvas');
  canvas.className = 'wave';

  // play button on the right
  const button = document.createElement('button');
  button.className = 'pill play';
  button.type = 'button';
  button.textContent = 'Play';
  button.setAttribute('aria-pressed', 'false');

  // this is the actual sound
  const audio = new Audio(signal.url);
  audio.preload = 'none';

  // put the button back to normal
  const reset = () => {
    button.textContent = 'Play';
    button.setAttribute('aria-pressed', 'false');
    if (playing === audio) playing = null;
  };

  button.addEventListener('click', () => {
    // already playing? then stop it
    if (!audio.paused) return audio.pause();

    // stop whatever else was playing, then start this one
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

// add one of the overlap boxes in the compare section
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

/* ---------------------------------------------------------------- fetch */

// ask the server for some json, and complain if it went wrong
async function getJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// write a message next to the run button
function say(text, state) {
  const node = el('status');
  node.textContent = text;
  if (state) node.dataset.state = state;
  else delete node.dataset.state;
}

// take away the "press run" notes once we have real stuff to show
function clearPending(only) {
  document.querySelectorAll('[data-pending]').forEach((node) => {
    if (!only || node.textContent.trim() === only) node.remove();
  });
}

// put a list of signals into one of the sections
function fill(id, signals, data, colour, tag) {
  const box = el(id);
  box.innerHTML = '';
  const stamp = `${data.duration.toFixed(1)} s · ${data.rate} Hz · ${tag}`;
  signals.forEach((signal) => addRow(box, { ...signal, meta: stamp }, colour));
}

/* ----------------------------------------------------------------- init */

// show the two originals, this happens as soon as the page opens
async function loadOriginals() {
  const data = await getJSON('/api/sources');
  originals = data.signals.map((s) => s.peaks);
  fill('source-rows', data.signals, data, SAND, 'original');
  clearPending('Loading…');
}

// this is what the run button does
async function run() {
  const button = el('run');
  button.disabled = true;
  say('Mixing and recovering…', 'busy');

  try {
    const data = await getJSON('/api/run', { method: 'POST' });

    // the three microphones
    fill('mic-rows', data.microphones, data, SAND, 'mixed');

    // the two recovered sources
    fill('recovered-rows', data.recovered, data, YELLOW, 'recovered');

    // draw each recovered one on top of its original
    el('compare-rows').innerHTML = '';
    data.recovered.forEach((signal, i) => {
      addCompare(signal.label, signal.peaks, originals[i] || signal.peaks);
    });

    // show how much error was left over
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
