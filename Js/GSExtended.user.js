// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @description Enhance Grooveshark Broadcast functionnality
// @downloadURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js
// @updateURL	https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js
// @include     http://grooveshark.com/*
// @version     1.1.0
// @run-at document-end
// @grant  none
// ==/UserScript==
GSX = {
    settings: {
        notificationDuration: 3500,
        chatNotify: false,
        chatNotificationTriggers: {},
        songNotification: true,
        biggerChat: true,
        hideShareBox: true,
        chatTimestamps: true,
        showNewChatColor: true,
        changeSuggestionLayout: true,
        forceVoterLoading: false,
        autoVotesTimer: 6000,
        autoVotes: {}

    },
    init: function () {
        //bind events on GSX object;
        _.bindAll(this, 'onChatActivity', 'onSongChange', 'isInBCHistory', 'isInBCLibrary', 'isBCFriend');

        console.info('-- Monkeys rock! ---');
        console.log('Init GSX');
        //install render hook to know when GS App is ready
        this.hookAfter(GS.Views.Application, 'render', GSX.afterGSAppInit);
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
        GSX.hookAfter(GS.Views.Pages.Settings, "renderPreferences", function () {
            GSX.renderPreferences(this.$el);
        });
        GSX.hookAfter(GS.Views.Pages.Settings, "submitPreferences", function () {
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


    /**
     *  Util functions
     */
    addStyle: function (css) {
        var style = document.createElement('style');
        style.textContent = css;
        document.getElementsByTagName('head')[0].appendChild(style);
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

    hookAfter: function (target, n, func) {
        GSX.hookFunction(target, n, func, 'after');
    },
    hookBefore: function (target, n, func) {
        GSX.hookFunction(target, n, func, 'before');
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

    },
    /**
     * Toothless is your friend !
     */
    forbiddenFriendship: function () {
        GS.Models.Subscription.prototype.isSpecial = function () {
            return true;
        };
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
        } else return;
        if (!("Notification" in window)) {
            console.log("No desktop notification support");
        } else if (Notification.permission === "granted") {
            // html5 web notification
            var notif = new Notification(title, {
                body: msg,
                icon: icon,
                tag: tag
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
                var t = this.settings.chatNotificationTriggers;
                for (var i = 0; i < t.length; i++) {
                    if (new RegExp('\\b' + t[i].trim() + '\\b').test(m.get('message'))) {
                        this.showNotification(m);
                        break;
                    }
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
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Users'));
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Songs'));
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getLibrary());
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
    isBCFriend: function (userID) {
        var owner = (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner());
        return (owner && owner.attributes.favoriteUsers && owner.attributes.favoriteUsers.get(userID));
    },

    isCurrentlyListening: function (userID) {
        return GS.getCurrentBroadcast() && (GS.getCurrentBroadcast().get('listeners').get(userID) != undefined);
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
        this.hookAfter(GS.Models.Collections.ChatActivities, 'add', this.onChatActivity);
        //this could be done by adding a callback on 'change:song' on the queue model,
        //but I'm too lazy to update listeners each time the queue changes (Player's view keeps it updated for us)
        this.hookAfter(GS.Views.Player, 'onActiveSongChange', function () {
            _this.onSongChange(this.model.get("player").get("currentQueue").get("activeSong"));
        });
    },

    insertGsxStyle: function () {
        //Green border on favorites/friends
        this.addStyle('.chat-activity.friend-activity{ border-left: 3px solid #B3D8F1 !important;} .module.song.bc-library,.chat-activity.bc-library { border-left: 2px solid #66EE77 !important;} .module.song.bc-history .title{color: #881F1F !important;}');
        //auto votes styles
        this.addStyle('.module.song.auto-upvote .title:before { content:"\\1F44D"; color:#09B151;} .module.song.auto-downvote .title:before { content:  "\\1F44E";color:#F22;}');
        //change layout when skrinked
        this.addStyle('body.app-shrink #logo,body.app-shrink #logo.active,body.app-shrink #logo .logo-link {width:36px;} body.app-shrink #now-playing, body.app-shrink #player{right:0px;left:0px;width:100%;}body.app-shrink #queue-btns{display:none;}body.app-shrink #broadcast-menu-btn-group {left:0; position:fixed; top:50px; width:240px; z-index:7001;} body.app-shrink .notification-pill {left: 0px; right: 218px;}');
        //toothless img in preferences
        this.addStyle('img#toothless-avatar { bottom: 60px;  height: 100px; position: absolute;  right: 40px;}');
    },

    changeSuggestionLayout: function () {
        //show album suggestion, move user name
        this.addStyle('.meta-text.user-link{ position: absolute;  right: 170px;top: 7px; color:#CCC !important; display:inline !important;} .meta-text.suggested-by-text{display:none !important;} .meta-text.suggestion.album{display:inline !important;}');
    },
    enlargeChatbox: function () {
        this.addStyle('.bc-chat-messages-container {background-color: #fff;}.chat-activity.chat-message .inner{width:320px !important;}.chat-activity.chat-info .inner{width:270px !important;}.bc-chat-container {width: 400px !important;}.bc-chat-form-container .bc-chat-input {width: 382px;}');
    },
    removeSharebox: function () {
        this.addStyle('#bc-share{display:none;}.bc-chat-messages-container {top:0px!important;}');
    },

    addChatTimestamps: function () {
        //use existing hidden timestamp span but force display
        this.addStyle('.timestamp {font-size:7pt; color:#999; right: 10px; top: -4px; position: absolute; display:block !important;}');
        //redefine GS timestamp format from "xx second ago" to time display, because it's not correctly refreshed
        GS.Models.ChatActivity.prototype.getFormattedTimestamp = function () {
            var dte = new Date(this.get("timestamp"));
            return dte.toLocaleTimeString();
        };
    },
    hookBroadcastRenderer: function () {
        var updateCount = function () {
                var show = $(this).text().indexOf('Show') != -1;

                s = GS.getCurrentBroadcast().get('suggestions');
                for (var i = 0; i < s.length; i++) {
                    c = 0;
                    s.at(i).attributes.upVotes.forEach(function (user) {
                        //count voter currently in BC
                        if (GSX.isCurrentlyListening(user)) c++;
                    });
                    var upVotes = s.at(i).get('upVotes') || 0;
                    upVotes = _.isArray(upVotes) ? upVotes.length : _.toInt(upVotes);
                    $($('#suggestions-grid .song .upvotes')[i]).html(upVotes + (show ? '<em style="font-size:smaller">-' + c + '</em>' : ''));
                }
                $(this).html(show ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
            };
        GSX.hookAfter(GS.Views.Pages.Broadcast, 'showSuggestions', function () {
            if (this.$el.find('#gsx-votes').length <= 0) {
                var btn = $('<a class="btn right" id="gsx-votes" style="float:right"><i>Show real votes</i></a>');
                btn.prependTo(this.$el.find('#bc-grid-title')).on('click', updateCount);
            }
        });
    },
    hookChatRenderer: function () {
        var _this = this;
        this.hookAfter(GS.Views.Modules.ChatActivity, 'update', function () {
            if (_this.settings.showNewChatColor) {
                var isFriend = this.model.get('user') && GSX.isBCFriend(this.model.get('user').id);
                var isBCFavs = this.model.get('song') && GSX.isInBCLibrary(this.model.get('song').get('SongID'));
                this.$el[isFriend ? 'addClass' : 'removeClass']('friend-activity');
                this.$el[isBCFavs ? 'addClass' : 'removeClass']('bc-library');
            }
        });
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
                }
				if(this.model instanceof GS.Models.BroadcastSong && this.activeSong ){
					
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
                    GSX.tooltip(voters.length + ': ' + voters.join(', ') + ' \u21A3 ' + votersLeft.join(', '), el);
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
        //install event to display detailed votes
        var events = {
            "mouseenter .downvotes": "showDownVotes",
            "mouseenter .upvotes": "showUpVotes",
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
                    title: 'DownVote !',
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
				<input id="settings-gsx-changeSuggestionLayout" type="checkbox">\
				<label for="settings-gsx-changeSuggestionLayout">Change layout of suggestions. <em>(display song\'s album AND suggester)</em></label>\
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
        $(el.find('#settings-gsx-showTimestamps')).prop("checked", GSX.settings.chatTimestamps);
        $(el.find('#settings-gsx-showNewChatColor')).prop("checked", GSX.settings.showNewChatColor);
        $(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked", GSX.settings.changeSuggestionLayout);
        $(el.find('#settings-gsx-forceVoterLoading')).prop("checked", GSX.settings.forceVoterLoading);
        $(el.find('#settings-gsx-songNotification')).prop("checked", GSX.settings.songNotification);
        $(el.find('#settings-gsx-chatNotification')).prop("checked", GSX.settings.chatNotify);
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
        };

        $(el.find('#settings-gsx-chatNotificationTriggers')).val(s);
        $(el.find('#toothless-avatar')).on('click', function () {
            console.debug('GSX Settings: ', GSX.settings);
            GSX.notice('Meep !');
            GSX.settings.friendOfToothless = true;
            GSX.savePrefValue();
        });
        if (/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())) {
            $(el.find('#notification-duration')).removeClass('hide');
        }
    },
    /**
     * On GS submitPreferences save, we store our own settings
     */
    submitPreferences: function (el) {
        GSX.settings.biggerChat = $(el.find('#settings-gsx-biggerChat')).prop("checked");
        GSX.settings.hideShareBox = $(el.find('#settings-gsx-hideSharebox')).prop("checked");
        GSX.settings.chatTimestamps = $(el.find('#settings-gsx-showTimestamps')).prop("checked");
        GSX.settings.showNewChatColor = $(el.find('#settings-gsx-showNewChatColor')).prop("checked");
        GSX.settings.changeSuggestionLayout = $(el.find('#settings-gsx-changeSuggestionLayout')).prop("checked");
        GSX.settings.forceVoterLoading = $(el.find('#settings-gsx-forceVoterLoading')).prop("checked");
        GSX.settings.songNotification = $(el.find('#settings-gsx-songNotification')).prop("checked");
        GSX.settings.chatNotify = $(el.find('#settings-gsx-chatNotification')).prop("checked");
        GSX.settings.notificationDuration = $(el.find('#settings-gsx-notificationDuration')).prop("value");
        GSX.settings.autoVotesTimer = $(el.find('#settings-gsx-autoVotesTimer')).prop("value");
        GSX.settings.chatNotificationTriggers = $(el.find('#settings-gsx-chatNotificationTriggers')).val().trim().split('\n');
        GSX.savePrefValue();
        console.debug('GSX Settings saved', GSX.settings);

    }
};
(function () {

    var gsxHack = function () {
            if (typeof _ === "undefined") {
                window.setTimeout(gsxHack, 5);
            } else {
                GSX.init();
            }
        };
    gsxHack();
}());