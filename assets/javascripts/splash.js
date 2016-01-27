//= require './vendor/jquery-2.2.0.js'

$(function() {
  var iowa_polls_close = new Date('2/2/2016 3:00:00 AM UTC');
  function timeTill(end) {
    var timeDifference = Date.parse(end) - Date.parse(new Date());
    if(timeDifference < 0){
      $(".countdown-container h3").text("POLLS CLOSED FOR")
      timeDifference = timeDifference;
    } else {
      $(".countdown-container h3").text("POLLS CLOSE IN")
    }

    return {
      'total': timeDifference,
      'hours': Math.floor((timeDifference / (1000 * 60 * 60)) % 24),
      'minutes': Math.floor((timeDifference / 1000 / 60) % 60),
      'seconds': Math.floor((timeDifference / 1000) % 60)
    };
  }
  function initClock(id, starttime){
    var countdown = document.getElementById(id);
    var hSpan = countdown.querySelector('.hours');
    var mSpan = countdown.querySelector('.minutes');
    var sSpan = countdown.querySelector('.seconds');
    function updateCountdown() {
      var time = timeTill(starttime);
      hSpan.innerHTML = ('0' + time.hours).slice(-2)
      mSpan.innerHTML = ('0' + time.minutes).slice(-2);
      sSpan.innerHTML = ('0' + time.seconds).slice(-2);

      if(time.total <= 0) {
        clearInterval(timeinterval);
      }
    }
    updateCountdown();
    var timeinterval = setInterval(updateCountdown, 1000);
  }
  function fillSvg(data){
    document.getElementsByTagName("svg");
    var countiesReporting = 0;
    var totalPrecincts = 0;
    var precinctsReporting = 0;
    var totalCounties = $(".counties").children().length;
    $("svg .counties").children().each(function(ele){
      fips = this.getAttribute("data-fips-int");
      obj = data[fips];
      totalPrecincts += obj["n_precincts_total"];
      precinctsReporting += obj["total_n_precincts_reporting"];
      if(obj["total_n_precincts_reporting"] == obj["n_precincts_total"] && obj["total_n_precincts_reporting"] != 0){
        countiesReporting++; 
        $(this).addClass("has-results");
      }
    });
    precinctsPct = ((precinctsReporting/totalPrecincts)*100).toFixed(0) + "%";
    $("#unreported-counties").text(totalCounties - countiesReporting)
    $("#counties-val").html(countiesReporting + " FINISHED <span id='precincts-val'>(" + precinctsPct + " OF PRECINCTS)</span>");
  }
  function adjustCities(){
    $("svg .cities text").each(function(ele){
      $(this).attr("dx", "-"+($(this).width() / 2)+"px");
      $(this).attr("dy", "-5px");
    });
  }
  //initClock("countdown", iowa_polls_close);
  new pym.Child();
  adjustCities();
  $.getJSON(window.location.toString().split('?')[0] + '.json', function(json) {
    fillSvg(json);
  })
  .fail(function() { console.warn('Failed to load', this); })
  //.always(function() { window.setTimeout(poll_results, interval_ms); });


});
