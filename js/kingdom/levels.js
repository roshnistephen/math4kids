/* Rainbow Kingdom — the five levels of Luna's quest, and the generator that builds each 3D world. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK = window.RK || {}, M = RK.Models;

    /* ── Story and difficulty for each level ── */
    RK.LEVELS = [
        {
            id: 1, name: 'Cloud Meadows', icon: 'cloud', theme: 'sky', music: 'dawn', goal: 'ribbon', clueIcon: 'ribbon', clueName: "Bella's ribbon",
            blurb: 'Soar above the fluffy clouds',
            story: "Oh no! Bella is missing! Luna's magic horn glows and points to the clouds. Something pink is floating up there — it's Bella's ribbon! Follow the glowing rings to find it.",
            tip: 'Drag your finger to fly. Fly through the glowing rings and collect the stars!',
            found: "Bella's ribbon! She must have flown this way. The trail leads into the Whispering Forest…",
            sky: ['#6EC6FF', '#BFE4FF', '#FFE3F1'], fog: '#D8ECFF', length: 880, speed: 14, xr: 11, yMin: 4, yMax: 22, yMid: 12, pathAmp: 4.5, pathYAmp: 2.5, rings: 12, stars: 7,
            obstacles: [{ kind: 'storm', n: 7 }], clear: 2.2, gap: 30
        },
        {
            id: 2, name: 'Whispering Forest', icon: 'tree', theme: 'forest', music: 'forest', goal: 'feather', clueIcon: 'feather', clueName: "Bella's feather",
            blurb: 'Weave between the magic trees',
            story: 'Luna flies into the magical forest. The trees whisper: "Bella went that way!" Dodge the tall trees, giant mushrooms and grumpy storm clouds, and follow the path to find her feather.',
            tip: 'Trees are tall — fly around them! Hit an obstacle and you lose a heart.',
            found: "A shimmering feather! Bella left a sparkle trail leading to Crystal Canyon.",
            sky: ['#6FD8C0', '#B5ECD8', '#F6EBFF'], fog: '#CDEFE3', length: 1050, speed: 16, xr: 12, yMin: 3, yMax: 24, yMid: 12, groundY: 0, pathAmp: 6, pathYAmp: 3.5, rings: 14, stars: 8,
            obstacles: [{ kind: 'tree', n: 9 }, { kind: 'mushroom', n: 4 }, { kind: 'storm', n: 4 }], clear: 1.6, gap: 24, ground: '#C5F2CF', palette: ['#8EEBC4', '#FF9EC4', '#C3A6FF', '#FFE680']
        },
        {
            id: 3, name: 'Crystal Canyon', icon: 'gem', theme: 'canyon', music: 'canyon', goal: 'gem', clueIcon: 'gem', clueName: "Bella's crystal charm",
            blurb: 'Glide through glittering crystals',
            story: "Crystals sparkle everywhere in Crystal Canyon! Bella's lucky charm is hidden somewhere deep inside. Use your magic power ✨ to zoom past the crystals.",
            tip: 'Collect stars to fill your magic meter, then tap ✨ for a super rainbow dash!',
            found: "Bella's crystal charm! It's glowing… it points towards Bubble Valley!",
            sky: ['#A98CFF', '#DCC5FF', '#FFD9F2'], fog: '#E7D6FF', length: 1200, speed: 18, xr: 13, yMin: 3, yMax: 26, yMid: 13, groundY: 0, pathAmp: 7, pathYAmp: 4, rings: 16, stars: 9,
            obstacles: [{ kind: 'crystal', n: 11 }, { kind: 'storm', n: 6 }], clear: 1.4, gap: 22, ground: '#E9DAFF', palette: ['#C3A6FF', '#8FD3FF', '#FF9EC4', '#A8F0D6']
        },
        {
            id: 4, name: 'Bubble Valley', icon: 'bubbles', theme: 'bubble', music: 'bubble', goal: 'bella', clueIcon: 'bubbles', clueName: 'Bella!',
            blurb: 'Pop through floating bubbles',
            story: "Luna hears a tiny voice… \"Luna! Help!\" Bella is trapped inside a magic bubble at the end of Bubble Valley! Fly fast and brave — your friend is waiting!",
            tip: 'Bella is close! Follow the rings and dodge the storm clouds.',
            found: 'POP! Luna pops the bubble with her horn — Bella is free! "I knew you would find me!" Now let\'s fly home together!',
            sky: ['#FF9FD0', '#FFD0DF', '#FFF2C7'], fog: '#FFE3EC', length: 1300, speed: 19, xr: 13, yMin: 3, yMax: 26, yMid: 13, groundY: 0, pathAmp: 8, pathYAmp: 4.5, rings: 18, stars: 9,
            obstacles: [{ kind: 'storm', n: 11 }, { kind: 'mushroom', n: 5 }], clear: 1.3, gap: 22, ground: '#FFE0EC', palette: ['#FF9EC4', '#FFB98A', '#FFE680', '#C3A6FF']
        },
        {
            id: 5, name: 'Rainbow Way Home', icon: 'castle', theme: 'home', music: 'home', goal: 'castle', clueIcon: 'castle', clueName: 'Rainbow Castle', withBella: true,
            blurb: 'Fly home with Bella',
            story: 'Luna and Bella fly side by side. The sun is setting and Rainbow Castle is waiting far ahead. Rainbow gates light the way home — can you make it before the stars come out?',
            tip: 'Bella follows right behind you. Fly home together!',
            found: 'Rainbow Castle! Luna and Bella are home at last — the whole kingdom cheers! 🌈',
            sky: ['#FF8FC0', '#FFC4A0', '#FFF0B0'], fog: '#FFE0D2', length: 1500, speed: 21, xr: 14, yMin: 4, yMax: 28, yMid: 14, pathAmp: 9, pathYAmp: 5, rings: 20, stars: 10,
            obstacles: [{ kind: 'storm', n: 14 }, { kind: 'island', n: 5 }], clear: 1.2, gap: 20
        }
    ];

    const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    /* Build scenery as InstancedMeshes split into chunks along the track, so only the stretch ahead is drawn.
       fn(i, obj, color) fills in position/rotation/scale/colour for instance i. */
    const CH = 220;
    function inst(g, m, n, fn, reg) {
        const o = new T.Object3D(), col = new T.Color(), byChunk = {};
        for (let i = 0; i < n; i++) {
            o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); col.set('#ffffff');
            fn(i, o, col); o.updateMatrix();
            const c = Math.floor(-o.position.z / CH);
            (byChunk[c] || (byChunk[c] = [])).push({ m: o.matrix.clone(), c: col.clone() });
        }
        const out = new T.Group();
        Object.keys(byChunk).forEach(k => {
            const list = byChunk[k], im = new T.InstancedMesh(g, m, list.length);
            im.frustumCulled = false;
            list.forEach((it, j) => { im.setMatrixAt(j, it.m); im.setColorAt(j, it.c); });
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
            im.userData.zmax = -k * CH; im.userData.zmin = -(+k + 1) * CH;
            out.add(im); if (reg) reg.push(im);
        });
        return out;
    }

    RK.buildWorld = function (L, scene) {
        const R0 = rngOf(L.id * 7919 + 13), R = (a, b) => a + (b - a) * R0();
        const group = new T.Group(); scene.add(group);
        const gy = L.groundY === undefined ? -999 : L.groundY;
        const len = L.length;
        const px = d => L.pathAmp * (Math.sin(d / 95) * 0.7 + Math.sin(d / 41 + 1.3) * 0.3) * Math.min(1, d / 140);
        const py = d => L.yMid + L.pathYAmp * Math.sin(d / 70 + 0.6) * Math.min(1, d / 140);
        const pastel = ['#FFFFFF', '#FFF0F8', '#F0F6FF', '#FFF8E8'];
        const world = { group, rings: [], stars: [], obstacles: [], goal: null, px, py, len, dyn: [], gy };
        const chunks = [], I = (g, m, n, fn) => inst(g, m, n, fn, chunks);

        /* ── Fluffy clouds ── */
        function cloudMesh(clusters, rMin, rMax, place, emissive) {
            const puffs = [];
            for (let c = 0; c < clusters; c++) {
                const ctr = place(c), n = 4 + Math.floor(R(0, 4)), base = R(rMin, rMax);
                for (let k = 0; k < n; k++) puffs.push({ x: ctr.x + R(-1.7, 1.7) * base, y: ctr.y + R(-0.15, 0.55) * base, z: ctr.z + R(-1.3, 1.3) * base, r: base * R(0.65, 1.15) * (1 - Math.abs(k - n / 2) / n * 0.4), c: pastel[Math.floor(R(0, 4))] });
            }
            const im = I(M.sph(1, 7, 5), M.mat('#FFFFFF', { emissive: emissive || '#CFE0FF' }), puffs.length, (i, o, col) => { const p = puffs[i]; o.position.set(p.x, p.y, p.z); o.scale.set(p.r, p.r * 0.78, p.r); col.set(p.c); });
            group.add(im);
        }
        const zAt = f => 60 - f * (len + 330);
        if (L.theme === 'sky' || L.theme === 'home') {
            // A sea of clouds far below, and drifting clouds around the flight path
            cloudMesh(Math.floor(len / 12), 5.5, 10, () => ({ x: R(-140, 140), y: L.yMin - R(8, 20), z: zAt(R0()) }), L.theme === 'home' ? '#FFD6C8' : '#CFE0FF');
            cloudMesh(Math.floor(len / 20), 2.6, 4.8, () => { const z = zAt(R0()), d = -z, side = R0() < 0.5 ? -1 : 1; return { x: px(d) + side * R(L.xr + 8, 70), y: R(L.yMin - 2, L.yMax + 18), z }; }, L.theme === 'home' ? '#FFD6C8' : '#D6E4FF');
        } else {
            cloudMesh(Math.floor(len / 22), 3, 6, () => { const z = zAt(R0()); return { x: R(-120, 120), y: R(L.yMax + 8, L.yMax + 34), z }; }, '#E6EEFF');
        }

        /* ── Ground, hills and themed scenery ── */
        const lane = L.xr + 6;
        if (L.ground) {
            const ground = M.mesh(new T.PlaneGeometry(1000, 3400), M.mat(L.ground, { emissive: new T.Color(L.ground).multiplyScalar(0.25) }), 0, gy - 0.05, 0);
            ground.rotation.x = -Math.PI / 2; group.add(ground); world.ground = ground;
            const hills = L.palette || ['#B6F2C1', '#C9B2FF'];
            group.add(I(M.cone(1, 1, 8), M.mat('#FFFFFF', { emissive: '#8a8aa0' }), 46, (i, o, col) => { const h = R(30, 90), r = R(30, 70), side = i % 2 ? 1 : -1; o.position.set(side * R(120, 230), gy + h / 2 - 4, zAt(R0())); o.scale.set(r, h, r); col.set(hills[i % hills.length]).lerp(new T.Color('#ffffff'), 0.45); }));
        }
        if (L.theme === 'forest' || L.theme === 'bubble') {
            const pal = L.palette, n = L.theme === 'forest' ? 240 : 90;
            const spec = []; for (let i = 0; i < n; i++) { const d = R(0, len + 250), side = R0() < 0.5 ? -1 : 1; spec.push({ x: px(d) * 0.3 + side * (lane + R(2, 80)), z: -d, h: R(8, 30), r: R(3, 6), c: pal[i % pal.length] }); }
            if (L.theme === 'forest') {
                group.add(I(M.cyl(0.6, 1, 1, 6), M.mat('#C99A7B', { emissive: '#4a2f22' }), n, (i, o, col) => { const s = spec[i]; o.position.set(s.x, gy + s.h / 2, s.z); o.scale.set(s.r * 0.35, s.h, s.r * 0.35); }));
                group.add(I(M.sph(1, 8, 6), M.mat('#FFFFFF', { emissive: '#4f6f5f' }), n, (i, o, col) => { const s = spec[i]; o.position.set(s.x, gy + s.h + s.r * 0.5, s.z); o.scale.set(s.r, s.r * 0.95, s.r); col.set(s.c); }));
            }
            // Giant glowing flowers
            const fl = []; for (let i = 0; i < 160; i++) { const d = R(0, len + 250), side = R0() < 0.5 ? -1 : 1; fl.push({ x: side * (lane + R(0, 70)), z: -d, h: R(3, 8), c: L.palette[i % L.palette.length] }); }
            group.add(I(M.cyl(0.12, 0.18, 1, 5), M.mat('#7FD9A0', { emissive: '#2f6f4f' }), fl.length, (i, o) => { const f = fl[i]; o.position.set(f.x, gy + f.h / 2, f.z); o.scale.set(1, f.h, 1); }));
            group.add(I(M.sph(1, 8, 6), M.mat('#FFFFFF', { emissive: '#888' }), fl.length, (i, o, col) => { const f = fl[i]; o.position.set(f.x, gy + f.h + 0.5, f.z); o.scale.set(1.5, 1.2, 1.5); col.set(f.c); }));
        }
        if (L.theme === 'bubble') {
            const bub = []; for (let i = 0; i < 90; i++) bub.push({ x: R(-90, 90), y: R(4, 44), z: -R(0, len + 250), r: R(1, 4.2) });
            group.add(I(M.sph(1, 12, 9), M.basic('#FFFFFF', { transparent: true, opacity: 0.28, depthWrite: false }), bub.length, (i, o, col) => { const b = bub[i]; o.position.set(b.x, b.y, b.z); o.scale.setScalar(b.r); col.set(['#BFE8FF', '#FFC9E3', '#E6D6FF', '#CFFFEA'][i % 4]); }));
        }
        if (L.theme === 'canyon') {
            const pal = L.palette, n = 230, spec = [];
            for (let i = 0; i < n; i++) { const d = R(0, len + 250), side = R0() < 0.5 ? -1 : 1; spec.push({ x: side * (lane + R(1, 75)), z: -d, h: R(8, 46), r: R(1.6, 4.6), c: pal[i % pal.length] }); }
            group.add(I(M.cone(1, 1, 6), M.mat('#FFFFFF', { emissive: '#7a6a9a', transparent: true, opacity: 0.93 }), n, (i, o, col) => { const s = spec[i]; o.position.set(s.x, gy + s.h / 2, s.z); o.scale.set(s.r, s.h, s.r); o.rotation.z = R(-0.12, 0.12); col.set(s.c).lerp(new T.Color('#ffffff'), 0.25); }));
            group.add(I(M.cyl(1, 1.3, 1, 8), M.mat('#D9C8FF', { emissive: '#5a4a8a' }), 50, (i, o) => { const d = R(0, len + 250), side = i % 2 ? 1 : -1, h = R(40, 90); o.position.set(side * (lane + R(28, 70)), gy + h / 2, -d); o.scale.set(R(5, 9), h, R(5, 9)); }));
        }
        if (L.theme === 'sky' || L.theme === 'home') {
            for (let i = 0; i < (L.theme === 'home' ? 9 : 7); i++) {
                const d = R(60, len + 120), isl = M.makeIsland(R(4, 7)), side = i % 2 ? 1 : -1;
                isl.position.set(px(d) + side * (L.xr + R(9, 40)), R(L.yMin, L.yMax + 8), -d); isl.userData.bobBase = isl.position.y; isl.userData.ph = R(0, 6); group.add(isl); world.dyn.push(isl);
            }
        }

        /* ── Rainbow gates (just for beauty — Luna flies right through them) ── */
        const gateCount = L.theme === 'home' ? 9 : 4;
        for (let i = 0; i < gateCount; i++) {
            const d = 120 + (i + 0.5) * (len - 160) / gateCount, arc = M.makeRainbowArc(L.theme === 'home' ? 19 : 17, 1.8);
            arc.position.set(px(d), py(d) - 8, -d); group.add(arc);
        }

        /* ── The magical path: sparkling dots to follow, and glowing rings ── */
        const dots = Math.floor(len / 6);
        group.add(I(M.sph(1, 6, 5), M.basic('#FFFFFF'), dots, (i, o, col) => { const d = 16 + i * 6; o.position.set(px(d), py(d) - 0.3, -d); o.scale.setScalar(0.22 + 0.1 * (i % 2)); col.set(M.RAINBOW[i % 6]); }));
        for (let i = 0; i < L.rings; i++) {
            const d = 80 + i * (len - 130) / (L.rings - 1), m = M.makeRing(M.RAINBOW[i % 6]);
            m.position.set(px(d), py(d), -d); group.add(m);
            world.rings.push({ d, x: px(d), y: py(d), z: -d, mesh: m, state: 0, color: M.RAINBOW[i % 6] });
        }

        /* ── Obstacles ── */
        const used = [];
        function clearsPath(cols, d) {
            for (const dd of [d - 6, d, d + 6]) for (const c of cols) {
                const ppx = px(dd), ppy = py(dd), need = c.r + 3.3 + L.clear * 0.5;
                if (c.t === 's') { if (Math.hypot(c.x - ppx, c.y - ppy, -dd - c.z) < need + 0.5) return false; }
                else if (Math.abs(c.x - ppx) < need && ppy > c.y0 - 3 && ppy < c.y1 + 3) return false;
            }
            return true;
        }
        function place(kind) {
            for (let attempt = 0; attempt < 120; attempt++) {
                const d = R(115, len - 70);
                if (used.some(u => Math.abs(u - d) < L.gap)) continue;
                const x = R(-L.xr, L.xr); let cols, mesh;
                if (kind === 'storm') {
                    const s = R(1.15, 1.6), y = R(L.yMin + 1, L.yMax - 1);
                    cols = [{ t: 's', x, y, z: -d, r: 1.9 * s }];
                    mesh = M.makeStormCloud(s); mesh.position.set(x, y, -d);
                } else if (kind === 'tree') {
                    const h = R(13, L.yMax + 7);
                    cols = [{ t: 'c', x, z: -d, r: 1.6, y0: gy, y1: gy + h }, { t: 's', x, y: gy + h + 1.5, z: -d, r: 4.3 }];
                    mesh = M.makeTree(h, pickPal()); mesh.position.set(x, gy, -d);
                } else if (kind === 'mushroom') {
                    const h = R(7, 13);
                    cols = [{ t: 'c', x, z: -d, r: 1.3, y0: gy, y1: gy + h }, { t: 's', x, y: gy + h + 0.6, z: -d, r: 3.1 }];
                    mesh = M.makeMushroom(h, pickPal()); mesh.position.set(x, gy, -d);
                } else if (kind === 'crystal') {
                    const h = R(10, L.yMax + 6);
                    cols = [{ t: 'c', x, z: -d, r: 2.0, y0: gy, y1: gy + h }];
                    mesh = M.makeCrystal(h, pickPal()); mesh.position.set(x, gy, -d);
                } else {   // island
                    const y = R(L.yMin + 2, L.yMax - 3), r = R(4, 5.5);
                    cols = [{ t: 's', x, y, z: -d, r: r * 0.95 }];
                    mesh = M.makeIsland(r); mesh.position.set(x, y, -d);
                }
                if (!clearsPath(cols, d)) continue;
                used.push(d); group.add(mesh);
                const ob = { kind, cols, mesh, x, d, base: mesh.position.y, ph: R(0, 6) };
                world.obstacles.push(ob); if (kind === 'storm' || kind === 'island') world.dyn.push(mesh), mesh.userData.bobBase = mesh.position.y, mesh.userData.ph = ob.ph;
                return;
            }
        }
        let palI = 0; const pickPal = () => (L.palette || ['#C3A6FF', '#FF9EC4', '#8FD3FF'])[palI++ % (L.palette || [1, 2, 3]).length];
        L.obstacles.forEach(o => { for (let i = 0; i < o.n; i++) place(o.kind); });

        /* ── Stars: lines, arcs, zig-zags and rings of stars along the path ── */
        const clusters = L.stars, patterns = ['line', 'arc', 'zig', 'circle'];
        function farFromObstacles(x, y, z) {
            return world.obstacles.every(o => o.cols.every(c => c.t === 's' ? Math.hypot(x - c.x, y - c.y, z - c.z) > c.r + 1.8 : (Math.hypot(x - c.x, z - c.z) > c.r + 1.8 || y > c.y1 + 1.5 || y < c.y0 - 1.5)));
        }
        for (let k = 0; k < clusters; k++) {
            const d0 = 70 + (k + R(0.1, 0.9)) * (len - 120) / clusters, pat = patterns[k % 4], n = pat === 'circle' ? 7 : 6, off = pat === 'line' ? R(-3, 3) : 0;
            for (let j = 0; j < n; j++) {
                let ox = 0, oy = 0, d = d0 + j * 4.2;
                if (pat === 'line') ox = off;
                else if (pat === 'arc') { ox = Math.sin(j / (n - 1) * Math.PI) * 4.5 * (k % 2 ? 1 : -1); oy = Math.cos(j / (n - 1) * Math.PI) * 2.2; }
                else if (pat === 'zig') { ox = (j % 2 ? 3.2 : -3.2); oy = (j % 3) * 0.8 - 0.8; }
                else { const a = j / n * Math.PI * 2; d = d0 + 6; ox = Math.cos(a) * 3.6; oy = Math.sin(a) * 3.6; }
                const x = Math.max(-L.xr + 0.5, Math.min(L.xr - 0.5, px(d) + ox)), y = Math.max(L.yMin + 0.5, Math.min(L.yMax - 0.5, py(d) + oy));
                if (!farFromObstacles(x, y, -d)) continue;
                const s = M.makeStar(); s.position.set(x, y, -d); group.add(s);
                world.stars.push({ x, y, z: -d, mesh: s, got: false, ph: R(0, 6) });
            }
        }

        /* ── The goal: Bella's clue, Bella herself, or Rainbow Castle ── */
        const gd = len, gx = px(gd), gyy = py(gd);
        if (L.goal === 'castle') {
            const castle = M.makeCastle(); castle.scale.setScalar(1.15); castle.position.set(0, L.yMid - 14, -(len + 62)); group.add(castle);
            world.goal = { x: 0, y: L.yMid, z: -(len + 62), mesh: castle, kind: 'castle' };
            const isl = M.makeIsland(24); isl.position.set(0, L.yMid - 17, -(len + 62)); group.add(isl);
        } else if (L.goal === 'bella') {
            const bubble = M.makeBubble(5), bella = M.buildUnicorn(M.BELLA); bella.scale.setScalar(1.35); bella.rotation.y = Math.PI;
            const g = new T.Group(); g.add(bubble); g.add(bella); g.position.set(gx, gyy, -gd - 18); group.add(g);
            const beam = M.makeBeam('#FFC9E3'); beam.position.set(gx, gyy - 8, -gd - 18); group.add(beam);
            world.goal = { x: gx, y: gyy, z: -gd - 18, mesh: g, bubble, bella, beam, kind: 'bella' };
        } else {
            const clue = M.makeClue(L.goal); clue.position.set(gx, gyy, -gd - 14); group.add(clue);
            const beam = M.makeBeam('#FFF0A8'); beam.position.set(gx, gyy - 8, -gd - 14); group.add(beam);
            world.goal = { x: gx, y: gyy, z: -gd - 14, mesh: clue, beam, kind: L.goal };
        }
        // Home, far behind where the quest begins
        if (L.id !== 5) { const home = M.makeCastle(); home.scale.setScalar(0.7); home.position.set(-42, L.yMid - 13, 70); home.rotation.y = 0.5; group.add(home); }

        world.starsTotal = world.stars.length;

        /* ── Per-frame animation and distance culling ── */
        world.update = function (t, lz) {
            if (world.ground) world.ground.position.z = lz;
            chunks.forEach(c => { c.visible = c.userData.zmax >= lz - 340 && c.userData.zmin <= lz + 90; });
            const near = z => z - lz < 40 && z - lz > -340;
            world.stars.forEach((s, i) => { const v = !s.got && near(s.z); s.mesh.visible = v; if (v) { s.mesh.rotation.y = t * 2.2 + s.ph; s.mesh.position.y = s.y + Math.sin(t * 2 + s.ph) * 0.25; } });
            world.rings.forEach(r => { const v = near(r.z); r.mesh.visible = v; if (v) { const dots = r.mesh.getObjectByName('dots'); if (dots) dots.rotation.z = t * 0.9; } });
            world.dyn.forEach(m => { if (m.userData.bobBase !== undefined) m.position.y = m.userData.bobBase + Math.sin(t * 1.3 + m.userData.ph) * 0.5; });
            world.obstacles.forEach(o => { o.mesh.visible = near(o.cols[0].z); });
            if (world.goal) { const g = world.goal; if (g.kind === 'bella') { g.bubble.scale.setScalar(1 + Math.sin(t * 2) * 0.03); g.bella.position.y = Math.sin(t * 2) * 0.4; M.animateUnicorn(g.bella, t, { flap: 5 }); } else if (g.kind !== 'castle') g.mesh.rotation.y = t * 1.2; }
        };
        world.reset = function () { world.stars.forEach(s => { s.got = false; s.mesh.visible = true; s.mesh.scale.setScalar(1); }); world.rings.forEach(r => { r.state = 0; }); };
        world.pathPoint = d => ({ x: px(d), y: py(d), z: -d });
        return world;
    };
})();
