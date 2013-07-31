﻿var fs = require('fs');
var request = require('request');
var azure = require('azure');
var url = require('url');

module.exports = function (client, channelName) {

	if (!process.env.AZURE_STORAGE_ACCOUNT || !process.env.AZURE_STORAGE_ACCESS_KEY) {
		var userData = JSON.parse(fs.readFileSync(__dirname + '/.azure', { encoding: 'utf8' }));

		if (!userData.name) {
			return {};
		}
		process.env.AZURE_STORAGE_ACCOUNT = userData.name;
		process.env.AZURE_STORAGE_ACCESS_KEY = userData.key;
	}

	var tableService = azure.createTableService();
	tableService.createTableIfNotExists('images', function () { });
	var blobService = azure.createBlobService();
	blobService.createContainerIfNotExists('images', { publicAccessLevel: 'blob' }, function () { });

	function checkLink(url, fn) {
		request.head(url, function (err, resp) {
			if (err) return fn(err);

			fn(null, resp.statusCode === 200);
		});
	}

	function saveLink(url) {
		checkLink(url, function (err, success) {
			if (err || !success) return;

			var date = new Date();
			var partKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()).toString();
			var blobId = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()).toString();

			var req = request.get({ url: url, headers: { Referer: url } });

			req.on('response', function (resp) {
				blobService.createBlockBlobFromStream('images', blobId.toString(), req, resp.headers['content-length'], { contentType: resp.headers['content-type'] }, function (error) {
					if (err) return console.error(err);

					tableService.insertEntity('images', {
						PartitionKey: partKey,
						RowKey: blobId,
						Url: url
					}, function (err) {
						if (err) return console.error(err);

						client.emit('azure:image', blobId);
					});
				});
			});
		});
	}

	function parseLinks(message) {
		var re, match;

		re = /http:\/\/safebooru\.org\/images\/\S+/gi;
		while (match = re.exec(message)) {
			saveLink(match[0]);
		}

		re = /http:\/\/e-shuushuu.net\/images\/\S+/gi;
		while (match = re.exec(message)) {
			saveLink(match[0]);
		}
	}

	var oldSay = client.say;
	client.say = function (channel, message) {
		oldSay.apply(client, arguments);

		if (channel === channelName) {
			parseLinks(message);
		}
	};

	return {
		messageHandler: function (from, message) {
			parseLinks(message);
		}
	};
};