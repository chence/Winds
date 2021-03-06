import strip from 'strip';
import entities from 'entities';
import moment from 'moment';
import request from 'request';
import normalize from 'normalize-url';
import FeedParser from 'feedparser';
import zlib from 'zlib';
import podcastParser from 'node-podcast-parser';

import Podcast from '../models/podcast'; // eslint-disable-line
import Episode from '../models/episode';
import Article from '../models/rss';

import config from '../config'; // eslint-disable-line
import logger from '../utils/logger';

function ParseFeed(feedUrl, callback) {
	let req = request(feedUrl, {
		pool: false,
		timeout: 10000,
	});

	req.setMaxListeners(50);
	req.setHeader(
		'User-Agent',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
	);
	req.setHeader('Accept', 'text/html,application/xhtml+xml');

	let feedparser = new FeedParser();

	req.on('error', err => {
		callback(null, err); // quick note from @kenhoff - in Node.js, these should really be reversed - err should always come before callback.
	});

	req.on('response', res => {
		if (res.statusCode !== 200) {
			return feedparser.emit('error', new Error('Bad status code'));
		}

		let encoding = res.headers['content-encoding'] || 'identity';

		if (encoding.match(/\bdeflate\b/)) {
			res = res.pipe(zlib.createInflate());
		} else if (encoding.match(/\bgzip\b/)) {
			res = res.pipe(zlib.createGunzip());
		}

		res.pipe(feedparser);
	});

	feedparser.on('error', err => {
		callback(null, err);
	});

	let articles = [];
	feedparser.on('end', () => {
		callback(articles);
	});

	feedparser.on('readable', () => {
		let postBuffer;

		while ((postBuffer = feedparser.read())) {
			let post = Object.assign({}, postBuffer);

			let parsedArticle = new Article({
				description: strip(
					entities.decodeHTML(post.description).substring(0, 280),
				),
				publicationDate:
					moment(post.pubdate).toISOString() || moment().toISOString(),
				title: strip(entities.decodeHTML(post.title)),
				url: normalize(post.link),
			});

			articles.push(parsedArticle);
		}
	});
}

function ParsePodcast(podcastUrl, callback) {
	logger.debug(`Attempting to parse podcast ${podcastUrl}`);

	let opts = {
		headers: {
			'Accept': 'text/html,application/xhtml+xml',
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
		},
		pool: false,
		timeout: 10000,
		url: podcastUrl,
	};

	let parsedEpisodes = [];

	request(opts, (error, response, responseData) => {
		podcastParser(responseData, (err, data) => {
			if (err) {
				return callback(null, err);
			}

			let episodes = data.episodes ? data.episodes : data;

			episodes.map(episode => {
				try {
					let url = episode.enclosure ? episode.enclosure.url : episode.guid;
					var parsedEpisode = new Episode({
						description: strip(episode.description).substring(0, 280),
						publicationDate:
							moment(episode.published).toISOString() ||
							moment().toISOString(),
						title: strip(episode.title),
						url: normalize(url),
					});
				} catch (e) {
					logger.error('Failed to parse episode', e);
				}
				parsedEpisodes.push(parsedEpisode);
			});

			callback(parsedEpisodes);
		});
	});
}

exports.ParseFeed = ParseFeed;
exports.ParsePodcast = ParsePodcast;
