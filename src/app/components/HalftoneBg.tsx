"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uCell;
uniform vec3  uSplit;
uniform float uIntro;
uniform vec3  uClicks[8];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + 17.3;
    a *= 0.5;
  }
  return v;
}

float field(vec2 uv, float t) {
  vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.05)),
                fbm(uv + vec2(5.2, 1.3) - t * 0.04));
  float n = fbm(uv + 2.2 * q + vec2(t * 0.03, -t * 0.02));
  n = clamp((n - 0.5) * 2.2 + 0.5, 0.0, 1.0);
  float ridge = 1.0 - abs(2.0 * n - 1.0);
  return smoothstep(0.86, 0.995, ridge);
}

void main() {
  vec2 frag   = gl_FragCoord.xy;
  vec2 cell   = floor(frag / uCell);
  vec2 center = (cell + 0.5) * uCell;

  vec2 uv = center / uRes.y * 1.6;

  float shock = 0.0;
  vec2  part  = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    vec3  c     = uClicks[i];
    vec2  delta = center - c.xy;
    float dc    = length(delta) / uRes.y;
    float band  = (dc - c.z * 0.8) * 18.0;
    float ring  = exp(-band * band) * exp(-c.z * 1.5);
    shock += ring;

    float env  = (1.0 - exp(-c.z * 12.0)) * exp(-c.z * uSplit.z) / 0.7;
    float near = exp(-dc * dc / (2.0 * uSplit.x * uSplit.x));
    part += (delta / uRes.y) * 1.6 * near * env * uSplit.y;
  }

  float b = field(uv - part, uTime);

  vec2 sp = frag / uRes - 0.5;
  sp.x *= uRes.x / uRes.y;
  b *= mix(0.35, 1.0, smoothstep(0.15, 0.8, length(sp)));

  float d = length(center - uMouse) / uRes.y;
  b += 0.7 * exp(-d * d * 30.0);

  b += shock;
  b = clamp(b, 0.0, 1.0);

  float radius = uCell * (0.07 + 0.45 * b);
  float dist   = length(frag - center);
  float mask   = 1.0 - smoothstep(radius - 1.0, radius + 1.0, dist);

  vec3 lo  = vec3(0.22, 0.16, 0.62);
  vec3 hi  = vec3(0.78, 0.74, 1.00);
  vec3 col = mix(lo, hi, smoothstep(0.2, 0.9, b));
  col *= mix(0.35, 1.0, b);
  col *= 0.7;

  vec2  o      = (frag / uRes - vec2(0.5, 0.82)) * vec2(uRes.x / uRes.y, 1.0);
  float reveal = smoothstep(0.0, 0.4, uIntro * 2.4 - length(o));

  vec3 bg = vec3(0.0235, 0.0235, 0.0392);
  gl_FragColor = vec4(bg + col * mask * reveal, 1.0);
}
`;

const CELL = 8;
const SPEED = 1;
const INTRO_MS = 2800;
const MAX_DT = 33;

const SPLIT_RADIUS = 0.3;
const SPLIT_STRENGTH = 0.45;
const SPLIT_FADE = 1.2;

export default function HalftoneBg({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    };

    const parallel = gl.getExtension("KHR_parallel_shader_compile");

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uCell = gl.getUniformLocation(prog, "uCell");
    const uClicks = gl.getUniformLocation(prog, "uClicks");
    const uSplit = gl.getUniformLocation(prog, "uSplit");
    const uIntro = gl.getUniformLocation(prog, "uIntro");

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let tx = -99999, ty = -99999, mx = tx, my = ty;
    let seen = false;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      tx = (e.clientX - r.left) * dpr;
      ty = (r.height - (e.clientY - r.top)) * dpr;
      if (!seen) { mx = tx; my = ty; seen = true; }
    };
    window.addEventListener("pointermove", onMove);

    const MAX_WAVES = 8;
    const waves = Array.from({ length: MAX_WAVES }, () => ({ x: -99999, y: -99999, at: -1e9 }));
    const waveData = new Float32Array(MAX_WAVES * 3);
    let next = 0;
    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      waves[next] = {
        x: (e.clientX - r.left) * dpr,
        y: (r.height - (e.clientY - r.top)) * dpr,
        at: performance.now(),
      };
      next = (next + 1) % MAX_WAVES;
    };
    window.addEventListener("pointerdown", onDown);

    const onWave = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const r = canvas.getBoundingClientRect();
      waves[next] = {
        x: (x - r.left) * dpr,
        y: (r.height - (y - r.top)) * dpr,
        at: performance.now(),
      };
      next = (next + 1) % MAX_WAVES;
    };
    window.addEventListener("halftone:wave", onWave);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;

    const render = (now: number, intro: number) => {
      const t = reduce ? 20 : ((now - t0) / 1000) * SPEED + 20;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform3f(uSplit, SPLIT_RADIUS, SPLIT_STRENGTH, SPLIT_FADE);
      gl.uniform1f(uIntro, intro);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uCell, CELL * dpr);
      waves.forEach((w, i) => {
        waveData[i * 3] = w.x;
        waveData[i * 3 + 1] = w.y;
        waveData[i * 3 + 2] = Math.min(Math.max((now - w.at) / 1000, 0), 99);
      });
      gl.uniform3fv(uClicks, waveData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let stage: 0 | 1 | 2 = 0;
    let last = 0;
    let introElapsed = 0;

    const draw = (now: number) => {
      if (stage === 0) {
        const compiled = !parallel || gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR);
        if (compiled) {
          render(now, 0);
          gl.finish();
          stage = 1;
        }
        raf = requestAnimationFrame(draw);
        return;
      }

      if (stage === 1) {
        last = now;
        stage = 2;
      }

      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;

      introElapsed += Math.min(Math.max(now - last, 0), MAX_DT);
      last = now;
      const ip = Math.min(introElapsed / INTRO_MS, 1);
      const intro = reduce ? 1 : 1 - Math.pow(1 - ip, 3);

      render(now, intro);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("halftone:wave", onWave);
    };
  }, []);

  return <canvas ref={ref} className={`block h-full w-full bg-[#06060a] ${className}`} />;
}
