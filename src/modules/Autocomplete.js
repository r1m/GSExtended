/*jslint nomen: true, plusplus: true, es5: true, regexp: true */
/*global GS, GSX, console, $, _ */

var GSXmodules = window.GSXmodules = window.GSXmodules || [];
GSXmodules.push({
  name: 'Autocomplete Names',

  init: function () {
    'use strict';
    $.fn.selectRange = function (start, end) {
      return this.each(function () {
        if (this.setSelectionRange) {
          this.focus();
          this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
          var range = this.createTextRange();
          range.collapse(true);
          range.moveEnd('character', end);
          range.moveStart('character', start);
          range.select();
        }
      });
    };
    $.fn.getSelection = function () {
      var e = (this.jquery) ? this[0] : this;
      return (
        /* mozilla / dom 3.0 */
        ('selectionStart' in e && function () {
          var l = e.selectionEnd - e.selectionStart;
          return {
            start: e.selectionStart,
            end: e.selectionEnd,
            length: l,
            text: e.value.substr(e.selectionStart, l)
          };
        }) ||
        /* exploder */
        (document.selection && function () {
          e.focus();
          var r = document.selection.createRange();
          if (r === null) {
            return {
              start: 0,
              end: e.value.length,
              length: 0
            }
          }
          var re = e.createTextRange();
          var rc = re.duplicate();
          re.moveToBookmark(r.getBookmark());
          rc.setEndPoint('EndToStart', re);
          return {
            start: rc.text.length,
            end: rc.text.length + r.text.length,
            length: r.text.length,
            text: r.text
          };
        }) ||
        /* browser not supported */
        function () {
          return null;
        }
      )();
    };
  }
});

// Create an auto-complete popup to show a list of members matching text behind the cursor.
// field: the field to monitor for input.
// characters: characters to look for that indicates a member name (eg. ['@','/'])
// clickHandler: a function to be called in a member is selected from the popup.
function AutoCompletePopup(field, characters, fetchFunction, clickHandler) {
  'use strict';
  var ac = this;

  // Initialize ALL THE THINGS.
  this.field = field;
  this.characters = characters;
  this.active = false;
  this.items = 0;
  this.index = 0;
  this.value = "";
  this.clickHandler = clickHandler;
  this.fetchFunction = fetchFunction;

  // If no click handler was specified, use our own default one. The default click handler will replace
  // everything from the cursor until the character denoting the beginning of this "token" with the item's
  // name.
  if (!this.clickHandler) {
    this.clickHandler = function (replacement) {
      var selection = ac.field.getSelection(),
        value = ac.field.val(),
        nameStart = -1,
        i,
        p;

      // If nothing is selected in the field...
      if (selection.length === 0) {

        // From the selection position, go back up to 20 characters, searching for the start character.
        for (i = selection.start; i > selection.start - 20; i--) {
          if (ac.characters.indexOf(value.charAt(i)) >= 0) {
            nameStart = i;
            break;
          }
        }

        // If we found the position of the character, replace it all with the item's name.
        if (nameStart >= 0) {
          ac.field.val(value.substring(0, nameStart) + replacement + " " + value.substr(selection.start));
          p = nameStart + replacement.length + 1;
          ac.field.selectRange(p, p);
        }
      }
    };
  }

  // Now, construct the auto complete popup for this field.
  this.popup = $("#autoCompletePopup-" + field.attr("id"));
  if (!this.popup.length) {
    this.popup = $("<div id='autoCompletePopup-" + field.attr("id") + "'/>");
  }
  this.popup.bind("mouseup", function (e) {
    return false;
  }).addClass("popup").addClass("autoCompletePopup").hide();

  // Append it to the body, and hide it when the document is clicked.
  this.popup.appendTo("body");
  $(document).mouseup(function (e) {
    ac.hide();
  });

  // Add a keydown handler to the field. This will be used to navigate the popup menu (down/up/enter/escape).
  this.field.attr("autocomplete", "off").keydown(function (e) {
    if (ac.active) {
      switch (e.which) {
      case 40: // Down
        ac.updateIndex(ac.index + 1);
        e.preventDefault();
        break;
      case 38: // Up
        ac.updateIndex(ac.index - 1);
        e.preventDefault();
        break;
      case 13:
      case 9: // Enter/Tab
        ac.popup.find("li").eq(ac.index).click();
        e.preventDefault();
        break;
      case 27: // Escape
        ac.hide();
        e.stopPropagation();
        e.preventDefault();
        break;
      }
    }
  });

  // Add a keyup handler to the field. This will be used to fetch new content based on the field's value.
  this.field.keyup(function (e) {
    switch (e.which) {

    case 27: // Escape
      if (ac.active) {
        e.stopPropagation();
      }
      break;

      // Up, down, enter, tab, escape, left, right.
    case 9:
    case 13:
    case 40:
    case 38:
    case 37:
    case 39:
      break;

    default:

      // If we have a character to search for, backtrack from where the cursor is until we find it,
      // and use that content.
      if (ac.characters) {
        var name, i,
          selection = $(this).getSelection(),
          value = $(this).val(),
          nameStart = -1;

        if (selection.length === 0) {
          for (i = selection.start; i > selection.start - 20; i--) {
            if (ac.characters.indexOf(value.charAt(i)) >= 0) {
              nameStart = i;
              break;
            }
          }

          if (nameStart >= 0) {
            name = value.substring(nameStart, selection.start);
            ac.fetchNewContent(name, nameStart);
          } else {
            ac.hide();
          }
        }
      } else {

        // Otherwise, just use the whole field's content.
        ac.fetchNewContent($(this).val(), 0);
      }
      break;
    }
  });

  // This function updates the items in the popup menu to show only those who match the current value of the
  // field.
  this.update = function (results) {

    // Clear the popup menu.
    ac.popup.html("<ul class='popupMenu'></ul>");

    // If there are results, show them.
    if (results.length) {

      var item, i, name,
        searchString = ac.value.replace(/ /g, "\xA0").replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"),
        regexp = new RegExp("(" + searchString + ")", "i");

      // Sort the results alphabetically by name.
      results = results.sort(function (a, b) {
        return a.text === b.text ? 0 : (a.text < b.text ? -1 : 1);
      });

      // Get the first 5 results.
      results = results.slice(0, 5);

      // Add each of the results to the popup.

      for (i in results) {

        // Highlight the matching part of the name.
        name = $("<div/>").text(results[i].text).html();
        name = name.replace(regexp, "<strong>$1</strong>");

        // Create an <li> for the result and add some event handlers.
        item = $("<li><a href='#'><i>" + results[i].icon + "</i> " + name + "</a></li>").data("position", i).data("item", results[i]).mouseover(function () {
          ac.updateIndex($(this).data("position"));
        }).click(function (e) {
          e.preventDefault();
          ac.clickHandler($(this).data("item").text);
          ac.stop();
        });

        // Append it to the popup menu.
        ac.popup.find("ul").append(item);
      }

      ac.items = results.length;
      ac.active = true;
      ac.show();
      ac.updateIndex(ac.index);

    } else {

      // If there are no results, hide the popup.
      ac.hide();
    }
  };

  this.timeout = null;

  // This function fetches a list of items that match the specified value with AJAX.
  this.fetchNewContent = function (value, position) {
    if (value && value.length) {
      clearTimeout(ac.timeout);

      // Set a timeout to make an AJAX request for a list of items.
      ac.timeout = setTimeout(function () {
        var results = fetchFunction(value, position);
        ac.update(results);

      }, 35);
    }
    ac.value = value;
  };

  // Show the popup
  this.show = function () {
    var selection, value, testSubject, offset;
    ac.popup.show().css({
      position: "absolute",
      zIndex: 99999
    });

    // If we have a character that denotes the start of the token, we want to position the popup just below
    // it. This is super-hard with a textarea. We have to create a dummy div and set its contents to whatever
    // the textarea's is, up until the character. Then we can add a span at the end and get its position.
    if (ac.characters) {
      selection = ac.field.getSelection();
      value = ac.field.val().substr(0, selection.start - ac.value.length);
      testSubject = $('<div/>')
        .css({
          position: 'absolute',
          top: ac.field.offset().top,
          left: ac.field.offset().left,
          width: ac.field.width(),
          height: ac.field.height(),
          fontSize: ac.field.css('fontSize'),
          fontFamily: ac.field.css('fontFamily'),
          fontWeight: ac.field.css('fontWeight'),
          paddingTop: ac.field.css('paddingTop'),
          paddingLeft: ac.field.css('paddingLeft'),
          paddingRight: ac.field.css('paddingRight'),
          paddingBottom: ac.field.css('paddingBottom'),
          letterSpacing: ac.field.css('letterSpacing'),
          lineHeight: ac.field.css('lineHeight')
        })
        .html(value.replace(/[\n\r]/g, "<br/>"))
        .appendTo("body")
        .append("<span style='position:absolute'>&nbsp;</span>");

      // Get the position of our dummy span and set the popup to the same position.
      offset = testSubject.find("span").offset();
      ac.popup.css({
        left: offset.left,
        top: offset.top - ac.popup.height()
      });
      testSubject.remove();
    } else {
      // If we don't have a character, we can just position the popup directly beneath the field.
      ac.popup.css({
        left: ac.field.offset().left,
        top: ac.field.offset().top + ac.popup.height() - 1,
        width: ac.field.outerWidth()
      });
    }
    console.log(ac.popup);
    ac.active = true;
  };

  // Hide the popup.
  this.hide = function () {
    ac.popup.hide();
    ac.active = false;
  };

  // Stop any active AJAX requests to fetch members and hide the popup.
  this.stop = function () {
    ac.hide();
    clearTimeout(ac.timeout);
  };

  // Update the selected index of the popup.
  this.updateIndex = function (index) {
    ac.index = index;

    // Make sure the index is valid.
    if (ac.index < 0) {
      ac.index = ac.items - 1;
    } else if (ac.index >= ac.items) {
      ac.index = 0;
    }
    ac.popup.find("li").removeClass("selected").eq(ac.index).addClass("selected");
  };
}