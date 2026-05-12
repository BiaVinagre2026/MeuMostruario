# frozen_string_literal: true

FactoryBot.define do
  factory :tenant do
    sequence(:name)  { |n| "Boutique #{n}" }
    sequence(:slug)  { |n| "boutique-#{n}" }
    plan   { "starter" }
    status { "active" }
  end
end
