﻿var second = 1000,
	minute = second * 60,
	hour = minute * 60,
	day = hour * 24;

module.exports = function (client, channelName) {

	function ago(date) {
		var diff = Date.now() - new Date(date).getTime();

		if (diff > 100 * hour) { // > 100 hours
			return Math.round(diff / day) + ' day' + (Math.round(diff / day) > 1 ? 's' : '') + ' ago';
		} else if (diff > hour) {
			return Math.round(diff / hour) + ' hour' + (Math.round(diff / hour) > 1 ? 's' : '') + ' ago';
		} else if (diff > minute) {
			return Math.round(diff / minute) + ' minute' + (Math.round(diff / minute) > 1 ? 's' : '') + ' ago';
		} else {
			return Math.round(diff / second) + ' second' + (Math.round(diff / second) !== 1 ? 's' : '') + ' ago';
		}
	}

	var users = {};
	setTimeout(function () {
		for (var i in client.chans[channelName.toLowerCase()].users) {
			users[i.toLowerCase()] = { joined: null, left: null };
		}
	}, 1000);

	client.on('quit', function (user) {
		if (users[user.toLowerCase()]) {
			users[user.toLowerCase()].left = new Date();
		}
	});

	client.on('part', function (channel, user) {
		if (users[user.toLowerCase()]) {
			users[user.toLowerCase()].left = new Date();
		}
	});

	client.on('join', function (channel, user) {
		if (!users[user.toLowerCase()]) {
			users[user.toLowerCase()] = { joined: new Date(), left: null };
		} else {
			users[user.toLowerCase()].joined = new Date();
		}
	});

	return {
		commands: {
			seen: function (from, message) {
				var user = users[message.toLowerCase()];
				if (user) {
					if (user.joined === null && user.left === null) {
						client.say(channelName, message + ' is here! I have no idea when he/she came though :(');
					} else if (user.joined !== null) {
						if (user.left !== null && user.joined < user.left) {
							client.say(channelName, message + ' last joined ' + ago(user.joined) + ', but left ' + ago(user.left));
						} else {
							client.say(channelName, message + ' is here! He/She came ' + ago(user.joined) + '!');
						}
					} else if (user.joined === null && user.left !== null) {
						client.say(channelName, 'I have no idea when ' + message + ' last joined, he/she left ' + ago(user.left) + ' though!');
					} else {
						client.say(channelName, 'Something\'s wrong with me. Fix meeeh, fix meeeee :((((');
						process.exit(1);
					}
				} else {
					client.say(channelName, 'I haven\'t seen ' + message + ' yet :(');
				}
			}
		}
	};
};