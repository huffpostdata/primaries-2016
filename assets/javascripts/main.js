//= require './vendor/d3.v3.js'
//= require './vendor/topojson.v1.js'
//= require './vendor/jquery-2.1.4.js'
//
//= require './states.js'

function load_us_map() {
  // started with http://bl.ocks.org/mbostock/4090848/
  var width = 960, height = 500;

  var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([ width / 2, height / 2 ]);

  var path = d3.geo.path()
    .projection(projection);

  var svg = d3.select('#main-map')
    .attr('width', width)
    .attr('height', height);

  var states = svg.append('g').attr('class', 'states');

  d3.json('/topojson/us.json', function(err, us) {
    if (err) throw err;

    states.selectAll('path')
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append('path')
        .attr('class', 'state')
        .attr('d', path);
  });
}

$(function() {
  load_us_map();
});
