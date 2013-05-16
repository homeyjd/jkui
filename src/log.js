/*jslint white: true */
(function(global) {
	'use strict';


	if (typeof global.jkui === 'undefined') {
		global.jkui = {};
	}
	
/**
 * Provides interface for safely logging messages to the browser and server.
 *
 * Also creates the Debug object as a blank object.  This fixes parse errors
 * if your code calls the Debug class but it was not included.
 */
var root = global.jkui,
	l = root.Log = {
		// Global configuration vars
		enable: true,
		serverURL: window.location.toString(), // path to log script
		pushThreshold: 10,	// number of messages to successively queue before it will force a send
		pushInterval: 500	// number of milliseconds to wait till we send messages, even if below threshold
	},

	// Private vars
	_messageQueue = [],
	_timer = null;

/**
 * Log a message to the console and server.
 *
 * If we have passed the pushThreshold, then the cached messages will be immediately sent. Otherwise,
 * the messages will sit in the queue until the pushInterval passes.
 */
l.log = function(s) {
	// global enable
	if (!l.enable) {
		return;
	}

	// check if browser supports logging
	if (typeof console !== 'undefined') {
		if (typeof s === 'undefined') {
			console.log('Log.log() called with no parameters');
		}
		else if (arguments.length === 1) {
			console.log(s);
		}
		else {
			console.log(arguments);
		}
	}

	// Build from arguments
	var msg = '', cur, i = 0;
	for (; i < arguments.length; i++) {
		cur = arguments[i];
		// try to prune object
		if (typeof cur !== 'string') {
			try { msg += JSON.pruned(cur, 2); }
			catch (e) { msg += cur; }
		} else {
			msg += cur;
		}
		// add comma
		if (i < arguments.length -1) {
			msg += ', ';
		}
		// also add to queue
		_messageQueue.push(msg);
	}

	// check past threshold
	if (_messageQueue.length > l.pushThreashold) {
		l.push();
	}
};

/**
 * Push the cached messages to the server, even if there is only one.
 */
l.push = function() {
	// don't log nothing
	if (_messageQueue.length < 1) return;
	// push data
	$.ajax({
		type: 'POST',
		url: l.serverURL,
		// send the whole array
		data: { msgs: _messageQueue },
		//complete: function(output) {},
		error: function(jqXHR, textStatus, errorThrown) {
			l.log('Log: could not push logs to server '+l.serverURL+', returned '+textStatus+': '+errorThrown);
		}
	});
	// reset the queue
	_messageQueue = [];
};

/**
 * Sets a timer to push to the server every so often. The minimal value acceptable for
 * <code>milli</code> is 100.
 * @param integer milli
 */
l.pushEvery = function(milli) {
	if (_timer) {
		clearInterval(_timer);
		_timer = null;
	}
	if (milli) {
		// never allow <100 ms
		if (milli >= 100) {
			l.pushInterval = milli;
		}
		_timer = setInterval(l.push, l.pushInterval);
	}
};


if (!root.Debug) {
	root.Debug = {
		log: l.log,
		logElapsed: function(start, end, msg) {
			if (!msg) msg = 'Time elapsed:';
			if (!end) end = new Date().getTime();
			else if (end instanceof Date) end = end.getTime();
			if (start instanceof Date) start = start.getTime();
			var secs = (end - start) / 1000;
			l.log(msg+' '+secs+'s');
		}
	};
}

	if (typeof define === 'function' && define.amd) {
		define( "jkui/log", [], function () { return l; } );
	}
})(this);