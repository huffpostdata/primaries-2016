require 'haml'

require_relative './assets'
require_relative './logger'

RootPath = File.expand_path("../../dist", __FILE__)

module PrimariesPageGenerator
  @template = File.read(File.expand_path('../../templates/primary.html.haml', __FILE__))

  def self.generate(election_day)
    election_day.races.each do |race|
      race.state_reporting_units.each do |state_reporting_unit|
        generate_for_race(election_day, race, state_reporting_unit)
      end
    end
  end

  private

  def self.write_string_to_path(string, path)
    $logger.info("Writing #{path}")
    FileUtils.mkdir_p(File.dirname(path))
    File.open(path, 'w') { |f| f.write(string) }
  end

  # Generate all static files for the given Race.
  #
  # Generates an HTML file and a JSON file.
  def self.generate_for_race(election_day, race, state_reporting_unit)
    generate_html_for_race(election_day, race, state_reporting_unit)
  end

  # Generate all static HTML files for
  def self.generate_html_for_race(election_day, race, state_reporting_unit)
    haml_engine = Haml::Engine.new(@template)
    context = HtmlContext.new(election_day, race, state_reporting_unit)
    output = haml_engine.render(context)
    path = "#{RootPath}/#{context.html_path}"
    write_string_to_path(output, path)
  end

  class HtmlContext
    attr_reader(:election_day, :race, :state_reporting_unit)

    def initialize(election_day, race, state_reporting_unit)
      @election_day = election_day
      @race = race
      @state_reporting_unit = state_reporting_unit
    end

    def main_js_path; Assets.main_js_path; end
    def main_css_path; Assets.main_css_path; end

    def html_h1
      "#{state_reporting_unit.state_name} #{race.race_type}"
    end

    def html_title
      "#{state_reporting_unit.state_name} #{race.race_type}"
    end

    def precincts_reporting; state_reporting_unit.precincts_reporting; end
    def precincts_total; state_reporting_unit.precincts_total; end
    def candidates; state_reporting_unit.candidates; end

    def candidate_votes_fraction(candidate)
      total_n_votes = candidates.map(&:vote_count).reduce(0) { |s, n| s + n }
      if total_n_votes == 0
        0
      else
        candidate.vote_count.to_f / total_n_votes
      end
    end

    def html_path
      "primaries/#{race.party}/#{state_reporting_unit.state_postal}.html"
    end
  end
end
