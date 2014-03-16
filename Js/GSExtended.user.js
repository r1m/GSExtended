// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @description Enhance Grooveshark Broadcast functionnality
// @downloadURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js
// @updateURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.meta.js
// @include     http://grooveshark.com/*
// @version     1.0.0
// @run-at document-end
// @grant  none
// ==/UserScript==

GSX = {
	settings : {
		chatNotify : false,
		chatNotificationTriggers : {},
		songNotification : true,
		biggerChat : true,
		hideShareBox : true,
		chatTimestamps : true,
		showNewChatColor : true,
		changeSuggestionLayout : true,
		forceVoterLoading : false,
		autoVotes : {}

	},
	init : function() {
		//bind events on GSX object;
		_.bindAll(this, 'onChatActivity', 'onSongChange', 'isInBCHistory', 'isInBCLibrary', 'isBCFriend');

		console.info('-- Monkeys rock! ---');
		console.log('Init GSX');
		//install render hook to know when GS App is ready
		this.hookAfter(GS.Views.Application, 'render', GSX.afterGSAppInit);
		// install setter hook to know when tier2 is loaded
		Object.defineProperty(GS, "contextMenus", {
			set : function(y) {
				this._contextMenus = y;
				GSX.afterTier2Loaded(y);
			},
			get : function(y) {
				return this._contextMenus;
			}
		});

		this.readPrefValue();
		console.log('read GSX settings ', this.settings);
		this.insertGsxStyle();
		console.log('register listeners');
		this.registerListeners();
		console.log('grant notif permission');
		this.grantNotificationPermission();
		console.log('hook chat renderer');
		this.hookChatRenderer();
		console.log('add song vote renderer');
		this.hookSongRenderer();
		if (this.settings.biggerChat) {
			console.log('enlarge chat box');
			this.enlargeChatbox();
		}
		if (this.settings.hideShareBox) {
			console.log('remove share box');
			this.removeSharebox();
		}
		if (this.settings.chatTimestamps) {
			console.log('add timestamps');
			this.addChatTimestamps();
		}
		if (this.settings.changeSuggestionLayout) {
			console.log('changeSuggestion layout');
			this.changeSuggestionLayout();
		}
		if(this.settings.friendOfToothless){
			console.info('MEEEP !');
			this.forbiddenFriendship();
		}
		
		this.notice('Where are my dragons ?', {
			title : 'GSX',
			duration : 2000
		});
		console.info('-- Dragons too! ---');
	},

	afterGSAppInit : function() {
		//Let's see your dirtiest secrets !
		window.gsAppModelExposed = this.model;
		window.gsAppExposed = this;
		//Sorry

		this.model.on('change:user', function() {
			GSX.onUserChange(this.model.get('user'));
		}, this);
		GSX.onUserChange(this.model.get('user'));
		console.info('-- In da place ---');
		GSX.notice('Night Fury! Get down!', {
			title : 'GSX',
			duration : 2000
		});

	},

	afterTier2Loaded : function(menus) {
		GSX.hookSongContextMenu(menus);
		
		GSX.hookAfter(GS.Views.Pages.Settings,"renderPreferences",function(){
			GSX.renderPreferences(this.$el);
		});
		GSX.hookAfter(GS.Views.Pages.Settings,"submitPreferences",function(){
			GSX.submitPreferences(this.$el);
		});
		console.info('Caught the fish !');
		GSX.notice('Toothless! It\'ll be fine!', {
			title : 'GSX',
			duration : 2000
		});
	},
	

	/**
	 *  Util functions
	 */
	addStyle : function(css) {
		var style = document.createElement('style');
		style.textContent = css;
		document.getElementsByTagName('head')[0].appendChild(style);
	},
	savePrefValue : function(settings) {
		this.settings = settings || this.settings;
		localStorage.setItem('gsx', JSON.stringify(this.settings));
	},
	readPrefValue : function() {
		return this.settings = JSON.parse(localStorage.getItem('gsx')) || this.settings;
	},
	deletePrefValue : function() {
		localStorage.removeItem('gsx');
	},

	hookAfter : function(target, n, func) {
		GSX.hookFunction(target, n, func, 'after');
	},
	hookBefore : function(target, n, func) {
		GSX.hookFunction(target, n, func, 'before');
	},
	hookFunction : function(target, n, func, when) {
		//console.log('install hook', n);
		var old = target.prototype[n];
		//console.log(old);
		target.prototype[n] = function() {
			//console.log('hook !', n);
			if (when == 'before') {
				func.apply(this, arguments);
			}
			var r = old.apply(this, arguments);
			if (when == 'after') {
				func.apply(this, arguments);
			}
			return r;
		};

	},

	forbiddenFriendship : function() {
		GS.Models.Subscription.prototype.isSpecial = function() {
			return true;
		};
		GS.Models.Subscription.prototype.isPremium = function() {
			return true;
		};
		GS.Models.Subscription.prototype.isPlus = function() {
			return true;
		};
		GS.Models.Subscription.prototype.isAnywhere = function() {
			return true;
		};
	},

	grantNotificationPermission : function() {
		Notification.requestPermission(function(status) {
			if (Notification.permission !== status) {
				Notification.permission = status;
			}
		});
	},

	//show a desktop notification
	showNotification : function(messageOrSong) {
		var title, msg, icon, tag;
		if ( messageOrSong instanceof GS.Models.ChatActivity) {
			title = messageOrSong.get('user').get('Name');
			icon = messageOrSong.get('user').getImageURL();
			msg = messageOrSong.get('message');
			tag = 'gsx_msg';
		} else if ( messageOrSong instanceof GS.Models.QueueSong) {
			msg = messageOrSong.get('ArtistName') + ' \u2022 ' + messageOrSong.get('AlbumName');
			icon = messageOrSong.getImageURL();
			title = messageOrSong.get('SongName');
			tag = 'gsx_song';
		} else
			return;
		if (!("Notification" in window)) {
			console.log("No desktop notification support");
		} else if (Notification.permission === "granted") {
			var notification = new Notification(title, {
				body : msg,
				icon : icon,
				tag : tag
			});
		} else if (Notification.permission === 'default') {
			Notification.requestPermission(function(permission) {
				if (!('permission' in Notification)) {
					Notification.permission = permission;
				}

				if (permission === 'granted') {
					var notification = new Notification(title, {
						body : msg,
						icon : icon,
						tag : tag
					});
				}
			});
		}
		if (window.webkitNotifications) {
			/*
			 * TODO chrome notification with upvote/downvote option http://developer.chrome.com/extensions/notifications
			 */
			console.log("Chrome notifications are supported!");
		}
	},
	//show a GS notification on bottom off the windows
	notice : function(description, options) {
		/*
		 * Options attributes:
		 *   - title: the notice's title.
		 *   - description: the notice's message.
		 *   - type: either 'success' or 'error'; default is neither.
		 *   - url: link to send those who click the notice.
		 *   - duration: set to 0ms to make the notice sticky; default 6500ms.
		 */
		options = (options || {});
		options.description = description;

		GS.trigger('notification:add', options);
	},

	tooltip : function(text, e) {
		e.stopPropagation();
		var tooltip = new GS.Views.Tooltips.Helper({
			text : text
		});
		GS.Views.Tooltips.Helper.simpleTooltip(e, tooltip);
	},

	/**
	 * GS Events
	 *
	 *
	 */
	onUserChange : function(user) {
		//user : GS.Models.User
		console.debug('User Changed !', user);
		user.on("change:currentBroadcastID", this.onBroadcastChange, this);
		user.on("change:currentBroadcastOwner", this.onBroadcastChange, this);
	},

	onChatActivity : function(m) {
		// m : GS.Models.ChatActivity
		//console.debug('onChatActivity', m);
		if (this.settings.chatNotify) {
			if (m.get('type') == 'message' && m.get('user').id != GS.getLoggedInUserID()) {//don't notify for our own msg
				var t = this.settings.chatNotificationTriggers;
				for (var i = 0; i < length; i++) {
					if (new RegExp('\\b' + t[i].trim() + '\\b').test(m.get('message'))) {
						this.showNotification(m);
						break;
					}
				}
			}
		}
	},
	onSongChange : function(s) {
		// s: GS.Models.QueueSong
		//console.debug('onSongChange', s);
		if (s) {
			if (this.settings.songNotification) {
				this.showNotification(s);
			}
			if (GSX.getAutoVote(s.get('SongID')) != 0) {
				GSX.autoVoteActiveSong(GSX.getAutoVote(s.get('SongID')));
			}
		}
	},

	onBroadcastChange : function() {
		console.debug('onBroadcastChange', arguments);
		//force loading of broadcaster's favorites.
		(GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Users'));
		(GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Songs'));
		(GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getLibrary());
	},

	isInBCHistory : function(songID) {
		var b = GS.getCurrentBroadcast();
		return (b && b.attributes.history && b.attributes.history.findWhere({
			SongID : songID
		}));
	},

	isInBCLibrary : function(songID) {
		var b = GS.getCurrentBroadcast();
		var owner = (b && b.getOwner());
		return (owner && owner.attributes.library && owner.attributes.library.get(songID));
	},
	isBCFriend : function(userID) {
		var owner = (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner());
		return (owner && owner.attributes.favoriteUsers && owner.attributes.favoriteUsers.get(userID));
	},

	getAutoVote : function(songid) {
		return GSX.settings.autoVotes[songid] || 0;
	},

	setAutoVote : function(songid, score) {
		if (score != 0) {
			GSX.settings.autoVotes[songid] = score;
		} else {
			delete GSX.settings.autoVotes[songid];
		}
		GSX.savePrefValue();
		if (score != 0 && GS.getCurrentBroadcast() && GS.getCurrentBroadcast().get('activeSong') && GS.getCurrentBroadcast().get('activeSong').get('SongID') == songid) {
			GSX.autoVoteActiveSong(score);
		}
	},

	autoVoteActiveSong : function(score) {
		if (GS.getCurrentBroadcast()) {
			GS.getCurrentBroadcast().voteActiveSong(score);
			GSX.notice(GS.getCurrentBroadcast().get('activeSong').get('SongName'), {
				title : 'GSX Auto ' + (score > 0 ? 'Upvote' : 'Downvote') + ' !'
			});
		}
	},

	registerListeners : function() {
		var _this = this;
		this.hookAfter(GS.Models.Collections.ChatActivities, 'add', this.onChatActivity);
		//this could be done by adding a callback on 'change:song' on the queue model,
		//but I'm too lazy to update listeners each time the queue changes (Player's view keeps it updated for us)
		this.hookAfter(GS.Views.Player, 'onActiveSongChange', function() {
			_this.onSongChange(this.model.get("player").get("currentQueue").get("activeSong"));
		});
	},

	insertGsxStyle : function() {
		//Green border on favorites/friends
		this.addStyle('.module.chat-activity.friend-activity,.module.song.bc-library {  border-left: 2px solid #66EE77 !important;} .module.song.bc-history .title{color: #881F1F !important;}');
		//auto votes styles
		this.addStyle('.module.song.auto-upvote .title:before { content:"\\21D1"; color:#2f2;} .module.song.auto-downvote .title:before { content:  "\\21D3";color:#F22;}');
		//change layout when skrinked
		this.addStyle('body.app-shrink #now-playing, body.app-shrink #player{right:0px;left:0px;width:100%;}body.app-shrink #queue-btns{display:none;}body.app-shrink #broadcast-menu-btn-group {left:0; position:fixed; top:50px; width:240px; z-index:7001;} body.app-shrink .notification-pill {left: 0px; right: 218px;}');
		this.addStyle('img#toothless-avatar { bottom: 60px;  height: 100px; position: absolute;  right: 40px;}');
	},

	changeSuggestionLayout : function() {
		//show album suggestion, move user name
		this.addStyle('.meta-text.user-link{ position: absolute;  right: 170px;top: 7px; color:#CCC !important; display:inline !important;} .meta-text.suggested-by-text{display:none !important;} .meta-text.suggestion.album{display:inline !important;}');
	},
	enlargeChatbox : function() {
		this.addStyle('.bc-chat-messages-container {background-color: #fff;}.chat-activity.chat-message .inner{width:320px !important;}.chat-activity.chat-info .inner{width:270px !important;}.bc-chat-container {width: 400px !important;}.bc-chat-form-container .bc-chat-input {width: 382px;}');
	},
	removeSharebox : function() {
		this.addStyle('#bc-share{display:none;}.bc-chat-messages-container {top:0px!important;}');
	},

	addChatTimestamps : function() {
		//use existing hidden timestamp span but force display
		this.addStyle('.timestamp {font-size:7pt; color:#999; right: 10px; top: -4px; position: absolute; display:block !important;}');
		//redefine GS timestamp format from "xx second ago" to time display, because it's not correctly refreshed
		GS.Models.ChatActivity.prototype.getFormattedTimestamp = function() {
			var dte = new Date(this.get("timestamp"));
			return dte.toLocaleTimeString();
		};
		/*
		 * //TODO add an option to use " xx ago", this need to force refresh of ChatActivity views.
		 *
		 var renderSelectors = {
		 ".timestamp" : function(m, el) {
		 console.log('render timestamp');
		 var e=_.$one(el);
		 console.log(e);
		 e.innerText(this.model.getFormattedTimestamp());
		 e.attr('title',new Date(this.model.get("timestamp")).toString());
		 }
		 };
		 _.extend(GS.Views.Modules.ChatActivity.prototype.changeModelSelectors, renderSelectors);
		 */

	},
	hookChatRenderer : function() {
		var _this = this;
		this.hookAfter(GS.Views.Modules.ChatActivity, 'update', function() {
			if (_this.settings.showNewChatColor) {
				if (this.model.get('type') == 'message') {
					var isFriend = GSX.isBCFriend(this.model.get('user').id);
					this.$el[isFriend ? 'addClass':'removeClass']('friend-activity');
				}
			}
		});
	},
	hookSongRenderer : function() {
		//redefine song/suggestion display

		// small display: album list, collection, favs...
		var songrender = GS.Views.Modules.SongRow.prototype.changeModelSelectors["&"];
		GS.Views.Modules.SongRow.prototype.changeModelSelectors["&"] = function(e, t) {
			//delegate
			songrender.apply(this, arguments);

			var inBCLibrary = GSX.isInBCLibrary(this.model.get('SongID'));
			var inBCHistory = GSX.isInBCHistory(this.model.get('SongID'));
			var autoDownvote = GSX.getAutoVote(this.model.get('SongID')) == -1;
			var autoUpvote = GSX.getAutoVote(this.model.get('SongID')) == 1;
			this.$el[inBCLibrary ? 'addClass':'removeClass']('bc-library');
			this.$el[inBCHistory ? 'addClass':'removeClass']('bc-history');
			this.$el[autoUpvote ? 'addClass':'removeClass']('auto-upvote');
			this.$el[autoDownvote ? 'addClass':'removeClass']('auto-downvote');
		};
		//Tall display :suggestion, history, now playing
		songrender = GS.Views.Modules.SongRowTall.prototype.changeModelSelectors["&"];
		GS.Views.Modules.SongRowTall.prototype.changeModelSelectors["&"] = function(e, t) {
			songrender.apply(this, arguments);
			//delegate
			var isSuggestion = this.model instanceof GS.Models.BroadcastSuggestion;
			var isHistory = this.grid && this.grid.options && this.grid.options.isBroadcastHistory;
			var upVotes = this.model.get('upVotes') || 0;
			var downVotes = this.model.get('downVotes') || 0;
			var upVote = _.isArray(upVotes) ? upVotes.length : _.toInt(upVotes);
			var downVote = _.isArray(downVotes) ? downVotes.length : _.toInt(downVotes);
			if (!isSuggestion) {
				var votes = this.$el.find('.votes');
				votes.addClass('both-votes');
				votes.find('.downvotes').html(downVote).removeClass('hide');
				votes.find('.upvotes').html(upVote).removeClass('hide');
			} else {
				var votes = this.$el.find('.votes');
				votes.removeClass('both-votes');
				votes.find('.downvotes').addClass('hide');
			}
			if (GSX.settings.forceVoterLoading && _.isArray(upVotes) && upVotes.length > 0) {
				var model = this.model;
				if (GS.Models.User.getCached(upVotes[0]) === null) {
					GS.Models.User.get(upVotes[0]).then(function() {
						//model.trigger('change');
					});
				}
			}
			var inBCLibrary = GSX.isInBCLibrary(this.model.get('SongID'));
			var inBCHistory = GSX.isInBCHistory(this.model.get('SongID'));
			var autoDownvote = GSX.getAutoVote(this.model.get('SongID')) == -1;
			var autoUpvote = GSX.getAutoVote(this.model.get('SongID')) == 1;
			this.$el[inBCLibrary ? 'addClass':'removeClass']('bc-library');
			this.$el[inBCHistory ? 'addClass':'removeClass']('bc-history');
			this.$el[autoUpvote ? 'addClass':'removeClass']('auto-upvote');
			this.$el[autoDownvote ? 'addClass':'removeClass']('auto-downvote');
		};
		//delete this renderers, everything is now done in "&"
		delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".downvotes"];
		delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".upvotes"];
		delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".votes"];

		//install event to display detailled votes
		var events = {
			"mouseenter .downvotes" : "showDownVotes",
			"mouseenter .upvotes" : "showUpVotes",
		};
		_.extend(GS.Views.Modules.SongRowTall.prototype.events, events);
		var showVotes = function(votes, el) {
			var voters = [];
			_.each(votes, function(v) {
				if (GS.Models.User.getCached(v)) {
					voters.push(GS.Models.User.getCached(v).get('Name'));
				} else {
					if (GSX.settings.forceVoterLoading) {
						GS.Models.User.get(v);
					}
					voters.push('--');
				}
			});
			console.log('show votes', votes, voters);
			GSX.tooltip(voters.toString(), el);
		};
		GS.Views.Modules.SongRowTall.prototype.showDownVotes = function(e) {
			console.log(arguments);
			showVotes(this.model.get('downVotes') || [], e);
		};
		GS.Views.Modules.SongRowTall.prototype.showUpVotes = function(e) {
			showVotes(this.model.get('upVotes') || [], e);
		};
	},
	
	
	hookSongContextMenu: function (menus) {
		var songMenu = menus.getContextMenuForSong;
		menus.getContextMenuForSong = function(song, ctx) {
			var m = songMenu.apply(this, arguments);
			var voteSubMenus = [];
			if (GSX.getAutoVote(song.get('SongID')) != 0) {
				voteSubMenus.push({
					key : "CONTEXT_AUTO_DOWNVOTE",
					title : 'Remove from autovote list',
					//customClass: "jj_menu_item_new_playlist",
					action : {
						type : "fn",
						callback : function() {
							GSX.setAutoVote(song.get('SongID'), 0);
							GSX.notice(song.get('SongName'), {
								title : 'Auto vote removed'
							});
							song.trigger('change');
						}
					}
				});
			} else {
				voteSubMenus.push({
					key : "CONTEXT_AUTO_UPVOTE",
					title : 'Upvote !',
					//customClass: "jj_menu_item_new_playlist",
					action : {
						type : "fn",
						callback : function() {
							GSX.notice(song.get('SongName'), {
								title : 'Added to auto upvote'
							});
							GSX.setAutoVote(song.get('SongID'), 1);
							song.trigger('change');
						}
					}
				},{
					key : "CONTEXT_AUTO_DOWNVOTE",
					title : 'DownVote !',
					//customClass: "jj_menu_item_new_playlist",
					action : {
						type : "fn",
						callback : function() {
							GSX.notice(song.get('SongName'), {
								title : 'Added to auto downvote'
							});
							GSX.setAutoVote(song.get('SongID'), -1);
							song.trigger('change');
						}
					}
				});
			}
			m.push({
				key : "CONTEXT_AUTO_VOTE",
				title : 'Automatic Vote',
				type : "sub",
				//customClass: "jj_menu_item_new_playlist",
				src : voteSubMenus
			});

			return m;
		};
	},
	renderPreferences : function(el){
		el.find('#column1').append('<div id="settings-gsx-container" class="control-group preferences-group">\
		<h2>Grooveshark Extended Settings</h2>\
		<ul class="controls">\
			<li>\
				<input id="settings-gsx-biggerChat" value="1" type="checkbox">\
				<label for="settings-gsx-biggerChat">Enlarge the Broadcast chatbox.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-hideSharebox" value="1" type="checkbox">\
				<label for="settings-gsx-hideSharebox" >Remove share box on top of Broadcast chat. (more space for chat)</label>\
			</li>\
			<li>\
				<input id="settings-gsx-showTimestamps" value="1" type="checkbox">\
				<label for="settings-gsx-showTimestamps">Show timestamps on chat activities.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-showNewChatColor" value="1" type="checkbox">\
				<label for="settings-gsx-showNewChatColor" >Display messages sent by friends of the current broadcaster in different color.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-changeSuggestionLayout" value="1" type="checkbox">\
				<label for="settings-gsx-changeSuggestionLayout">Change layout of suggestions. <small>(display song\'s album AND suggester)</small></label>\
			</li>\
			<li>\
				<input id="settings-gsx-forceVoterLoading" value="1" type="checkbox">\
				<label for="settings-gsx-forceVoterLoading">Force loading of voter\'s name. <small>(will try to fetch users\' names even if in cache.<strong>BE CAREFULL</strong>, it can be a lot if you are in a broadcast with 300+ listeners)</small></label>\
			</li>\
			<li>\
				<input id="settings-gsx-songNotification" value="1" type="checkbox">\
				<label for="settings-gsx-songNotification">Show a desktop notification when active song changes.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-chatNotification" value="1" type="checkbox">\
				<label for="settings-gsx-chatNotification">Show a desktop notification when someone post a message containing one of these words (1/line, case sensitive):</label>\
				<br \><textarea id="settings-gsx-chatNotificationTriggers" rows="5" cols="50"></textarea>\
				<img id="toothless-avatar" src="http://images.gs-cdn.net/static/users/21218701.png" />\
			</li>\
			</ul>\
			</div>');
		$(el.find('#settings-gsx-biggerChat')).prop("checked",GSX.settings.biggerChat);
		$(el.find('#settings-gsx-hideSharebox')).prop("checked",GSX.settings.hideShareBox);
		$(el.find('#settings-gsx-showTimestamps')).prop("checked",GSX.settings.chatTimestamps);
		$(el.find('#settings-gsx-showNewChatColor')).prop("checked",GSX.settings.showNewChatColor);
		$(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked",GSX.settings.changeSuggestionLayout);
		$(el.find('#settings-gsx-forceVoterLoading')).prop("checked",GSX.settings.forceVoterLoading);
		$(el.find('#settings-gsx-songNotification')).prop("checked",GSX.settings.songNotification);
		$(el.find('#settings-gsx-chatNotification')).prop("checked",GSX.settings.chatNotify);
		
		if( !_.isArray(GSX.settings.chatNotificationTriggers)){
			var defaultTrigger = (GS.Models.User.getCached(GS.getLoggedInUserID()) && new Array(GS.Models.User.getCached(GS.getLoggedInUserID()).get('Name')));
			GSX.settings.chatNotificationTriggers = defaultTrigger;
		}
		var chatTriggers = GSX.settings.chatNotificationTriggers;
		var s ='';
		for (var i=0; i < chatTriggers.length; i++) {  s+=chatTriggers[i]+'\n';};
		
		$(el.find('#settings-gsx-chatNotificationTriggers')).val(s);
		$(el.find('#toothless-avatar')).on('click', function(){
			console.debug('GSX Settings: ',GSX.settings);
			GSX.notice('Meep !');
			GSX.settings.friendOfToothless=true;
			GSX.savePrefValue();
		});
	},
	submitPreferences : function(el){
		GSX.settings.biggerChat = $(el.find('#settings-gsx-biggerChat')).prop("checked");
		GSX.settings.hideShareBox= $(el.find('#settings-gsx-hideSharebox')).prop("checked");
		GSX.settings.chatTimestamps=$(el.find('#settings-gsx-showTimestamps')).prop("checked");
		GSX.settings.showNewChatColor=$(el.find('#settings-gsx-showNewChatColor')).prop("checked");
		GSX.settings.changeSuggestionLayout=$(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked");
		GSX.settings.forceVoterLoading=$(el.find('#settings-gsx-forceVoterLoading')).prop("checked");
		GSX.settings.songNotification=$(el.find('#settings-gsx-songNotification')).prop("checked");
		GSX.settings.chatNotify=$(el.find('#settings-gsx-chatNotification')).prop("checked");
		GSX.settings.chatNotificationTriggers=$(el.find('#settings-gsx-chatNotificationTriggers')).val().trim().split('\n');
		
		GSX.savePrefValue();
		console.debug('GSX Settings saved',GSX.settings);
		
	}
};
( function() {

		var gsxHack = function() {
			if ( typeof _ === "undefined") {
				window.setTimeout(gsxHack, 5);
			} else {
				GSX.init();
			}
		};
		gsxHack();
	}()
);
