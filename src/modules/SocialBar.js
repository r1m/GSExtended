/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];

GSXmodules.push({
  name: 'Social Bar',
  init: function()
  {
    'use strict';

    var initializeBar = function()
    {
      // Define our custom view.
      if (GS.Views.Modules.SocialBar === undefined)
      {
        GS.Views.Modules.SocialBar = GS.Views.Pages.Onlinefriends.extend({
          className: 'social-bar scrollable',
          id: 'gsx-social-bar',

          initialize: function(p_Options)
          {
            // Call base initializer.
            GS.Views.Pages.Onlinefriends.prototype.initialize.call(this, p_Options);

            this.originalThrottle = this.model.updateOnlineFriendsThrottle;
            this.model.updateOnlineFriendsThrottle = _.bind(this.updateOnlineFriends, this);

            this.listenTo(this.model, 'change', this.render);
            return this.render();
          },

          render: function()
          {
            // We're re-rendering everything every time.
            // This isn't very efficient; optimize.
            var s_UserItems = [],
              s_OnlineFriends = this.model.get('onlineFriends');

            // First add the users who have broadcasts.
            s_OnlineFriends.each(function(p_User)
            {
              var s_Element,
                s_Title = $('<a class="sbar-title" href="#"></a>'),
                s_Song = $('<a class="sbar-song" href="#"></a>'),
                s_PlayingSong = p_User.get('nowPlayingSong'),
                s_BroadcastID = p_User.get('currentBroadcastID'),
                s_By;

              s_Element = $('<div class="sbar-user show-user-tooltip-left" data-user-id="' + p_User.id + '"><a class="img-container" href="' + p_User.toUrl() + '">\
                              <img class="user-img img" src="' + p_User.getImageURL() + '"/>\
                              </a><div class="sbar-data"></div><div class="clear"></div></div>');

              s_Element.find('.sbar-data').append(s_Title).append(s_Song);

              s_Title.text(p_User.get('Name'));
              s_Title.attr('href', p_User.toUrl());

              // Is this user playing a song?
              if (s_PlayingSong !== null)
              {
                s_Song.text(s_PlayingSong.get('ArtistName') + ' - ' + s_PlayingSong.get('SongName'));
                s_Song.attr('href', s_PlayingSong.toUrl());
              }

              // Is this user in a broadcast?
              if (s_BroadcastID === null)
                return;

              // Is the user hosting this broadcast?
              if (p_User.get('currentBroadcastOwner') !== null)
                return;

              s_Title.text(p_User.get('currentBroadcastName'));
              s_Title.attr('href', p_User.toUrl('broadcast/current'));

              s_By = $('<a class="sbar-by" href="#"></a>');
              s_By.text('by ' + p_User.get('Name'));
              s_By.attr('href', p_User.toUrl());

              s_Element.find('.sbar-data').append(s_By);

              s_UserItems.push(s_Element);

              // Get all the users listening to this broadcast.
              s_OnlineFriends.each(function(p_OtherUser)
              {
                var s_OtherElement, s_OtherTitle;
                if (p_OtherUser.id === p_User.id)
                  return;

                if (p_OtherUser.get('currentBroadcastID') !== s_BroadcastID)
                  return;

                s_OtherElement = $('<div class="sbar-user sbar-listener show-user-tooltip-left" data-user-id="' + p_OtherUser.id + '"><a class="img-container" href="' + p_OtherUser.toUrl() + '">\
                                  <img class="user-img img" src="' + p_OtherUser.getImageURL() + '"/>\
                                  </a><div class="sbar-data"></div><div class="clear"></div></div>');

                s_OtherTitle = $('<a class="sbar-title show-user-tooltip" href="#" data-user-id="' + p_OtherUser.id + '"></a>');

                s_OtherElement.find('.sbar-data').append(s_OtherTitle);

                s_OtherTitle.text(p_OtherUser.get('Name'));
                s_OtherTitle.attr('href', p_OtherUser.toUrl());

                s_UserItems.push(s_OtherElement);
              });
            });

            // Then add all the users who are not in broadcasts.
            s_OnlineFriends.each(function(p_User)
            {
              var s_Element,
                s_Title = $('<a class="sbar-title" href="#"></a>'),
                s_Song = $('<a class="sbar-song" href="#"></a>'),
                s_PlayingSong = p_User.get('nowPlayingSong'),
                s_BroadcastID = p_User.get('currentBroadcastID');

              s_Element = $('<div class="sbar-user no-song no-bc show-user-tooltip-left" data-user-id="' + p_User.id + '"><a class="img-container" href="' + p_User.toUrl() + '">\
                                <img class="user-img img" src="' + p_User.getImageURL() + '"/>\
                                </a><div class="sbar-data"></div><div class="clear"></div></div>');

              s_Element.find('.sbar-data').append(s_Title).append(s_Song);

              s_Title.text(p_User.get('Name'));
              s_Title.attr('href', p_User.toUrl());

              // Is this user playing a song?
              if (s_PlayingSong !== null)
              {
                s_Element.removeClass('no-song');
                s_Song.text(s_PlayingSong.get('ArtistName') + ' - ' + s_PlayingSong.get('SongName'));
                s_Song.attr('href', s_PlayingSong.toUrl());
              }

              // Is this user in a broadcast?
              if (s_BroadcastID !== null)
                return;

              s_UserItems.push(s_Element);
            });

            if (s_UserItems.length)
              this.$el.html(s_UserItems);
            else
              this.$el.html('<div class="page-loading"></div>');

            return this;
          },

          updateOnlineFriends: function()
          {
            this.originalThrottle.call(this.model);
            this.render();
          }
        });
      }

      // Do we already have a social bar initialized?
      if (GSX.socialBar !== undefined || $('#gsx-social-bar-container').length > 0)
        return;

      var s_Container,
        s_User = GSX.getUser(GS.getLoggedInUserID());

      if (s_User === null)
        return;

      // Initialize the social bar.
      GSX.socialBar = new GS.Views.Modules.SocialBar({
        params: {
          user: s_User
        }
      });

      // Render the social bar.
      GSX.socialBar.render();

      // Add it to the dom.
      s_Container = $('<div id="gsx-social-bar-container"></div>');
      s_Container.append(GSX.socialBar.$el);

      var s_Button = $('<div id="gsx-social-bar-btn"><i class="icon icon-thinarrow-right bubble action"></i></div>'),
        s_Icon = s_Button.find('.icon');

      s_Icon.click(function()
      {
        var s_Body = $('body');
        s_Body.toggleClass('social-bar-small');

        if (s_Body.hasClass('social-bar-small'))
          $(this).removeClass('icon-thinarrow-right').addClass('icon-thinarrow-left');
        else
          $(this).removeClass('icon-thinarrow-left').addClass('icon-thinarrow-right');
      });

      s_Container.append(s_Button);

      $('#chat-sidebar').after(s_Container);

      if (GSX.settings.socialBar)
        $('body').addClass('social-bar-open');
    };

    // Listen for manatee identification event.
    GS.on('manatee:identified', function()
    {
      initializeBar();
    });
  },

  settingsUpdated: function()
  {
    'use strict';
    var s_Body = $('body');

    if (!GSX.settings.socialBar)
    {
      s_Body.removeClass('social-bar-open');
      return;
    }

    if (!s_Body.hasClass('social-bar-open'))
      s_Body.addClass('social-bar-open');
  },

  afterGSAppInit: function(p_Application)
  {
    $('body').on('mouseenter', '.show-user-tooltip-left', function(e)
    {
      amdModules.requireDeferred("gs/views/tooltips/userProfile.js").done(_.bind(function()
      {
        var s_Target = $(e.currentTarget);
        var s_UserID = s_Target.attr('data-user-id');

        if (!s_UserID || s_UserID == GS.getLoggedInUserID())
          return;

        var s_Options = {
          delay: 250,
          width: 360,
          positionDir: "left",
          positionSpill: "center",
          positionPad: 0
        };

        var s_TooltipKey = "user:" + s_UserID;

        var s_View = new GS.Views.Tooltips.UserProfile({
          userID: s_UserID,
          appModel: p_Application.model,
          tooltipKey: s_TooltipKey
        });

        s_Options.views = [ s_View ];
        s_Options.$attached = s_Target;
        s_Options.tooltipKey = s_TooltipKey;

        GS.trigger("tooltip:open", s_Options);
      }, this))
    });
  }
});