function index_objects_by(array, property) {
  var ret = {};
  for (var i = 0; i < array.length; i++) {
    var object = array[i];
    var key = object[property];
    ret[key] = object;
  }
  return ret;
}

function HorseRace(div) {
  this.els = {
    div: div,
    race_days: div.querySelector('ol.race-days'),
    race_day_left: div.querySelector('.race-day-selector .left'),
    race_day_right: div.querySelector('.race-day-selector .right'),
    button: div.querySelector('button')
  };

  this.playing = false;

  this.data = JSON.parse(div.querySelector('.json-data').textContent);

  var state_paths = this.state_paths = {}; // state-code -> svg path "d"
  Array.prototype.forEach.call(div.querySelectorAll('li.race'), function(el) {
    var state_code = el.getAttribute('data-state-code');
    var path = el.querySelector('path');
    state_paths[state_code] = path.getAttribute('d');
  });

  var data_by_candidate_id = index_objects_by(this.data.candidates, 'id');
  var candidates_by_id = {};

  Array.prototype.forEach.call(div.querySelectorAll('li.candidate-horse'), function(el) {
    var id = el.getAttribute('data-candidate-id');
    var data = data_by_candidate_id[id];
    candidates_by_id[id] = {
      id: id,
      els: {
        row: el,
        marker: el.querySelector('.marker'),
        speech_bubble: el.querySelector('.speech-bubble')
      },
      data: data_by_candidate_id[id],
      n_delegates: data.n_delegates, // When we animate, this property will animate
      speech_bubble_html: null,      // While adding, there's sometimes a speech bubble
      animation_state: 'idle'        // When we animate, it'll go 'idle' -> 'adding' -> 'idle'
    };
  });

  Array.prototype.forEach.call(div.querySelectorAll('li.candidate-target'), function(el) {
    var id = el.getAttribute('data-candidate-id');
    var els = candidates_by_id[id].els;
    els.n_delegates = el.querySelector('.n-delegates');
    els.target = el;
  });

  this.candidates = Object.keys(candidates_by_id).map(function(k) { return candidates_by_id[k]; });

  this.load_steps();

  /**
   * step_position: where we are in time.
   *
   * Step positions are in between two steps. Position 0 is _before_ step 0;
   * position 1 is _before_ step 1.
   */
  this.step_position = this.steps.length;

  this.listen();

  this.refresh();
}

/**
 * Sets this.steps to an Array of HorseRaceSteps.
 */
HorseRace.prototype.load_steps = function() {
  var steps = this.steps = [];

  var current_candidates = {};
  this.candidates.forEach(function(c) { current_candidates[c.id] = { n_delegates_end: 0 }; });

  this.data.race_days.forEach(function(rd, i) {
    var step = new HorseRaceStep(i, 'race-day', current_candidates, rd.candidates);
    steps.push(step);
    current_candidates = step.candidate_n_delegates_map;
  });

  if (this.data.candidates.some(function(c) { return c.n_unpledged_delegates > 0; })) {
    var step_candidates = this.data.candidates.map(function(c) {
      return { id: c.id, n_delegates: c.n_unpledged_delegates };
    });
    steps.push(new HorseRaceStep(steps.length, 'unpledged', current_candidates, step_candidates));
  }
};

HorseRace.prototype.on_calendar_mousedown = function(ev) {
  function event_to_xy(e) {
    if (e.changedTouches) {
      var touch = e.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  if (this.touching) return;
  this.touching = true;

  this.pause();

  var _this = this;
  var race_day_el = ev.currentTarget;
  var scroll_left = race_day_el.scrollLeft;
  var start_xy = event_to_xy(ev);
  var DragThresholdSquared = 36; // square of number of pixels movement to indicate we're dragging
  var dragging = false; // false if we move our mouse far enough

  function maybe_reposition_calendar(ev2) {
    var end_xy = event_to_xy(ev2);
    var dx = end_xy.x - start_xy.x;

    if (!dragging && dx * dx > DragThresholdSquared) {
      dragging = true;
    }

    if (dragging) {
      race_day_el.scrollLeft = scroll_left - dx;
    }
  };

  function jump_to_centered_race_day() {
    var offset_x = race_day_el.scrollLeft + race_day_el.clientWidth / 2;

    for (var i = 0; i < race_day_el.childNodes.length; i++) {
      var li = race_day_el.childNodes[i]; // Assume no whitespace between <li>s
      if (li.offsetLeft + li.offsetWidth > offset_x) {
        _this.set_step_position(Math.min(_this.steps.length, i + 1));
        return;
      }
    }
  }

  function jump_to_clicked_race_day(e) {
    var node = e.target;
    while (node && !node.classList.contains('race-day') && !node.classList.contains('unpledged-delegates')) {
      node = node.parentNode;
    }

    if (node) {
      var index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
      if (index != -1) {
        _this.set_step_position(index + 1);
      }
    }
  };

  function on_mouseup(ev2) {
    document.removeEventListener('mousemove', maybe_reposition_calendar);
    document.removeEventListener('mouseup', on_mouseup);
    document.removeEventListener('touchmove', maybe_reposition_calendar);
    document.removeEventListener('touchend', on_mouseup);

    _this.touching = false;

    if (dragging) {
      maybe_reposition_calendar(ev2);
      jump_to_centered_race_day();
    } else {
      if (ev2.target.tagName == 'A') {
        // do nothing. Let the browser treat it as a normal click
      } else {
        jump_to_clicked_race_day(ev2);
      }
    }
  }

  document.addEventListener('mousemove', maybe_reposition_calendar);
  document.addEventListener('mouseup', on_mouseup);
  document.addEventListener('touchmove', maybe_reposition_calendar);
  document.addEventListener('touchend', on_mouseup);

  ev.preventDefault(); // avoid dragging/selecting
};

HorseRace.prototype.listen = function() {
  var _this = this;

  this.els.button.addEventListener('click', function(ev) {
    if (ev.currentTarget.className == 'play') {
      _this.play();
      ev.currentTarget.className = 'pause';
    } else {
      _this.pause();
      ev.currentTarget.className = 'play';
    }
  });

  this.els.race_days.addEventListener('mousedown', function(ev) { _this.on_calendar_mousedown(ev); });
  this.els.race_days.addEventListener('touchstart', function(ev) { _this.on_calendar_mousedown(ev); });
};

/**
 * Moves us to the given step position.
 *
 * Only call this when we aren't animating.
 */
HorseRace.prototype.set_step_position = function(step_position) {
  this.step_position = step_position;

  if (step_position === this.steps.length) {
    var last_step = this.steps[this.steps.length - 1];
    this.candidates.forEach(function(c) {
      c.n_delegates = last_step.candidate_n_delegates_map[c.id].n_delegates_end;
    });
  } else {
    var step = this.steps[step_position];
    this.candidates.forEach(function(c) {
      c.n_delegates = step.candidate_n_delegates_map[c.id].n_delegates_start;
    });
  }

  this.refresh();
};

HorseRace.prototype.play = function() {
  if (this.animation) return;
  if (this.playing) throw new Error('How are we playing if there is no animation?');

  this.playing = true;
  this.els.button.className = 'pause';
  $(this.els.div).addClass('animating');

  if (this.step_position == this.steps.length) {
    this.set_step_position(0);
  } else {
    // When paused, you're one position "ahead" of when playing
    this.set_step_position(this.step_position - 1);
  }

  this.play_step();
};

HorseRace.prototype.on_step_end = function() {
  this.animation = null;

  if (!this.playing) {
    // User clicked to stop animating
    this.set_step_position(this.step_position + 1);
  } else if (this.step_position === this.steps.length - 1) {
    this.pause();
    // Set step position after pause, so refresh_active_race_day keeps us on the
    // correct <li>. (See comments about li_index.)
    this.set_step_position(this.step_position + 1);
  } else {
    this.set_step_position(this.step_position + 1);
    this.play_step();
  }
};

HorseRace.prototype.pause = function() {
  this.playing = false;

  if (this.animation) {
    this.animation.end();
  }

  $(this.els.div).removeClass('animating');
  this.els.button.className = 'play';
};

HorseRace.prototype.refresh = function() {
  this.refresh_active_race_day();
  this.refresh_candidate_els();
};

HorseRace.prototype.refresh_active_race_day = function() {
  var race_days_el = this.els.race_days;
  $(race_days_el).children().removeClass('active after-active before-active');

  // If we're playing starting at position 2, highlight li #2
  // If we *clicked* on li #2, we're at position 3; highlight li #2
  var li_index = this.playing ? this.step_position : Math.max(0, this.step_position - 1);

  var $active_li = $(race_days_el).children().eq(li_index);
  
  $active_li.addClass('active');
  $active_li.prevAll().addClass('before-active');
  $active_li.nextAll().addClass('after-active');
  var active_li = $active_li.get(0);
  var race_day_left = active_li.offsetLeft;
  var left = Math.floor(race_day_left + active_li.getBoundingClientRect().width * 0.5 - race_days_el.getBoundingClientRect().width * 0.5);
  $(race_days_el).stop(true);
  $(race_days_el).animate({ scrollLeft: left });

  this.els.race_day_left.style.width = Math.max(0, race_day_left - left) + 'px';
  this.els.race_day_right.style.width = Math.max(0, race_days_el.clientWidth - race_day_left + left - active_li.getBoundingClientRect().width) + 'px';
};

HorseRace.prototype.build_candidate_speech_bubble = function(candidate, max_n_delegates) {
  var in_past = this.step_position === this.steps.length - 1;

  if (candidate.speech_bubble_html) {
    return candidate.speech_bubble_html; // "Yee-haw!", etc.
  } else if (candidate.n_delegates >= this.data.n_delegates_needed) {
    return "I'm the presumptive nominee!";
  } else if (candidate.n_delegates == max_n_delegates) {
    var n_remaining = this.data.n_delegates_needed - candidate.n_delegates;
    return 'I ' + (in_past ? 'needed' : 'need') + ' <strong>' + format_int(n_remaining) + ' more ' + (n_remaining > 1 ? 'delegates' : 'delegate') + '</strong> to win.';
  } else {
    var n_behind = max_n_delegates - candidate.n_delegates;
    return 'I' + (in_past ? ' was' : "'m") + ' behind by <strong>' + format_int(n_behind) + ' ' + (n_behind > 1 ? 'delegates' : 'delegate') + '</strong>';
  }
};

HorseRace.prototype.refresh_candidate_els = function() {
  var _this = this;

  var n_delegates_needed = this.data.n_delegates_needed;
  var max_n_delegates = this.candidates.reduce(function(max, c) { return c.n_delegates > max ? c.n_delegates : max; }, 0);

  this.candidates.forEach(function(candidate) {
    var left = Math.min(1, candidate.n_delegates / n_delegates_needed);
    candidate.els.marker.style.left = (100 * left) + '%';
    candidate.els.speech_bubble.innerHTML = _this.build_candidate_speech_bubble(candidate, max_n_delegates);
    candidate.els.n_delegates.innerText = format_int(candidate.n_delegates);

    candidate.els.row.className = 'candidate-horse ' + candidate.animation_state;
    candidate.els.marker.className = 'marker ' + candidate.animation_state + (candidate.speech_bubble_html ? ' force-speech-bubble' : '');
    candidate.els.target.className = 'candidate-target ' + candidate.animation_state;
  });
};

HorseRace.prototype.play_step = function() {
  this.animation = new StepAnimation(this, this.steps[this.step_position]);
  this.animation.start();
};

function init_horse_races() {
  var divs = document.querySelectorAll('.horse-race');
  Array.prototype.forEach.call(divs, function(div) { new HorseRace(div); });
}

$.fn.horse_race = function() {
  return $(this).each(function() { new HorseRace(this); });
};
