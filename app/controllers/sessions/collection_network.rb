module ExtraCollection
  def session( collections, user )

    collections['Network']             = Network.all
    collections['NetworkCategory']     = Network::Category.all
    collections['NetworkCategoryType'] = Network::Category::Type.all
    collections['NetworkPrivacy']      = Network::Privacy.all

  end
  def push( collections, user )

    collections['Network']             = Network.all
    collections['NetworkCategory']     = Network::Category.all
    collections['NetworkCategoryType'] = Network::Category::Type.all
    collections['NetworkPrivacy']      = Network::Privacy.all

  end
  module_function :session, :push
end