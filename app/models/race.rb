require_relative './candidate'
require_relative './candidate_race'
require_relative './reporting_unit'

class Race
  attr_reader(:race_day, :party, :state)

  @@all = []

  def initialize(race_day, party, state, ap_hash)
    @race_day = race_day
    @party = party
    @state = state
    @ap_hash = ap_hash

    # OOOOH, ugly hack
    @@all << self
  end

  # JSON attributes, no logic
  def id; @ap_hash && @ap_hash[:raceID]; end
  def num_runoff; @ap_hash && @ap_hash[:numRunoff]; end
  def office_id; @ap_hash && @ap_hash[:officeID]; end
  def office_name; @ap_hash && @ap_hash[:officeName]; end
  def race_type; @ap_hash && @ap_hash[:raceType]; end
  def race_type_id; @ap_hash && @ap_hash[:raceTypeID]; end

  # Derived values

  def candidate_races
    @candidate_races ||= @ap_hash && reporting_unit_hash[:candidates].flat_map do |c|
      if Candidate.include?(c[:polID])
        CandidateRace.new(c, self)
      else
        [] # will be flattened
      end
    end
  end

  def n_precincts_reporting; @ap_hash && reporting_unit_hash[:precinctsReporting]; end
  def n_precincts_total; @ap_hash && reporting_unit_hash[:precinctsTotal]; end

  def reporting_units
    @reporting_units ||= @ap_hash[:reportingUnits]
      .select { |ru| ru.level == 'FIPSCode' }
      .map { |ru| ReportingUnit.new(ru) }
  end

  # Returns a Race ... or nil if there won't be one.
  #
  # (Colorado Republicans  won't vote for a presidential nominee in 2016.)
  def self.find_by_party_and_state(party, state)
    @by_party_and_state ||= @@all.map{ |r| [ "#{r.party.id}-#{r.state.code}", r ] }.to_h
    @by_party_and_state["#{party.id}-#{state.code}"]
  end

  def self.all; @@all; end

  private

  def reporting_unit_hash
    @reporting_unit_hash ||= @ap_hash && @ap_hash[:reportingUnits].find { |ru| ru[:level] == 'state' }
  end
end
