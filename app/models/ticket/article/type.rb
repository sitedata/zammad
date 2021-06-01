# Copyright (C) 2012-2021 Zammad Foundation, http://zammad-foundation.org/

class Ticket::Article::Type < ApplicationModel
  include ChecksLatestChangeObserved
  include HasCollectionUpdate

  validates :name, presence: true
end
