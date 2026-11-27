/* Rainbow Kingdom — cinematic environment: sky dome with sun and haze, real terrain with mountains and rivers, drifting particles. */
(function () {
    'use strict';
    const T = window.THREE, RK = window.RK = window.RK || {};

    /* Small, fast value noise */
    const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
    function vnoise(x, z) {
        const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
        const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.17;
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    /* ── Sky dome: gradient, sun, glow, haze band and wispy high clouds ── */
    const SKY_VS = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
    const SKY_FS = [
        'uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cHor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float time; varying vec3 vDir;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }',
        'void main(){',
        '  vec3 d = normalize(vDir); float h = d.y;',
        '  vec3 col = mix(cHor, cMid, smoothstep(-0.02, 0.28, h));',
        '  col = mix(col, cTop, smoothstep(0.22, 0.9, h));',
        '  col = mix(col, cHor, smoothstep(0.0, -0.25, h));',
        '  float s = max(dot(d, normalize(sunDir)), 0.0);',
        '  col += sunCol * (pow(s, 900.0) * 2.0 + pow(s, 60.0) * 0.45 + pow(s, 7.0) * 0.16);',
        '  vec2 uv = d.xz / (abs(d.y) + 0.42) * 1.5 + vec2(time * 0.012, 0.0);',
        '  float c = noise(uv * 2.0) * 0.6 + noise(uv * 5.0) * 0.3 + noise(uv * 11.0) * 0.1;',
        '  c = smoothstep(0.55, 0.95, c) * smoothstep(0.03, 0.4, h);',
        '  col = mix(col, vec3(1.0), c * 0.38);',
        '  col += (1.0 - smoothstep(0.0, 0.18, abs(h))) * cHor * 0.18;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    function makeSky(L) {
        const c = L.sky, sun = L.sun || [0.25, 0.5, -0.8];
        const mat = new T.ShaderMaterial({
            vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false,
            uniforms: { cTop: { value: new T.Color(c[0]) }, cMid: { value: new T.Color(c[1]) }, cHor: { value: new T.Color(c[2]) }, sunDir: { value: new T.Vector3(sun[0], sun[1], sun[2]).normalize() }, sunCol: { value: new T.Color(L.sunColor || '#FFF3C4') }, time: { value: 0 } }
        });
        const m = new T.Mesh(new T.SphereGeometry(420, 32, 18), mat);
        m.frustumCulled = false; m.renderOrder = -10;
        return m;
    }

    /* ── Terrain: a flat flight valley with mountains rising on both sides, plus an optional river ── */
    function makeTerrain(L, gy, len) {
        const lane = L.xr + 16, T0 = L.terrain || {}, amp = T0.amp || 60;
        const river = T0.river ? { w: T0.river.width || 9, amp: T0.river.amp || 26, color: T0.river.color || '#8FD3FF' } : null;
        const riverX = z => river ? river.amp * Math.sin(z / 150 + 1.2) : 0;
        const hAt = (x, z) => {
            const mount = smooth(lane, lane + 130, Math.abs(x));
            let h = mount * (10 + amp * fbm(x * 0.0065 + 3.1, z * 0.0065 + 7.7)) + (1 - mount) * (fbm(x * 0.045, z * 0.045) - 0.5) * 0.5;
            if (river) h -= smooth(river.w * 1.9, river.w * 0.45, Math.abs(x - riverX(z))) * 1.8 * (1 - mount);
            return h;
        };
        const zStart = 260, zEnd = -(len + 760), D = zStart - zEnd, W = 760, sx = 76, sz = Math.ceil(D / 10);
        const g = new T.PlaneGeometry(W, D, sx, sz); g.rotateX(-Math.PI / 2); g.translate(0, 0, (zStart + zEnd) / 2);
        const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
        const cLow = new T.Color(T0.low || '#9FE8B5'), cMid = new T.Color(T0.mid || '#6FD6A0'), cHigh = new T.Color(T0.high || '#9AB0F0'), cCap = new T.Color(T0.cap || '#FFFFFF'), cBank = new T.Color(T0.bank || '#E8D3A8'), c = new T.Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), h = hAt(x, z);
            pos.setY(i, gy + h);
            const mount = smooth(lane, lane + 130, Math.abs(x));
            c.copy(cLow).lerp(cMid, smooth(0.35, 0.75, fbm(x * 0.03, z * 0.03)));
            c.lerp(cHigh, smooth(0, 0.85, mount));
            c.lerp(cCap, smooth(T0.capH || 52, (T0.capH || 52) + 16, h));
            if (river && h < -0.4) c.lerp(cBank, 0.55);
            const shade = 0.88 + 0.2 * fbm(x * 0.12, z * 0.12);
            col[i * 3] = c.r * shade; col[i * 3 + 1] = c.g * shade; col[i * 3 + 2] = c.b * shade;
        }
        g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
        const mesh = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, emissive: new T.Color(T0.glow || '#3d3a55') }));
        mesh.frustumCulled = false;
        const out = { mesh, hAt, river: null };
        if (river) {
            const n = Math.ceil(D / 8), verts = new Float32Array((n + 1) * 2 * 3), idx = [];
            for (let i = 0; i <= n; i++) { const z = zStart - i * 8, x = riverX(z); verts.set([x - river.w, gy - 0.5, z, x + river.w, gy - 0.5, z], i * 6); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
            const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(verts, 3)); rg.setIndex(idx); rg.computeVertexNormals();
            const rm = new T.Mesh(rg, new T.MeshLambertMaterial({ color: new T.Color(river.color), emissive: new T.Color(river.color).multiplyScalar(0.45), transparent: true, opacity: 0.93 }));
            rm.frustumCulled = false; out.river = rm;
        }
        return out;
    }

    /* ── Drifting ambient particles: fireflies, sprinkles, sparkles ── */
    function makeAmbient(colors, count) {
        count = count || 140;
        const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), c = new T.Color();
        for (let i = 0; i < count; i++) { c.set(colors[i % colors.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
        const pts = new T.Points(g, new T.PointsMaterial({ size: 0.6, map: RK.Models.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, opacity: 0.85 }));
        pts.frustumCulled = false;
        const ph = new Float32Array(count); let init = false;
        return {
            points: pts,
            update(t, lx, ly, lz) {
                for (let i = 0; i < count; i++) {
                    if (!init || pos[i * 3 + 2] > lz + 16) { pos[i * 3] = lx + (Math.random() - 0.5) * 80; pos[i * 3 + 1] = ly + (Math.random() - 0.4) * 40; pos[i * 3 + 2] = lz - Math.random() * (init ? 20 : 130) - (init ? 90 : 0); ph[i] = Math.random() * 6.28; }
                    pos[i * 3 + 1] += Math.sin(t * 0.8 + ph[i]) * 0.012; pos[i * 3] += Math.cos(t * 0.6 + ph[i]) * 0.012;
                }
                init = true; g.attributes.position.needsUpdate = true;
            }
        };
    }

    RK.Env = { fbm, smooth, makeSky, makeTerrain, makeAmbient };
})();
