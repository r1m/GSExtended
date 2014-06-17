// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @description Enhance Grooveshark Broadcast functionality
// @downloadURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js
// @updateURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js
// @include     http://grooveshark.com/*
// @version     1.5.4
// @run-at document-end
// @grant  none 
// ==/UserScript==
dependencies = {
	js : ['https://ramouch0.github.io/GSExtended/lib/gsextended.lib.min.js'],
	css : ['https://ramouch0.github.io/GSExtended/lib/magnific-popup.css']
};
	
GSX = {
    settings: {
        notificationDuration: 3500,
        chatNotify: false,
        chatHotMessage: true,
        chatNotificationTriggers: {},
        songNotification: true,
        biggerChat: true,
        hideShareBox: true,
        hideSuggestionBox: false,
        chatTimestamps: true,
        showNewChatColor: true,
        changeSuggestionLayout: true,
        forceVoterLoading: false,
        autoVotesTimer: 6000,
		replaceChatLinks: true,
		inlineChatImages: false,
        autoVotes: {}

    },
    init: function () {
		GSX.showRealVotes = false;
		GSX.chrome = (/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())) ;
        //bind events on GSX object;
        _.bindAll(this, 'onChatActivity', 'onSongChange', 'isInBCHistory', 'isInBCLibrary', 'isBCFriend');

        console.info('-- Monkeys rock! ---');
        console.log('Init GSX');
        //install render hook to know when GS App is ready
        GSXTool.hookAfter(GS.Views.Application, 'render', GSX.afterGSAppInit);
        // install setter hook to know when tier2 is loaded
        Object.defineProperty(GS, "contextMenus", {
            set: function (y) {
                this._contextMenus = y;
                GSX.afterTier2Loaded(y);
            },
            get: function (y) {
                return this._contextMenus;
            }
        });
        Object.defineProperty(GS.Views.Pages, "Broadcast", {
            set: function (y) {
                this._Bct = y;
                GSX.afterUserPackageLoaded();
            },
            get: function (y) {
                return this._Bct;
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
		if (this.settings.hideSuggestionBox) {
            console.log('remove suggestion box');
            this.removeSuggestionBox();
        }
        if (this.settings.chatTimestamps) {
            console.log('add timestamps');
            this.addChatTimestamps();
        }
        if (this.settings.changeSuggestionLayout) {
            console.log('changeSuggestion layout');
            this.changeSuggestionLayout();
        }
        if (this.settings.friendOfToothless) {
            console.info('MEEEP !');
            this.forbiddenFriendship();
        }

        this.notice('Where are my dragons ?', {
            title: 'GSX',
            duration: 2000
        });
        console.info('-- Dragons too! ---');
    },
		
    /*
     *
     */
    afterGSAppInit: function () {
        //Let's see your dirtiest secrets !
        window.gsAppModelExposed = this.model;
        window.gsAppExposed = this;
        //Sorry
        this.model.on('change:user', function () {
            GSX.onUserChange(this.model.get('user'));
        }, this);



        GSX.onUserChange(this.model.get('user'));
        console.info('-- In da place ---');
        GSX.notice('Night Fury! Get down!', {
            title: 'GSX',
            duration: 2000
        });


    },

    afterTier2Loaded: function (menus) {
        GSX.hookSongContextMenu(menus);
        //
        GSXTool.hookAfter(GS.Views.Pages.Settings, "renderPreferences", function () {
            GSX.renderPreferences(this.$el);
        });
        GSXTool.hookAfter(GS.Views.Pages.Settings, "submitPreferences", function () {
            GSX.submitPreferences(this.$el);
        });
        console.info('Caught the fish !');
        GSX.notice('Toothless! It\'ll be fine!', {
            title: 'GSX',
            duration: 2000
        });
    },

    afterUserPackageLoaded: function () {
        GSX.hookBroadcastRenderer();
        GSX.notice('All right, it\'s go time, it\'s go time...', {
            title: 'GSX',
            duration: 2000
        });
    },

	savePrefValue: function (settings) {
        this.settings = settings || this.settings;
        localStorage.setItem('gsx', JSON.stringify(this.settings));
    },
    readPrefValue: function () {
        return this.settings = _.extend(this.settings, JSON.parse(localStorage.getItem('gsx')));
    },
    deletePrefValue: function () {
        localStorage.removeItem('gsx');
    },


    /**
     * Toothless is your friend !
     */
    forbiddenFriendship: function () {
        GS.Models.Subscription.prototype.isPremium = function () {
            return true;
        };
        GS.Models.Subscription.prototype.isPlus = function () {
            return true;
        };
        GS.Models.Subscription.prototype.isAnywhere = function () {
            return true;
        };
    },

    /**
     * Ask user for notification permission
     */
    grantNotificationPermission: function () {
        Notification.requestPermission(function (status) {
            if (Notification.permission !== status) {
                Notification.permission = status;
            }
        });
    },

    /**
     * Show a desktop notification of the message ot the song
     * in : a ChatActivity or a QueueSong
     */
    showNotification: function (messageOrSong) {
        var title, msg, icon, tag;
        if (messageOrSong instanceof GS.Models.ChatActivity) {
            title = messageOrSong.get('user').get('Name');
            icon = messageOrSong.get('user').getImageURL();
            msg = messageOrSong.get('message');
            tag = 'gsx_msg';
        } else if (messageOrSong instanceof GS.Models.QueueSong) {
            msg = messageOrSong.get('ArtistName') + ' \u2022 ' + messageOrSong.get('AlbumName');
            icon = messageOrSong.getImageURL();
            title = messageOrSong.get('SongName');
            tag = 'gsx_song';
        } else {
			return;
		}
        if (!("Notification" in window)) {
            console.log("No desktop notification support");
        } else if (Notification.permission === "granted") {
            // html5 web notification
            var notif = new Notification(title, {
                body: msg,
                icon: icon
                //tag: tag
            });
            window.setTimeout(function () {
                notif.close();
            }, GSX.settings.notificationDuration);
        }

    },
    /**
     * show a GS notification on bottom off the windows
     */
    notice: function (description, options) {
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

    /**
     *Show a tooltip on the hoverred element.
     * e: mouseevent
     * text : message to display
     */
    tooltip: function (text, e) {
        e.stopPropagation();
        var tooltip = new GS.Views.Tooltips.Helper({
            text: text
        });
        GS.Views.Tooltips.Helper.simpleTooltip(e, tooltip);
    },

    /**
     * GS Events
     *
     *
     */
    onUserChange: function (user) {
        //user : GS.Models.User
        console.debug('User Changed !', user);
        user.on("change:currentBroadcastID", this.onBroadcastChange, this);
        user.on("change:currentBroadcastOwner", this.onBroadcastChange, this);
    },

    onChatActivity: function (m) {
        // m : GS.Models.ChatActivity
        //console.debug('onChatActivity', m);
        if (this.settings.chatNotify) {
            if (m.get('type') == 'message' && m.get('user').id != GS.getLoggedInUserID()) { //don't notify for our own msg
				if (GSX.isHotMessage(m.get('message'))) {
					this.showNotification(m);
				}			
            }
        }
    },
    onSongChange: function (s) {
        // s: GS.Models.QueueSong
        //console.debug('onSongChange', s);
        if (s) {
            if (this.settings.songNotification) {
                this.showNotification(s);
            }
            if (GSX.getAutoVote(s.get('SongID')) != 0) {
                window.setTimeout(function () {
                    GSX.autoVoteActiveSong(GSX.getAutoVote(s.get('SongID')), s.get('SongID'));
                }, GSX.settings.autoVotesTimer);

            }
        }
        if (GS.getCurrentBroadcast()) {
            //force display refresh for approved suggestion -> update history
            GS.getCurrentBroadcast().attributes.approvedSuggestions.each(function (s) {
                s.trigger('change');
            });
        }
    },

    onBroadcastChange: function () {
        console.debug('onBroadcastChange', arguments);
        //force loading of broadcaster's favorites.
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Users').then(function(){}));
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Songs').then(function(){}));
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getLibrary().then(function(){}));
    },

    isInBCHistory: function (songID) {
        var b = GS.getCurrentBroadcast();
        return (b && b.attributes.history && b.attributes.history.findWhere({
            SongID: songID
        }));
    },

    isInBCLibrary: function (songID) {
        var b = GS.getCurrentBroadcast();
        var owner = (b && b.getOwner());
        return (owner && owner.attributes.library && owner.attributes.library.get(songID));
    },
	
	isInRejectedList: function (songID) {
        var b = GS.getCurrentBroadcast();
        return b && GS.getCurrentBroadcast().get('blockedSuggestionSongIDs').indexOf(songID) != -1;
    },
	
    isBCFriend: function (userID) {
        var owner = (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner());
        return (owner && owner.attributes.favoriteUsers && owner.attributes.favoriteUsers.get(userID));
    },

    isCurrentlyListening: function (userID) {
        return GS.getCurrentBroadcast() && (GS.getCurrentBroadcast().get('listeners').get(userID) != undefined);
    },
	
	isHotMessage : function (message){
		var hot = false;
		var t = GSX.settings.chatNotificationTriggers;
		for (var i = 0; i < t.length; i++) {
			if (new RegExp('\\b' + t[i].trim() + '\\b').test(message)) {
				hot = true;
				break;
			}
		}
		return hot;
	},

    getAutoVote: function (songid) {
        return GSX.settings.autoVotes[songid] || 0;
    },

    setAutoVote: function (songid, score) {
        if (score != 0) {
            GSX.settings.autoVotes[songid] = score;
        } else {
            delete GSX.settings.autoVotes[songid];
        }
        GSX.savePrefValue();
        if (score != 0 && GS.getCurrentBroadcast() && GS.getCurrentBroadcast().get('activeSong') && GS.getCurrentBroadcast().get('activeSong').get('SongID') == songid) {
            GSX.autoVoteActiveSong(score, songid);
        }
    },

    autoVoteActiveSong: function (score, songid) {
        if (GS.getCurrentBroadcast()) {
            if (GS.getCurrentBroadcast().get('activeSong').get('SongID') == songid) {
                GS.getCurrentBroadcast().voteActiveSong(score);
                GSX.notice(GS.getCurrentBroadcast().get('activeSong').get('SongName'), {
                    title: 'GSX Auto ' + (score > 0 ? 'Upvote' : 'Downvote') + ' !'
                });
            } else {
                //we give up
                GSX.notice('Autovote failed, you\'re not in sync with broadcast', {
                    title: 'GSX Autovote failed !'
                });
            }

        }
    },


    /****** Now the dirty part *********/

    registerListeners: function () {
        var _this = this;
        GSXTool.hookAfter(GS.Models.Collections.ChatActivities, 'add', this.onChatActivity);
        //this could be done by adding a callback on 'change:song' on the queue model,
        //but I'm too lazy to update listeners each time the queue changes (Player's view keeps it updated for us)
        GSXTool.hookAfter(GS.Views.Player, 'onActiveSongChange', function () {
            _this.onSongChange(this.model.get("player").get("currentQueue").get("activeSong"));
        });
    },

    insertGsxStyle: function () {
        //Green border on favorites/friends
        GSXTool.addStyle('.chat-activity.hot-activity,.bc-rejected{ background-color : #FFEBEB;} .chat-activity.friend-activity{ border-left: 3px solid #B3D8F1 !important;} .module.song.bc-library,.chat-activity.bc-library { border-left: 2px solid #66EE77 !important;} .module.song.bc-history .title{color: #881F1F !important;}');
        //auto votes styles
        GSXTool.addStyle('.module.song.auto-upvote .title:before { content:"\\1F44D"; color:#09B151; font-family: Segoe UI Symbol, Symbola ;} .module.song.auto-downvote .title:before { content:  "\\1F44E";color:#F22; font-family: Segoe UI Symbol, Symbola;}');
        //change layout when skrinked
        GSXTool.addStyle('body.app-shrink #logo,body.app-shrink #logo.active,body.app-shrink #logo .logo-link {width:36px;} body.app-shrink #now-playing, body.app-shrink #player{right:0px;left:0px;width:100%;}body.app-shrink #queue-btns{display:none;}body.app-shrink #broadcast-menu-btn-group {left:0; position:fixed; top:50px; width:240px; z-index:7001;} body.app-shrink .notification-pill {left: 0px; right: 218px;}');
        //toothless img in preferences
        GSXTool.addStyle('img#toothless-avatar { bottom: 60px;  height: 100px; position: absolute;  right: 40px;}');
		//inline images/canvas
        GSXTool.addStyle('.chat-activity canvas,.chat-activity img{max-width: 100%; max-height: 300px; height:auto; margin:0;}');
        GSXTool.addStyle('.chat-activity.chat-info.songChange { background-color: #FFF7ED;}');
    },

    changeSuggestionLayout: function () {
        //show album suggestion, move user name
        GSXTool.addStyle('.meta-text.user-link{ position: absolute;  right: 170px;top: 3px; color:#CCC !important; display:inline !important;} .meta-text.suggested-by-text{display:none !important;} .meta-text.suggestion.album{display:inline !important;}');
    },
    enlargeChatbox: function () {
        GSXTool.addStyle('.chat-activity.chat-message .inner{width:320px !important;}.chat-activity.chat-info .inner{width:270px !important;}.bc-chat-container {width: 400px !important;}.bc-chat-form-container .bc-chat-input {width: 282px !important;}\
		#page, #page-nav, #page-header .inner img {width:1110px !important;} #page-header .inner .song-data-container {width:936px !important;} #page-content, #column1.full{width:1050px;} #column2{width:390px}');
    },
    removeSharebox: function () {
        GSXTool.addStyle('#bc-share{display:none;}.bc-chat-messages-container {top:0px!important;}');
    },
	removeSuggestionBox: function () {
        GSXTool.addStyle('#bc-add-songs { display: none;}');
    },

    addChatTimestamps: function () {
        //use existing hidden timestamp span but force display
        GSXTool.addStyle('.timestamp {font-size:7pt; color:#999; right: 10px; top: -4px; position: absolute; display:block !important;}');
        //redefine GS timestamp format from "xx second ago" to time display, because it's not correctly refreshed
        GS.Models.ChatActivity.prototype.getFormattedTimestamp = function () {
            var dte = new Date(this.get("timestamp"));
            return dte.toLocaleTimeString();
        };
    },
    hookBroadcastRenderer: function () {
        var toggleCount = function () {
                GSX.showRealVotes = !GSX.showRealVotes;
                GS.getCurrentBroadcast().get('suggestions').each(function(s){
					s.trigger("change"); // force views update
				});
				GS.getCurrentBroadcast().get('approvedSuggestions').each(function(s){
					s.trigger("change"); // force views update
				});
                $(this).html(GSX.showRealVotes ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
            };
        GSXTool.hookAfter(GS.Views.Pages.Broadcast, 'showSuggestions', function () {
            if (this.$el.find('#gsx-votes').length <= 0) {
                var btn = $('<a class="btn right" id="gsx-votes" style="float:right"></a>');
				btn.html(GSX.showRealVotes ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
                btn.prependTo(this.$el.find('#bc-grid-title')).on('click', toggleCount);
            }
        });
    },
    hookChatRenderer: function () {
        GSXTool.hookAfter(GS.Views.Modules.ChatActivity, 'update', function () {
            if (GSX.settings.showNewChatColor) {
                var isFriend = this.model.get('user') && GSX.isBCFriend(this.model.get('user').id);
                var isBCFavs = this.model.get('song') && GSX.isInBCLibrary(this.model.get('song').get('SongID'));
                this.$el[isFriend ? 'addClass' : 'removeClass']('friend-activity');
                this.$el[isBCFavs ? 'addClass' : 'removeClass']('bc-library');
            }
			if (GSX.settings.chatHotMessage) {
				var isHotMsg = this.model.get('message') && GSX.isHotMessage(this.model.get('message'));
				this.$el[isHotMsg ? 'addClass' : 'removeClass']('hot-activity');
            }
        });
		GSXTool.hookAfter(GS.Views.Modules.ChatActivity, 'completeRender', function () {
            if (GSX.settings.replaceChatLinks) {
				if(this.model.get('type') == "message"){
					var spanmsg = this.$el.find('span.message');
					GSXTool.magnify( spanmsg, GSX.settings.inlineChatImages);
					if(spanmsg.html().toLowerCase().indexOf('[sp') !== -1){
						spanmsg.on('click', function(){
							
							var txt = $(this).text();
							//rot13 the message to hide spoilers
							var msg = txt.replace(/\[(sp.*)\](.+)/ig, function(m,tag,spoil,off,str){ return '['+tag+']'+ GSXTool.rot13(spoil);});
							$(this).text(msg);
							$(this).off('click');
							GSXTool.magnify( $(this), GSX.settings.inlineChatImages);
						});
					}
				}
            }
			this.$el.find('.img-container').addClass('mfp-zoom');
        });
		GS.Views.Modules.ChatActivity.prototype.events['click .img-container'] = 'onThumbnailClick';
		GS.Views.Modules.ChatActivity.prototype.onThumbnailClick = function(){
			var imglink = false;
			if(!this.model.get('song')){
				var picture = this.model.get('user').get('Picture');
				if ( picture ){
					imglink = '//images.gs-cdn.net/static/users/'+picture;
				}
			}else{
				var picture = this.model.get('song').get('CoverArtFilename');
				if ( picture ){
					imglink = '//images.gs-cdn.net/static/albums/500_'+picture;
				}
			}
			if(imglink){
				$.magnificPopup.open(_.defaults(
					{	type: 'image',
						items: {
							src: imglink
						}
					},GSXmagnifyingSettings));
			}
		};
		
		var sendFct = GS.Models.Broadcast.prototype.sendChatMessage;
		GS.Models.Broadcast.prototype.sendChatMessage = function(msg){
			if(msg.toLowerCase().indexOf('[sp') !== -1){
				//rot13 the message to hide spoilers
				msg = msg.replace(/\[(sp.*)\](.+)/ig, function(m,tag,spoil,off,str){ return '['+tag+'] '+ GSXTool.rot13(spoil);});
			}
			sendFct.call(this,msg);
		};
    },
    /** Redefine song view renderer */
    hookSongRenderer: function () {
        //redefine song/suggestion display
        var gsxAddSongClass = function (el, songID) {
                // add classes for history/library/auto votes
                //song is in BC library
                el[GSX.isInBCLibrary(songID) ? 'addClass' : 'removeClass']('bc-library');
                //song is in BC history
                el[GSX.isInBCHistory(songID) ? 'addClass' : 'removeClass']('bc-history');
                el[GSX.isInRejectedList(songID) ? 'addClass' : 'removeClass']('bc-rejected');
                // song is in auto votes list
                el[GSX.getAutoVote(songID) == 1 ? 'addClass' : 'removeClass']('auto-upvote');
                el[GSX.getAutoVote(songID) == -1 ? 'addClass' : 'removeClass']('auto-downvote');

            };

        // small display: album list, collection, favs...
        var songrender = GS.Views.Modules.SongRow.prototype.changeModelSelectors["&"];
        GS.Views.Modules.SongRow.prototype.changeModelSelectors["&"] = function (e, t) {
            //delegate
            songrender.apply(this, arguments);
            var el = _.$one(t);
            gsxAddSongClass(el, this.model.get('SongID'));
        };
        //Tall display :suggestion, history, now playing
        songrender = GS.Views.Modules.SongRowTall.prototype.changeModelSelectors["&"];

        renderers = {
            "&": function (e, t) {
                songrender.apply(this, arguments);
                var el = _.$one(t);
                //delegate
                var isSuggestion = this.model instanceof GS.Models.BroadcastSuggestion;
                var isHistory = this.grid && this.grid.options && this.grid.options.isBroadcastHistory;
                var upVotes = this.model.get('upVotes') || 0;
                var downVotes = this.model.get('downVotes') || 0;
                var upVote = _.isArray(upVotes) ? upVotes.length : _.toInt(upVotes);
                var downVote = _.isArray(downVotes) ? downVotes.length : _.toInt(downVotes);

                var suggester = null;

                if (isSuggestion && _.isArray(upVotes) && upVotes.length > 0) {
                    //if we can't find the user in cache
                    if (GS.Models.User.getCached(upVotes[0]) === null) {
                        if (GSX.settings.forceVoterLoading) {
                            var _thismodel = this.model;
                            //force a fetch, then trigger a model change
                            GS.Models.User.get(upVotes[0]).then(function (u) {
                                //suggester is setted by GS server or Broadcast on suggestion change. 
                                //I don't know how to force a refresh without setting it myself
                                _thismodel.set("suggester", u);
                                _thismodel.trigger("change");

                            });
                        }
                    }
                    suggester = GS.Models.User.getCached(this.model.get('upVotes')[0]);
					
					if(_.isArray(upVotes) && GSX.showRealVotes && !(this.grid.options && this.grid.options.hideApprovalBtns)){
						c = 0;
						upVotes.forEach(function (user) {
							//count voter currently in BC
							if (GSX.isCurrentlyListening(user)) c++;
						});
						upVote = upVote + '<em style="font-size:smaller">-' + c + '</em>';
					}
                }
				if(GS.getCurrentBroadcast() && this.model instanceof GS.Models.BroadcastSong && this.activeSong ){
					
					if(el.find('.user-link').length === 0){
						el.find('.meta-inner').append( $('<a class="user-link open-profile-card meta-text"></a>'));
					}//playing song
					var suggestion = GS.getCurrentBroadcast().get('approvedSuggestions').get(this.model.get('SongID'));
					suggester = suggestion && GS.Models.User.getCached(suggestion.get('upVotes')[0]);
				}

                el.find('.votes')[isSuggestion ? 'removeClass' : 'addClass']('both-votes');
                el.find('.upvotes').html(upVote).removeClass('hide');
                el.find('.downvotes').html(downVote)[isSuggestion ? 'addClass' : 'removeClass']('hide');

                var ulk = el.find('.user-link')[suggester ? 'removeClass' : 'addClass']('hide');
                suggester ? ulk.attr("href", suggester.toUrl()).html(suggester.escape("Name")).data("userId", suggester.get("UserID")) : ulk.attr("href", '#').html('').data("userId", null);

                gsxAddSongClass(el, this.model.get('SongID'));
				el.find('.img').addClass('mfp-zoom');
            }
        };
        _.extend(GS.Views.Modules.SongRowTall.prototype.changeModelSelectors, renderers);

        //delete these renderers, everything is now done in "&"
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".downvotes"];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".upvotes"];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".votes"];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors[".user-link"];


        var showVotes = function (votes, el) {
                if (_.isArray(votes) && votes.length > 0) {
                    var voters = [];
                    var votersLeft = [];
                    _.each(votes, function (v) {
                        var name = ' ? ';
                        if (GS.Models.User.getCached(v)) {
                            name = GS.Models.User.getCached(v).get('Name');
                        } else if (GSX.settings.forceVoterLoading) {
                            GS.Models.User.get(v);
                        }
                        if (GSX.isCurrentlyListening(v)) {
                            voters.push(name);
                        } else {
                            votersLeft.push(name);
                        }
                    });
                    console.log('Show votes', votes, voters, votersLeft);
					var separator = (GSX.chrome ? ' \u21A3 ':' `\uD83D\uDEAA.. ');//chrome can't display the door emoji
                    GSX.tooltip(voters.length + ': ' + voters.join(', ') + (votersLeft.length > 0 ? separator + votersLeft.join(', ') : ''), el);
                } else {
                    console.log('Show votes, number', votes);
                    GSX.tooltip('-', el);
                }

            };
        GS.Views.Modules.SongRowTall.prototype.showDownVotes = function (e) {
            showVotes(this.model.get('downVotes') || [], e);
        };
        GS.Views.Modules.SongRowTall.prototype.showUpVotes = function (e) {
            console.log('Upvotes', this.model.get('SongID'), this.model.get('SongName'), this);
            showVotes(this.model.get('upVotes') || [], e);
        };
		GS.Views.Modules.SongRowTall.prototype.openAlbumArt = function (e) {
			var picture = this.model.get('CoverArtFilename');
			if ( picture ){
				imglink = '//images.gs-cdn.net/static/albums/500_'+picture;
				$.magnificPopup.open(_.defaults(
					{	type: 'image',
						items: {
							src: imglink
						}
					},GSXmagnifyingSettings));
			}
        };
        //install event to display detailed votes
        var events = {
            "mouseenter .downvotes": "showDownVotes",
            "mouseenter .upvotes": "showUpVotes",
            "click .img": "openAlbumArt"
        };
        _.extend(GS.Views.Modules.SongRowTall.prototype.events, events);
    },

    /** intercept song context menu*/
    hookSongContextMenu: function (menus) {
        var songMenu = menus.getContextMenuForSong;
        menus.getContextMenuForSong = function (song, ctx) {
            var m = songMenu.apply(this, arguments);
            //define sub-menu
            var voteSubMenus = [];
            if (GSX.getAutoVote(song.get('SongID')) != 0) {
                voteSubMenus.push({
                    key: "CONTEXT_AUTO_DOWNVOTE",
                    title: 'Remove from autovote list',
                    //customClass: "jj_menu_item_new_playlist",
                    action: {
                        type: "fn",
                        callback: function () {
                            GSX.setAutoVote(song.get('SongID'), 0);
                            GSX.notice(song.get('SongName'), {
                                title: 'Auto vote removed'
                            });
                            song.trigger('change');
                        }
                    }
                });
            } else {
                voteSubMenus.push({
                    key: "CONTEXT_AUTO_UPVOTE",
                    title: 'Upvote !',
                    action: {
                        type: "fn",
                        callback: function () {
                            GSX.notice(song.get('SongName'), {
                                title: 'Added to auto upvote'
                            });
                            GSX.setAutoVote(song.get('SongID'), 1);
                            song.trigger('change');
                        }
                    }
                }, {
                    key: "CONTEXT_AUTO_DOWNVOTE",
                    title: 'Downvote !',
                    action: {
                        type: "fn",
                        callback: function () {
                            GSX.notice(song.get('SongName'), {
                                title: 'Added to auto downvote'
                            });
                            GSX.setAutoVote(song.get('SongID'), -1);
                            song.trigger('change');
                        }
                    }
                });
            }
            //push auto-vote menu
            m.push({
                key: "CONTEXT_AUTO_VOTE",
                title: 'Automatic Vote',
                type: "sub",
                src: voteSubMenus
            });

            return m;
        };
    },

    /**
     * After GS renderPreferences page, we insert our own settings
     */
    renderPreferences: function (el) {
        el.find('#column1').append('<div id="settings-gsx-container" class="control-group preferences-group">\
		<h2>Grooveshark Extended Settings</h2>\
		<ul class="controls">\
			<li>\
				<input id="settings-gsx-biggerChat" type="checkbox">\
				<label for="settings-gsx-biggerChat">Enlarge the Broadcast chatbox.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-hideSharebox" type="checkbox">\
				<label for="settings-gsx-hideSharebox" >Remove share box on top of Broadcast chat. (more space for chat)</label>\
			</li>\
			<li>\
				<input id="settings-gsx-showTimestamps" type="checkbox">\
				<label for="settings-gsx-showTimestamps">Show timestamps on chat activities.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-showNewChatColor" type="checkbox">\
				<label for="settings-gsx-showNewChatColor" >Display messages sent by friends of the current broadcaster in different color.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-replaceChatLinks" type="checkbox">\
				<label for="settings-gsx-replaceChatLinks" >Automatically replace links and display media in a popup.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-inlineChatImages" type="checkbox">\
				<label for="settings-gsx-inlineChatImages" >Insert inline images in chat box instead of a links.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-changeSuggestionLayout" type="checkbox">\
				<label for="settings-gsx-changeSuggestionLayout">Change layout of suggestions. <em>(display song\'s album AND suggester)</em></label>\
			</li>\
			<li>\
				<input id="settings-gsx-hideSuggestionBox" type="checkbox">\
				<label for="settings-gsx-hideSuggestionBox">Remove suggestion box</label>\
			</li>\
			<li>\
				<input id="settings-gsx-forceVoterLoading" type="checkbox">\
				<label for="settings-gsx-forceVoterLoading">Force loading of voter\'s name. <em>(will try to fetch users\' names if not in cache.<strong>BE CAREFULL</strong>, it can be a lot if you are in a broadcast with 300+ listeners)</em></label>\
			</li>\
			<li>\
				<input id="settings-gsx-songNotification" type="checkbox">\
				<label for="settings-gsx-songNotification">Show a desktop notification when active song changes.</label>\
			</li>\
			<li>\
				<input id="settings-gsx-chatNotification" type="checkbox">\
				<label for="settings-gsx-chatNotification">Show a desktop notification when someone post a message containing one of these words (1/line, case sensitive):</label>\
				<br \><textarea id="settings-gsx-chatNotificationTriggers" rows="5" cols="50"></textarea>\
			</li>\
			<li>\
				<input id="settings-gsx-chatHotMessage" type="checkbox">\
				<label for="settings-gsx-chatHotMessage">Highlight messages with theses keywords.</label>\
			</li>\
			<li class="crossfade hide" id="notification-duration">\
				<label for="settings-gsx-notificationDuration">Duration of notifications in miliseconds <b>(ONLY works in Chrome !)</b></label>\
				<input id="settings-gsx-notificationDuration" type="text" size="10">\
			</li>\
			<li class="crossfade" id="autovote-timer">\
				<label for="settings-gsx-autoVotesTimer">Waiting time before autovote in miliseconds (change if you are always out of sync)</label>\
				<input id="settings-gsx-autoVotesTimer" type="text" size="10">\
			</li>\
			</ul>\
			<img id="toothless-avatar" src="http://images.gs-cdn.net/static/users/21218701.png" />\
			</div>');
        $(el.find('#settings-gsx-biggerChat')).prop("checked", GSX.settings.biggerChat);
        $(el.find('#settings-gsx-hideSharebox')).prop("checked", GSX.settings.hideShareBox);
        $(el.find('#settings-gsx-hideSuggestionBox')).prop("checked", GSX.settings.hideSuggestionBox);
        $(el.find('#settings-gsx-showTimestamps')).prop("checked", GSX.settings.chatTimestamps);
        $(el.find('#settings-gsx-replaceChatLinks')).prop("checked", GSX.settings.replaceChatLinks);
        $(el.find('#settings-gsx-inlineChatImages')).prop("checked", GSX.settings.inlineChatImages);
        $(el.find('#settings-gsx-showNewChatColor')).prop("checked", GSX.settings.showNewChatColor);
        $(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked", GSX.settings.changeSuggestionLayout);
        $(el.find('#settings-gsx-forceVoterLoading')).prop("checked", GSX.settings.forceVoterLoading);
        $(el.find('#settings-gsx-songNotification')).prop("checked", GSX.settings.songNotification);
        $(el.find('#settings-gsx-chatNotification')).prop("checked", GSX.settings.chatNotify);
        $(el.find('#settings-gsx-chatHotMessage')).prop("checked", GSX.settings.chatHotMessage);
        $(el.find('#settings-gsx-notificationDuration')).prop("value", GSX.settings.notificationDuration);
        $(el.find('#settings-gsx-autoVotesTimer')).prop("value", GSX.settings.autoVotesTimer);


        if (!_.isArray(GSX.settings.chatNotificationTriggers)) {
            var defaultTrigger = (GS.Models.User.getCached(GS.getLoggedInUserID()) && new Array(GS.Models.User.getCached(GS.getLoggedInUserID()).get('Name')));
            GSX.settings.chatNotificationTriggers = defaultTrigger;
        }
        var chatTriggers = GSX.settings.chatNotificationTriggers;
        var s = '';
        for (var i = 0; i < chatTriggers.length; i++) {
            s += chatTriggers[i] + '\n';
        }

        $(el.find('#settings-gsx-chatNotificationTriggers')).val(s);
        $(el.find('#toothless-avatar')).on('click', function () {
            console.debug('GSX Settings: ', GSX.settings);
            GSX.notice('Meep !');
            GSX.settings.friendOfToothless = true;
            GSX.savePrefValue();
        });
        if (GSX.chrome) {
            $(el.find('#notification-duration')).removeClass('hide');
        }
    },
    /**
     * On GS submitPreferences save, we store our own settings
     */
    submitPreferences: function (el) {
        GSX.settings.biggerChat = $(el.find('#settings-gsx-biggerChat')).prop("checked");
        GSX.settings.hideShareBox = $(el.find('#settings-gsx-hideSharebox')).prop("checked");
        GSX.settings.hideSuggestionBox = $(el.find('#settings-gsx-hideSuggestionBox')).prop("checked");
        GSX.settings.chatTimestamps = $(el.find('#settings-gsx-showTimestamps')).prop("checked");
        GSX.settings.replaceChatLinks = $(el.find('#settings-gsx-replaceChatLinks')).prop("checked");
        GSX.settings.inlineChatImages = $(el.find('#settings-gsx-inlineChatImages')).prop("checked");
        GSX.settings.showNewChatColor = $(el.find('#settings-gsx-showNewChatColor')).prop("checked");
        GSX.settings.changeSuggestionLayout = $(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked");
        GSX.settings.forceVoterLoading = $(el.find('#settings-gsx-forceVoterLoading')).prop("checked");
        GSX.settings.songNotification = $(el.find('#settings-gsx-songNotification')).prop("checked");
        GSX.settings.chatNotify = $(el.find('#settings-gsx-chatNotification')).prop("checked");
        GSX.settings.chatHotMessage = $(el.find('#settings-gsx-chatHotMessage')).prop("checked");
        GSX.settings.notificationDuration = $(el.find('#settings-gsx-notificationDuration')).prop("value");
        GSX.settings.autoVotesTimer = $(el.find('#settings-gsx-autoVotesTimer')).prop("value");
        GSX.settings.chatNotificationTriggers = $(el.find('#settings-gsx-chatNotificationTriggers')).val().trim().split('\n');
        GSX.savePrefValue();
        console.debug('GSX Settings saved', GSX.settings);

    }
};

GSXTool = {
	magnify : function(el,inline){
		//console.debug('magnify', el );
		el.linkify({linkClass : 'inner-comment-link gsxlinked'});
		el.find('a[href]').each(function () {
			$(this).removeClass('linkified'); //remove it because linkified add a click event on this class :-S. Good job linkified ! Next time ask me...
			if (/(jpg|gif|png|jpeg)$/i.test($(this).attr('href'))) {
				if(inline){
					
					var span = $('<span class="img-wrapper"></span>');
					$(this).html(span);
					var img = new Image();
					img.src = $(this).attr('href');
					span.html('<img src="//static.a.gs-cdn.net/webincludes/images/loading.gif" />');
					
					var insertImage = function(){
						span.empty();//remove spinner
						var scroll = GSXTool.isUserChatScrolledToBottom();
						span.append(img);//insert the image
						GSXTool.freezeGif(img);
						if(scroll){
							window.setTimeout(GSXTool.scrollChatBox,100);
						}
					};
					
					$(img).bind('load',function(){
						if (!img.complete) {
							//workaround bug https://bugzilla.mozilla.org/show_bug.cgi?id=574330
							img.src = img.src;
							return;
						}
						insertImage();
					});
					
					if (img.complete) {
						insertImage();
					}
				}
				$(this).magnificPopup(_.defaults({type: 'image'},GSXmagnifyingSettings));
				$(this).addClass('mfp-zoom');
			} else if (/(maps\.google|youtu(\.be|be\.com)|vimeo\.com|dailymotion.com\/(video|hub))/.test($(this).attr('href'))) {
				$(this).magnificPopup(_.defaults({type: 'iframe'},GSXmagnifyingSettings));
				$(this).addClass('mfp-zoom');
			}
		});
	},
	
	isUserChatScrolledToBottom : function(){
		var e = $("#column2").find(".bc-chat-messages"),
        t = e.parent()[0];
        return e.length ? Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) <= 8 : !1
	},
	
	scrollChatBox : function(){
		var box =  $("#column2").find(".bc-chat-messages");
		if(box.length > 0){
            var i = box[0];
			box.parent().scrollTop(i.scrollHeight);
		}
	},
	freezeGif : function(img){
		if( /^(?!data:).*\.gif/i.test(img.src)){
			var c = document.createElement('canvas');
			var drawStaticImage = function(){
				var w = c.width = img.width;
				var h = c.height = img.height;
				var context = c.getContext('2d');
				//draw gif first frame
				context.drawImage(img, 0, 0, w, h);
				//draw GIF circle
				context.beginPath();
				context.arc(40, 40, 15, 0, 2 * Math.PI, false);
				context.fillStyle = 'black';
				context.fill();
				context.lineWidth = 4;
				context.strokeStyle = '#ededed';
				context.stroke();
				context.fillStyle = 'white';
				context.font = 'bold 10pt calibri';
				context.fillText('GIF', 31, 45);
			}
			try{
				drawStaticImage();
			}catch(e){
				//workaround bug https://bugzilla.mozilla.org/show_bug.cgi?id=574330
				if (e.name == "NS_ERROR_NOT_AVAILABLE") {
					console.info('Bug NS_ERROR_NOT_AVAILABLE');
					window.setTimeout(drawStaticImage, 0);
				} else {
					throw e;
				}
			}
			$(img).hide();
			var span = $(img).parent().append(c);
			var displaygif = function(){$(this).find('img').show();$(this).find('canvas').hide();};
			var displaycanvas = function(){$(this).find('canvas').show();$(this).find('img').hide();};
			span.hover(displaygif,displaycanvas);
		}
	},
	
	rot13 : function(str){
		return str.replace(/[a-zA-Z]/g,function(c){return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);});
	},
	
	/**
     *  Util functions
     */
    addStyle: function (css) {
        var style = document.createElement('style');
        style.textContent = css;
        document.getElementsByTagName('head')[0].appendChild(style);
    },
   
    hookAfter: function (target, n, func) {
        GSXTool.hookFunction(target, n, func, 'after');
    },
    hookBefore: function (target, n, func) {
        GSXTool.hookFunction(target, n, func, 'before');
    },
    hookFunction: function (target, n, func, when) {
        //console.log('install hook', n);
        var old = target.prototype[n];
        //console.log(old);
        target.prototype[n] = function () {
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

    }
};

GSXmagnifyingSettings = {
	closeOnContentClick: true,
	image: {
		verticalFit: true
	},
	iframe: {
		patterns: {
			dailymotion: {
				index: 'dailymotion.com',
				id: function (url) {
					var m = url.match(/^.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/);
					if (m !== null) {
						if (m[4] !== undefined) {

							return m[4];
						}
						return m[2];
					}
					return null;
				},
				src: '//www.dailymotion.com/embed/video/%id%?autoplay=1'

			},
			youtubeshrink: {
				index: 'youtu.be',
				id: '/',
				src: '//www.youtube.com/embed/%id%?autoplay=1'
			},
			youtube: {
				index: 'youtube.com',
				// String that detects type of video (in this case YouTube). Simply via url.indexOf(index).
				id: function (url) {
					var regExp = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&#]+)/;
					var match = url.match(regExp);
					if (match && match[1].length == 11) {
						return match[1];
					}
					return null;
				},

				src: '//www.youtube.com/embed/%id%?autoplay=1' // URL that will be set as a source for iframe. 
			},
			vimeo: {
				index: 'vimeo.com/',
				id: '/',
				src: '//player.vimeo.com/video/%id%?autoplay=1'
			},
			gmaps: {
				index: '//maps.google.',
				src: '%id%&output=embed'
			}
		}
	}
};


(function () {

	var insertDependencies = function(){
		console.info('Depencies insertion');
		//doing it that way because magnific popup does not work well in greasemonkey sandbox induced by @require
		dependencies.js.forEach(function(s){
			var jq = document.createElement('script');
			jq.src = s;
			jq.type = 'text/javascript';
			document.getElementsByTagName('head')[0].appendChild(jq);
		});
		dependencies.css.forEach(function(s){
			var css = document.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.href= s;
			document.getElementsByTagName('head')[0].appendChild(css);
		});
	};

    var gsxHack = function () {
            if (typeof _ === "undefined") {
                window.setTimeout(gsxHack, 5);
            } else {
				insertDependencies();
                GSX.init();
            }
        };
    gsxHack();
}());