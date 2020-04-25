require 'sinatra'
require 'json'
require 'open-uri'

emotes = open('https://cdn.destiny.gg/emotes/emotes.json')

get '/' do
  File.read(File.join('public', 'index.html'))
end

get '/emotes' do
  emotes
end
