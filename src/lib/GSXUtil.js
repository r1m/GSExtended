/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global Notification, GS, GSX, GSXmagnifyingSettings, console, Linkified, $, _ */


var GSXUtil = (function () {
  'use strict';
  return {
    /**
     * Ask user for notification permission
     */
    grantNotificationPermission: function () {
      Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    },

    /**
     * Show a desktop notification of the message ot the song
     * in : a ChatActivity or a QueueSong
     */
    showNotification: function (messageOrSong, duration) {
      var title, msg, icon, tag, notif;
      if (messageOrSong instanceof GS.Models.ChatActivity) {
        title = messageOrSong.get('user').get('Name');
        icon = messageOrSong.get('user').getImageURL();
        msg = messageOrSong.get('messages').join('\n');
        // tag = 'gsx_msg';
      } else if (messageOrSong instanceof GS.Models.PlayableSong) {
        msg = messageOrSong.get('ArtistName') + ' \u2022 ' + messageOrSong.get('AlbumName');
        icon = messageOrSong.getImageURL();
        title = messageOrSong.get('SongName');
        tag = 'gsx_song';
      } else {
        return;
      }
      if (!(window.hasOwnProperty('Notification'))) {
        console.log('No desktop notification support');
      } else if (Notification.permission === 'granted') {
        // html5 web notification
        notif = new Notification(title, {
          body: msg,
          icon: icon,
          tag: tag
        });
        setTimeout(function () {
          notif.close();
        }, duration);
      }
    },
    /**
     * show a GS notification on bottom of the window
     */
    notice: function (description, options) {
      /*
       * Options attributes:
       *   - title: the notice's title.
       *   - description: the notice's message.
       *   - type: either 'success' or 'error'; default is neither.
       *   - url: link to send those who click the notice.
       *   - duration: set to 0ms to make the notice sticky; default 6500ms.
       */
      options = (options || {});
      options.description = description;
      options.type = options.type || 'success';

      GS.trigger('notification:add', options);
    },

    /**
     * Show a tooltip on the hovered element.
     * e: mouse-event
     * text : message to display
     */
    tooltip: function (options, e) {
      e.stopPropagation();
      var tooltip = new GS.Views.Tooltips.Helper(options);
      GS.Views.Tooltips.Helper.simpleTooltip(e, tooltip);
    },
    magnify: function (el, inline) {
      //console.debug('magnify', el );
      var linkified = new Linkified(el[0], {
        linkClass: 'inner-comment-link gsxlinked'
      });
      el.find('a[href]').each(function () {
        var imageSrc, scroll, span, img, insertImage, link, video;
        if (/(jpg|gif|png|jpeg)$/i.test($(this).attr('href'))) {
          imageSrc = $(this).attr('href');
          if (inline) {
            //add a spinner
            scroll = GSXUtil.isUserChatScrolledToBottom(GSX.settings.chatScrollThreshold);
            span = $('<span class="img-wrapper"><img src="//static.a.gs-cdn.net/webincludes/images/loading.gif" /></span>');
            $(this).html(span);
            //preload the image
            img = new Image();
            img.src = imageSrc;

            insertImage = function () {
              span.empty(); //remove spinner
              span.append(img); //insert the image
              GSXUtil.freezeGif(img); //freeze the image if it's a GIF
              if (scroll) {
                GSXUtil.scrollChatBox();
              }
            };

            $(img).bind('load', function () {
              if (!img.complete) {
                //workaround bug https://bugzilla.mozilla.org/show_bug.cgi?id=574330
                img.src = img.src;
                return;
              }
              insertImage();
            });

            if (img.complete) {
              insertImage();
            }
          }
          $(this).on('click', function (e) {
            GSXUtil.openLightbox({
              image: imageSrc
            });
            e.stopPropagation();
            return false;
          });
          $(this).addClass('mfp-zoom');
        } else if (/(maps\.google|youtu(\.be|be\.com)|vimeo\.com|dailymotion\.com\/(video|hub))/.test($(this).attr('href'))) {
          $(this).on('click', function (e) {
            GSXUtil.openLightbox({
              link: $(this).attr('href'),
              mute: GSX.settings.automute
            });
            e.stopPropagation();
            return false;
          });
          $(this).addClass('gsx-zoom');
        } else if (/(webm|mp4|ogv|mov)$/i.test($(this).attr('href'))) {
          if (inline) {
            video = $('<div class="gsx-video-container inline mfp-zoom"><div class="overlay">VIDEO</div><video loop preload/></div>');
            link = $(this).replaceWith(video);
            link.appendTo(video.find('video'));
            $('<source>').attr('src', $(this).attr('href')).appendTo(video.find('video'));

            video.on('mouseenter', function () {
              $(this).find('video')[0].muted = true;
              $(this).find('video')[0].play();
              $(this).find('.overlay').hide();
              //console.log('video enter');
            });
            video.on('mouseleave', function () {
              $(this).find('video')[0].pause();
              $(this).find('.overlay').show();
              //console.log('video leave');
            });
            video.on('click', function (e) {
              $(this).find('video')[0].pause();
              $(this).find('.overlay').show();
              var player = $(this).find('video').clone().prop('controls', true).prop('autoplay', true);
              GSXUtil.openLightbox({
                html: player.html(),
                mute: GSX.settings.automute
              });
              e.stopPropagation();
            });
          }
        }
      });
    },

    isUserChatScrolledToBottom: function (threshold) {
      var e = $('#chat-sidebar .scroll-view')[0];
      return !e || (Math.abs(e.scrollHeight - e.scrollTop - e.clientHeight) <= (threshold || 20));
    },

    scrollChatBox: function () {
      var box = $('#chat-sidebar .scroll-view');
      if (box.length > 0) {
        box.scrollTop(box[0].scrollHeight);
      }
    },
    freezeGif: function (img) {
      if (/^(?!data:).*\.gif/i.test(img.src)) {
        var span, c = document.createElement('canvas'),
          drawStaticImage = function () {
            var w = c.width = img.width,
              h = c.height = img.height,
              context = c.getContext('2d');
            //draw gif first frame
            context.drawImage(img, 0, 0, w, h);
            //draw GIF circle
            context.beginPath();
            context.arc(40, 40, 15, 0, 2 * Math.PI, false);
            context.fillStyle = 'black';
            context.fill();
            context.lineWidth = 4;
            context.strokeStyle = '#ededed';
            context.stroke();
            context.fillStyle = 'white';
            context.font = 'bold 10pt calibri';
            context.fillText('GIF', 31, 45);
          },
          displaygif = function () {
            $(this).find('img').show();
            $(this).find('canvas').hide();
          },
          displaycanvas = function () {
            $(this).find('canvas').show();
            $(this).find('img').hide();
          };
        try {
          drawStaticImage();
        } catch (e) {
          //workaround bug https://bugzilla.mozilla.org/show_bug.cgi?id=574330
          if (e.name === 'NS_ERROR_NOT_AVAILABLE') {
            console.info('Bug NS_ERROR_NOT_AVAILABLE');
            setTimeout(drawStaticImage, 0);
          } else {
            throw e;
          }
        }
        $(img).hide();
        span = $(img).parent().append(c);

        span.hover(displaygif, displaycanvas);
      }
    },

    rot13: function (str) {
      return str.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
      });
    },

    muffinRain: function () {
      var drop = $('<img class="drop" src="https://ramouch0.github.io/GSExtended/images/muffin.png" />').detach(),
        rain;
      drop.css({
        position: 'absolute',
        left: '0px',
        display: 'block',
        top: '-150px',
        'z-index': 12000
      });

      function create() {
        var size = (Math.random() * 100) + 20,
          clone;
        clone = drop.clone().appendTo('#page-inner').css({
          transform: 'rotate(' + Math.random() * 360 + 'deg)',
          left: Math.random() * $(document).width() - 100,
          width: size + 'px',
          height: size + 'px'

        }).animate({
          'top': $(document).height() - 150
        }, Math.random() * 500 + 1000,
          function () {
            $(this).fadeOut(200, function () {
              $(this).remove();
            });
          });
      }

      function sendWave() {
        var i = 0;
        for (i = 0; i < 30; i++) {
          setTimeout(create, Math.random() * 1000);
        }
      }
      rain = setInterval(sendWave, 500);
      setTimeout(function () {
        clearInterval(rain);
      }, 10000);
    },

    injectCSS: function (url, id) {
      // This is a UserStyles script.
      // We need to clean it and inject it manually.
      if (url.indexOf('userstyles') !== -1) {
        $.get(url).done(function (data) {
          var startIndex = data.search(/@(-moz-)?document[\s\S]*?\{/),
            level,
            i,
            css;

          // Style has a document rule; we need to remove it.
          while (startIndex !== -1) {
            // Remove the opening statement.
            data = data.replace(/@(-moz-)?document[\s\S]*?\{/, '');

            // Find the closing bracket.
            level = 0;

            for (i = startIndex; i < data.length; ++i) {
              if (data[i] === '{') {
                level += 1;
              } else if (data[i] === '}') {
                level -= 1;
              }
              // And remove it.
              if (level < 0) {
                data = data.substr(0, i) + data.substr(i + 1);
                break;
              }
            }

            // Do we have another one?
            startIndex = data.search(/@(-moz-)?document[\s\S]*?\{/);
          }

          // Trim any unneeded whitespace.
          data = data.trim();

          // And inject our stylesheet.
          css = $('<style id="' + id + '" type="text/css"></style>');
          css.html(data);
          if (id) {
            css.attr('id', id);
          }
          $('head').append(css);
        }).fail(function () {
          GSXUtil.notice('Failed to load external GSX CSS', {
            title: 'Theme update failed'
          });
        });
      } else {
        var css = $('<link id="' + id + '" type="text/css" rel="stylesheet" />');
        css.attr('href', url);
        if (id) {
          css.attr('id', id);
        }
        $('head').append(css);
      }
    },

    openLightbox: function (options) {
      var content, embedSrc;

      options = _.defaults(options, {
        onOpen: function () {
          if (options.mute) {
            GS.External.PluginAPI.setIsMuted(true);
          }
        },
        onClose: function () {
          if (options.mute) {
            GS.External.PluginAPI.setIsMuted(false);
          }
        },
        title: ' '

      });
      if (options.link) {
        embedSrc = options.link;
        $.each(GSXmagnifyingSettings.iframe.patterns, function () {
          if (embedSrc.indexOf(this.index) > -1) {
            if (this.id) {
              if (typeof this.id === 'string') {
                embedSrc = embedSrc.substr(embedSrc.lastIndexOf(this.id) + this.id.length, embedSrc.length);
              } else {
                embedSrc = this.id.call(this, embedSrc);
              }
            }
            embedSrc = this.src.replace('%id%', embedSrc);
            return false; // break;
          }
        });
        content = '<div class="gsx-iframe">' +
          '<iframe class="gsx-iframe" src=' + embedSrc + ' frameborder="0" allowfullscreen></iframe>' +
          '</div>';
      } else if (options.html) {
        content = options.html;
      } else if (options.image) {
        content = '<img src="' + options.image + '" />';
      }
      if (typeof options.onOpen === 'function') {
        options.onOpen();
      }
      GS.trigger('lightbox:open', 'generic', {
        view: {
          headerHTML: options.title,
          messageHTML: content
        },
        onDestroy: options.onClose
      });
    },
    /**
     *  Util functions
     */
    addStyle: function (css) {
      var style = document.createElement('style');
      style.textContent = css;
      document.getElementsByTagName('head')[0].appendChild(style);
    },

    hookAfter: function (target, n, func) {
      GSXUtil.hookFunction(target, n, func, 'after');
    },
    hookBefore: function (target, n, func) {
      GSXUtil.hookFunction(target, n, func, 'before');
    },
    hookFunction: function (target, n, func, when) {
      //console.log('install hook', n);
      var old = target.prototype[n];
      //console.log(old);
      target.prototype[n] = function () {
        //console.log('hook !', n);
        if (when === 'before') {
          func.apply(this, arguments);
        }
        var r = old.apply(this, arguments);
        if (when === 'after') {
          func.apply(this, arguments);
        }
        return r;
      };

    }
  };
}());