var Chat = function(id, player) {
	this.videoId = id;
	this.status = "loading";
	this.skipView = false;
	this.videoPlayer = player;
	this.chatDelay = 2;
	this.previousTimeOffset = -1;

	this.previousMessage = '';
	this.comboCount = 1;

	var self = this;

	// $.get('/users', function(data) {
	//   self._parseUserData(JSON.parse(data));
	// });

	// sending a client-id header by default
	$.ajaxSetup({headers: {"Client-ID" : "88bxd2ntyahw9s8ponrq2nwluxx17q"}});

	$.get("https://api.twitch.tv/helix/videos?id=" + this.videoId, function(vodData) {
		self.hReplace = new RegExp('([h])', 'gm');
		self.mReplace = new RegExp('([m])', 'gm');
		self.sReplace = new RegExp('([s])', 'gm');
		self.recordedTime = moment(vodData["data"][0]["created_at"]).utc();
		self.durationString = "PT" + vodData["data"][0]["duration"].replace(self.hReplace, 'H').replace(self.mReplace, 'M').replace(self.sReplace, 'S');
		self.duration = moment.duration(self.durationString).asSeconds();
		self.endTime = moment(self.recordedTime).add(self.duration, 'seconds').utc();
			
		$.get("https://vyneer.me/api/logs", {
			from: moment(self.recordedTime).format(),
			to: moment(self.endTime).format()
		}, function(data) {
			self.chat = data;
			self.startChatStream();
		});
	});

	$.get("/emotes", function(data) {
		self.emotes = JSON.parse(data);
		// stolen from ceneza Blesstiny
		self.emoteList = {};
		self.emotes.forEach(v => self.emoteList[v.prefix] = v);
		const emoticons = self.emotes.map(v => v['prefix']).join('|') + "|" + bbdggEmotes["bbdgg"].join('|');
		self.emoteRegexNormal = new RegExp(`(^|\\s)(${emoticons})(?=$|\\s)`, 'gm');
	});

	this.startChatStream = function() {
		this.status = "running";
	};

	this.pauseChatStream = function() {
		this.status = "paused";
	};

	this._parseUserData = function(data) {
		var styleString = "<style>\n";

		Object.keys(data).forEach(function(username) {
			styleString += ".user-" + username + " {\n";
			styleString += "\t color: " + data[username].color + " !important;\n";
			styleString += "}\n"
		});

		styleString += "</style>"

		$("head").append(styleString);
	};

	this._formatMessage = function(message) {
		var messageReplaced = message.linkify();

		function replacer(p1) {
			return self._generateDestinyEmoteImage(p1.replace(/ /g,''));
		}

		messageReplaced = messageReplaced.replace(self.emoteRegexNormal, replacer);

		return this._greenTextify(messageReplaced);
	};

	this._renderComboMessage = function(emote, comboCount) {
		return self._generateDestinyEmoteImage(emote) + 
			"<span class='x'> x" + comboCount + " </span>" + 
			"<span class='combo'>C-C-C-COMBO</span>";
	}

	this._renderChatMessage = function(username, message, features) {
		var usernameField = "";
		var featuresField = ""
		if (features.slice(1,-1) != "") {
			let flairArray = features.slice(1,-1).split(",");
			let flairList = "";
			flairArray.forEach(function(flair) {
				flairList += "<i class='flair " + flair + "'></i>";
			});
			featuresField =  "<span class='features'>" + flairList + "</span>";
		}
		if (username) {
			let flairArray = features.slice(1,-1).split(",");
			let flairList = ""
			flairArray.forEach(function(flair) {
				flairList += flair + " "
			});
			usernameField =  "<span class='user " + flairList + "'>" + username + "</span>: ";
		}

		$("#chat-stream").append("<div class='chat-line'>" + 
			featuresField +
			usernameField + 
			"<span class='message'>" +
		  message + "</span></div>");		
	}

	this._generateDestinyEmoteImage = function(emote) {
		return " <div class='emote " + emote + "' title=" + emote + "/>";
	};

	this._greenTextify = function(message) {
		if (message[0] === '>') {
			return "<span class='greentext'>" + message + "</span>";
		} else {
			return message;
		}
	}

	this._formatTimeNumber = function(number) {
		return ("0" + number).slice(-2);
	}

	this._formatTime = function(milliseconds) {
		var secondsTotal = milliseconds / 1000;
		var hours = Math.floor(secondsTotal / 3600)
		var minutes = Math.floor((secondsTotal - hours * 3600) / 60);
		var seconds = secondsTotal % 60;

		return this._formatTimeNumber(hours) + ":" + 
					 this._formatTimeNumber(minutes) + ":" + 
					 this._formatTimeNumber(seconds);
	}

	window.setInterval(function() {
		if (self.status == "running" && self.chat) {
			var currentTimeOffset = Math.floor(self.videoPlayer.getCurrentTime());
			var utcFormat = self.recordedTime.clone().add(self.chatDelay + currentTimeOffset, 's').format().replace("+00:00", "Z");
			
			if (currentTimeOffset != self.previousTimeOffset && self.chat[utcFormat]) {
				self.chat[utcFormat].forEach(function(chatLine) {
					if (self.previousMessage == chatLine.message && self.emoteList[self.previousMessage]) {
						self.comboCount++;

						$('#chat-stream .chat-line').last().remove();
						var comboMessage = self._renderComboMessage(self.previousMessage, self.comboCount);
						self._renderChatMessage(null, comboMessage, null);
					} else {
						self.comboCount = 1;
						self._renderChatMessage(chatLine.username, self._formatMessage(chatLine.message), chatLine.features);
					}

					self.previousMessage = chatLine.message;
				});

				$("#chat-stream").animate({ 
					scrollTop: $("#chat-stream").prop("scrollHeight")
				}, 1000);
			}

			self.previousTimeOffset = currentTimeOffset;
		}
	}, 1000);
};

// From https://stackoverflow.com/a/3890175
String.prototype.linkify = function() {
	// http://, https://, ftp://
	var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
	// www. sans http:// or https://
	var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

	return this.replace(urlPattern, '<a class="externallink" href="$&">$&</a>')
						 .replace(pseudoUrlPattern, '$1<a class="externallink" href="http://$2">$2</a>');
};
