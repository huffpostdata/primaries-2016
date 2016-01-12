require_relative './base_view'
require_relative '../../lib/primaries_embed_view'

class PrimariesRightRailView < BaseView
  include PrimariesEmbedView

  def output_path; '2016/primaries/right-rail.html'; end

  def self.generate_all(database)
    self.generate_for_view(PrimariesRightRailView.new(database))
  end
end