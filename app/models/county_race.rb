CountyRace = RubyImmutableStruct.new(:database, :fips_int, :race_id, :n_votes, :n_precincts_reporting, :n_precincts_total) do
  attr_reader(:id, :party_id)

  def after_initialize
    @id = "#{@fips_int}-#{@race_id}"
    @party_id = @race_id[11..13]
  end

  def race; database.races.find!(race_id); end
  def state_code; race.state_code; end

  def leader
    first = database.candidate_county_races.find_all_by_county_race_id(id).first
    first.n_votes > 0 ? first : nil
  end

  def leader_slug
    x = leader
    x.nil? ? nil : x.candidate_slug
  end
end
