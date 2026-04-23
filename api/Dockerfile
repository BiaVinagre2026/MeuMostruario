# syntax=docker/dockerfile:1
# =============================================================================
# Multitenant Whitelabel Template — API (Ruby on Rails 7.2 / Ruby 3.3)
#
# Single-container image running:
#   1. Redis (in-memory broker for Sidekiq)
#   2. Sidekiq (background job worker)
#   3. Puma (Rails web server)
#
# PostgreSQL is the only external dependency.
# =============================================================================

ARG RUBY_VERSION=3.3.0

FROM docker.io/library/ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
        curl \
        libjemalloc2 \
        libvips \
        postgresql-client \
        redis-server \
        supervisor && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development test" \
    RAILS_LOG_TO_STDOUT="true" \
    REDIS_URL="redis://127.0.0.1:6379/0"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
        build-essential \
        git \
        libpq-dev \
        libyaml-dev \
        pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ \
           "${BUNDLE_PATH}"/ruby/*/cache \
           "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

COPY . .

RUN bundle exec bootsnap precompile app/ lib/

FROM base

COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    mkdir -p db log storage tmp/pids tmp/cache public/uploads \
             /var/log/supervisor /var/run/redis /var/lib/redis && \
    chown -R rails:rails db log storage tmp public/uploads && \
    chown -R rails:rails /var/run/redis /var/lib/redis

COPY config/docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENTRYPOINT ["/rails/bin/docker-entrypoint"]

EXPOSE 3000

CMD ["supervisord"]
