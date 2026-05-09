/* ─── Kingdom Map · vanilla toggle + export ─────────────────────────────────
 *
 * The SVG holds 17 building groups; each looks like:
 *     <g class="b" id="b-cathedral"> … </g>
 *
 * To show/hide a building, toggle the CSS class "b-off" on its <g> element:
 *     document.getElementById('b-cathedral').classList.add('b-off');     // hide
 *     document.getElementById('b-cathedral').classList.remove('b-off');  // show
 *
 * That's the entire visibility mechanism. Everything below just builds a
 * checkbox panel that does this for you, plus PNG / SVG export.
 * ─────────────────────────────────────────────────────────────────────── */

const BUILDINGS = [
  { group: 'Mountains', items: [
    { id: 'watchtower', label: 'Watchtower',     glyph: '🗼' },
    { id: 'goldmine',   label: 'Goldmine',       glyph: '⛏️' },
    { id: 'quarry',     label: 'Stone Quarry',   glyph: '⛰️' },
    { id: 'tollgate',   label: 'Toll Gate',      glyph: '🛤️' },
  ]},
  { group: 'Town & Plains', items: [
    { id: 'cathedral',  label: 'Cathedral',      glyph: '⛪' },
    { id: 'shrine',     label: 'Shrine',         glyph: '⛩️' },
    { id: 'sanatorium', label: 'Sanatorium',     glyph: '🏥' },
    { id: 'trading',    label: 'Trading Square', glyph: '🏛️' },
    { id: 'market',     label: 'Market',         glyph: '🏪' },
    { id: 'tavern',     label: 'Tavern',         glyph: '🍺' },
    { id: 'training',   label: 'Training Ground',glyph: '🏋️' },
    { id: 'hunting',    label: 'Hunting Lodge',  glyph: '🏹' },
    { id: 'orchard',    label: 'Orchard',        glyph: '🍎' },
    { id: 'cattle',     label: 'Cattle Farm',    glyph: '🐄' },
  ]},
  { group: 'River', items: [
    { id: 'watermill',  label: 'Watermill',      glyph: '🏞️' },
    { id: 'dock',       label: 'Dock',           glyph: '⚓' },
    { id: 'fishermen',  label: 'Fishermen',      glyph: '🎣' },
  ]},
];

/* ─── Visibility helpers ─────────────────────────────────────── */
function setVisible(buildingId, on) {
  const el = document.getElementById('b-' + buildingId);
  if (el) el.classList.toggle('b-off', !on);
}

function setAllVisible(on) {
  BUILDINGS.forEach(g => g.items.forEach(b => {
    setVisible(b.id, on);
    const cb = document.getElementById('cb-' + b.id);
    if (cb) cb.checked = on;
  }));
}

function randomize() {
  BUILDINGS.forEach(g => g.items.forEach(b => {
    const on = Math.random() > 0.4;
    setVisible(b.id, on);
    const cb = document.getElementById('cb-' + b.id);
    if (cb) cb.checked = on;
  }));
}

/* ─── Export PNG / SVG ───────────────────────────────────────── */
function buildExportSvg() {
  const svg = document.getElementById('map');
  const clone = svg.cloneNode(true);
  // bake current visibility: drop any hidden building groups
  clone.querySelectorAll('.b-off').forEach(el => el.remove());
  clone.querySelectorAll('.b').forEach(el => el.removeAttribute('class'));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return clone;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportSVG() {
  const clone = buildExportSvg();
  const data = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>\n', data],
    { type: 'image/svg+xml;charset=utf-8' }
  );
  downloadBlob(blob, 'kingdom-map.svg');
}

function exportPNG() {
  const svg = document.getElementById('map');
  const vb = svg.viewBox.baseVal;
  const clone = buildExportSvg();
  const data = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const scale = 2;  // 2x for crispness
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vb.width * scale);
    canvas.height = Math.round(vb.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => {
      downloadBlob(b, 'kingdom-map.png');
      URL.revokeObjectURL(svgUrl);
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(svgUrl); alert('PNG export failed.'); };
  img.src = svgUrl;
}

/* ─── Build the toggle panel ─────────────────────────────────── */
function buildPanel() {
  const panel = document.getElementById('panel');
  if (!panel) return;

  const body = document.createElement('div');
  body.className = 'body';

  // bulk action row
  const bulk = document.createElement('div');
  bulk.className = 'row';
  [
    ['Show all', () => setAllVisible(true)],
    ['Hide all', () => setAllVisible(false)],
    ['Random',   randomize],
  ].forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.textContent = label; b.addEventListener('click', fn);
    bulk.appendChild(b);
  });
  body.appendChild(bulk);

  // export row
  const exp = document.createElement('div');
  exp.className = 'row';
  [
    ['Export PNG', exportPNG],
    ['Export SVG', exportSVG],
  ].forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.textContent = label; b.addEventListener('click', fn);
    exp.appendChild(b);
  });
  body.appendChild(exp);

  // section toggles
  BUILDINGS.forEach(group => {
    const h = document.createElement('div');
    h.className = 'sect'; h.textContent = group.group;
    body.appendChild(h);

    group.items.forEach(b => {
      const wrap = document.createElement('label');
      wrap.className = 'toggle';
      wrap.innerHTML =
        `<span class="lbl">${b.glyph} &nbsp; ${b.label}</span>`;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'cb-' + b.id;
      cb.checked = true;
      cb.addEventListener('change', () => setVisible(b.id, cb.checked));
      wrap.appendChild(cb);
      body.appendChild(wrap);
    });
  });

  const header = document.createElement('header');
  header.textContent = 'Kingdom Buildings';
  panel.appendChild(header);
  panel.appendChild(body);
}

document.addEventListener('DOMContentLoaded', buildPanel);
