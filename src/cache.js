(function(window) {
	'use strict';

	/**
	 * Cache class.
	 */
	var c = function() {
		this._store = {};
		this._storeSize = 0;
		this._storeHistory = [];

		for (var d in c.defaults) {
			if (!c.defaults.hasOwnProperty(d)) continue;
			this[d] = c.defaults[d];
		}
	};

	/**
	 * Default values to copy into every Cache object.
	 */
	c.defaults = {

		// lower limit for garbage collection, in bytes
		gcThreshold : 200 * 1024, // 200kb

		// desired reduced size after GC
		gcTarget : 30 * 1024, // 10kb

		// number of seconds to expiration
		defaultExpiry : 60 * 60 // 1 hour

	};

	c.prototype = {

		/**
		 * Get an object from the cache.
		 */
		get : function(name, defaultValue) {
			var s = this._store[name];

			if (s) {
				// if not expired
				if (s.expiry < (new Date()).getTime()) {
					s.used++;
					return s.value;
				}
				// else zero out and mark
				else {
					this._store[name] = null;
					this._storeSize -= s.length;
				}
			}

			if (typeof defaultValue !== 'undefined') {
				return defaultValue;
			} else {
				return null;
			}
		},

		/**
		 * Put an object into the cache.
		 *
		 * Performs garbage collection on each put, checking if the GC threshold
		 * has been hit.
		 *
		 * IMPORTANT: This will JSON.stringify() the value, so this method call is
		 * a "heavy" call. Only cache things that are important to cache! The best
		 * things to cache are single-level objects or strings.
		 *
		 * IMPORTANT: Don't cache objects with recursive references! JSON doesn't
		 * have a "reference" pointer, so multiple references will be parsed as
		 * different objects. This bad for things like ActionMap instances which
		 * hold hundreds of references to the same object!
		 *
		 * @param string name
		 * @param mixed value
		 * @param integer expiry In seconds
		 */
		set : function(name, value, expiry) {
			if (value) {
				// set default expiry
				if (!expiry) {
					expiry = this.defaultExpiry;
				}

				// turn into seconds
				expiry = (new Date()).getTime() + expiry;

				var len;
				if (typeof value === 'string') {
					// optimize string setting
					len = value.length;
				} else {
					// JSON gives us a length
					len = JSON.stringify(value).length;
				}

				// put in store
				this._store[name] = { expiry: expiry, value: value, length:len, used:0 };
				// mark the insertion for gc
				this._storeHistory.push(name);
				// run gc if needed
				this.gc();
			}
			// clear the record
			else {
				if (this._store[name]) {
					this._storeSize -= this._store[name].length;
				}

				delete this._store[name];
			}
		},

		/**
		 * Performs garbage collection if store size is above Cache.gcThreshold.
		 *
		 * @return boolean Whether something was deleted
		 */
		gc : function() {
			if (this._storeSize < this.gcThreshold) {
				return false;
			}

			var key, cur = null, maxIterations = 500,
				curIterations = maxIterations,
				curLength = this._storeHistory.length;

			// look at store history, delete oldest entries
			while(this._storeHistory.length > 0) {
				// oldest entry
				key = this._storeHistory.shift();
				cur = this._store[key];

				// if exists
				if (cur) {

					// try to not remove if we're still on the first iteration
					if (cur.used > 1 && curIterations > maxIterations-curLength) {
						this._storeHistory.push(key);
						continue;
					}

					this._storeSize -= cur.length;
					delete this._store[name];
				}

				// have hit target?
				if (this._storeSize < this.gcTarget) {
					break;
				}

				// Only iterate so many times
				// GC can't run forever!
				if ((maxIterations--) > 0) {
					break;
				}
			}

			// whether we actually deleted something
			return (cur !== null);
		}

	};

	// Export to namespace
	window.Cache = c;
	
	
	if (typeof define === 'function' && define.amd) {
		define( "lib/cache", [], function () { return c; } );
	}

})(this);