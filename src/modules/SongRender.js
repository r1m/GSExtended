/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, GSXUtil, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Song render',
  init: function () {
    'use strict';
    //redefine song/suggestion display

    // small display: album list, collection, favs...
    //var songrender = GS.Views.Modules.SongRowBase.prototype.modelEvents['change'];
    GS.Views.Modules.SongRowBase.prototype.modelEvents['change:gsx'] = function (e) {
      //delegate
      //songrender.apply(this, arguments);
      GSX.addSongClasses(this.$el, this.model.get('SongID'));
    };
    GS.Views.Modules.SongCell.prototype.modelEvents = GS.Views.Modules.SongCell.prototype.modelEvents || {};
    GS.Views.Modules.SongCell.prototype.modelEvents['change:gsx'] = GS.Views.Modules.SongRowBase.prototype.modelEvents['change:gsx'];

    //queue song
    var queuesongrender = GS.Views.Modules.SongRowQueue.prototype.changeModelSelectors['&'];
    GS.Views.Modules.SongRowQueue.prototype.changeModelSelectors['&'] = function (e, t) {
      //delegate
      queuesongrender.apply(this, arguments);
      GSX.addSongClasses(this.$el, this.model.get('SongID'));
    };
    
    
    _.extend(GS.Views.Modules.SongRowBase.prototype, {
      showVotes: function (votes, el) {
        var tooltip = '-',
          voters = [],
          votersLeft = [],
          separator = '<br />--<br />'; //(GSX.chrome ? ' \u21A3 ' : ' `\uD83D\uDEAA.. '); //chrome can't display the door emoji;
        if (_.isArray(votes) && votes.length > 0) {
          _.each(votes, function (v) {
            var name = ' ? ',
              user = GSX.getUser(v);
            if (user) {
              name = user.get('Name');
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

          tooltip = voters.length + ': ' + voters.join(', ') + (votersLeft.length > 0 ? separator + votersLeft.join(', ') : '');
        }
        GSXUtil.tooltip({
          html: tooltip,
          positionDir: 'right'
        }, el);
      },
      showDownVotes: function (e) {
        this.showVotes(this.model.get('downVotes') || [], e);
      },
      showUpVotes: function (e) {
        console.log('show votes');
        this.showVotes(this.model.get('upVotes') || [], e);
      }
    });


    _.extend(GS.Views.Modules.SongRowBC.prototype, {
      /*ui: _.extend({}, GS.Views.Modules.SongRowBC.prototype.ui, {
				gsxupvotes: ".gsxupvotes",
				gsxdownvotes: ".gsxdownvotes"
            }),*/
      events: _.extend({}, GS.Views.Modules.SongRowBC.prototype.events, {
        'mouseenter .votes': 'showUpVotes',
        'mouseenter .gsxupvotes': 'showUpVotes',
        'mouseenter .gsxdownvotes': 'showDownVotes',
      })
        /*,
			bindUIElements: function() {
				this.$('.row-actions').prepend('<div class="detailledvotes"><span class="gsxupvotes">0</span><span class="gsxdownvotes">0</span></div>');
				GS.Views.Modules.SongRowBase.prototype.bindUIElements.apply(this, arguments);
			}*/
    });

    _.extend(GS.Views.Modules.SongRowBCActive.prototype, {
      ui: _.extend({}, GS.Views.Modules.SongRowBCActive.prototype.ui, {
        gsxupvotes: ".gsxupvotes",
        gsxdownvotes: ".gsxdownvotes"
      }),
      events: _.extend({}, GS.Views.Modules.SongRowBCActive.prototype.events, {
        'mouseenter .votes': 'showUpVotes',
        'mouseenter .gsxupvotes': 'showUpVotes',
        'mouseenter .gsxdownvotes': 'showDownVotes',
      }),
      bindUIElements: function () {
        this.$('.row-actions').prepend('<div class="detailledvotes"><span class="gsxupvotes">0</span><span class="gsxdownvotes">0</span></div>');
        GS.Views.Modules.SongRowBase.prototype.bindUIElements.apply(this, arguments);
      }
    });
    GS.Views.Modules.SongRowBCActive.prototype.modelEvents['change:downVotes change:upVotes change:downVoteCount change:upVoteCount'] = function (e) {
      //console.log('votes changed', e);
      if (e.get) {
        var up = e.get("upVotes").length,
          down = e.get("downVotes").length;
        this.ui.$gsxupvotes.text(up);
        this.ui.$gsxdownvotes.text(down);
      }

    };
  },
  contextMenu: function (contextMenus) {
    'use strict';
    var menus = ['getContextMenuForSongRowMoreCombined',
                       'getContextMenuForSongRowMore',
                       'getContextMenuForSong',
                       'getAddSongContextMenu',
                       'getContextMenuForQueueSong', 'getMultiContextMenuForSongs'];

    function getVoteMenuFor(songs) {
      var items = [],
        hasAuto = _.reduce(songs, function (memo, s) {
          return memo || GSX.getAutoVote(s.get('SongID')) !== 0;
        }, false);

      function setVotes(songs, vote, notice) {
        _.each(songs, function (s) {
          GSX.setAutoVote(s.get('SongID'), vote);
          s.trigger('change:gsx');
        });
        var text = songs.length > 1 ? (songs.length + ' songs') : songs[0].get('SongName');
        GSXUtil.notice(text, {
          title: notice
        });
      }
      if (hasAuto) {
        //remove auto vote
        items.push({
          title: 'Remove auto vote',
          itemClass: 'gsx-removevote',
          click: function () {
            setVotes(songs, 0, 'Removed from auto vote');
          }
        });
      } else {

        items.push({
          title: 'Up vote',
          itemClass: 'gsx-upvote',
          click: function () {
            setVotes(songs, 1, 'Added to auto UP vote');
          }
        }, {
          title: 'Down vote',
          itemClass: 'gsx-downvote',
          click: function () {
            setVotes(songs, -1, 'Added to auto DOWN vote');
          }
        });
      }
      return items;
    }

    console.log('Context song menu hook');
    menus.forEach(function (m) {
      var delegate = contextMenus[m],
        gsxMenuHandle = function (selection, ctx) {
          var menu = delegate.apply(this, arguments),
            gsxItems = [],
            hasMark,
            songs = _.isArray(selection) ? selection : [selection];
          //console.log(m, arguments, menu);
          //return menu;
          gsxItems.push({
            type: 'divider'
          }, {
            type: 'html',
            html: '<a class="menu-item gsx-autovote"><span class="menu-title">GSX Autovote</span><i class="icon icon-caretright"></i></a>',
            subMenu: {
              tooltipClass: 'menu sub-menu auto-vote',
              items: getVoteMenuFor(songs)
            }
          });

          hasMark = _.reduce(songs, function (memo, s) {
            return memo || GSX.isSongMarked(s.get('SongID'));
          }, false);

          gsxItems.push({
            title: hasMark ? 'GSX Unmark' : 'GSX Mark',
            itemClass: 'gsx-marksong',
            click: function () {
              var notice = hasMark ? 'Mark Removed' : 'Mark Added',
                text = songs.length > 1 ? (songs.length + ' songs') : songs[0].get('SongName');
              _.each(songs, function (s) {
                GSX.markSong(s.get('SongID'), !hasMark);
                s.trigger('change:gsx');
              });

              GSXUtil.notice(text, {
                title: notice
              });
            }
          });

          //add classes for easier skinning
          menu.items.forEach(function (item) {
            if (item.localeKey) {
              item.itemClass = (item.itemClass || '') + ' ' + item.localeKey;
            }
          });
          menu.items.push.apply(menu.items, gsxItems);
          return menu;
        };
      contextMenus[m] = gsxMenuHandle;

    });
    console.log('Context menu for songs installed');
  }
});