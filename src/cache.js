(function(root) {
	
	var 
		// private store
		store = {},
		storeSize = 0,
		storeHistory = [],
		/**
		 * Cache Singleton object.
		 */
		c = root.Cache = {
		
		// lower limit for garbage collection, in bytes
		gcThreshold : 200 * 1024, // 200kb
		
		// desired reduced size after GC
		gcTarget : 30 * 1024, // 10kb
		
		// number of seconds to expiration
		defaultExpiry : 60 * 60, // 1 hour
		
		/**
		 * Get an object from the cache.
		 */
		get : function(name, defaultValue) {
			var s = store[name];
			
			if (s) {
				// if not expired
				if (s.expiry < (new Date()).getTime()) {
					return s.value;
				}
				// else zero out and mark 
				else {
					store[name] = null;
					storeSize -= s.length;
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
					expiry = c.defaultExpiry;
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
				store[name] = { expiry: expiry, value: value, length:len };;
				// mark the insertion for gc
				storeHistory.push(name);
				// run gc if needed
				c.gc();
			}
			// clear the record
			else {
				if (store[name]) {
					storeSize -= store[name].length;
				}
				
				store[name] = null;
			}
		},
		
		/**
		 * Performs garbage collection if store size is above Cache.gcThreshold.
		 *
		 * @return boolean Whether something was deleted
		 */
		gc : function() {
			if (storeSize < c.gcThreshold) {
				return false;
			}
			
			var key, cur = null, maxIterations = 1000;
			
			// look at store history, delete oldest entries
			while(storeHistory.length > 0) {
				// oldest entry
				key = storeHistory.shift();
				cur = store[key];
				
				// if exists
				if (cur) {
					store[key] = null;
					storeSize -= cur.length;
				}
				
				// have hit target?
				if (storeSize < gcTarget) {
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
	
})(typeof root !== 'undefined' ? root : window);