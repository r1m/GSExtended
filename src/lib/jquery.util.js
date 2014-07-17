
$.fn.selectRange = function(start, end) {
    return this.each(function() {
        if(this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if(this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};
$.fn.getSelection = function() {

	var e = (this.jquery) ? this[0] : this;

	return (

	/* mozilla / dom 3.0 */
	('selectionStart' in e && function() {
	var l = e.selectionEnd - e.selectionStart;
	return { start: e.selectionStart, end: e.selectionEnd, length: l, text: e.value.substr(e.selectionStart, l) };
	}) ||

	/* exploder */
	(document.selection && function() {

	e.focus();

	var r = document.selection.createRange();
	if (r === null) {
	return { start: 0, end: e.value.length, length: 0 }
	}

	var re = e.createTextRange();
	var rc = re.duplicate();
	re.moveToBookmark(r.getBookmark());
	rc.setEndPoint('EndToStart', re);

	return { start: rc.text.length, end: rc.text.length + r.text.length, length: r.text.length, text: r.text };
	}) ||

	/* browser not supported */
	function() { return null; }

	)();

};