# frozen_string_literal: true

class Member < ApplicationRecord
  include HasAddress

  has_secure_password

  STATUS_VALUES = %w[active inactive blocked].freeze
  PLAN_STATUS_VALUES = %w[active overdue cancelled].freeze
  ROLE_VALUES = %w[member admin].freeze

  validates :cpf, presence: true, uniqueness: true,
            format: { with: /\A\d{11}\z/, message: "must have 11 digits" }
  validates :full_name, presence: true
  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :association_date, presence: true
  validates :status, inclusion: { in: STATUS_VALUES }
  validates :plan_status, inclusion: { in: PLAN_STATUS_VALUES }
  validates :role, inclusion: { in: ROLE_VALUES }

  belongs_to :level, optional: true

  before_validation :clean_cpf, if: :cpf_changed?
  before_create :generate_referral_code

  scope :active, -> { where(status: "active") }
  scope :overdue, -> { where(plan_status: "overdue") }

  def active?
    status == "active"
  end

  def admin?
    role == "admin"
  end

  def overdue?
    plan_status == "overdue"
  end

  def profile_complete?
    profile_completed_at.present?
  end

  def has_address?
    valid_address?(address)
  end

  private

  def clean_cpf
    self.cpf = CpfValidator.clean(cpf)
  end

  def generate_referral_code
    loop do
      self.referral_code = Nanoid.generate(size: 12).upcase
      break unless Member.exists?(referral_code: referral_code)
    end
  end
end
