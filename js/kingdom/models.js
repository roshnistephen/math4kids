/* Rainbow Kingdom — cute low-poly 3D models, built from primitives so they can be animated and stay in one style. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK = window.RK || {};

    /* ── Shared helpers (materials and geometry are cached to keep draw calls and memory low) ── */
    const matCache = {}, geoCache = {};
    const mat = (color, o) => { const k = color + JSON.stringify(o || {}); return matCache[k] || (matCache[k] = new T.MeshLambertMaterial(Object.assign({ color: new T.Color(color) }, o || {}))); };
    const basic = (color, o) => { const k = 'b' + color + JSON.stringify(o || {}); return matCache[k] || (matCache[k] = new T.MeshBasicMaterial(Object.assign({ color: new T.Color(color) }, o || {}))); };
    const geo = (k, make) => geoCache[k] || (geoCache[k] = make());
    const sph = (r, w, h) => geo('s' + r + ',' + w + ',' + h, () => new T.SphereGeometry(r, w || 14, h || 10));
    const cone = (r, h, s) => geo('c' + r + ',' + h + ',' + s, () => new T.ConeGeometry(r, h, s || 10));
    const cyl = (rt, rb, h, s) => geo('y' + rt + ',' + rb + ',' + h + ',' + s, () => new T.CylinderGeometry(rt, rb, h, s || 10));
    const mesh = (g, m, x, y, z) => { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
    const RAINBOW = ['#FF8FB8', '#FFB98A', '#FFE680', '#8EEBC4', '#8FD3FF', '#C3A6FF'];

    /* Soft round glow used for auras, stars and sparkles */
    let glowTex = null;
    function glowTexture() {
        if (glowTex) return glowTex;
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
        glowTex = new T.CanvasTexture(c);
        return glowTex;
    }
    function glow(color, size, opacity) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: new T.Color(color), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity === undefined ? 0.8 : opacity }));
        s.scale.set(size, size, 1);
        return s;
    }

    /* ── Unicorns ─────────────────────────────────────────────────────────
       Faces -Z (the direction of flight). Luna: moonlit lavender-white with a rainbow mane.
       Bella: peach-pink with a teal mane and a big bow. */
    const LUNA = { body: '#F7F0FF', snout: '#FFD9EC', mane: ['#FF8FB8', '#FFB98A', '#FFE680', '#8EEBC4', '#8FD3FF', '#C3A6FF'], horn: '#FFD54A', wing: ['#FFFFFF', '#F1E6FF', '#E0CFFF', '#FFD0EA'], aura: '#C9B2FF', ear: '#FFB5D5', bow: null };
    const BELLA = { body: '#FFE3EE', snout: '#FFC4DC', mane: ['#7FE3D3', '#8FD3FF', '#A8F0D6', '#7FE3D3', '#8FD3FF', '#A8F0D6'], horn: '#FFE27A', wing: ['#FFFFFF', '#FFEAF3', '#FFD3E6', '#FFE9A8'], aura: '#FFB8D9', ear: '#FF9EC4', bow: '#FF6FA5' };

    function buildUnicorn(P) {
        P = P || LUNA;
        const root = new T.Group(), body = new T.Group(); root.add(body);
        const bodyM = mat(P.body, { emissive: new T.Color(P.body).multiplyScalar(0.28) });
        const parts = { tail: [], mane: [], wings: [], legs: [] };

        const torso = mesh(sph(1, 20, 14), bodyM); torso.scale.set(0.95, 0.8, 1.3); body.add(torso);
        const neck = mesh(sph(0.6, 14, 10), bodyM, 0, 0.55, -1.0); neck.scale.set(0.9, 1.1, 0.9); body.add(neck);

        // Head
        const head = new T.Group(); head.position.set(0, 0.95, -1.45); body.add(head); parts.head = head;
        head.add(mesh(sph(0.88, 22, 16), bodyM));
        const snout = mesh(sph(0.42, 14, 12), mat(P.snout, { emissive: new T.Color(P.snout).multiplyScalar(0.2) }), 0, -0.25, -0.72); snout.scale.set(1.05, 0.8, 0.9); head.add(snout);
        [-1, 1].forEach(s => {
            head.add(mesh(sph(0.05, 8, 6), mat('#B5679A'), s * 0.14, -0.2, -1.07));                                    // nostrils
            const eye = mesh(sph(0.2, 12, 10), mat('#2B1B5E'), s * 0.42, 0.12, -0.74); eye.scale.set(0.9, 1.3, 0.6); head.add(eye);
            head.add(mesh(sph(0.075, 8, 6), basic('#FFFFFF'), s * 0.37, 0.24, -0.84));                                 // eye sparkle
            head.add(mesh(sph(0.04, 8, 6), basic('#FFFFFF'), s * 0.46, 0.04, -0.85));
            const blush = mesh(sph(0.15, 10, 8), mat('#FF9EC4', { emissive: new T.Color('#FF9EC4').multiplyScalar(0.25) }), s * 0.62, -0.14, -0.58); blush.scale.set(1, 0.65, 0.4); head.add(blush);
            const ear = mesh(cone(0.24, 0.62, 10), bodyM, s * 0.5, 0.86, -0.12); ear.rotation.z = -s * 0.32; head.add(ear);
            const inner = mesh(cone(0.13, 0.4, 8), mat(P.ear), s * 0.5, 0.82, -0.2); inner.rotation.z = -s * 0.32; head.add(inner);
        });
        // Smile
        const smile = mesh(geo('smile', () => new T.TorusGeometry(0.1, 0.022, 6, 12, Math.PI)), mat('#B5679A'), 0, -0.42, -1.04); smile.rotation.z = Math.PI; head.add(smile);

        // Horn with golden spiral rings
        const horn = new T.Group(); horn.position.set(0, 1.0, -0.5); horn.rotation.x = -0.5; head.add(horn);
        horn.add(mesh(cone(0.17, 1.1, 12), mat(P.horn, { emissive: '#7A5200' })));
        [0.3, 0.52, 0.74].forEach((t, i) => { const r = 0.17 * (1 - t) + 0.012, ring = mesh(geo('hr' + i, () => new T.TorusGeometry(r, 0.03, 6, 14)), mat('#FFFFFF', { emissive: '#8a7a40' }), 0, -0.55 + t * 1.1, 0); ring.rotation.x = Math.PI / 2; horn.add(ring); });
        const tip = glow('#FFF3A8', 1.5, 0.9); tip.position.set(0, 0.6, 0); horn.add(tip); parts.hornGlow = tip;

        // Fluffy forelock
        const fl = mesh(sph(0.3, 12, 10), mat(P.mane[0], { emissive: new T.Color(P.mane[0]).multiplyScalar(0.3) }), 0, 0.74, -0.46); fl.scale.set(1.1, 0.8, 1); head.add(fl);
        const fl2 = mesh(sph(0.2, 10, 8), mat(P.mane[2], { emissive: new T.Color(P.mane[2]).multiplyScalar(0.3) }), 0.3, 0.7, -0.5); head.add(fl2);
        if (P.bow) {   // Bella's bow
            const bm = mat(P.bow, { emissive: new T.Color(P.bow).multiplyScalar(0.4) });
            [-1, 1].forEach(s => { const lobe = mesh(cone(0.2, 0.42, 10), bm, s * 0.28, 0.98, 0.1); lobe.rotation.z = -s * Math.PI / 2; head.add(lobe); });
            head.add(mesh(sph(0.12, 10, 8), mat('#FFE680', { emissive: '#7a6a00' }), 0, 0.98, 0.1));
        }

        // Rainbow mane puffs down the neck
        [[0, 1.5, -1.0, 0.34], [0, 1.22, -0.72, 0.36], [0.05, 0.95, -0.42, 0.34], [-0.04, 0.68, -0.12, 0.3], [0.03, 0.46, 0.18, 0.26]].forEach((p, i) => {
            const m = mesh(sph(p[3], 12, 8), mat(P.mane[i % 6], { emissive: new T.Color(P.mane[i % 6]).multiplyScalar(0.32) }), p[0], p[1], p[2]); m.userData.base = p[0]; body.add(m); parts.mane.push(m);
        });

        // Legs (tucked for flying) with golden hooves
        [[-0.5, -0.7], [0.5, -0.7], [-0.46, 0.8], [0.46, 0.8]].forEach((p, i) => {
            const leg = new T.Group(); leg.position.set(p[0], -0.5, p[1]);
            leg.add(mesh(cyl(0.16, 0.12, 0.72, 8), bodyM, 0, -0.36, 0));
            leg.add(mesh(cyl(0.15, 0.15, 0.13, 8), mat('#FFC94D', { emissive: '#6a4a00' }), 0, -0.76, 0));
            leg.userData.front = i < 2; body.add(leg); parts.legs.push(leg);
        });

        // Tail: a chain of rainbow puffs
        for (let i = 0; i < 7; i++) {
            const c = P.mane[i % 6], r = 0.42 - i * 0.03, m = mesh(sph(r, 12, 8), mat(c, { emissive: new T.Color(c).multiplyScalar(0.32) }), 0, 0.25 - i * 0.05, 1.2 + i * 0.4);
            body.add(m); parts.tail.push(m);
        }

        // Layered fluffy wings
        const wingGeo = sph(1, 12, 8);
        [-1, 1].forEach(s => {
            const w = new T.Group(); w.position.set(s * 0.5, 0.65, -0.15); w.userData.side = s;
            [{ x: 0.75, z: 0.0, sx: 0.85, sz: 0.55, c: P.wing[0] }, { x: 1.2, z: 0.25, sx: 0.75, sz: 0.5, c: P.wing[1] }, { x: 1.6, z: 0.5, sx: 0.65, sz: 0.44, c: P.wing[2] }, { x: 1.95, z: 0.72, sx: 0.5, sz: 0.36, c: P.wing[3] }].forEach(f => {
                const feather = mesh(wingGeo, mat(f.c, { emissive: new T.Color(f.c).multiplyScalar(0.4) }), s * f.x, 0, f.z);
                feather.scale.set(f.sx, 0.1, f.sz); w.add(feather);
            });
            body.add(w); parts.wings.push(w);
        });

        // Magical aura
        const aura = glow(P.aura, 7, 0.45); aura.position.set(0, 0.6, 0); root.add(aura); parts.aura = aura;

        root.userData = { parts, body };
        return root;
    }

    /* Per-frame motion for a unicorn. opts: flap (speed), bank, pitch, boost */
    function animateUnicorn(u, t, opts) {
        const p = u.userData.parts, body = u.userData.body, o = opts || {};
        const fs = o.flap || 8, flap = Math.sin(t * fs) * (0.5 + (o.boost ? 0.15 : 0));
        p.wings.forEach(w => { const s = w.userData.side; w.rotation.z = s * (0.3 + flap); w.rotation.y = -s * (0.15 - flap * 0.18); });
        p.tail.forEach((m, i) => { m.position.x = Math.sin(t * 3.2 - i * 0.65) * (0.1 + i * 0.07); m.position.y = 0.25 - i * 0.05 + Math.sin(t * 2.2 - i * 0.5) * 0.09 + (o.pitch || 0) * i * 0.4; });
        p.mane.forEach((m, i) => { m.position.x = (m.userData.base || 0) + Math.sin(t * 4 - i * 0.8) * 0.08; });
        p.legs.forEach((l, i) => { const k = Math.sin(t * 5 + i * 0.9) * 0.22; l.rotation.x = l.userData.front ? 0.65 + k : -0.55 - k; });
        body.position.y = Math.sin(t * 2.6) * 0.12;
        p.head.rotation.x = Math.sin(t * 2.6 + 1) * 0.05 - (o.pitch || 0) * 0.5;
        p.aura.material.opacity = 0.35 + Math.sin(t * 3) * 0.08 + (o.boost ? 0.3 : 0);
        p.aura.scale.setScalar((o.boost ? 10 : 7) + Math.sin(t * 3) * 0.3);
        p.hornGlow.material.opacity = 0.7 + Math.sin(t * 5) * 0.25;
        u.rotation.z = -(o.bank || 0); u.rotation.x = (o.pitch || 0);
    }

    /* ── Collectibles and path markers ── */
    let starGeometry = null;
    function makeStar() {
        if (!starGeometry) {
            const s = new T.Shape(), R = 0.75, r = 0.34;
            for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R, x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
            s.closePath();
            starGeometry = new T.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 });
            starGeometry.center();
        }
        const g = new T.Group();
        g.add(new T.Mesh(starGeometry, mat('#FFD84A', { emissive: '#C98A00' })));
        g.add(glow('#FFE68A', 3.2, 0.7));
        return g;
    }

    function makeRing(color) {
        const g = new T.Group();
        g.add(mesh(geo('ring', () => new T.TorusGeometry(3.4, 0.2, 10, 44)), basic(color)));
        g.add(mesh(geo('ringIn', () => new T.TorusGeometry(3.4, 0.5, 8, 44)), basic(color, { transparent: true, opacity: 0.22, depthWrite: false })));
        const disc = mesh(geo('disc', () => new T.CircleGeometry(3.3, 36)), basic(color, { transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
        g.add(disc);
        const dots = new T.Group(); dots.name = 'dots';
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, d = mesh(sph(0.16, 6, 6), basic('#FFFFFF'), Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0); dots.add(d); }
        g.add(dots);
        return g;
    }

    /* Grumpy-but-cute storm cloud */
    function makeStormCloud(scale) {
        const g = new T.Group(), c = mat('#9C93C6', { emissive: '#4B4472' }), c2 = mat('#B3ABD8', { emissive: '#5A5385' });
        [[0, 0, 0, 1.5], [-1.4, -0.2, 0.1, 1.15], [1.4, -0.2, 0.1, 1.15], [-0.7, 0.8, -0.1, 1.0], [0.8, 0.75, -0.1, 1.05], [0, -0.55, 0.2, 1.1]].forEach((p, i) => g.add(mesh(sph(p[3], 12, 9), i % 2 ? c2 : c, p[0], p[1], p[2])));
        // angry little face on the +Z side (towards the player)
        [-1, 1].forEach(s => {
            g.add(mesh(sph(0.34, 10, 8), basic('#FFFFFF'), s * 0.62, 0.25, 1.28));
            g.add(mesh(sph(0.17, 8, 6), basic('#2B1B5E'), s * 0.6, 0.2, 1.55));
            const brow = mesh(geo('brow', () => new T.BoxGeometry(0.62, 0.13, 0.12)), mat('#3A2F63'), s * 0.62, 0.7, 1.4); brow.rotation.z = s * 0.45; g.add(brow);
            g.add(mesh(sph(0.2, 8, 6), mat('#FF9EC4', { emissive: '#7a3a55' }), s * 1.05, -0.2, 1.1));
        });
        const mouth = mesh(geo('mouthC', () => new T.TorusGeometry(0.2, 0.06, 6, 10, Math.PI)), mat('#3A2F63'), 0, -0.4, 1.4); g.add(mouth);
        const bolt = mesh(cone(0.28, 0.9, 4), basic('#FFE04A'), 0, -1.7, 0.2); bolt.rotation.x = Math.PI; g.add(bolt);
        g.scale.setScalar(scale || 1);
        return g;
    }

    function makeTree(h, palette) {
        const g = new T.Group(), c = palette || '#8EEBC4';
        g.add(mesh(cyl(0.9, 1.5, h, 8), mat('#C99A7B', { emissive: '#4a2f22' }), 0, h / 2, 0));
        [[0, h + 1.5, 0, 5.2], [-2.2, h - 1.8, 0.5, 3.6], [2.4, h - 1.2, -0.4, 3.4]].forEach((p, i) => g.add(mesh(sph(p[3], 12, 9), mat(i ? '#B8F2D9' : c, { emissive: new T.Color(c).multiplyScalar(0.25) }), p[0], p[1], p[2])));
        return g;
    }

    function makeMushroom(h, capColor) {
        const g = new T.Group(), cm = capColor || '#FF8FB8';
        g.add(mesh(cyl(0.9, 1.2, h, 10), mat('#FFF1E2', { emissive: '#7a6a5a' }), 0, h / 2, 0));
        const cap = mesh(geo('cap', () => new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(cm, { emissive: new T.Color(cm).multiplyScalar(0.3) }), 0, h, 0); cap.scale.set(3.4, 2.2, 3.4); g.add(cap);
        [[0, 3.2, 0, 0.45], [1.8, 2.4, 0.8, 0.35], [-1.7, 2.5, 1.0, 0.38], [0.6, 2.4, -1.8, 0.33], [-0.8, 2.5, -1.7, 0.3]].forEach(p => g.add(mesh(sph(p[3], 8, 6), basic('#FFFFFF'), p[0], h + p[1] - 1.2, p[2])));
        return g;
    }

    function makeCrystal(h, color) {
        const g = new T.Group(), m = mat(color, { emissive: new T.Color(color).multiplyScalar(0.45), transparent: true, opacity: 0.92 });
        const main = mesh(cone(1.2, h, 6), m, 0, h / 2, 0); g.add(main);
        const s1 = mesh(cone(0.8, h * 0.6, 5), m, 1.4, h * 0.3, 0.3); s1.rotation.z = -0.25; g.add(s1);
        const s2 = mesh(cone(0.7, h * 0.5, 5), m, -1.3, h * 0.25, -0.2); s2.rotation.z = 0.25; g.add(s2);
        return g;
    }

    function makeIsland(r) {
        const g = new T.Group();
        g.add(mesh(cyl(r, r * 0.95, 0.9, 16), mat('#B6F2C1', { emissive: '#3a6a4a' }), 0, 0, 0));
        const rock = mesh(cone(r * 0.95, r * 1.2, 10), mat('#D8B7C9', { emissive: '#503a4a' }), 0, -0.45 - r * 0.6, 0); rock.rotation.x = Math.PI; g.add(rock);
        g.add(mesh(cyl(0.2, 0.3, 1.8, 6), mat('#C99A7B'), r * 0.3, 1.3, 0));
        g.add(mesh(sph(1.1, 10, 8), mat('#FF9EC4', { emissive: '#7a3a55' }), r * 0.3, 2.7, 0));
        return g;
    }

    function makeRainbowArc(R, thick) {
        const g = new T.Group();
        ['#FF8FB8', '#FFB98A', '#FFE680', '#8EEBC4', '#8FD3FF', '#C3A6FF'].forEach((c, i) => g.add(mesh(new T.TorusGeometry(R - i * thick * 0.95, thick * 0.5, 8, 44, Math.PI), basic(c))));
        return g;
    }

    function makeCastle() {
        const g = new T.Group();
        const pink = mat('#FFD9EC', { emissive: '#7a5a6a' }), white = mat('#FFFFFF', { emissive: '#7a7a8a' }), blue = mat('#9ED8FF', { emissive: '#3a5a7a' }), lil = mat('#C9B2FF', { emissive: '#4a3a7a' });
        g.add(mesh(cyl(16, 20, 3, 20), mat('#FFFFFF', { emissive: '#9aa4c0' }), 0, -1.5, 0));
        g.add(mesh(new T.BoxGeometry(18, 7, 6), pink, 0, 3.5, 0));
        g.add(mesh(cyl(4.2, 4.6, 16, 16), white, 0, 8, -1));
        g.add(mesh(cone(5.2, 8, 16), lil, 0, 20, -1));
        [[-9, 12, 0], [9, 12, 0], [-6.5, 9, 3.5], [6.5, 9, 3.5]].forEach((p, i) => { g.add(mesh(cyl(1.7, 1.9, p[1], 12), i % 2 ? white : pink, p[0], p[1] / 2, p[2])); g.add(mesh(cone(2.4, 4.2, 12), i % 2 ? lil : blue, p[0], p[1] + 2.1, p[2])); });
        g.add(mesh(new T.BoxGeometry(3.2, 4.6, 0.6), mat('#7A5AF8', { emissive: '#2a1a6a' }), 0, 2.3, 3.2));
        [[-5, 6], [5, 6], [-2, 12], [2, 12], [0, 15]].forEach(p => g.add(mesh(new T.BoxGeometry(0.9, 1.5, 0.3), basic('#FFE680'), p[0], p[1], p[1] > 10 ? 3.4 : 3.1)));
        const flag = mesh(cone(0.9, 2.4, 3), mat('#FF6FA5', { emissive: '#7a1a3a' }), 1.2, 26.2, -1); flag.rotation.z = -Math.PI / 2; g.add(flag);
        g.add(mesh(cyl(0.1, 0.1, 4, 6), white, 0, 24.4, -1));
        const arc = makeRainbowArc(26, 2.2); arc.position.set(0, 2, -9); g.add(arc);
        return g;
    }

    function makeBubble(r) {
        const g = new T.Group();
        g.add(mesh(sph(r, 24, 16), basic('#BFE8FF', { transparent: true, opacity: 0.22, depthWrite: false })));
        g.add(mesh(sph(r * 1.02, 24, 16), basic('#FFFFFF', { transparent: true, opacity: 0.12, depthWrite: false, side: T.BackSide })));
        const hl = mesh(sph(r * 0.16, 8, 6), basic('#FFFFFF', { transparent: true, opacity: 0.9 }), -r * 0.45, r * 0.5, r * 0.6); hl.scale.set(1.6, 0.8, 0.6); g.add(hl);
        return g;
    }

    /* The "clue" Luna finds at the end of a level */
    function makeClue(kind) {
        const g = new T.Group();
        if (kind === 'ribbon') {
            const m = mat('#FF6FA5', { emissive: '#8a1f48' });
            [-1, 1].forEach(s => { const lobe = mesh(cone(0.9, 1.7, 14), m, s * 0.85, 0, 0); lobe.rotation.z = -s * Math.PI / 2; g.add(lobe); });
            g.add(mesh(sph(0.5, 12, 9), mat('#FFB8D6', { emissive: '#8a4a68' })));
            [-1, 1].forEach(s => { const tail = mesh(cone(0.4, 1.8, 8), m, s * 0.5, -1.1, 0); tail.rotation.z = s * 0.35; tail.rotation.x = Math.PI; g.add(tail); });
        } else if (kind === 'feather') {
            const f = mesh(sph(1, 14, 10), mat('#FFC4E0', { emissive: '#8a4a68' })); f.scale.set(0.55, 1.7, 0.12); g.add(f);
            g.add(mesh(cyl(0.05, 0.05, 3.4, 6), mat('#FFFFFF'), 0, 0, 0.05));
        } else if (kind === 'gem') {
            g.add(mesh(geo('oct', () => new T.OctahedronGeometry(1.2, 0)), mat('#8FD3FF', { emissive: '#2f6f9f', transparent: true, opacity: 0.95 })));
        } else if (kind === 'castle') {
            return makeCastle();
        }
        g.add(glow('#FFF0A8', 7, 0.7));
        return g;
    }

    function makeBeam(color) {
        const m = mesh(geo('beam', () => new T.CylinderGeometry(1.6, 1.6, 80, 18, 1, true)), basic(color, { transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }), 0, 38, 0);
        return m;
    }

    RK.Models = { T, glowTexture, mat, basic, geo, sph, cone, cyl, mesh, glow, RAINBOW, LUNA, BELLA, buildUnicorn, animateUnicorn, makeStar, makeRing, makeStormCloud, makeTree, makeMushroom, makeCrystal, makeIsland, makeRainbowArc, makeCastle, makeBubble, makeClue, makeBeam };
})();
