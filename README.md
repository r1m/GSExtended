GSExtended
==========

A userscript to enhance Grooveshark experience.

Features
---------

* Song desktop notification
* Broadcast message notification on desktop based on configured keywords
* Larger Broadcast chatbox
* Timestamps on broadcast activities
* See who is friends with the current broadcaster
* See which songs are in the broadcast library / history
* See detailed votes for current song, suggestions and history
* New suggestion layout -> show song's album AND suggester's name separately
* Automatic upvote/downvote defined by the user.
* Better display of the player when the window is shrinked
* One hidden secret !

TODO
- Display the list of autovoted tracks
- fullscreen chat/ broadcast info 
- display broadcast statistics

It does not !
---------------------
* Make coffee or blueberry muffins
* Fix Grooveshark bugs ! If you see incoherent number of vote, it's because of the way GS refreshes its content. 
	Usually visit navigate away/back from BC page fixes this.

Instructions
------------


1. Firefox : You need [GreaseMonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/). ///  Chrome :  Install [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) 
	or [NinjaKit](https://chrome.google.com/webstore/detail/gpbepnljaakggeobkclonlkhbdgccfek).


2. Once installed, visit this link : (https://github.com/Ramouch0/GSExtended/raw/master/Js/GSExtended.user.js)
3. Accept installation of the script.

For more information on how to install userscripts, please visit this page : http://userscripts.org/about/installing

If eveything is ok, you should see 3 GSX notifications when you visit grooveshark.

Settings
---------

Settings are on your profile preferences page.
They are stored locally on your computer.
Some of them need a complete refresh of the page to be active.



FAQ
----
**Notifications are not shown**

Be sure to authorise notification for grooveshark. On your browser click on the icon on the left of the address bar.
You should see notification settings for the active site.

**Songs in broadcaster's collection are not shown with green border**

Large BC collection can take a while to be loaded, come back to this page later

**Some of broadcaster's friends are not highlighted in chat box**

If the message is displayed before the script finished to laod data. It will be fixed if you navigate in GS.

**'Show real Votes' button is not displayed**

It appears after a while

**What the vote tooltip means?**
```
/Number of voter still in BC/ : /Voters/ -> /Thoses who left/
```

**How to know which tracks are autovoted ?**

On songs listing you can see tracks that you marked as autovote. Currently there is now way to see a list of all autovoted songs.

