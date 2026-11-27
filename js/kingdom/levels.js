/* Rainbow Kingdom — the six levels of Luna's quest, and the generator that builds each 3D world. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK = window.RK || {}, M = RK.Models, E = RK.Env;

    /* ── Story, look and difficulty for each level ──
       sky: [top, middle, horizon]; light: hemisphere / sun / follow-light intensities (tuned so Luna is always clearly lit) */
    RK.LEVELS = [
        {
            id: 1, name: 'Cloud Meadows', theme: 'sky', music: 'dawn', goal: 'ribbon', clueIcon: 'ribbon', clueName: "Bella's ribbon",
            blurb: 'Soar above the fluffy clouds',
            story: "Oh no! Bella is missing! Luna's magic horn glows and points to the clouds. Something pink is floating up there — it's Bella's ribbon! Follow the glowing rings to find it.",
            tip: 'Touch and drag to fly. Fly through the glowing rings and collect the stars!',
            found: "Bella's ribbon! She must have flown this way. The trail leads into the Whispering Forest…",
            sky: ['#1E78E6', '#6FB9FF', '#FFF0E0'], sun: [0.3, 0.55, -0.78], sunColor: '#FFF1C2', light: { hemi: 0.42, sun: 0.55, char: 0.34 }, ambient: ['#FFFFFF', '#FFF3D0'],
            length: 880, speed: 14, xr: 11, yMin: 4, yMax: 22, yMid: 12, pathAmp: 4.5, pathYAmp: 2.5, rings: 12, stars: 7,
            obstacles: [{ kind: 'storm', n: 7 }], clear: 2.2, gap: 30
        },
        {
            id: 2, name: 'Whispering Forest', theme: 'forest', music: 'forest', goal: 'feather', clueIcon: 'feather', clueName: "Bella's feather",
            blurb: 'Weave between the magic trees',
            story: 'Luna flies into the magical forest. The trees whisper: "Bella went that way!" Dodge the tall trees, giant mushrooms and grumpy storm clouds, and follow the path to find her feather.',
            tip: 'Trees are tall — fly around them! Hit an obstacle and you lose a heart.',
            found: 'A shimmering feather! Bella left a sparkle trail that smells of… candy!',
            sky: ['#1F9C8E', '#7EDBC2', '#F4FFE6'], sun: [-0.25, 0.5, -0.82], sunColor: '#FFF6C8', light: { hemi: 0.42, sun: 0.55, char: 0.34 }, ambient: ['#FFF3A8', '#B8FFD9'],
            length: 1050, speed: 16, xr: 12, yMin: 3, yMax: 24, yMid: 12, groundY: 0, pathAmp: 6, pathYAmp: 3.5, rings: 14, stars: 8,
            obstacles: [{ kind: 'tree', n: 9 }, { kind: 'mushroom', n: 4 }, { kind: 'storm', n: 4 }], clear: 1.6, gap: 24,
            terrain: { low: '#8FE3A6', mid: '#4FC98A', high: '#6B8FD8', cap: '#FFFFFF', capH: 58, amp: 62, river: { width: 8, amp: 24, color: '#7FD3FF' } }, palette: ['#8EEBC4', '#FF9EC4', '#C3A6FF', '#FFE680']
        },
        {
            id: 3, name: 'Candy Land Forest', theme: 'candy', music: 'candy', goal: 'lollipop', clueIcon: 'lollipop', clueName: "Bella's lollipop",
            blurb: 'Fly through a world of sweets',
            story: 'A trail of sprinkles leads into Candy Land Forest! Lollipop trees, candy canes and giant donuts are everywhere. Bella dropped her favourite lollipop — can you find it?',
            tip: 'Giant lollipops, candy canes and donuts are in the way — fly around the sweets!',
            found: "Bella's lollipop! Yum! There's a glittering crystal trail leading to Crystal Canyon…",
            sky: ['#4DB8FF', '#BDE8FF', '#FFE6F4'], sun: [0.2, 0.45, -0.87], sunColor: '#FFF0D0', light: { hemi: 0.45, sun: 0.55, char: 0.34 }, ambient: ['#FF6FA5', '#FFE680', '#4FE3B0', '#4FB8FF', '#FFFFFF'],
            length: 1150, speed: 17, xr: 12, yMin: 3, yMax: 25, yMid: 12, groundY: 0, pathAmp: 6.5, pathYAmp: 3.8, rings: 15, stars: 9,
            obstacles: [{ kind: 'lolli', n: 6 }, { kind: 'cane', n: 5 }, { kind: 'donut', n: 4 }, { kind: 'cupcake', n: 3 }], clear: 1.5, gap: 22,
            terrain: { low: '#8FEBC4', mid: '#C4F7E0', high: '#FF8FC0', cap: '#FFFFFF', capH: 44, amp: 52, glow: '#2f4a46', river: { width: 8, amp: 22, color: '#FF8FC4' } }, palette: ['#FF6FA5', '#4FE3B0', '#A27BFF', '#4FB8FF', '#FFD84A']
        },
        {
            id: 4, name: 'Crystal Canyon', theme: 'canyon', music: 'canyon', goal: 'gem', clueIcon: 'gem', clueName: "Bella's crystal charm",
            blurb: 'Glide through glittering crystals',
            story: "Crystals sparkle everywhere in Crystal Canyon! Bella's lucky charm is hidden somewhere deep inside. Use your magic power ✨ to zoom past the crystals.",
            tip: 'Collect stars to fill your magic meter, then tap ✨ for a super rainbow dash!',
            found: "Bella's crystal charm! It's glowing… it points towards Bubble Valley!",
            sky: ['#2A38C8', '#6F86FF', '#D9D0FF'], sun: [-0.3, 0.4, -0.86], sunColor: '#FFE0F4', light: { hemi: 0.5, sun: 0.6, char: 0.4 }, ambient: ['#E6D6FF', '#FFFFFF', '#9ED8FF'],
            length: 1250, speed: 18, xr: 13, yMin: 3, yMax: 26, yMid: 13, groundY: 0, pathAmp: 7, pathYAmp: 4, rings: 16, stars: 9,
            obstacles: [{ kind: 'crystal', n: 11 }, { kind: 'storm', n: 6 }], clear: 1.4, gap: 22,
            terrain: { low: '#D6BFFF', mid: '#B79BFF', high: '#7A5AD6', cap: '#F2EAFF', capH: 50, amp: 72, glow: '#4a3d7a' }, palette: ['#FF6FA5', '#4FE3FF', '#FFC94D', '#7CF0B0']
        },
        {
            id: 5, name: 'Bubble Valley', theme: 'bubble', music: 'bubble', goal: 'bella', clueIcon: 'bubbles', clueName: 'Bella!',
            blurb: 'Pop through floating bubbles',
            story: "Luna hears a tiny voice… \"Luna! Help!\" Bella is trapped inside a magic bubble at the end of Bubble Valley! Fly fast and brave — your friend is waiting!",
            tip: 'Bella is close! Follow the rings and dodge the storm clouds.',
            found: 'POP! Luna pops the bubble with her horn — Bella is free! "I knew you would find me!" Now let\'s fly home together!',
            sky: ['#FF7FA8', '#FFC2A6', '#FFF3C4'], sun: [0.62, 0.3, -0.72], sunColor: '#FFEBC0', light: { hemi: 0.46, sun: 0.56, char: 0.36 }, ambient: ['#FFC9E3', '#BFE8FF', '#FFFFFF'],
            length: 1350, speed: 19, xr: 13, yMin: 3, yMax: 26, yMid: 13, groundY: 0, pathAmp: 8, pathYAmp: 4.5, rings: 18, stars: 9,
            obstacles: [{ kind: 'storm', n: 11 }, { kind: 'mushroom', n: 5 }], clear: 1.3, gap: 22,
            terrain: { low: '#FFD0E4', mid: '#FFB3D6', high: '#B58AE8', cap: '#FFFFFF', capH: 52, amp: 56, glow: '#554058', river: { width: 9, amp: 28, color: '#9ED8FF' } }, palette: ['#FF9EC4', '#FFB98A', '#FFE680', '#C3A6FF']
        },
        {
            id: 6, name: 'Rainbow Way Home', theme: 'home', music: 'home', goal: 'castle', clueIcon: 'castle', clueName: 'Rainbow Castle', withBella: true,
            blurb: 'Fly home with Bella',
            story: 'Luna and Bella fly side by side. The sun is setting and Rainbow Castle is waiting far ahead. Rainbow gates light the way home — can you make it before the stars come out?',
            tip: 'Bella flies right beside you. Fly home together!',
            found: 'Rainbow Castle! Luna and Bella are home at last — the whole kingdom cheers! 🌈',
            sky: ['#6A3FD0', '#FF7FA8', '#FFD98A'], sun: [0.0, 0.16, -0.99], sunColor: '#FFC27A', light: { hemi: 0.56, sun: 0.66, char: 0.46 }, ambient: ['#FFE0A0', '#FFFFFF', '#FFB8D9'],
            length: 1500, speed: 21, xr: 14, yMin: 4, yMax: 28, yMid: 14, pathAmp: 9, pathYAmp: 5, rings: 20, stars: 10,
            obstacles: [{ kind: 'storm', n: 14 }, { kind: 'island', n: 5 }], clear: 1.2, gap: 20
        }
    ];

    const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    /* Scenery is built as InstancedMeshes split into chunks along the track, so only the stretch ahead is drawn.
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
        let hAt = () => 0;

        /* ── Terrain, mountains and river ── */
        if (L.terrain) {
            const t = E.makeTerrain(L, gy, len); group.add(t.mesh); if (t.river) group.add(t.river); hAt = t.hAt; world.terrain = t;
        }
        const lane = L.xr + 6;

        /* ── Fluffy clouds ── */
        function cloudMesh(clusters, rMin, rMax, place, emissive, tints) {
            const puffs = [];
            for (let c = 0; c < clusters; c++) {
                const ctr = place(c), n = 4 + Math.floor(R(0, 4)), base = R(rMin, rMax);
                for (let k = 0; k < n; k++) puffs.push({ x: ctr.x + R(-1.7, 1.7) * base, y: ctr.y + R(-0.15, 0.55) * base, z: ctr.z + R(-1.3, 1.3) * base, r: base * R(0.65, 1.15) * (1 - Math.abs(k - n / 2) / n * 0.4), c: (tints || pastel)[Math.floor(R(0, (tints || pastel).length))] });
            }
            group.add(I(M.sph(1, 8, 6), M.mat('#FFFFFF', { emissive: emissive || '#9FB8E8' }), puffs.length, (i, o, col) => { const p = puffs[i]; o.position.set(p.x, p.y, p.z); o.scale.set(p.r, p.r * 0.78, p.r); col.set(p.c); }));
        }
        const zAt = f => 60 - f * (len + 330);
        if (L.theme === 'sky' || L.theme === 'home') {
            const em = L.theme === 'home' ? '#8A5A78' : '#5F7FB8';
            group.add(I(M.sph(1, 8, 6), M.mat('#FFFFFF', { emissive: em }), Math.floor(len * 0.34), (i, o, col) => { const r = R(15, 28); o.position.set(R(-180, 180), L.yMin - R(12, 24), zAt(R0())); o.scale.set(r, r * 0.4, r); col.set(pastel[i % 4]); }));
            cloudMesh(Math.floor(len / 20), 2.6, 4.8, () => { const z = zAt(R0()), d = -z, side = R0() < 0.5 ? -1 : 1; return { x: px(d) + side * R(L.xr + 8, 70), y: R(L.yMin - 2, L.yMax + 18), z }; }, em);
            // Distant mountains peeking above the cloud sea
            group.add(I(M.cone(1, 1, 7), M.mat('#FFFFFF', { emissive: '#7a6a9a' }), 26, (i, o, col) => { const h = R(70, 150), r = R(40, 80), side = i % 2 ? 1 : -1; o.position.set(side * R(190, 300), -30 + h / 2, zAt(R0())); o.scale.set(r, h, r); col.set(['#B9A8F0', '#D9B8F0', '#A8C4F8'][i % 3]); }));
        } else if (L.theme === 'candy') {
            cloudMesh(Math.floor(len / 14), 3.5, 6.5, () => { const z = zAt(R0()); return { x: R(-130, 130), y: R(L.yMax + 6, L.yMax + 30), z }; }, '#E8A0C8', ['#FFE0F0', '#E0F0FF', '#FFFFFF', '#FFD0E8']);
        } else {
            cloudMesh(Math.floor(len / 22), 3, 6, () => { const z = zAt(R0()); return { x: R(-120, 120), y: R(L.yMax + 8, L.yMax + 34), z }; }, '#B8C8F0');
        }

        /* ── Themed scenery (placed on the terrain) ── */
        const sideX = (a, b) => (R0() < 0.5 ? -1 : 1) * (lane + R(a, b));
        if (L.theme === 'forest') {
            const pal = L.palette, n = 240, spec = [];
            for (let i = 0; i < n; i++) { const d = R(0, len + 250), x = sideX(2, 80), z = -d; spec.push({ x, z, y: gy + hAt(x, z), h: R(8, 30), r: R(3, 6), c: pal[i % pal.length] }); }
            group.add(I(M.cyl(0.6, 1, 1, 7), M.mat('#C99A7B', { emissive: '#4a2f22' }), n, (i, o) => { const s = spec[i]; o.position.set(s.x, s.y + s.h / 2, s.z); o.scale.set(s.r * 0.35, s.h, s.r * 0.35); }));
            group.add(I(M.sph(1, 9, 7), M.mat('#FFFFFF', { emissive: '#4f6f5f' }), n, (i, o, col) => { const s = spec[i]; o.position.set(s.x, s.y + s.h + s.r * 0.5, s.z); o.scale.set(s.r, s.r * 0.95, s.r); col.set(s.c); }));
        }
        if (L.theme === 'forest' || L.theme === 'bubble') {
            const fl = []; for (let i = 0; i < 160; i++) { const d = R(0, len + 250), x = sideX(0, 70), z = -d; fl.push({ x, z, y: gy + hAt(x, z), h: R(3, 8), c: L.palette[i % L.palette.length] }); }
            group.add(I(M.cyl(0.12, 0.18, 1, 5), M.mat('#7FD9A0', { emissive: '#2f6f4f' }), fl.length, (i, o) => { const f = fl[i]; o.position.set(f.x, f.y + f.h / 2, f.z); o.scale.set(1, f.h, 1); }));
            group.add(I(M.sph(1, 8, 6), M.mat('#FFFFFF', { emissive: '#888' }), fl.length, (i, o, col) => { const f = fl[i]; o.position.set(f.x, f.y + f.h + 0.5, f.z); o.scale.set(1.5, 1.2, 1.5); col.set(f.c); }));
        }
        if (L.theme === 'bubble') {
            const bub = []; for (let i = 0; i < 90; i++) bub.push({ x: R(-90, 90), y: R(4, 44), z: -R(0, len + 250), r: R(1, 4.2) });
            group.add(I(M.sph(1, 12, 9), M.basic('#FFFFFF', { transparent: true, opacity: 0.28, depthWrite: false }), bub.length, (i, o, col) => { const b = bub[i]; o.position.set(b.x, b.y, b.z); o.scale.setScalar(b.r); col.set(['#BFE8FF', '#FFC9E3', '#E6D6FF', '#CFFFEA'][i % 4]); }));
        }
        if (L.theme === 'canyon') {
            const pal = L.palette, n = 230, spec = [];
            for (let i = 0; i < n; i++) { const d = R(0, len + 250), x = sideX(1, 75), z = -d; spec.push({ x, z, y: gy + hAt(x, z), h: R(8, 46), r: R(1.6, 4.6), c: pal[i % pal.length] }); }
            group.add(I(M.cone(1, 1, 6), M.mat('#FFFFFF', { emissive: '#3a2f58', transparent: true, opacity: 0.95 }), n, (i, o, col) => { const s = spec[i]; o.position.set(s.x, s.y + s.h / 2, s.z); o.scale.set(s.r, s.h, s.r); o.rotation.z = R(-0.12, 0.12); col.set(s.c); }));
        }
        if (L.theme === 'candy') {
            const pal = L.palette, n = 120, gum = [], lol = [], cane = [], don = [];
            for (let i = 0; i < 150; i++) { const d = R(0, len + 250), x = sideX(1, 85), z = -d; gum.push({ x, z, y: gy + hAt(x, z), r: R(3, 8), c: pal[i % pal.length] }); }
            for (let i = 0; i < n; i++) { const d = R(0, len + 250), x = sideX(2, 80), z = -d; lol.push({ x, z, y: gy + hAt(x, z), h: R(8, 24), r: R(2.6, 5), c: pal[i % pal.length] }); }
            for (let i = 0; i < 80; i++) { const d = R(0, len + 250), x = sideX(2, 80), z = -d; cane.push({ x, z, y: gy + hAt(x, z), h: R(10, 26), c: ['#FF6FA5', '#FF4F7D', '#4FE3B0'][i % 3] }); }
            for (let i = 0; i < 40; i++) { don.push({ x: (R0() < 0.5 ? -1 : 1) * R(lane + 6, 100), y: R(8, 46), z: -R(0, len + 250), r: R(2.4, 4.4), c: ['#FF8FC0', '#FFD84A', '#8FE3FF', '#C3A6FF'][i % 4] }); }
            group.add(I(geoCache('gum', () => new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), M.mat('#FFFFFF', { emissive: '#7a5a6a' }), gum.length, (i, o, col) => { const g = gum[i]; o.position.set(g.x, g.y - 0.5, g.z); o.scale.set(g.r, g.r * 0.85, g.r); col.set(g.c).lerp(new T.Color('#ffffff'), 0.2); }));
            group.add(I(M.cyl(0.4, 0.4, 1, 6), M.mat('#FFFFFF', { emissive: '#8a8a9a' }), lol.length, (i, o) => { const l = lol[i]; o.position.set(l.x, l.y + l.h / 2, l.z); o.scale.set(1, l.h, 1); }));
            group.add(I(geoCache('lolliD', () => { const g = new T.CylinderGeometry(1, 1, 0.28, 24); g.rotateX(Math.PI / 2); return g; }), new T.MeshLambertMaterial({ map: M.swirlTexture('#FFFFFF', '#C8C8C8'), emissive: new T.Color('#5a4a60') }), lol.length, (i, o, col) => { const l = lol[i]; o.position.set(l.x, l.y + l.h + l.r * 0.8, l.z); o.scale.setScalar(l.r); col.set(l.c); }));
            group.add(I(M.cyl(0.9, 0.9, 1, 10), new T.MeshLambertMaterial({ map: M.stripeTexture('#FFFFFF', '#D0D0D0'), emissive: new T.Color('#5a4455') }), cane.length, (i, o, col) => { const c = cane[i]; o.position.set(c.x, c.y + c.h / 2, c.z); o.scale.set(1, c.h, 1); col.set(c.c); }));
            group.add(I(geoCache('donutD', () => new T.TorusGeometry(1, 0.45, 8, 16)), M.mat('#FFFFFF', { emissive: '#6a4a5a' }), don.length, (i, o, col) => { const d = don[i]; o.position.set(d.x, d.y, d.z); o.rotation.x = -1.2; o.scale.setScalar(d.r); col.set(d.c); }));
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
        const nd = Math.floor(len / 6), dpos = new Float32Array(nd * 3), dcol = new Float32Array(nd * 3), dc = new T.Color();
        for (let i = 0; i < nd; i++) { const d = 16 + i * 6; dpos[i * 3] = px(d); dpos[i * 3 + 1] = py(d) - 0.3; dpos[i * 3 + 2] = -d; dc.set(M.RAINBOW[i % 6]); dcol[i * 3] = dc.r; dcol[i * 3 + 1] = dc.g; dcol[i * 3 + 2] = dc.b; }
        const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dpos, 3)); dg.setAttribute('color', new T.BufferAttribute(dcol, 3));
        const pathDots = new T.Points(dg, new T.PointsMaterial({ size: 7, sizeAttenuation: false, map: M.glowTexture(), vertexColors: true, transparent: true, depthWrite: false }));   // fixed pixel size: never a big blob near the camera
        pathDots.frustumCulled = false; group.add(pathDots);
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
        let palI = 0; const pickPal = () => (L.palette || ['#C3A6FF', '#FF9EC4', '#8FD3FF'])[palI++ % (L.palette || [1, 2, 3]).length];
        function place(kind) {
            for (let attempt = 0; attempt < 120; attempt++) {
                const d = R(115, len - 70);
                if (used.some(u => Math.abs(u - d) < L.gap)) continue;
                const x = R(-L.xr, L.xr); let cols, mesh, floaty = false;
                if (kind === 'storm') {
                    const s = R(1.15, 1.6), y = R(L.yMin + 1, L.yMax - 1);
                    cols = [{ t: 's', x, y, z: -d, r: 1.9 * s }]; mesh = M.makeStormCloud(s); mesh.position.set(x, y, -d); floaty = true;
                } else if (kind === 'tree') {
                    const h = R(13, L.yMax + 7);
                    cols = [{ t: 'c', x, z: -d, r: 1.6, y0: gy, y1: gy + h }, { t: 's', x, y: gy + h + 1.5, z: -d, r: 4.3 }];
                    mesh = M.makeTree(h, pickPal()); mesh.position.set(x, gy, -d);
                } else if (kind === 'mushroom' || kind === 'cupcake') {
                    const h = kind === 'cupcake' ? R(7, 11) : R(7, 13);
                    cols = [{ t: 'c', x, z: -d, r: kind === 'cupcake' ? 2.4 : 1.3, y0: gy, y1: gy + h }, { t: 's', x, y: gy + h + (kind === 'cupcake' ? 2.2 : 0.6), z: -d, r: kind === 'cupcake' ? 3.3 : 3.1 }];
                    mesh = kind === 'cupcake' ? M.makeCupcake(h) : M.makeMushroom(h, pickPal()); mesh.position.set(x, gy, -d);
                } else if (kind === 'crystal') {
                    const h = R(10, L.yMax + 6);
                    cols = [{ t: 'c', x, z: -d, r: 2.0, y0: gy, y1: gy + h }];
                    mesh = M.makeCrystal(h, pickPal()); mesh.position.set(x, gy, -d);
                } else if (kind === 'lolli') {
                    const h = R(14, L.yMax + 4);
                    cols = [{ t: 'c', x, z: -d, r: 0.9, y0: gy, y1: gy + h }, { t: 's', x, y: gy + h + 3.6, z: -d, r: 4.3 }];
                    mesh = M.makeLollipop(h, palI++); mesh.position.set(x, gy, -d);
                } else if (kind === 'cane') {
                    const h = R(12, L.yMax + 5);
                    cols = [{ t: 'c', x, z: -d, r: 1.3, y0: gy, y1: gy + h }, { t: 's', x: x + 2.2, y: gy + h, z: -d, r: 2.8 }];
                    mesh = M.makeCandyCane(h); mesh.position.set(x, gy, -d);
                } else if (kind === 'donut') {
                    const y = R(L.yMin + 2, L.yMax - 2), r = R(2.6, 3.6);
                    cols = [{ t: 's', x, y, z: -d, r: r * 1.3 }]; mesh = M.makeDonut(r); mesh.position.set(x, y, -d); floaty = true;
                } else {   // island
                    const y = R(L.yMin + 2, L.yMax - 3), r = R(4, 5.5);
                    cols = [{ t: 's', x, y, z: -d, r: r * 0.95 }]; mesh = M.makeIsland(r); mesh.position.set(x, y, -d); floaty = true;
                }
                if (!clearsPath(cols, d)) continue;
                used.push(d); group.add(mesh);
                const ob = { kind, cols, mesh, x, d, ph: R(0, 6) };
                world.obstacles.push(ob);
                if (floaty) { world.dyn.push(mesh); mesh.userData.bobBase = mesh.position.y; mesh.userData.ph = ob.ph; }
                return;
            }
        }
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
            const bubble = M.makeBubble(7), bella = M.buildUnicorn(M.BELLA); bella.scale.setScalar(1.5); bella.rotation.y = Math.PI;
            const g = new T.Group(); g.add(bubble); g.add(bella);
            const halo = M.glow('#FF8FC8', 24, 0.28); g.add(halo);                      // big pink beacon so Bella can be spotted from far away
            for (let k = 0; k < 6; k++) { const sp = M.glow(['#FFFFFF', '#FFE680', '#FF9EC4'][k % 3], 3.2, 0.9); const a = k / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0); sp.userData.a = a; g.add(sp); }
            g.position.set(gx, gyy, -gd - 18); group.add(g);
            const beam = M.makeBeam('#FF8FC8', 0.13, 1.7); beam.position.set(gx, gyy - 8, -gd - 18); group.add(beam);
            world.goal = { x: gx, y: gyy, z: -gd - 18, mesh: g, bubble, bella, beam, halo, kind: 'bella' };
        } else {
            const clue = M.makeClue(L.goal); clue.position.set(gx, gyy, -gd - 14); group.add(clue);
            const beam = M.makeBeam('#FFF0A8'); beam.position.set(gx, gyy - 8, -gd - 14); group.add(beam);
            world.goal = { x: gx, y: gyy, z: -gd - 14, mesh: clue, beam, kind: L.goal };
        }
        // Home, far behind where the quest begins
        if (L.id !== 6) { const home = M.makeCastle(); home.scale.setScalar(0.7); home.position.set(-42, L.yMid - 13, 70); home.rotation.y = 0.5; group.add(home); }

        world.starsTotal = world.stars.length;

        /* ── Per-frame animation and distance culling ── */
        world.update = function (t, lz) {
            chunks.forEach(c => { c.visible = c.userData.zmax >= lz - 340 && c.userData.zmin <= lz + 90; });
            const near = z => z - lz < 40 && z - lz > -340;
            world.stars.forEach(s => { const v = !s.got && near(s.z); s.mesh.visible = v; if (v) { s.mesh.rotation.y = t * 2.2 + s.ph; s.mesh.position.y = s.y + Math.sin(t * 2 + s.ph) * 0.25; } });
            world.rings.forEach(r => { const v = near(r.z) && r.state !== 1; r.mesh.visible = v; if (v) { const dots = r.mesh.getObjectByName('dots'); if (dots) dots.rotation.z = t * 0.9; } });
            world.dyn.forEach(m => { if (m.userData.bobBase !== undefined) m.position.y = m.userData.bobBase + Math.sin(t * 1.3 + m.userData.ph) * 0.5; });
            world.obstacles.forEach(o => { o.mesh.visible = near(o.cols[0].z); });
            if (world.goal) { const g = world.goal; if (g.kind === 'bella') { g.halo.material.opacity = 0.26 + Math.sin(t * 3) * 0.06; g.mesh.children.forEach(c => { if (c.userData.a !== undefined) { const a = c.userData.a + t * 0.8; c.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0); } }); g.bubble.scale.setScalar(1 + Math.sin(t * 2) * 0.03); if (!g.freed) { g.bella.position.y = Math.sin(t * 2) * 0.4; M.animateUnicorn(g.bella, t, { flap: 5 }); } } else if (g.kind !== 'castle') g.mesh.rotation.y = t * 1.2; }
        };
        world.reset = function () { world.stars.forEach(s => { s.got = false; s.mesh.visible = true; s.mesh.scale.setScalar(1); }); world.rings.forEach(r => { r.state = 0; }); };
        world.pathPoint = d => ({ x: px(d), y: py(d), z: -d });
        return world;
    };

    /* tiny geometry cache for instanced decor */
    const gc = {};
    function geoCache(k, make) { return gc[k] || (gc[k] = make()); }
})();
