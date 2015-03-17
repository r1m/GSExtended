/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'social bar',
  afterTier2Loaded: function () {
    'use strict';
    if (GS.Views.Modules.SocialBar === undefined) {
      GS.Views.Modules.SocialBar = GS.Views.Pages.Onlinefriends.extend({
        className: 'social-bar',
        id: 'gsx-social-bar',

        initialize: function (p_Options) {
          // Call base initializer.
          GS.Views.Pages.Onlinefriends.prototype.initialize.call(this, p_Options);

          this.originalThrottle = this.model.updateOnlineFriendsThrottle;
          this.model.updateOnlineFriendsThrottle = _.bind(this.updateOnlineFriends, this);

          this.listenTo(this.model, 'change', this.render);
          return this.render();
        },

        render: function () {
          console.debug('Render Social bar');
          // We're re-rendering everything every time.
          // This isn't very efficient; optimize.
          var s_UserItems = [],
            s_OnlineFriends = this.model.get('onlineFriends');

          // First add the users who have broadcasts.
          s_OnlineFriends.each(function (p_User) {
            var s_Element,
              s_Title = $('<a class="sbar-title" href="#"></a>'),
              s_Song = $('<a class="sbar-song" href="#"></a>'),
              s_PlayingSong = p_User.get('nowPlayingSong'),
              s_BroadcastID = p_User.get('currentBroadcastID'),
              s_By;
            s_Element = $('<div class="sbar-user"><a class="img-container" href="' + p_User.toUrl() + '"><img class="user-img img" src="' + p_User.getImageURL() + '"/></a><div class="sbar-data"></div><div class="clear"></div></div>');

            s_Element.find('.sbar-data').append(s_Title).append(s_Song);

            s_Title.text(p_User.get('Name'));
            s_Title.attr('href', p_User.toUrl());

            // Is this user playing a song?
            if (s_PlayingSong !== null) {
              s_Song.text(s_PlayingSong.get('ArtistName') + ' - ' + s_PlayingSong.get('SongName'));
              s_Song.attr('href', s_PlayingSong.toUrl());
            }

            // Is this user in a broadcast?
            if (s_BroadcastID === null) {
              return;
            }
            // Is the user hosting this broadcast?
            if (p_User.get('currentBroadcastOwner') !== null) {
              return;
            }
            s_Title.text(p_User.get('currentBroadcastName'));
            s_Title.attr('href', p_User.toUrl('broadcast/current'));

            s_By = $('<a class="sbar-by" href="#"></a>');
            s_By.text('by ' + p_User.get('Name'));
            s_By.attr('href', p_User.toUrl());

            s_Element.find('.sbar-data').append(s_By);

            s_UserItems.push(s_Element);

            // Get all the users listening to this broadcast.
            s_OnlineFriends.each(function (p_OtherUser) {
              if (p_OtherUser.id === p_User.id) {
                return;
              }
              if (p_OtherUser.get('currentBroadcastID') !== s_BroadcastID) {
                return;
              }

              var s_OtherElement = $('<div class="sbar-user sbar-listener"><a class="img-container" href="' + p_OtherUser.toUrl() + '"><img class="user-img img" src="' + p_OtherUser.getImageURL() + '"/></a><div class="sbar-data"></div><div class="clear"></div></div>'),
                s_OtherTitle = $('<a class="sbar-title" href="#"></a>');

              s_OtherElement.find('.sbar-data').append(s_OtherTitle);

              s_OtherTitle.text(p_OtherUser.get('Name'));
              s_OtherTitle.attr('href', p_OtherUser.toUrl());

              s_UserItems.push(s_OtherElement);
            });
          });

          // Then add all the users who are not in broadcasts.
          s_OnlineFriends.each(function (p_User) {
            var s_Element,
              s_Title = $('<a class="sbar-title" href="#"></a>'),
              s_Song = $('<a class="sbar-song" href="#"></a>'),
              s_PlayingSong = p_User.get('nowPlayingSong'),
              s_BroadcastID = p_User.get('currentBroadcastID');

            s_Element = $('<div class="sbar-user no-song no-bc"><a class="img-container" href="' + p_User.toUrl() + '"><img class="user-img img" src="' + p_User.getImageURL() + '"/></a><div class="sbar-data"></div><div class="clear"></div></div>');

            s_Element.find('.sbar-data').append(s_Title).append(s_Song);

            s_Title.text(p_User.get('Name'));
            s_Title.attr('href', p_User.toUrl());

            // Is this user playing a song?
            if (s_PlayingSong !== null) {
              s_Element.removeClass('no-song');
              s_Song.text(s_PlayingSong.get('ArtistName') + ' - ' + s_PlayingSong.get('SongName'));
              s_Song.attr('href', s_PlayingSong.toUrl());
            }

            // Is this user in a broadcast?
            if (s_BroadcastID !== null) {
              return;
            }
            s_UserItems.push(s_Element);
          });

          this.$el.html(s_UserItems);
          return this;
        },

        updateOnlineFriends: function () {
          this.originalThrottle.call(this.model);
          this.render();
        }
      });
    }

    if (GSX.socialBar !== undefined || $('#gsx-social-bar-container').length > 0) {
      return;
    }
    var s_Container, s_User = GSX.getUser(GS.getLoggedInUserID());

    if (s_User === null) {
      return;
    }
    GSX.socialBar = new GS.Views.Modules.SocialBar({
      params: {
        user: s_User
      }
    });
    GSX.socialBar.render();
    s_Container = $('<div id="gsx-social-bar-container"></div>');
    s_Container.append(GSX.socialBar.$el);
    $('#chat-sidebar').after(s_Container);
    $('body').addClass('socialbarOpen');
  }
});