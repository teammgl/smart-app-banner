'use strict';

var extend = require('object-assign');
var q = require('component-query');
var doc = require('get-doc');
var cookie = require('cookie-cutter');

// IE < 11 doesn't support navigator language property.
/* global navigator */
var userLangAttribute = navigator.language || navigator.userLanguage || navigator.browserLanguage;
var userLang = userLangAttribute.slice(-2) || 'us';
var root = doc && doc.documentElement;

// platform dependent functionality
var mixins = {
	ios: {
		iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
		getStoreLink: function () {
			return 'https://itunes.apple.com/' + this.options.appStoreLanguage + '/app/id' + this.appId + "?mt=8";
		}
	},
	android: {
		iconRels: ['android-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
		getStoreLink: function () {
			return 'http://play.google.com/store/apps/details?id=' + this.appId;
		}
	},
	windows: {
		iconRels: ['windows-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
		getStoreLink: function () {
			return 'http://www.windowsphone.com/s?appid=' + this.appId;
		}
	}
};

var SmartBanner = function (options) {
	this.options = extend({}, {
		daysHidden: 15,
		daysReminder: 90,
		appStoreLanguage: userLang, // Language code for App Store
		button: 'OPEN', // Text for the install button
		store: {
			ios: 'On the App Store',
			android: 'In Google Play',
			windows: 'In the Windows Store'
		},
		appIds: {},
		price: {
			ios: 'FREE',
			android: 'FREE',
			windows: 'FREE'
		},
		theme: '', // put platform type ('ios', 'android', etc.) here to force single theme on all device
		icon: '', // full path to icon image if not using website icon image
		force: '', // put platform type ('ios', 'android', etc.) here for emulation

	}, options || {});

	if (this.options.force) {
		this.type = this.options.force;
	} else if (navigator.userAgent.match(/IEMobile/i)) {
		this.type = 'windows';
	} else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
		this.type = 'ios';
	} else if (navigator.userAgent.match(/Android/i)) {
		this.type = 'android';
	}

	this.appId = this.type && this.options.appIds[this.type];
	// Don't show banner on ANY of the following conditions:
	// - device os is not supported,
	// - user is on mobile safari for ios 6 or greater (iOS >= 6 has native support for SmartAppBanner)
	// - running on standalone mode
	// - user dismissed banner
	var unsupported = !this.type || !this.options.store[this.type] || !this.appId;
	var runningStandAlone = navigator.standalone;
	var userDismissed = cookie.get(this.appId + '-smartbanner-closed');
	var userInstalled = cookie.get(this.appId + '-smartbanner-installed');

	if (unsupported || runningStandAlone || userDismissed || userInstalled) {
		return;
	}

	extend(this, mixins[this.type]);

	this.create();
	this.show();
};

SmartBanner.prototype = {
	constructor: SmartBanner,

	create: function () {
		var link = this.getStoreLink();
		var inStore = this.options.price[this.type] + ' - ' + this.options.store[this.type];
		var icon;

		if (this.options.icon) {
			icon = this.options.icon;
		} else {
			for (var i = 0; i < this.iconRels.length; i++) {
				var rel = q('link[rel="' + this.iconRels[i] + '"]');

				if (rel) {
					icon = rel.getAttribute('href');
					break;
				}
			}
		}

		var sb = doc.createElement('div');
		var theme = this.options.theme || this.type;

		sb.className = 'smartbanner smartbanner-' + theme;
		sb.innerHTML = '<div class="smartbanner-container">' +
							'<a href="javascript:void(0);" class="smartbanner-close">&times;</a>' +
							'<span class="smartbanner-icon" style="background-image: url(' + icon + ')"></span>' +
							'<div class="smartbanner-info">' +
								'<div class="smartbanner-title">' + this.options.title + '</div>' +
								'<div>' + this.options.author + '</div>' +
								'<span>' + inStore + '</span>' +
							'</div>' +
							'<a href="' + link + '" class="smartbanner-button">' +
								'<span class="smartbanner-button-text">' + this.options.button + '</span>' +
							'</a>' +
						'</div>';

		// there isn’t neccessary a body
		if (doc.body) {
			doc.body.appendChild(sb);
		}		else if (doc) {
			doc.addEventListener('DOMContentLoaded', function () {
				doc.body.appendChild(sb);
			});
		}

		q('.smartbanner-button', sb).addEventListener('click', this.install.bind(this), false);
		q('.smartbanner-close', sb).addEventListener('click', this.close.bind(this), false);
	},
	hide: function () {
		root.classList.remove('smartbanner-show');

		if (typeof this.options.close === 'function') {
			return this.options.close();
		}
	},
	show: function () {
		root.classList.add('smartbanner-show');
		if (typeof this.options.show === 'function') {
			return this.options.show();
		}
	},
	close: function () {
		this.hide();
		cookie.set(this.appId + '-smartbanner-closed', 'true', {
			path: '/',
			expires: new Date(Number(new Date()) + (this.options.daysHidden * 1000 * 60 * 60 * 24))
		});
		if (typeof this.options.close === 'function') {
			return this.options.close();
		}
	},
	install: function () {
		this.hide();
		cookie.set(this.appId + '-smartbanner-installed', 'true', {
			path: '/',
			expires: new Date(Number(new Date()) + (this.options.daysReminder * 1000 * 60 * 60 * 24))
		});
		if (typeof this.options.close === 'function') {
			return this.options.close();
		}
	}
};

module.exports = SmartBanner;
