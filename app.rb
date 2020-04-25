require 'dotenv/load'
require 'sinatra'
require 'json'
require 'open-uri'

emotes = open('https://cdn.destiny.gg/emotes/emotes.json')

api_token = ENV['API_TOKEN']

get '/' do
  File.read(File.join('public', 'index.html'))
end

get '/logs' do
  url = "https://vyneer.me/api/logs?from=" + params["from"] + "&to=" + params["to"] + "&token=" + api_token
  JSON.parse(open(url))
end

get '/emotes' do
  emotes
end
