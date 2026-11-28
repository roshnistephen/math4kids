/* Rainbow Kingdom — original music box lullabies and sound effects, made live with the Web Audio API. */
(function () {
    'use strict';
    const RK = window.RK = window.RK || {};
    const KEY = 'lokakids.kingdom.audio';
    const state = { music: true, sfx: true, voice: true };
    try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

    /* One theme per mood. chords are semitone offsets from root; scale is the melody pool. */
    const THEMES = {
        title:  { bpm: 78,  root: 60, scale: [0, 2, 4, 7, 9],  chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], seed: 11, bass: true },
        dawn:   { bpm: 92,  root: 60, scale: [0, 2, 4, 7, 9],  chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], seed: 23, bass: true },
        forest: { bpm: 84,  root: 57, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], seed: 37, bass: true },
        canyon: { bpm: 96,  root: 62, scale: [0, 2, 4, 6, 9],  chords: [[0, 4, 7], [2, 6, 9], [9, 12, 16], [4, 7, 11]], seed: 41, bass: true },
        bubble: { bpm: 88,  root: 63, scale: [0, 2, 4, 7, 9],  chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], seed: 53, bass: true },
        neon:   { style: 'synth', bpm: 112, root: 57, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], seed: 97 },
        candy:  { bpm: 104, root: 65, scale: [0, 2, 4, 7, 9],  chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [9, 12, 16]], seed: 79, bass: true, bright: true },
        home:   { bpm: 108, root: 67, scale: [0, 2, 4, 7, 9],  chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], seed: 67, bass: true, bright: true }
    };

    let ctx = null, master, musicBus, sfxBus, reverb, wet, dry, cur = null;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    function impulse(sec, decay) {
        const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
        return b;
    }

    function ensure() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = state.music ? 0.55 : 0;
        sfxBus = ctx.createGain(); sfxBus.gain.value = state.sfx ? 0.9 : 0;
        reverb = ctx.createConvolver(); reverb.buffer = impulse(2.4, 2.4);
        wet = ctx.createGain(); wet.gain.value = 0.34; dry = ctx.createGain(); dry.gain.value = 0.85;
        musicBus.connect(dry); musicBus.connect(reverb); reverb.connect(wet);
        sfxBus.connect(dry); sfxBus.connect(reverb);
        dry.connect(master); wet.connect(master);
        return ctx;
    }

    /* A single enveloped oscillator. */
    function note(dest, freq, t, dur, o) {
        o = o || {};
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
        if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
        const a = o.attack || 0.008, v = o.vol || 0.15;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let out = osc;
        if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); out = f; }
        out.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + dur + 0.05);
    }
    const bell = (dest, freq, t, vol, len) => {          // music-box tone: fundamental + soft overtones
        note(dest, freq, t, len || 1.5, { vol: vol, attack: 0.004 });
        note(dest, freq * 2, t, (len || 1.5) * 0.45, { vol: vol * 0.28, attack: 0.004 });
        note(dest, freq * 3.01, t, 0.25, { vol: vol * 0.1, attack: 0.002 });
    };

    /* ── Synth toolkit: noise bursts and drum hits ── */
    let noiseBuf = null;
    function noiseBuffer() { if (noiseBuf) return noiseBuf; const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
    function burst(dest, t, dur, o) {
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuffer(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t); if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur); f.Q.value = o.q || 1;
        g.gain.setValueAtTime(o.vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }
    const kick = (d, t, v) => { note(d, 150, t, 0.32, { vol: v || 0.34, attack: 0.002, slideTo: 42 }); burst(d, t, 0.03, { type: 'lowpass', freq: 800, vol: (v || 0.34) * 0.4 }); };
    const clap = (d, t, v) => { burst(d, t, 0.14, { freq: 1700, q: 0.8, vol: v || 0.17 }); burst(d, t + 0.012, 0.12, { freq: 2100, q: 0.8, vol: (v || 0.17) * 0.7 }); };
    const hat = (d, t, open, v) => burst(d, t, open ? 0.2 : 0.045, { type: 'highpass', freq: 7500, vol: v || 0.05 });
    /* One 8th-note step of the synthwave backing track */
    function synthStep(out, t, s, b, ch, th, step, rand) {
        if (s % 2 === 0) kick(out, t, s === 0 ? 0.4 : 0.34);
        if (s === 2 || s === 6) clap(out, t);
        if (s % 2 === 1) hat(out, t, s === 7, s === 7 ? 0.06 : 0.045);
        const root = th.root + ch[0] - 24;
        note(out, mtof(root + (s % 4 === 3 ? 12 : 0)), t, step * 0.92, { type: 'sawtooth', vol: 0.11, attack: 0.004, lp: 380 + (b % 2) * 90 });          // pulsing bass
        const tones = [ch[0], ch[1], ch[2], ch[1] + 12];
        note(out, mtof(th.root + tones[s % 4] + 12), t, step * 0.78, { type: 'square', vol: 0.04, attack: 0.003, lp: 2200 + (s % 2) * 600 });           // arpeggio
        if (s === 0) ch.forEach((semi, i) => { note(out, mtof(th.root + semi), t, step * 8, { type: 'sawtooth', vol: 0.018, attack: 0.35, lp: 1100 }); note(out, mtof(th.root + semi) * 1.006, t, step * 8, { type: 'sawtooth', vol: 0.014, attack: 0.35, lp: 1100 }); });   // pad
        if (s === 5 && b % 2 === 1 && rand() < 0.7) bell(out, mtof(th.root + th.scale[Math.floor(rand() * 5)] + 24), t, 0.06, 0.9);                       // sparkle
    }

    function stopCurrent(fade) {
        if (!cur) return;
        const c = cur; cur = null;
        clearInterval(c.timer);
        try { c.out.gain.cancelScheduledValues(ctx.currentTime); c.out.gain.setValueAtTime(c.out.gain.value, ctx.currentTime); c.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + (fade || 0.8)); } catch (e) { /* ignore */ }
        setTimeout(() => { try { c.out.disconnect(); } catch (e) { /* ignore */ } }, ((fade || 0.8) + 0.3) * 1000);
    }

    function play(name) {
        const th = THEMES[name] || THEMES.title;
        if (!ensure()) return;
        if (cur && cur.name === name) return;
        stopCurrent(1);
        const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, ctx.currentTime); out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4); out.connect(musicBus);
        const rand = rng(th.seed), step = 60 / th.bpm / 2, bar = 8;
        // Compose a 4-bar melody once so the tune is memorable on every loop
        const melody = []; let idx = 2;
        for (let b = 0; b < 4; b++) for (let s = 0; s < bar; s++) {
            if (s === 0) { const ch = th.chords[b]; idx = th.scale.findIndex(x => (x % 12 + 12) % 12 === (ch[1] % 12 + 12) % 12); if (idx < 0) idx = 2; melody.push(idx + 5); continue; }
            if (rand() < 0.28 && s % 2) { melody.push(null); continue; }
            idx = Math.max(0, Math.min(th.scale.length * 2 - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(rand() * 6)]));
            melody.push(idx + 5);
        }
        const c = cur = { name, out, n: 0, next: ctx.currentTime + 0.15, timer: 0 };
        const sched = () => {
            if (cur !== c) return;
            while (c.next < ctx.currentTime + 0.3) {
                const t = c.next, n = c.n, b = Math.floor(n / bar) % 4, s = n % bar, ch = th.chords[b];
                if (th.style === 'synth') { synthStep(out, t, s, b, ch, th, step, rand); c.next += step; c.n++; continue; }
                if (s === 0) {   // pad + bass at the start of each bar
                    ch.forEach(semi => note(out, mtof(th.root + semi - 12), t, step * bar * 1.05, { type: 'triangle', vol: 0.055, attack: 0.5, lp: 900 }));
                    if (th.bass) note(out, mtof(th.root + ch[0] - 24), t, step * 4, { vol: 0.12, attack: 0.03 });
                }
                if (th.bass && s === 4) note(out, mtof(th.root + ch[0] - 24), t, step * 3, { vol: 0.09, attack: 0.03 });
                const m = melody[b * bar + s];
                if (m !== null && m !== undefined) {
                    const deg = th.scale[m % th.scale.length] + 12 * Math.floor(m / th.scale.length);
                    bell(out, mtof(th.root + deg), t, s % 4 === 0 ? 0.16 : 0.11, 1.6);
                }
                if (s === 6 && rand() < 0.5) bell(out, mtof(th.root + th.scale[Math.floor(rand() * 5)] + 24), t + step * 0.5, 0.045, 1.2);   // twinkle
                if (th.bright && s % 2 === 0) note(out, mtof(th.root + ch[2] + 12), t, step * 0.9, { type: 'triangle', vol: 0.025, attack: 0.01, lp: 3000 });
                c.next += step; c.n++;
            }
        };
        sched(); c.timer = setInterval(sched, 90);
    }

    /* Short sound effects */
    const SFX = {
        click(t) { note(sfxBus, 880, t, 0.08, { vol: 0.07, type: 'triangle' }); },
        star(t, o) { const k = Math.min(7, (o && o.combo) || 0), base = 880 * Math.pow(2, [0, 2, 4, 5, 7, 9, 11, 12][k] / 12); note(sfxBus, base, t, 0.18, { vol: 0.13, type: 'sine' }); note(sfxBus, base * 1.5, t + 0.07, 0.3, { vol: 0.1, type: 'sine' }); },
        ring(t) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(sfxBus, f, t + i * 0.07, 0.13, 1.2)); },
        hit(t) { note(sfxBus, 340, t, 0.32, { vol: 0.2, type: 'triangle', slideTo: 90 }); note(sfxBus, 170, t, 0.25, { vol: 0.12, type: 'sine', slideTo: 70 }); },
        magic(t) { note(sfxBus, 330, t, 0.7, { vol: 0.14, type: 'triangle', slideTo: 1760 }); [1047, 1319, 1568, 2093].forEach((f, i) => bell(sfxBus, f, t + 0.1 + i * 0.08, 0.1, 1)); },
        ready(t) { note(sfxBus, 660, t, 0.18, { vol: 0.12, type: 'triangle' }); },
        go(t) { note(sfxBus, 988, t, 0.45, { vol: 0.14, type: 'triangle' }); note(sfxBus, 1319, t + 0.08, 0.5, { vol: 0.1 }); },
        win(t) { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => bell(sfxBus, f, t + i * 0.12, 0.16, 1.8)); },
        found(t) { [784, 988, 1175, 1568].forEach((f, i) => bell(sfxBus, f, t + i * 0.1, 0.15, 1.6)); },
        lose(t) { [523, 440, 349].forEach((f, i) => bell(sfxBus, f, t + i * 0.16, 0.11, 1.2)); },
        shield(t) { [660, 880, 1175, 1568].forEach((f, i) => bell(sfxBus, f, t + i * 0.06, 0.07, 0.9)); burst(sfxBus, t, 0.35, { type: 'highpass', freq: 3000, sweep: 8000, vol: 0.05 }); },
        nova(t) { note(sfxBus, 200, t, 0.7, { type: 'sawtooth', vol: 0.12, slideTo: 1400, lp: 2400 }); note(sfxBus, 90, t + 0.55, 0.5, { vol: 0.28, slideTo: 32 }); burst(sfxBus, t + 0.55, 0.5, { type: 'lowpass', freq: 3000, sweep: 150, vol: 0.25 }); },
        solve(t) { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => { bell(sfxBus, f, t + i * 0.08, 0.12, 1.4); note(sfxBus, f, t + i * 0.08, 0.2, { type: 'square', vol: 0.04, lp: 2600 }); }); },
        fail(t) { [392, 330, 262].forEach((f, i) => note(sfxBus, f, t + i * 0.14, 0.3, { type: 'triangle', vol: 0.1, slideTo: f * 0.9 })); },
        unlock(t) { [784, 988, 1175, 1568, 1976].forEach((f, i) => bell(sfxBus, f, t + i * 0.07, 0.1, 1.5)); },
        tick(t) { note(sfxBus, 880, t, 0.05, { vol: 0.05, type: 'square', lp: 2000 }); },
        victory(t) { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => { note(sfxBus, f, t + i * 0.1, 0.5, { type: 'sawtooth', vol: 0.07, lp: 2600 }); bell(sfxBus, f * 2, t + i * 0.1 + 0.02, 0.09, 1.6); }); kick(sfxBus, t, 0.3); burst(sfxBus, t + 0.5, 0.9, { type: 'highpass', freq: 5000, sweep: 9000, vol: 0.05 }); [0, 0.25, 0.5, 0.75, 1].forEach(d => bell(sfxBus, 1568 + d * 300, t + 0.6 + d * 0.12, 0.06, 1)); },
        zap(t) { note(sfxBus, 1500, t, 0.2, { type: 'square', vol: 0.06, slideTo: 240, lp: 3200 }); burst(sfxBus, t, 0.14, { freq: 2600, q: 1.4, vol: 0.06 }); },
        combo(t, o) { const n = Math.min(8, (o && o.i) || 3), sc = [0, 2, 4, 7, 9, 12, 14, 16]; for (let j = 0; j < n; j++) bell(sfxBus, 523.25 * Math.pow(2, sc[j] / 12), t + j * 0.05, 0.07, 0.8); },
        turn(t, o) { const f = [392, 494, 587, 698][((o && o.i) || 0) % 4]; burst(sfxBus, t, 0.12, { freq: 500, sweep: 2600, q: 1.2, vol: 0.045 }); note(sfxBus, f, t + 0.02, 0.12, { vol: 0.05, type: 'sine' }); },
        think(t) { note(sfxBus, 660, t, 0.06, { vol: 0.03, type: 'square', lp: 1800 }); },
        place(t, o) { const f = [392, 494, 587, 698][((o && o.i) || 0) % 4]; note(sfxBus, f, t, 0.16, { vol: 0.1, type: 'triangle', slideTo: f * 1.5 }); note(sfxBus, f * 2, t + 0.03, 0.1, { vol: 0.05, type: 'sine' }); burst(sfxBus, t, 0.05, { type: 'highpass', freq: 4200, vol: 0.05 }); },
        boom(t, o) { const k = Math.min(10, (o && o.i) || 1); note(sfxBus, 150 + k * 6, t, 0.42, { vol: 0.2 + Math.min(0.1, k * 0.012), type: 'sine', attack: 0.003, slideTo: 38 }); burst(sfxBus, t, 0.36, { type: 'lowpass', freq: 2400, sweep: 180, vol: 0.2 }); burst(sfxBus, t, 0.1, { type: 'highpass', freq: 3200, vol: 0.09 }); bell(sfxBus, 520 * Math.pow(1.1, k), t + 0.04, 0.06, 0.6); },
        elim(t) { note(sfxBus, 440, t, 0.75, { type: 'sawtooth', vol: 0.13, slideTo: 55, lp: 1400 }); burst(sfxBus, t, 0.55, { type: 'lowpass', freq: 1600, sweep: 120, vol: 0.2 }); [392, 311, 233].forEach((f, i) => bell(sfxBus, f, t + 0.12 + i * 0.14, 0.09, 1.2)); },
        no(t) { note(sfxBus, 180, t, 0.16, { vol: 0.1, type: 'square', slideTo: 120, lp: 800 }); },
        step(t, o) { const n = [523.25, 587.33, 659.25, 783.99, 880, 1046.5][((o && o.i) || 0) % 6]; note(sfxBus, n, t, 0.14, { vol: 0.07, type: 'sine' }); },
        bump(t) { note(sfxBus, 260, t, 0.22, { vol: 0.16, type: 'triangle', slideTo: 110 }); note(sfxBus, 520, t + 0.02, 0.12, { vol: 0.06, type: 'square', slideTo: 300 }); },
        undo(t) { note(sfxBus, 740, t, 0.12, { vol: 0.07, type: 'triangle', slideTo: 520 }); },
        hint(t) { [988, 1319].forEach((f, i) => bell(sfxBus, f, t + i * 0.09, 0.09, 0.9)); },
        whoosh(t) { note(sfxBus, 220, t, 0.4, { vol: 0.05, type: 'sawtooth', slideTo: 900, lp: 1200 }); }
    };

    /* Narrator: the browser's own text-to-speech, with a distinct pitch for each character. The music dips while someone is talking. */
    const synth = window.speechSynthesis, Voice = { queueId: 0 };
    let voices = [], picked = null;
    function loadVoices() {
        if (!synth) return;
        voices = synth.getVoices() || [];
        const en = voices.filter(v => /^en/i.test(v.lang));
        const pref = [/samantha|karen|moira|tessa|serena|fiona|google uk english female|google us english|microsoft (aria|jenny|zira)|female/i];
        picked = en.find(v => pref[0].test(v.name)) || en.find(v => /en-(us|gb|au|in)/i.test(v.lang)) || en[0] || null;
    }
    if (synth) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; } }
    const CHARS = { narrator: { pitch: 1.12, rate: 0.93 }, luna: { pitch: 1.4, rate: 1.0 }, bella: { pitch: 1.7, rate: 1.06 } };
    const clean = t => String(t).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').replace(/…/g, '...').trim();
    function duck(on) { if (ctx && musicBus) musicBus.gain.setTargetAtTime(on ? (state.music ? 0.16 : 0) : (state.music ? 0.55 : 0), ctx.currentTime, 0.15); }
    Voice.available = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
    Voice.on = () => Voice.available() && state.voice;
    Voice.stop = () => { if (!synth) return; Voice.queueId++; try { synth.cancel(); } catch (e) { /* ignore */ } duck(false); };
    Voice.speak = (text, who) => {
        if (!Voice.on()) return false;
        const id = ++Voice.queueId, c = CHARS[who] || CHARS.narrator;
        try { synth.cancel(); } catch (e) { /* ignore */ }
        const txt = clean(text), parts = (txt.match(/[^.!?]+[.!?]*/g) || [txt]).map(x => x.trim()).filter(Boolean);
        parts.forEach((part, i) => {
            const u = new SpeechSynthesisUtterance(part); u.pitch = c.pitch; u.rate = c.rate; u.volume = 1; if (picked) { u.voice = picked; u.lang = picked.lang; } else u.lang = 'en-US';
            if (i === 0) u.onstart = () => { if (id === Voice.queueId) duck(true); };
            if (i === parts.length - 1) { u.onend = () => { if (id === Voice.queueId) duck(false); }; u.onerror = () => duck(false); }
            synth.speak(u);
        });
        return true;
    };

    RK.Voice = Voice;
    RK.Audio = {
        state,
        unlock() { ensure(); },
        play,
        stop(f) { if (ctx) stopCurrent(f); },
        sfx(name, o) { if (!state.sfx || !ensure() || !SFX[name]) return; SFX[name](ctx.currentTime + 0.01, o); },
        setMusic(on) { state.music = !!on; persist(); if (ctx) musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.1); },
        setVoice(on) { state.voice = !!on; persist(); if (!on) Voice.stop(); },
        setSfx(on) { state.sfx = !!on; persist(); if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05); },
        pause() { Voice.stop(); if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
        resume() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
    };
})();
