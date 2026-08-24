(function () {
  'use strict';

  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');

  var W, H;
  var triangles = [];

  var COUNT = 110;
  var COLOR = '170, 199, 255'; // matches --m3-primary in RGB

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Spawns a triangle just off one of the four screen edges, travelling
   * inward on a slight diagonal so it drifts across the viewport.
   */
  function spawnTriangle() {
    var edge = pick(['top', 'right', 'bottom', 'left']);
    var size = rand(10, 64); // varying sizes
    var x, y, vx, vy;
    var margin = size * 1.5;

    if (edge === 'top') {
      x = rand(0, W);
      y = -margin;
      vx = rand(-0.25, 0.25);
      vy = rand(0.15, 0.5);
    } else if (edge === 'bottom') {
      x = rand(0, W);
      y = H + margin;
      vx = rand(-0.25, 0.25);
      vy = rand(-0.5, -0.15);
    } else if (edge === 'left') {
      x = -margin;
      y = rand(0, H);
      vx = rand(0.15, 0.5);
      vy = rand(-0.25, 0.25);
    } else {
      x = W + margin;
      y = rand(0, H);
      vx = rand(-0.5, -0.15);
      vy = rand(-0.25, 0.25);
    }

    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: size,
      edge: edge,
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.006, 0.006),
      alpha: rand(0.22, 0.75),
      life: 0,
      maxLife: rand(600, 1400) // frames before recycling, prevents mid-screen pileup
    };
  }

  function init() {
    resize();
    triangles = [];
    for (var i = 0; i < COUNT; i++) {
      var t = spawnTriangle();
      // scatter initial life so they don't all recycle in sync
      t.life = rand(0, t.maxLife);
      triangles.push(t);
    }
  }

  function outOfBounds(t) {
    var pad = t.size * 2;
    return t.x < -pad || t.x > W + pad || t.y < -pad || t.y > H + pad;
  }

  function updateTriangle(t, i) {
    t.x += t.vx;
    t.y += t.vy;
    t.rotation += t.rotationSpeed;
    t.life += 1;

    if (t.life > t.maxLife || outOfBounds(t)) {
      triangles[i] = spawnTriangle();
    }
  }

  function drawTriangle(t) {
    var s = t.size;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rotation);

    ctx.beginPath();
    ctx.moveTo(0, -s / 2);
    ctx.lineTo(s / 2, s / 2);
    ctx.lineTo(-s / 2, s / 2);
    ctx.closePath();

    ctx.strokeStyle = 'rgba(' + COLOR + ', ' + t.alpha + ')';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // fill for larger triangles so they read as solid shapes, not just outlines
    if (s > 24) {
      ctx.fillStyle = 'rgba(' + COLOR + ', ' + (t.alpha * 0.28) + ')';
      ctx.fill();
    }

    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < triangles.length; i++) {
      updateTriangle(triangles[i], i);
      drawTriangle(triangles[i]);
    }

    requestAnimationFrame(frame);
  }

  function start() {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  init();
  start();
})();
