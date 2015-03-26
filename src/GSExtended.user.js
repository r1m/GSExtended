// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @homepage    https://ramouch0.github.io/GSExtended/
// @description Enhance Grooveshark Broadcast functionality
// @downloadURL https://ramouch0.github.io/GSExtended/src/GSExtended.user.js
// @updateURL   https://bit.ly/GSXUpdate
// @include     http://grooveshark.com/*
// @require		lib/linkified.js
// @require		lib/GSXUtil.js
// @require		modules/Autocomplete.js
// @require		modules/ChatBox.js
// @require		modules/ExternalChatBox.js
// @require		modules/SongRender.js
// @require		modules/Broadcast.js
// @require		modules/GlobalLinkify.js
// @require		modules/SocialBar.js
// @require		modules/Sidebar.js
// @version     3.2.1
// @run-at document-end
// @grant  none 
// ==/UserScript==

/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global AutoCompletePopup, Notification, FileReader, GS, GSXmodules, GSXUtil, console, Linkified, $, _ */


var dependencies = {
  css: [
    'https://ramouch0.github.io/GSExtended/src/css/gsx_core.css'
  ],
  theme: {
    'default': 'https://ramouch0.github.io/GSExtended/src/css/gsx_theme_default.css',
    'Mullins Modern': 'https://userstyles.org/styles/111563.css?ik-links=ik-1&ik-ads=ik-1&ik-chat1=ik-1&ik-homewelcome=ik-1&ik-imagebg=ik-2&ik-gsx=ik-2&ik-gsx1=ik-1&ik-bg=ik-2&ik-emoji=ik-6&ik-bgimg=ik-1',
    'none': false
  }
};
var GSBot = {
  commands: [
    '/removeNext', '/removeLast', '/fetchByName', '/removeByName', '/skip', '/fetchLast', '/previewRemoveByName',
    '/showPlaylist', '/playPlaylist', '/shuffle', '/addToCollection', '/removeFromCollection', '/help', '/ping',
    '/peek', '/guest', '/makeGuest', '/unguestAll', '/about', '[BOT]'
  ]
};
var GSX = (function () {
  'use strict';
  return {
    settings: { // default settings
      debug: false,
      notificationDuration: 3500,
      chatNotify: true,
      chatNotificationTriggers: {},
      songNotification: true,
      socialBar: true,
      chatForceAlbumDisplay: false,
      disableChatMerge: false,
      forceVoterLoading: false,
      autoVotesTimer: 6000,
      chatScrollThreshold: 65,
      replaceChatLinks: true,
      inlineChatImages: true,
      newGuestLayout: true,
      theme: 'default',
      ignoredUsers: [],
      songMarks: [],
      autoVotes: {},
      replacements: {
        'MoS': 'Master Of Soundtrack'
      },
      automute: false,
      botCommands: GSBot.commands

    },

    init: function () {
      GSX.showRealVotes = false;
      GSX.chrome = (/chrom(e|ium)/.test(navigator.userAgent.toLowerCase()));
      //bind events on GSX object;
      _.bindAll(this, 'onChatActivity', 'onSongChange', 'isInBCHistory', 'isInBCLibrary', 'isBCFriend');
      GSX.onBroadcastChange = _.debounce(GSX.onBroadcastChange, 2000); //do it here cause _ is not existing when GSX is loaded

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
          Object.defineProperty(this._Bct, 'Chat', {
            set: function (y) {
              this._Bct = y;
              GSX.afterBroadcastPackageLoaded();
            },
            get: function (y) {
              return this._Bct;
            }
          });
        },
        get: function (y) {
          return this._Bct;
        }
      });
      Object.defineProperty(GS.Views.Pages, 'Settings', {
        set: function (y) {
          this._settings = y;
          GSX.afterSettingsPageInit();
        },
        get: function (y) {
          return this._settings;
        }
      });

      this.readPrefValue();
      console.log('read GSX settings ', this.settings);
      this.updateTheme();
      console.log('register listeners');
      this.registerListeners();
      console.log('grant notif permission');
      GSXUtil.grantNotificationPermission();

      console.debug('IIIIIIIIIIIIIIIIIIIII', GSXmodules);
      GSX.modulesHook('init');

      if (this.settings.friendOfToothless) {
        console.info('MEEEP !');
        this.forbiddenFriendship();
      }
      this.bakeMuffins();


      GSXUtil.notice('Where are my dragons ?', {
        title: 'GSX',
        duration: 1000,
        type: 'warning'
      });
      console.info('-- Dragons too! ---');
    },

    modulesHook: function (hookname) {
      var args = arguments;
      GSXmodules.forEach(function (mod) {
        if (typeof mod[hookname] === 'function') {
          console.debug('>Hook', hookname, mod.name);
          mod[hookname].apply(GSX, Array.prototype.slice.call(args, 1));
          console.debug('<Hook done', mod.name);
        }
      });
    },

    modulesFilter: function (hookname) {
      var args = arguments,
        result = true;

      GSXmodules.forEach(function (mod) {
        if (typeof mod[hookname] === 'function') {
          console.debug('>Filter', hookname, mod.name);

          if (!mod[hookname].apply(GSX, Array.prototype.slice.call(args, 1))) {
            result = false;
          }
          console.debug('<Filter done', mod.name);
        }
      });

      return result;
    },
    /*
     *
     */
    afterGSAppInit: function () {
      //Let's see your dirtiest secrets !
      if (GSX.settings.debug) {
        window.gsAppModelExposed = this.model;
        window.gsAppExposed = this;
        window.GSX = GSX;
      }
      //Sorry
      this.model.on('change:user', function () {
        GSX.onUserChange(this.model.get('user'));
      }, this);
      GSX.onUserChange(this.model.get('user'));
      GSX.modulesHook('afterGSAppInit', this);
      console.info('-- In da place ---');
    },

    afterTier2Loaded: function (menus) {
      //GSX.hookSongContextMenu(menus);
      GSX.modulesHook('contextMenu', menus);
      GSX.modulesHook('afterTier2Loaded');
    },

    afterSettingsPageInit: function () {
      GSXUtil.hookAfter(GS.Views.Pages.Settings, 'updateSubpage', function (page) {
        if (page === 'preferences') {
          GSX.renderPreferences($('#preferences-subpage'));
        }
      });
      GSXUtil.hookAfter(GS.Views.Pages.Settings, 'submitPreferences', function () {
        GSX.submitPreferences(this.$el);
      });
      
      GS.Views.Pages.Settings.prototype.events["input textarea"] = "onFormChanged";
      
      GSX.modulesHook('afterSettingsPageInit');
      console.info('Caught the fish !');
    },

    afterBroadcastPackageLoaded: function () {
      GSX.modulesHook('afterBroadcastPackageLoaded');
      //GSX.hookBroadcastRenderer();
    },

    savePrefValue: function (settings) {
      this.settings = settings || this.settings;
      localStorage.setItem('gsx', JSON.stringify(this.settings));
    },

    readPrefValue: function () {
      var userSettings = JSON.parse(localStorage.getItem('gsx'));
      //filter to remove deprecated/unused settings
      userSettings = _.pick(userSettings, _.keys(this.settings), 'friendOfToothless');
      this.settings = _.extend(this.settings, userSettings);
      return this.settings;
    },

    deletePrefValue: function () {
      localStorage.removeItem('gsx');
    },


    /**
     * Toothless is your friend !
     */
    forbiddenFriendship: function () {
      //oh !
    },

    bakeMuffins: function () {
      var keys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        code = '38,38,40,40,37,39,37,39,66,65';
      $(document).keydown(function (e) {
        keys.push(e.keyCode);
        keys.splice(0, 1);
        if (keys.toString().indexOf(code) >= 0) {
          console.info('Muffins !!!');
          GSXUtil.muffinRain();
        }
      });
    },

    /*********************
     * GS Events
     *
     **********************/
    registerListeners: function () {
      GSXUtil.hookAfter(GS.Models.Broadcast, 'newChatActivity', this.onChatActivity);
      //this could be done by adding a callback on 'change:song' on the queue model,
      //but I'm too lazy to update listeners each time the queue changes (Player's view keeps it updated for us)
      GSXUtil.hookAfter(GS.Views.Player, 'onActiveSongChange', _.debounce(function () {
        console.log('onActiveSongChange', this);
        GSX.onSongChange(this.model.get('player').get('queue').get('activeSong'));
      }, 2000));
    },

    onUserChange: function (user) {
      //user : GS.Models.User
      console.debug('User Changed !', user);
      user.on('change:currentBroadcastID', this.onBroadcastChange, this);
      user.on('change:currentBroadcastOwner', this.onBroadcastChange, this);
      user.on('change', this.onUserUpdate, this);
      user.on('change:subscription', this.onUserUpdate, this);
    },

    onUserUpdate: function () {
      //console.log('User update');
    },

    onChatActivity: function (m) {
      // m : GS.Models.ChatActivity
      //console.debug('onChatActivity', m);
      if (this.settings.chatNotify) {
        if (m.get('type') === 'message' && m.get('user').id !== GS.getLoggedInUserID()) { //don't notify for our own msg
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
        if (GSX.getAutoVote(s.get('SongID')) !== 0) {
          setTimeout(function () {
            GSX.autoVoteActiveSong(GSX.getAutoVote(s.get('SongID')), s.get('SongID'));
          }, GSX.settings.autoVotesTimer);

        }
      }
      if (GS.getCurrentBroadcast()) {
        //force display refresh for approved suggestion -> update history
        GS.getCurrentBroadcast().get('approvedSuggestions').each(function (s) {
          s.trigger('change:gsx');
        });
      }
    },

    onBroadcastChange: function () {
      console.debug('onBroadcastChange', arguments);
      var bc = GS.getCurrentBroadcast();
      //force loading of broadcaster's favorites.
      if (bc) {
        bc.getOwner().getFavoritesByType('Users').then(function () {
          bc.get('chatActivities').forEach(function (c) {
            c.trigger('change');
          });
        });

        bc.getOwner().getLibrary().then(function () {
          bc.get('suggestions').each(function (s) {
            s.trigger('change:gsx'); // force views update
          });
        });
      }

    },

    /************
     * Model helpers
     ****************/

    getUser: function (userId) {
      return GS.Models.User.getCached(userId) || (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().get('listeners') && GS.getCurrentBroadcast().get('listeners').get(userId));
    },

    isInBCHistory: function (songID) {
      var b = GS.getCurrentBroadcast();
      return (b && b.attributes.history && b.attributes.history.findWhere({
        SongID: songID
      }));
    },

    isInBCLibrary: function (songID) {
      var b = GS.getCurrentBroadcast(),
        owner = (b && b.getOwner());
      if (owner && owner.attributes.library) {
        return owner.attributes.library.get(songID);
      } else {
        GSX.onBroadcastChange(); //force broadcast loading
      }
      return false;
    },

    isInRejectedList: function (songID) {
      var b = GS.getCurrentBroadcast(),
        blocked = b && GS.getCurrentBroadcast().get('blockedSuggestionSongIDs');
      return blocked && blocked.indexOf(songID) !== -1;
    },

    isBCFriend: function (userID) {
      var owner = (GS.getCurrentBroadcast() && GS.getCurrentBroadcast().getOwner());
      if (owner && owner.attributes.library) {
        return owner.attributes.favoriteUsers.get(userID);
      } else {
        GSX.onBroadcastChange(); //force broadcast loading
      }
      return false;
    },

    isGuesting: function (userID) {
      return GS.getCurrentBroadcast() && GS.getCurrentBroadcast().isUserVIP(userID);
    },

    isCurrentlyListening: function (userID) {
      return GS.getCurrentBroadcast() && GS.getCurrentBroadcast().get('listeners') && (GS.getCurrentBroadcast().get('listeners').get(userID) !== undefined);
    },

    isHotMessage: function (messages) {
      var m, i, msg,
        hot = false,
        t = GSX.settings.chatNotificationTriggers;
      for (m = 0; m < messages.length; m++) {
        msg = messages[m];
        for (i = 0; i < t.length; i++) {
          if (new RegExp('\\b' + t[i].trim() + '\\b').test(msg)) {
            hot = true;
            break;
          }
        }
      }
      return hot;
    },
    isSpoiler: function (text) {
      return text.toLowerCase().indexOf('[sp') !== -1;
    },
    isBotCommand: function (text) {
      var i;
      for (i = 0; i < GSX.settings.botCommands.length; i++) {
        if (text.indexOf(GSX.settings.botCommands[i]) === 0) {
          return true;
        }
      }
      return false;
    },
    isIgnoredUser: function (userId) {
      return (GSX.settings.ignoredUsers.indexOf(userId) !== -1);
    },

    setIgnoredUser: function (userId, ignore) {
      if (ignore) {
        GSX.settings.ignoredUsers.push(userId);
        GSX.settings.ignoredUsers = _.uniq(GSX.settings.ignoredUsers);
      } else {
        GSX.settings.ignoredUsers = _.without(GSX.settings.ignoredUsers, userId);
      }
      GSX.savePrefValue();
    },

    isSongMarked: function (songid) {
      return (GSX.settings.songMarks.indexOf(songid) !== -1);
    },

    markSong: function (songid, mark) {
      if (mark) {
        GSX.settings.songMarks.push(songid);
        GSX.settings.songMarks = _.uniq(GSX.settings.songMarks);
      } else {
        GSX.settings.songMarks = _.without(GSX.settings.songMarks, songid);
      }
      GSX.savePrefValue();
    },

    getAutoVote: function (songid) {
      return GSX.settings.autoVotes[songid] || 0;
    },

    setAutoVote: function (songid, score) {
      if (score !== 0) {
        GSX.settings.autoVotes[songid] = score;
      } else {
        delete GSX.settings.autoVotes[songid];
      }
      GSX.savePrefValue();
      if (score !== 0 && GS.getCurrentBroadcast() && GS.getCurrentBroadcast().get('activeSong') && GS.getCurrentBroadcast().get('activeSong').get('SongID') === songid) {
        GSX.autoVoteActiveSong(score, songid);
      }
    },

    autoVoteActiveSong: function (score, songid) {
      if (GS.getCurrentBroadcast()) {
        if (GS.getCurrentBroadcast().get('activeSong').get('SongID') === songid) {
          GS.getCurrentBroadcast().voteActiveSong(score);
          GSXUtil.notice(GS.getCurrentBroadcast().get('activeSong').get('SongName'), {
            title: 'GSX Auto ' + (score > 0 ? 'Upvote' : 'Downvote') + ' !',
            type: 'info'
          });
        } else {
          //we give up
          GSXUtil.notice('Autovote failed, you\'re not in sync with broadcast', {
            title: 'GSX Autovote failed !',
            type: 'error'
          });
        }

      }
    },

    showAutovotes: function () {
      var songIds = _.keys(GSX.settings.autoVotes);
      GS.trigger('lightbox:open', 'generic', {
        view: {
          headerHTML: 'Autovoted Songs (' + songIds.length + ')',
          messageHTML: '<div id="gsx-autovote-songs"></div>'
        }
      });
      GS.Services.API.getQueueSongListFromSongIDs(songIds).done(function (songs) {
        var grid = new GS.Views.SongGrid({
          el: $.find('#gsx-autovote-songs')[0],
          collection: new GS.Models.Collections.Songs(songs)
        });
        grid.render();
        $('#lightbox').css({
          width: '630px'
        });
      });
    },

    showMarkedSongs: function () {
      var songIds = (GSX.settings.songMarks);
      GS.trigger('lightbox:open', 'generic', {
        view: {
          headerHTML: 'Marked Songs (' + songIds.length + ')',
          messageHTML: '<div id="gsx-marked-songs"></div>'
        },
        onDestroy: function () {
          console.log('close lightbox');
        }
      });
      GS.Services.API.getQueueSongListFromSongIDs(songIds).done(function (songs) {
        var grid = new GS.Views.SongGrid({
          el: $.find('#gsx-marked-songs')[0],
          collection: new GS.Models.Collections.Songs(songs)
        });
        grid.render();
        $('#lightbox').css({
          width: '630px'
        });
      });
    },

    showImportDialog: function () {
      GS.trigger('lightbox:open', {
        view: {
          headerHTML: 'Import / Export GSX settings and data',
          messageHTML: '<div><div>Export : <a class="btn export" style="float:none" id="gsx-export-btn">Download settings file</a></div><br /><div>Import: <input type="file" id="gsx-fileInput" class="hide" accept=".gsx"/><a class="btn import" style="float:none" id="gsx-import-btn">Import a file (.gsx)</a><span id="import-result"></span></div></div>'
        },
        callbacks: {
          ".export": function () {
            var settings = localStorage.getItem('gsx');
            $('#downloadFile').remove();
            $('<a></a>').attr('id', 'downloadFile').attr('href', 'data:text/plain;charset=utf8,' + encodeURIComponent(settings)).attr('download', 'usersettings.gsx').appendTo('body');
            $('#downloadFile').ready(function () {
              $('#downloadFile').get(0).click();
            });
          },
          '.import': function () {
            $('#gsx-fileInput').off('change').on('change', function () {
              var file = this.files[0],
                reader;
              if ((file.name.lastIndexOf('.gsx') === file.name.length - 4)) {
                reader = new FileReader();
                reader.onload = function (e) {
                  try {
                    var importedsettings = JSON.parse(reader.result);
                    console.debug('Imported settings', importedsettings);
                    GSX.savePrefValue(_.defaults(importedsettings, GSX.settings));
                    console.debug('New settings', GSX.settings);
                    GSX.renderPreferences($('#preferences-subpage'));
                    GSX.updateTheme();
                    GS.trigger('lightbox:close');
                  } catch (error) {
                    $('#import-result').html('Invalid file !');
                  }
                };
                reader.onerror = function (e) {
                  $('#import-result').html('Invalid file !');
                };
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

    updateTheme: function () {
      console.log('Update GSX theme');
      $('#gsxthemecss').prop('disabled', true).remove();
      if (dependencies.theme[GSX.settings.theme]) {
        GSXUtil.injectCSS(dependencies.theme[GSX.settings.theme], 'gsxthemecss');
      }
    },

    addSongClasses: function (el, songID) {
      // add classes for history/library/auto votes
      //song is in BC library
      el[GSX.isInBCLibrary(songID) ? 'addClass' : 'removeClass']('bc-library');
      //song is in BC history
      el[GSX.isInBCHistory(songID) ? 'addClass' : 'removeClass']('bc-history');
      el[GSX.isInRejectedList(songID) ? 'addClass' : 'removeClass']('bc-rejected');
      // song is in auto votes list
      el[GSX.getAutoVote(songID) === 1 ? 'addClass' : 'removeClass']('auto-upvote');
      el[GSX.getAutoVote(songID) === -1 ? 'addClass' : 'removeClass']('auto-downvote');
      el[GSX.isSongMarked(songID) ? 'addClass' : 'removeClass']('marked');
    },

    /**
     * After GS renderPreferences page, we insert our own settings
     */
    renderPreferences: function (el) {
      var chatTriggers = GSX.settings.chatNotificationTriggers,
        defaultTrigger = (GS.Models.User.getCached(GS.getLoggedInUserID()) && [GS.Models.User.getCached(GS.getLoggedInUserID()).get('Name')]),
        s = '',
        rep = '',
        i,
        r;
      console.log('Render GSX preferences', el);
      el.find('#settings-gsx-container').remove();
      el.append(
        '<div id="settings-gsx-container" class="card">\
        <div class="card-title" ><h2 class="title">Grooveshark Extended Settings <a class="btn right" id="gsx-settings-export-btn">Export/Import settings</a></h2></div>\
        <div class="card-content">\
		<a class="btn right" id="gsx-autovotes-btn" style="float:right">Show autovoted songs</a>\
        <a class="btn right" id="gsx-marked-btn" style="float:right">Show marked songs</a>\
        <ul class="controls">\
            <li  class="crossfade" >\
                <label for="settings-gsx-theme">Choose a theme for GSX and Grooveshark.</label>\
                <select id="settings-gsx-theme" ><option>' + Object.getOwnPropertyNames(dependencies.theme).join('</option><option>') + '</option></select>\
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
                <input id="settings-gsx-chatForceAlbumDisplay" type="checkbox">\
                <label for="settings-gsx-chatForceAlbumDisplay" >Force display of album name in chat notifications.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-disableChatMerge" type="checkbox">\
                <label for="settings-gsx-disableChatMerge" >Disable merging of multiple chat messages.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-forceVoterLoading" type="checkbox">\
                <label for="settings-gsx-forceVoterLoading">Force-load offline voter\'s name <em>(will try to fetch users\' names if not in cache. <strong>BE CAREFUL</strong>, it can be a lot if you are in a broadcast with 300+ listeners)</em>.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-songNotification" type="checkbox">\
                <label for="settings-gsx-songNotification">Show a desktop notification when active song changes.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-socialBar" type="checkbox">\
                <label for="settings-gsx-socialBar">Display a social bar containing the status of the people you follow.</label>\
            </li>\
            <li>\
                <input id="settings-gsx-chatNotification" type="checkbox">\
                <label for="settings-gsx-chatNotification">Show a desktop notification when someone post a message containing one of these words (1/line, case sensitive):</label>\
                <br /><textarea id="settings-gsx-chatNotificationTriggers" rows="5" cols="50"></textarea>\
            </li>\
            <li>\
                <label for="settings-gsx-chatReplacement">Text replacement in chat. Can be used for command shortcuts or ypos.<br /><em>One per line, use &lt;Key&gt;=&lt;Value&gt; format like "MoS=Master Of Soundtrack"</em></label>\
                <br /><textarea id="settings-gsx-chatReplacement" rows="5" cols="150"></textarea>\
            </li>\
            <li class="crossfade" id="autovote-timer">\
                <label for="settings-gsx-autoVotesTimer">Waiting time before autovote in miliseconds (change if you are always out of sync)</label>\
                <input id="settings-gsx-autoVotesTimer" type="text" size="10">\
            </li>\
            <li>\
                <input id="settings-gsx-automute" type="checkbox">\
                <label for="settings-gsx-automute">Auto-mute the player when a video link is opened</em></label>\
            </li>\
            <li class="crossfade hide" id="notification-duration">\
                <label for="settings-gsx-notificationDuration">Duration of notifications in miliseconds <b>(ONLY works in Chrome !)</b></label>\
                <input id="settings-gsx-notificationDuration" type="text" size="10">\
            </li>\
            </ul>\
            <img id="toothless-avatar" src="http://images.gs-cdn.net/static/users/21218701.png" />\
            </div></div>'
      );
      //$(el.find('#settings-gsx-newGuestLayout')).prop('checked', GSX.settings.newGuestLayout);
      $(el.find('#settings-gsx-chatForceAlbumDisplay')).prop('checked', GSX.settings.chatForceAlbumDisplay);
      $(el.find('#settings-gsx-replaceChatLinks')).prop('checked', GSX.settings.replaceChatLinks);
      $(el.find('#settings-gsx-inlineChatImages')).prop('checked', GSX.settings.inlineChatImages);
      $(el.find('#settings-gsx-forceVoterLoading')).prop('checked', GSX.settings.forceVoterLoading);
      $(el.find('#settings-gsx-songNotification')).prop('checked', GSX.settings.songNotification);
      $(el.find('#settings-gsx-socialBar')).prop('checked', GSX.settings.socialBar);
      $(el.find('#settings-gsx-chatNotification')).prop('checked', GSX.settings.chatNotify);
      $(el.find('#settings-gsx-disableChatMerge')).prop('checked', GSX.settings.disableChatMerge);
      $(el.find('#settings-gsx-automute')).prop('checked', GSX.settings.automute);
      $(el.find('#settings-gsx-notificationDuration')).prop('value', GSX.settings.notificationDuration);
      $(el.find('#settings-gsx-autoVotesTimer')).prop('value', GSX.settings.autoVotesTimer);
      $(el.find('#settings-gsx-theme')).val(GSX.settings.theme);
      $(el.find('#gsx-autovotes-btn')).on('click', GSX.showAutovotes);
      $(el.find('#gsx-marked-btn')).on('click', GSX.showMarkedSongs);
      $(el.find('#gsx-settings-export-btn')).on('click', GSX.showImportDialog);

      if (!_.isArray(GSX.settings.chatNotificationTriggers)) {
        GSX.settings.chatNotificationTriggers = defaultTrigger;
      }

      for (i = 0; i < chatTriggers.length; i++) {
        s += chatTriggers[i] + '\n';
      }
      $(el.find('#settings-gsx-chatNotificationTriggers')).val(s);

      for (r in GSX.settings.replacements) {
        if (GSX.settings.replacements.hasOwnProperty(r)) {
          rep += r + '=' + GSX.settings.replacements[r] + '\n';
        }
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
      var repstrings = $(el.find('#settings-gsx-chatReplacement')).val().trim().split('\n'),
        rep = {},
        v,
        i;
      //GSX.settings.newGuestLayout = $(el.find('#settings-gsx-newGuestLayout')).prop('checked');
      GSX.settings.chatForceAlbumDisplay = $(el.find('#settings-gsx-chatForceAlbumDisplay')).prop('checked');
      GSX.settings.replaceChatLinks = $(el.find('#settings-gsx-replaceChatLinks')).prop('checked');
      GSX.settings.inlineChatImages = $(el.find('#settings-gsx-inlineChatImages')).prop('checked');
      GSX.settings.forceVoterLoading = $(el.find('#settings-gsx-forceVoterLoading')).prop('checked');
      GSX.settings.songNotification = $(el.find('#settings-gsx-songNotification')).prop('checked');
      GSX.settings.socialBar = $(el.find('#settings-gsx-socialBar')).prop('checked');
      GSX.settings.chatNotify = $(el.find('#settings-gsx-chatNotification')).prop('checked');
      GSX.settings.disableChatMerge = $(el.find('#settings-gsx-disableChatMerge')).prop('checked');
      GSX.settings.automute = $(el.find('#settings-gsx-automute')).prop('checked');
      GSX.settings.notificationDuration = $(el.find('#settings-gsx-notificationDuration')).prop('value');
      GSX.settings.autoVotesTimer = $(el.find('#settings-gsx-autoVotesTimer')).prop('value');
      GSX.settings.chatNotificationTriggers = $(el.find('#settings-gsx-chatNotificationTriggers')).val().trim().split('\n');
      GSX.settings.theme = $(el.find('#settings-gsx-theme')).val();


      for (i = 0; i < repstrings.length; i++) {
        v = repstrings[i].split('=', 2);
        if (v.length === 2) {
          rep[v[0].trim()] = v[1].trim();
        }
      }
      GSX.settings.replacements = rep;
      GSX.savePrefValue();
      GSX.updateTheme();
      GSX.modulesHook('settingsUpdated');
      console.debug('GSX Settings saved', GSX.settings);
    }
  };
}());

var GSXmagnifyingSettings = {
  iframe: {
    patterns: {
      dailymotion: {
        index: 'dailymotion.com',
        id: function (url) {
          'use strict';
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
          'use strict';
          var regExp = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&#]+)/,
            match = url.match(regExp);
          if (match && match[1].length === 11) {
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
  'use strict';
  var insertDependencies = function () {
      console.info('GSX CSS insertion');
      dependencies.css.forEach(function (s) {
        GSXUtil.injectCSS(s);
      });
    },
    //wait for GS core to be loaded.
    gsxHack = function () {
      if (typeof _ === 'undefined') {
        setTimeout(gsxHack, 5);
      } else {
        insertDependencies();
        GSX.init();
      }
    };
  gsxHack();
}());