# Copyright (C) 2012-2021 Zammad Foundation, http://zammad-foundation.org/

class Store < ApplicationModel
  class Object < ApplicationModel
    validates :name, presence: true
  end
end
