# Copyright (C) 2012-2021 Zammad Foundation, http://zammad-foundation.org/

require 'rails_helper'
require 'models/concerns/has_collection_update_examples'

RSpec.describe Ticket::Article::Type, type: :model do
  it_behaves_like 'HasCollectionUpdate', collection_factory: :ticket_article_type
end
