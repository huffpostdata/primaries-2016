require_relative './base_view'

require_relative '../models/race_day'

class RaceDayView < BaseView
  attr_reader(:race_day)

  def initialize(database, race_day)
    super(database)
    @race_day = race_day
  end

  def output_path; "2016/primaries/#{race_day.id}.html"; end
  def page_title; "2016 Presidential Primaries: #{race_day.date.strftime('%B %-d, %Y')}"; end
  def layout; 'main'; end
  def stylesheets; [ asset_path('main.css') ]; end

  def hed; race_day.title; end
  def body; race_day.body; end
  def social_img; absolute_image_path_if_possible('share.png'); end
  def twitter; race_day.tweet; end
  def pubbed_dt; race_day.pubbed_dt; end
  def updated_dt; race_day.updated_dt_or_nil; end

  def meta
    @meta ||= {
      page_title: "HuffPost 2016 Election Coverage: #{hed}",
      page_description: "#{body}",
      author: "HuffPostPolitics",
      author_twitter: "HuffPostPol",
      social_image_url: "#{social_img}",
      twitter_desc: "#{twitter}"
    }
  end

  # The race day prior to the one we're focused on
  def previous_race_day
    database.race_days
      .select { |rd| rd.id < race_day.id }
      .last
  end

  DotsPerGroup = 25
  DotGroup = RubyImmutableStruct.new(:dot_subgroups)
  DotSubgroup = RubyImmutableStruct.new(:candidate_state, :n_dots)

  # Turns a list of candidate_states into some DotGroups
  def candidate_states_to_dot_groups(candidate_states)
    ret = []

    dot_group = DotGroup.new([])
    dots_left_in_group = DotsPerGroup

    candidate_states.each do |candidate_state|
      dots_left_in_state = candidate_state.n_delegates

      while dots_left_in_state > 0
        dots_in_subgroup = [ dots_left_in_group, dots_left_in_state ].min

        if dots_in_subgroup == 0
          ret << dot_group
          dot_group = DotGroup.new([])
          dots_left_in_group = DotsPerGroup
          # Loop again; dots_in_subgroup won't be 0
        else
          dot_group.dot_subgroups << DotSubgroup.new(candidate_state, dots_in_subgroup)
          dots_left_in_group -= dots_in_subgroup
          dots_left_in_state -= dots_in_subgroup
        end
      end
    end

    if dot_group.dot_subgroups.length > 0
      ret << dot_group
    end

    ret
  end

  # The race day immediately after the one we're focused on
  def next_race_day
    database.race_days
      .select { |rd| rd.id > race_day.id }
      .first
  end

  def self.generate_all(database)
    database.race_days.select(&:enabled?).each do |race_day|
      self.generate_for_view(RaceDayView.new(database, race_day))
    end
  end
end
