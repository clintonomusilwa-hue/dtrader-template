const style = document.createElement('style');
style.textContent =
    '@keyframes dpFadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes dpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}.dp-tab-btn{transition:all .2s ease;display:inline-flex;align-items:center;gap:6px}.dp-tab-btn:hover{background:#1e293b!important;border-color:#60a5fa!important;color:#fff!important;transform:translateY(-1px)}.dp-tab-btn.active svg{animation:dpPulse 1.8s infinite ease-in-out}.dp-panel-anim{animation:dpFadeSlide .25s ease-out}';
document.head.appendChild(style);
const nav = document.createElement('div');
nav.id = 'dp-topnav';
document.body.prepend(nav);
const panel = document.createElement('div');
panel.id = 'dp-tab-panel';
panel.style.cssText =
    'display:none;position:fixed;top:44px;left:0;right:0;bottom:0;background:#0b1120;color:#fff;z-index:99998;overflow:auto;padding:24px;font-family:sans-serif;';
document.body.appendChild(panel);
document.body.style.paddingTop = '44px';
let tab = 'Manual Trader';
const tabs = [
    { n: 'Manual Trader', i: 'M3 17l6-6 4 4 8-8M17 7h4v4' },
    { n: 'Advanced Bot', i: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
    { n: 'Bot Builder', i: 'M12 2v4M8 6h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2zm1 5h.01M15 11h.01' },
    { n: 'Free Bots', i: 'M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8m16 0H4m16 0l-2-5H6L4 12m8-5v15' },
    {
        n: 'Advanced Tools',
        i: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
    },
    { n: 'Bulk Trader', i: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { n: 'Scanner Bot', i: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12l6-4M12 7v5' },
    {
        n: 'Copy Trading',
        i: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm14 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    },
    { n: 'Digit Analyser', i: 'M18 20V10M12 20V4M6 20v-6' },
    { n: 'Useful Docs', i: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5' },
];
function drawNav() {
    nav.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;height:44px;background:#0f172a;border-bottom:1px solid #334155;display:flex;align-items:center;gap:8px;padding:0 12px;z-index:99999;overflow-x:auto;">${tabs
        .map(
            t =>
                `<button class="dp-tab-btn${tab === t.n ? ' active' : ''}" data-t="${t.n}" style="background:${
                    tab === t.n ? '#2563eb' : '#131c31'
                };color:${tab === t.n ? '#fff' : '#cbd5e1'};border:1px solid ${
                    tab === t.n ? '#60a5fa' : '#334155'
                };border-radius:6px;padding:5px 12px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;box-shadow:${
                    tab === t.n ? '0 2px 10px rgba(37,99,235,.4)' : 'inset 0 1px 0 rgba(255,255,255,.04)'
                };"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${
                    t.i
                }"/></svg><span>${t.n}</span></button>`
        )
        .join('')}</div>`;
    nav.querySelectorAll('button').forEach(
        b =>
            (b.onclick = () => {
                tab = b.dataset.t;
                window.addEventListener('message', ev => {
                    if (ev.data && ev.data.type === 'DP_REQ_AUTH' && ev.source) {
                        ev.source.postMessage(
                            {
                                type: 'DP_AUTH',
                                auth: sessionStorage.getItem('auth_info'),
                                acct: localStorage.getItem('current_account'),
                                loginid: localStorage.getItem('active_loginid'),
                            },
                            '*'
                        );
                    }
                });
                drawNav();
                renderPanel();
            })
    );
}
function renderPanel() {
    if (tab === 'Manual Trader') {
        panel.style.display = 'none';
        return;
    }
    if (tab === 'Advanced Bot') {
        panel.style.display = 'block';
        panel.style.padding = '0';
        panel.innerHTML =
            '<iframe src="/advanced-bot/index.html" style="width:100%;height:100%;border:none;display:block;"></iframe>';
        return;
    }
    panel.style.display = 'block';
    panel.style.padding = '24px';
    panel.innerHTML = `<div class="dp-panel-anim" style="max-width:600px;margin:40px auto;background:#1e293b;padding:24px;border-radius:12px;border:1px solid #334155;text-align:center;"><h2 style="margin:0 0 8px;color:#10B981;">${
        tab
    }</h2><p style="margin:0;color:#94a3b8;font-size:13px;">Ready for features.</p></div>`;
}
drawNav();
