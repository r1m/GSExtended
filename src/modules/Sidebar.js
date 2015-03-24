/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, GSXUtil, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Sidebar',
  init: function () {
    'use strict';

    _.extend(GS.Views.Sidebar.prototype, {

      render: _.compose(function () {
        var item = '<li class="nav-item"><a href="#!/' +
          this.user.get('PathName') +
          '/playlists" class="nav-link playlists"><i class="icon icon-playlist"></i><span data-translate-text="PLAYLISTS" class="label">Playlists</span></a></li>';
        this.$('.coll-link-container').after(item);
      }, GS.Views.Sidebar.prototype.render)
    });
  }
});