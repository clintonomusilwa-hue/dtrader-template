/* eslint-disable */
const $ = s => document.querySelector(s),
    $$ = s => [...document.querySelectorAll(s)];
const el = id => document.getElementById(id);
// The screenshots show one shared control strip above two independently scrollable panes.
const strip = $('.top-controls');
$('.workleft').insertBefore(strip, $('.columns'));
let state = {
    market: 'V75',
    type: 'Under',
    barrier: 2,
    mode: 'Martingale',
    digitMode: 'fixed',
    targetDigit: 2,
    gate: 'bias',
    running: false,
    alternate: false,
    ai: false,
    seq: 5,
    patternTab: 'Over / Under',
    window: 1000,
    price: 43579.6107,
    digits: Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10)),
    losses: 0,
    wins: 0,
    streak: 0,
    martingaleStep: 0,
    listIndex: 0,
    balance: 10323.28,
    placed: 0,
    pl: 0,
    totalStake: 0,
    payout: 0,
    trades: [],
    freeRun: false,
    previousGate: false,
    recovering: false,
    lastStopReason: null,
};
// Build one internally consistent simulated price history. Integer price units
// preserve the displayed fourth decimal place and the previous tick direction.
state.prices = [435796107];
for (let i = 0; i < 5000; i++) {
    let step = (Math.floor(Math.random() * 20) + 1) * (Math.random() < 0.5 ? -1 : 1);
    state.prices.unshift(state.prices[0] - step);
}
state.digits = state.prices.slice(1).map(p => Math.abs(p) % 10);
state.price = state.prices.at(-1) / 10000;
// Independent simulated histories so market switching changes the data, too.
const marketNames = [
    'V10',
    'V25',
    'V50',
    'V75',
    'V100',
    'V10s',
    'V25s',
    'V50s',
    'V75s',
    'V100s',
    'J10',
    'J25',
    'J50',
    'J75',
    'J100',
    'Bull',
    'Bear',
];
const marketData = { V75: { prices: state.prices, digits: state.digits } };
for (const [idx, name] of marketNames.entries())
    if (name !== 'V75') {
        let prices = [(1000000 + idx * 3200000) * 100];
        for (let i = 0; i < 5000; i++) {
            let step = (Math.floor(Math.random() * 20) + 1) * (Math.random() < 0.5 ? -1 : 1);
            prices.unshift(prices[0] - step);
        }
        marketData[name] = { prices, digits: prices.slice(1).map(p => Math.abs(p) % 10) };
    }
function switchMarket(name) {
    if (!marketData[name]) return;
    if (state.market !== name) state.previousGate = false;
    state.market = name;
    state.prices = marketData[name].prices;
    state.digits = marketData[name].digits;
    state.price = state.prices.at(-1) / 10000;
    $$('.market-picker .pills button').forEach(b => b.classList.toggle('active', b.textContent === name));
    updateConfig();
}
// Each panel is independently scrollable. The strip stays put so scrolling one
// panel never moves the others or changes the height of their scroll areas.
// Draggable, keyboard-accessible dividers let the user resize the three panels.
const innerSplitter = document.createElement('div');
innerSplitter.className = 'pane-splitter inner-splitter';
innerSplitter.setAttribute('role', 'separator');
innerSplitter.setAttribute('aria-label', 'Resize market and settings panels');
innerSplitter.setAttribute('aria-orientation', 'vertical');
innerSplitter.tabIndex = 0;
$('.columns').insertBefore(innerSplitter, el('settingsScroll'));
const outerSplitter = document.createElement('div');
outerSplitter.className = 'pane-splitter outer-splitter';
outerSplitter.setAttribute('role', 'separator');
outerSplitter.setAttribute('aria-label', 'Resize settings and transactions panels');
outerSplitter.setAttribute('aria-orientation', 'vertical');
outerSplitter.tabIndex = 0;
$('.workspace').insertBefore(outerSplitter, $('.right-scroll'));
function resizeInner(clientX) {
    let rect = $('.columns').getBoundingClientRect();
    let z = uiScale(),
        width = Math.max(260, Math.min(rect.width / z - 270, (clientX - rect.left) / z));
    $('.columns').style.setProperty('--market-width', width + 'px');
}
function resizeOuter(clientX) {
    let rect = $('.workspace').getBoundingClientRect();
    let z = uiScale(),
        width = Math.max(240, Math.min(rect.width / z - 560, (rect.right - clientX) / z));
    $('.workspace').style.setProperty('--right-width', width + 'px');
}
function makeDraggable(handle, resize) {
    handle.addEventListener('pointerdown', e => {
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        handle.classList.add('dragging');
        resize(e.clientX);
    });
    handle.addEventListener('pointermove', e => {
        if (handle.hasPointerCapture(e.pointerId)) resize(e.clientX);
    });
    handle.addEventListener('pointerup', e => {
        handle.classList.remove('dragging');
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    });
    handle.addEventListener('pointercancel', () => handle.classList.remove('dragging'));
    handle.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        let r = handle.getBoundingClientRect();
        resize(r.left + (e.key === 'ArrowLeft' ? -20 : 20));
    });
}
makeDraggable(innerSplitter, resizeInner);
makeDraggable(outerSplitter, resizeOuter);
function toast(message) {
    let t = el('toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}
function uiScale() {
    return window.innerWidth <= 1000
        ? Number(getComputedStyle(document.documentElement).getPropertyValue('--phone-scale')) || 1
        : 1;
}
function format(n) {
    return Number(n).toFixed(2);
}
function money(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function updateDemoBalance() {
    el('demoBalance').textContent = state.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
// Internal O/U codes mean first/second outcome; map to visible letters below.
function currentCodes() {
    return state.digits.map((d, i) =>
        state.patternTab === 'Even / Odd'
            ? d % 2
                ? 'U'
                : 'O'
            : state.patternTab === 'Rise / Fall'
              ? state.prices[i + 1] > state.prices[i]
                  ? 'O'
                  : state.prices[i + 1] < state.prices[i]
                    ? 'U'
                    : 'N'
              : d > state.barrier
                ? 'O'
                : d < state.barrier
                  ? 'U'
                  : 'N'
    );
}
function displayCode(c) {
    if (c === 'N') return 'N';
    if (state.patternTab === 'Even / Odd') return c === 'O' ? 'E' : 'O';
    if (state.patternTab === 'Rise / Fall') return c === 'O' ? 'R' : 'F';
    return c;
}
function visibleCodes() {
    return currentCodes().map(displayCode);
}
function setActive(container, button) {
    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}
function marketName(s) {
    if (s === 'Bull' || s === 'Bear') return s + ' Market';
    if (s.startsWith('J')) return 'Jump ' + s.slice(1);
    return 'Volatility ' + s.slice(1).replace('s', ' (1s)');
}
function updateConfig() {
    let stake = Math.max(0, Number(el('stake').value) || 0),
        mul = Number(el('multiplier').value) || 1;
    el('marketTitle').textContent = marketName(state.market);
    $$('.market-short').forEach(x => (x.textContent = state.market));
    let hasBarrier = ['Over', 'Under'].includes(state.type),
        hasDigit = ['Matches', 'Differs'].includes(state.type);
    el('playBarrierField').hidden = !hasBarrier;
    el('digitControls').hidden = !hasDigit;
    let tradeLabel = state.type + (hasBarrier ? ' ' + state.barrier : hasDigit ? ' ' + state.targetDigit : '');
    el('playSummary').textContent = tradeLabel + ' · ' + el('duration').value + 't';
    el('barrierInput').value = state.barrier;
    el('barrierHelp').textContent =
        state.type === 'Over'
            ? 'wins when the last digit is above it'
            : state.type === 'Under'
              ? 'wins when the last digit is below it'
              : 'contract depends on the selected result';
    el('alternateText').textContent = state.alternate
        ? 'On — alternating trades'
        : 'Off — ' + state.type + ' every trade';
    el('stakeSummary').textContent =
        state.mode === 'Martingale'
            ? 'step ' +
              state.martingaleStep +
              ' / ' +
              el('maxSteps').value +
              ' · next ' +
              (Number.isFinite(nextStake()) ? format(nextStake()) : '—')
            : state.mode === 'Auto-stake'
              ? el('autoStakePercent').value + '% of demo balance'
              : state.mode === 'Stakelist'
                ? 'step ' + (state.listIndex + 1)
                : 'Flat · ' + format(stake);
    el('stopSummary').textContent = 'TP ' + el('takeProfit').value + ' · SL ' + el('stopLoss').value;
    el('idleDescription').textContent =
        tradeLabel +
        ' · ' +
        el('duration').value +
        't · ' +
        state.market +
        ' · ' +
        (state.gate === 'none' ? 'every cycle' : 'gated') +
        ' · ' +
        state.mode.toLowerCase() +
        (state.mode === 'Martingale' ? ' ×' + mul + ' from ' + format(stake) : '');
    el('nextStake').textContent = Number.isFinite(nextStake()) ? format(nextStake()) + ' USD' : '—';
    updateStakeWarning();
    el('tickCount').textContent = state.window;
    el('patternWindow').textContent = state.window;
    el('historyTotal').textContent = state.window;
}
function stakeListValues() {
    let parts = el('stakeList')
        .value.split(',')
        .map(x => x.trim());
    if (!parts.length || parts.some(x => x === '' || !Number.isFinite(Number(x)) || Number(x) < 0.35)) return null;
    return parts.map(x => money(Number(x)));
}
function nextStake() {
    let stake = Number(el('stake').value);
    if (state.mode === 'Martingale')
        return money(stake * Math.pow(Number(el('multiplier').value), state.martingaleStep));
    if (state.mode === 'Stakelist') {
        let list = stakeListValues();
        return list ? list[Math.min(state.listIndex, list.length - 1)] : NaN;
    }
    if (state.mode === 'Auto-stake') return money((state.balance * Number(el('autoStakePercent').value)) / 100);
    return money(stake);
}
function stakeError() {
    let mode = state.mode,
        base = Number(el('stake').value),
        stake = nextStake();
    if (
        (mode === 'Flat' || mode === 'Martingale') &&
        (el('stake').value === '' || !Number.isFinite(base) || base < 0.35)
    )
        return 'Enter a base stake of at least 0.35 USD.';
    if (mode === 'Martingale') {
        let mul = Number(el('multiplier').value),
            max = Number(el('maxSteps').value);
        if (el('multiplier').value === '' || !Number.isFinite(mul) || mul < 1)
            return 'Enter a martingale multiplier of at least 1.';
        if (el('maxSteps').value === '' || !Number.isInteger(max) || max < 0)
            return 'Max steps must be a whole number of 0 or more.';
    }
    if (mode === 'Stakelist' && !stakeListValues())
        return 'Enter a comma-separated list of stakes, each at least 0.35 USD.';
    if (mode === 'Auto-stake') {
        let pct = Number(el('autoStakePercent').value);
        if (el('autoStakePercent').value === '' || !Number.isFinite(pct) || pct <= 0 || pct > 100)
            return 'Enter an auto-stake percentage above 0 and at most 100.';
    }
    if (!Number.isFinite(stake) || stake < 0.35) return 'The next calculated stake must be at least 0.35 USD.';
    if (stake > state.balance) return 'The next stake exceeds the available simulated balance.';
    return '';
}
function limitInputError() {
    for (const id of ['takeProfit', 'stopLoss', 'tradeLimit', 'lossLimit']) {
        let input = el(id),
            n = Number(input.value);
        if (input.value === '' || !Number.isFinite(n) || n < 0) return 'Stop limits must be zero or positive numbers.';
        if ((id === 'tradeLimit' || id === 'lossLimit') && !Number.isInteger(n))
            return 'Trade and consecutive-loss limits must be whole numbers.';
    }
    return '';
}
function reachedStopLimit() {
    let tp = +el('takeProfit').value,
        sl = +el('stopLoss').value,
        tl = +el('tradeLimit').value,
        ll = +el('lossLimit').value;
    if (tp > 0 && state.pl >= tp) return 'Take profit reached.';
    if (sl > 0 && state.pl <= -sl) return 'Stop loss reached.';
    if (tl > 0 && state.placed >= tl) return 'Trade limit reached.';
    if (ll > 0 && state.streak >= ll) return 'Consecutive-loss limit reached.';
    return '';
}
function updateStakeWarning() {
    let msg = stakeError();
    el('stakeWarning').textContent = msg;
    el('stakeWarning').hidden = !msg;
}
function refreshTargetDigit(counts) {
    if (state.digitMode === 'least' || state.digitMode === 'most' || state.digitMode === 'second') {
        let order = Array.from({ length: 10 }, (_, digit) => digit);
        order.sort((a, b) =>
            state.digitMode === 'least' ? counts[a] - counts[b] || a - b : counts[b] - counts[a] || a - b
        );
        state.targetDigit = order[state.digitMode === 'second' ? 1 : 0];
    }
    el('whichDigit').value = state.targetDigit;
    let notes = {
        fixed: 'Select a digit manually',
        random: 'Random digit chosen for each trade',
        least: 'Least frequent in the current window',
        most: 'Most frequent in the current window',
        second: 'Second most frequent in the current window',
    };
    el('digitModeHelp').textContent = notes[state.digitMode];
}
function render() {
    let digits = state.digits.slice(-state.window),
        latest = digits.at(-1),
        codes = currentCodes().slice(-state.window);
    el('quote').textContent = state.price.toFixed(4);
    el('lastDigit').textContent = latest;
    el('ticks').innerHTML = digits
        .slice(-17)
        .map(d => `<span class="tick ${d % 3 === 0 ? 'orange' : ''}">${d}</span>`)
        .join('');
    let counts = Array(10).fill(0);
    digits.forEach(d => counts[d]++);
    refreshTargetDigit(counts);
    if (['Matches', 'Differs'].includes(state.type)) updateConfig();
    let at = counts[state.barrier],
        neutral = codes.filter(c => c === 'N').length;
    let overPct = (codes.filter(c => c === 'O').length / digits.length) * 100,
        underPct = (codes.filter(c => c === 'U').length / digits.length) * 100;
    let labelA = state.patternTab === 'Even / Odd' ? 'Even' : state.patternTab === 'Rise / Fall' ? 'Rise' : 'Over',
        labelB = state.patternTab === 'Even / Odd' ? 'Odd' : state.patternTab === 'Rise / Fall' ? 'Fall' : 'Under';
    el('neutralSummary').textContent =
        state.patternTab === 'Over / Under'
            ? `${at} digits on the barrier (N)`
            : state.patternTab === 'Rise / Fall'
              ? `${neutral} flat ticks (N)`
              : 'last-digit parity';
    el('overLabel').textContent = labelA + ' ' + overPct.toFixed(1) + '%';
    el('underLabel').textContent = underPct.toFixed(1) + '% ' + labelB;
    el('overBar').style.width = overPct + '%';
    el('underBar').style.width = underPct + '%';
    el('patternLegend').textContent =
        state.patternTab === 'Over / Under'
            ? `O = last digit above ${state.barrier}, U = below ${state.barrier}`
            : `${displayCode('O')} = ${labelA.toLowerCase()}, ${displayCode('U')} = ${labelB.toLowerCase()}${state.patternTab === 'Rise / Fall' ? ' compared with the previous tick' : ''}`;
    el('barriers').innerHTML = Array.from(
        { length: 10 },
        (_, i) => `<button class="${i === state.barrier ? 'active' : ''}" data-value="${i}">${i}</button>`
    ).join('');
    el('barriers')
        .querySelectorAll('button')
        .forEach(
            b =>
                (b.onclick = () => {
                    state.barrier = +b.dataset.value;
                    state.previousGate = false;
                    updateConfig();
                    render();
                })
        );
    el('legendA').textContent = displayCode('O');
    el('legendB').textContent = displayCode('U');
    el('legendLabelA').textContent = labelA;
    el('legendLabelB').textContent = labelB;
    el('neutralLegend').hidden = state.patternTab === 'Even / Odd';
    el('neutralLegend').innerHTML =
        `<em class="block-n">N</em> ${state.patternTab === 'Rise / Fall' ? 'flat tick' : 'on the barrier'}`;
    el('runLabelA').textContent = labelA.toUpperCase() + ' RUNS';
    el('runLabelB').textContent = labelB.toUpperCase() + ' RUNS';
    el('historyGrid').innerHTML = codes
        .slice(-100)
        .map(
            c =>
                `<span class="${c.toLowerCase()}" title="${c === 'N' ? 'Neutral' : c === 'O' ? labelA : labelB}">${displayCode(c)}</span>`
        )
        .join('');
    let runs = [];
    codes.forEach(c => {
        let x = runs.at(-1);
        if (x && x.c === c) x.n++;
        else runs.push({ c, n: 1 });
    });
    let stats = c => {
        let r = runs.filter(x => x.c === c).map(x => x.n);
        return `longest ${Math.max(0, ...r)}<br>average ${r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1) : '0.0'}<br><span class="muted">${r.length} runs</span>`;
    };
    el('overRuns').innerHTML = stats('O');
    el('underRuns').innerHTML = stats('U');
    el('nowRun').textContent =
        runs.at(-1)?.c === 'N' ? '—' : `${runs.at(-1)?.n}× ${runs.at(-1)?.c === 'O' ? labelA : labelB}`;
    let sequences = {};
    for (let i = 0; i <= codes.length - state.seq; i++) {
        let s = codes.slice(i, i + state.seq).join('');
        if (!s.includes('N')) sequences[s] = (sequences[s] || 0) + 1;
    }
    let ranked = Object.entries(sequences).sort((a, b) => b[1] - a[1]);
    let total = Object.values(sequences).reduce((a, b) => a + b, 0) || 1;
    function seqRow([s, n], max) {
        return `<div class="seq-row">${[...s].map(c => `<span class="seq-digit ${c.toLowerCase()}">${displayCode(c)}</span>`).join('')}<span class="seq-bar"><i style="width:${(n / max) * 100}%"></i></span><b>×${n} <small>${((n / total) * 100).toFixed(1)}%</small></b></div>`;
    }
    el('sequenceList').innerHTML = ranked
        .slice(0, 5)
        .map(x => seqRow(x, ranked[0]?.[1] || 1))
        .join('');
    let combinations = Array.from({ length: 2 ** state.seq }, (_, i) =>
        i.toString(2).padStart(state.seq, '0').replaceAll('0', 'O').replaceAll('1', 'U')
    );
    let least = combinations
        .map(s => [s, sequences[s] || 0])
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);
    el('leastList').innerHTML = least.map(x => seqRow(x, ranked[0]?.[1] || 1)).join('');
    // Presets and instructions use exactly the same letters as the visible history.
    $$('.gate-tag').forEach((b, i) => {
        let seq = ranked[i];
        b.hidden = !seq;
        if (seq) b.textContent = [...seq[0]].map(displayCode).join('') + ' ×' + seq[1];
    });
    if (state.gate === 'pattern' || state.gate === 'common')
        el('gateHelp').textContent =
            state.patternTab === 'Over / Under'
                ? `O = above barrier, U = below barrier, N = on barrier; newest tick last.`
                : state.patternTab === 'Even / Odd'
                  ? 'E = even digit, O = odd digit; newest tick last.'
                  : 'R = rise, F = fall, N = flat; each tick is compared with the preceding price.';
    el('nextText').textContent =
        latest === state.barrier && state.patternTab === 'Over / Under'
            ? 'The latest digit is on the barrier.'
            : `Latest reading: ${displayCode(codes.at(-1))}. Past patterns do not predict the next tick.`;
    let even = (digits.filter(d => d % 2 === 0).length / digits.length) * 100;
    el('evenPercent').textContent = even.toFixed(1) + '%';
    el('oddPercent').textContent = (100 - even).toFixed(1) + '%';
    el('evenBar').style.width = even + '%';
    el('oddBar').style.width = 100 - even + '%';
    let parity = digits.map(d => (d % 2 ? 'O' : 'E'));
    let changes = state.prices.slice(-(digits.length + 1));
    let directions = digits.map((_, i) =>
        changes[i + 1] > changes[i] ? 'R' : changes[i + 1] < changes[i] ? 'F' : 'N'
    );
    function trailing(arr) {
        let last = arr.at(-1),
            n = 0;
        for (let i = arr.length - 1; i >= 0 && arr[i] === last; i--) n++;
        return n;
    }
    function commonTriples(arr) {
        let counts = {};
        for (let i = 0; i <= arr.length - 3; i++) {
            let k = arr.slice(i, i + 3).join('');
            counts[k] = (counts[k] || 0) + 1;
        }
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, n]) => `<span class="tag">${k} ×${n}</span>`)
            .join(' ');
    }
    el('parityRun').textContent = trailing(parity) + '× ' + (latest % 2 ? 'odd' : 'even');
    el('parityCommon').innerHTML = commonTriples(parity);
    let rises = (directions.filter(x => x === 'R').length / directions.length) * 100,
        falls = (directions.filter(x => x === 'F').length / directions.length) * 100;
    el('risePercent').textContent = rises.toFixed(1) + '%';
    el('fallPercent').textContent = falls.toFixed(1) + '%';
    el('riseBar').style.width = rises + '%';
    el('fallBar').style.width = falls + '%';
    el('directionRun').textContent =
        trailing(directions) +
        '× ' +
        (directions.at(-1) === 'R' ? 'rise' : directions.at(-1) === 'F' ? 'fall' : 'flat');
    el('flatCount').textContent = directions.filter(x => x === 'N').length;
    el('directionCommon').innerHTML = commonTriples(directions);
    let max = Math.max(...counts),
        min = Math.min(...counts),
        most = counts.indexOf(max),
        leastDigit = counts.indexOf(min);
    el('digitSummary').textContent = `most ${most} · least ${leastDigit} · alternation 64.2%`;
    el('digitChart').innerHTML = counts
        .map(
            (n, i) =>
                `<div class="digit-col ${i === most ? 'most' : i === leastDigit ? 'least' : ''} ${i === latest ? 'latest' : ''}" style="height:${Math.max(8, (n / max) * 72)}px" title="${i}: ${n} ticks"><span>${i}</span></div>`
        )
        .join('');
    el('barrierChart').innerHTML = counts
        .map(
            (n, i) =>
                `<div class="barrier-col ${i === state.barrier ? 'active' : ''}" data-barrier="${i}" title="Set barrier ${i}"><div class="up" style="height:${(9 - i) * 4}px"></div><b>${i}</b><div class="down" style="height:${i * 4}px"></div></div>`
        )
        .join('');
    el('barrierChart')
        .querySelectorAll('.barrier-col')
        .forEach(
            x =>
                (x.onclick = () => {
                    state.barrier = +x.dataset.barrier;
                    updateConfig();
                    render();
                })
        );
    updateGateState();
}
function observedBias() {
    let ds = state.digits.slice(-state.window),
        n = ds.length;
    if (!n) return 0;
    let hits;
    if (state.type === 'Even') hits = ds.filter(d => d % 2 === 0).length;
    else if (state.type === 'Odd') hits = ds.filter(d => d % 2 !== 0).length;
    else if (state.type === 'Over') hits = ds.filter(d => d > state.barrier).length;
    else if (state.type === 'Under') hits = ds.filter(d => d < state.barrier).length;
    else if (state.type === 'Matches') hits = ds.filter(d => d === state.targetDigit).length;
    else if (state.type === 'Differs') hits = ds.filter(d => d !== state.targetDigit).length;
    else {
        let prices = state.prices.slice(-(n + 1));
        hits = ds.filter((_, i) =>
            state.type === 'Rise' ? prices[i + 1] > prices[i] : prices[i + 1] < prices[i]
        ).length;
    }
    return (hits / n) * 100;
}
function updateGateState() {
    let good = false,
        description = '';
    if (state.gate === 'bias') {
        let threshold = Number(el('gatePattern').value),
            bias = observedBias();
        good =
            el('gatePattern').value !== '' &&
            Number.isFinite(threshold) &&
            threshold >= 0 &&
            threshold <= 100 &&
            bias >= threshold;
        description = `${bias.toFixed(1)}% ${good ? '≥' : '<'} ${Number.isFinite(threshold) ? threshold : '—'}%`;
    } else {
        let pattern = el('gatePattern').value.toUpperCase(),
            current = visibleCodes().slice(-pattern.length).join('');
        good = !!pattern && current === pattern;
        description = `${current || '—'} ${good ? '=' : '≠'} ${pattern || '—'}`;
    }
    let behavior = el('afterGate').value,
        label = good ? 'Would trade now' : 'Holding',
        permitted = good;
    if (behavior === 'Once, then free-run' && state.freeRun) {
        label = 'Free-running — gate bypassed';
        permitted = true;
    } else if (behavior === 'Ignore while recovering' && state.recovering) {
        label = 'Recovering — gate bypassed';
        permitted = true;
    } else if (behavior === 'Each new occurrence' && good && state.previousGate) {
        label = 'Waiting for a new occurrence';
        permitted = false;
    }
    el('gateState').classList.toggle('good', permitted);
    el('gateState').replaceChildren(
        Object.assign(document.createElement('span'), { className: 'amber-dot' }),
        document.createTextNode(` ${label}  ${description}`)
    );
    return good;
}
function renderSummary() {
    const dot = el('summaryDot'),
        behavior = el('afterGate').value;
    let title = 'Bot is not running',
        subtitle = 'Choose your settings, then press Run.',
        activity = 'Waiting to start.',
        kind = '';
    let gateDescription =
        state.gate === 'bias'
            ? `observed ${state.type.toLowerCase()} frequency to reach ${el('gatePattern').value || '0'}% (currently ${observedBias().toFixed(1)}%)`
            : `the latest ticks to match ${el('gatePattern').value.toUpperCase() || 'a sequence'}`;
    if (state.running) {
        kind = 'running';
        if (pendingTrade) {
            title = 'Bot is running';
            subtitle = 'A simulated contract is open.';
            activity =
                `Waiting for ${pendingTrade.market} ${pendingTrade.type} to settle (${pendingTrade.remaining} tick${pendingTrade.remaining === 1 ? '' : 's'} remaining).` +
                (Number(el('tradeLimit').value) > 0 && state.placed >= Number(el('tradeLimit').value)
                    ? ' Trade limit reached; no new trades will open.'
                    : '');
        } else if (state.ai && !aiScanValid) {
            kind = 'waiting';
            title = 'Bot is waiting for the scanner';
            subtitle = 'No new trades will open until the selected signals have been scanned.';
            activity = 'Scanning or awaiting valid market and contract selections.';
        } else if (behavior === 'Once, then free-run' && state.freeRun) {
            title = 'Bot is running';
            subtitle = 'Free-run is active.';
            activity = 'The entry gate has been passed; the bot can continue without checking it.';
        } else if (behavior === 'Ignore while recovering' && state.recovering) {
            title = 'Bot is running';
            subtitle = 'Recovery is active.';
            activity = 'The gate is bypassed until the next winning simulated trade.';
        } else {
            let condition = updateGateState();
            if (!condition) {
                kind = 'waiting';
                title = 'Bot is waiting for the entry gate';
                subtitle = 'No trade is open.';
                activity = `Waiting for ${gateDescription}.`;
            } else if (behavior === 'Each new occurrence' && state.previousGate) {
                kind = 'waiting';
                title = 'Bot is waiting for a new occurrence';
                subtitle = 'No trade is open.';
                activity = 'The condition must become false and then true again.';
            } else {
                title = 'Bot is running';
                subtitle = 'Entry condition is met.';
                activity = 'Preparing the next simulated trade.';
            }
        }
    } else if (scannerMonitoring) {
        subtitle = 'The scanner is monitoring; execution is stopped.';
        activity = 'No trades will be placed until you start the bot.';
    } else if (state.lastStopReason) {
        subtitle = 'Last stop: ' + state.lastStopReason;
        activity = 'Adjust your settings or press Run to start again.';
    }
    dot.className = 'summary-status-dot' + (kind ? ' ' + kind : '');
    el('summaryTitle').textContent = title;
    el('summarySubtitle').textContent = subtitle;
    el('summaryActivity').textContent = activity;
    el('summaryMarket').textContent = marketName(state.market);
    let target = ['Over', 'Under'].includes(state.type)
        ? ' ' + state.barrier
        : ['Matches', 'Differs'].includes(state.type)
          ? ' ' + state.targetDigit
          : '';
    let duration = Math.max(1, Number(el('duration').value) || 1);
    el('summaryContract').textContent = state.type + target + ' · ' + duration + ' tick' + (duration === 1 ? '' : 's');
    el('summaryGate').textContent =
        state.gate === 'bias'
            ? 'Bias ≥ ' + el('gatePattern').value + '%'
            : (state.gate === 'pattern' ? 'Pattern ' : 'Common sequence ') + el('gatePattern').value.toUpperCase();
    el('summaryBehavior').textContent = behavior;
    el('summaryStake').textContent = Number.isFinite(nextStake()) ? format(nextStake()) + ' USD' : '—';
    el('summaryScanner').textContent = state.ai
        ? 'AI scanner: active · simulated markets'
        : scannerMonitoring
          ? 'AI scanner: monitoring · not trading'
          : 'AI scanner: off';
    el('emptyReason').textContent = state.running
        ? 'Waiting for the first simulated trade to settle'
        : 'The bot is not running';
}
function renderRightJournal() {
    let box = el('rightJournalEntries');
    box.replaceChildren();
    if (!aiJournal.length) {
        let empty = document.createElement('div');
        empty.className = 'ai-log-empty';
        empty.textContent = 'No journal entries yet.';
        box.append(empty);
        return;
    }
    aiJournal
        .slice()
        .reverse()
        .forEach(event => {
            let row = document.createElement('div');
            row.className = 'ai-log-row';
            let time = document.createElement('small');
            time.textContent = event.time;
            let text = document.createElement('span');
            text.textContent = event.text;
            row.append(time, text);
            box.append(row);
        });
}
function renderTotals() {
    el('sessionPL').innerHTML = format(state.pl) + '<br>USD';
    el('sessionWL').textContent = state.wins + ' / ' + state.losses;
    el('hitRate').textContent = state.trades.length ? ((state.wins / state.trades.length) * 100).toFixed(0) + '%' : '—';
    el('lossStreak').textContent = state.streak;
    el('totalStake').textContent = format(state.totalStake) + ' USD';
    el('totalPayout').textContent = format(state.payout) + ' USD';
    el('totalRuns').textContent = state.placed;
    el('totalLost').textContent = state.losses;
    el('totalWon').textContent = state.wins;
    el('totalPL').textContent = format(state.pl) + ' USD';
    el('emptyState').style.display = state.trades.length ? 'none' : '';
    el('sessionEmpty').style.display = state.trades.length ? 'none' : '';
    el('transactionList').innerHTML = state.trades
        .slice()
        .reverse()
        .slice(0, 8)
        .map(
            t =>
                `<div class="trade-row"><b>${t.type} ${t.barrier}</b><span>${t.entry} / ${t.exit}</span><span class="${t.win ? 'win' : 'loss'}">${format(t.stake)} / ${t.profit >= 0 ? '+' : ''}${format(t.profit)}</span></div>`
        )
        .join('');
    el('sessionTrades').innerHTML = state.trades
        .slice()
        .reverse()
        .slice(0, 10)
        .map(
            t =>
                `<div class="trade-row"><span>${t.type} ${t.barrier} · ${t.win ? 'Won' : 'Lost'}</span><b class="${t.win ? 'win' : 'loss'}">${t.profit >= 0 ? '+' : ''}${format(t.profit)} USD</b></div>`
        )
        .join('');
    updateConfig();
    renderAiLog();
    renderSummary();
}
function stop(reason = 'Stopped manually') {
    let wasActive = state.running || state.ai;
    state.running = false;
    clearTimeout(scanDebounce);
    if (manualScanInProgress) {
        cancelVisibleScan();
        el('signalBox').innerHTML =
            '<div class="signal-placeholder">Scan stopped. Run the scanner to compare signals.</div>';
    }
    pendingFilteredSignal = null;
    if (pendingTrade) {
        state.balance = money(state.balance + pendingTrade.stake);
        state.totalStake = money(state.totalStake - pendingTrade.stake);
        journal('Open simulated trade cancelled; its stake was returned.');
        pendingTrade = null;
        updateDemoBalance();
        el('totalStake').textContent = format(state.totalStake) + ' USD';
    }
    state.ai = false;
    scannerMonitoring = false;
    el('aiBtn').classList.remove('enabled');
    el('aiStop').disabled = true;
    el('scannerStatus').textContent = 'Stopped';
    el('scannerPulse').classList.remove('active');
    el('runBtn').innerHTML = '▶ &nbsp;Run';
    el('runBtn').classList.remove('running');
    el('runStatus').textContent = 'Bot is not running';
    el('idleTitle').textContent = 'Idle';
    if (wasActive) {
        state.lastStopReason = reason;
        journal(reason);
    }
    renderSummary();
}
// Simulated entries resolve against a later tick in the same market. This is
// deliberately not an exchange quote and is not connected to Deriv.
let pendingTrade = null;
function beginDemoTrade(gateCondition) {
    if (state.ai && !aiScanValid) return;
    let behavior = el('afterGate').value,
        gateOK = gateCondition;
    if (behavior === 'Each new occurrence') gateOK = gateCondition && !state.previousGate;
    else if (behavior === 'Ignore while recovering') gateOK = state.recovering || gateCondition;
    else if (behavior === 'Once, then free-run') gateOK = state.freeRun || gateCondition;
    if (!gateOK) return;
    let limitError = limitInputError(),
        limitReached = reachedStopLimit(),
        error = stakeError();
    if (limitError || limitReached || error) {
        let reason = limitError || limitReached || error;
        stop(reason);
        toast(reason);
        return;
    }
    let stake = nextStake();
    let type = state.type;
    if (state.alternate && state.trades.length % 2) type = type === 'Under' ? 'Over' : 'Under';
    pendingTrade = {
        market: state.market,
        type,
        target: ['Matches', 'Differs'].includes(type) ? state.targetDigit : state.barrier,
        stake,
        mode: state.mode,
        maxSteps: Number(el('maxSteps').value),
        listLength: (stakeListValues() || []).length,
        entryUnits: marketData[state.market].prices.at(-1),
        remaining: Math.max(1, Math.floor(Number(el('duration').value) || 1)),
    };
    state.balance = money(state.balance - stake);
    state.totalStake = money(state.totalStake + stake);
    state.placed++;
    updateDemoBalance();
    el('totalStake').textContent = format(state.totalStake) + ' USD';
    el('totalRuns').textContent = state.placed;
    if (behavior === 'Once, then free-run') state.freeRun = true;
}
function settleDemoTrade() {
    if (!pendingTrade) return;
    pendingTrade.remaining--;
    if (pendingTrade.remaining > 0) return;
    let t = pendingTrade;
    pendingTrade = null;
    let exitUnits = marketData[t.market].prices.at(-1),
        digit = Math.abs(exitUnits) % 10,
        type = t.type,
        target = t.target;
    let win =
        type === 'Under'
            ? digit < target
            : type === 'Over'
              ? digit > target
              : type === 'Even'
                ? digit % 2 === 0
                : type === 'Odd'
                  ? digit % 2 !== 0
                  : type === 'Matches'
                    ? digit === target
                    : type === 'Differs'
                      ? digit !== target
                      : type === 'Rise'
                        ? exitUnits > t.entryUnits
                        : exitUnits < t.entryUnits;
    let chance =
        type === 'Under'
            ? target / 10
            : type === 'Over'
              ? (9 - target) / 10
              : type === 'Matches'
                ? 0.1
                : type === 'Differs'
                  ? 0.9
                  : 0.5;
    let gross = win ? money(t.stake * (0.95 / Math.max(0.1, chance))) : 0,
        profit = money(gross - t.stake);
    state.balance = money(state.balance + gross);
    state.payout = money(state.payout + gross);
    state.pl = money(state.pl + profit);
    state.recovering = !win;
    if (win) {
        state.wins++;
        state.streak = 0;
        state.martingaleStep = 0;
        state.listIndex = 0;
    } else {
        state.losses++;
        state.streak++;
        if (t.mode === state.mode && t.mode === 'Martingale')
            state.martingaleStep = state.martingaleStep >= t.maxSteps ? 0 : state.martingaleStep + 1;
        if (t.mode === state.mode && t.mode === 'Stakelist' && t.listLength)
            state.listIndex = (state.listIndex + 1) % t.listLength;
    }
    updateDemoBalance();
    state.trades.push({
        market: t.market,
        type,
        barrier: target,
        stake: t.stake,
        profit,
        win,
        entry: (t.entryUnits / 10000).toFixed(4),
        exit: (exitUnits / 10000).toFixed(4),
    });
    journal(
        `${t.market} ${type} settled: ${win ? 'won' : 'lost'} ${profit >= 0 ? '+' : ''}${format(profit)} USD (simulated).`
    );
    renderTotals();
    if (['Matches', 'Differs'].includes(type) && state.digitMode === 'random') {
        state.targetDigit = Math.floor(Math.random() * 10);
        el('whichDigit').value = state.targetDigit;
        updateConfig();
    }
    let reason = limitInputError() || reachedStopLimit();
    if (reason) {
        stop(reason);
        toast('Demo stopped: ' + reason);
    }
}
function latestDigit() {
    return state.digits.at(-1);
}
$$('.focus-toggle button').forEach(
    b =>
        (b.onclick = () => {
            $$('.focus-toggle button').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            toast(b.dataset.focus + ' view selected');
        })
);
el('windowButtons').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('windowButtons'), e.target);
    state.window = +e.target.textContent;
    el('windowInput').value = state.window;
    updateConfig();
    render();
    if (scannerMonitoring || preferredSignal) scannerFiltersChanged();
};
el('windowInput').onchange = e => {
    state.window = Math.min(5000, Math.max(10, +e.target.value || 1000));
    e.target.value = state.window;
    $$('#windowButtons button').forEach(b => b.classList.toggle('active', +b.textContent === state.window));
    updateConfig();
    render();
    if (scannerMonitoring || preferredSignal) scannerFiltersChanged();
};
$$('.market-picker .pills button').forEach(
    b =>
        (b.onclick = () => {
            switchMarket(b.textContent);
            render();
        })
);
el('tradeTypes').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('tradeTypes'), e.target);
    state.type = e.target.textContent;
    state.previousGate = false;
    let tab = ['Even', 'Odd'].includes(state.type)
        ? 'Even / Odd'
        : ['Rise', 'Fall'].includes(state.type)
          ? 'Rise / Fall'
          : ['Over', 'Under'].includes(state.type)
            ? 'Over / Under'
            : null;
    if (tab) {
        state.patternTab = tab;
        $$('#patternTabs button').forEach(b => b.classList.toggle('active', b.textContent === tab));
    }
    updateConfig();
    render();
};
el('patternTabs').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('patternTabs'), e.target);
    state.patternTab = e.target.textContent;
    render();
};
el('sequenceLengths').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('sequenceLengths'), e.target);
    state.seq = +e.target.textContent;
    render();
};
el('stakeTabs').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('stakeTabs'), e.target);
    let changed = state.mode !== e.target.textContent;
    state.mode = e.target.textContent;
    if (changed) {
        state.martingaleStep = 0;
        state.listIndex = 0;
    }
    el('baseStakeField').hidden = ['Stakelist', 'Auto-stake'].includes(state.mode);
    el('autoStakeField').hidden = state.mode !== 'Auto-stake';
    el('aiMartingale').checked = state.mode === 'Martingale';
    updateAiSettingsSummary();
    el('multiplierField').hidden = state.mode !== 'Martingale';
    el('maxStepsField').hidden = state.mode !== 'Martingale';
    el('stakeListField').hidden = state.mode !== 'Stakelist';
    updateConfig();
};
el('alternate').onclick = () => {
    state.alternate = !state.alternate;
    el('alternate').classList.toggle('on', state.alternate);
    updateConfig();
};
let gateValues = { bias: '55', pattern: 'OO', common: 'OO' };
el('gate').onchange = e => {
    gateValues[state.gate] = el('gatePattern').value;
    state.gate = e.target.value;
    const input = el('gatePattern');
    input.type = state.gate === 'bias' ? 'number' : 'text';
    input.value = gateValues[state.gate];
    if (state.gate === 'bias') {
        input.min = '0';
        input.max = '100';
        input.step = '0.1';
    } else {
        input.removeAttribute('min');
        input.removeAttribute('max');
        input.removeAttribute('step');
    }
    el('gateInputLabel').childNodes[0].textContent =
        state.gate === 'bias'
            ? 'Minimum bias %'
            : state.gate === 'pattern'
              ? 'Latest ticks spell'
              : 'Choose a common sequence';
    $('.common-label').hidden = state.gate === 'bias';
    el('gateHelp').textContent =
        state.gate === 'bias'
            ? 'Trade when the selected outcome’s observed frequency meets this threshold. Historical frequency is not a prediction.'
            : 'Compare the latest simulated ticks with the chosen sequence.';
    state.freeRun = false;
    state.previousGate = false;
    updateGateSummary();
    updateConfig();
    render();
};
function updateGateSummary() {
    let value = el('gatePattern').value;
    el('gateSummary').textContent =
        state.gate === 'bias'
            ? 'bias ≥ ' + value + '%'
            : state.gate === 'pattern'
              ? 'after ' + value
              : 'sequence ' + value;
}
el('gatePattern').oninput = () => {
    gateValues[state.gate] = el('gatePattern').value;
    state.previousGate = false;
    updateGateSummary();
    updateGateState();
    renderSummary();
};
el('afterGate').addEventListener('change', () => {
    state.previousGate = false;
    state.freeRun = false;
    updateGateState();
    renderSummary();
});
$$('.gate-tag').forEach(
    b =>
        (b.onclick = () => {
            el('gatePattern').value = b.textContent.split(' ')[0];
            el('gatePattern').dispatchEvent(new Event('input'));
        })
);
el('digitMode').addEventListener('change', e => {
    state.digitMode = e.target.value;
    if (state.digitMode === 'random') state.targetDigit = Math.floor(Math.random() * 10);
    render();
    updateConfig();
});
el('whichDigit').addEventListener('input', e => {
    if (e.target.value === '') return;
    state.targetDigit = Math.max(0, Math.min(9, Math.trunc(Number(e.target.value) || 0)));
    e.target.value = state.targetDigit;
    state.digitMode = 'fixed';
    el('digitMode').value = 'fixed';
    el('digitModeHelp').textContent = 'Select a digit manually';
    updateConfig();
});
el('whichDigit').addEventListener('change', e => {
    if (e.target.value === '') {
        e.target.value = state.targetDigit;
        updateConfig();
    }
});
[
    'duration',
    'stake',
    'multiplier',
    'maxSteps',
    'stakeList',
    'autoStakePercent',
    'takeProfit',
    'stopLoss',
    'tradeLimit',
    'lossLimit',
].forEach(id => el(id).addEventListener('input', updateConfig));
el('stakeList').addEventListener('input', () => {
    state.listIndex = 0;
    updateConfig();
});
el('maxSteps').addEventListener('input', () => {
    let max = Number(el('maxSteps').value);
    if (el('maxSteps').value !== '' && Number.isInteger(max) && max >= 0 && state.martingaleStep > max) {
        state.martingaleStep = 0;
        updateConfig();
    }
});
el('barrierInput').oninput = e => {
    state.barrier = Math.min(9, Math.max(0, +e.target.value || 0));
    state.previousGate = false;
    updateConfig();
    render();
};
$$('.collapse').forEach(
    b =>
        (b.onclick = () => {
            let card = b.closest('.setting-card');
            card.classList.toggle('collapsed');
            b.textContent = card.classList.contains('collapsed') ? '⌄' : '⌃';
        })
);
el('runBtn').onclick = () => {
    if (state.running) {
        stop();
        return;
    }
    let error = limitInputError() || reachedStopLimit() || stakeError();
    if (error) {
        toast(error);
        state.lastStopReason = error;
        renderSummary();
        return;
    }
    state.running = true;
    state.lastStopReason = null;
    state.freeRun = false;
    state.previousGate = false;
    state.recovering = false;
    el('runBtn').innerHTML = '■ &nbsp;Stop';
    el('runBtn').classList.add('running');
    el('runStatus').textContent = 'Demo bot is running';
    el('idleTitle').textContent = 'Running (demo)';
    journal('Demo bot started.');
    renderSummary();
    toast('Simulation only — no real trades are placed.');
};
el('resetBtn').onclick = () => {
    stop();
    Object.assign(state, {
        losses: 0,
        wins: 0,
        streak: 0,
        martingaleStep: 0,
        listIndex: 0,
        placed: 0,
        pl: 0,
        totalStake: 0,
        payout: 0,
        trades: [],
    });
    renderTotals();
    toast('Demo session reset.');
}; // Scanner ranks observed frequencies, not predictive accuracy or profit.
let scannerMonitoring = false,
    scannerTickCount = 0,
    preferredSignal = null,
    aiLogTab = 'transactions',
    aiJournal = [],
    aiScanValid = false,
    pendingFilteredSignal = null,
    scanDebounce = null;
function journal(text) {
    aiJournal.push({ time: new Date().toLocaleTimeString(), text });
    if (aiJournal.length > 150) aiJournal.shift();
    renderAiLog();
    renderRightJournal();
}
function renderAiLog() {
    let target = el('aiLog');
    if (!target) return;
    if (aiLogTab === 'journal') {
        target.innerHTML = aiJournal.length
            ? aiJournal
                  .slice()
                  .reverse()
                  .map(x => `<div class="ai-log-row"><small>${x.time}</small><span>${x.text}</span></div>`)
                  .join('')
            : '<div class="ai-log-empty">No journal entries yet.</div>';
        return;
    }
    target.innerHTML = state.trades.length
        ? state.trades
              .slice()
              .reverse()
              .map(
                  t =>
                      `<div class="ai-log-row"><span><b>${t.market || 'Demo'} · ${t.type}${['Over', 'Under', 'Matches', 'Differs'].includes(t.type) ? ' ' + t.barrier : ''}</b><br><small>${t.entry} → ${t.exit} · stake ${format(t.stake)}</small></span><b class="${t.win ? 'win' : 'loss'}">${t.profit >= 0 ? '+' : ''}${format(t.profit)} USD</b></div>`
              )
              .join('')
        : '<div class="ai-log-empty">No demo transactions yet.</div>';
}
function positionAiPanel() {
    let panel = el('aiPanel');
    if (panel.hidden) return;
    let r = el('aiBtn').getBoundingClientRect(),
        p = panel.getBoundingClientRect(),
        gap = 14;
    let x = r.left - p.width - gap;
    if (x < 10) x = r.right + gap;
    if (x + p.width > window.innerWidth - 10) x = Math.max(10, window.innerWidth - p.width - 10);
    let y = Math.max(10, Math.min(window.innerHeight - p.height - 10, r.bottom - p.height));
    panel.style.left = x / uiScale() + 'px';
    panel.style.top = y / uiScale() + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
}
function signalLabel(s) {
    return s.type + (['Over', 'Under', 'Matches', 'Differs'].includes(s.type) ? ' ' + s.target : '');
}
// Contracts and markets are user-selected; blank digit lists mean all valid digits.
el('scanMarketOptions').innerHTML = marketNames
    .map(name => `<label><input type="checkbox" value="${name}" checked> ${name}</label>`)
    .join('');
function parseScanTargets(id, min, max, label) {
    let text = el(id).value.trim();
    if (!text) return Array.from({ length: max - min + 1 }, (_, i) => i + min);
    let parts = text.split(',').map(s => s.trim());
    if (parts.some(p => !/^\d$/.test(p) || Number(p) < min || Number(p) > max))
        throw new Error(`${label}: enter digits ${min}–${max}, separated by commas.`);
    return [...new Set(parts.map(Number))];
}
function scannerFilters() {
    let types = $$('#scanTypeOptions input:checked').map(x => x.value),
        markets = $$('#scanMarketOptions input:checked').map(x => x.value);
    if (!types.length) throw new Error('Select at least one contract type.');
    if (!markets.length) throw new Error('Select at least one market.');
    let targets = {};
    if (types.includes('Over')) targets.Over = parseScanTargets('scanOver', 0, 8, 'Over barriers');
    if (types.includes('Under')) targets.Under = parseScanTargets('scanUnder', 1, 9, 'Under barriers');
    if (types.includes('Matches')) targets.Matches = parseScanTargets('scanMatches', 0, 9, 'Matches digits');
    if (types.includes('Differs')) targets.Differs = parseScanTargets('scanDiffers', 0, 9, 'Differs digits');
    return { types, markets, targets, window: state.window };
}
function updateFilterControls() {
    let selected = $$('#scanTypeOptions input:checked').map(x => x.value);
    el('scanTypeCount').textContent = selected.length + ' selected';
    el('scanMarketCount').textContent = $$('#scanMarketOptions input:checked').length + ' selected';
    ['Over', 'Under', 'Matches', 'Differs'].forEach(t => {
        el('scan' + t + 'Field').hidden = !selected.includes(t);
    });
}
let activeFilters = null,
    manualScanTimer = null,
    manualScanInProgress = false;
function cancelVisibleScan() {
    if (manualScanTimer) clearInterval(manualScanTimer);
    manualScanTimer = null;
    manualScanInProgress = false;
    el('scanBtn').disabled = false;
    el('scanBtn').textContent = '✦  Intelligent Scanner';
}
function scannerFiltersChanged() {
    updateFilterControls();
    clearTimeout(scanDebounce);
    if (manualScanInProgress) cancelVisibleScan();
    preferredSignal = null;
    pendingFilteredSignal = null;
    aiScanValid = false;
    el('loadSignalBtn').disabled = true;
    el('signalBox').replaceChildren(
        Object.assign(document.createElement('div'), {
            className: 'signal-placeholder',
            textContent: state.ai
                ? 'Filters changed. Waiting to scan selected signals before opening another trade.'
                : 'Filters changed. Run the scanner to compare your selection.',
        })
    );
    let validation = '';
    try {
        scannerFilters();
    } catch (e) {
        validation = e.message;
    }
    if (validation) {
        el('scannerStatus').textContent = validation;
        el('scannerPulse').classList.remove('active');
    } else if (state.ai && state.running) {
        el('scannerStatus').textContent = 'Updating selections…';
        scannerMonitoring = true;
        scanDebounce = setTimeout(() => {
            if (state.ai && state.running) startVisibleScan();
        }, 700);
    } else {
        scannerMonitoring = false;
        el('scannerStatus').textContent = 'Ready to scan selected signals';
        el('scannerPulse').classList.remove('active');
    }
    renderSummary();
}
$$('#scanTypeOptions input').forEach(x => x.addEventListener('change', scannerFiltersChanged));
$$('#scanMarketOptions input').forEach(x => x.addEventListener('change', scannerFiltersChanged));
['scanOver', 'scanUnder', 'scanMatches', 'scanDiffers'].forEach(id =>
    el(id).addEventListener('input', scannerFiltersChanged)
);
el('scanSelectAll').addEventListener('click', () => {
    $$('#scanMarketOptions input').forEach(x => (x.checked = true));
    scannerFiltersChanged();
});
el('scanClearAll').addEventListener('click', () => {
    $$('#scanMarketOptions input').forEach(x => (x.checked = false));
    scannerFiltersChanged();
});
updateFilterControls();
function collectMarketSignals(name, best, filters) {
    let ds = marketData[name].digits.slice(-filters.window),
        n = ds.length;
    if (!n) return;
    let counts = Array(10).fill(0);
    ds.forEach(d => counts[d]++);
    function add(type, target, hits) {
        let candidate = { market: name, type, target, hits, n, rate: hits / n };
        if (!best[type] || candidate.rate > best[type].rate) best[type] = candidate;
    }
    let even = counts.reduce((sum, v, i) => sum + (i % 2 === 0 ? v : 0), 0);
    if (filters.types.includes('Even')) add('Even', null, even);
    if (filters.types.includes('Odd')) add('Odd', null, n - even);
    for (let d = 0; d < 10; d++) {
        let below = counts.slice(0, d).reduce((a, b) => a + b, 0),
            above = counts.slice(d + 1).reduce((a, b) => a + b, 0);
        if (filters.targets.Over?.includes(d)) add('Over', d, above);
        if (filters.targets.Under?.includes(d)) add('Under', d, below);
        if (filters.targets.Matches?.includes(d)) add('Matches', d, counts[d]);
        if (filters.targets.Differs?.includes(d)) add('Differs', d, n - counts[d]);
    }
}
function showScanResults(best, filters) {
    let ranked = Object.values(best).sort((a, b) => b.rate - a.rate);
    preferredSignal = ranked[0] || null;
    if (!preferredSignal) return null;
    el('signalBox').innerHTML =
        `<div class="best-signal"><div><strong>${preferredSignal.market} · ${signalLabel(preferredSignal)}</strong><small>Highest observed rate · ${preferredSignal.n} ticks</small></div><div class="best-score"><b>${(preferredSignal.rate * 100).toFixed(1)}%</b><small>historical</small></div></div><div class="signal-grid">${filters.types
            .filter(type => best[type])
            .map(type => {
                let x = best[type];
                return `<div class="signal-mini">${signalLabel(x)}<b>${(x.rate * 100).toFixed(1)}% · ${x.market}</b></div>`;
            })
            .join('')}</div>`;
    el('loadSignalBtn').disabled = false;
    return preferredSignal;
}
function scanMarkets() {
    if (!activeFilters) return null;
    let best = {};
    activeFilters.markets.forEach(name => collectMarketSignals(name, best, activeFilters));
    return showScanResults(best, activeFilters);
}
function startVisibleScan() {
    if (manualScanInProgress) return;
    let filters;
    try {
        filters = scannerFilters();
    } catch (e) {
        el('scannerStatus').textContent = e.message;
        toast(e.message);
        return;
    }
    activeFilters = filters;
    manualScanInProgress = true;
    scannerMonitoring = true;
    scannerTickCount = 0;
    preferredSignal = null;
    pendingFilteredSignal = null;
    aiScanValid = false;
    el('scanBtn').disabled = true;
    el('scanBtn').textContent = 'Scanning…';
    el('loadSignalBtn').disabled = true;
    el('scannerPulse').classList.add('active');
    let best = {},
        index = 0,
        elapsed = 0;
    el('signalBox').innerHTML =
        `<div class="scan-progress-view"><span class="scan-radar" aria-hidden="true"><i></i></span><div class="scan-progress-copy"><b id="scanProgressTitle">Preparing market scan…</b><small id="scanProgressDetail">Comparing selected digit frequencies</small><div class="scan-progress-track"><span id="scanProgressFill"></span></div></div><strong id="scanProgressPercent">0%</strong></div>`;
    journal(`Started scanning ${filters.markets.length} selected simulated markets.`);
    renderSummary();
    manualScanTimer = setInterval(() => {
        if (!scannerMonitoring) {
            cancelVisibleScan();
            el('signalBox').innerHTML =
                '<div class="signal-placeholder">Scan stopped. Run the scanner to compare signals.</div>';
            return;
        }
        elapsed += 200;
        let target = Math.min(filters.markets.length, Math.floor((elapsed / 3600) * filters.markets.length));
        while (index < target) {
            collectMarketSignals(filters.markets[index], best, filters);
            index++;
        }
        let pct = Math.min(100, Math.round((elapsed / 3600) * 100)),
            name = filters.markets[Math.min(index, filters.markets.length - 1)];
        el('scanProgressTitle').textContent = 'Scanning ' + name;
        el('scanProgressDetail').textContent =
            `${index} / ${filters.markets.length} markets checked · ${filters.types.length} contract types`;
        el('scanProgressFill').style.width = pct + '%';
        el('scanProgressPercent').textContent = pct + '%';
        el('scannerStatus').textContent = `Scanning ${index} / ${filters.markets.length} markets`;
        if (elapsed >= 3600) {
            cancelVisibleScan();
            let signal = showScanResults(best, filters);
            if (signal) {
                if (state.ai && state.running) {
                    pendingFilteredSignal = signal;
                    aiScanValid = false;
                    el('scannerStatus').textContent = 'Scan complete · waiting for current trade to settle';
                } else {
                    aiScanValid = true;
                    el('scannerStatus').textContent = 'Monitoring selected simulated markets';
                }
                journal(
                    `Completed scan of ${filters.markets.length} selected simulated markets; rates are historical only.`
                );
            }
            renderSummary();
        }
    }, 200);
}
function applySignal(signal) {
    let old = [
        state.market,
        state.type,
        ['Over', 'Under'].includes(state.type) ? state.barrier : state.targetDigit,
    ].join('|');
    switchMarket(signal.market);
    state.type = signal.type;
    $$('#tradeTypes button').forEach(b => b.classList.toggle('active', b.textContent === state.type));
    if (['Over', 'Under'].includes(signal.type)) {
        state.barrier = signal.target;
        state.patternTab = 'Over / Under';
    } else if (['Even', 'Odd'].includes(signal.type)) {
        state.patternTab = 'Even / Odd';
    } else {
        state.targetDigit = signal.target;
        state.digitMode = 'fixed';
        el('digitMode').value = 'fixed';
        el('whichDigit').value = signal.target;
    }
    $$('#patternTabs button').forEach(b => b.classList.toggle('active', b.textContent === state.patternTab));
    updateConfig();
    let now = [
        state.market,
        state.type,
        ['Over', 'Under'].includes(state.type) ? state.barrier : state.targetDigit,
    ].join('|');
    if (now !== old) {
        state.previousGate = false;
        journal(`Loaded ${signal.market} ${signalLabel(signal)} (${(signal.rate * 100).toFixed(1)}% observed).`);
    }
}
function signalMatchesFilters() {
    if (!activeFilters || !activeFilters.markets.includes(state.market) || !activeFilters.types.includes(state.type))
        return false;
    if (['Over', 'Under'].includes(state.type)) return activeFilters.targets[state.type].includes(state.barrier);
    if (['Matches', 'Differs'].includes(state.type))
        return activeFilters.targets[state.type].includes(state.targetDigit);
    return true;
}
function onScannerTick() {
    if (!scannerMonitoring || manualScanInProgress) return;
    if (state.ai && state.running && aiScanValid && !signalMatchesFilters()) {
        aiScanValid = false;
        pendingFilteredSignal = preferredSignal;
    }
    if (pendingFilteredSignal && state.ai && state.running && !pendingTrade) {
        applySignal(pendingFilteredSignal);
        pendingFilteredSignal = null;
        aiScanValid = true;
        el('scannerStatus').textContent = 'Scanning selected markets · demo active';
    }
    if (!aiScanValid) return;
    scannerTickCount++;
    if (scannerTickCount % 5 !== 0) return;
    let signal = scanMarkets();
    if (signal && state.ai && state.running) {
        if (!pendingTrade) {
            applySignal(signal);
            el('scannerStatus').textContent = 'Scanning selected markets · demo active';
        } else {
            pendingFilteredSignal = signal;
            aiScanValid = false;
        }
    } else if (!state.ai) el('scannerStatus').textContent = 'Monitoring selected simulated markets';
}
el('scanBtn').addEventListener('click', startVisibleScan);
const settingPairs = [
    ['aiStake', 'stake'],
    ['aiMultiplier', 'multiplier'],
    ['aiTakeProfit', 'takeProfit'],
    ['aiStopLoss', 'stopLoss'],
];
settingPairs.forEach(([a, b]) => {
    el(a).value = el(b).value;
    el(a).addEventListener('input', () => {
        el(b).value = el(a).value;
        updateConfig();
    });
    el(b).addEventListener('input', () => {
        el(a).value = el(b).value;
    });
});
el('aiMartingale').addEventListener('change', () => {
    $$('#stakeTabs button')
        .find(b => b.textContent === (el('aiMartingale').checked ? 'Martingale' : 'Flat'))
        .click();
});
function updateAiSettingsSummary() {
    let strategy = el('aiMartingale').checked ? 'Martingale ×' + (el('aiMultiplier').value || '—') : 'Flat';
    el('aiSettingsSummary').textContent =
        `Stake ${el('aiStake').value || '—'} · ${strategy} · TP ${el('aiTakeProfit').value || '0'} · SL ${el('aiStopLoss').value || '0'}`;
}
['aiStake', 'aiMultiplier', 'aiTakeProfit', 'aiStopLoss', 'stake', 'multiplier', 'takeProfit', 'stopLoss'].forEach(id =>
    el(id).addEventListener('input', updateAiSettingsSummary)
);
el('aiMartingale').addEventListener('change', updateAiSettingsSummary);
updateAiSettingsSummary();

el('loadSignalBtn').addEventListener('click', () => {
    if (!preferredSignal || !aiScanValid) {
        toast('Run the scanner with your selected filters first.');
        return;
    }
    let stake = Number(el('aiStake').value),
        mul = Number(el('aiMultiplier').value),
        tp = Number(el('aiTakeProfit').value),
        sl = Number(el('aiStopLoss').value);
    if (
        !Number.isFinite(stake) ||
        stake < 0.35 ||
        !Number.isFinite(mul) ||
        mul < 1 ||
        !Number.isFinite(tp) ||
        tp < 0 ||
        !Number.isFinite(sl) ||
        sl < 0
    ) {
        toast('Check stake, multiplier and stop limits.');
        return;
    }
    if ((tp > 0 && state.pl >= tp) || (sl > 0 && state.pl <= -sl)) {
        toast('A session stop limit is already reached. Reset or adjust limits.');
        return;
    }
    if (state.running) stop('Previous demo execution stopped before loading a new signal.');
    scannerMonitoring = true;
    scannerTickCount = 0;
    aiScanValid = true;
    state.alternate = false;
    el('alternate').classList.remove('on');
    applySignal(preferredSignal);
    let startError = limitInputError() || reachedStopLimit() || stakeError();
    if (startError) {
        state.ai = false;
        el('aiBtn').classList.remove('enabled');
        el('aiStop').disabled = true;
        el('scannerStatus').textContent = 'Monitoring simulated markets';
        toast(startError);
        renderSummary();
        return;
    }
    state.ai = true;
    el('aiBtn').classList.add('enabled');
    el('scannerPulse').classList.add('active');
    el('scannerStatus').textContent = 'Scanning · demo execution active';
    el('aiStop').disabled = false;
    el('runBtn').click();
    journal('Demo execution started. Switching only after simulated contracts settle.');
    render();
});
el('aiStop').addEventListener('click', () => stop('Demo execution stopped manually.'));
$$('.ai-log-tabs button').forEach(b =>
    b.addEventListener('click', () => {
        $$('.ai-log-tabs button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        aiLogTab = b.dataset.aiTab;
        renderAiLog();
    })
);

// Floating AI control: drag freely; click to open or use arrow keys to move.
const aiButton = el('aiBtn');
let aiDrag = null,
    ignoreAiClick = false;
function placeAI(x, y, save = false) {
    let box = aiButton.getBoundingClientRect(),
        maxX = Math.max(0, window.innerWidth - box.width),
        maxY = Math.max(0, window.innerHeight - box.height);
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    aiButton.style.left = x / uiScale() + 'px';
    aiButton.style.top = y / uiScale() + 'px';
    aiButton.style.right = 'auto';
    aiButton.style.bottom = 'auto';
    positionAiPanel();
    if (save)
        try {
            localStorage.setItem('advanced-bot-ai-position', JSON.stringify({ x, y }));
        } catch (e) {}
}
try {
    let p = JSON.parse(localStorage.getItem('advanced-bot-ai-position'));
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) placeAI(p.x, p.y);
} catch (e) {}
aiButton.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    ignoreAiClick = false;
    let r = aiButton.getBoundingClientRect();
    aiDrag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, moved: false };
    aiButton.setPointerCapture(e.pointerId);
});
aiButton.addEventListener('pointermove', e => {
    if (!aiDrag || e.pointerId !== aiDrag.id) return;
    let dx = e.clientX - aiDrag.startX,
        dy = e.clientY - aiDrag.startY;
    if (Math.hypot(dx, dy) > 4) aiDrag.moved = true;
    if (aiDrag.moved) {
        e.preventDefault();
        aiButton.classList.add('dragging');
        placeAI(aiDrag.left + dx, aiDrag.top + dy);
    }
});
aiButton.addEventListener('pointerup', e => {
    if (!aiDrag || e.pointerId !== aiDrag.id) return;
    ignoreAiClick = aiDrag.moved;
    if (aiDrag.moved) {
        let r = aiButton.getBoundingClientRect();
        placeAI(r.left, r.top, true);
    }
    aiButton.classList.remove('dragging');
    aiDrag = null;
});
aiButton.addEventListener('pointercancel', () => {
    aiDrag = null;
    aiButton.classList.remove('dragging');
});
aiButton.addEventListener('click', () => {
    if (ignoreAiClick) {
        ignoreAiClick = false;
        return;
    }
    el('aiPanel').hidden = !el('aiPanel').hidden;
    aiButton.setAttribute('aria-expanded', String(!el('aiPanel').hidden));
    positionAiPanel();
});
el('aiClose').onclick = () => {
    el('aiPanel').hidden = true;
    aiButton.setAttribute('aria-expanded', 'false');
};
aiButton.addEventListener('keydown', e => {
    let directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[e.key]) return;
    e.preventDefault();
    let r = aiButton.getBoundingClientRect(),
        d = directions[e.key],
        step = e.shiftKey ? 30 : 10;
    placeAI(r.left + d[0] * step, r.top + d[1] * step, true);
});
window.addEventListener('resize', () => {
    let r = aiButton.getBoundingClientRect();
    placeAI(r.left, r.top);
    positionAiPanel();
});
el('rightTabs').onclick = e => {
    if (e.target.tagName !== 'BUTTON') return;
    setActive(el('rightTabs'), e.target);
    let tab = e.target.textContent;
    el('summaryView').hidden = tab !== 'Summary';
    el('transactionView').hidden = tab !== 'Transactions';
    el('journalView').hidden = tab !== 'Journal';
    if (tab === 'Summary') renderSummary();
    if (tab === 'Journal') renderRightJournal();
};
$$('.nav>button').forEach(
    b =>
        (b.onclick = () => {
            if (!b.classList.contains('nav-active')) toast('This preview focuses on the Advanced Bot interface.');
        })
); // Execution dropdown: selection changes the demo tick/trade cadence only.
let currentSpeed = 'STANDARD';
try {
    currentSpeed = localStorage.getItem('advanced-bot-speed') || 'STANDARD';
} catch (e) {}
if (!['STANDARD', 'FAST', 'ULTRA'].includes(currentSpeed)) currentSpeed = 'STANDARD';
function updateSpeedUI() {
    $$('.execution-options button').forEach(b => {
        let selected = b.dataset.speed === currentSpeed;
        b.classList.toggle('selected', selected);
        b.setAttribute('aria-pressed', String(selected));
    });
}
$$('.execution-options button').forEach(b =>
    b.addEventListener('click', () => {
        currentSpeed = b.dataset.speed;
        try {
            localStorage.setItem('advanced-bot-speed', currentSpeed);
        } catch (e) {}
        updateSpeedUI();
        startTickTimer();
        toast(currentSpeed + ' demo execution selected');
    })
);
updateSpeedUI();
let tickTimer;
function startTickTimer() {
    clearInterval(tickTimer);
    let delay = currentSpeed === 'ULTRA' ? 500 : currentSpeed === 'FAST' ? 1000 : 2000;
    tickTimer = setInterval(() => {
        for (const m of Object.values(marketData)) {
            let step = (Math.floor(Math.random() * 20) + 1) * (Math.random() < 0.5 ? -1 : 1),
                price = m.prices.at(-1) + step;
            m.prices.push(price);
            m.digits.push(Math.abs(price) % 10);
            if (m.digits.length > 5000) {
                m.digits.shift();
                m.prices.shift();
            }
        }
        state.price = state.prices.at(-1) / 10000;
        if (state.running && pendingTrade) settleDemoTrade();
        if (state.running && !pendingTrade) {
            let reason = limitInputError() || reachedStopLimit();
            if (reason) {
                stop(reason);
                toast('Demo stopped: ' + reason);
            }
        }
        onScannerTick();
        render();
        if (state.running) {
            let gateCondition = updateGateState();
            if (!pendingTrade) beginDemoTrade(gateCondition);
            state.previousGate = gateCondition;
        }
        renderSummary();
    }, delay);
}
startTickTimer();
// Keep the chosen appearance across refreshes, without affecting demo data.
function setTheme(theme) {
    const light = theme === 'light';
    document.body.classList.toggle('light-theme', light);
    const button = el('themeToggle');
    button.textContent = light ? '☀' : '☾';
    button.title = light ? 'Switch to dark theme' : 'Switch to light theme';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(light));
    try {
        localStorage.setItem('advanced-bot-theme', theme);
    } catch (e) {}
}
let savedTheme = 'dark';
try {
    savedTheme = localStorage.getItem('advanced-bot-theme') || 'dark';
} catch (e) {}
setTheme(savedTheme);
el('themeToggle').addEventListener('click', () =>
    setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light')
);
function clock() {
    let d = new Date();
    el('clock').textContent = d.toISOString().slice(0, 19).replace('T', ' ') + ' GMT';
}
setInterval(clock, 1000);
clock();
updateDemoBalance();
updateConfig();
render();
renderTotals();
renderSummary();
renderRightJournal();

// Every information icon opens a small contextual, dismissible note.
const helpNotes = {
    focus: [
        'Focus and Pulse',
        'Focus shows the selected market. Pulse is a visual view selector in this preview; its market-ranking logic has not yet been connected.',
    ],
    ticks: [
        'Ticks',
        'Choose how many recent ticks are included in the displayed statistics. A larger or smaller window changes the sample; past frequencies do not predict the next tick.',
    ],
    'tick-view': [
        'Ticks in view',
        'This is the number of recent simulated ticks used for the charts and statistics. Change it using the Ticks control above.',
    ],
    patterns: [
        'Patterns',
        'Shows the recent sequence for the selected view: E/O for even/odd digits, R/F for price rise/fall, and O/U/N for over, under or equal to the barrier. Blue and orange distinguish the two outcomes.',
    ],
    parity: [
        'Parity',
        'Even and odd percentages and runs are calculated from recent simulated last digits. The next-parity forecast is a visual placeholder, not a prediction.',
    ],
    direction: [
        'Direction',
        'A rise or fall compares each simulated price with the preceding tick. The percentages and runs summarize the selected tick window.',
    ],
    digits: [
        'Digits',
        'Bars show the frequency of each last digit in the selected simulated tick window. Most and least frequent digits are highlighted. Some example labels remain placeholders.',
    ],
    barriers: [
        'Over / under by barrier',
        'This chart illustrates the digit outcomes above and below each barrier, assuming an even spread of digits. The selected barrier is outlined; it is not a live market forecast.',
    ],
    play: [
        'Play',
        'Choose the simulated contract and duration. Over and Under use a barrier. Matches and Differs use a chosen digit; automatic digit choices use the recent tick window.',
    ],
    entry: [
        'Entry gate',
        'Choose Bias %, Pattern or Common sequence to control when the demo can enter. The second dropdown controls whether the condition is rechecked, waits for a new occurrence, is bypassed during recovery, or is used only once.',
    ],
    stake: [
        'Stake',
        'Flat uses the base amount. Martingale multiplies it after losses and resets after a win or the maximum steps. Stakelist advances after each loss and resets after a win or its last step. Auto-stake uses a percentage of the available simulated balance. Martingale can escalate losses quickly.',
    ],
    stop: [
        'Stop when',
        'Set simulated profit, loss, trade-count or consecutive-loss limits. Zero means no limit. A trade can settle beyond a limit, so stop thresholds are not guaranteed maximum losses.',
    ],
    session: [
        'Session',
        'Shows the current simulated profit or loss, wins, losses, hit rate and loss streak. These results are not connected to a Deriv account.',
    ],
    app: [
        'About this preview',
        'This interface uses simulated prices, payouts and trades. It is not connected to Deriv or an account and cannot place real orders.',
    ],
};
let activeInfo = null;
function closeInfo() {
    el('infoPopover').hidden = true;
    if (activeInfo) {
        activeInfo.setAttribute('aria-expanded', 'false');
        activeInfo.removeAttribute('aria-describedby');
        activeInfo = null;
    }
}
function positionInfo() {
    if (!activeInfo || el('infoPopover').hidden) return;
    let box = el('infoPopover'),
        a = activeInfo.getBoundingClientRect(),
        r = box.getBoundingClientRect(),
        x = Math.max(10, Math.min(window.innerWidth - r.width - 10, a.left)),
        below = a.bottom + 8,
        y = below + r.height <= window.innerHeight - 10 ? below : Math.max(10, a.top - r.height - 8);
    box.style.left = x / uiScale() + 'px';
    box.style.top = y / uiScale() + 'px';
}
$$('.info-trigger').forEach(button =>
    button.addEventListener('click', event => {
        event.stopPropagation();
        if (activeInfo === button) {
            closeInfo();
            return;
        }
        closeInfo();
        let note = helpNotes[button.dataset.help];
        if (!note) return;
        activeInfo = button;
        el('infoTitle').textContent = note[0];
        el('infoText').textContent = note[1];
        el('infoPopover').hidden = false;
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-describedby', 'infoText');
        positionInfo();
    })
);
el('infoClose').addEventListener('click', closeInfo);
document.addEventListener('click', e => {
    if (activeInfo && !el('infoPopover').contains(e.target) && !activeInfo.contains(e.target)) closeInfo();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeInfo) {
        let button = activeInfo;
        closeInfo();
        button.focus();
    }
});
document.addEventListener(
    'scroll',
    () => {
        if (activeInfo) closeInfo();
    },
    true
);
window.addEventListener('resize', positionInfo);

// Floating, movable risk information. This guide does not place trades.
const riskButton = el('riskBtn'),
    riskPanel = el('riskPanel');
let riskDrag = null,
    ignoreRiskClick = false;
function positionRiskPanel() {
    if (riskPanel.hidden) return;
    let r = riskButton.getBoundingClientRect(),
        p = riskPanel.getBoundingClientRect(),
        gap = 12;
    let x = r.left - p.width - gap;
    if (x < 10) x = r.right + gap;
    if (x + p.width > window.innerWidth - 10) x = Math.max(10, window.innerWidth - p.width - 10);
    let y = Math.max(10, Math.min(window.innerHeight - p.height - 10, r.bottom - p.height));
    riskPanel.style.left = x / uiScale() + 'px';
    riskPanel.style.top = y / uiScale() + 'px';
    riskPanel.style.right = 'auto';
    riskPanel.style.bottom = 'auto';
}
function placeRisk(x, y, save = false) {
    x = Math.max(0, Math.min(Math.max(0, window.innerWidth - riskButton.getBoundingClientRect().width), x));
    y = Math.max(0, Math.min(Math.max(0, window.innerHeight - riskButton.getBoundingClientRect().height), y));
    riskButton.style.left = x / uiScale() + 'px';
    riskButton.style.top = y / uiScale() + 'px';
    riskButton.style.right = 'auto';
    riskButton.style.bottom = 'auto';
    positionRiskPanel();
    if (save)
        try {
            localStorage.setItem('advanced-bot-risk-position', JSON.stringify({ x, y }));
        } catch (e) {}
}
try {
    let p = JSON.parse(localStorage.getItem('advanced-bot-risk-position'));
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) placeRisk(p.x, p.y);
} catch (e) {}
riskButton.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    ignoreRiskClick = false;
    let r = riskButton.getBoundingClientRect();
    riskDrag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, moved: false };
    riskButton.setPointerCapture(e.pointerId);
});
riskButton.addEventListener('pointermove', e => {
    if (!riskDrag || e.pointerId !== riskDrag.id) return;
    let dx = e.clientX - riskDrag.startX,
        dy = e.clientY - riskDrag.startY;
    if (Math.hypot(dx, dy) > 4) riskDrag.moved = true;
    if (riskDrag.moved) {
        e.preventDefault();
        riskButton.classList.add('dragging');
        placeRisk(riskDrag.left + dx, riskDrag.top + dy);
    }
});
riskButton.addEventListener('pointerup', e => {
    if (!riskDrag || e.pointerId !== riskDrag.id) return;
    ignoreRiskClick = riskDrag.moved;
    if (riskDrag.moved) {
        let r = riskButton.getBoundingClientRect();
        placeRisk(r.left, r.top, true);
    }
    riskButton.classList.remove('dragging');
    riskDrag = null;
});
riskButton.addEventListener('pointercancel', () => {
    riskDrag = null;
    riskButton.classList.remove('dragging');
});
riskButton.addEventListener('click', () => {
    if (ignoreRiskClick) {
        ignoreRiskClick = false;
        return;
    }
    riskPanel.hidden = !riskPanel.hidden;
    riskButton.setAttribute('aria-expanded', String(!riskPanel.hidden));
    positionRiskPanel();
});
el('riskClose').addEventListener('click', () => {
    riskPanel.hidden = true;
    riskButton.setAttribute('aria-expanded', 'false');
    riskButton.focus();
});
riskButton.addEventListener('keydown', e => {
    let directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] },
        d = directions[e.key];
    if (!d) return;
    e.preventDefault();
    let r = riskButton.getBoundingClientRect(),
        step = e.shiftKey ? 30 : 10;
    placeRisk(r.left + d[0] * step, r.top + d[1] * step, true);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !riskPanel.hidden) {
        riskPanel.hidden = true;
        riskButton.setAttribute('aria-expanded', 'false');
        riskButton.focus();
    }
});
window.addEventListener('resize', () => {
    let r = riskButton.getBoundingClientRect();
    placeRisk(r.left, r.top);
    positionRiskPanel();
});

// An interactive phone-sized instance lets desktop users inspect both orientations.
let previewOrientation = 'landscape';
function updatePhonePreview() {
    let width = previewOrientation === 'landscape' ? 844 : 390,
        height = previewOrientation === 'landscape' ? 390 : 844,
        maxWidth = Math.max(120, window.innerWidth - 80),
        maxHeight = Math.max(120, window.innerHeight - 180),
        scale = Math.min(1, maxWidth / width, maxHeight / height),
        viewport = el('phoneViewport'),
        frame = el('phoneFrame');
    viewport.style.width = width * scale + 8 + 'px';
    viewport.style.height = height * scale + 8 + 'px';
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = `scale(${scale})`;
    for (const [id, orientation] of [
        ['previewLandscape', 'landscape'],
        ['previewPortrait', 'portrait'],
    ]) {
        let active = previewOrientation === orientation;
        el(id).classList.toggle('active', active);
        el(id).setAttribute('aria-pressed', String(active));
    }
}
el('phonePreviewBtn').addEventListener('click', () => {
    el('phonePreviewOverlay').hidden = false;
    if (!el('phoneFrame').getAttribute('src')) el('phoneFrame').src = 'index.html?phone-preview=1';
    updatePhonePreview();
});
el('previewLandscape').addEventListener('click', () => {
    previewOrientation = 'landscape';
    updatePhonePreview();
});
el('previewPortrait').addEventListener('click', () => {
    previewOrientation = 'portrait';
    updatePhonePreview();
});
function closePhonePreview() {
    el('phonePreviewOverlay').hidden = true;
    el('phoneFrame').removeAttribute('src');
    el('phonePreviewBtn').focus();
}
el('previewClose').addEventListener('click', closePhonePreview);
el('phonePreviewOverlay').addEventListener('click', e => {
    if (e.target === el('phonePreviewOverlay')) closePhonePreview();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el('phonePreviewOverlay').hidden) closePhonePreview();
});
window.addEventListener('resize', () => {
    if (!el('phonePreviewOverlay').hidden) updatePhonePreview();
});

// Fullscreen depends on browser and embedding permissions; never claim success
// if the browser rejects the request.
const fullscreenButton = el('fullscreenToggle');
function activeFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}
function updateFullscreenButton() {
    let active = !!activeFullscreen();
    fullscreenButton.textContent = active ? '⤢' : '⛶';
    fullscreenButton.setAttribute('aria-pressed', String(active));
    fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    fullscreenButton.title = active ? 'Exit full screen' : 'Enter full screen';
}
fullscreenButton.addEventListener('click', async () => {
    try {
        if (activeFullscreen()) {
            let exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (!exit) throw Error('Fullscreen exit unavailable');
            await exit.call(document);
        } else {
            let root = document.documentElement,
                enter = root.requestFullscreen || root.webkitRequestFullscreen;
            if (!enter) throw Error('Fullscreen unavailable');
            await enter.call(root);
        }
        updateFullscreenButton();
    } catch (e) {
        toast('Full screen is blocked here. Open the preview in a new tab and use the browser’s full-screen control.');
    }
});
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
updateFullscreenButton();

/* DERIV_LIVE_BRIDGE */
(function () {
    const APP_ID = '34ZWcXDCQi8ZtdAfM1s5X',
        API = 'https://derivws.com',
        S = {
            V10: 'R_10',
            V25: 'R_25',
            V50: 'R_50',
            V75: 'R_75',
            V100: 'R_100',
            V10s: '1HZ10V',
            V25s: '1HZ25V',
            V50s: '1HZ50V',
            V75s: '1HZ75V',
            V100s: '1HZ100V',
            J10: 'JD10',
            J25: 'JD25',
            J50: 'JD50',
            J75: 'JD75',
            J100: 'JD100',
            Bull: 'RDBULL',
            Bear: 'RDBEAR',
        },
        R = Object.fromEntries(Object.entries(S).map(([k, v]) => [v, k])),
        P = {},
        CM = {
            Under: 'DIGITUNDER',
            Over: 'DIGITOVER',
            Even: 'DIGITEVEN',
            Odd: 'DIGITODD',
            Matches: 'DIGITMATCH',
            Differs: 'DIGITDIFF',
            Rise: 'CALL',
            Fall: 'PUT',
        };
    let ws = null,
        auth = false,
        loginId = null,
        curr = 'USD',
        inFlight = false,
        cid = null;
    function getAuthToken() {
        try {
            const raw =
                sessionStorage.getItem('auth_info') ||
                (window.parent && window.parent.sessionStorage.getItem('auth_info'));
            if (raw) {
                const p = JSON.parse(raw);
                if (p && p.access_token) return p.access_token;
            }
        } catch (e) {}
        return null;
    }
    function getActiveId() {
        try {
            return (
                localStorage.getItem('active_loginid') ||
                (window.parent && window.parent.localStorage.getItem('active_loginid')) ||
                null
            );
        } catch (e) {
            return null;
        }
    }
    function toU(q, s) {
        const p = P[s] || 0.0001,
            d = Math.max(0, Math.round(-Math.log10(p)));
        return Math.round(Number(Number(q).toFixed(d).replace('.', '')));
    }
    function subMarkets() {
        Object.entries(S).forEach(([c, s], i) =>
            setTimeout(() => {
                if (ws && ws.readyState === 1)
                    ws.send(
                        JSON.stringify({
                            ticks_history: s,
                            adjust_start_time: 1,
                            count: 1000,
                            end: 'latest',
                            style: 'ticks',
                            subscribe: 1,
                        })
                    );
            }, i * 90)
        );
    }
    function openWS(url, isOtp) {
        if (ws)
            try {
                ws.close();
            } catch (e) {}
        ws = new WebSocket(url);
        ws.onopen = () => {
            if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
            if (isOtp) {
                ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            } else {
                toast('Live Deriv ticks active (Log in via Deriv to place real trades).');
            }
            subMarkets();
        };
        ws.onmessage = e => {
            let d;
            try {
                d = JSON.parse(e.data);
            } catch (_) {
                return;
            }
            if (d.error) {
                if (d.msg_type === 'buy') {
                    inFlight = false;
                    pendingTrade = null;
                    toast('Deriv error: ' + d.error.message);
                    journal('Trade rejected: ' + d.error.message);
                }
                return;
            }
            if (d.msg_type === 'balance' && d.balance) {
                auth = true;
                if (d.balance.loginid) loginId = d.balance.loginid;
                if (d.balance.currency) curr = d.balance.currency;
                state.balance = Number(d.balance.balance);
                if (typeof updateDemoBalance === 'function') updateDemoBalance();
            }
            if (d.msg_type === 'history' && d.history && d.echo_req) {
                const s = d.echo_req.ticks_history,
                    c = R[s];
                if (!c || !marketData[c]) return;
                if (d.pip_size) P[s] = Number(d.pip_size);
                const pr = d.history.prices.map(p => toU(p, s));
                marketData[c].prices = pr;
                marketData[c].digits = pr.slice(1).map(u => Math.abs(u) % 10);
                if (state.market === c) {
                    state.prices = marketData[c].prices;
                    state.digits = marketData[c].digits;
                    if (typeof render === 'function') render();
                }
            }
            if (d.msg_type === 'tick' && d.tick) {
                const s = d.tick.symbol,
                    c = R[s];
                if (!c || !marketData[c]) return;
                if (d.tick.pip_size) P[s] = Number(d.tick.pip_size);
                const u = toU(d.tick.quote, s),
                    m = marketData[c];
                m.prices.push(u);
                m.digits.push(Math.abs(u) % 10);
                if (m.digits.length > 5000) {
                    m.digits.shift();
                    m.prices.shift();
                }
                if (state.market === c) {
                    state.price = u;
                    if (typeof render === 'function') render();
                }
            }
            if (d.msg_type === 'buy' && d.buy) {
                cid = d.buy.contract_id;
                ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: cid, subscribe: 1 }));
            }
            if (d.msg_type === 'proposal_open_contract' && d.proposal_open_contract) {
                const poc = d.proposal_open_contract;
                if (poc.is_sold && cid === poc.contract_id) {
                    cid = null;
                    inFlight = false;
                    const t = pendingTrade;
                    pendingTrade = null;
                    if (poc.subscription && poc.subscription.id)
                        ws.send(JSON.stringify({ forget: poc.subscription.id }));
                    if (!t) return;
                    const profit = Number(poc.profit),
                        win = profit > 0;
                    state.payout = Number((state.payout + Number(poc.payout)).toFixed(4));
                    state.pl = Number((state.pl + profit).toFixed(4));
                    state.recovering = !win;
                    if (win) {
                        state.wins++;
                        state.streak = 0;
                        state.martingaleStep = 0;
                        state.listIndex = 0;
                    } else {
                        state.losses++;
                        state.streak++;
                        if (state.mode === 'Martingale')
                            state.martingaleStep = state.martingaleStep >= t.maxSteps ? 0 : state.martingaleStep + 1;
                        if (state.mode === 'Stakelist' && t.listLength)
                            state.listIndex = (state.listIndex + 1) % t.listLength;
                    }
                    state.trades.push({
                        market: t.market,
                        type: t.type,
                        barrier: t.barrier,
                        stake: t.stake,
                        profit,
                        win,
                        entry: poc.entry_tick_display_value || '',
                        exit: poc.exit_tick_display_value || '',
                    });
                    journal(
                        t.market +
                            ' ' +
                            t.type +
                            ' settled: ' +
                            (win ? 'won' : 'lost') +
                            ' ' +
                            (profit >= 0 ? '+' : '') +
                            profit.toFixed(2) +
                            ' ' +
                            curr +
                            '.'
                    );
                    if (typeof renderTotals === 'function') renderTotals();
                    if (['Matches', 'Differs'].includes(t.type) && state.digitMode === 'random') {
                        state.targetDigit = Math.floor(Math.random() * 10);
                        const wd = document.getElementById('whichDigit');
                        if (wd) wd.value = state.targetDigit;
                        if (typeof updateConfig === 'function') updateConfig();
                    }
                    const rsn =
                        (typeof limitInputError === 'function' && limitInputError()) ||
                        (typeof reachedStopLimit === 'function' && reachedStopLimit());
                    if (rsn && typeof stop === 'function') {
                        stop(rsn);
                        toast('Bot stopped: ' + rsn);
                    }
                }
            }
        };
        ws.onclose = () => {
            auth = false;
            setTimeout(boot, 3500);
        };
    }
    async function boot() {
        if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
        const token = getAuthToken();
        if (!token) {
            openWS('wss://://derivws.com' + APP_ID, false);
            return;
        }
        try {
            const hdr = { 'Deriv-App-ID': APP_ID, Authorization: 'Bearer ' + token };
            const accRes = await fetch(API + '/trading/v1/options/accounts', { headers: hdr });
            if (!accRes.ok) throw new Error('Accounts ' + accRes.status);
            const accJson = await accRes.json();
            const list = accJson.data || [];
            const wanted = getActiveId();
            const acct =
                list.find(a => a.account_id === wanted) || list.find(a => a.account_type === 'demo') || list[0];
            if (!acct) throw new Error('No Deriv account found');
            loginId = acct.account_id;
            curr = acct.currency || 'USD';
            state.balance = Number(acct.balance);
            if (typeof updateDemoBalance === 'function') updateDemoBalance();
            const otpRes = await fetch(API + '/trading/v1/options/accounts/' + encodeURIComponent(loginId) + '/otp', {
                method: 'POST',
                headers: hdr,
            });
            if (!otpRes.ok) throw new Error('OTP ' + otpRes.status);
            const otpJson = await otpRes.json();
            const wsUrl = otpJson && otpJson.data && otpJson.data.url;
            if (!wsUrl) throw new Error('Missing OTP URL');
            auth = true;
            toast('Connected to Deriv (' + loginId + ': ' + state.balance.toFixed(2) + ' ' + curr + ')');
            openWS(wsUrl, true);
        } catch (err) {
            toast('Deriv auth fallback: ' + err.message);
            openWS('wss://://derivws.com' + APP_ID, false);
        }
    }
    startTickTimer = function () {
        if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
    };
    const _origBegin = beginDemoTrade;
    beginDemoTrade = function (g) {
        if (!auth || !ws || ws.readyState !== 1) return _origBegin(g);
        if (inFlight || pendingTrade) return;
        if (state.ai && !aiScanValid) return;
        const beh = document.getElementById('afterGate')?.value || '';
        let ok = g;
        if (beh === 'Each new occurrence') ok = g && !state.previousGate;
        else if (beh === 'Ignore while recovering') ok = state.recovering || g;
        else if (beh === 'Once, then free-run') ok = state.freeRun || g;
        if (!ok) return;
        const err = limitInputError() || reachedStopLimit() || stakeError();
        if (err) {
            stop(err);
            toast(err);
            return;
        }
        const stake = Number(nextStake());
        let type = state.type;
        if (state.alternate && state.trades.length % 2) type = type === 'Under' ? 'Over' : 'Under';
        const ct = CM[type] || 'DIGITUNDER';
        const bar = ['Matches', 'Differs', 'Under', 'Over'].includes(type) ? String(state.targetDigit) : undefined;
        const dur = Math.max(1, Math.min(10, Math.floor(Number(document.getElementById('duration')?.value) || 1)));
        const sym = S[state.market] || 'R_75';
        pendingTrade = {
            market: state.market,
            type,
            barrier: bar,
            stake,
            mode: state.mode,
            maxSteps: Number(document.getElementById('maxSteps')?.value) || 0,
            listLength: (typeof stakeListValues === 'function' ? stakeListValues() : []).length,
            entryUnits: marketData[state.market].prices.at(-1),
            remaining: dur,
        };
        inFlight = true;
        state.totalStake = Number((state.totalStake + stake).toFixed(4));
        state.placed++;
        const ts = document.getElementById('totalStake'),
            tr = document.getElementById('totalRuns');
        if (ts) ts.textContent = state.totalStake.toFixed(2) + ' ' + curr;
        if (tr) tr.textContent = state.placed;
        if (beh === 'Once, then free-run') state.freeRun = true;
        const params = {
            amount: stake,
            basis: 'stake',
            contract_type: ct,
            currency: curr,
            duration: dur,
            duration_unit: 't',
            symbol: sym,
        };
        if (bar !== undefined) params.barrier = bar;
        ws.send(JSON.stringify({ buy: 1, price: stake, parameters: params }));
    };
    settleDemoTrade = function () {};
    boot();
})();
