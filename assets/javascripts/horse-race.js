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
    play: div.querySelector('button.play')
  };

  this.data = JSON.parse(div.querySelector('.json-data').textContent);
  this.state_paths = JSON.parse(div.querySelector('.json-state-paths').textContent);
  this.step_number = this.data.race_days.length;

  var data_by_candidate_id = index_objects_by(this.data.candidates, 'id');
  var candidates_by_id = {};

  Array.prototype.forEach.call(div.querySelectorAll('li.candidate-horse'), function(el) {
    var id = el.getAttribute('data-candidate-id');
    var data = data_by_candidate_id[id];
    candidates_by_id[id] = {
      id: id,
      els: {
        marker: el.querySelector('.marker'),
        speech_bubble: el.querySelector('.speech-bubble')
      },
      data: data_by_candidate_id[id],
      n_delegates: data.n_delegates, // When we animate, this property will animate
      swing_state: 'idle'            // When we animate, it'll go 'idle' -> 'adding' -> 'settling' -> 'idle'
    };
  });

  Array.prototype.forEach.call(div.querySelectorAll('li.candidate-target'), function(el) {
    var id = el.getAttribute('data-candidate-id');
    var els = candidates_by_id[id].els;
    els.n_delegates = el.querySelector('.n-delegates');
    els.target = el;
  });

  this.candidates = Object.keys(candidates_by_id).map(function(k) { return candidates_by_id[k]; });

  this.listen();
  this.step_number = this.data.race_days.length;
  this.refresh();
}

HorseRace.prototype.listen = function() {
  var _this = this;

  this.els.play.addEventListener('click', function() { _this.play(); });

  $(this.els.race_days).on('click', 'li.has-pledged-delegates', function(ev) {
    ev.preventDefault();
    _this.step_number = $(ev.currentTarget).prevAll().length;
    _this.refresh();
  });
};

HorseRace.prototype.play = function() {
  if (this.animation) {
    this.animation.end();
    this.animation = null;
  }

  if (this.step_number == this.data.race_days.length) {
    this.reset();
    this.refresh();
  }

  this.step();
};

HorseRace.prototype.refresh = function() {
  this.refresh_active_race_day();
  this.refresh_candidate_els();
};

HorseRace.prototype.refresh_active_race_day = function() {
  var active_index;

  if (this.step_number == this.data.race_days.length) {
    active_index = this.step_number - 1;
  } else {
    active_index = this.step_number;
  }

  var race_days_el = this.els.div.querySelector('ol.race-days');
  $(race_days_el).children().removeClass('active after-active before-active');
  var $active_li = $(race_days_el).children().eq(active_index);
  
  $active_li.addClass('active');
  $active_li.prevAll().addClass('before-active');
  $active_li.nextAll().addClass('after-active');
  var active_li = $active_li.get(0);
  var left = active_li.offsetLeft + active_li.clientWidth * 0.5 - race_days_el.clientWidth * 0.5;
  $(race_days_el).stop(true);
  $(race_days_el).animate({ scrollLeft: left });
};

HorseRace.prototype.refresh_candidate_els = function() {
  var left; // fraction [0 .. 1]
  var sentence;
  var in_past = (this.step_number !== null);

  var n_delegates_needed = this.data.n_delegates_needed;
  var max_n_delegates = this.candidates.reduce(function(max, c) { return c.n_delegates > max ? c.n_delegates : max; }, 0);

  this.candidates.forEach(function(candidate) {
    if (candidate.n_delegates >= n_delegates_needed) {
      left = 1;
      sentence_html = "I'm the presumptive nominee!";
    } else if (candidate.n_delegates == max_n_delegates) {
      var n_remaining = n_delegates_needed - candidate.n_delegates;
      left = candidate.n_delegates / n_delegates_needed;
      sentence_html = 'I ' + (in_past ? 'needed' : 'need') + ' <strong>' + format_int(n_remaining) + ' more ' + (n_remaining > 1 ? 'delegates' : 'delegate') + '</strong> to win.';
    } else {
      var n_behind = max_n_delegates - candidate.n_delegates;
      left = candidate.n_delegates / n_delegates_needed;
      sentence_html = 'I' + (in_past ? ' was' : "'m") + ' behind by <strong>' + format_int(n_behind) + ' ' + (n_behind > 1 ? 'delegates' : 'delegate') + '</strong>';
    }

    candidate.els.marker.style.left = (100 * left) + '%';
    candidate.els.speech_bubble.innerHTML = sentence_html;
    candidate.els.n_delegates.innerText = format_int(candidate.n_delegates);

    candidate.els.target.className = 'candidate-target ' + candidate.swing_state;
  });
};

HorseRace.prototype.step = function() {
  var race_day = this.data.race_days[this.step_number];

  this.step_number += 1;
  this.refresh_active_race_day();

  this.animation = new StepAnimation(this, this.step_number);
  this.animation.start();
};

HorseRace.prototype.reset = function() {
  this.step_number = -1;

  this.candidates.forEach(function(candidate) {
    candidate.n_delegates = 0;
  });
};

function init_horse_races() {
  var divs = document.querySelectorAll('.horse-race');
  Array.prototype.forEach.call(divs, function(div) { new HorseRace(div); });
}

$.fn.horse_race = function() {
  return $(this).each(function() { new HorseRace(this); });
};
