'use strict';

var cookie = require('cookie-cutter');

// IE < 11 doesn't support navigator language property.
/* global navigator */
var userLangAttribute = navigator.language || navigator.userLanguage || navigator.browserLanguage;
var userLang = userLangAttribute.slice(-2) || 'us';
var root = document.documentElement;

// options = {daysHidden, daysReminder, title, author, button, store, appIds, icon, [close], [show]}
var SmartBanner = function (options) {
	this.options = options;
	this.options.appStoreLanguage = userLang;

	if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
		this.type = 'ios';
	} else if (navigator.userAgent.match(/Android/i)) {
		this.type = 'android';
	}

	this.appId = this.type && this.options.appIds[this.type];
	// Don't show banner on ANY of the following conditions:
	// - appId not defined,
	// - running on standalone mode
	// - user dismissed banner
	var unsupported = !this.appId;
	var runningStandAlone = navigator.standalone;
	var userDismissed = cookie.get(this.appId + '-sb-closed');
	var userInstalled = cookie.get(this.appId + '-sb-installed');

	if (unsupported || runningStandAlone || userDismissed || userInstalled) {
		return;
	}

	this.create();
	this.show();
};

SmartBanner.prototype = {
	constructor: SmartBanner,

	create: function () {
		var sb = document.createElement('div');

		sb.className = 'smartbanner';
		sb.innerHTML = '<div class="sb-container">' +
							'<a href="javascript:void(0);" class="sb-close">' +
								'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
									'<path d="M8 8l8 8m0-8l-8 8" fill="none" stroke="#222521" stroke-width="1.231" stroke-linecap="round"/>' +
								'</svg>' +
							'</a>' +
							'<span class="sb-icon" style="background-image: url(' + this.options.icon + ')"></span>' +
							'<div class="sb-info">' +
								'<div class="sb-title">' + this.options.title + '</div>' +
								'<div>' + this.options.author + '</div>' +
								'<div class="sb-store">' + this.options.store[this.type] + '</div>' +
							'</div>' +
							'<a href="' + this.link() + '" class="sb-button">' +
								'<span class="sb-button-text">' + this.options.button + '</span>' +
							'</a>' +
						'</div>';

		// there isn’t neccessary a body
		if (document.body) {
			document.body.appendChild(sb);
		}		else if (document) {
			document.addEventListener('DOMContentLoaded', function () {
				document.body.appendChild(sb);
			});
		}

		document.querySelector('.sb-button').addEventListener('click', this.install.bind(this), false);
		document.querySelector('.sb-close').addEventListener('click', this.close.bind(this), false);
	},
	link: function () {
		switch(this.type) {
			case 'ios':
				return 'https://itunes.apple.com/' + this.options.appStoreLanguage + '/app/id' + this.appId + "?mt=8";
			case 'android':
				return 'http://play.google.com/store/apps/details?id=' + this.appId;
		}
	},
	hide: function () {
		root.classList.remove('sb-show');

		if (typeof this.options.close === 'function') {
			return this.options.close();
		}
	},
	show: function () {
		root.classList.add('sb-show');
		if (typeof this.options.show === 'function') {
			return this.options.show();
		}
	},
	close: function () {
		this.setCookie('closed', this.options.daysHidden);
		this.hide();
	},
	install: function () {
		this.setCookie('installed', this.options.daysReminder);
		this.hide();
	},
	setCookie: function (action, daysToExpire) {
		cookie.set(this.appId + '-sb-' + action, 'true', {
			path: '/',
			expires: new Date(Number(new Date()) + (daysToExpire * 1000 * 60 * 60 * 24))
		});
	}
};

module.exports = SmartBanner;
