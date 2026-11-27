/* Rainbow Kingdom — Luna's Magical Quest. Game engine, controls, HUD, cutscenes and story screens. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK, A = RK.Audio, M = RK.Models, E = RK.Env;
    const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const stage = $('#stage');
    const IMG = n => 'images/kingdom/' + n + '.png';
    const LAST = RK.LEVELS.length - 1;
    let LUNA_S = 1.35, BELLA_S = 1.25;   // smaller on narrow portrait phones so the wings fit the screen

    /* ── Saved progress (older 5-level saves are upgraded: Candy Land is the new level 3) ── */
    const SAVE_KEY = 'lokakids.kingdom.save';
    let save = { v: 2, unlocked: 1, stars: [0, 0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0, 0] };
    try {
        const d = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (d && Array.isArray(d.stars)) {
            if (!d.v) { d.stars.splice(2, 0, 0); d.unlocked = Math.min(6, (d.unlocked || 1) + (d.unlocked > 2 ? 1 : 0)); if (d.stars[1] > 0) d.unlocked = Math.max(d.unlocked, 3); }
            save = Object.assign(save, d, { v: 2 }); while (save.stars.length < 6) save.stars.push(0);
        }
    } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
    const vibrate = p => { try { if (navigator.vibrate && A.state.sfx) navigator.vibrate(p); } catch (e) { /* ignore */ } };

    /* ── Three.js scene ── */
    let renderer, scene, camera, luna, bella, world, level, levelIdx = 0, particles, sky, ambient, hemi, sunLight, charLight;
    let portrait = false;
    function initGL() {
        try { renderer = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, alpha: false, powerPreference: 'high-performance' }); }
        catch (e) { return false; }
        renderer.setClearColor(0xbfe4ff, 1);
        stage.appendChild(renderer.domElement);
        scene = new T.Scene();
        camera = new T.PerspectiveCamera(62, 1, 0.5, 520);
        hemi = new T.HemisphereLight(0xffffff, 0xe0d0ff, 1.0); scene.add(hemi);
        sunLight = new T.DirectionalLight(0xfff0d8, 0.7); sunLight.position.set(-0.6, 1, 0.7); scene.add(sunLight);
        charLight = new T.PointLight(0xffffff, 1.3, 40, 1); scene.add(charLight);       // follows Luna so she is always clearly lit
        luna = M.buildUnicorn(M.LUNA); luna.scale.setScalar(LUNA_S); scene.add(luna);
        bella = M.buildUnicorn(M.BELLA); bella.scale.setScalar(BELLA_S); scene.add(bella); bella.visible = false;
        particles = new Particles(800); scene.add(particles.points);
        resize();
        return true;
    }
    function resize() {
        if (!renderer) return;
        const w = window.innerWidth, h = window.innerHeight;
        portrait = h > w * 1.1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2));
        renderer.setSize(w, h, false);
        LUNA_S = portrait ? 0.95 : 1.35; BELLA_S = portrait ? 0.9 : 1.25;
        if (luna) { luna.scale.setScalar(LUNA_S); if (!(world && world.goal && world.goal.kind === 'bella' && world.goal.freed)) bella.scale.setScalar(BELLA_S); }
        camera.aspect = w / h; camera.fov = portrait ? 78 : 60; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 150));

    /* Glowing particles: rainbow trail, sparkle bursts, wind streaks */
    function Particles(n) {
        this.n = n; this.head = 0;
        this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
        this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n).fill(1);
        for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.BufferAttribute(this.col, 3));
        this.geo = g;
        this.points = new T.Points(g, new T.PointsMaterial({ size: 0.55, map: M.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
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
    let state = 'title';   // title | intro | count | play | reveal | found | bond | paused | over | end
    let bond = null, revealT = 0, bondT = 0, run = null, clock = 0, last = 0, effects = [], rainbowI = 0, camLook = new T.Vector3(), camPos = new T.Vector3(), toastTimer = 0, goalT = 0, capTimer = 0;
    const input = { dragging: false, id: -1, sx: 0, sy: 0, tx0: 0, ty0: 0, keys: {} };
    const LR = 1.15;   // Luna's collision radius
    const tv = new T.Vector3();

    function newRun() {
        const L = level;
        return { z: 0, lx: 0, ly: L.yMid, tx: 0, ty: L.yMid, v: 0, bank: 0, pitch: 0, hearts: 3, stars: 0, rings: 0, magic: 0, magicT: 0, inv: 0, shake: 0, combo: 0, comboT: 0, time: 0, idle: 0, cp: { z: 0, x: 0, y: L.yMid }, continues: 0, hints: {}, bx: 3, by: L.yMid + 0.4, over: false };
    }

    function loadLevel(idx) {
        levelIdx = idx; level = RK.LEVELS[idx];
        if (world) { scene.remove(world.group); world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh && o.dispose) o.dispose(); }); }
        if (sky) { scene.remove(sky); sky.geometry.dispose(); sky.material.dispose(); }
        if (ambient) scene.remove(ambient.points);
        world = RK.buildWorld(level, scene);
        sky = E.makeSky(level); scene.add(sky);
        ambient = E.makeAmbient(level.ambient || ['#FFFFFF'], 70); scene.add(ambient.points);
        const fogC = new T.Color(level.sky[2]).lerp(new T.Color(level.sky[1]), 0.3);
        scene.fog = new T.Fog(fogC, 80, 330);
        renderer.setClearColor(fogC, 1);
        hemi.color.set(level.sky[1]).lerp(new T.Color('#ffffff'), 0.55); hemi.groundColor.set(level.sky[2]).lerp(new T.Color('#c9b8ff'), 0.4); hemi.intensity = level.light.hemi;
        sunLight.color.set(level.sunColor || '#fff0d8'); sunLight.intensity = level.light.sun; sunLight.position.set(0.5, 1, 0.9).multiplyScalar(10);   // key light from behind the camera, so the side of Luna you see is always bright
        charLight.intensity = level.light.char;
        run = newRun(); effects = []; world.goal.freed = false; world.goal.bond = false; bond = null; $('#bond').hidden = true; $('#h-bella').hidden = true;
        bella.visible = !!level.withBella; bella.scale.setScalar(BELLA_S); bella.rotation.set(0, 0, 0);
        document.body.classList.remove('cinema');
        placeActors(0);
        setHUDLevel();
        camera.position.set(run.lx + 12, run.ly + 4, run.z + 16); camLook.set(run.lx, run.ly + 0.6, run.z);
    }

    function placeActors(t) {
        luna.position.set(run.lx, run.ly, run.z); M.animateUnicorn(luna, t, { flap: 6 });
        if (bella.visible) { bella.position.set(run.bx, run.by, run.z + 1); M.animateUnicorn(bella, t + 1, { flap: 6 }); }
    }

    /* ── HUD ── */
    const hud = $('#hud'), toastEl = $('#toast'), countEl = $('#count'), capEl = $('#cine'), hintEl = $('#hint');
    let hudCache = {};
    function setHUD(k, v, fn) { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } }
    function setHUDLevel() { hudCache = {}; updateHUD(); }
    function updateHUD() {
        const total = world ? world.starsTotal : 0, pct = Math.round(clamp(-run.z / level.length, 0, 1) * 100);
        setHUD('lvl', level.id + '|' + pct, () => { $('#h-level').innerHTML = 'Level ' + level.id + ' · ' + level.name + ' <small>' + pct + '%</small>'; });
        if (world && world.goal.kind === 'bella' && run.hints.rev) { const d = Math.max(0, Math.round(-(run.z - world.goal.z))); setHUD('bd', d, v => { const b = $('#h-bella'); b.hidden = false; $('b', b).textContent = v; }); }
        setHUD('stars', run.stars + '/' + total, v => { $('#h-stars').textContent = v; });
        setHUD('hearts', run.hearts, v => { $$('#h-hearts i').forEach((h, i) => h.classList.toggle('lost', i >= v)); });
        const mp = run.magicT > 0 ? run.magicT / 4.5 : run.magic / 100;
        setHUD('magic', Math.round(mp * 100) + (run.magicT > 0 ? 'a' : run.magic >= 100 ? 'r' : ''), () => { const b = $('#magic'); b.style.setProperty('--p', mp * 360 + 'deg'); b.classList.toggle('ready', run.magic >= 100 && run.magicT <= 0); b.classList.toggle('active', run.magicT > 0); $('span', b).textContent = run.magicT > 0 ? 'Go!' : run.magic >= 100 ? 'Tap!' : Math.round(run.magic) + '%'; document.body.classList.toggle('boost', run.magicT > 0); });
    }
    function toast(text, ms) {
        toastEl.textContent = text; toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 2800);
    }
    function caption(who, text, ms) {
        RK.Voice.speak(text, who === 'Bella' ? 'bella' : who === 'Luna' ? 'luna' : 'narrator');
        capEl.innerHTML = '<b>' + who + '</b><span>' + text + '</span>'; capEl.classList.remove('show'); void capEl.offsetWidth; capEl.classList.add('show');
        clearTimeout(capTimer); capTimer = setTimeout(() => capEl.classList.remove('show'), ms || 3200);
    }
    /* Story narration is spoken; text is only shown when voices are switched off or unavailable. */
    function narrate(text, who) { if (!RK.Voice.speak(text, who || 'narrator')) toast(text, 3200); }
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
            b.style.setProperty('--c1', L.sky[1]); b.style.setProperty('--c2', L.sky[2]);
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
        $('#quest').innerHTML = RK.LEVELS.map((L, i) => '<li class="' + (save.stars[i] > 0 ? 'got' : i === idx ? 'now' : '') + '"><img src="' + IMG(L.clueIcon) + '" alt="' + L.clueName + '"><span>' + (i === 5 ? 'Home' : i === 4 ? 'Bella' : 'Clue ' + (i + 1)) + '</span></li>').join('');
        A.play(level.music);
        setTimeout(() => { if (state === 'intro') RK.Voice.speak('Level ' + level.id + '. ' + level.name + '. ' + level.story, 'narrator'); }, 350);
    }

    function startCountdown() {
        A.unlock(); A.sfx('click');
        RK.Voice.stop(); loadLevel(levelIdx); show(null); state = 'count'; goalT = 0;
        camera.position.set(run.lx + 2, run.ly + (portrait ? 6.0 : 4.0), run.z + (portrait ? 14.5 : 10.5)); camLook.set(run.lx, run.ly + 1.2, run.z - 18);
        let n = 3;
        countEl.hidden = false;
        const tick = () => {
            if (state !== 'count') { countEl.hidden = true; return; }
            if (n > 0) { countEl.textContent = n; countEl.className = 'count pop'; A.sfx('ready'); n--; setTimeout(tick, 650); }
            else { countEl.textContent = 'Fly!'; countEl.className = 'count pop go'; A.sfx('go'); state = 'play'; run.time = 0; showHint(true); if (!save.told) { save.told = 1; persist(); RK.Voice.speak('Touch and hold to fly. Drag to steer Luna!', 'narrator'); } setTimeout(() => { countEl.hidden = true; }, 700); }
        };
        tick();
    }
    function showHint(on) { hintEl.classList.toggle('hide', !on); }

    function pause() { if (state !== 'play') return; RK.Voice.stop(); state = 'paused'; show('pause'); A.sfx('click'); }
    function resume() { if (state !== 'paused') return; state = 'play'; show(null); A.sfx('click'); }

    /* ── Rewards, hits and magic ── */
    function addMagic(v) {
        if (run.magicT > 0) return;
        const was = run.magic >= 100; run.magic = Math.min(100, run.magic + v);
        if (!was && run.magic >= 100) { A.sfx('ring'); vibrate([20, 30, 20]); narrate('Your magic wand is ready! Tap it!', 'narrator'); pulse('#magic'); }
    }
    let magicHintAt = 0;
    function useMagic() {
        if (state === 'play' && run.magic < 100 && run.magicT <= 0) {   // tapped too early: show what the wand needs
            const b = $('#magic'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); A.sfx('click'); vibrate(15);
            if (clock - magicHintAt > 6) { magicHintAt = clock; narrate('Collect stars and fly through rings to charge the wand!', 'narrator'); }
            return;
        }
        if (state !== 'play' || run.magic < 100 || run.magicT > 0) return;
        run.magicT = 4.5; run.magic = 0; A.sfx('magic'); vibrate([20, 30, 40]);
        particles.burst(run.lx, run.ly, run.z, 60, 14, M.RAINBOW, 1.2); toast("✨ Rainbow Dash! You can't be hurt!", 2200);
    }
    function hit() {
        run.hearts--; run.inv = 1.9; run.shake = 0.55; run.combo = 0;
        A.sfx('hit'); vibrate(60); pulse('#h-hearts');
        particles.burst(run.lx, run.ly, run.z, 26, 9, ['#FFFFFF', '#C9C2E8', '#FFB8D9'], 0.8);
        if (run.hearts <= 0) { run.over = true; state = 'over'; setTimeout(() => { if (state === 'over') { show('over'); A.sfx('lose'); } }, 700); }
    }

    /* ── Main update ── */
    const engaged = () => input.dragging || input.keys.left || input.keys.right || input.keys.up || input.keys.down;

    function update(dt) {
        const t = clock, L = level;
        if (state === 'play' || state === 'count' || state === 'found') {
            if (state === 'play') {
                run.time += dt;
                // Luna only flies forward while you are playing: touch / drag, or hold a direction key.
                const go = engaged() || run.magicT > 0;
                run.idle = go ? 0 : run.idle + dt;
                const target = go ? L.speed * (run.magicT > 0 ? 1.5 : 1) : 0;
                run.v += (target - run.v) * Math.min(1, dt * (target > run.v ? 3.2 : 5));
                if (run.v < 0.05 && !go) run.v = 0;
                run.z -= run.v * dt;
                const k = input.keys;
                if (k.left || k.right || k.up || k.down) {
                    run.tx = clamp(run.tx + ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 17 * dt, -L.xr, L.xr);
                    run.ty = clamp(run.ty + ((k.up ? 1 : 0) - (k.down ? 1 : 0)) * 13 * dt, L.yMin, L.yMax);
                }
                if (run.magicT > 0) { run.magicT -= dt; if (run.magicT <= 0) { run.magicT = 0; run.inv = Math.max(run.inv, 0.6); } }
                run.inv = Math.max(0, run.inv - dt); run.shake = Math.max(0, run.shake - dt);
                run.comboT -= dt; if (run.comboT <= 0) run.combo = 0;
                const f = 1 - Math.exp(-dt * (run.magicT > 0 ? 9 : 7));
                run.lx += (run.tx - run.lx) * f; run.ly += (run.ty - run.ly) * f;
                run.bank += (clamp((run.tx - run.lx) * 0.1, -0.8, 0.8) - run.bank) * Math.min(1, dt * 8);
                run.pitch += (clamp((run.ty - run.ly) * 0.06, -0.5, 0.5) - run.pitch) * Math.min(1, dt * 8);
                interact(dt);
                hintEl.classList.toggle('hide', !(run.idle > 1.2 || run.time < 6) || (run.v > 4 && run.time > 6));
                if (!hintEl.classList.contains('hide')) hintEl.textContent = run.v > 1 ? '👆 Drag to steer Luna' : '👆 Touch and hold to fly · drag to steer';
                // story hints along the way
                const p = -run.z / L.length;
                if (!run.hints.a && p > 0.4) { run.hints.a = 1; narrate(['Great flying, Luna!', 'The trees whisper: Bella was here!', 'Yummy! A sweet trail of sprinkles!', 'The canyon sparkles brighter!', 'Luna hears Bella calling!', 'Rainbow Castle is getting closer!'][levelIdx]); }
                if (L.withBella) {
                    if (!run.hints.c && p > 0.2) { run.hints.c = 1; narrate('This is so much fun, Luna!', 'bella'); }
                    if (!run.hints.d && p > 0.5) { run.hints.d = 1; narrate('Look at all the sparkly stars!', 'bella'); }
                    if (!run.hints.e && p > 0.82) { run.hints.e = 1; narrate('I can see the castle! We are almost home!', 'bella'); }
                }
                if (!run.hints.rev && world.goal.kind === 'bella' && p > 0.6) startReveal();
                if (!run.hints.b && p > 0.8) { run.hints.b = 1; narrate(levelIdx === 4 ? 'Bella is just ahead. Hurry!' : 'Almost there! Fly to the glow!'); }
                if (run.z <= world.goal.z + (world.goal.kind === 'castle' ? 90 : 18)) goalReached();
                if (run.v > 2) emitTrail(dt, run.v);
                if (run.v > 7 && Math.random() < dt * 40) {   // wind streaks for a sense of speed
                    const s = Math.random() < 0.5 ? -1 : 1;
                    particles.emit(run.lx + s * (6 + Math.random() * 9), run.ly + (Math.random() - 0.4) * 10, run.z - 8 - Math.random() * 16, 0, 0, run.v * 1.5, 0.5, '#FFFFFF');
                }
            } else if (state === 'count') {
                run.time += dt;
            } else {
                foundUpdate(dt);
            }
        } else if (state === 'reveal') {
            revealUpdate(dt);
        } else if (state === 'bond') {
            bondUpdate(dt);
        } else if (state === 'over') {
            run.shake = Math.max(0, run.shake - dt);
        }
        // Luna and Bella
        if (state === 'play' || state === 'count' || state === 'found' || state === 'reveal' || state === 'bond' || state === 'over' || state === 'paused') {
            luna.visible = run.inv > 0 && state === 'play' && run.magicT <= 0 ? Math.floor(t * 14) % 2 === 0 : true;
            luna.position.set(run.lx, run.ly, run.z);
            const moving = run.v > 1 || state === 'found';
            M.animateUnicorn(luna, t, { flap: moving ? 8 : 5.5, bank: run.bank, pitch: run.pitch, boost: run.magicT > 0 });
            if (state === 'bond' && bond) { luna.rotation.y += (-Math.PI / 2 - luna.rotation.y) * Math.min(1, dt * 3); luna.rotation.z += bond.roll; } else if (luna.rotation.y !== 0) luna.rotation.y = 0;
            if (bella.visible && !(world.goal.kind === 'bella' && (state === 'found' || state === 'bond'))) {
                // Bella flies right beside Luna, a little ahead so she is always in view
                run.bx += ((run.lx + 5.4) - run.bx) * Math.min(1, dt * 2.6); run.by += ((run.ly + 1.3 + Math.sin(t * 2) * 0.4) - run.by) * Math.min(1, dt * 2.6);
                bella.position.set(run.bx, run.by, run.z - 3.2);
                M.animateUnicorn(bella, t + 1, { flap: moving ? 7.5 : 5, bank: run.bank * 0.7, pitch: run.pitch * 0.7 });
            }
        } else {   // title / intro: gentle idle hover
            luna.visible = true; luna.position.set(run.lx, run.ly + Math.sin(t * 1.5) * 0.5, run.z);
            M.animateUnicorn(luna, t, { flap: 5, bank: Math.sin(t * 0.7) * 0.12 });
            if (bella.visible) { bella.position.set(run.lx + 4, run.ly + 0.8 + Math.sin(t * 1.8) * 0.5, run.z + 1); M.animateUnicorn(bella, t + 1, { flap: 5 }); }
        }
        // Follow-light keeps Luna lit; sky and ambient particles follow the camera
        charLight.position.set(luna.position.x + 2.5, luna.position.y + 7, luna.position.z + 8);
        sky.position.copy(camera.position); sky.material.uniforms.time.value = t;
        ambient.update(t, run.lx, run.ly, run.z);
        world.update(t, run.z);
        effects = effects.filter(e => { e.t += dt; const k = e.t / 0.45; if (k >= 1) { e.mesh.visible = false; return false; } e.mesh.visible = true; e.mesh.scale.setScalar(1 + k * 0.9); return true; });
        particles.update(dt);
        updateCamera(dt, t);
        if (state === 'play') updateHUD();
    }

    function interact(dt) {
        const lx = run.lx, ly = run.ly, lz = run.z;
        world.stars.forEach(s => {
            if (s.got || Math.abs(s.z - lz) > 22) return;
            if (run.magicT > 0) { const dx = lx - s.x, dy = ly - s.y, dz = lz - s.z, d = Math.hypot(dx, dy, dz); if (d < 18 && d > 0.01) { const m = Math.min(1, dt * 9); s.x += dx * m; s.y += dy * m; s.z += dz * m; s.mesh.position.set(s.x, s.y, s.z); } }
            const bellaHelps = bella.visible && level.withBella && Math.hypot(bella.position.x - s.x, bella.position.y - s.y, bella.position.z - s.z) < 3.2;
            if (bellaHelps || Math.hypot(lx - s.x, ly - s.y, lz - s.z) < 2.3) {
                s.got = true; s.mesh.visible = false; run.stars++; run.combo++; run.comboT = 1.4; addMagic(12);
                A.sfx('star', { combo: run.combo - 1 }); vibrate(8); pulse('#h-starchip');
                particles.burst(s.x, s.y, s.z, 10, 6, ['#FFE680', '#FFFFFF', '#FFD84A'], 0.7);
            }
        });
        world.rings.forEach(r => {
            if (r.state !== 0 || lz > r.z) return;
            if (Math.abs(lz - r.z) > 6) { r.state = 2; return; }
            if (Math.hypot(lx - r.x, ly - r.y) < 3.9) {
                r.state = 1; run.rings++; run.cp = { z: r.z, x: r.x, y: r.y }; addMagic(20);
                A.sfx('ring'); vibrate(12);
                particles.burst(r.x, r.y, r.z, 22, 10, M.RAINBOW, 0.9);
            } else r.state = 2;
        });
        if (run.inv <= 0 && run.magicT <= 0) {
            for (const ob of world.obstacles) {
                if (Math.abs(ob.cols[0].z - lz) > 12) continue;
                let hitIt = false;
                for (const c of ob.cols) {
                    if (c.t === 's') { if (Math.hypot(lx - c.x, ly - c.y, lz - c.z) < c.r + LR) hitIt = true; }
                    else if (Math.hypot(lx - c.x, lz - c.z) < c.r + LR && ly > c.y0 - LR && ly < c.y1 + LR) hitIt = true;
                }
                if (hitIt) { hit(); break; }
            }
        }
    }

    function emitTrail(dt, spd) {
        const n = run.magicT > 0 ? 3 : 1;
        for (let i = 0; i < n; i++) {
            rainbowI++;
            particles.emit(luna.position.x + (Math.random() - 0.5) * 0.9, luna.position.y + 0.3 + (Math.random() - 0.5) * 0.9, run.z + 6.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, spd * 0.15, 0.95, M.RAINBOW[rainbowI % 6]);
        }
    }

    function updateCamera(dt, t) {
        if (state === 'title' || state === 'intro') {
            const a = t * 0.18 + 0.6, r = portrait ? 23 : 13;
            camera.position.lerp(camPos.set(run.lx + Math.sin(a) * r, run.ly + 3.2 + Math.sin(t * 0.3), run.z + Math.cos(a) * r), 1 - Math.exp(-dt * 2));
            camLook.lerp(tv.set(run.lx, run.ly + 0.8, run.z), 1 - Math.exp(-dt * 3));
        } else if (state === 'reveal') {
            const g = world.goal;
            camera.position.lerp(camPos.set(g.x + (portrait ? 7 : 10), g.y + 3.5, g.z + (portrait ? 34 : 26)), 1 - Math.exp(-dt * 2.2));
            camLook.lerp(tv.set(g.x, g.y, g.z), 1 - Math.exp(-dt * 3));
        } else if (state === 'bond') {
            const g = world.goal, a = Math.sin(bondT * 0.35) * 0.6, r = portrait ? 25 : 16;
            camera.position.lerp(camPos.set(g.x + Math.sin(a) * r, g.y + 2.4, g.z + 8.5 + Math.cos(a) * r), 1 - Math.exp(-dt * 2));
            camLook.lerp(tv.set(g.x, g.y + 0.4, g.z + 8.5), 1 - Math.exp(-dt * 3));
        } else if (state === 'found') {
            const g = world.goal;
            if (g.kind === 'bella') {
                const cx = g.x, cy = g.y, cz = g.z + 7.5, a = Math.PI / 2 + Math.sin(goalT * 0.45) * 0.4 + 0.1, r = portrait ? 26 : 17;
                camera.position.lerp(camPos.set(cx + Math.sin(a) * r, cy + 2.6, cz + Math.cos(a) * r), 1 - Math.exp(-dt * 2.4));
                camLook.lerp(tv.set(cx, cy + 0.6, cz), 1 - Math.exp(-dt * 3.2));
            } else {
                const a = goalT * 0.55 + 2.6, r = g.kind === 'castle' ? 46 : (portrait ? 21 : 15);
                camera.position.lerp(camPos.set(g.x + Math.sin(a) * r, g.y + 4.5 + goalT * 0.4, g.z + Math.cos(a) * r), 1 - Math.exp(-dt * 2.2));
                camLook.lerp(tv.set(g.x, g.y + (g.kind === 'castle' ? 8 : 0), g.z), 1 - Math.exp(-dt * 3));
            }
        } else {
            // Over-the-shoulder chase camera: close, slightly above and to the side so Luna's face and wings are both visible
            const back = (portrait ? 14.5 : 10.5) + (run.magicT > 0 ? 2.5 : 0) + clamp(run.v / L_SPEED(), 0, 1) * 1.5, up = portrait ? 6.0 : 4.0, side = portrait ? 2.0 : 2.6;
            camera.position.lerp(camPos.set(run.lx * 0.85 + side, run.ly + up, run.z + back), 1 - Math.exp(-dt * 5));
            camLook.lerp(tv.set(run.lx * 0.92 - 0.4, run.ly + 1.4, run.z - 18), 1 - Math.exp(-dt * 6));
        }
        if (run.shake > 0) camera.position.add(tv.set((Math.random() - 0.5) * run.shake * 1.2, (Math.random() - 0.5) * run.shake * 1.2, 0));
        camera.lookAt(camLook);
        const fovBase = portrait ? 78 : 60, fovT = fovBase + (run.magicT > 0 ? 12 : 0) + clamp(run.v / L_SPEED(), 0, 1) * 3;
        if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
    }
    const L_SPEED = () => (level ? level.speed : 16);

    /* ── Reaching the goal: cinematic reunion with Bella, clues, and the castle ── */
    function goalReached() {
        if (state !== 'play') return;
        state = 'found'; goalT = 0; run.shown = false; run.magicT = 0; run.v = Math.max(run.v, 4);
        const g = world.goal;
        document.body.classList.add('cinema'); toastEl.classList.remove('show');
        A.sfx(g.kind === 'castle' ? 'win' : 'found'); vibrate([40, 40, 80]); Kid_confetti();
        if (g.kind === 'bella') { caption('Luna', 'Bella! Is that you in the bubble?', 2600); }
        else if (g.kind === 'castle') { caption('Luna & Bella', 'Rainbow Castle! We made it home!', 4200); for (let i = 0; i < 6; i++) setTimeout(() => particles.burst(g.x + (Math.random() - 0.5) * 40, g.y + 8 + Math.random() * 18, g.z, 40, 14, M.RAINBOW, 1.5), i * 350); }
        else caption('Luna', level.found, 4200);
    }
    function Kid_confetti() { try { if (window.Kid && Kid.confetti) Kid.confetti(40); } catch (e) { /* ignore */ } }

    function foundUpdate(dt) {
        goalT += dt;
        const g = world.goal;
        if (g.kind === 'bella') {
            // Luna hovers close; the bubble pops; Bella flies to meet her, and the camera frames both friends from the side
            const f = 1 - Math.exp(-dt * 2.4), tgt = { x: g.x, y: g.y, z: g.z + 12.6 };
            run.lx += (tgt.x - run.lx) * f; run.ly += (tgt.y - run.ly) * f; run.z += (tgt.z - run.z) * f; run.v *= 0.9; run.bank *= 0.9; run.pitch *= 0.9;
            if (goalT > 2.8 && !g.freed) {
                g.freed = true; g.bubble.visible = false; if (g.beam) g.beam.visible = false; g.halo.visible = false; g.mesh.children.forEach(c => { if (c.userData.a !== undefined) c.visible = false; });
                scene.attach(g.bella); g.bella.rotation.set(0, Math.PI, 0);
                A.sfx('win'); vibrate([30, 30, 60]);
                particles.burst(g.x, g.y, g.z, 90, 13, ['#BFE8FF', '#FFC9E3', '#FFFFFF', '#E6D6FF', '#FFE680'], 1.5);
                caption('Bella', 'Luna! I knew you would find me! 💗', 3000);
            }
            if (g.freed) {
                const b = g.bella, bt = { x: g.x, y: g.y + 0.2, z: g.z + 7.6 }, bf = 1 - Math.exp(-dt * 2.0);
                b.position.x += (bt.x - b.position.x) * bf; b.position.y += (bt.y - b.position.y) * bf; b.position.z += (bt.z - b.position.z) * bf;
                b.scale.setScalar(b.scale.x + (BELLA_S - b.scale.x) * Math.min(1, dt * 2));
                M.animateUnicorn(b, clock, { flap: 7 });
                if (Math.random() < dt * 8) particles.burst(g.x + (Math.random() - 0.5) * 6, g.y + 1 + Math.random() * 3, g.z + 8, 2, 5, ['#FF6FA5', '#FFFFFF', '#FFD84A'], 1.1);
            }
            if (goalT > 5.6 && !g.bond) { g.bond = true; startBond(); }
        } else {
            const f = 1 - Math.exp(-dt * 2.2);
            run.lx += (g.x - run.lx) * f * 0.8; run.ly += (g.y - run.ly) * f * 0.8; run.z += (g.z + (g.kind === 'castle' ? 38 : 9) - run.z) * f * 0.6;
            run.v *= 0.92; run.bank *= 0.9; run.pitch *= 0.9;
            if (Math.random() < dt * 14) particles.burst(g.x + (Math.random() - 0.5) * 8, g.y + Math.random() * 6, g.z, 3, 6, M.RAINBOW, 1.1);
            if (goalT > (g.kind === 'castle' ? 4.6 : 3.4) && !run.shown) { run.shown = true; document.body.classList.remove('cinema'); capEl.classList.remove('show'); showResult(); }
        }
    }

    /* The reveal: a short cinematic shot of Bella in her bubble, calling for help, so the player really sees her */
    function startReveal() {
        if (state !== 'play') return;
        run.hints.rev = 1; state = 'reveal'; revealT = 0;
        document.body.classList.add('cinema'); toastEl.classList.remove('show');
        A.sfx('found'); vibrate([20, 30, 40]);
        caption('Bella', 'Luna! Over here! Please help me!', 3400);
        const g = world.goal; particles.burst(g.x, g.y, g.z, 60, 9, ['#FFC9E3', '#FFFFFF', '#BFE8FF'], 1.4);
    }
    function revealUpdate(dt) {
        revealT += dt;
        run.z -= run.v * dt; run.v *= 0.93;
        run.lx += (run.tx - run.lx) * Math.min(1, dt * 4); run.ly += (run.ty - run.ly) * Math.min(1, dt * 4);
        if (Math.random() < dt * 10) { const g = world.goal; particles.burst(g.x + (Math.random() - 0.5) * 8, g.y + (Math.random() - 0.5) * 8, g.z, 2, 4, ['#FFC9E3', '#FFFFFF'], 1.2); }
        if (revealT > 4.2) { state = 'play'; document.body.classList.remove('cinema'); capEl.classList.remove('show'); narrate('Fly to Bella! Follow the pink light.', 'narrator'); }
    }

    /* Bonding time: after the rescue the player spends a little time with Bella before flying home */
    function startBond() {
        state = 'bond'; bondT = 0; bond = { done: {}, spin: 0, hug: 0, roll: 0, count: 0 };
        $('#bond').hidden = false; $('#bond-next').hidden = true; $$('#bond [data-bond]').forEach(b => b.classList.remove('done'));
        const g = world.goal; g.bella.rotation.set(0, Math.PI, 0);
    }
    function bondUpdate(dt) {
        bondT += dt; const g = world.goal, b = g.bella, f = 1 - Math.exp(-dt * 2.4);
        if (bond.hug > 0) bond.hug = Math.max(0, bond.hug - dt);
        if (bond.spin > 0) bond.spin = Math.max(0, bond.spin - dt);
        const hugK = bond.hug > 0 ? Math.sin(Math.min(1, (1.6 - bond.hug) / 1.6) * Math.PI) : 0, gap = 4.4 - 1.5 * hugK;
        run.lx += ((g.x - gap) - run.lx) * f; run.ly += ((g.y + Math.sin(bondT * 1.6) * 0.3) - run.ly) * f; run.z += ((g.z + 8.5) - run.z) * f; run.v = 0; run.bank = 0; run.pitch = 0;
        b.position.x += ((g.x + gap) - b.position.x) * f; b.position.y += ((g.y + 0.2 + Math.sin(bondT * 1.6 + 1) * 0.3) - b.position.y) * f; b.position.z += ((g.z + 8.5) - b.position.z) * f;
        b.rotation.y += (Math.PI / 2 - b.rotation.y) * Math.min(1, dt * 3);
        const roll = bond.spin > 0 ? (1 - bond.spin / 1.3) * Math.PI * 2 : 0;
        bond.roll = roll; M.animateUnicorn(b, clock, { flap: 6.5 }); b.rotation.z = -roll;
        if (hugK > 0.4 && Math.random() < dt * 14) particles.burst((run.lx + b.position.x) / 2, run.ly + 1.5, run.z, 2, 4, ['#FF6FA5', '#FFB8D9', '#FFFFFF'], 1.2);
        if (!bond.ready && (bond.count >= 3 || bondT > 24)) { bond.ready = true; $('#bond-next').hidden = false; narrate('Time to fly home together!', 'narrator'); }
    }
    function bondAct(kind) {
        if (state !== 'bond' || !bond) return;
        const g = world.goal, mid = { x: (run.lx + g.bella.position.x) / 2, y: run.ly + 1, z: run.z };
        A.sfx('click');
        if (kind === 'hug') { bond.hug = 1.6; A.sfx('found'); vibrate([20, 40, 20]); particles.burst(mid.x, mid.y, mid.z, 50, 7, ['#FF6FA5', '#FFB8D9', '#FFFFFF'], 1.4); RK.Voice.speak('Aww, thank you Luna! I missed you so much!', 'bella'); }
        else if (kind === 'play') { bond.spin = 1.3; A.sfx('whoosh'); vibrate(30); particles.burst(mid.x, mid.y, mid.z, 40, 9, M.RAINBOW, 1.3); RK.Voice.speak('Wheee! Let us spin!', 'luna'); }
        else { A.sfx('magic'); vibrate([15, 25, 35]); particles.burst(run.lx, run.ly + 1, run.z, 50, 11, M.RAINBOW, 1.5); particles.burst(g.bella.position.x, g.bella.position.y + 1, g.bella.position.z, 50, 11, ['#FFE680', '#FFFFFF', '#4FE3B0'], 1.5); RK.Voice.speak('Wow, so sparkly!', 'bella'); }
        if (!bond.done[kind]) { bond.done[kind] = 1; bond.count++; const bt = $('#bond [data-bond="' + kind + '"]'); if (bt) bt.classList.add('done'); }
    }
    document.addEventListener('click', e => { const bt = e.target.closest('[data-bond]'); if (bt) bondAct(bt.dataset.bond); });

    function showResult() {
        const total = world.starsTotal, ringsN = world.rings.length;
        const sr = total ? run.stars / total : 1, rr = ringsN ? run.rings / ringsN : 1;
        const rating = 1 + (sr >= 0.5 ? 1 : 0) + (rr >= 0.65 && run.continues === 0 ? 1 : 0);
        const prev = save.stars[levelIdx];
        save.stars[levelIdx] = Math.max(prev, rating); save.unlocked = Math.max(save.unlocked, Math.min(LAST + 1, levelIdx + 2)); persist();
        if (rating > prev) { try { if (window.Kid && Kid.Stars) Kid.Stars.add('kingdom', rating - prev); } catch (e) { /* ignore */ } }
        if (levelIdx === LAST) { showEnd(rating); return; }
        $('#res-title').textContent = 'Level ' + level.id + ' complete!';
        $('#res-img').src = IMG(level.clueIcon);
        $('#res-found').textContent = level.found;
        $('#res-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < rating ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('');
        $('#res-stats').innerHTML = '<div><b>' + run.stars + '/' + total + '</b><span>Stars</span></div><div><b>' + run.rings + '/' + ringsN + '</b><span>Rings</span></div><div><b>' + run.hearts + '</b><span>Hearts left</span></div>';
        $('#btn-next').textContent = levelIdx === LAST - 1 ? 'Fly home with Bella ▶' : 'Next level ▶';
        show('result'); A.sfx('win');
    }
    function showEnd(rating) {
        $('#end-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < rating ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('');
        const total = save.stars.reduce((a, b) => a + b, 0);
        $('#end-total').textContent = total + ' / ' + (RK.LEVELS.length * 3) + ' stars collected on your whole adventure';
        show('end'); A.sfx('win');
        setTimeout(() => RK.Voice.speak('Welcome home! Luna and Bella are back in Rainbow Castle, safe and sound. You are a true hero!', 'narrator'), 900);
    }

    /* ── Controls: touch and hold to fly, drag to steer ── */
    stage.addEventListener('pointerdown', e => {
        if (state !== 'play' || input.dragging) return;
        A.unlock(); input.dragging = true; input.id = e.pointerId; input.sx = e.clientX; input.sy = e.clientY; input.tx0 = run.tx; input.ty0 = run.ty;
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
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
        if (KEYMAP[e.key]) { input.keys[KEYMAP[e.key]] = true; if (state === 'play') e.preventDefault(); }
        else if (e.key === ' ' || e.key === 'Enter') { if (state === 'play') { e.preventDefault(); useMagic(); } }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (state === 'play') pause(); else if (state === 'paused') resume(); }
    });
    document.addEventListener('keyup', e => { if (KEYMAP[e.key]) input.keys[KEYMAP[e.key]] = false; });
    window.addEventListener('blur', () => { input.keys = {}; input.dragging = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pause(); A.pause(); } else A.resume(); });

    $('#magic').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useMagic(); });
    $('#h-pause').addEventListener('click', pause);

    /* ── Buttons ── */
    const ACTIONS = {
        play() { A.unlock(); const next = save.stars.findIndex(x => x === 0); openIntro(next < 0 ? 0 : Math.min(next, save.unlocked - 1)); },
        levels() { A.unlock(); openLevels(); },
        title() { RK.Voice.stop(); openTitle(); },
        start() { startCountdown(); },
        next() { A.sfx('click'); openIntro(Math.min(LAST, levelIdx + 1)); },
        replay() { A.sfx('click'); openIntro(levelIdx); },
        resume() { resume(); },
        restart() { A.sfx('click'); startCountdown(); },
        keep() {   // carry on from the last glowing ring with full hearts
            A.sfx('click'); run.hearts = 3; run.inv = 2.2; run.over = false; run.continues++;
            run.z = run.cp.z; run.lx = run.tx = run.cp.x; run.ly = run.ty = run.cp.y; run.v = 0; run.time = 0; state = 'play'; show(null);
        },
        bonddone() { A.sfx('click'); $('#bond').hidden = true; bond = null; document.body.classList.remove('cinema'); capEl.classList.remove('show'); showResult(); },
        again() { A.sfx('click'); openIntro(0); }
    };
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (b && ACTIONS[b.dataset.act]) { ACTIONS[b.dataset.act](); return; }
        const tg = e.target.closest('[data-toggle]');
        if (tg) {
            const k = tg.dataset.toggle; A.unlock();
            if (k === 'music') A.setMusic(!A.state.music); else if (k === 'voice') { A.setVoice(!A.state.voice); if (A.state.voice) RK.Voice.speak('Hello! I am your storyteller.', 'narrator'); } else A.setSfx(!A.state.sfx);
            paintToggles(); A.sfx('click');
        }
    });
    function paintToggles() {
        $$('[data-toggle="music"]').forEach(b => { b.classList.toggle('off', !A.state.music); b.setAttribute('aria-pressed', String(A.state.music)); });
        $$('[data-toggle="voice"]').forEach(b => { b.classList.toggle('off', !A.state.voice); b.hidden = !RK.Voice.available(); b.setAttribute('aria-pressed', String(A.state.voice)); });
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
        openTitle();
        $('#loading').classList.add('done'); setTimeout(() => { $('#loading').hidden = true; }, 600);
        requestAnimationFrame(frame);
        const q = new URLSearchParams(location.search).get('level');
        if (q !== null && RK.LEVELS[+q - 1]) openIntro(+q - 1);
        RK.debug = { get state() { return state; }, get run() { return run; }, get world() { return world; }, input, openIntro, startCountdown, update, ACTIONS, get camera() { return camera; }, get renderer() { return renderer; }, get scene() { return scene; }, get luna() { return luna; }, get bella() { return bella; } };
    }
    boot();
})();
