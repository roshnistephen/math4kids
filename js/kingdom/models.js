/* Rainbow Kingdom — stylised 3D models: cel-shaded, outlined characters and a candy-coloured world.
   Everything is built from primitives so it can be animated and stays in one cohesive style. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK = window.RK || {};

    /* ── Shared helpers (materials and geometry are cached to keep memory and draw calls low) ── */
    const matCache = {}, geoCache = {};
    const key = o => { try { return JSON.stringify(o || {}); } catch (e) { return ''; } };
    const mat = (color, o) => { const k = color + key(o); return matCache[k] || (matCache[k] = new T.MeshLambertMaterial(Object.assign({ color: new T.Color(color) }, o || {}))); };
    const basic = (color, o) => { const k = 'b' + color + key(o); return matCache[k] || (matCache[k] = new T.MeshBasicMaterial(Object.assign({ color: new T.Color(color) }, o || {}))); };
    const geo = (k, make) => geoCache[k] || (geoCache[k] = make());
    const sph = (r, w, h) => geo('s' + r + ',' + w + ',' + h, () => new T.SphereGeometry(r, w || 14, h || 10));
    const cone = (r, h, s) => geo('c' + r + ',' + h + ',' + s, () => new T.ConeGeometry(r, h, s || 10));
    const cyl = (rt, rb, h, s) => geo('y' + rt + ',' + rb + ',' + h + ',' + s, () => new T.CylinderGeometry(rt, rb, h, s || 10));
    const mesh = (g, m, x, y, z) => { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
    const RAINBOW = ['#FF6FA5', '#FFA05A', '#FFD84A', '#4FE3B0', '#4FB8FF', '#A27BFF'];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

    /* ── Cel shading and outlines (what makes the characters pop against the sky) ── */
    let gradTex = null;
    function toonGradient() {
        if (gradTex) return gradTex;
        gradTex = new T.DataTexture(new Uint8Array([88, 160, 220, 255]), 4, 1, T.RedFormat);
        gradTex.minFilter = gradTex.magFilter = T.NearestFilter; gradTex.generateMipmaps = false; gradTex.needsUpdate = true;
        return gradTex;
    }
    const toon = (color, o) => { const k = 't' + color + key(o); return matCache[k] || (matCache[k] = new T.MeshToonMaterial(Object.assign({ color: new T.Color(color), gradientMap: toonGradient() }, o || {}))); };
    const outlineMats = {};
    function outlineMat(color, th) {
        const k = color + th;
        if (outlineMats[k]) return outlineMats[k];
        const m = new T.MeshBasicMaterial({ color: new T.Color(color), side: T.BackSide });
        m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * ' + th.toFixed(4) + ';'); };
        m.customProgramCacheKey = () => 'outline' + th;
        return (outlineMats[k] = m);
    }
    /* Adds an inverted-hull outline as a child, so it inherits the parent's transform. */
    function outlined(m, th, color) { const o = new T.Mesh(m.geometry, outlineMat(color || '#4B2E9A', th || 0.06)); m.add(o); return m; }

    /* Clone a geometry and paint a vertical colour gradient into it. */
    function gradGeo(g, top, bottom, y0, y1) {
        g = g.clone();
        const pos = g.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color(top), b = new T.Color(bottom), c = new T.Color();
        for (let i = 0; i < pos.count; i++) { c.copy(b).lerp(a, clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new T.BufferAttribute(col, 3));
        return g;
    }

    /* A tapered, gently curved lock of hair (mane and tail). */
    function lock(points, r0, r1, cA, cB, seg) {
        seg = seg || 22;
        const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2]))), rad = 8;
        const g = new T.TubeGeometry(curve, seg, 1, rad, false), pos = g.attributes.position, per = rad + 1;
        const col = new Float32Array(pos.count * 3), a = new T.Color(cA), b = new T.Color(cB), c = new T.Color();
        for (let i = 0; i <= seg; i++) {
            const u = i / seg, ctr = curve.getPointAt(u), r = r0 + (r1 - r0) * Math.pow(u, 0.8);
            c.copy(a).lerp(b, u);
            for (let j = 0; j < per; j++) {
                const k = i * per + j;
                pos.setXYZ(k, ctr.x + (pos.getX(k) - ctr.x) * r, ctr.y + (pos.getY(k) - ctr.y) * r, ctr.z + (pos.getZ(k) - ctr.z) * r);
                col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
            }
        }
        g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
        return mesh(g, toon('#FFFFFF', { vertexColors: true, emissive: new T.Color(cA).multiplyScalar(0.12) }));
    }

    /* Big shiny cartoon eye, drawn once as a texture */
    let eyeTex = null;
    function eyeTexture() {
        if (eyeTex) return eyeTex;
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#2B1B5E'; g.beginPath(); g.ellipse(64, 66, 46, 56, 0, 0, 6.283); g.fill();
        const ir = g.createRadialGradient(64, 78, 6, 64, 70, 46); ir.addColorStop(0, '#FF9ED0'); ir.addColorStop(0.55, '#9B6BFF'); ir.addColorStop(1, '#3A2A8A');
        g.fillStyle = ir; g.beginPath(); g.ellipse(64, 70, 38, 48, 0, 0, 6.283); g.fill();
        g.fillStyle = '#1A0F40'; g.beginPath(); g.ellipse(64, 66, 17, 26, 0, 0, 6.283); g.fill();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(46, 42, 14, 17, -0.4, 0, 6.283); g.fill();
        g.beginPath(); g.ellipse(80, 90, 7, 7, 0, 0, 6.283); g.fill();
        g.strokeStyle = '#2B1B5E'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(14, 36); g.quadraticCurveTo(54, -2, 114, 24); g.stroke();   // lash line
        g.lineWidth = 6; g.beginPath(); g.moveTo(106, 22); g.lineTo(122, 12); g.stroke();
        eyeTex = new T.CanvasTexture(c);
        return eyeTex;
    }

    /* ── Unicorns ─────────────────────────────────────────────────────────
       Face -Z (the direction of flight). Luna: lavender with a vivid rainbow mane and tail.
       Bella: rosy-pink with a teal mane and a big bow. */
    const LUNA = { top: '#C9AEFF', belly: '#FFE3F4', muzzle: '#FFEAF5', mane: ['#FF6FA5', '#FFA05A', '#FFD84A', '#4FE3B0', '#4FB8FF', '#A27BFF'], horn: '#FFD54A', wingA: '#FFFFFF', wingB: '#FF9ED0', wingC: '#8F6BFF', ear: '#FFB0D5', line: '#4B2E9A', aura: '#D9C6FF', bow: null };
    const BELLA = { top: '#FFB4D6', belly: '#FFF0F6', muzzle: '#FFF3F8', mane: ['#2BD4C2', '#4FB8FF', '#7CF0C8', '#2BD4C2', '#4FB8FF', '#7CF0C8'], horn: '#FFE27A', wingA: '#FFFFFF', wingB: '#FFB0D6', wingC: '#2BD4C2', ear: '#FF8FC0', line: '#8A2E66', aura: '#FFC4DF', bow: '#FF4F95' };

    function wingShape() {
        const s = new T.Shape();
        s.moveTo(0, 0.1);
        s.bezierCurveTo(0.6, 0.8, 1.8, 1.0, 3.1, 0.5);
        s.bezierCurveTo(3.3, 0.35, 3.25, 0.05, 3.0, -0.1);
        s.quadraticCurveTo(2.9, -0.55, 2.5, -0.5);
        s.quadraticCurveTo(2.45, -0.9, 2.0, -0.85);
        s.quadraticCurveTo(1.9, -1.2, 1.4, -1.1);
        s.quadraticCurveTo(1.25, -1.4, 0.8, -1.25);
        s.quadraticCurveTo(0.5, -1.1, 0.0, -0.5);
        s.closePath();
        return s;
    }
    let wingGeoCache = null;
    function wingGeometry(cA, cB, cC) {
        if (!wingGeoCache) { wingGeoCache = new T.ExtrudeGeometry(wingShape(), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2, curveSegments: 12 }); }
        const g = wingGeoCache.clone(), pos = g.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color(cA), b = new T.Color(cB), c = new T.Color(cC), t = new T.Color();
        for (let i = 0; i < pos.count; i++) { const u = clamp(pos.getX(i) / 3.2, 0, 1); if (u < 0.5) t.copy(a).lerp(b, u * 2); else t.copy(b).lerp(c, (u - 0.5) * 2); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
        g.setAttribute('color', new T.BufferAttribute(col, 3));
        return g;
    }

    function hornGeometry() {
        return geo('horn', () => {
            const g = new T.ConeGeometry(0.17, 1.3, 20, 22, true), pos = g.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color('#FFE98A'), b = new T.Color('#FFB627'), c = new T.Color();
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), th = Math.atan2(z, x), k = 1 + 0.16 * Math.cos(4 * th - y * 9), t = (y + 0.65) / 1.3;
                pos.setX(i, x * k); pos.setZ(i, z * k); c.copy(b).lerp(a, t); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
            }
            g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
            return g;
        });
    }

    function buildUnicorn(P) {
        P = P || LUNA;
        const root = new T.Group(), body = new T.Group(); root.add(body);
        const parts = { tail: [], mane: [], wings: [], legs: [] };
        const skin = toon('#FFFFFF', { vertexColors: true, emissive: new T.Color(P.top).multiplyScalar(0.08) });
        const OL = P.line;

        // Torso, chest and neck
        const torso = mesh(gradGeo(sph(1, 28, 20), P.top, P.belly, -0.75, 0.55), skin, 0, 0, 0.1); torso.scale.set(0.92, 0.8, 1.3); body.add(outlined(torso, 0.085, OL));
        const chest = mesh(gradGeo(sph(0.8, 22, 16), P.top, P.belly, -0.6, 0.5), skin, 0, 0.05, -0.85); body.add(outlined(chest, 0.095, OL));
        const neck = mesh(gradGeo(geo('neck', () => new T.CylinderGeometry(0.42, 0.64, 1.4, 16)), P.top, P.belly, -0.7, 0.7), skin, 0, 0.85, -1.15); neck.rotation.x = -0.62; body.add(outlined(neck, 0.095, OL));

        // Head
        const head = new T.Group(); head.position.set(0, 1.55, -1.85); body.add(head); parts.head = head;
        const skull = mesh(gradGeo(sph(0.88, 26, 20), P.top, P.belly, -0.8, 0.8), skin); skull.scale.set(1, 0.95, 1.02); head.add(outlined(skull, 0.085, OL));
        const muzzle = mesh(sph(0.52, 20, 16), toon(P.muzzle, { emissive: new T.Color(P.muzzle).multiplyScalar(0.18) }), 0, -0.3, -0.72); muzzle.scale.set(0.95, 0.8, 1.05); head.add(outlined(muzzle, 0.085, OL));
        [-1, 1].forEach(s => {
            head.add(mesh(sph(0.055, 8, 6), toon('#B5679A'), s * 0.17, -0.24, -1.23));                       // nostrils
            const a = 0.62;
            const eye = mesh(geo('eye', () => new T.CircleGeometry(0.3, 28)), new T.MeshBasicMaterial({ map: eyeTexture(), transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), s * 0.47, 0.14, -0.8);
            eye.rotation.y = s > 0 ? Math.PI - a : Math.PI + a; head.add(eye);
            const blush = mesh(geo('blush', () => new T.CircleGeometry(0.17, 18)), basic('#FF7FB5', { transparent: true, opacity: 0.55 }), s * 0.69, -0.14, -0.62);
            blush.rotation.y = s > 0 ? Math.PI - 1.0 : Math.PI + 1.0; head.add(blush);
            const ear = mesh(cone(0.25, 0.68, 12), toon(P.top), s * 0.52, 0.86, -0.08); ear.rotation.z = -s * 0.3; head.add(outlined(ear, 0.085, OL));
            const inner = mesh(cone(0.14, 0.45, 10), toon(P.ear), s * 0.52, 0.82, -0.15); inner.rotation.z = -s * 0.3; head.add(inner);
        });
        const smile = mesh(geo('smile', () => new T.TorusGeometry(0.11, 0.024, 6, 14, Math.PI)), basic('#8A3A78'), 0, -0.5, -1.22); smile.rotation.z = Math.PI; head.add(smile);

        // Twisted golden horn
        const horn = new T.Group(); horn.position.set(0, 0.9, -0.6); horn.rotation.x = -0.55; head.add(horn);
        const hornMesh = mesh(hornGeometry(), toon('#FFFFFF', { vertexColors: true, emissive: '#7A5200' })); horn.add(outlined(hornMesh, 0.035, '#B3711A'));
        const tip = glow('#FFF3A8', 0.9, 0.7); tip.position.set(0, 0.72, 0); horn.add(tip); parts.hornGlow = tip;

        // Mane: flowing rainbow locks along the neck and a fluffy forelock
        const hx = [-0.34, -0.17, 0, 0.17, 0.34];
        hx.forEach((x, i) => {
            const m = lock([[x * 0.4, 2.35, -1.7], [x * 0.6, 2.3, -1.15], [x, 1.85, -0.6], [x * 1.3, 1.2, -0.2], [x * 1.5, 0.55, 0.5 + i * 0.08]], 0.26, 0.07, P.mane[i % 6], P.mane[(i + 1) % 6]);
            body.add(m); parts.mane.push(m);
        });
        [-1, 1].forEach((s, i) => { const f = lock([[0, 0.8, -0.55], [s * 0.3, 0.95, -0.85], [s * 0.6, 0.7, -1.0], [s * 0.72, 0.3, -0.95]], 0.17, 0.05, P.mane[i * 2], P.mane[i * 2 + 1]); head.add(f); });
        if (P.bow) {
            const bm = toon(P.bow, { emissive: new T.Color(P.bow).multiplyScalar(0.3) });
            [-1, 1].forEach(s => { const lobe = mesh(cone(0.24, 0.5, 12), bm, s * 0.3, 0.95, 0.15); lobe.rotation.z = -s * Math.PI / 2; head.add(outlined(lobe, 0.07, OL)); });
            head.add(mesh(sph(0.14, 10, 8), toon('#FFE680', { emissive: '#7a6a00' }), 0, 0.95, 0.15));
        }

        // Legs (folded for flying) with golden hooves
        [[-0.5, -0.45, -0.7, true], [0.5, -0.45, -0.7, true], [-0.48, -0.4, 0.85, false], [0.48, -0.4, 0.85, false]].forEach(p => {
            const hip = new T.Group(); hip.position.set(p[0], p[1], p[2]); hip.userData.front = p[3];
            const upper = mesh(cyl(0.21, 0.16, 0.6, 12), toon(P.top), 0, -0.28, 0); hip.add(outlined(upper, 0.075, OL));
            const knee = new T.Group(); knee.position.set(0, -0.56, 0); hip.add(knee); hip.userData.knee = knee;
            knee.add(outlined(mesh(cyl(0.16, 0.13, 0.55, 12), toon(P.belly), 0, -0.26, 0), 0.075, OL));
            knee.add(mesh(cyl(0.16, 0.17, 0.17, 12), toon('#FFC94D', { emissive: '#6a4a00' }), 0, -0.56, 0));
            body.add(hip); parts.legs.push(hip);
        });

        // Tail: five long rainbow locks
        for (let i = 0; i < 5; i++) {
            const x = (i - 2) * 0.16, g = new T.Group(); g.position.set(0, 0.3, 1.3);
            g.add(lock([[0, 0, 0], [x, 0.15, 1.0], [x * 1.6, -0.15, 2.0], [x * 2.2 + (i - 2) * 0.1, -0.7, 2.8], [x * 2.6, -1.35, 3.3 + i * 0.05]], 0.34, 0.07, P.mane[i % 6], P.mane[(i + 2) % 6], 26));
            body.add(g); parts.tail.push(g);
        }

        // Layered, feathered wings
        [-1, 1].forEach(s => {
            const pivot = new T.Group(); pivot.position.set(s * 0.5, 0.88, -0.15); pivot.userData.side = s;
            const sheet = new T.Group(); sheet.scale.x = s; pivot.add(sheet);
            const main = mesh(wingGeometry(P.wingA, P.wingB, P.wingC), toon('#FFFFFF', { vertexColors: true, side: T.DoubleSide, emissive: '#3a2f66' }));
            main.rotation.x = -Math.PI / 2; main.scale.set(1.12, 1.12, 1); sheet.add(outlined(main, 0.085, OL));
            const inner = mesh(wingGeometry(P.wingB, P.wingA, P.wingB), toon('#FFFFFF', { vertexColors: true, side: T.DoubleSide, emissive: '#4a3a6a' }), 0.05, 0.12, 0.08);
            inner.rotation.x = -Math.PI / 2; inner.scale.set(0.7, 0.7, 1); sheet.add(inner);
            body.add(pivot); parts.wings.push(pivot);
        });

        // Soft aura (additive, so it glows without washing the character out)
        const aura = glow(P.aura, 4.5, 0.14); aura.position.set(0, 0.5, 0); root.add(aura); parts.aura = aura;

        root.userData = { parts, body };
        return root;
    }

    /* Per-frame motion for a unicorn. opts: flap (speed), bank, pitch, boost */
    function animateUnicorn(u, t, opts) {
        const p = u.userData.parts, body = u.userData.body, o = opts || {};
        const fs = o.flap || 8, flap = Math.sin(t * fs) * (0.5 + (o.boost ? 0.15 : 0));
        p.wings.forEach(w => { const s = w.userData.side; w.rotation.z = s * (0.55 + flap); w.rotation.y = -s * (0.12 - flap * 0.16); });
        p.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 3.2 - i * 0.6) * 0.2 + (o.bank || 0) * 0.25; g.rotation.x = Math.sin(t * 2.3 + i) * 0.07 + (o.pitch || 0) * 0.8; });
        p.mane.forEach((m, i) => { m.rotation.z = Math.sin(t * 3.6 - i * 0.7) * 0.05; });
        p.legs.forEach((l, i) => {
            const k = Math.sin(t * 5 + i * 0.9) * 0.18;
            l.rotation.x = l.userData.front ? 0.75 + k : -0.55 - k;
            l.userData.knee.rotation.x = l.userData.front ? -1.35 + k * 0.6 : 0.8 - k * 0.5;
        });
        body.position.y = Math.sin(t * 2.6) * 0.12;
        p.head.rotation.x = Math.sin(t * 2.6 + 1) * 0.05 - (o.pitch || 0) * 0.5;
        p.aura.material.opacity = 0.12 + Math.sin(t * 3) * 0.03 + (o.boost ? 0.4 : 0);
        p.aura.scale.setScalar((o.boost ? 9 : 4.5) + Math.sin(t * 3) * 0.2);
        p.hornGlow.material.opacity = 0.5 + Math.sin(t * 5) * 0.2;
        u.rotation.z = -(o.bank || 0); u.rotation.x = (o.pitch || 0);
    }

    /* ── Collectibles and path markers ── */
    let starGeometry = null;
    function makeStar() {
        if (!starGeometry) {
            const s = new T.Shape(), R = 0.78, r = 0.36;
            for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R, x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
            s.closePath();
            starGeometry = new T.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3 });
            starGeometry.center();
        }
        const g = new T.Group();
        g.add(new T.Mesh(starGeometry, toon('#FFD84A', { emissive: '#D99A00' })));
        g.add(glow('#FFE68A', 3.4, 0.65));
        return g;
    }

    function makeRing(color) {
        const g = new T.Group();
        g.add(mesh(geo('ring', () => new T.TorusGeometry(3.4, 0.22, 12, 48)), basic(color)));
        g.add(mesh(geo('ringIn', () => new T.TorusGeometry(3.4, 0.55, 8, 48)), basic(color, { transparent: true, opacity: 0.2, depthWrite: false })));
        g.add(mesh(geo('disc', () => new T.CircleGeometry(3.3, 36)), basic(color, { transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })));
        const dots = new T.Group(); dots.name = 'dots';
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; dots.add(mesh(sph(0.17, 6, 6), basic('#FFFFFF'), Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0)); }
        g.add(dots);
        return g;
    }

    /* Grumpy-but-cute storm cloud */
    function makeStormCloud(scale) {
        const g = new T.Group(), c = toon('#8F86BD', { emissive: '#3E3868' }), c2 = toon('#B3ABD8', { emissive: '#52497F' });
        [[0, 0, 0, 1.5], [-1.4, -0.2, 0.1, 1.15], [1.4, -0.2, 0.1, 1.15], [-0.7, 0.8, -0.1, 1.0], [0.8, 0.75, -0.1, 1.05], [0, -0.55, 0.2, 1.1]].forEach((p, i) => g.add(mesh(sph(p[3], 14, 10), i % 2 ? c2 : c, p[0], p[1], p[2])));
        [-1, 1].forEach(s => {
            g.add(mesh(sph(0.34, 10, 8), basic('#FFFFFF'), s * 0.62, 0.25, 1.28));
            g.add(mesh(sph(0.17, 8, 6), basic('#2B1B5E'), s * 0.6, 0.2, 1.55));
            const brow = mesh(geo('brow', () => new T.BoxGeometry(0.62, 0.13, 0.12)), toon('#3A2F63'), s * 0.62, 0.7, 1.4); brow.rotation.z = s * 0.45; g.add(brow);
            g.add(mesh(sph(0.2, 8, 6), toon('#FF9EC4', { emissive: '#7a3a55' }), s * 1.05, -0.2, 1.1));
        });
        g.add(mesh(geo('mouthC', () => new T.TorusGeometry(0.2, 0.06, 6, 10, Math.PI)), toon('#3A2F63'), 0, -0.4, 1.4));
        const bolt = mesh(cone(0.28, 0.9, 4), basic('#FFE04A'), 0, -1.7, 0.2); bolt.rotation.x = Math.PI; g.add(bolt);
        g.scale.setScalar(scale || 1);
        return g;
    }

    function makeTree(h, palette) {
        const g = new T.Group(), c = palette || '#8EEBC4';
        g.add(mesh(cyl(0.9, 1.5, h, 10), toon('#C99A7B', { emissive: '#4a2f22' }), 0, h / 2, 0));
        [[0, h + 1.5, 0, 5.2], [-2.2, h - 1.8, 0.5, 3.6], [2.4, h - 1.2, -0.4, 3.4]].forEach((p, i) => g.add(mesh(sph(p[3], 14, 10), toon(i ? '#B8F2D9' : c, { emissive: new T.Color(c).multiplyScalar(0.25) }), p[0], p[1], p[2])));
        return g;
    }

    function makeMushroom(h, capColor) {
        const g = new T.Group(), cm = capColor || '#FF8FB8';
        g.add(mesh(cyl(0.9, 1.2, h, 12), toon('#FFF1E2', { emissive: '#7a6a5a' }), 0, h / 2, 0));
        const cap = mesh(geo('cap', () => new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), toon(cm, { emissive: new T.Color(cm).multiplyScalar(0.3) }), 0, h, 0); cap.scale.set(3.4, 2.2, 3.4); g.add(cap);
        [[0, 3.2, 0, 0.45], [1.8, 2.4, 0.8, 0.35], [-1.7, 2.5, 1.0, 0.38], [0.6, 2.4, -1.8, 0.33], [-0.8, 2.5, -1.7, 0.3]].forEach(p => g.add(mesh(sph(p[3], 8, 6), basic('#FFFFFF'), p[0], h + p[1] - 1.2, p[2])));
        return g;
    }

    function makeCrystal(h, color) {
        const g = new T.Group(), m = toon(color, { emissive: new T.Color(color).multiplyScalar(0.45), transparent: true, opacity: 0.94 });
        g.add(mesh(cone(1.2, h, 6), m, 0, h / 2, 0));
        const s1 = mesh(cone(0.8, h * 0.6, 5), m, 1.4, h * 0.3, 0.3); s1.rotation.z = -0.25; g.add(s1);
        const s2 = mesh(cone(0.7, h * 0.5, 5), m, -1.3, h * 0.25, -0.2); s2.rotation.z = 0.25; g.add(s2);
        return g;
    }

    function makeIsland(r) {
        const g = new T.Group();
        g.add(mesh(cyl(r, r * 0.95, 0.9, 18), toon('#B6F2C1', { emissive: '#3a6a4a' }), 0, 0, 0));
        const rock = mesh(cone(r * 0.95, r * 1.2, 12), toon('#D8B7C9', { emissive: '#503a4a' }), 0, -0.45 - r * 0.6, 0); rock.rotation.x = Math.PI; g.add(rock);
        g.add(mesh(cyl(0.2, 0.3, 1.8, 6), toon('#C99A7B'), r * 0.3, 1.3, 0));
        g.add(mesh(sph(1.1, 12, 9), toon('#FF9EC4', { emissive: '#7a3a55' }), r * 0.3, 2.7, 0));
        return g;
    }

    function makeRainbowArc(R, thick) {
        const g = new T.Group();
        ['#FF6FA5', '#FFA05A', '#FFE680', '#4FE3B0', '#4FB8FF', '#A27BFF'].forEach((c, i) => g.add(mesh(new T.TorusGeometry(R - i * thick * 0.95, thick * 0.5, 8, 48, Math.PI), basic(c))));
        return g;
    }

    function makeCastle() {
        const g = new T.Group();
        const pink = toon('#FFC9E6', { emissive: '#7a5a6a' }), white = toon('#FFFFFF', { emissive: '#7a7a8a' }), blue = toon('#7CC8FF', { emissive: '#3a5a7a' }), lil = toon('#B79BFF', { emissive: '#4a3a7a' });
        g.add(mesh(cyl(16, 20, 3, 24), toon('#FFFFFF', { emissive: '#9aa4c0' }), 0, -1.5, 0));
        g.add(mesh(new T.BoxGeometry(18, 7, 6), pink, 0, 3.5, 0));
        g.add(mesh(cyl(4.2, 4.6, 16, 18), white, 0, 8, -1));
        g.add(mesh(cone(5.2, 8, 18), lil, 0, 20, -1));
        [[-9, 12, 0], [9, 12, 0], [-6.5, 9, 3.5], [6.5, 9, 3.5]].forEach((p, i) => { g.add(mesh(cyl(1.7, 1.9, p[1], 14), i % 2 ? white : pink, p[0], p[1] / 2, p[2])); g.add(mesh(cone(2.4, 4.2, 14), i % 2 ? lil : blue, p[0], p[1] + 2.1, p[2])); });
        g.add(mesh(new T.BoxGeometry(3.2, 4.6, 0.6), toon('#7A5AF8', { emissive: '#2a1a6a' }), 0, 2.3, 3.2));
        [[-5, 6], [5, 6], [-2, 12], [2, 12], [0, 15]].forEach(p => g.add(mesh(new T.BoxGeometry(0.9, 1.5, 0.3), basic('#FFE680'), p[0], p[1], p[1] > 10 ? 3.4 : 3.1)));
        const flag = mesh(cone(0.9, 2.4, 3), toon('#FF6FA5', { emissive: '#7a1a3a' }), 1.2, 26.2, -1); flag.rotation.z = -Math.PI / 2; g.add(flag);
        g.add(mesh(cyl(0.1, 0.1, 4, 6), white, 0, 24.4, -1));
        const arc = makeRainbowArc(26, 2.2); arc.position.set(0, 2, -9); g.add(arc);
        return g;
    }

    function makeBubble(r) {
        const g = new T.Group();
        g.add(mesh(sph(r, 28, 18), basic('#BFE8FF', { transparent: true, opacity: 0.2, depthWrite: false })));
        g.add(mesh(sph(r * 1.02, 28, 18), basic('#FFFFFF', { transparent: true, opacity: 0.16, depthWrite: false, side: T.BackSide })));
        const hl = mesh(sph(r * 0.16, 8, 6), basic('#FFFFFF', { transparent: true, opacity: 0.9 }), -r * 0.45, r * 0.5, r * 0.6); hl.scale.set(1.6, 0.8, 0.6); g.add(hl);
        return g;
    }

    /* ── Candy Land ── */
    const texCache = {};
    function swirlTexture(a, b) {
        const k = 'sw' + a + b; if (texCache[k]) return texCache[k];
        const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
        g.fillStyle = a; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = b; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath();
        for (let t = 0; t < 6 * Math.PI; t += 0.1) { const r = 6 + t * 6.2, x = 128 + Math.cos(t) * r, y = 128 + Math.sin(t) * r; if (t === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 122, 0, 6.283); g.stroke();
        return (texCache[k] = new T.CanvasTexture(c));
    }
    function stripeTexture(a, b) {
        const k = 'st' + a + b; if (texCache[k]) return texCache[k];
        const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
        g.fillStyle = a; g.fillRect(0, 0, 64, 128); g.fillStyle = b;
        for (let i = -1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(64, i * 32 - 22); g.lineTo(64, i * 32 + 2); g.lineTo(0, i * 32 + 24); g.closePath(); g.fill(); }
        const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return (texCache[k] = t);
    }
    const CANDY = [['#FF6FA5', '#FFFFFF'], ['#4FE3B0', '#FFFFFF'], ['#A27BFF', '#FFE680'], ['#4FB8FF', '#FFFFFF']];

    function makeLollipop(h, idx) {
        const g = new T.Group(), c = CANDY[(idx || 0) % CANDY.length];
        g.add(mesh(cyl(0.4, 0.4, h, 10), toon('#FFFFFF', { emissive: '#8a8a9a' }), 0, h / 2, 0));
        const tex = swirlTexture(c[0], c[1]);
        const face = new T.MeshToonMaterial({ map: tex, gradientMap: toonGradient(), emissive: new T.Color('#554466') });
        const head = new T.Mesh(geo('lolliHead', () => new T.CylinderGeometry(4.2, 4.2, 1.0, 40)), [toon('#FFFFFF', { emissive: '#99909a' }), face, face]);
        head.rotation.x = Math.PI / 2; head.position.set(0, h + 3.6, 0); g.add(head);
        g.add(mesh(geo('bowT', () => new T.TorusGeometry(0.9, 0.22, 8, 16)), toon('#FF6FA5', { emissive: '#7a1a3a' }), 0, h * 0.82, 0));
        return g;
    }

    function makeCandyCane(h) {
        const g = new T.Group();
        const tex = stripeTexture('#FFFFFF', '#FF4F7D');
        const m = new T.MeshToonMaterial({ map: tex, gradientMap: toonGradient(), emissive: new T.Color('#663344') });
        g.add(mesh(geo('cane' + h, () => new T.CylinderGeometry(0.95, 0.95, h, 14)), m, 0, h / 2, 0));
        g.add(mesh(geo('caneHook', () => new T.TorusGeometry(2.2, 0.95, 12, 22, Math.PI)), m, 2.2, h, 0));
        return g;
    }

    function makeDonut(r) {
        const g = new T.Group();
        const dough = mesh(geo('dough', () => new T.TorusGeometry(1, 0.46, 14, 30)), toon('#E3A765', { emissive: '#5a3a1a' })); dough.scale.setScalar(r);
        const frost = mesh(geo('frost', () => new T.TorusGeometry(1, 0.5, 14, 30)), toon('#FF8FC0', { emissive: '#7a2a55' })); frost.scale.set(r * 1.02, r * 1.02, r * 0.62); frost.position.z = r * 0.14;
        g.add(dough); g.add(frost);
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = r * (0.82 + (i % 3) * 0.16); const sp = mesh(geo('spr', () => new T.BoxGeometry(0.34, 0.1, 0.1)), basic(RAINBOW[i % 6]), Math.cos(a) * rr, Math.sin(a) * rr, r * 0.58); sp.rotation.z = a + 1; g.add(sp); }
        g.rotation.x = -1.15;
        const holder = new T.Group(); holder.add(g); return holder;
    }

    function makeCupcake(h) {
        const g = new T.Group();
        g.add(mesh(cyl(2.6, 1.9, h, 16), toon('#FFD7A8', { emissive: '#6a4a2a' }), 0, h / 2, 0));
        [[2.9, 0.0, '#FF8FC0'], [2.3, 1.5, '#FFB3D6'], [1.6, 2.8, '#FF8FC0']].forEach(p => { const f = mesh(sph(1, 16, 10), toon(p[2], { emissive: '#7a2a55' }), 0, h + p[1], 0); f.scale.set(p[0], p[0] * 0.62, p[0]); g.add(f); });
        g.add(mesh(sph(0.7, 10, 8), toon('#FF3355', { emissive: '#661122' }), 0, h + 4.2, 0));
        return g;
    }

    /* The "clue" Luna finds at the end of a level */
    function makeClue(kind) {
        const g = new T.Group();
        if (kind === 'ribbon') {
            const m = toon('#FF6FA5', { emissive: '#8a1f48' });
            [-1, 1].forEach(s => { const lobe = mesh(cone(0.9, 1.7, 14), m, s * 0.85, 0, 0); lobe.rotation.z = -s * Math.PI / 2; g.add(lobe); });
            g.add(mesh(sph(0.5, 12, 9), toon('#FFB8D6', { emissive: '#8a4a68' })));
            [-1, 1].forEach(s => { const tail = mesh(cone(0.4, 1.8, 8), m, s * 0.5, -1.1, 0); tail.rotation.z = s * 0.35; tail.rotation.x = Math.PI; g.add(tail); });
        } else if (kind === 'feather') {
            const f = mesh(sph(1, 14, 10), toon('#FFC4E0', { emissive: '#8a4a68' })); f.scale.set(0.55, 1.7, 0.12); g.add(f);
            g.add(mesh(cyl(0.05, 0.05, 3.4, 6), toon('#FFFFFF'), 0, 0, 0.05));
        } else if (kind === 'lollipop') {
            const l = makeLollipop(2.2, 0); l.scale.setScalar(0.42); l.position.y = -1.6; g.add(l);
        } else if (kind === 'gem') {
            g.add(mesh(geo('oct', () => new T.OctahedronGeometry(1.2, 0)), toon('#8FD3FF', { emissive: '#2f6f9f', transparent: true, opacity: 0.95 })));
        } else if (kind === 'castle') {
            return makeCastle();
        }
        g.add(glow('#FFF0A8', 7, 0.7));
        return g;
    }

    function makeBeam(color, opacity, radius) {
        const r = radius || 1.6;
        return mesh(geo('beam' + r, () => new T.CylinderGeometry(r, r, 90, 20, 1, true)), basic(color, { transparent: true, opacity: opacity || 0.16, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }), 0, 43, 0);
    }

    RK.Models = { T, glowTexture, mat, basic, toon, geo, sph, cone, cyl, mesh, glow, RAINBOW, LUNA, BELLA, buildUnicorn, animateUnicorn, makeStar, makeRing, makeStormCloud, makeTree, makeMushroom, makeCrystal, makeIsland, makeRainbowArc, makeCastle, makeBubble, makeClue, makeBeam, makeLollipop, makeCandyCane, makeDonut, makeCupcake, CANDY, swirlTexture, stripeTexture };
})();
