const STORAGE_KEY = 'task-grabber-progress-v2';
const defaultTasks = [
  { id: 'starter-1', text: 'Plan tomorrow\'s big win' },
  { id: 'starter-2', text: 'Clear out your inbox' },
  { id: 'starter-3', text: 'Take a 10-minute walk' }
];
const toys = [
  { icon: '🧸', name: 'Pocket Bear' }, { icon: '🐢', name: 'Tiny Turtle' }, { icon: '🦄', name: 'Mini Unicorn' },
  { icon: '🐸', name: 'Lucky Frog' }, { icon: '👾', name: 'Pixel Pal' }, { icon: '🐙', name: 'Octo Buddy' }, { icon: '🐱', name: 'Kitty Keychain' }
];
const skins = {
  classic: { name: 'Classic Claw', icon: '🦾', price: 0, description: 'Your trusty starter rig.' },
  silver: { name: 'Silver Claw', icon: '🤍', price: 180, description: 'A cool streak reward.' },
  golden: { name: 'Golden Claw', icon: '✨', price: 500, description: 'The ultimate 500 point goal.' }
};
const shopItems = [
  { id: 'bear', icon: '🧸', name: 'Teddy Bear', price: 35, kind: 'toy', description: 'A soft sidekick.' },
  { id: 'monkey', icon: '🐒', name: 'Rare Monkey', price: 100, kind: 'toy', description: 'A golden favorite.' },
  { id: 'silver', ...skins.silver, kind: 'skin' },
  { id: 'golden', ...skins.golden, kind: 'skin' }
];
const streakRewards = [
  { label: '10 pts', icon: '✦', type: 'points', value: 10 },
  { label: 'Teddy bear', icon: '🧸', type: 'toy', value: 'Teddy Bear' },
  { label: 'Silver claw', icon: '🤍', type: 'skin', value: 'silver' },
  { label: 'Rare monkey', icon: '🐒', type: 'toy', value: 'Rare Monkey' },
  { label: 'Golden claw', icon: '✨', type: 'skin', value: 'golden' }
];

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
const state = Object.assign({ credits: 0, points: 0, completed: 0, tasks: defaultTasks, prizes: [], ownedSkins: ['classic'], equippedSkin: 'classic', streak: 0, lastStreakDate: '', claw: { x: 50, y: 0 }, playing: false, machineMessage: '', pendingPrize: null, claimedShop: [] }, saved || {});
state.tasks = Array.isArray(state.tasks) ? state.tasks : defaultTasks;
state.prizes = Array.isArray(state.prizes) ? state.prizes : [];
state.ownedSkins = Array.isArray(state.ownedSkins) && state.ownedSkins.length ? state.ownedSkins : ['classic'];
state.ownedSkins = state.ownedSkins.filter(id => skins[id]);
if (!state.ownedSkins.length) state.ownedSkins = ['classic'];
if (!skins[state.equippedSkin]) state.equippedSkin = 'classic';
state.claimedShop = Array.isArray(state.claimedShop) ? state.claimedShop : [];
state.points = Math.max(state.points || 0, state.completed * 20);
const el = id => document.getElementById(id);
const taskList = el('taskList'), emptyState = el('emptyState'), prizeFloor = el('prizeFloor');
let toastTimer;

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHTML(value) { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function render() {
  el('creditCount').textContent = state.credits; el('heroCredits').textContent = state.credits; el('taskCount').textContent = state.completed;
  el('openCount').textContent = `${state.tasks.length} OPEN`;
  el('creditMeter').style.width = `${state.credits >= 20 ? (state.credits % 20 || 20) * 5 : state.credits * 5}%`;
  el('goalPoints').textContent = Math.min(500, state.points); const goalPercent = Math.min(100, state.points / 5);
  el('goalMeter').style.width = `${goalPercent}%`; el('goalLargeMeter').style.width = `${goalPercent}%`;
  el('goalCopy').textContent = state.points >= 500 ? 'UNLOCKED — EQUIP IT BELOW' : `${500 - state.points} points to go`;
  emptyState.style.display = state.tasks.length ? 'none' : 'block';
  taskList.innerHTML = state.tasks.map(task => `<li class="task" data-id="${task.id}"><input class="task-check" type="checkbox" aria-label="Complete ${escapeHTML(task.text)}"><span class="task-text">${escapeHTML(task.text)}</span><button class="remove-task" aria-label="Remove task">×</button></li>`).join('');
  prizeFloor.innerHTML = state.tasks.length ? toys.slice(0, 6).map((toy, index) => `<div class="prize" style="left:${6 + index * 16}%;transform:rotate(${index % 2 ? 6 : -5}deg)">${toy.icon}</div>`).join('') : '';
  el('machineWrap').classList.toggle('machine-empty', !state.tasks.length); el('claw').dataset.skin = state.equippedSkin;
  renderCollection(); renderStreak(); renderSkins(); renderShop(); positionClaw(); updateMachineMessage(); persist();
}
function renderCollection() {
  const grouped = state.prizes.reduce((all, toy) => { all[toy.icon] = (all[toy.icon] || 0) + 1; return all; }, {});
  el('collectionTotal').textContent = `${state.prizes.length} PRIZE${state.prizes.length === 1 ? '' : 'S'}`;
  el('collectionGrid').innerHTML = Object.keys(grouped).length ? Object.entries(grouped).map(([icon, number]) => `<div class="collected" title="${number} collected">${icon}<b>×${number}</b></div>`).join('') : '<div class="collection-empty">YOUR FIRST PRIZE IS WAITING...</div>';
}
function renderStreak() {
  const claimedToday = state.lastStreakDate === today(); el('streakCount').textContent = `DAY ${state.streak || 0}`;
  el('streakCopy').textContent = claimedToday ? `Day ${state.streak} claimed! Come back tomorrow for the next prize.` : (state.streak ? `Day ${Math.min(5, state.streak + 1)} is ready to claim.` : 'Your first daily prize is ready.');
  el('claimStreak').textContent = claimedToday ? 'PRIZE CLAIMED TODAY' : "CLAIM TODAY'S PRIZE"; el('claimStreak').disabled = claimedToday;
  el('streakTrack').innerHTML = streakRewards.map((reward, index) => `<div class="streak-reward ${index + 1 <= state.streak ? 'claimed' : ''} ${index + 1 === Math.min(5, state.streak + 1) && !claimedToday ? 'next' : ''}"><span>${reward.icon}</span><b>DAY ${index + 1}</b><small>${reward.label}</small></div>`).join('');
}
function renderSkins() {
  if (state.points >= 500 && !state.ownedSkins.includes('golden')) state.ownedSkins.push('golden');
  el('skinCount').textContent = `${state.ownedSkins.length} SKIN${state.ownedSkins.length === 1 ? '' : 'S'}`;
  el('skinGrid').innerHTML = state.ownedSkins.map(id => { const skin = skins[id]; return `<button class="skin-card ${state.equippedSkin === id ? 'equipped' : ''}" data-skin="${id}"><span>${skin.icon}</span><b>${skin.name}</b><small>${state.equippedSkin === id ? 'EQUIPPED' : 'EQUIP'}</small></button>`; }).join('');
}
function renderShop() {
  el('shopGrid').innerHTML = shopItems.map(item => { const owned = item.kind === 'skin' ? state.ownedSkins.includes(item.id) : state.claimedShop.includes(item.id); return `<div class="shop-card"><span class="shop-icon">${item.icon}</span><div><b>${item.name}</b><small>${item.description}</small></div><button class="shop-buy" data-shop="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : `${item.price} PTS`}</button></div>`; }).join('');
}
function positionClaw() { const claw = el('claw'); claw.style.left = `${state.claw.x}%`; claw.style.top = `${state.claw.y}px`; }
function updateMachineMessage() { if (!state.playing) el('machineMessage').textContent = !state.tasks.length ? 'ADD A QUEST TO FILL THE MACHINE!' : state.machineMessage || (state.credits >= 20 ? 'Ready to play — take a shot!' : `Earn ${20 - state.credits} more points to play!`); }
function showToast(message) { const toast = el('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
function today() { return new Date().toISOString().slice(0, 10); }
function yesterday() { const date = new Date(); date.setDate(date.getDate() - 1); return date.toISOString().slice(0, 10); }
function addTask(text) { state.tasks.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text }); render(); }
function prizeForTask(task) { const text = task.text.toLowerCase(); return toys.find(toy => text.includes(toy.name.toLowerCase()) || (toy.icon === '🐸' && text.includes('frog')) || (toy.icon === '🐱' && /cat|kitten|kitty/.test(text)) || (toy.icon === '🐢' && /turtle|tortoise/.test(text)) || (toy.icon === '🧸' && /bear|teddy/.test(text)) || (toy.icon === '🦄' && text.includes('unicorn')) || (toy.icon === '🐙' && /octopus|octo/.test(text)) || (toy.icon === '👾' && /pixel pal|alien/.test(text))); }
function toggleTask(id) { const task = state.tasks.find(item => item.id === id); if (!task) return; state.credits += 20; state.points += 20; state.completed++; state.pendingPrize = prizeForTask(task) || state.pendingPrize; state.tasks = state.tasks.filter(item => item.id !== id); state.machineMessage = 'Ready to play — take a shot!'; showToast('QUEST COMPLETE! +20 POINTS'); render(); }
function moveClaw(dx, dy) { if (state.playing) return; state.claw.x = Math.max(6, Math.min(88, state.claw.x + dx)); state.claw.y = Math.max(0, Math.min(116, state.claw.y + dy)); positionClaw(); }
async function grab() { if (state.playing) return; if (!state.tasks.length) return showToast('ADD A QUEST TO FILL THE MACHINE!'); if (state.credits < 20) return showToast('NOT ENOUGH POINTS — COMPLETE A QUEST!'); state.playing = true; state.credits -= 20; state.machineMessage = 'CLAW DEPLOYING...'; render(); const originalY = state.claw.y; state.claw.y = 122; positionClaw(); await new Promise(resolve => setTimeout(resolve, 700)); if (Math.random() > .25) { const toy = state.pendingPrize || toys[Math.floor(Math.random() * toys.length)]; state.pendingPrize = null; state.prizes.push(toy); state.machineMessage = `YOU GOT A ${toy.name.toUpperCase()}!`; showToast(`PRIZE UNLOCKED: ${toy.icon} ${toy.name.toUpperCase()}!`); } else { state.machineMessage = 'SO CLOSE! TRY AGAIN.'; showToast('THE CLAW SLIPPED!'); } state.claw.y = originalY; state.playing = false; render(); }
function claimStreak() { if (state.lastStreakDate === today()) return; state.streak = state.lastStreakDate === yesterday() ? Math.min(5, state.streak + 1) : 1; state.lastStreakDate = today(); const reward = streakRewards[state.streak - 1]; if (reward.type === 'points') { state.credits += reward.value; state.points += reward.value; } if (reward.type === 'toy') state.prizes.push({ icon: reward.icon, name: reward.value }); if (reward.type === 'skin' && !state.ownedSkins.includes(reward.value)) state.ownedSkins.push(reward.value); showToast(`DAY ${state.streak} REWARD: ${reward.icon} ${reward.label.toUpperCase()}!`); render(); }
function buyItem(id) { const item = shopItems.find(entry => entry.id === id); if (!item || state.credits < item.price) return showToast(item ? `NEED ${item.price - state.credits} MORE POINTS!` : 'ITEM NOT FOUND'); if (item.kind === 'skin') state.ownedSkins.push(item.id); else { state.claimedShop.push(item.id); state.prizes.push({ icon: item.icon, name: item.name }); } state.credits -= item.price; showToast(`${item.name.toUpperCase()} ADDED TO YOUR COLLECTION!`); render(); }

el('taskForm').addEventListener('submit', event => { event.preventDefault(); const input = el('taskInput'); const text = input.value.trim(); if (!text) return; addTask(text); input.value = ''; input.focus(); });
taskList.addEventListener('change', event => { if (event.target.classList.contains('task-check')) toggleTask(event.target.closest('.task').dataset.id); });
taskList.addEventListener('click', event => { if (event.target.classList.contains('remove-task')) { state.tasks = state.tasks.filter(task => task.id !== event.target.closest('.task').dataset.id); render(); } });
el('claimStreak').addEventListener('click', claimStreak);
el('skinGrid').addEventListener('click', event => { const card = event.target.closest('[data-skin]'); if (!card) return; state.equippedSkin = card.dataset.skin; showToast(`${skins[state.equippedSkin].name.toUpperCase()} EQUIPPED!`); render(); });
el('shopGrid').addEventListener('click', event => { const button = event.target.closest('[data-shop]'); if (button) buyItem(button.dataset.shop); });
el('grabButton').addEventListener('click', grab);
el('machineWrap').addEventListener('keydown', event => { const keys = { w: [0, -12], a: [-7, 0], s: [0, 12], d: [7, 0] }; const key = event.key.toLowerCase(); if (keys[key]) { event.preventDefault(); moveClaw(...keys[key]); } if (event.code === 'Space') { event.preventDefault(); grab(); } });
document.addEventListener('keydown', event => { if (document.activeElement.tagName === 'INPUT') return; const keys = { w: [0, -12], a: [-7, 0], s: [0, 12], d: [7, 0] }; const key = event.key.toLowerCase(); if (keys[key]) { event.preventDefault(); el('machineWrap').focus(); moveClaw(...keys[key]); } if (event.code === 'Space') { event.preventDefault(); grab(); } });
el('soundButton').addEventListener('click', event => { event.currentTarget.textContent = event.currentTarget.textContent === '♫' ? '×' : '♫'; });
render();
