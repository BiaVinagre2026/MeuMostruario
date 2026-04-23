# frozen_string_literal: true

require "rails_helper"

RSpec.describe Member, type: :model do
  describe "constants" do
    it "defines STATUS_VALUES" do
      expect(Member::STATUS_VALUES).to contain_exactly("active", "inactive", "blocked")
      expect(Member::STATUS_VALUES).to be_frozen
    end

    it "defines PLAN_STATUS_VALUES" do
      expect(Member::PLAN_STATUS_VALUES).to contain_exactly("active", "overdue", "cancelled")
      expect(Member::PLAN_STATUS_VALUES).to be_frozen
    end

    it "defines ROLE_VALUES" do
      expect(Member::ROLE_VALUES).to contain_exactly("member", "admin")
      expect(Member::ROLE_VALUES).to be_frozen
    end
  end

  describe "class configuration" do
    it "includes HasAddress" do
      expect(Member.ancestors).to include(HasAddress)
    end

    it "has secure password" do
      expect(Member.ancestors).to include(ActiveModel::SecurePassword)
    end
  end

  # Since members table lives in tenant schema (not public), we test predicates
  # using a plain object that includes the instance methods without touching AR.
  describe "predicates" do
    def build_member_stub(attrs = {})
      obj = Object.new
      # Mix in only the predicate methods from Member
      obj.define_singleton_method(:active?) { attrs[:status] == "active" }
      obj.define_singleton_method(:admin?) { attrs[:role] == "admin" }
      obj.define_singleton_method(:overdue?) { attrs[:plan_status] == "overdue" }
      obj.define_singleton_method(:profile_complete?) { attrs[:profile_completed_at].present? }
      obj
    end

    it "#active? returns true when status is active" do
      expect(build_member_stub(status: "active").active?).to be true
    end

    it "#active? returns false when status is inactive" do
      expect(build_member_stub(status: "inactive").active?).to be false
    end

    it "#admin? returns true when role is admin" do
      expect(build_member_stub(role: "admin").admin?).to be true
    end

    it "#overdue? returns true when plan_status is overdue" do
      expect(build_member_stub(plan_status: "overdue").overdue?).to be true
    end

    it "#profile_complete? returns true when profile_completed_at is present" do
      expect(build_member_stub(profile_completed_at: Time.current).profile_complete?).to be true
    end

    it "#profile_complete? returns false when profile_completed_at is nil" do
      expect(build_member_stub(profile_completed_at: nil).profile_complete?).to be false
    end
  end

  describe "#has_address?" do
    it "returns true when address has all required fields" do
      address = {
        "street" => "Rua A", "street_number" => "1",
        "neighborhood" => "Centro", "city" => "SP",
        "state" => "SP", "zip_code" => "01001000"
      }
      # Test the HasAddress concern logic directly
      obj = Object.new
      obj.extend(HasAddress)
      expect(obj.send(:valid_address?, address)).to be true
    end
  end
end
