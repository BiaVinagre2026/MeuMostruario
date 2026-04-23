# frozen_string_literal: true

module Api
  module V1
    module Admin
      class MembersController < BaseController

        # GET /api/v1/admin/members
        def index
          scope = Member.order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(plan_status: params[:plan_status]) if params[:plan_status].present?
          if params[:tag].present?
            scope = scope.where("? = ANY(tags)", params[:tag])
          end
          if params[:q].present?
            q = "%#{params[:q].strip}%"
            scope = scope.where(
              "full_name ILIKE :q OR cpf LIKE :q OR email ILIKE :q",
              q: q
            )
          end

          members = paginate(scope)
          render json: {
            members: members.map { |m| member_summary_json(m) },
            meta:    pagination_meta(members)
          }
        end

        # GET /api/v1/admin/members/:id
        def show
          member = Member.find(params[:id])
          render json: { member: member_full_json(member) }
        end

        # PATCH /api/v1/admin/members/:id
        def update
          member = Member.find(params[:id])
          if member.update(member_params)
            render json: { member: member_full_json(member.reload) }
          else
            render json: { errors: member.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/members/:id
        def destroy
          member = Member.find(params[:id])
          member.update!(status: "inactive")
          render json: { message: "Member deactivated" }
        end

        # GET /api/v1/admin/members/stats
        def stats
          total = Member.count
          by_status = Member.group(:status).count
          by_plan_status = Member.group(:plan_status).count

          render json: {
            total:          total,
            by_status:      by_status,
            by_plan_status: by_plan_status
          }
        end

        # GET /api/v1/admin/members/export
        def export
          scope = Member.order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(plan_status: params[:plan_status]) if params[:plan_status].present?
          if params[:tag].present?
            scope = scope.where("? = ANY(tags)", params[:tag])
          end
          if params[:q].present?
            q = "%#{params[:q].strip}%"
            scope = scope.where(
              "full_name ILIKE :q OR cpf LIKE :q OR email ILIKE :q",
              q: q
            )
          end

          csv_data = build_csv(scope)
          send_data csv_data,
                    type:        "text/csv; charset=utf-8",
                    disposition: "attachment; filename=members_#{Date.today.iso8601}.csv"
        end

        # POST /api/v1/admin/members/:id/register_payment
        def register_payment
          member       = Member.find(params[:id])
          payment_date = params[:payment_date].present? ? Date.parse(params[:payment_date]) : Date.today

          ActiveRecord::Base.transaction do
            member.update_columns(
              last_payment_date: payment_date,
              plan_status:       "active",
              updated_at:        Time.current
            )
          end

          render json: {
            member:       member_full_json(member.reload),
            payment_date: payment_date,
            message:      "Payment registered"
          }, status: :created
        rescue Date::Error
          render json: { error: "Invalid payment_date format. Use YYYY-MM-DD." },
                 status: :unprocessable_entity
        end

        # POST /api/v1/admin/members/:id/apply_tag
        def apply_tag
          member = Member.find(params[:id])
          tag    = params[:tag].to_s.strip

          if tag.blank?
            return render json: { error: "Tag is required" }, status: :unprocessable_entity
          end

          current_tags = Array(member.tags)
          if current_tags.include?(tag)
            return render json: { error: "Tag already exists" }, status: :unprocessable_entity
          end

          member.update!(tags: current_tags + [tag])
          render json: { member: member_summary_json(member), message: "Tag applied" }
        end

        private

        def member_params
          params.require(:member).permit(
            :full_name, :email, :phone, :birthdate, :gender,
            :plan_category, :status, :plan_status,
            :last_payment_date, :association_date,
            address: {},
            tags: [],
            custom_fields: {}
          )
        end

        def member_summary_json(m)
          {
            id:            m.id,
            cpf:           m.cpf,
            full_name:     m.full_name,
            email:         m.email,
            phone:         m.phone,
            plan_category: m.plan_category,
            plan_status:   m.plan_status,
            status:        m.status,
            tags:          m.tags,
            created_at:    m.created_at
          }
        end

        def member_full_json(m)
          {
            id:                m.id,
            cpf:               m.cpf,
            full_name:         m.full_name,
            email:             m.email,
            phone:             m.phone,
            birthdate:         m.birthdate,
            gender:            m.gender,
            association_date:  m.association_date,
            last_payment_date: m.last_payment_date,
            plan_category:     m.plan_category,
            plan_status:       m.plan_status,
            status:            m.status,
            role:              m.role,
            tags:              m.tags,
            import_source:     m.import_source,
            custom_fields:     m.custom_fields,
            created_at:        m.created_at,
            updated_at:        m.updated_at
          }
        end

        def build_csv(scope)
          headers = %w[id cpf full_name email phone plan_category plan_status status created_at]
          rows    = [headers.join(",")]
          scope.find_each do |m|
            rows << [
              m.id,
              m.cpf,
              csv_escape(m.full_name),
              csv_escape(m.email),
              csv_escape(m.phone.to_s),
              csv_escape(m.plan_category.to_s),
              m.plan_status,
              m.status,
              m.created_at.iso8601
            ].join(",")
          end
          rows.join("\n")
        end

        def csv_escape(value)
          return "" if value.blank?
          needs_quotes = value.include?(",") || value.include?('"') || value.include?("\n")
          needs_quotes ? "\"#{value.gsub('"', '""')}\"" : value
        end
      end
    end
  end
end
