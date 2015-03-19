/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, GSXUtil, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Broadcast',
  init: function () {
    'use strict';
    GS.Views.Modules.UpcomingSong = GS.Views.Modules.SongRowTall.extend({
      className: 'module upcoming song',
      cacheKey: 'SongUpcoming',
      templateFile: null,
      templateData:  '<div class="img-container">\
          <img class="img" width="40" height="40" src="<%= _.getCDNImage(\'blank.gif\') %>" alt="" />\
          </div>\
          <div class="inner">\
          <div class="metadata">\
              <span class="now-playing-label">COMING NEXT</span>\
              <div class="title-container">\
                  <a class="title song-link"></a>\
              </div>\
              <div class="meta-inner">\
                  <a class="meta-text artist"></a>\
                 <a class="meta-text album"></a>\
              </div>\
          </div></div>'
     
    });

  },

  afterBroadcastPackageLoaded: function () {
    'use strict';

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
    GSXUtil.hookAfter(GS.Views.Pages.Broadcast, 'updateSubpage', function () {
      console.log('updatePage', arguments);
      /* not quite ready yet
			if (this.$el.find('.card.suggestions-card .gsx-votes').length <= 0) {
                var btn = $('<a class="btn right gsx-votes" style="float:right"></a>');
                btn.html(GSX.showRealVotes ? '<i>Hide real votes</i>' : '<i>Show real votes</i>');
                btn.appendTo(this.$el.find('.card.suggestions-card .card-title')).on('click', toggleCount);
            }
			*/
    });


    _.extend(GS.Views.Pages.Broadcast.NowPlaying.prototype, {
      ui: _.extend({}, GS.Views.Pages.Broadcast.NowPlaying.prototype.ui, {
        nextSong: "#bc-upcoming-song"
      }),
      bindUIElements: _.compose(GS.Views.Pages.Broadcast.NowPlaying.prototype.bindUIElements, function () {
        this.$el.append('<div id="bc-upcoming-song">');
      }),
      onTemplate : _.compose(function () {
        this.renderUpcomingSong();
      }, GS.Views.Pages.Broadcast.NowPlaying.prototype.onTemplate),
      renderUpcomingSong: function () {
        console.log('next song change', this.model.get("nextSong") && this.model.get("nextSong").get('SongName'));
        var nextSong = this.model.get("nextSong");
        if (this.lastUpcomingSongRendered && nextSong === this.lastUpcomingSongRendered) {
          return;
        }
        this.lastUpcomingSongRendered = nextSong;
        if (!nextSong) {
          this.ui.$nextSong.addClass('hide');
          return;
        }

        this.ui.$nextSong.removeClass('hide');
        if (!this.childViews.nextSongModule || this.childViews.nextSongModule.destroyed) {
          console.log('adding next song view');
          this.childViews.nextSongModule = new GS.Views.Modules.UpcomingSong({
            el: this.ui.$nextSong,
            model: nextSong
          });
          this.childViews.nextSongModule.onDestroy = _.bind(function () {
            this.lastUpcomingSongRendered = null;
          }, this);
          //this.childViews.nextSongModule.once("rendered", _.bind(function () {
          //  this.renderActiveSongBg()
          //}, this));
          this.childViews.nextSongModule.render();
        } else {
          console.log('update next song view');
          this.childViews.nextSongModule.changeModel(nextSong);
        }
        console.log('renderupcoming done');
        

      }
    });
  }
});