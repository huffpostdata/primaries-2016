var Interjections = [
  'All right!',
  'Bam!',
  'Behold!',
  'Faster!',
  'Giddyup!',
  'Golly!',
  'Go go go!',
  'Ha-ha!',
  'Hey now!',
  'Hooray!',
  'Hot dog!',
  'Howdy!',
  'Hurrah!',
  'Huzzah!',
  'Onwards!',
  'Whoa!',
  'Whoopee!',
  'Yahoo!',
  'Yay!',
  'Yeah!',
  'Yee-haw!',
  'Yes!',
  'Yippee!'
];

var last_interjection_index = Interjections.length - 1;
function next_interjection() {
  last_interjection_index += 1;

  if (last_interjection_index === Interjections.length) {
    last_interjection_index = 0;

    // Fisher-Yates shuffle
    for (var i = Interjections.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = Interjections[i];
      Interjections[i] = Interjections[j];
      Interjections[j] = x;
    }
  }

  return Interjections[last_interjection_index];
}

/**
 * Builds a transform for race i of n.
 *
 * Assumes:
 *
 * * input is 1000,1000
 * * output is 25x25px
 * * races should be centered in an area with width `w`
 * * this race is number `i` of `n`
 */
function build_race_transform_matrix(i, n, w) {
  var StateWidth = 25; // px

  return [
    StateWidth / 1000,
    0,
    0,
    StateWidth / 1000,
    Math.round(w / 2 - n * StateWidth / 2 + i * StateWidth) + 1, // 1 for left border
    50
  ];
}

function draw_path(ctx, path) {
  var x, y, dx, dy, match;

  ctx.beginPath();

  var regex = /([MlvhZ ])(?:(-?\d+)(?:,(-?\d+))?)?/g;
  while ((match = regex.exec(path)) != null) {
    switch (match[1]) {
      case 'M':
        x = parseInt(match[2], 10);
        y = parseInt(match[3], 10);
        ctx.moveTo(x, y);
        break;
      case 'l':
      case ' ':
        dx = parseInt(match[2], 10);
        dy = parseInt(match[3], 10);
        x += dx;
        y += dy;
        ctx.lineTo(x, y);
        break;
      case 'v':
        dy = parseInt(match[2], 10);
        y += dy;
        ctx.lineTo(x, y);
        break;
      case 'h':
        dx = parseInt(match[2], 10);
        x += dx;
        ctx.lineTo(x, y);
        break;
      case 'Z':
        ctx.closePath();
        // This changes x and y, but we don't care: if there's another
        // instruction, it's an 'M'.
        break;
    }
  }

  ctx.stroke();
}

function build_canvas(parent_div) {
  var w = parent_div.offsetWidth;
  var h = parent_div.offsetHeight - parent_div.querySelector('div.race-days').offsetTop;

  var canvas = document.createElement('canvas');
  canvas.mozImageSmoothingEnabled = false;
  canvas.msImageSmoothingEnabled = false;
  canvas.webkitImageSmoothingEnabled = false;
  canvas.imageSmoothingEnabled = false;
  canvas.width = w;
  canvas.height = h;

  parent_div.appendChild(canvas);

  return canvas;
}

/**
 * Animating one race day means:
 *
 * 1. Showing all the states
 * 2. Turning the states into dots
 * 3. Moving dots to candidate holes and moving horses
 */
function StepAnimation(horse_race, step) {
  this.horse_race = horse_race;
  this.step = step;
  this.ended = false;

  this.race_day = horse_race.data.race_days[step.step_number];
  this.n_delegates = step.n_delegates;

  var m = step.candidate_n_delegates_map;
  horse_race.candidates.forEach(function(candidate) {
    candidate.n_delegates_start = m[candidate.id].n_delegates_start;
    candidate.n_delegates_end = m[candidate.id].n_delegates_end;
  });

  this.candidates = horse_race.candidates;
}

StepAnimation.prototype.start = function() {
  if (this.n_delegates == 0) {
    this.end();
  } else {
    this.wait_to_show_states();
  }
};

/**
 * Calls step(t) repeatedly, then next_step().
 *
 * t is always between 0 to 1. It represents time, for animation functions.
 */
StepAnimation.prototype.animate_step = function(duration, step, next_step) {
  if (this.ended) return;

  var t1 = new Date();
  var _this = this;

  function do_step() {
    if (_this.ended) return;

    var t = new Date() - t1;
    var fraction = Math.min(1, t / duration);

    step(fraction);

    if (fraction == 1) {
      next_step();
    } else {
      window.requestAnimationFrame(do_step);
    }
  }

  window.requestAnimationFrame(do_step);
};

StepAnimation.prototype.add_unpledged_delegates = function() {
  var _this = this;

  function step(t) {
    _this.candidates.forEach(function(candidate) {
      var d = candidate.n_delegates_end - candidate.n_delegates_start;
      candidate.n_delegates = candidate.n_delegates_start + Math.round(d * t);
    });

    _this.horse_race.refresh_candidate_els();
  }

  this.animate_step(1000, step, function() { _this.end(); });
};

StepAnimation.prototype.wait_to_show_states = function() {
  var _this = this;

  window.setTimeout(function() {
    if (_this.ended) return;

    _this.show_states();
  }, 200);
};

StepAnimation.prototype.show_states = function() {
  var _this = this;

  var canvas;

  function initialize() {
    var div = _this.horse_race.els.div;

    canvas = _this.state_canvas = build_canvas(div);

    var ctx = canvas.getContext('2d');

    if (_this.step.type == 'race-day') {
      var races = _this.race_day.races;
      var paths = _this.horse_race.state_paths;

      for (var i = 0; i < races.length; i++) {
        var race = races[i];

        ctx.save();

        var transform = build_race_transform_matrix(i, races.length, canvas.width);
        ctx.setTransform.apply(ctx, transform);

        draw_path(ctx, paths[race.state_code]);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 / transform[0];
        ctx.stroke();

        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.strokeStyle = '#666';
      ctx.arc(canvas.width / 2, 50, 15, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function step(t) {
    if (!canvas) { initialize(); }

    canvas.style.opacity = t;
    canvas.style.transform = 'translate(0, ' + ((1 - Math.sqrt(t)) * -25) + 'px)'; // -25px -> 0px
  }

  this.animate_step(300, step, function() { _this.show_dots(); });
};

StepAnimation.prototype.show_dots = function() {
  var _this = this;

  function candidate_state_line(candidate_id, state_code, transform_matrix) {
    var line = DotLine.parse({ x: 0, y: 0 }, _this.horse_race.state_paths[state_code], transform_matrix);
    line.candidate_id = candidate_id;
    return line;
  }

  // Builds [ { candidate_id: 'id', dots: Array[{x,y}] } ] for a race.
  function candidate_race_dots(race, transform_matrix) {
    var ret = [];

    var candidates = race.candidates
      .filter(function(c) { return c.n_delegates > 0; })
      .map(function(candidate) {
        var line = candidate_state_line(candidate.id, race.state_code, transform_matrix);
        return line ? { id: candidate.id, n_dots_remaining: candidate.n_delegates, line: line, dot_positions: [] } : null;
      })
      .filter(function(arr) { return !!arr; })
      ;

    var n = candidates.reduce(function(s, c) { return s + c.n_dots_remaining; }, 0);
    var step = 1 / n;
    var t = step /2;

    // Interweave candidate dots: give the dots round-robin to the candidates
    var remaining = candidates.slice(0);
    while (remaining.length > 0) {
      var candidate = remaining.shift();
      candidate.dot_positions.push(t);
      t += step;
      candidate.n_dots_remaining -= 1;

      if (candidate.n_dots_remaining > 0) {
        remaining.push(candidate);
      }
    }

    return candidates.map(function(c) {
      c.line.place_dots(c.dot_positions);
      return {
        candidate_id: c.id,
        dots: c.line.get_dot_coordinates(0)
      };
    });
  }

  var canvas;         // <canvas>
  var width;          // width of <canvas>
  var ctx;            // 2d context
  var candidates_by_id = {};
  var candidate_dots; // Array[AnimatedDotSet]
  var candidate_sprites = {}; // Array[<canvas>]

  _this.candidates.forEach(function(candidate) {
    candidates_by_id[candidate.id] = candidate;

    var ccanvas = document.createElement('canvas');
    ccanvas.width = 5;
    ccanvas.height = 5;
    var cctx = ccanvas.getContext('2d');
    cctx.fillStyle = CandidateColorsNoParties[candidate.slug];
    cctx.arc(2.5, 2.5, 2.5, 0, Math.PI * 2);
    cctx.closePath();
    cctx.fill();
    candidate_sprites[candidate.id] = ccanvas;
  });

  function candidate_to_target_xy(candidate) {
    var el = candidate.els.target.querySelector('.target');
    return {
      x: el.offsetLeft + el.offsetWidth / 2 + el.offsetParent.offsetLeft,
      y: el.offsetTop + el.offsetHeight / 2 + _this.horse_race.els.race_days.offsetHeight
    };
  }

  function initialize_with_races(races) {
    var partial_dot_sets = {}; // candidate_id -> Array of dots

    _this.candidates.forEach(function(c) { partial_dot_sets[c.id] = []; });

    for (var i = 0; i < races.length; i++) {
      var transform = build_race_transform_matrix(i, races.length, canvas.width);
      var race_dots = candidate_race_dots(races[i], transform);

      for (var j = 0; j < race_dots.length; j++) {
        var dots = race_dots[j];
        var arr = partial_dot_sets[dots.candidate_id];

        if (!arr) continue; // the candidate got delegates but we're not showing him/her in the horse race

        dots.dots.forEach(function(xy) {
          arr.push({
            x: xy.x * transform[0] + xy.y * transform[2] + transform[4],
            y: xy.x * transform[1] + xy.y * transform[3] + transform[5]
          });
        });
      }
    }

    candidate_dots = _this.candidates.map(function(candidate) {
      var raw_dots = partial_dot_sets[candidate.id];

      return new AnimatedDotSet(
        candidate.id,
        candidate_to_target_xy(candidate),
        raw_dots,
        _this.step.max_candidate_n_delegates
      );
    });
  }

  function initialize_with_unpledged_delegates() {
    var phi = 0;
    var d_phi = 2 * Math.PI / _this.step.n_delegates;
    var r = 15;
    var c = {
      x: canvas.width / 2,
      y: 50
    };

    candidate_dots = _this.candidates.map(function(candidate) {
      var n_dots = _this.step.candidate_n_delegates_map[candidate.id].n_delegates;

      var dot_xys = [];
      for (var i = 0; i < n_dots; i++) {
        dot_xys.push({
          x: c.x + r * Math.cos(phi),
          y: c.y + r * Math.sin(phi)
        });
        phi += d_phi;
      }

      return new AnimatedDotSet(
        candidate.id,
        candidate_to_target_xy(candidate),
        dot_xys,
        _this.step.max_candidate_n_delegates
      );
    });
  }

  function initialize() {
    var div = _this.horse_race.els.div;
    canvas = _this.dot_canvas = build_canvas(div);
    width = canvas.width;
    ctx = canvas.getContext('2d');

    if (_this.step.type == 'race-day') {
      initialize_with_races(_this.race_day.races);
    } else {
      initialize_with_unpledged_delegates();
    }
  }

  function step(t) {
    if (!ctx) initialize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    candidate_dots.forEach(function(dot_set) {
      var sprite = candidate_sprites[dot_set.candidate_id];
      var candidate = candidates_by_id[dot_set.candidate_id];

      var dots = dot_set.get_dots_at(t);
      for (var j = 0; j < dots.length; j++) {
        var dot = dots[j];
        // We want to move left by 2.5px, up by 2.5px ... and we also want to
        // round to the nearest integer, to make drawing faster. We do both at
        // once, with Math.floor(x - 2).
        ctx.drawImage(sprite, Math.floor(dot.x - 2), Math.floor(dot.y - 2));
      }

      var n_complete = dot_set.get_n_dots_completed_at(t);
      candidate.n_delegates = candidate.n_delegates_start + n_complete;

      if (candidate.n_delegates == candidate.n_delegates_start) {
        candidate.animation_state = 'idle';
      } else if (candidate.n_delegates == candidate.n_delegates_end) {
        candidate.animation_state = 'idle';
      } else {
        candidate.animation_state = 'adding';

        if (dot_set.is_winner && !candidate.speech_bubble_html) {
          candidate.speech_bubble_html = next_interjection();
        }
      }
    });

    _this.state_canvas.style.opacity = 0.5 * Math.pow(1 - t, 2);
    _this.state_canvas.style.transform = 'translate(0, ' + (Math.sqrt(t) * 5) + 'px)'; // 0px -> 5px

    _this.horse_race.refresh_candidate_els();
  }

  var duration = Math.log2(this.step.n_delegates) * 180;
  this.animate_step(duration, step, function() { _this.end(); });
};

/**
 * Called at the end of animation. You may also call it at any time to abort
 * all further rendering.
 */
StepAnimation.prototype.end = function() {
  if (this.ended) return;
  this.ended = true;

  if (this.state_canvas) this.state_canvas.parentNode.removeChild(this.state_canvas);
  if (this.dot_canvas) this.dot_canvas.parentNode.removeChild(this.dot_canvas);

  this.candidates.forEach(function(candidate) {
    candidate.n_delegates = candidate.n_delegates_end;
    candidate.animation_state = 'idle';
    candidate.speech_bubble_html = null;
  });

  this.horse_race.on_step_end();
};
