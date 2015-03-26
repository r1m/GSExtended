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
  name: 'Linkify all',
  init: function () {
    'use strict';

    //Comments on song / profiles
    _.extend(GS.Views.Modules.Comment.prototype, {
      magnifyMessage: function () {
        var message = this.$el.find('.comment-message');
        message.html(_.emojify(message.html()));
        GSXUtil.magnify(message, GSX.settings.inlineChatImages);
      },
      completeRender: _.compose(function () {
        this.magnifyMessage();
      }, GS.Views.Modules.Comment.prototype.completeRender),

      changeModel: _.compose(function () {
        this.magnifyMessage();
      }, GS.Views.Modules.Comment.prototype.changeModel)
    });

    //Comment responses
    _.extend(GS.Views.Modules.CommentResponse.prototype, {
      magnifyMessage: function () {
        var message = this.$el.find('.response-message');
        message.html(_.emojify(message.html()));
        GSXUtil.magnify(message, GSX.settings.inlineChatImages);
      },
      completeRender: _.compose(function () {
        this.magnifyMessage();
      }, GS.Views.Modules.CommentResponse.prototype.completeRender),

      changeModel: _.compose(function () {
        this.magnifyMessage();
      }, GS.Views.Modules.CommentResponse.prototype.changeModel)
    });


    //About card description
    _.extend(GS.Views.Cards.About.prototype, {
      renderDescription: _.compose(function () {
        var desc = this.ui.$description;
        desc.html(_.emojify(desc.html()));
        GSXUtil.magnify(desc, false);
      }, GS.Views.Cards.About.prototype.renderDescription)
    });


  }
});