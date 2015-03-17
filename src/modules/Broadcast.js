/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, GSXUtil, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Broadcast',
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
  }
});