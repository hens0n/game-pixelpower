// tools/preview/preview.js
import { formatExport } from './export.js';

const COLOR_MAP = {
  red: '#ff6e7a',
  yellow: '#ffd74f',
  green: '#6be49a',
  blue: '#77c2ff',
};

const TIER_CLASSES = {
  easy: 'filter-easy',
  medium: 'filter-medium',
  hard: 'filter-hard',
  expert: 'filter-expert',
};

let candidates = [];
let decisions = loadDecisions();
let selectedIndex = -1;
let activeFilter = 'all';

const CANDIDATE_PATHS = [
  '/output/candidates.json',
  '../../output/candidates.json',
];

function loadDecisions() {
  try {
    return JSON.parse(localStorage.getItem('pp-preview-decisions') || '{}');
  } catch { return {}; }
}

function saveDecisions() {
  localStorage.setItem('pp-preview-decisions', JSON.stringify(decisions));
}

function getDecision(id) {
  return decisions[id] || 'pending';
}

function setDecision(id, status) {
  decisions[id] = status;
  saveDecisions();
}

async function loadCandidates() {
  try {
    let loaded = null;
    for (const path of CANDIDATE_PATHS) {
      const res = await fetch(path);
      if (res.ok) {
        loaded = await res.json();
        break;
      }
    }
    if (!loaded) throw new Error('Not found');
    candidates = loaded;
  } catch {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const text = await e.target.files[0].text();
      candidates = JSON.parse(text);
      render();
    };
    const emptyState = document.getElementById('empty-state');
    emptyState.textContent = '';
    const msg = document.createElement('div');
    msg.style.textAlign = 'center';
    const p1 = document.createElement('p');
    p1.textContent = 'Could not auto-load output/candidates.json';
    const p2 = document.createElement('p');
    p2.textContent = 'Drop a JSON file or click to browse:';
    p2.style.marginTop = '8px';
    msg.appendChild(p1);
    msg.appendChild(p2);
    msg.appendChild(input);
    emptyState.appendChild(msg);
    return;
  }
  render();
}

function render() {
  renderFilters();
  renderCards();
  updateExportCount();
  if (candidates.length > 0 && selectedIndex === -1) {
    selectCandidate(0);
  }
}

function renderFilters() {
  const container = document.getElementById('filters');
  container.textContent = '';
  const tiers = ['all', ...new Set(candidates.map(c => c.meta.tier))];
  for (const tier of tiers) {
    const btn = document.createElement('button');
    const tierClass = tier === 'all' ? 'filter-all' : TIER_CLASSES[tier];
    btn.className = `filter-btn ${tierClass} ${tier === activeFilter ? 'active' : ''}`;
    const count = tier === 'all' ? candidates.length : candidates.filter(c => c.meta.tier === tier).length;
    btn.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${count})`;
    btn.onclick = () => { activeFilter = tier; renderCards(); };
    container.appendChild(btn);
  }
}

function getFilteredCandidates() {
  return activeFilter === 'all' ? candidates : candidates.filter(c => c.meta.tier === activeFilter);
}

function renderCards() {
  const container = document.getElementById('card-list');
  container.textContent = '';
  const filtered = getFilteredCandidates();
  document.getElementById('total-count').textContent = String(filtered.length);

  for (const c of filtered) {
    const globalIdx = candidates.indexOf(c);
    const status = getDecision(c.id);
    const card = document.createElement('div');
    card.className = `level-card ${globalIdx === selectedIndex ? 'selected' : ''} ${status}`;

    const header = document.createElement('div');
    header.className = 'card-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-name';
    nameSpan.textContent = c.name;
    const tierSpan = document.createElement('span');
    tierSpan.className = `card-tier ${TIER_CLASSES[c.meta.tier]}`;
    tierSpan.textContent = c.meta.tier;
    header.appendChild(nameSpan);
    header.appendChild(tierSpan);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = `${c.meta.gridSize} \u00b7 ${c.meta.colorCount} colors \u00b7 score ${c.meta.difficulty}`;

    card.appendChild(header);
    card.appendChild(meta);

    if (status !== 'pending') {
      const statusDiv = document.createElement('div');
      statusDiv.style.fontSize = '10px';
      statusDiv.style.marginTop = '4px';
      statusDiv.style.fontWeight = '600';
      statusDiv.style.color = status === 'accepted' ? '#22c55e' : '#ef4444';
      statusDiv.textContent = status.toUpperCase();
      card.appendChild(statusDiv);
    }

    card.onclick = () => selectCandidate(globalIdx);
    container.appendChild(card);
  }
}

function selectCandidate(globalIdx) {
  selectedIndex = globalIdx;
  const c = candidates[globalIdx];
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('detail').style.display = 'flex';
  document.getElementById('detail-name').textContent = c.name;
  document.getElementById('detail-desc').textContent = c.description;
  renderBoard(c.layout);
  renderInfo(c);
  renderCards();
}

function renderBoard(layout) {
  const canvas = document.getElementById('board-canvas');
  const ctx = canvas.getContext('2d');
  const rows = layout.length;
  const cols = layout[0].length;
  const cellSize = Math.min(300 / cols, 300 / rows);
  canvas.width = cols * cellSize + 4;
  canvas.height = rows * cellSize + 4;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = layout[r][c];
      if (color === null) continue;
      ctx.fillStyle = COLOR_MAP[color] || '#888';
      ctx.beginPath();
      ctx.roundRect(c * cellSize + 2, r * cellSize + 2, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
    }
  }
}

function renderInfo(candidate) {
  const panel = document.getElementById('info-panel');
  panel.textContent = '';
  const m = candidate.meta;

  const fields = [
    ['Grid', m.gridSize],
    ['Colors', String(m.colorCount)],
    ['Total cubes', String(m.totalCubes)],
    ['Tier', m.tier],
    ['Difficulty', `${m.difficulty} / 10`],
    ['Pattern', m.pattern],
    ['Ammo budget', `${m.totalAmmo} (${(m.totalAmmo / m.totalCubes).toFixed(2)}x)`],
  ];

  for (const [label, value] of fields) {
    const div = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    div.appendChild(strong);
    div.appendChild(document.createTextNode(value));
    panel.appendChild(div);
  }

  const benchLabel = document.createElement('div');
  benchLabel.style.marginTop = '12px';
  const benchStrong = document.createElement('strong');
  benchStrong.textContent = 'Bench:';
  benchLabel.appendChild(benchStrong);
  panel.appendChild(benchLabel);

  const chips = document.createElement('div');
  chips.className = 'bench-chips';
  for (const p of candidate.bench) {
    const chip = document.createElement('span');
    chip.className = 'bench-chip';
    chip.style.background = COLOR_MAP[p.color];
    chip.style.color = '#000';
    chip.textContent = `${p.color} x${p.ammo}`;
    chips.appendChild(chip);
  }
  panel.appendChild(chips);
}

function updateExportCount() {
  const count = candidates.filter(c => getDecision(c.id) === 'accepted').length;
  document.getElementById('btn-export').textContent = `Export Accepted (${count})`;
}

document.getElementById('btn-accept').onclick = () => {
  if (selectedIndex < 0) return;
  setDecision(candidates[selectedIndex].id, 'accepted');
  renderCards();
  updateExportCount();
};

document.getElementById('btn-reject').onclick = () => {
  if (selectedIndex < 0) return;
  setDecision(candidates[selectedIndex].id, 'rejected');
  renderCards();
  updateExportCount();
};

document.getElementById('btn-export').onclick = () => {
  const accepted = candidates.filter(c => getDecision(c.id) === 'accepted');
  if (accepted.length === 0) { alert('No accepted levels to export.'); return; }
  const js = formatExport(accepted);
  const blob = new Blob([js], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'generated-levels.js';
  a.click();
  URL.revokeObjectURL(url);
};

loadCandidates();
