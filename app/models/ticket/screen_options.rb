# Copyright (C) 2012-2021 Zammad Foundation, http://zammad-foundation.org/

module Ticket::ScreenOptions

=begin

list attributes

  result = Ticket::ScreenOptions.attributes_to_change(
    ticket_id: 123,

    ticket: ticket_model,
    current_user: User.find(123),
  )

  or only with user

  result = Ticket::ScreenOptions.attributes_to_change(
    current_user: User.find(123),
  )

returns

  result = {
    :form_meta => {
      :filter => {
        :state_id => [1, 2, 4, 7, 3],
        :priority_id => [2, 1, 3],
        :type_id => [10, 5],
        :group_id => [12]
      },
    },
    :dependencies => {
      :group_id => {
        "" => {
          : owner_id => []
        },
        12 => {
          : owner_id => [4, 5, 6, 7]
        }
      }
    }

=end

  def self.attributes_to_change(params)
    raise 'current_user param needed' if !params[:current_user]

    if params[:ticket].blank? && params[:ticket_id].present?
      params[:ticket] = Ticket.find(params[:ticket_id])
    end

    filter = {}
    assets = {}

    # get ticket states
    state_ids = []
    if params[:ticket].present?
      state_type = params[:ticket].state.state_type
    end
    state_types = ['open', 'closed', 'pending action', 'pending reminder']
    if state_type && state_types.exclude?(state_type.name)
      state_ids.push params[:ticket].state_id
    end
    state_types.each do |type|
      state_type = Ticket::StateType.find_by(name: type)
      next if !state_type

      state_type.states.each do |state|
        assets = state.assets(assets)
        state_ids.push state.id
      end
    end
    filter[:state_id] = state_ids

    # get priorities
    priority_ids = []
    Ticket::Priority.where(active: true).each do |priority|
      assets = priority.assets(assets)
      priority_ids.push priority.id
    end
    filter[:priority_id] = priority_ids

    type_ids = []
    if params[:ticket]
      types = %w[note phone]
      if params[:ticket].group.email_address_id
        types.push 'email'
      end
      types.each do |type_name|
        type = Ticket::Article::Type.lookup(name: type_name)
        next if type.blank?

        type_ids.push type.id
      end
    end
    filter[:type_id] = type_ids

    # get group / user relations
    dependencies = { group_id: { '' => { owner_id: [] } } }

    filter[:group_id] = []
    groups = if params[:current_user].permissions?('ticket.agent')
               if params[:view] == 'ticket_create'
                 params[:current_user].groups_access(%w[create])
               else
                 params[:current_user].groups_access(%w[create change])
               end
             else
               Group.where(active: true)
             end

    agents = {}
    agent_role_ids = Role.with_permissions('ticket.agent').pluck(:id)
    agent_user_ids = User.joins(:roles).where(users: { active: true }).where('roles_users.role_id' => agent_role_ids).pluck(:id)
    groups.each do |group|
      filter[:group_id].push group.id
      assets = group.assets(assets)
      dependencies[:group_id][group.id] = { owner_id: [] }

      group_agent_user_ids = User.joins(', groups_users').where("users.id = groups_users.user_id AND groups_users.access = 'full' AND groups_users.group_id = ? AND users.id IN (?)", group.id, agent_user_ids).pluck(:id)
      group_agent_roles_ids = Role.joins(', roles_groups').where("roles.id = roles_groups.role_id AND roles_groups.access = 'full' AND roles_groups.group_id = ? AND roles.id IN (?)", group.id, agent_role_ids).pluck(:id)
      group_agent_role_user_ids = User.joins(:roles).where(roles: { id: group_agent_roles_ids }).pluck(:id)

      User.where(id: group_agent_user_ids.concat(group_agent_role_user_ids).uniq, active: true).pluck(:id).each do |user_id|
        dependencies[:group_id][group.id][:owner_id].push user_id
        next if agents[user_id]

        agents[user_id] = true
        next if assets[:User] && assets[:User][user_id]

        user = User.lookup(id: user_id)
        next if !user

        assets = user.assets(assets)
      end

    end

    configure_attributes = nil
    if params[:ticket].present?
      configure_attributes = ObjectManager::Object.new('Ticket').attributes(params[:current_user], params[:ticket])
    end

    {
      assets:    assets,
      form_meta: {
        filter:               filter,
        dependencies:         dependencies,
        configure_attributes: configure_attributes,
      }
    }
  end

=begin

list tickets by customer group in state categories open and closed

  result = Ticket::ScreenOptions.list_by_customer(
    customer_id: 123,
    limit:       15, # optional, default 15
  )

returns

  result = {
    ticket_ids_open:   tickets_open,
    ticket_ids_closed: tickets_closed,
    assets:            { ...list of assets... },
  }

=end

  def self.list_by_customer(data)

    base_query = TicketPolicy::ReadScope.new(data[:current_user]).resolve
                                        .joins(state: :state_type)
                                        .where(customer_id: data[:customer_id])
                                        .limit(data[:limit] || 15)
                                        .order(created_at: :desc)

    open_tickets   = base_query.where(ticket_state_types: { name: Ticket::State::TYPES[:open] })
    closed_tickets = base_query.where(ticket_state_types: { name: Ticket::State::TYPES[:closed] })

    {
      ticket_ids_open:   open_tickets.map(&:id),
      ticket_ids_closed: closed_tickets.map(&:id),
      assets:            (open_tickets | closed_tickets).reduce({}) { |hash, ticket| ticket.assets(hash) },
    }
  end
end
