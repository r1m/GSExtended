/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global AutoCompletePopup, GS, GSX, GSXUtil, console, $, _ */

/**
Available hooks are:
init : After GSX initialisation
afterGSAppInit : After the first rendering of GS App
afterSettingsPageInit : Settings Page is displayed
contextMenu : after GS context menus are initialized, receive actual menus as param
afterTier2Loaded :
afterBroadcastPackageLoaded : when Broadcast related module is loaded
settingsUpdated : when GSX settings are updated
*/

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Chat box',
  init: function () {
    'use strict';

    GS.Models.ChatActivity.prototype.getText = (function (getText) {
      return function () {
        var txt = getText.apply(this, arguments),
          lines,
          u,
          wraplines = function (txt) {
            var classes = ['msg-line'];
            if (GSX.isSpoiler(txt)) {
              classes.push('spoiler-msg');
            }
            if (GSX.isHotMessage([txt])) {
              classes.push('hot-msg');
            }
            if (GSX.isBotCommand(txt)) {
              classes.push('bot-command');
            }
            return '<span class="' + classes.join(' ') + '">' + txt + '</span>';
          };
        if (this.get('messages')) {
          lines = txt.split('<br/>'); //split messages into single
          u = this.get('user');
          if (u && !u.get('IsPremium')) {
            lines = _.map(lines, _.emojify);
          }
          lines = _.map(lines, wraplines);
          txt = lines.join('<hr />'); //join them with hr instead of br
        }
        if (GSX.settings.chatForceAlbumDisplay && this.get('song')) {
          txt += '<br />| ' + this.get('song')._wrapped.getAlbumAnchorTag();
        }
        return txt;
      };
    }(GS.Models.ChatActivity.prototype.getText));

    GS.Models.ChatActivity.prototype.merge = (function (merge) {
      return function (newChat) {
        if (this.get('type') === 'message' && GSX.settings.disableChatMerge) {
          return false;
        }
        return merge.apply(this, arguments);
      };
    }(GS.Models.ChatActivity.prototype.merge));

    /*
     * redefine chat view
     */
    GS.Views.Modules.ChatActivity.prototype.changeModelSelectors['.message'] = (function (renderer) {
      return function () {
        renderer.apply(this, arguments);
        this.renderGSX();
      };
    }(GS.Views.Modules.ChatActivity.prototype.changeModelSelectors['.message']));

    /*GSXUtil.hookAfter(GS.Views.Modules.ChatActivity, 'update', function () {
        this.renderGSX();
    });*/
    GSXUtil.hookAfter(GS.Views.Modules.ChatActivity, 'completeRender', function () {
      this.renderGSX();
    });

    //install event to display detailed votes
    _.extend(GS.Views.Modules.ChatActivity.prototype.events, {
      'mouseenter .icon-ignore': 'showIgnoreTooltip',
      'click .icon-ignore': 'toggleIgnore',
      'click .img-container': 'onThumbnailClick',
      'click .spoiler-msg': 'revealSpoiler',
      'mouseenter .spoiler-msg': 'showSpoilerTooltip'
    });

    _.extend(GS.Views.Modules.ChatActivity.prototype, {
      renderGSX: function () {
        var isFriend = this.model.get('user') && GSX.isBCFriend(this.model.get('user').id),
          isIgnored = this.model.get('user') && GSX.isIgnoredUser(this.model.get('user').id),
          isHotMsg = this.model.get('messages') && GSX.isHotMessage(this.model.get('messages')),
          spanmsg;
        this.$el[isFriend ? 'addClass' : 'removeClass']('friend-activity');
        if (this.model.get('song')) {
          GSX.addSongClasses(this.$el, this.model.get('song').get('SongID'));
        }


        this.$el[isHotMsg ? 'addClass' : 'removeClass']('hot-activity');
        this.$el[isIgnored ? 'addClass' : 'removeClass']('ignored');
        this.$el.find('.icon-ignore')[isIgnored ? 'addClass' : 'removeClass']('ignore-success');
        this.$el.find('.img-container').addClass('mfp-zoom');
        this.$el.find('.username').addClass('show-user-tooltip');

        if (this.model.get('type') === 'message') {
          if (GSX.settings.replaceChatLinks) {
            spanmsg = this.$el.find('.message');
            if (spanmsg.length > 0) {
              GSXUtil.magnify(spanmsg, GSX.settings.inlineChatImages);
            }
          }
          if (this.model.get('user').id !== GS.getLoggedInUserID() && this.$el.find('.icon-ignore').length <= 0) {
            $('<i class="icon icon-ignore icon-comments"></i>').prependTo(this.$el.find('.chat-actions'));
          }
        }
      },
      toggleIgnore: function (el) {
        var uid = this.model.get('user').id;
        GSX.setIgnoredUser(uid, !GSX.isIgnoredUser(uid));
        //force refresh
        GS.getCurrentBroadcast().get('chatActivities').forEach(function (c) {
          if (c.get('user') && c.get('user').id === uid) {
            c.trigger('change');
          }
        });
      },
      revealSpoiler: function (e) {
        var el = $(e.currentTarget),
          txt = el.text(),
          //rot13 the message to hide spoilers
          msg = txt.replace(/\[(sp.*)\](.+)/ig, function (m, tag, spoil, off, str) {
            return '[' + tag + ']' + GSXUtil.rot13(spoil);
          });
        el.text(msg).removeClass('spoiler-msg');
        GSXUtil.magnify(el, GSX.settings.inlineChatImages);
      },
      showSpoilerTooltip: function (el) {
        GSXUtil.tooltip({
          text: 'Spoiler: click to reveal'
        }, el);
      },
      showIgnoreTooltip: function (el) {
        var text = $(el.currentTarget).hasClass('ignore-success') ? 'Unblock' : 'Ignore';
        GSXUtil.tooltip({
          text: text,
          positionDir: 'left'
        }, el);
      },
      onThumbnailClick: function () {
        var imglink = false,
          title = '',
          picture;
        if (!this.model.get('song')) {
          picture = this.model.get('user').get('Picture');
          if (picture) {
            imglink = GS.Models.User.artPath + picture;
          }
          title = this.model.get('user').get('Name');
        } else {
          picture = this.model.get('song').get('CoverArtFilename');
          if (picture) {
            imglink = GS.Models.Album.artPath + '/500_' + picture;
          }
          title = this.model.get('song').get('AlbumName');
        }
        if (imglink) {
          GSXUtil.openLightbox({
            image: imglink,
            title: title
          });
        }
      }
    });

    GS.Models.Broadcast.prototype.sendChatMessage = (function (send) {
      return function (msg) {
        var r, key, reg;
        for (r in GSX.settings.replacements) {
          if (GSX.settings.replacements.hasOwnProperty(r)) {
            key = r.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1'); //escape regex specials
            reg = new RegExp('((^)' + key + '|(\\s)' + key + ')\\b', 'ig');
            if (reg.test(msg)) {
              msg = msg.replace(reg, '$3' + GSX.settings.replacements[r]);
            }
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
    }(GS.Models.Broadcast.prototype.sendChatMessage));
  },

  afterBroadcastPackageLoaded: function () {
    'use strict';
    GSXUtil.hookAfter(GS.Views.Pages.Broadcast.Chat, 'onTemplate', function () {
      function search(text, position) {
        var autocomplete,
          results = [],
          name,
          i;
        if (position === 0 && GSX.isGuesting(GS.getLoggedInUserID())) {
          for (i = 0; i < GSX.settings.botCommands.length; i++) {
            if (GSX.settings.botCommands[i].toLowerCase().indexOf(text.toLowerCase()) === 0) {
              results.push({
                text: GSX.settings.botCommands[i],
                icon: '<span class="icon bot-icon"></span>'
              });
            }
          }
          results = results.slice(0, 5); //slice to only return 5 commands (most used)
        }
        if (text.charAt(0) === '@' && text.length > 1) {
          name = text.substring(1);
          GS.getCurrentBroadcast().get('listeners').each(function (u) {
            if (u.get('Name').toLowerCase().indexOf(name.toLowerCase()) === 0) {
              results.push({
                text: u.escape('Name'),
                icon: '<img src="' + u.getImageURL(30) + '" />'
              });
            }
          });
        }
        return results;
      }
      var autocomplete = new AutoCompletePopup($('input.chat-input'), ['/', '!', '@'], search);
    });

    GS.Views.Pages.Broadcast.Chat.prototype.updateIsUserScrolledToBottom = function () {
      var e = this.ui.$scrollView[0],
        t;
      if (!e) {
        return;
      }
      t = Math.abs(e.scrollHeight - e.scrollTop - e.clientHeight) <= GSX.settings.chatScrollThreshold;
      this.model.set("isUserScrolledToBottom", t);
    };
  }
});