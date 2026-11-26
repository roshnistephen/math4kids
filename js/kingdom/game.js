/* Rainbow Kingdom — Luna's Magical Quest. Game engine, controls, HUD and story screens. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK, A = RK.Audio, M = RK.Models;
    const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const stage = $('#stage');
    const IMG = n => 'images/kingdom/' + n + '.png';

    /* ── Saved progress ── */
    const SAVE_KEY = 'lokakids.kingdom.save';
    let save = { unlocked: 1, stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0] };
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && Array.isArray(d.stars)) save = Object.assign(save, d); } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
    const vibrate = p => { try { if (navigator.vibrate && A.state.sfx) navigator.vibrate(p); } catch (e) { /* ignore */ } };

    /* ── Three.js scene ── */
    let renderer, scene, camera, luna, bella, world, level, levelIdx = 0, particles;
    let portrait = false;
    function initGL() {
        try { renderer = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'high-performance' }); }
        catch (e) { return false; }
        renderer.setClearColor(0x000000, 0);
        stage.appendChild(renderer.domElement);
        scene = new T.Scene();
        camera = new T.PerspectiveCamera(62, 1, 0.5, 400);
        scene.add(new T.HemisphereLight(0xffffff, 0xd9c8ff, 1.0));
        const sun = new T.DirectionalLight(0xfff0d8, 0.55); sun.position.set(-0.6, 1, 0.7); scene.add(sun);
        luna = M.buildUnicorn(M.LUNA); scene.add(luna);
        bella = M.buildUnicorn(M.BELLA); bella.scale.setScalar(0.92); bella.rotation.y = 0; scene.add(bella); bella.visible = false;
        particles = new Particles(700); scene.add(particles.points);
        resize();
        return true;
    }
    function resize() {
        if (!renderer) return;
        const w = window.innerWidth, h = window.innerHeight;
        portrait = h > w * 1.1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.fov = portrait ? 74 : 60; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 150));

    /* Glowing particles: rainbow trail, sparkle bursts, hit puffs */
    function Particles(n) {
        this.n = n; this.head = 0;
        this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
        this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n).fill(1);
        for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.BufferAttribute(this.col, 3));
        this.geo = g;
        this.points = new T.Points(g, new T.PointsMaterial({ size: 1.1, map: M.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
        this.points.frustumCulled = false;
    }
    const tmpC = new T.Color();
    Particles.prototype.emit = function (x, y, z, vx, vy, vz, life, color) {
        const i = this.head; this.head = (this.head + 1) % this.n; tmpC.set(color);
        this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
        this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
        this.base[i * 3] = tmpC.r; this.base[i * 3 + 1] = tmpC.g; this.base[i * 3 + 2] = tmpC.b;
        this.life[i] = life; this.max[i] = life;
    };
    Particles.prototype.burst = function (x, y, z, n, speed, colors, life) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = speed * (0.4 + Math.random() * 0.6);
            this.emit(x, y, z, Math.sin(b) * Math.cos(a) * s, Math.sin(b) * Math.sin(a) * s, Math.cos(b) * s, (life || 0.9) * (0.7 + Math.random() * 0.5), colors[i % colors.length]);
        }
    };
    Particles.prototype.update = function (dt) {
        for (let i = 0; i < this.n; i++) {
            if (this.life[i] <= 0) continue;
            this.life[i] -= dt;
            if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -9999; this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; continue; }
            this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
            const f = this.life[i] / this.max[i];
            this.col[i * 3] = this.base[i * 3] * f; this.col[i * 3 + 1] = this.base[i * 3 + 1] * f; this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
        }
        this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    };

    /* ── Game state ── */
    let state = 'title';   // title | intro | count | play | found | paused | over | end
    let run = null, clock = 0, last = 0, effects = [], rainbowI = 0, camLook = new T.Vector3(), camPos = new T.Vector3(), toastTimer = 0, goalT = 0;
    const input = { dragging: false, id: -1, sx: 0, sy: 0, tx0: 0, ty0: 0, keys: {} };
    const LR = 0.95;   // Luna's collision radius

    function newRun() {
        const L = level;
        return { z: 0, lx: 0, ly: L.yMid, tx: 0, ty: L.yMid, bank: 0, pitch: 0, hearts: 3, stars: 0, rings: 0, magic: 0, magicT: 0, inv: 0, shake: 0, combo: 0, comboT: 0, time: 0, cp: { z: 0, x: 0, y: L.yMid }, continues: 0, hints: {}, bx: 2.5, by: L.yMid + 0.4, over: false };
    }

    function loadLevel(idx) {
        levelIdx = idx; level = RK.LEVELS[idx];
        if (world) { scene.remove(world.group); world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh && o.dispose) o.dispose(); }); }
        world = RK.buildWorld(level, scene);
        scene.fog = new T.Fog(new T.Color(level.fog), 70, 300);
        const s = level.sky; $('#sky').style.background = 'linear-gradient(180deg,' + s[0] + ' 0%,' + s[1] + ' 55%,' + s[2] + ' 100%)';
        document.documentElement.style.setProperty('--sky-bottom', s[2]);
        run = newRun(); effects = [];
        bella.visible = !!level.withBella;
        placeActors(0);
        setHUDLevel();
        camera.position.set(run.lx + 12, run.ly + 4, run.z + 16); camLook.set(run.lx, run.ly + 0.6, run.z);
    }

    function placeActors(t) {
        luna.position.set(run.lx, run.ly, run.z); M.animateUnicorn(luna, t, { flap: 6 });
        if (bella.visible) { bella.position.set(run.bx, run.by, run.z + 6.5); M.animateUnicorn(bella, t + 1, { flap: 6 }); }
    }

    /* ── HUD ── */
    const hud = $('#hud'), toastEl = $('#toast'), countEl = $('#count');
    let hudCache = {};
    function setHUD(k, v, fn) { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } }
    function setHUDLevel() {
        hudCache = {};
        $('#h-level').textContent = 'Level ' + level.id + ' · ' + level.name;
        $('#h-goal').src = IMG(level.clueIcon);
        updateHUD();
    }
    function updateHUD() {
        const total = world ? world.starsTotal : 0;
        setHUD('stars', run.stars + '/' + total, v => { $('#h-stars').textContent = v; });
        setHUD('hearts', run.hearts, v => { $$('#h-hearts i').forEach((h, i) => h.classList.toggle('lost', i >= v)); });
        const p = clamp(-run.z / level.length, 0, 1);
        setHUD('prog', Math.round(p * 500), () => { $('#h-fill').style.width = (p * 100) + '%'; $('#h-luna').style.left = (p * 100) + '%'; });
        const mp = run.magicT > 0 ? run.magicT / 4.5 : run.magic / 100;
        setHUD('magic', Math.round(mp * 100) + (run.magicT > 0 ? 'a' : run.magic >= 100 ? 'r' : ''), () => { const b = $('#magic'); b.style.setProperty('--p', mp * 360 + 'deg'); b.classList.toggle('ready', run.magic >= 100 && run.magicT <= 0); b.classList.toggle('active', run.magicT > 0); });
    }
    function toast(text, ms) {
        toastEl.textContent = text; toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 3200);
    }
    function pulse(sel) { const e = $(sel); if (!e) return; e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }

    /* ── Screens ── */
    const SCREENS = ['title', 'levels', 'intro', 'result', 'pause', 'over', 'end'];
    function show(name) {
        SCREENS.forEach(s => { $('#scr-' + s).hidden = s !== name; });
        hud.hidden = !(name === null || name === 'pause' || name === 'over');
        document.body.dataset.screen = name || 'play';
    }

    function buildLevels() {
        const wrap = $('#levels-grid'); wrap.innerHTML = '';
        RK.LEVELS.forEach((L, i) => {
            const locked = i + 1 > save.unlocked, st = save.stars[i];
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'lvl' + (locked ? ' is-locked' : ''); b.disabled = locked;
            b.style.setProperty('--c1', L.sky[0]); b.style.setProperty('--c2', L.sky[2]);
            b.innerHTML = '<span class="lvl__num">' + L.id + '</span><img class="lvl__ic" src="' + IMG(L.clueIcon) + '" alt=""><span class="lvl__name">' + L.name + '</span><span class="lvl__blurb">' + L.blurb + '</span>' +
                '<span class="lvl__stars">' + [0, 1, 2].map(k => '<i class="' + (k < st ? 'on' : '') + '">★</i>').join('') + '</span>' + (locked ? '<span class="lvl__lock">🔒</span>' : '');
            b.onclick = () => { A.sfx('click'); openIntro(i); };
            wrap.appendChild(b);
        });
    }

    function openTitle() {
        state = 'title'; show('title');
        if (!world || levelIdx !== 0) loadLevel(0);
        const cont = save.unlocked > 1 || save.stars[0] > 0;
        $('#btn-play').innerHTML = cont ? 'Continue ▶' : 'Play ▶';
        A.play('title');
    }
    function openLevels() { buildLevels(); state = 'title'; show('levels'); }

    function openIntro(idx) {
        loadLevel(idx); state = 'intro'; show('intro');
        $('#intro-num').textContent = 'Level ' + level.id;
        $('#intro-title').textContent = level.name;
        $('#intro-story').textContent = level.story;
        $('#intro-tip').textContent = '💡 ' + level.tip;
        $('#quest').innerHTML = RK.LEVELS.map((L, i) => '<li class="' + (save.stars[i] > 0 ? 'got' : i === idx ? 'now' : '') + '"><img src="' + IMG(L.clueIcon) + '" alt="' + L.clueName + '"><span>' + (i === 4 ? 'Home' : i === 3 ? 'Bella' : 'Clue ' + (i + 1)) + '</span></li>').join('');
        A.play(level.music);
    }

    function startCountdown() {
        A.unlock(); A.sfx('click');
        loadLevel(levelIdx); show(null); state = 'count'; goalT = 0;
        camera.position.set(run.lx, run.ly + (portrait ? 6.8 : 4.8), run.z + (portrait ? 17 : 13)); camLook.set(run.lx, run.ly + 1.2, run.z - 18);
        let n = 3;
        countEl.hidden = false;
        const tick = () => {
            if (state !== 'count') { countEl.hidden = true; return; }
            if (n > 0) { countEl.textContent = n; countEl.className = 'count pop'; A.sfx('ready'); n--; setTimeout(tick, 650); }
            else { countEl.textContent = 'Fly!'; countEl.className = 'count pop go'; A.sfx('go'); state = 'play'; run.time = 0; toast(level.tip, 4200); setTimeout(() => { countEl.hidden = true; }, 700); }
        };
        tick();
    }

    function pause() { if (state !== 'play') return; state = 'paused'; show('pause'); A.sfx('click'); }
    function resume() { if (state !== 'paused') return; state = 'play'; show(null); A.sfx('click'); }

    /* ── Rewards, hits and magic ── */
    function addMagic(v) { if (run.magicT > 0) return; run.magic = Math.min(100, run.magic + v); }
    function useMagic() {
        if (state !== 'play' || run.magic < 100 || run.magicT > 0) return;
        run.magicT = 4.5; run.magic = 0; A.sfx('magic'); vibrate([20, 30, 40]);
        particles.burst(run.lx, run.ly, run.z, 60, 14, M.RAINBOW, 1.2); toast('✨ Rainbow Dash! You can\'t be hurt!', 2200);
    }
    function hit(ob) {
        run.hearts--; run.inv = 1.9; run.shake = 0.55; run.combo = 0;
        A.sfx('hit'); vibrate(60); pulse('#h-hearts');
        particles.burst(run.lx, run.ly, run.z, 26, 9, ['#FFFFFF', '#C9C2E8', '#FFB8D9'], 0.8);
        if (run.hearts <= 0) { run.over = true; state = 'over'; setTimeout(() => { if (state === 'over') { show('over'); A.sfx('lose'); } }, 700); }
    }

    /* ── Main update ── */
    function update(dt) {
        const t = clock, L = level;
        if (state === 'play' || state === 'count' || state === 'found') {
            if (state === 'play') {
                run.time += dt;
                const ramp = Math.min(1, run.time / 2.2);
                const spd = L.speed * (0.45 + 0.55 * ramp) * (run.magicT > 0 ? 1.5 : 1);
                run.z -= spd * dt;
                // keyboard steering
                const k = input.keys;
                if (k.left || k.right || k.up || k.down) {
                    run.tx = clamp(run.tx + ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 17 * dt, -L.xr, L.xr);
                    run.ty = clamp(run.ty + ((k.up ? 1 : 0) - (k.down ? 1 : 0)) * 13 * dt, L.yMin, L.yMax);
                }
                if (run.magicT > 0) { run.magicT -= dt; if (run.magicT <= 0) { run.magicT = 0; run.inv = Math.max(run.inv, 0.6); } }
                run.inv = Math.max(0, run.inv - dt); run.shake = Math.max(0, run.shake - dt);
                run.comboT -= dt; if (run.comboT <= 0) run.combo = 0;
                const f = 1 - Math.exp(-dt * (run.magicT > 0 ? 9 : 7));
                const ox = run.lx, oy = run.ly;
                run.lx += (run.tx - run.lx) * f; run.ly += (run.ty - run.ly) * f;
                run.bank += (clamp((run.tx - run.lx) * 0.1, -0.8, 0.8) - run.bank) * Math.min(1, dt * 8);
                run.pitch += (clamp((run.ty - run.ly) * 0.06, -0.5, 0.5) - run.pitch) * Math.min(1, dt * 8);
                interact(dt);
                // story hints along the way
                const p = -run.z / L.length;
                if (!run.hints.a && p > 0.4) { run.hints.a = 1; toast(['Great flying, Luna! Keep going! 🌟', 'The trees whisper: "Bella was here!" 🌳', 'The canyon sparkles brighter! 💎', 'Luna hears Bella calling! 💗', 'Rainbow Castle is getting closer! 🏰'][levelIdx], 3000); }
                if (!run.hints.b && p > 0.8) { run.hints.b = 1; toast(levelIdx === 3 ? 'Bella is just ahead — hurry! 🫧' : 'Almost there! Fly to the glow! ✨', 2800); }
                // goal
                if (run.z <= world.goal.z + (world.goal.kind === 'castle' ? 90 : 16)) goalReached();
                // rainbow trail
                emitTrail(dt, spd);
            } else if (state === 'count') {
                run.time += dt;
            } else {   // found: float to the goal
                goalT += dt;
                const g = world.goal, f = 1 - Math.exp(-dt * 2.2);
                run.lx += (g.x - 0 - run.lx) * f * 0.8; run.ly += (g.y - run.ly) * f * 0.8; run.z += (g.z + (g.kind === 'castle' ? 38 : 9) - run.z) * f * 0.6;
                run.bank *= 0.9; run.pitch *= 0.9;
                if (Math.random() < dt * 14) particles.burst(g.x + (Math.random() - 0.5) * 8, g.y + Math.random() * 6, g.z, 3, 6, M.RAINBOW, 1.1);
                if (goalT > (g.kind === 'castle' ? 4.2 : 3.2) && !run.shown) { run.shown = true; showResult(); }
            }
        } else if (state === 'over') {
            run.shake = Math.max(0, run.shake - dt);
        }
        // Luna and Bella
        if (state === 'play' || state === 'count' || state === 'found' || state === 'over' || state === 'paused') {
            luna.visible = run.inv > 0 && state === 'play' && run.magicT <= 0 ? Math.floor(t * 14) % 2 === 0 : true;
            luna.position.set(run.lx, run.ly, run.z);
            M.animateUnicorn(luna, t, { flap: state === 'play' ? 8 : 6, bank: run.bank, pitch: run.pitch, boost: run.magicT > 0 });
            if (bella.visible) {
                run.bx += ((run.lx + 2.8) - run.bx) * Math.min(1, dt * 2.6); run.by += ((run.ly + 0.5 + Math.sin(t * 2) * 0.4) - run.by) * Math.min(1, dt * 2.6);
                bella.position.set(run.bx, run.by, run.z + 6.2);
                M.animateUnicorn(bella, t + 1, { flap: 7, bank: run.bank * 0.7, pitch: run.pitch * 0.7 });
            }
        } else {   // title / intro: gentle idle hover
            luna.visible = true; luna.position.set(run.lx, run.ly + Math.sin(t * 1.5) * 0.5, run.z);
            M.animateUnicorn(luna, t, { flap: 5, bank: Math.sin(t * 0.7) * 0.12 });
            if (bella.visible) { bella.position.set(run.lx + 4, run.ly + 0.8 + Math.sin(t * 1.8) * 0.5, run.z + 1); M.animateUnicorn(bella, t + 1, { flap: 5 }); }
        }
        world.update(t, run.z);
        effects = effects.filter(e => { e.t += dt; const k = e.t / 0.45; if (k >= 1) { e.mesh.visible = false; return false; } e.mesh.visible = true; e.mesh.scale.setScalar(1 + k * 0.9); return true; });
        particles.update(dt);
        updateCamera(dt, t);
        if (state === 'play') updateHUD();
    }

    function interact(dt) {
        const lx = run.lx, ly = run.ly, lz = run.z;
        // Stars (with magnet while using magic)
        world.stars.forEach(s => {
            if (s.got || Math.abs(s.z - lz) > 22) return;
            if (run.magicT > 0) { const dx = lx - s.x, dy = ly - s.y, dz = lz - s.z, d = Math.hypot(dx, dy, dz); if (d < 18 && d > 0.01) { const m = Math.min(1, dt * 9); s.x += dx * m; s.y += dy * m; s.z += dz * m; s.mesh.position.set(s.x, s.y, s.z); } }
            if (Math.hypot(lx - s.x, ly - s.y, lz - s.z) < 2.0) {
                s.got = true; s.mesh.visible = false; run.stars++; run.combo++; run.comboT = 1.4; addMagic(8);
                A.sfx('star', { combo: run.combo - 1 }); vibrate(8); pulse('#h-starchip');
                particles.burst(s.x, s.y, s.z, 10, 6, ['#FFE680', '#FFFFFF', '#FFD84A'], 0.7);
            }
        });
        // Rings: passing through the glowing path
        world.rings.forEach(r => {
            if (r.state !== 0 || lz > r.z) return;
            if (Math.abs(lz - r.z) > 6) { r.state = 2; return; }
            if (Math.hypot(lx - r.x, ly - r.y) < 3.7) {
                r.state = 1; run.rings++; run.cp = { z: r.z, x: r.x, y: r.y }; addMagic(14);
                A.sfx('ring'); vibrate(12);
                particles.burst(r.x, r.y, r.z, 22, 10, M.RAINBOW, 0.9);
                effects.push({ mesh: r.mesh, t: 0 });
            } else r.state = 2;
        });
        // Obstacles
        if (run.inv <= 0 && run.magicT <= 0) {
            for (const ob of world.obstacles) {
                if (Math.abs(ob.cols[0].z - lz) > 12) continue;
                let hitIt = false;
                for (const c of ob.cols) {
                    if (c.t === 's') { if (Math.hypot(lx - c.x, ly - c.y, lz - c.z) < c.r + LR) hitIt = true; }
                    else if (Math.hypot(lx - c.x, lz - c.z) < c.r + LR && ly > c.y0 - LR && ly < c.y1 + LR) hitIt = true;
                }
                if (hitIt) { hit(ob); break; }
            }
        }
    }

    function emitTrail(dt, spd) {
        const n = run.magicT > 0 ? 3 : 1;
        for (let i = 0; i < n; i++) {
            rainbowI++;
            const tx = luna.position.x + (Math.random() - 0.5) * 0.8, ty = luna.position.y + 0.2 + (Math.random() - 0.5) * 0.8;
            particles.emit(tx, ty, run.z + 3.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, spd * 0.15, 0.9, M.RAINBOW[rainbowI % 6]);
        }
    }

    const tv = new T.Vector3();
    function updateCamera(dt, t) {
        let tx, ty, tz;
        if (state === 'title' || state === 'intro') {
            const a = t * 0.18 + 0.6, r = portrait ? 20 : 15;
            tx = run.lx + Math.sin(a) * r; ty = run.ly + 3.5 + Math.sin(t * 0.3) * 1; tz = run.z + Math.cos(a) * r;
            camera.position.lerp(camPos.set(tx, ty, tz), 1 - Math.exp(-dt * 2)); camLook.lerp(tv.set(run.lx, run.ly + 0.6, run.z), 1 - Math.exp(-dt * 3));
        } else if (state === 'found') {
            const g = world.goal, a = goalT * 0.55 + 2.6, r = g.kind === 'castle' ? 46 : 17;
            camera.position.lerp(camPos.set(g.x + Math.sin(a) * r, g.y + 5 + goalT * 0.5, g.z + Math.cos(a) * r), 1 - Math.exp(-dt * 2.2));
            camLook.lerp(tv.set(g.x, g.y + (g.kind === 'castle' ? 8 : 0), g.z), 1 - Math.exp(-dt * 3));
        } else {
            const back = portrait ? 17 : 13, up = portrait ? 6.8 : 4.8, boost = run.magicT > 0 ? 3 : 0;
            camera.position.lerp(camPos.set(run.lx * 0.85, run.ly + up, run.z + back + boost), 1 - Math.exp(-dt * 5));
            camLook.lerp(tv.set(run.lx * 0.92, run.ly + 1.2, run.z - 18), 1 - Math.exp(-dt * 6));
        }
        if (run.shake > 0) camera.position.add(tv.set((Math.random() - 0.5) * run.shake * 1.2, (Math.random() - 0.5) * run.shake * 1.2, 0));
        camera.lookAt(camLook);
        const fovBase = portrait ? 74 : 60, fovT = fovBase + (run.magicT > 0 ? 12 : 0);
        if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
    }

    /* ── Reaching the goal, results and the ending ── */
    function goalReached() {
        if (state !== 'play') return;
        state = 'found'; goalT = 0; run.shown = false; run.magicT = 0;
        const g = world.goal;
        A.sfx(g.kind === 'castle' ? 'win' : 'found'); vibrate([40, 40, 80]); Kid_confetti();
        toast(level.found, 4500);
        if (g.kind === 'bella') {
            g.bubble.visible = false; particles.burst(g.x, g.y, g.z, 70, 12, ['#BFE8FF', '#FFC9E3', '#FFFFFF', '#E6D6FF'], 1.4);
            if (g.beam) g.beam.visible = false;
        } else if (g.kind === 'castle') {
            for (let i = 0; i < 6; i++) setTimeout(() => particles.burst(g.x + (Math.random() - 0.5) * 40, g.y + 8 + Math.random() * 18, g.z, 40, 14, M.RAINBOW, 1.5), i * 350);
        }
    }
    function Kid_confetti() { try { if (window.Kid && Kid.confetti) Kid.confetti(40); } catch (e) { /* ignore */ } }

    function showResult() {
        const total = world.starsTotal, ringsN = world.rings.length;
        const sr = total ? run.stars / total : 1, rr = ringsN ? run.rings / ringsN : 1;
        const rating = 1 + (sr >= 0.5 ? 1 : 0) + (rr >= 0.65 && run.continues === 0 ? 1 : 0);
        const prev = save.stars[levelIdx];
        save.stars[levelIdx] = Math.max(prev, rating); save.unlocked = Math.max(save.unlocked, Math.min(5, levelIdx + 2)); persist();
        if (rating > prev) { try { if (window.Kid && Kid.Stars) Kid.Stars.add('kingdom', rating - prev); } catch (e) { /* ignore */ } }
        if (levelIdx === 4) { showEnd(rating); return; }
        $('#res-title').textContent = 'Level ' + level.id + ' complete!';
        $('#res-img').src = IMG(level.clueIcon);
        $('#res-found').textContent = level.found;
        $('#res-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < rating ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('');
        $('#res-stats').innerHTML = '<div><b>' + run.stars + '/' + total + '</b><span>Stars</span></div><div><b>' + run.rings + '/' + ringsN + '</b><span>Rings</span></div><div><b>' + run.hearts + '</b><span>Hearts left</span></div>';
        $('#btn-next').textContent = levelIdx === 3 ? 'Fly home with Bella ▶' : 'Next level ▶';
        show('result'); A.sfx('win');
    }
    function showEnd(rating) {
        $('#end-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < rating ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('');
        const total = save.stars.reduce((a, b) => a + b, 0);
        $('#end-total').textContent = total + ' / 15 stars collected on your whole adventure';
        show('end'); A.sfx('win');
    }

    /* ── Controls ── */
    stage.addEventListener('pointerdown', e => {
        if (state !== 'play' || input.dragging) return;
        A.unlock(); input.dragging = true; input.id = e.pointerId; input.sx = e.clientX; input.sy = e.clientY; input.tx0 = run.tx; input.ty0 = run.ty;
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        $('#hint').classList.add('hide'); e.preventDefault();
    });
    stage.addEventListener('pointermove', e => {
        if (!input.dragging || e.pointerId !== input.id || state !== 'play') return;
        const L = level, w = Math.min(window.innerWidth, 560), h = window.innerHeight;
        run.tx = clamp(input.tx0 + (e.clientX - input.sx) * (2 * L.xr) / (w * 0.7), -L.xr, L.xr);
        run.ty = clamp(input.ty0 - (e.clientY - input.sy) * (L.yMax - L.yMin) / (h * 0.42), L.yMin, L.yMax);
        e.preventDefault();
    });
    const endDrag = e => { if (e.pointerId === input.id) input.dragging = false; };
    stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag); stage.addEventListener('lostpointercapture', endDrag);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
    document.addEventListener('keydown', e => {
        if (KEYMAP[e.key]) { input.keys[KEYMAP[e.key]] = true; if (state === 'play') e.preventDefault(); $('#hint').classList.add('hide'); }
        else if (e.key === ' ' || e.key === 'Enter') { if (state === 'play') { e.preventDefault(); useMagic(); } }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (state === 'play') pause(); else if (state === 'paused') resume(); }
    });
    document.addEventListener('keyup', e => { if (KEYMAP[e.key]) input.keys[KEYMAP[e.key]] = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pause(); A.pause(); } else A.resume(); });

    $('#magic').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useMagic(); });
    $('#h-pause').addEventListener('click', pause);

    /* ── Buttons ── */
    const ACTIONS = {
        play() { A.unlock(); const next = save.stars.findIndex(x => x === 0); openIntro(next < 0 ? 0 : Math.min(next, save.unlocked - 1)); },
        levels() { A.unlock(); openLevels(); },
        title() { openTitle(); },
        start() { startCountdown(); },
        next() { A.sfx('click'); openIntro(Math.min(4, levelIdx + 1)); },
        replay() { A.sfx('click'); openIntro(levelIdx); },
        resume() { resume(); },
        restart() { A.sfx('click'); startCountdown(); },
        keep() {   // carry on from the last glowing ring with full hearts
            A.sfx('click'); run.hearts = 3; run.inv = 2.2; run.over = false; run.continues++;
            run.z = run.cp.z; run.lx = run.tx = run.cp.x; run.ly = run.ty = run.cp.y; run.time = 0; state = 'play'; show(null);
        },
        again() { A.sfx('click'); openIntro(0); }
    };
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (b && ACTIONS[b.dataset.act]) { ACTIONS[b.dataset.act](); return; }
        const tg = e.target.closest('[data-toggle]');
        if (tg) {
            const k = tg.dataset.toggle; A.unlock();
            if (k === 'music') A.setMusic(!A.state.music); else A.setSfx(!A.state.sfx);
            paintToggles(); A.sfx('click');
        }
    });
    function paintToggles() {
        $$('[data-toggle="music"]').forEach(b => { b.classList.toggle('off', !A.state.music); b.setAttribute('aria-pressed', String(A.state.music)); });
        $$('[data-toggle="sfx"]').forEach(b => { b.classList.toggle('off', !A.state.sfx); b.setAttribute('aria-pressed', String(A.state.sfx)); });
    }

    /* ── Frame loop ── */
    function frame(ts) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
        if (state !== 'paused') clock += dt;
        if (state !== 'paused') update(dt);
        renderer.render(scene, camera);
    }

    /* ── Start up ── */
    function boot() {
        paintToggles();
        if (!initGL()) { $('#nogl').hidden = false; $('#loading').hidden = true; return; }
        // Show the title once the first level is built
        openTitle();
        $('#loading').classList.add('done'); setTimeout(() => { $('#loading').hidden = true; }, 600);
        requestAnimationFrame(frame);
        // Deep link: ?level=N jumps straight into a level
        const q = new URLSearchParams(location.search).get('level');
        if (q !== null && RK.LEVELS[+q - 1]) openIntro(+q - 1);
        // Test hooks (also handy for debugging)
        RK.debug = { get state() { return state; }, get run() { return run; }, get world() { return world; }, openIntro, startCountdown, update, ACTIONS };
    }
    boot();
})();
