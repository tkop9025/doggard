// Utility: compile a shader
function compileShader(gl, src, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

(function () {
  const canvas = document.getElementById("glCanvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert("WebGL not supported");
    return;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  const modeSelect = document.getElementById("modeSelect");
  const zoomSlider = document.getElementById("zoomSpeed");

  // Vertex shader: full-screen quad
  const vs = `
    attribute vec2 pos;
    void main() {
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `;

  // Fragment shader: Mandelbrot / Julia / Burning Ship controlled via u_mode
  const fs = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform float u_zoom;
    uniform float u_time;

    uniform int u_mode;    // 0 = Mandelbrot, 1 = Julia, 2 = Burning Ship
    uniform vec2 u_juliaC; // only used when mode == 1

    const int MAX_ITER = 200;

    vec3 palette(float t) {
      // cosine-based palette; shift with time
      return vec3(
        0.5 + 0.5 * cos(6.2831 * (0.30 * t + 0.00)),
        0.5 + 0.5 * cos(6.2831 * (0.30 * t + 0.25)),
        0.5 + 0.5 * cos(6.2831 * (0.30 * t + 0.50))
      );
    }

    void main() {
      // Normalize coordinates, preserving aspect using height
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
      vec2 plane = uv / u_zoom + u_center;

      vec2 z;
      vec2 c;

      if (u_mode == 1) {
        // Julia: z starts at plane coord, c is constant
        z = plane;
        c = u_juliaC;
      } else {
        // Mandelbrot / Burning Ship: z starts at 0, c is plane coord
        z = vec2(0.0);
        c = plane;
      }

      float iterFloat = 0.0;

      for (int n = 0; n < MAX_ITER; n++) {
        vec2 zWork = z;

        if (u_mode == 2) {
          // Burning Ship: use abs components
          zWork = vec2(abs(zWork.x), abs(zWork.y));
        }

        float x = zWork.x * zWork.x - zWork.y * zWork.y + c.x;
        float y = 2.0 * zWork.x * zWork.y + c.y;

        if (x * x + y * y > 4.0) {
          iterFloat = float(n);
          break;
        }

        z = vec2(x, y);
        iterFloat = float(n);
      }

      float t = iterFloat / float(MAX_ITER);

      vec3 col;
      if (iterFloat >= float(MAX_ITER - 1)) {
        col = vec3(0.0);
      } else {
        // palette shift over time for some life
        col = palette(t + u_time * 0.04);
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, vs, gl.VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // Full-screen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );
  const posLoc = gl.getAttribLocation(program, "pos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_center = gl.getUniformLocation(program, "u_center");
  const u_zoom = gl.getUniformLocation(program, "u_zoom");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mode = gl.getUniformLocation(program, "u_mode");
  const u_juliaC = gl.getUniformLocation(program, "u_juliaC");

  // -------- Per-mode waypoints (cool places) --------

  // For each mode, waypoints have:
  // { cx, cy, zoom, dwellMs }
  const WAYPOINTS = {
    mandelbrot: [
      { cx: -0.5,        cy:  0.0,        zoom: 1.2,  dwell: 6000 },
      { cx: -0.7435,     cy:  0.1314,     zoom: 40.0, dwell: 8000 },
      { cx: -0.761574,   cy: -0.0847596,  zoom: 60.0, dwell: 8000 },
      { cx: -1.25066,    cy:  0.02012,    zoom: 50.0, dwell: 8000 },
      { cx:  0.0016437,  cy: -0.8224676,  zoom: 80.0, dwell: 9000 }
    ],
    julia: [
      // For Julia, center doesn't matter as much, but we can still pan around
      { cx: 0.0,   cy: 0.0,   zoom: 1.0,  dwell: 6000 },
      { cx: -0.3,  cy: 0.3,   zoom: 20.0, dwell: 8000 },
      { cx: 0.3,   cy: -0.3,  zoom: 25.0, dwell: 8000 }
    ],
    burning: [
      { cx: -1.7, cy: -0.02, zoom: 1.1,  dwell: 6000 },
      { cx: -1.8, cy:  0.01, zoom: 35.0, dwell: 9000 },
      { cx: -1.75,cy: -0.02, zoom: 60.0, dwell: 9000 }
    ]
  };

  // Some nice Julia parameters to blend through
  const JULIA_PARAMS = [
    { cx: -0.8,   cy:  0.156 },
    { cx:  0.285, cy:  0.01  },
    { cx: -0.4,   cy:  0.6   },
    { cx:  0.355, cy:  0.355 }
  ];
  let juliaIndex = 0;
  let juliaC = { cx: JULIA_PARAMS[0].cx, cy: JULIA_PARAMS[0].cy };

  // Camera state
  let currentMode = "mandelbrot";
  let waypointIndex = 0;

  let centerX = WAYPOINTS[currentMode][0].cx;
  let centerY = WAYPOINTS[currentMode][0].cy;
  let zoom = WAYPOINTS[currentMode][0].zoom;

  let targetCenterX = centerX;
  let targetCenterY = centerY;
  let targetZoom = zoom;

  let waypointStartTime = performance.now();
  const startTime = performance.now();

  function switchMode(newMode) {
    if (!WAYPOINTS[newMode]) return;
    currentMode = newMode;
    waypointIndex = 0;

    const wp = WAYPOINTS[currentMode][0];
    targetCenterX = centerX = wp.cx;
    targetCenterY = centerY = wp.cy;
    targetZoom = zoom = wp.zoom;

    waypointStartTime = performance.now();
  }

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      switchMode(modeSelect.value);
    });
  }

  function advanceWaypoint() {
    const wps = WAYPOINTS[currentMode];
    waypointIndex = (waypointIndex + 1) % wps.length;
    const wp = wps[waypointIndex];

    targetCenterX = wp.cx;
    targetCenterY = wp.cy;
    targetZoom = wp.zoom;
    waypointStartTime = performance.now();

    if (currentMode === "julia") {
      // slowly change Julia parameter at each waypoint
      juliaIndex = (juliaIndex + 1) % JULIA_PARAMS.length;
      juliaC = {
        cx: JULIA_PARAMS[juliaIndex].cx,
        cy: JULIA_PARAMS[juliaIndex].cy
      };
    }
  }

  function getModeInt() {
    switch (currentMode) {
      case "mandelbrot": return 0;
      case "julia":      return 1;
      case "burning":    return 2;
      default:           return 0;
    }
  }

  function render() {
    const now = performance.now();
    const t = (now - startTime) / 1000.0;

    // Speed factor from slider (0.5x .. 2x)
    const speedMul = zoomSlider ? parseFloat(zoomSlider.value) || 1.0 : 1.0;

    // Smoothly interpolate center & zoom toward target
    const baseLerp = 0.05;
    const lerp = baseLerp * speedMul;

    centerX += (targetCenterX - centerX) * lerp;
    centerY += (targetCenterY - centerY) * lerp;
    zoom    += (targetZoom    - zoom)    * lerp;

    // When we've spent enough time at this waypoint, or we're close enough to target, move on
    const wps = WAYPOINTS[currentMode];
    const wp = wps[waypointIndex];
    const dwellMs = wp.dwell / speedMul;
    const timeHere = now - waypointStartTime;

    const centerClose =
      Math.abs(centerX - targetCenterX) < 0.002 &&
      Math.abs(centerY - targetCenterY) < 0.002;
    const zoomClose = Math.abs(zoom - targetZoom) < 0.01;

    if ((centerClose && zoomClose && timeHere > dwellMs * 0.5) ||
        timeHere > dwellMs) {
      advanceWaypoint();
    }

    // Set uniforms
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform2f(u_center, centerX, centerY);
    gl.uniform1f(u_zoom, zoom);
    gl.uniform1f(u_time, t);
    gl.uniform1i(u_mode, getModeInt());
    gl.uniform2f(u_juliaC, juliaC.cx, juliaC.cy);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  // Start in Mandelbrot mode
  switchMode("mandelbrot");
  render();
})();
