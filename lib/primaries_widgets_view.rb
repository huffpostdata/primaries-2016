require_relative '../app/models/race_day'

module PrimariesWidgetsView

  def race_date_str; @race_date_str = "2016-02-09"; end;

  def race_day; @race_day ||= database.race_days.find(race_date_str); end

  def precinct_stats
    geos = geos_party_objects().values
    reporting_precincts = geos.map{|g| g[:n_precincts_reporting]}.reject(&:nil?).reduce(0, :+)
    total_precincts = geos.map{|g| g[:n_precincts_total]}.reject(&:nil?).reduce(0, :+)
    finished_geos = geos.select{|val| val[:n_precincts_total] == val[:n_precincts_reporting]}.count
    unfinished_geos = geos.select{|val| val[:n_precincts_reporting] > 0 and val[:n_precincts_reporting] < val[:n_precincts_total]}.count
    noresults = geos.select{|val| val[:n_precincts_reporting] == 0}.count
    reporting_str = if total_precincts.nil? || total_precincts == 0
      'N/A'
    elsif reporting_precincts == total_precincts
      '100%'
    else
      pct_reporting = (reporting_precincts.to_f / total_precincts.to_f) * 100.0
      if pct_reporting > 99
        '99%'
      else
        "#{pct_reporting.round}%"
      end
    end

    {
      geos_total: geos.count,
      geos_finished: finished_geos,
      geos_unfinished: unfinished_geos,
      geos_noresults: noresults,
      reporting_precincts_sofar: reporting_precincts,
      reporting_precincts_total: total_precincts,
      reporting_precincts_pct_raw: pct_reporting,
      reporting_precincts_pct_str: reporting_str
    }
  end

  #"result" contains all votes, vote percents by candidate by party for each race happening that day
  def candidate_objects_by_race
    result = {}
    race_day.races.each do |race|
      data = (result[race.race_day_id] ||= { :candidates => {:Dem => [], :GOP => []}, :leaders => {} })
      race.candidate_races.each{|cd|
        candidate_pct = cd.percent_vote
        candidate_votes = cd.n_votes
        data[:candidates][race.party_id.to_sym].push( {votes: candidate_votes, pct: candidate_pct, name: cd.candidate.name, id: cd.candidate.id} )
      }
      leader = race.candidate_races.sort_by(&:n_votes).reverse.first
      data[:leaders][race.party_id.to_sym] = {:id => leader.candidate.id, :name => leader.candidate.name}
    end
    result
  end

  # { geo_id -> { n_precincts_reporting, n_precincts_total, Dem -> { n_precincts_reporting, n_precincts_total, leader -> { candidate_id, n_votes } } } }
  def geos_party_objects
    ret = {}

    race_day.race_subcounties.each do |rs|
      geo_id = rs.geo_id
      party_id = rs.party_id

      geo_obj = ret[geo_id] ||= {
        n_precincts_reporting: 0,
        n_precincts_total: 0,
        'Dem' => { n_precincts_reporting: 0, n_precincts_total: 0, leader: { id: nil, n_votes: 0 } },
        'GOP' => { n_precincts_reporting: 0, n_precincts_total: 0, leader: { id: nil, n_votes: 0 } }
      }

      geo_obj[:n_precincts_reporting] += rs.n_precincts_reporting
      geo_obj[:n_precincts_total] += rs.n_precincts_total
      geo_obj[party_id][:n_precincts_reporting] += rs.n_precincts_reporting
      geo_obj[party_id][:n_precincts_total] += rs.n_precincts_total
    end

    race_day.candidate_race_subcounties.each do |crs|
      geo_id = crs.geo_id
      party_id = crs.party_id

      leader_obj = ret[geo_id][party_id][:leader]
      if crs.n_votes > leader_obj[:n_votes]
        leader_obj[:id] = crs.candidate_id
        leader_obj[:n_votes] = crs.n_votes
      end
    end

    ret
  end
end
