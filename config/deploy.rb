# config valid only for current version of Capistrano
lock '3.4.0'

set :application, 'election-2016'
set :repo_url, 'ssh://git@github.com/huffpostdata/election-2016'

set :deploy_to, '/home/rails/election-2016'
set :linked_dirs, fetch(:linked_dirs, []).push('tmp', 'cache')

desc 'Set new AP API key'
task :reset_env do
  ask(:ap_api_key, nil)
  on roles(:all) do |host|
    execute "echo AP_API_KEY='#{fetch(:ap_api_key)}' > #{shared_path}/env"
  end
end

desc 'Ensure the AP API key exists'
task :ensure_env do
  results = on roles(:all) do |host|
    test("[ -f #{shared_path}/env ]")
  end.map(&:value)
  if results.include?(false)
    invoke :reset_env # only works when there's one server. Like all elections-2016.
  end
end

# Janky namespaces. https://github.com/capistrano/capistrano/issues/1543
namespace :deploy do
  namespace :symlink do
    after :shared, :ensure_env_hack do
      invoke :ensure_env
    end
  end

  after :finished, :start_or_restart do
    on roles(:all) do |host|
      execute("(cd #{deploy_to}/current && script/run-production-command exit || true)")

      # http://hervalicio.us/post/34109894575/executing-nohup-commands-with-capistrano
      execute("(cd #{deploy_to}/current && /usr/bin/env $(cat #{shared_path}/env | xargs) script/production-server >> #{shared_path}/production.log &) && sleep 1", pty: true)
    end
  end
end
