(function(global) {

	if (typeof global.jkui === 'undefined') {
		global.jkui = {};
	}
	
	var root = global.jkui,
		d = root.Debug = {
			// public vars
			logKeyboard : false,
			keyHistory : [],
			actions : {},
			console : false,
			logPrepend : true
		},

		// private vars
		numMessages = 0,
		hasInit = false,
		actionsMap = {},
		k = root.Keyboard,
		initCallbacks = [
			{	// RESTART_SEQ: 911
				seq : '' + k.KEY_NINE + k.KEY_ONE + k.KEY_ONE,
				callback : function() {
					d.log('restarting....');
					// setTimeout(function(){
					var dom = document.createElement('div');
					dom.id = 'rebootoverlay';
					dom.innerHTML = '<div id="rebooting" style="position:absolute; left:50%; top: 30%; margin-left: -235px; width: 400px; text-align: center; color: white; border: 5px solid goldenrod; font-size:50px; padding: 30px; background:rgba(0,0,0,.8);box-shadow:0 1px 15px #fff;">RESTARTING</div>';
					document.body.appendChild(dom);
					setTimeout(function() {
						window.location.reload(1);
					}, 100);
				}
			},
			{	// Change to jQuery scrolling: 554
				seq : '' + k.KEY_FIVE + k.KEY_FIVE + k.KEY_FOUR,
				callback : function() {
					var msg;
					if (!root.ActionMap.useJQScroll) {
						root.ActionMap.useJQScroll = true;
						jQuery.fx.interval = 13;
						msg = 'Using jQuery scrolling (fx.interval='+jQuery.fx.interval+')';
						$('.scroller').removeClass('scroll-anim');
					} else {
						root.ActionMap.useJQScroll = false;
						msg = 'Disabling jQuery scrolling, revert to CSS';
						$('.scroller').addClass('scroll-anim');
					}
					d.log(msg);
				}
			}
		];

	d.init = function() {
		// Only run once
		if (hasInit) return;
		hasInit = true;

		// look for global
		if (typeof g_startTime !== 'undefined') {
			d.logElapsed(g_startTime, false, 'Cumulative load time');
		}

		if (typeof document.addEventListener === 'function') {
			document.addEventListener('keydown', d.handleKeyPress);
		} else if (typeof document.attachEvent === 'function') {
			document.attachEvent('onkeydown', d.handleKeyPress);
		}

		// build map
		var i = 0, cur, map = actionsMap;
		for (; i < initCallbacks.length; i++) {
			cur = initCallbacks[i];
			if (cur.seq && cur.seq.length && typeof cur.callback === 'function') {
				map[cur.seq] = cur.callback;
			}
		}
		initCallbacks = [];
	};

	d.addKeyListenerForSequence = function(seq, callback) {
		d.actions[seq] = callback;
	};

	d.handleKeyPress = function(e) {
		var key = (e.keyCode ? e.keyCode : e.which), map = actionsMap, func = null, h = d.keyHistory, c = '';
		// ensure existence
		if (!h)
			h = d.keyHistory = [];

		h.push(key.toString());
		if (h.length < 3) {
			return;
		}
		// build search key
		c = '' + h[h.length - 3] + h[h.length - 2] + h[h.length - 1];
		if (c in map) {
			func = map[c];
		}
		// add one more and check again
		else if (h.length > 3) {
			c += h[h.length - 4].toString();
			if (c in map) {
				func = map[c];
			}
			h.shift();
		}
		if (typeof func === 'function') {
			func.call();
			d.keyHistory = [];
		}
		if (d.logKeyboard) {
			d.log(e.type+": char:" + e.charCode + " key:" + e.keyCode);
		}
	};

	d.log = function(s) {
		if (!s || !s.length)
			return;
		if (!d.console) {
			d.openConsole();
		}

		if (root.Log) root.Log.log(s);

		numMessages++;

		if (d.logPrepend) {
			s = s + "\n<br/>" + d.console.innerHTML;

			if (numMessages > 50) {
				s = s.substring(0, 1000);
				numMessages = 0;
			}
		}
		else {
			s = d.console.innerHTML + "\n<br/>" + s;

			if (numMessages > 50) {
				s = s.substring( Math.max(0, s.length-1000) );
				numMessages = 0;
			}
		}

		d.console.innerHTML = s;
	};

	d.logElapsed = function(start, end, msg) {
		if (!msg)
			msg = 'Time elapsed';
		if (!end)
			end = new Date().getTime();
		else if (end instanceof Date)
			end = end.getTime();
		if (start instanceof Date)
			start = start.getTime();
		var secs = Math.round((end - start)*10) / 10000;
		d.log(secs + 's : ' + msg);
	};

	d.logKeyboardEvents = function() {
		d.logKeyboard = true;
	};

	d.openConsole = function() {
		if (!d.console) {
			d.console = document.createElement('div');
			d.console.id = 'debug-console';
			document.body.appendChild(d.console);
		}
	};

	d.closeConsole = function() {
		if (d.console) {
			document.body.removeChild(d.console);
			d.console = false;
		}
	};


	window.addEventListener('load', d.init, false);
	
	if (typeof define === 'function' && define.amd) {
		define( "jkui/debug", ['jkui/keyboard'], function () { return d; } );
	}

})(this);