// ==UserScript==
// @Author      Ram
// @name        Grooveshark Extended
// @namespace   GSX
// @description Enhance Grooveshark Broadcast functionality
// @downloadURL	https://raw.githubusercontent.com/Ramouch0/GSExtended/master/src/GSExtended.user.js
// @updateURL	https://raw.githubusercontent.com/Ramouch0/GSExtended/master/src/GSExtended.user.js
// @include     http://grooveshark.com/*
// @version     1.6.0
// @run-at document-end
// @grant  none 
// ==/UserScript==


(function () {

	var showUpdateNotice = function(){
		GS.trigger("lightbox:open", "generic", {
                //_type: "image",
                view: {
                    headerHTML: 'GSX need an update',
                    messageHTML: '<div>A new version of GS Extended is out. You need to update <b>now !</b> <br /><a href="https://raw.githubusercontent.com/Ramouch0/GSExtended/master/src/GSExtended.user.js">Click here for update !</a></div>' 
                }
            });
	};

    var gsxHack = function () {
            if (typeof _ === "undefined") {
                setTimeout(gsxHack, 5);
            } else {
				setTimeout(showUpdateNotice,3000);
            }
        };
    gsxHack();
}());