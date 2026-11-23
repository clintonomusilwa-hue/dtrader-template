/* eslint-disable */
(function () {
    const S = {
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
    };
    const R = Object.fromEntries(Object.entries(S).map(([k, v]) => [v, k]));
    const P = {};
    const CM = {
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
    function appId() {
        try {
            const c = localStorage.getItem('config.app_id');
            if (c && /^\d+$/.test(c.trim())) return c.trim();
        } catch (e) {}
        return '1089';
    }
    function tok() {
        try {
            const id = localStorage.getItem('active_loginid');
            const a = JSON.parse(localStorage.getItem('client.accounts') || '{}');
            if (id && a[id] && a[id].token) {
                loginId = id;
                curr = a[id].currency || 'USD';
                return a[id].token;
            }
        } catch (e) {}
        return null;
    }
    function toU(q, s) {
        const p = P[s] || 0.0001;
        const d = Math.max(0, Math.round(-Math.log10(p)));
        return Math.round(Number(Number(q).toFixed(d).replace('.', '')));
    }
    function conn() {
        ws = new WebSocket('wss://://derivws.com' + appId());
        ws.onopen = () => {
            if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
            const t = tok();
            if (t) ws.send(JSON.stringify({ authorize: t }));
            else toast('Live Deriv market feed active (Log in via Deriv for real trades).');
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
                    toast('Deriv error: ' + d.error.message);
                    journal('Trade rejected: ' + d.error.message);
                }
                return;
            }
            if (d.msg_type === 'authorize' && d.authorize) {
                auth = true;
                loginId = d.authorize.loginid;
                curr = d.authorize.currency || 'USD';
                state.balance = Number(d.authorize.balance);
                if (typeof updateDemoBalance === 'function') updateDemoBalance();
                ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                toast('Connected to Deriv (' + loginId + ': ' + state.balance.toFixed(2) + ' ' + curr + ')');
            }
            if (d.msg_type === 'balance' && d.balance) {
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
            setTimeout(conn, 3000);
        };
    }
    window.startTickTimer = function () {
        if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
    };
    const orig = window.beginDemoTrade;
    window.beginDemoTrade = function (g) {
        if (!auth || !ws || ws.readyState !== 1) return orig(g);
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
    window.settleDemoTrade = function () {};
    if (typeof tickTimer !== 'undefined') clearInterval(tickTimer);
    conn();
})();
