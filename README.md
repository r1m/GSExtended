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
* Spoiler tags, use [sp], [sp movie] or [spoiler movie] before a spoiler. Your message will be scrambled
* AutoLinkify web address and open media in a lightbox
* Can inline image linked in chat messages
* View fullscreen avatar of someone in the chat
* View full album art of the current track
* Listeners' names autocompletion after @
* Commands autocompletion for GSBot
* Import/Export your settings
* One hidden secret !


TODO
- fullscreen chat/ broadcast info 
- display broadcast statistics

It does not !
-------------
* Make coffee ~~or blueberry muffins~~
* Fix Grooveshark bugs ! If you see incoherent data, it may be because of the way GS refreshes its content. 
	Usually navigate away/back from BC page fixes this.

Install
-------

###Prerequisites

- **Firefox** : You need [GreaseMonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/). 
- **Chrome** :  You need [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).
- **Opera** (not tested) : You need [ViolentMonkey](http://addons.opera.com/en/extensions/details/violent-monkey) or [Tampermonkey](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)
- **Safari** (not tested) : You need [Greasekit](https://8-p.info/greasekit/) or [NinjaKit](http://translate.google.com/translate?js=y&prev=_t&hl=en&ie=UTF-8&layout=1&eotf=1&u=http%3A%2F%2Fd.hatena.ne.jp%2Fos0x%2F20100612%2F1276330696&sl=auto&tl=en)

###Instructions

1. Once you have an extension for userscripts on your browser, visit this link :  : (https://github.com/Ramouch0/GSExtended/raw/master/src/GSExtended.user.js)
2. Accept installation of the script.

If eveything is ok, you should see a GSX notification when you visit grooveshark.

Settings
---------

Settings are on your profile [preferences](http://grooveshark.com/#!/settings/preferences) page. 
They are stored locally on your computer.
Some of them need a complete refresh of the page to be active.



FAQ
----
**Notifications are not shown**

Be sure to authorise notification for Grooveshark. On your browser click on the icon on the left of the address bar. You should see notification settings for the active site. Screenshots : [Chrome](https://ramouch0.github.io/GSExtended/images/chrome-notificationsettings.png), [Firefox](https://ramouch0.github.io/GSExtended/images/firefox-notificationsettings.png)

**Songs in broadcaster's collection are not shown with green border**

Large BC collection can take a while to be loaded, come back to this page later. If it fails, you can force collection loading by visiting the broadcaster's collection page.

**Some of broadcaster's friends are not highlighted in chat box**

It happens if the message is displayed before the script finished to load data. It will be fixed if you navigate in GS.

**What are all this question marks in vote ?**

When you don't have data for one user loaded on your side, the script can't know the name of the voter. it will display a '?'. By default GS only loads your friends and people you interact with. There is an option in the script preferences to force user data loading. BUT I strongly advise to not use it when you are in a big broadcast like Caleb's (>300 listeners).

**What 'Show real Votes' button does ?**

It show the number of vote from listener that are currently still listening.
It can be wrong because some listeners appear offline but they aren't... GS bug.

**What the vote tooltip means?**
```
/Number of voter still in BC/ : /Online voters/ -> /Thoses who left/
```

**In history, I can't see who voted**

GS only gives vote number for songs in history that were played before you joined the BC. You can only see voters' names for songs that you listened to.

**How to know which tracks are autovoted ?**

On songs listing you can see tracks that you marked as autovote. In preference page, you can find a button to list them all.

**Can I change notification duration ?**

On firefox it's handled by the browser and CANNOT be changed. 
On chrome it's setted to 3.5 sec. You can change it in preferences.
