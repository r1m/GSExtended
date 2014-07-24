// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @description Enhance Grooveshark Broadcast functionality
// @downloadURL https://ramouch0.github.io/GSExtended/src/GSExtended.user.js
// @updateURL   https://ramouch0.github.io/GSExtended/src/GSExtended.user.js
// @include     http://grooveshark.com/*
// @version     2.2.3
// @run-at document-end
// @grant  none 
// ==/UserScript==
dependencies = {
    js: ['https://ramouch0.github.io/GSExtended/src/lib/combined.lib.min.js'],
    css: [
        'https://ramouch0.github.io/GSExtended/src/css/gsx_core.css',
        'https://ramouch0.github.io/GSExtended/src/css/magnific-popup.css'
    ],
    theme: {
        'default': 'https://ramouch0.github.io/GSExtended/src/css/gsx_theme_default.css',
        'oldGSX': 'https://ramouch0.github.io/GSExtended/src/css/gsx_theme_old.css',
        'Mullins Transparent Black': 'https://userstyles.org/styles/102624.css?ik-gs-ex=ik-2&ik-gs-fr=ik-2&ik-gs-ch=ik-2&ik-gs-se=ik-2',
        'Mullins Metro Black': 'https://userstyles.org/styles/103472.css?ik-gs-x2=ik-2&ik-gs-fr=ik-2&ik-gs-ch=ik-2&ik-gs-se=ik-2&ik-he-op=ik-2',
        'none': false
    }
};
GSBot = {
    commands : ['/removeNext', '/removeLast', '/fetchByName', '/removeByName', '/skip', '/fetchLast', '/previewRemoveByName',
                '/showPlaylist', '/playPlaylist', '/shuffle', '/addToCollection', '/removeFromCollection', '/help', '/ping',
                '/peek', '/guest', '/makeGuest', '/unguestAll', '/about', '[BOT]' ]
};
GSX = {
    settings: {
        notificationDuration: 3500,
        chatNotify: false,
        chatNotificationTriggers: {},
        songNotification: true,
        enlargePage: true,
        hideSuggestionBox: false,
        chatTimestamps: true,
        disableChatMerge:false,
        forceVoterLoading: false,
        autoVotesTimer: 6000,
        replaceChatLinks: true,
        inlineChatImages: false,
        theme: 'default',
        ignoredUsers: [],
        songMarks:[],
        autoVotes: {},
        replacements: {'MoS':'Master Of Soundtrack'},
        automute:false,
        botCommands : GSBot.commands

    },
    init: function () {
        GSX.showRealVotes = false;
        GSX.chrome = (/chrom(e|ium)/.test(navigator.userAgent.toLowerCase()));
        //bind events on GSX object;
        _.bindAll(this, 'onChatActivity', 'onSongChange', 'isInBCHistory', 'isInBCLibrary', 'isBCFriend');

        console.info('-- Monkeys rock! ---');
        console.log('Init GSX');
        //install render hook to know when GS App is ready
        GSXUtil.hookAfter(GS.Views.Application, 'render', GSX.afterGSAppInit);
        // install setter hook to know when tier2 is loaded
        Object.defineProperty(GS, 'contextMenus', {
            set: function (y) {
                this._contextMenus = y;
                GSX.afterTier2Loaded(y);
            },
            get: function (y) {
                return this._contextMenus;
            }
        });
        Object.defineProperty(GS.Views.Pages, 'Broadcast', {
            set: function (y) {
                this._Bct = y;
                GSX.afterUserPackageLoaded();
            },
            get: function (y) {
                return this._Bct;
            }
        });

        console.log('read GSX settings ', this.settings);
        this.readPrefValue();
        console.log('read GSX settings ', this.settings);
        console.log('register listeners');
        this.registerListeners();
        console.log('grant notif permission');
        GSXUtil.grantNotificationPermission();
        console.log('hook chat renderer');
        this.hookChatRenderer();
        console.log('add song vote renderer');
        this.hookSongRenderer();
        
        if (this.settings.hideSuggestionBox) {
            console.log('remove suggestion box');
            this.removeSuggestionBox();
        }
        if (this.settings.chatTimestamps) {
            console.log('add timestamps');
            this.addChatTimestamps();
        }
        if (this.settings.friendOfToothless) {
            console.info('MEEEP !');
            this.forbiddenFriendship();
        }
        this.bakeMuffins();
        this.updateTheme();
        GSXUtil.notice('Where are my dragons ?', {
            title: 'GSX',
            duration: 1000
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
        GSXUtil.hookAfter(GS.Views.Page, 'setPage', function () {
            //console.info('Page rendered !',this.$el);
            this.$el[GSX.settings.enlargePage ? 'addClass' : 'removeClass']('large');
        });
        GSX.onUserChange(this.model.get('user'));
        console.info('-- In da place ---');
    },

    afterTier2Loaded: function (menus) {
        GSX.hookSongContextMenu(menus);
        //
        GSXUtil.hookAfter(GS.Views.Pages.Settings, 'renderPreferences', function () {
            GSX.renderPreferences(this.$el);
        });
        GSXUtil.hookAfter(GS.Views.Pages.Settings, 'submitPreferences', function () {
            GSX.submitPreferences(this.$el);
        });
        
        console.info('Caught the fish !');
    },

    afterUserPackageLoaded: function () {
        GSX.hookBroadcastRenderer();
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
        _.extend(GS.Models.Subscription.prototype,{
            isPremium : function () {
                return true;
            },
            isPlus : function () {
                return true;
            },
            isAnywhere : function () {
                return true;
            },
            hasSubscription : function () {
                return true;
            }
        });
    },
    
    bakeMuffins: function () {
        var keys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var code = '38,38,40,40,37,39,37,39,66,65';
        $(document).keydown(
                function (e) {
                    keys.push(e.keyCode);
                    keys.splice(0, 1);
                    if (keys.toString().indexOf(code) >= 0) {
                        console.info('Muffins !!!');
                        GSXUtil.muffinRain();
                    }
                }
            );
    },

    /*********************
     * GS Events
     *
     **********************/     
    registerListeners: function () {
        GSXUtil.hookAfter(GS.Models.Broadcast, 'newChatActivity', this.onChatActivity);
        //this could be done by adding a callback on 'change:song' on the queue model,
        //but I'm too lazy to update listeners each time the queue changes (Player's view keeps it updated for us)
        GSXUtil.hookAfter(GS.Views.Player, 'onActiveSongChange', function () {
            GSX.onSongChange(this.model.get('player').get('currentQueue').get('activeSong'));
        });
    },

    onUserChange: function (user) {
        //user : GS.Models.User
        console.debug('User Changed !', user);
        user.on('change:currentBroadcastID', this.onBroadcastChange, this);
        user.on('change:currentBroadcastOwner', this.onBroadcastChange, this);
        user.on('change', this.onUserUpdate, this);
        user.on('change:subscription', this.onUserUpdate, this);
    },
    
    onUserUpdate : function(){
        //console.log('User update');
        //$('#header-container').addClass('is-premium').removeClass('is-free-user');
    },

    onChatActivity: function (m) {
        // m : GS.Models.ChatActivity
        //console.debug('onChatActivity', m);
        if (this.settings.chatNotify) {
            if (m.get('type') === 'message' && m.get('user').id != GS.getLoggedInUserID()) { //don't notify for our own msg
                if (GSX.isHotMessage(m.get('messages'))) {
                    GSXUtil.showNotification(m, GSX.settings.notificationDuration);
                }
            }
        }
    },
    onSongChange: function (s) {
        // s: GS.Models.QueueSong
        //console.debug('onSongChange', s);
        if (s) {
            if (this.settings.songNotification) {
                GSXUtil.showNotification(s, GSX.settings.notificationDuration);
            }
            if (GSX.getAutoVote(s.get('SongID')) != 0) {
                setTimeout(function () {
                    GSX.autoVoteActiveSong(GSX.getAutoVote(s.get('SongID')), s.get('SongID'));
                }, GSX.settings.autoVotesTimer);

            }
        }
        if (GS.getCurrentBroadcast()) {
            //force display refresh for approved suggestion -> update history
            GS.getCurrentBroadcast().get('approvedSuggestions').each(function (s) {
                s.trigger('change');
            });
        }
    },

    onBroadcastChange: function () {
        console.debug('onBroadcastChange', arguments);
        //force loading of broadcaster's favorites.
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Users').then(function () {
            GS.getCurrentBroadcast().get('chatActivities').forEach(function(c){   
                c.trigger('change');
            });
        }));
        //(GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getFavoritesByType('Songs').then(function () {}));
        (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner().getLibrary().then(function () {
            GS.getCurrentBroadcast().get('suggestions').each(function (s) {
                s.trigger('change'); // force views update
            });
        }));
    },

    /************
    * Model helpers
    ****************/
    
    getUser : function (userId){
        return GS.Models.User.getCached(userId) 
            || (GS.getCurrentBroadcast() 
                && GS.getCurrentBroadcast().get('listeners') 
                && GS.getCurrentBroadcast().get('listeners').get(userId));
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
    
    isGuesting: function (userID) {
        return GS.getCurrentBroadcast() && GS.getCurrentBroadcast().isUserVIP(userID);
    },

    isCurrentlyListening: function (userID) {
        return GS.getCurrentBroadcast() && (GS.getCurrentBroadcast().get('listeners').get(userID) != undefined);
    },

    isHotMessage: function (messages) {
        var hot = false;
        var t = GSX.settings.chatNotificationTriggers;
        for (var m = 0; m < messages.length; m++){
            var msg = messages[m];
            for (var i = 0; i < t.length; i++) {
                if (new RegExp('\\b' + t[i].trim() + '\\b').test(msg)) {
                    hot = true;
                    break;
                }
            }
        }
        return hot;
    },
    isSpoiler: function (text){
        return text.toLowerCase().indexOf('[sp') !== -1;
    },  
    isBotCommand: function (text){
        for (var i = 0; i < GSX.settings.botCommands.length; i++){
            if (text.indexOf(GSX.settings.botCommands[i]) === 0){
            return true;
            }
        }
        return false;
    },
    isIgnoredUser : function (userId){
         return (GSX.settings.ignoredUsers.indexOf(userId)!== -1);
    },
    
    setIgnoredUser : function (userId, ignore){
        if(ignore){
            GSX.settings.ignoredUsers.push(userId);
            GSX.settings.ignoredUsers = _.uniq(GSX.settings.ignoredUsers);
        }else{
            GSX.settings.ignoredUsers = _.without(GSX.settings.ignoredUsers,userId);
        }
        GSX.savePrefValue();
    },
    
    isSongMarked: function(songid){
        return (GSX.settings.songMarks.indexOf(songid)!== -1);
    },
    
    markSong:function(songid,mark){
        if(mark){
            GSX.settings.songMarks.push(songid);
            GSX.settings.songMarks = _.uniq(GSX.settings.songMarks);
        }else{
            GSX.settings.songMarks = _.without(GSX.settings.songMarks,songid);
        }
        GSX.savePrefValue();
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
                GSXUtil.notice(GS.getCurrentBroadcast().get('activeSong').get('SongName'), {
                    title: 'GSX Auto ' + (score > 0 ? 'Upvote' : 'Downvote') + ' !'
                });
            } else {
                //we give up
                GSXUtil.notice('Autovote failed, you\'re not in sync with broadcast', {
                    title: 'GSX Autovote failed !'
                });
            }

        }
    },
    
    showAutovotes : function(){
        var songIds = _.keys(GSX.settings.autoVotes);
        GS.trigger('lightbox:open', 'generic', {
                view: {
                    headerHTML: 'Autovoted Songs ('+songIds.length+')',
                    messageHTML: '<div id="gsx-autovote-songs"></div>' 
                }
            });
        GS.Services.API.getQueueSongListFromSongIDs(songIds).done(function (songs) {
            var grid = new GS.Views.SongGrid({
                el: $.find('#gsx-autovote-songs')[0],
                collection: new GS.Models.Collections.Songs(songs)
            });
            grid.render();
            $('#lightbox').css({width:'630px'});
        });
    },
    
    showMarkedSongs : function(){
        var songIds = (GSX.settings.songMarks);
        GS.trigger('lightbox:open', 'generic', {
                view: {
                    headerHTML: 'Marked Songs ('+songIds.length+')',
                    messageHTML: '<div id="gsx-marked-songs"></div>' 
                }
            });
        GS.Services.API.getQueueSongListFromSongIDs(songIds).done(function (songs) {
            var grid = new GS.Views.SongGrid({
                el: $.find('#gsx-marked-songs')[0],
                collection: new GS.Models.Collections.Songs(songs)
            });
            grid.render();
            $('#lightbox').css({width:'630px'});
        });
    },
    
    showImportDialog: function(){
        GS.trigger('lightbox:open', {
                view: {
                    headerHTML: 'Import / Export GSX settings and data',
                    messageHTML: '<div><div>Export : <a class="btn export" style="float:none" id="gsx-export-btn">Download settings file</a></div><br /><div>Import: <input type="file" id="gsx-fileInput" class="hide" accept=".gsx"/><a class="btn import" style="float:none" id="gsx-import-btn">Import a file (.gsx)</a><span id="import-result"></span></div></div>' 
                },
                callbacks: {
                    ".export": function(){
                        var settings = localStorage.getItem('gsx');
                        $('#downloadFile').remove();
                        $('<a></a>').attr('id', 'downloadFile').attr('href', 'data:text/plain;charset=utf8,' + encodeURIComponent(settings)).attr('download', 'usersettings.gsx').appendTo('body');
                        $('#downloadFile').ready(function () {
                            $('#downloadFile').get(0).click();
                        });
                    },
                    '.import':function(){
                        $('#gsx-fileInput').off('change').on('change',function(){
                            var file = this.files[0];
                            if ((file.name.lastIndexOf('.gsx') === file.name.length-4 )) {
                                var reader = new FileReader();
                                reader.onload = function(e) {
                                    try{
                                        var importedsettings = JSON.parse(reader.result);
                                        console.debug('Imported settings', importedsettings);
                                        GSX.savePrefValue( _.defaults(importedsettings,GSX.settings));
                                        console.debug('New settings',GSX.settings);
                                        GSX.renderPreferences($('#page'));
                                        GSX.updateTheme();
                                        GS.trigger('lightbox:close');
                                    }catch(e){
                                        $('#import-result').html('Invalid file !');
                                    }
                                }
                                reader.onerror = function(e) {
                                    $('#import-result').html('Invalid file !');
                                }
                                reader.readAsText(file);	
                            } else {
                                $('#import-result').html('Invalid file type !');
                            }
                        });
                        $('#gsx-fileInput').click();
                    }
                }
            });
    },

    
    /****** Now the dirty part *********/

    removeSuggestionBox: function () {
        GSXUtil.addStyle('#bc-add-songs { display: none;}');
    },
    addChatTimestamps: function () {
        //use existing hidden timestamp span but force display
        GSXUtil.addStyle('.timestamp {display:block !important;}');
        //redefine GS timestamp format from "xx second ago" to time display, because it's not correctly refreshed
        GS.Models.ChatActivity.prototype.getFormattedTimestamp = function () {
            var dte = new Date(this.get('timestamp'));
            return dte.toLocaleTimeString();
        };
    },
    updateTheme : function(){
        console.log('Update GSX theme');
        $('#gsxthemecss').prop('disabled', true).remove();
        if(dependencies.theme[GSX.settings.theme]) {
            GSXUtil.injectCSS(dependencies.theme[GSX.settings.theme],'gsxthemecss');
        }
    },
    
    hookBroadcastRenderer: function () {
        var toggleCount = function () {
            GSX.showRealVotes = !GSX.showRealVotes;
            GS.getCurrentBroadcast().get('suggestions').each(function (s) {
                s.trigger('change'); // force views update
            });
            GS.getCurrentBroadcast().get('approvedSuggestions').each(function (s) {
                s.trigger('change'); // force views update
            });
            $(this).html(GSX.showRealVotes ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
        };
        GSXUtil.hookAfter(GS.Views.Pages.Broadcast, 'showSuggestions', function () {
            if (this.$el.find('#gsx-votes').length <= 0) {
                var btn = $('<a class="btn right" id="gsx-votes" style="float:right"></a>');
                btn.html(GSX.showRealVotes ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
                btn.prependTo(this.$el.find('#bc-grid-title')).on('click', toggleCount);
            }
        });
        GSXUtil.hookAfter(GS.Views.Pages.Broadcast, 'showVIPByline', function () {
            if (GS.getCurrentBroadcast()) {
                var vipIds = GS.getCurrentBroadcast().get('vipUsers');
                var vipUsers = [];
                var bcPage = this;
                vipIds.forEach(function (u) {
                        var user = GSX.getUser(u.userID);
                        if (!user){
                            GS.Models.User.get(u.userID).then(function (e) {
                                bcPage.showVIPByline();
                            });
                        }else{
                            vipUsers.push(user);
                        }
                    });
                var spans = _.map(vipUsers, function(user){
                    return '<a class="user-link open-profile-card" data-user-id="'+user.get('UserID')+'" href="'+user.toUrl()+'" >'+user.escape('Name')+'</a>';
                });
                var container = this.$el.find('.guests-container');
                if(vipUsers.length > 0){
                    if (container.length == 0){
                       container = $('<li class="guests-container"><span class="guest-list"></span><span class="label">VIP</span></li>');
                       container.insertAfter('.listeners-stat-container');
                    }
                    container.find('.guest-list').html(spans.join(', '));
                }else{
                    container.remove();
                }
            }
        });
        GSXUtil.hookAfter(GS.Views.Pages.Broadcast, 'onTemplate', function () {
            function search(text,position){
                var results = [];
                if( position == 0 && GSX.isGuesting(GS.getLoggedInUserID())){
                    for (var i = 0; i < GSX.settings.botCommands.length; i++){
                        if(GSX.settings.botCommands[i].toLowerCase().indexOf(text.toLowerCase())===0){
                            results.push({text:GSX.settings.botCommands[i], icon:'<span class="icon bot-icon"></span>'});
                        }
                    }
                    results = results.slice(0, 5);//slice to only return 5 commands (most used)
                }
                if(text.charAt(0)=='@' && text.length > 1){
                    var name= text.substring(1);
                    GS.getCurrentBroadcast().get('listeners').each( function(u){
                        if( u.get('Name').toLowerCase().indexOf(name.toLowerCase()) == 0){
                            results.push({text:u.escape('Name'), icon:'<img src="'+u.getImageURL(30)+'" />'});
                        }
                    });
                }
                return results;
            }
            new AutoCompletePopup($('.bc-chat-input'),['/','@'],search);
        });
    },
    hookChatRenderer: function () {
        
        GS.Models.ChatActivity.prototype.getText = function(getText){
            return function(){
                var txt = getText.apply(this,arguments);
                wraplines = function (txt){
                    var classes = ['msg-line'];
                    if(GSX.isSpoiler(txt)) {classes.push('spoiler-msg');}
                    if(GSX.isHotMessage([txt])) {classes.push('hot-msg');}
                    if(GSX.isBotCommand(txt)) {classes.push('bot-command');}
                    return '<span class="'+classes.join(' ')+'">'+txt+'</span>';
                };
                if(this.get('messages')){
                    lines = txt.split('<br/>');//split messages into single
                    u = this.get('user');
                    if(u && !u.get('IsPremium')){
                        lines = _.map(lines, _.emojify);
                    }
                    lines = _.map(lines, wraplines);
                    txt=lines.join('<hr />');//join them with hr instead of br
                }
                return txt;
            }
        }(GS.Models.ChatActivity.prototype.getText);
        
        GS.Models.ChatActivity.prototype.merge =  function(merge){
            return function(newChat){
                if(this.get('type') === 'message'){
                    if(GSX.settings.disableChatMerge){
                        return false;
                    }else{
                        //fix GS bug !
                        if(newChat.get('type') != 'message'){
                            return false;
                        }
                    }
                }
                return merge.apply(this,arguments);
            }
        }(GS.Models.ChatActivity.prototype.merge);
        
        /*
        * redefine chat view
        */
        GS.Views.Modules.ChatActivity.prototype.changeModelSelectors['.message'] = function(renderer){
            return function(){
                renderer.apply(this,arguments);
                this.renderGSX();
            }
        }(GS.Views.Modules.ChatActivity.prototype.changeModelSelectors['.message']);
        
        /*GSXUtil.hookAfter(GS.Views.Modules.ChatActivity, 'update', function () {
            this.renderGSX();
        });*/
        GSXUtil.hookAfter(GS.Views.Modules.ChatActivity, 'completeRender', function () {
            this.renderGSX();
        });
       
        //install event to display detailed votes
        _.extend(GS.Views.Modules.ChatActivity.prototype.events, {
            'mouseenter .btn.ignore': 'showIgnoreTooltip',
            'click .btn.ignore': 'toggleIgnore',
            'click .img-container': 'onThumbnailClick',
            'click .spoiler-msg' : 'revealSpoiler',
            'mouseenter .spoiler-msg' : 'showSpoilerTooltip'
        });
        
        _.extend(GS.Views.Modules.ChatActivity.prototype,{
            renderGSX : function (){
                var isFriend = this.model.get('user') && GSX.isBCFriend(this.model.get('user').id);
                var isBCFavs = this.model.get('song') && GSX.isInBCLibrary(this.model.get('song').get('SongID'));
                var isIgnored = this.model.get('user') && GSX.isIgnoredUser(this.model.get('user').id);
                this.$el[isFriend ? 'addClass' : 'removeClass']('friend-activity');
                this.$el[isBCFavs ? 'addClass' : 'removeClass']('bc-library');

                var isHotMsg = this.model.get('messages') && GSX.isHotMessage(this.model.get('messages'));
                this.$el[isHotMsg ? 'addClass' : 'removeClass']('hot-activity');
                this.$el[isIgnored ? 'addClass' : 'removeClass']('ignored');
                this.$el.find('.btn.ignore')[isIgnored ? 'addClass' : 'removeClass']('btn-success');
                this.$el.find('.img-container').addClass('mfp-zoom');
                
                if (this.model.get('type') == 'message') {
                    if (GSX.settings.replaceChatLinks) {
                        var spanmsg = this.$el.find('span.message');
                        if(spanmsg.length > 0){
                            GSXUtil.magnify(spanmsg, GSX.settings.inlineChatImages);
                        }
                    }
                    if (this.$el.find('.ignore').length <= 0){
                        $('<a class="btn ignore ignore-flat"><i class="icon icon-ignore"></i></a>').insertAfter(this.$el.find('.inner .favorite'));
                    }
                }
            },
            toggleIgnore : function (el) {
                var uid = this.model.get('user').id;
                GSX.setIgnoredUser(uid, !GSX.isIgnoredUser(uid));
                //force refresh
                GS.getCurrentBroadcast().get('chatActivities').forEach(function(c){ 
                    if(c.get('user') && c.get('user').id == uid){
                        c.trigger('change');
                    }
                });
            },
            revealSpoiler : function (e) {
                var el = $(e.currentTarget);
                var txt = el.text();
                //rot13 the message to hide spoilers
                var msg = txt.replace(/\[(sp.*)\](.+)/ig, function (m, tag, spoil, off, str) {
                    return '[' + tag + ']' + GSXUtil.rot13(spoil);
                });
                el.text(msg).removeClass('spoiler-msg');
                GSXUtil.magnify(el, GSX.settings.inlineChatImages);
            },
            showSpoilerTooltip : function (el) {
                GSXUtil.tooltip('Spoiler: click to reveal' ,el);
            },
            showIgnoreTooltip : function (el) {
                GSXUtil.tooltip($(el.currentTarget).hasClass('btn-success') ? 'Unblock' : 'Ignore' ,el);
            },
            onThumbnailClick : function () {
                var imglink = false;
                if (!this.model.get('song')) {
                    var picture = this.model.get('user').get('Picture');
                    if (picture) {
                        imglink = '//images.gs-cdn.net/static/users/' + picture;
                    }
                } else {
                    var picture = this.model.get('song').get('CoverArtFilename');
                    if (picture) {
                        imglink = '//images.gs-cdn.net/static/albums/500_' + picture;
                    }
                }
                if (imglink) {
                    $.magnificPopup.open(_.defaults({
                        type: 'image',
                        items: {
                            src: imglink
                        }
                    }, GSXmagnifyingSettings));
                }
            }
        });
        
        GS.Models.Broadcast.prototype.sendChatMessage = function(send){
            return function (msg) {
                for( r in GSX.settings.replacements){
                    var key= r.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');//escape regex specials
                    var reg = new RegExp('((^)'+key+'|(\\s)'+key+')\\b','ig');
                    if (reg.test(msg)) {
                        msg = msg.replace(reg, '$3'+GSX.settings.replacements[r]);
                    }
                }
                if (GSX.isSpoiler(msg)) {
                    //rot13 the message to hide spoilers
                    msg = msg.replace(/\[(sp.*)\](.+)/ig, function (m, tag, spoil, off, str) {
                        return '[' + tag + '] ' + GSXUtil.rot13(spoil);
                    });
                }
                send.call(this, msg);
            };
        }(GS.Models.Broadcast.prototype.sendChatMessage);
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
            el[GSX.isSongMarked(songID) ? 'addClass' : 'removeClass']('marked');
        };

        // small display: album list, collection, favs...
        var songrender = GS.Views.Modules.SongRow.prototype.changeModelSelectors['&'];
        GS.Views.Modules.SongRow.prototype.changeModelSelectors['&'] = function (e, t) {
            //delegate
            songrender.apply(this, arguments);
            gsxAddSongClass(_.$one(t), this.model.get('SongID'));
        };
        //Tall display :suggestion, history, now playing
        songrender = GS.Views.Modules.SongRowTall.prototype.changeModelSelectors['&'];

        renderers = {
            '&': function (e, t) {
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
                    var userId= this.model.get('upVotes')[0];
                    suggester = GSX.getUser(userId);
                    if (suggester == null) {
                        if (GSX.settings.forceVoterLoading) {
                            var _thismodel = this.model;
                            //force a fetch, then trigger a model change
                            GS.Models.User.get(upVotes[0]).then(function (u) {
                                //suggester is setted by GS server or Broadcast on suggestion change. 
                                //I don't know how to force a refresh without setting it myself
                                _thismodel.set('suggester', u);
                                _thismodel.trigger('change');

                            });
                        }
                    }
                    if (_.isArray(upVotes) && GSX.showRealVotes && !(this.grid.options && this.grid.options.hideApprovalBtns)) {
                        c = 0;
                        upVotes.forEach(function (user) {
                            //count voter currently in BC
                            if (GSX.isCurrentlyListening(user)) c++;
                        });
                        upVote = upVote + '<em style="font-size:smaller">-' + c + '</em>';
                    }
                }
                if (GS.getCurrentBroadcast() && this.model instanceof GS.Models.BroadcastSong && this.activeSong) {

                    if (el.find('.user-link').length === 0) {
                        el.find('.meta-inner').append($('<a class="user-link open-profile-card meta-text"></a>'));
                    } //playing song
                    var suggestion = GS.getCurrentBroadcast().get('approvedSuggestions').get(this.model.get('SongID'));
                    if(suggestion){
                        var userId = suggestion.get('upVotes')[0];
                        suggester = GSX.getUser(userId);
                    }
                }

                el.find('.votes')[isSuggestion ? 'removeClass' : 'addClass']('both-votes');
                el.find('.upvotes').html(upVote).removeClass('hide');
                el.find('.downvotes').html(downVote)[isSuggestion ? 'addClass' : 'removeClass']('hide');

                var ulk = el.find('.user-link')[suggester ? 'removeClass' : 'addClass']('hide');
                suggester ? ulk.attr('href', suggester.toUrl()).html(suggester.escape('Name')).data('userId', suggester.get('UserID')) : ulk.attr('href', '#').html('').data('userId', null);

                gsxAddSongClass(el, this.model.get('SongID'));
                el.find('.img').addClass('mfp-zoom');
            }
        };
        _.extend(GS.Views.Modules.SongRowTall.prototype.changeModelSelectors, renderers);

        //delete these renderers, everything is now done in '&'
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors['.downvotes'];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors['.upvotes'];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors['.votes'];
        delete GS.Views.Modules.SongRowTall.prototype.changeModelSelectors['.user-link'];

        _.extend(GS.Views.Modules.SongRowTall.prototype,{
            showVotes : function (votes, el) {
                if (_.isArray(votes) && votes.length > 0) {
                    var voters = [];
                    var votersLeft = [];
                    _.each(votes, function (v) {
                        var name = ' ? ';
                        suggester = GSX.getUser(v);
                        if (suggester) {
                            name = suggester.escape('Name');
                        } else if (GSX.settings.forceVoterLoading) {
                            GS.Models.User.get(v);
                        }
                        if (GSX.isCurrentlyListening(v)) {
                            voters.push(name);
                        } else {
                            votersLeft.push(name);
                        }
                    });
                    //console.log('Show votes', votes, voters, votersLeft);
                    var separator = (GSX.chrome ? ' \u21A3 ' : ' `\uD83D\uDEAA.. '); //chrome can't display the door emoji
                    GSXUtil.tooltip(voters.length + ': ' + voters.join(', ') + (votersLeft.length > 0 ? separator + votersLeft.join(', ') : ''), el);
                } else {
                    //console.log('Show votes, number', votes);
                    GSXUtil.tooltip('-', el);
                }
            },
            showDownVotes : function (e) {
                this.showVotes(this.model.get('downVotes') || [], e);
            },
            showUpVotes : function (e) {
                this.showVotes(this.model.get('upVotes') || [], e);
            },
            openAlbumArt : function (e) {
                var picture = this.model.get('CoverArtFilename');
                if (picture) {
                    imglink = '//images.gs-cdn.net/static/albums/500_' + picture;
                    $.magnificPopup.open(_.defaults({
                        type: 'image',
                        items: {
                            src: imglink
                        }
                    }, GSXmagnifyingSettings));
                }
            }
        });
        //install event to display detailed votes
        _.extend(GS.Views.Modules.SongRowTall.prototype.events, {
            'mouseenter .downvotes': 'showDownVotes',
            'mouseenter .upvotes': 'showUpVotes',
            'click .img': 'openAlbumArt'
        });
    },

    /** intercept song context menu*/
    hookSongContextMenu: function (menus) {
        var songMenu = menus.getContextMenuForSong;
        menus.getContextMenuForSong = function (song, ctx) {
            var m = songMenu.apply(this, arguments);
            m.push({ customClass: "separator" });
            if(!GSX.isSongMarked(song.get('SongID'))){
                m.push({
                    key: 'CONTEXT_MARK_SONG',
                    title: 'Mark this song',
                    customClass: 'gsx_marksong',
                    action: {
                        type: 'fn',
                        callback: function () {
                            GSX.markSong(song.get('SongID'), true);
                            GSXUtil.notice(song.get('SongName'), {
                                title: 'Mark added'
                            });
                            song.trigger('change');
                        }
                    }
                });
            }else{
                m.push({
                    key: 'CONTEXT_UNMARK_SONG',
                    title: 'Unmark this song',
                    customClass: 'gsx_unmarksong',
                    action: {
                        type: 'fn',
                        callback: function () {
                            GSX.markSong(song.get('SongID'), false);
                            GSXUtil.notice(song.get('SongName'), {
                                title: 'Mark removed'
                            });
                            song.trigger('change');
                        }
                    }
                });
            }
            //define sub-menu
            var voteSubMenus = [];
            if (GSX.getAutoVote(song.get('SongID')) != 0) {
                voteSubMenus.push({
                    key: 'CONTEXT_AUTO_REMOVEVOTE',
                    title: 'Remove from autovote list',
                    customClass: 'gsx_removevote',
                    action: {
                        type: 'fn',
                        callback: function () {
                            GSX.setAutoVote(song.get('SongID'), 0);
                            GSXUtil.notice(song.get('SongName'), {
                                title: 'Auto vote removed'
                            });
                            song.trigger('change');
                        }
                    }
                });
            } else {
                voteSubMenus.push({
                    key: 'CONTEXT_AUTO_UPVOTE',
                    title: 'Upvote !',
                    customClass: 'gsx_upvote',
                    action: {
                        type: 'fn',
                        callback: function () {
                            GSXUtil.notice(song.get('SongName'), {
                                title: 'Added to auto upvote'
                            });
                            GSX.setAutoVote(song.get('SongID'), 1);
                            song.trigger('change');
                        }
                    }
                }, {
                    key: 'CONTEXT_AUTO_DOWNVOTE',
                    title: 'Downvote !',
                    customClass: 'gsx_downvote',
                    action: {
                        type: 'fn',
                        callback: function () {
                            GSXUtil.notice(song.get('SongName'), {
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
                key: 'CONTEXT_AUTO_VOTE',
                title: 'Automatic Vote',
                customClass: 'gsx_autovote',
                type: 'sub',
                src: voteSubMenus
            });

            return m;
        };
    },

    /**
     * After GS renderPreferences page, we insert our own settings
     */
    renderPreferences: function (el) {
        el.find('#settings-gsx-container').remove();
        el.find('#column1').append('<div id="settings-gsx-container" class="control-group preferences-group">\
        <h2>Grooveshark Extended Settings <a class="btn right" id="gsx-settings-export-btn">Export/Import settings</a></h2>\
        <a class="btn right" id="gsx-autovotes-btn" style="float:right">Show autovoted songs</a>\
        <a class="btn right" id="gsx-marked-btn" style="float:right">Show marked songs</a>\
        <ul class="controls">\
            <li  class="crossfade" >\
                <label for="settings-gsx-theme">Choose a theme for GSX and Grooveshark.</label>\
                <select id="settings-gsx-theme" ><option>'+Object.getOwnPropertyNames(dependencies.theme).join('</option><option>')+'</option></select>\
            </li>\
            <li>\
                <input id="settings-gsx-enlargePage" type="checkbox">\
                <label for="settings-gsx-enlargePage">Enlarge the page for a bigger chatbox.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-showTimestamps" type="checkbox">\
                <label for="settings-gsx-showTimestamps">Show timestamps on chat activities.</label>\
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
                <input id="settings-gsx-disableChatMerge" type="checkbox">\
                <label for="settings-gsx-disableChatMerge" >Disable merging of multiple chat message.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-forceVoterLoading" type="checkbox">\
                <label for="settings-gsx-forceVoterLoading">Force loading of offline voter\'s name. <em>(will try to fetch users\' names if not in cache.<strong>BE CAREFULL</strong>, it can be a lot if you are in a broadcast with 300+ listeners)</em></label>\
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
                <label for="settings-gsx-chatReplacement">Text replacement in chat. Can be use for command shortcuts or ypos.<br /><em>One by line, use &lt;Key&gt;=&lt;Value&gt; format like "MoS=Master Of Soundtrack"</em></label>\
                <br \><textarea id="settings-gsx-chatReplacement" rows="5" cols="150"></textarea>\
            </li>\
            <li class="crossfade" id="autovote-timer">\
                <label for="settings-gsx-autoVotesTimer">Waiting time before autovote in miliseconds (change if you are always out of sync)</label>\
                <input id="settings-gsx-autoVotesTimer" type="text" size="10">\
            </li>\
            <li>\
                <input id="settings-gsx-automute" type="checkbox">\
                <label for="settings-gsx-automute">Auto-mute the player when a video link is opened</em></label>\
            </li>\
            <li>\
                <input id="settings-gsx-hideSuggestionBox" type="checkbox">\
                <label for="settings-gsx-hideSuggestionBox">Remove suggestion box <em>(need a refresh)</em></label>\
            </li>\
            <li class="crossfade hide" id="notification-duration">\
                <label for="settings-gsx-notificationDuration">Duration of notifications in miliseconds <b>(ONLY works in Chrome !)</b></label>\
                <input id="settings-gsx-notificationDuration" type="text" size="10">\
            </li>\
            </ul>\
            <img id="toothless-avatar" src="http://images.gs-cdn.net/static/users/21218701.png" />\
            </div>');
        $(el.find('#settings-gsx-enlargePage')).prop('checked', GSX.settings.enlargePage);
        $(el.find('#settings-gsx-hideSuggestionBox')).prop('checked', GSX.settings.hideSuggestionBox);
        $(el.find('#settings-gsx-showTimestamps')).prop('checked', GSX.settings.chatTimestamps);
        $(el.find('#settings-gsx-replaceChatLinks')).prop('checked', GSX.settings.replaceChatLinks);
        $(el.find('#settings-gsx-inlineChatImages')).prop('checked', GSX.settings.inlineChatImages);
        $(el.find('#settings-gsx-forceVoterLoading')).prop('checked', GSX.settings.forceVoterLoading);
        $(el.find('#settings-gsx-songNotification')).prop('checked', GSX.settings.songNotification);
        $(el.find('#settings-gsx-chatNotification')).prop('checked', GSX.settings.chatNotify);
        $(el.find('#settings-gsx-disableChatMerge')).prop('checked', GSX.settings.disableChatMerge);
        $(el.find('#settings-gsx-automute')).prop('checked', GSX.settings.automute);
        $(el.find('#settings-gsx-notificationDuration')).prop('value', GSX.settings.notificationDuration);
        $(el.find('#settings-gsx-autoVotesTimer')).prop('value', GSX.settings.autoVotesTimer);
        $(el.find('#settings-gsx-theme')).val(GSX.settings.theme);
        $(el.find('#gsx-autovotes-btn')).on('click',GSX.showAutovotes);
        $(el.find('#gsx-marked-btn')).on('click',GSX.showMarkedSongs);
        $(el.find('#gsx-settings-export-btn')).on('click',GSX.showImportDialog);


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
        
        var rep = '';
        for (r in GSX.settings.replacements) {
            rep += r +'='+GSX.settings.replacements[r]+ '\n';
        }
        $(el.find('#settings-gsx-chatReplacement')).val(rep);
        
        $(el.find('#toothless-avatar')).on('click', function () {
            console.debug('GSX Settings: ', GSX.settings);
            GSXUtil.notice('Meep !');
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
        GSX.settings.enlargePage = $(el.find('#settings-gsx-enlargePage')).prop('checked');
        GSX.settings.hideSuggestionBox = $(el.find('#settings-gsx-hideSuggestionBox')).prop('checked');
        GSX.settings.chatTimestamps = $(el.find('#settings-gsx-showTimestamps')).prop('checked');
        GSX.settings.replaceChatLinks = $(el.find('#settings-gsx-replaceChatLinks')).prop('checked');
        GSX.settings.inlineChatImages = $(el.find('#settings-gsx-inlineChatImages')).prop('checked');
        GSX.settings.forceVoterLoading = $(el.find('#settings-gsx-forceVoterLoading')).prop('checked');
        GSX.settings.songNotification = $(el.find('#settings-gsx-songNotification')).prop('checked');
        GSX.settings.chatNotify = $(el.find('#settings-gsx-chatNotification')).prop('checked');
        GSX.settings.disableChatMerge = $(el.find('#settings-gsx-disableChatMerge')).prop('checked');
        GSX.settings.automute = $(el.find('#settings-gsx-automute')).prop('checked');
        GSX.settings.notificationDuration = $(el.find('#settings-gsx-notificationDuration')).prop('value');
        GSX.settings.autoVotesTimer = $(el.find('#settings-gsx-autoVotesTimer')).prop('value');
        GSX.settings.chatNotificationTriggers = $(el.find('#settings-gsx-chatNotificationTriggers')).val().trim().split('\n');
        GSX.settings.theme = $(el.find('#settings-gsx-theme')).val();
        
        var repstrings = $(el.find('#settings-gsx-chatReplacement')).val().trim().split('\n');
        var rep = {};
        for (var i = 0; i < repstrings.length; i++) {
            var v = repstrings[i].split('=', 2);
            if(v.length == 2){
                rep[v[0].trim()]=v[1].trim();
            }
        }
        GSX.settings.replacements = rep;
        GSX.savePrefValue();
        GSX.updateTheme();
        console.debug('GSX Settings saved', GSX.settings);

    }
};

GSXUtil = {

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
    showNotification: function (messageOrSong, duration) {
        var title, msg, icon, tag;
        if (messageOrSong instanceof GS.Models.ChatActivity) {
            title = messageOrSong.get('user').get('Name');
            icon = messageOrSong.get('user').getImageURL();
            msg = messageOrSong.get('messages').join('\n');
           // tag = 'gsx_msg';
        } else if (messageOrSong instanceof GS.Models.QueueSong) {
            msg = messageOrSong.get('ArtistName') + ' \u2022 ' + messageOrSong.get('AlbumName');
            icon = messageOrSong.getImageURL();
            title = messageOrSong.get('SongName');
            tag = 'gsx_song';
        } else {
            return;
        }
        if (!('Notification' in window)) {
            console.log('No desktop notification support');
        } else if (Notification.permission === 'granted') {
            // html5 web notification
            var notif = new Notification(title, {
                body: msg,
                icon: icon,
                tag: tag
            });
            setTimeout(function () {
                notif.close();
            }, duration);
        }
    },
    /**
     * show a GS notification on bottom of the window
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
     * Show a tooltip on the hovered element.
     * e: mouse-event
     * text : message to display
     */
    tooltip: function (text, e) {
        e.stopPropagation();
        var tooltip = new GS.Views.Tooltips.Helper({
            text: text
        });
        GS.Views.Tooltips.Helper.simpleTooltip(e, tooltip);
    },
    magnify: function (el, inline) {
        //console.debug('magnify', el );
        new Linkified(el[0], {
            linkClass: 'inner-comment-link gsxlinked'
        });
        el.find('a[href]').each(function () {
            if (/(jpg|gif|png|jpeg)$/i.test($(this).attr('href'))) {
                if (inline) {
                    //add a spinner
                    var span = $('<span class="img-wrapper"><img src="//static.a.gs-cdn.net/webincludes/images/loading.gif" /></span>');
                    $(this).html(span);
                    //preload the image
                    var img = new Image();
                    img.src = $(this).attr('href');

                    var insertImage = function () {
                        span.empty(); //remove spinner
                        var scroll = GSXUtil.isUserChatScrolledToBottom();
                        span.append(img); //insert the image
                        GSXUtil.freezeGif(img); //freeze the image if it's a GIF
                        if (scroll) {
                            GSXUtil.scrollChatBox();
                        }
                    };

                    $(img).bind('load', function () {
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
                $(this).magnificPopup(_.defaults({
                    type: 'image'
                }, GSXmagnifyingSettings));
                $(this).addClass('mfp-zoom');
            } else if (/(maps\.google|youtu(\.be|be\.com)|vimeo\.com|dailymotion.com\/(video|hub))/.test($(this).attr('href'))) {
                $(this).magnificPopup(_.defaults({
                    type: 'iframe'
                }, GSXmagnifyingSettings));
                $(this).addClass('mfp-zoom');
            }
        });
    },

    isUserChatScrolledToBottom: function () {
        var e = $('#column2').find('.bc-chat-messages'),
            t = e.parent()[0];
        return e.length ? Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) <= 8 : !1
    },

    scrollChatBox: function () {
        var box = $('#column2').find('.bc-chat-messages');
        if (box.length > 0) {
            var i = box[0];
            box.parent().scrollTop(i.scrollHeight);
        }
    },
    freezeGif: function (img) {
        if (/^(?!data:).*\.gif/i.test(img.src)) {
            var c = document.createElement('canvas');
            var drawStaticImage = function () {
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
            try {
                drawStaticImage();
            } catch (e) {
                //workaround bug https://bugzilla.mozilla.org/show_bug.cgi?id=574330
                if (e.name == 'NS_ERROR_NOT_AVAILABLE') {
                    console.info('Bug NS_ERROR_NOT_AVAILABLE');
                    setTimeout(drawStaticImage, 0);
                } else {
                    throw e;
                }
            }
            $(img).hide();
            var span = $(img).parent().append(c);
            var displaygif = function () {
                $(this).find('img').show();
                $(this).find('canvas').hide();
            };
            var displaycanvas = function () {
                $(this).find('canvas').show();
                $(this).find('img').hide();
            };
            span.hover(displaygif, displaycanvas);
        }
    },

    rot13: function (str) {
        return str.replace(/[a-zA-Z]/g, function (c) {
            return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
    },
    
    muffinRain : function() {
        var drop = $('<img class="drop" src="https://ramouch0.github.io/GSExtended/images/muffin.png" />').detach();
        drop.css({
            position: 'absolute',
            left: '0px',
            display: 'block',
            top: '-150px',
            'z-index': 12000
        });

        function create() {
            var size = (Math.random() * 100) + 20;
            var clone = drop.clone().appendTo('#main')
                .css({
                    transform: 'rotate(' + Math.random() * 360 + 'deg)',
                    left: Math.random() * $(document).width() - 100,
                    width: size + 'px',
                    height: size + 'px'
                    
                }).animate({
                        'top': $(document).height() - 150
                    },
                    Math.random() * 500 + 1000, function () {
                        $(this).fadeOut(200, function () {
                            $(this).remove();
                        });
                    });
        }

        function sendWave() {
            for (var i = 0; i < 30; i++) {
                setTimeout(create, Math.random() * 1000);
            }
        }
        var rain = setInterval(sendWave, 500);
        setTimeout(function () {
            clearInterval(rain);
        }, 10000);
    },

    injectCSS: function(url, id){
        // This is a UserStyles script.
        // We need to clean it and inject it manually.
        if (url.indexOf('userstyles') !== -1) {
            $.get(url).done( function(data) {
                var startIndex = data.search(/@(-moz-)?document[\s\S]*?{/);

                // Style has a document rule; we need to remove it.
                while (startIndex !== -1) {
                    // Remove the opening statement.
                    data = data.replace(/@(-moz-)?document[\s\S]*?{/, '');

                    // Find the closing bracket.
                    var level = 0;

                    for (var i = startIndex; i < data.length; ++i) {
                        if (data[i] == '{')
                            ++level;
                        else if (data[i] == '}')
                            --level;

                        // And remove it.
                        if (level < 0) {
                            data = data.substr(0, i) + data.substr(i + 1);
                            break;
                        }
                    }

                    // Do we have another one?
                    startIndex = data.search(/@(-moz-)?document[\s\S]*?{/);
                }

                // Trim any unneeded whitespace.
                data = data.trim();

                // And inject our stylesheet.
                var css = $('<style id="'+id+'" type="text/css"></style>');
                css.html(data);
                if (id){ css.attr('id', id);}
                $('head').append(css);
            }).fail(function(){
                GSXUtil.notice('Failed to load external GSX CSS', {
                                title: 'Theme update failed'
                });
            });
        }else{
            var css = $('<link id="'+id+'" type="text/css" rel="stylesheet" />');
            css.attr('href', url);
            if (id){ css.attr('id', id);}
            $('head').append(css);
        }
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
        GSXUtil.hookFunction(target, n, func, 'after');
    },
    hookBefore: function (target, n, func) {
        GSXUtil.hookFunction(target, n, func, 'before');
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
    callbacks: {
        open: function() {
            if(GSX.settings.automute && this.currItem.type != 'image'){
                GS.Services.SWF.setIsMuted(true)
            }
        },
        close: function() {
            if(GSX.settings.automute && this.currItem.type != 'image'){
                GS.Services.SWF.setIsMuted(false)
            }
        }
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

    var insertDependencies = function () {
        console.info('Depencies insertion');
        //doing it that way because magnific popup does not work well in greasemonkey sandbox induced by @require
        dependencies.js.forEach(function (s) {
            var jq = document.createElement('script');
            jq.src = s;
            jq.type = 'text/javascript';
            document.getElementsByTagName('head')[0].appendChild(jq);
        });
        dependencies.css.forEach(function (s) {
            GSXUtil.injectCSS(s);
        });
    };

    var gsxHack = function () {
        if (typeof _ === 'undefined') {
            setTimeout(gsxHack, 5);
        } else {
            insertDependencies();
            GSX.init();
        }
    };
    gsxHack();
}());