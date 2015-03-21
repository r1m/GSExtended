/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, console, $, _ */

GSXExternalChatBox = function()
{
    this.External = false;
    this.Popout = null;
    this.HiddenChat = null;
};

GSXExternalChatBox.prototype.preInit = function()
{
    if (document.location.hash.indexOf("broadcast/current/chat", document.location.hash.length - "broadcast/current/chat".length) !== -1)
    {
        this.preInitExternal();
        return;
    }

    this.External = false;
};

GSXExternalChatBox.prototype.preInitExternal = function()
{
    this.External = true;

    // Disable unneeded views.
    var NullRenderer = function() { this.$el.html(''); };

    GS.Views.Sidebar.prototype.render = NullRenderer;
    GS.Views.Player.prototype.render = NullRenderer;
    GS.Views.Queue.prototype.render = NullRenderer;
    GS.Views.Header.prototype.render = NullRenderer;
    GS.Views.Ads.prototype.render = NullRenderer;

    // Disable music player.
    var NullFunction = function() {};

    GS.Models.Queue.prototype.seekActiveSongTo = NullFunction;
    GS.Models.Queue.prototype.resume = NullFunction;
    GS.Models.Queue.prototype.pause = NullFunction;
    GS.Models.Queue.prototype.nextSong = NullFunction;
    GS.Models.Queue.prototype.previousSong = NullFunction;
    GS.Models.Queue.prototype.playSong = NullFunction;

    window.onbeforeunload = function() { window.opener.GSX.externalChatBox.onPopoutClosed(); };

    // Open all links in a new window/tab.
    $('body').on('click', 'a', function(e) {
        e.target.target = '_blank';
    }).addClass('external-chat-active');

    $('html').css('width', '100%').css('height', '100%').css('overflow', 'hidden');
};

GSXExternalChatBox.prototype.postInit = function()
{
    if (this.External)
    {
        this.postInitExternal();
        return;
    }

    // Add external chat option to chat settings menu.
    GSXUtil.hookAfter(GS.Views.Pages.Broadcast.Chat, 'openSettingsTooltip', function()
    {
        if (this.childViews.chatSettingsTooltip === undefined || GSX.externalChatBox.Popout !== null)
            return;

        var s_Stack = this.childViews.chatSettingsTooltip.model.attributes.stack;

        if (s_Stack.length <= 0)
            return;

        var s_Items = s_Stack[0];

        s_Items.push({
            type: 'html',
            html: '<a class="menu-item"><span class="menu-title">Popout ChatBox</span></a>',
            click: function() {
                GSX.externalChatBox.popout();
            }
        });

        this.childViews.chatSettingsTooltip.render();
    });

    GSXUtil.hookAfter(GS.Views.Pages.Broadcast.Chat, 'render', function()
    {
        var s_HiddenChat = $('<div id="chat-hidden-container"><div><h2>The chat is currently hidden.</h2><a class="btn btn-medium"><span class="label">Show Chat</span></a></div></div>');

        s_HiddenChat.find('a').click(function()
        {
            GSX.externalChatBox.showChat()
        });

        this.$el.parent().append(s_HiddenChat);
    });
};

GSXExternalChatBox.prototype.postInitExternal = function()
{
    if (!this.External)
        return;

    GSXUtil.hookAfter(GS.Views.Pages.Broadcast, 'render', function()
    {
        this.$el.html('');
    });

    // Disable page closing confirmation.
    window.onbeforeunload = function() { window.opener.GSX.externalChatBox.onPopoutClosed(); };
};

GSXExternalChatBox.prototype.popout = function()
{
    if (this.External || this.Popout !== null)
        return;

    this.hideChat();

    this.Popout = window.open(document.location.protocol + '//' + document.location.hostname + document.location.pathname + GS.getCurrentBroadcast().toUrl() + '/chat',
        'GrooveShark Chat', 'width=400,height=700,toolbar=0,menubar=0,location=1,status=1,scrollbars=1,resizable=1');
};

GSXExternalChatBox.prototype.hideChat = function()
{
    $('body').addClass('chat-hidden');
};

GSXExternalChatBox.prototype.showChat = function()
{
    $('body').removeClass('chat-hidden');
};

GSXExternalChatBox.prototype.onPopoutClosed = function()
{
    this.Popout = null;
    this.showChat();
};

var GSXmodules = window.GSXmodules = window.GSXmodules || [];

GSXmodules.push({
    name: 'External ChatBox',
    init: function ()
    {
        GSX.externalChatBox = new GSXExternalChatBox();
        GSX.externalChatBox.preInit();
    },

    afterBroadcastPackageLoaded: function()
    {
        GSX.externalChatBox.postInit();
    },

    filterShowNotification: function()
    {
        if (GSX.externalChatBox === undefined)
            return;

        return !GSX.externalChatBox.External;
    },

    filterNotice: function()
    {
        if (GSX.externalChatBox === undefined)
            return;

        return !GSX.externalChatBox.External;
    }
});