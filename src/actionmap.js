/*jslint white: true */
(function(root) {
	'use strict';
	
	/**
	 * Convenience methods for generating action maps.
	 * 
	 * Example:
	 * <code>
	 * ActionMap.make(myView.actionMap).grid({
			elements: elements,
			numPerRow: 6
		}).border({
			elements: elements,
			left: Layout.views.menu
		}).scroll({
			elements: elements,
			numPerPage: 6,
			container: page_init.dom,
			offsetPerPage: 300
			//,imagePages: images
		}).every({
			elements: elements,
			key: Keyboard.KEY_RETURN,
			value: Layout.views.menu
		});
	 * </code>
	 */
	var am = root.ActionMap = function(mergeInto, opts) {
			if (mergeInto instanceof root.View) { mergeInto = mergeInto.actionMap; }
			this.map = mergeInto ? mergeInto : {};
			opts = opts || {};
			
			var i = null, defaults = am.defaults;
			
			for (i in defaults) {
				if (defaults.hasOwnProperty(i)) {
					this[i] = defaults[i];
				}
			}
			
			for (i in opts) {
				if (opts.hasOwnProperty(i)) {
					this[i] = opts[i];
				}
			}
		};
	
	// READ-ONLY variable that holds the last-used unique ID
	am.uniqueID = 0,
	// The key to store map instances in
	am.mapInstanceKey = '_map',
	// Global class defaults
	am.defaults = {
		// One of these is required if you want the map to be modified
		// elements : [], // Array of elements
		// rows : [], // Use beginning and end of these lists
		
		// Needed for almost everything
		numPerRow : 1, // How to determine the end of the row
		numPerPage : 1, // OPTIONAL: used with elements:, the number of elements to assume per page
		rowsPerPage : 1, // OPTIONAL: used with rows:, the number of rows to assume per page
		
		// Optional parameters for border()
		// left : null, // Handler for left-side elements
		// top : null, // Handler for top-side elements
		// bottom : null, // Handler for bottom-side elements
		// right : null, // Handler for right-side elements
		
		// Optional parameters for addSelf()
		// selfKey : '_self', // OPTIONAL: Key in this.map to store a reference to the original element
		
		// Optional parameters for scroll()
		// container : null, // REQUIRED: Element to place the style property
		pageHeight : 0, // REQUIRED: Number to increment for each page
		scrollProperty : 'top', // OPTIONAL: Property to scroll (numeric only)
		scrollUnit : 'px', // OPTIONAL: Unit to scroll
		scrollParentKey : '_scrollContainer', // OPTIONAL: Key in this.map to store the scroll parent
		lastScrollValue: 0, // OPTIONAL: only set if you want to start scrolling from a different position than 0
		useSize : false, // OPTIONAL: use the element's height to determine if it is within the viewport
		viewportSize : 0, // OPTIONAL: the size of the scrolling viewport
		
		// Optional parameters for scroll() for pagination
		paginateKey : '_paginate', // OPTIONAL: Key in this.map to store a reference to the paginate check function
		lastPage: 0, // OPTIONAL: only set if you want to start scrolling from a different position than 0
		pageThreshold: 4, // OPTIONAL: number of extra pages to show
		pageChangeThreshold: 2, // OPTIONAL: number of pages to scroll away from the last adjusted page before checking again, must be < pageThreshold
		lastPageAdjust: 0, // leave alone, this is the last-used value of the page adjust
		imagePages: null // OPTIONAL: for use with scroll(), specify if you have a list of indexed page containers to hide
	};
	// convenience array, don't touch
	am.instanceVars = [ 'numPerRow', 'numPerPage', 'rowsPerPage', 'pageHeight', 'scrollProperty', 
					'scrollUnit', 'scrollParentKey', 'lastScrollValue', 'useSize', 'viewportSize', 
					'paginateKey', 'lastPage', 'pageThreshold', 'pageChangeThreshold', 'imagePages' ];
	
	/**
	 * Convenience method for chaining.
	 */
	am.make = function(mergeInto, opts) {
		return new am(mergeInto, opts);
	};
	
	
	// Begin instance methods
	am.prototype = {
		
		/**
		 * Prepares the options object by copying in keys from this.
		 * 
		 * Protected function -- intended for merging options internally.
		 */
		opts : function(opts) {
			if (typeof opts === 'object' && opts !== null) {

				var falseKeys = [ 'left', 'top', 'bottom', 'right' ],
					i, key;
				
				for (i=falseKeys.length-1; i > -1; i--) {
					// check if the property should be set false
					key = falseKeys[i];
					if (opts.hasOwnProperty(key) && !opts[key]) {
						opts[key] = false;
					}
				}
				
				for (i=am.instanceVars.length-1; i > -1; i--) {
					key = am.instanceVars[i];
					if (opts[key]) {
						this[key] = opts[key];
					} else {
						opts[key] = this[key];
					}
				}
				
				return opts;
			}
			else {
				return {};
			}
		},
		
		/**
		 * Setup a grid of activation events.
		 */
		grid : function(opts) {
			opts = this.opts(opts);
			
			var id, i, k = root.Keyboard, j, row;
			
			// treat as simple grid
			if (opts.elements && opts.elements.length > 2) {
				var arr = opts.elements;
				// prepare array
				for (i = 0; i < arr.length; i++) {
					id = getElementID(arr[i]);
					if (!(id in this.map)) {
						this.map[id] = {};
					}
				}
				// Right/Left
				i = 0, id = arr[i].id;
				this.map[id][k.KEY_RIGHT] = arr[i + 1];
				for (i++; i < arr.length - 1; i++) {
					id = arr[i].id;
					this.map[id][k.KEY_RIGHT] = arr[i + 1];
					this.map[id][k.KEY_LEFT] = arr[i - 1];
				}
				
				id = arr[i].id;
				this.map[id][k.KEY_LEFT] = arr[i - 1];
				// Up/Down
				for (i = 0; i < arr.length; i++) {
					id = arr[i].id;
					if (i - opts.numPerRow >= 0) {
						this.map[id][k.KEY_UP] = arr[i - opts.numPerRow];
					} else {
						this.map[id][k.KEY_UP] = arr[0];
					}
					if (i + opts.numPerRow < arr.length) {
						this.map[id][k.KEY_DOWN] = arr[i + opts.numPerRow];
					} else {
						this.map[id][k.KEY_DOWN] = arr[arr.length - 1];
					}
				}
			}
			// treat as rows 
			else if (opts.rows && opts.rows.length) {
				
				if (!opts.numPerRow) opts.numPerRow = 1;
				
				for (i = opts.rows.length-1; i > 0; i--) {
					// remove empty row
					if (!opts.rows[i].length) {
						opts.rows.splice(i,1);
					}
				}
				
				for (i = 0; i < opts.rows.length; i++) {
					row = opts.rows[i];
					
					for (j = 0; j < row.length; j++) {
						// only operate if exists
						if (typeof row[j] !== 'object') {
							continue;
						}
						// generate unique ID
						id = getElementID(row[j]);
						// ensure id exists
						if (!this.map[id]) {
							this.map[id] = {};
						}
						
						// set RIGHT
						if (j < (row.length - 1)) {
							this.map[id][k.KEY_RIGHT] = row[j + 1];
						} else if (i < opts.rows.length-1) {
							var nextrow = opts.rows[i+1];
							if (nextrow.length) {
								this.map[id][k.KEY_RIGHT] = nextrow[0];
							}
						}
						// LEFT
						if (j > 0) {
							this.map[id][k.KEY_LEFT] = row[j - 1];
						} else if (i > 0) {
							var prevrow = opts.rows[i-1];
							if (prevrow.length) {
								this.map[id][k.KEY_LEFT] = prevrow[ prevrow.length -1 ];
							}
						}
						
						// UP
						if (j >= opts.numPerRow) {
							this.map[id][k.KEY_UP] = row[j - opts.numPerRow];
						} else if (i === 0) {
							this.map[id][k.KEY_UP] = row[0];
						} else {
							var prevRow = opts.rows[i - 1], newid, leftovers;
							if (prevRow.length > opts.numPerRow) {
								newid = (prevRow.length - opts.numPerRow); // range of indexes to choose from
								leftovers = (prevRow.length % opts.numPerRow); // how many straglers there are
								
								if (leftovers === 0) {
									newid = newid + j;
								} else if (leftovers > j) {
									newid = prevRow.length - leftovers + j;
								} else {
									newid = prevRow.length - leftovers - opts.numPerRow + j;
								}
								
								this.map[id][k.KEY_UP] = prevRow[newid];
							} else if (j >= prevRow.length) {
								if (prevRow.length > 0) {
									this.map[id][k.KEY_UP] = prevRow[prevRow.length - 1];
								}
							} else {
								this.map[id][k.KEY_UP] = prevRow[j];
							}
						}
						
						// DOWN
						if (j < (row.length - opts.numPerRow)) {
							this.map[id][k.KEY_DOWN] = row[ j + opts.numPerRow ];
						} else if (i < (opts.rows.length - 1)) {
							var newid = j % opts.numPerRow, nextRow = opts.rows[i + 1];
							if (newid >= nextRow.length) {
								this.map[id][k.KEY_DOWN] = nextRow[nextRow.length - 1];
							} else {
								this.map[id][k.KEY_DOWN] = nextRow[newid];
							}
						}
					}
				}
			}
			
			// chain
			return this;
		},
		
		/**
		 * Adds a reference to the original element stored in each indexed map under opts.selfKey.
		 * @param opts
		 * @returns {am.Map}
		 */
		addSelf : function(opts) {
			opts = this.opts(opts);
			var i, j, id, el, row;
			
			if (!opts.rows) opts.rows = [];
			if (opts.elements) opts.rows.concat(opts.elements);
			
			for (i=opts.rows.length-1; i >= 0; i--) {
				row = opts.rows[i];
				for (j=row.length; j >= 0; j--) {
					el = row[j];
					id = el.id;
					// don't override custom callbacks!
					if (id && typeof this.map[id] === 'object') {
						this.map[id][ opts.selfKey ] = el;
					}
				}
			}
			
			// chain
			return this;
		},
		
		/**
		 * Sets actions for the borders of the grid.
		 * @param opts
		 * @returns {am.Map}
		 */
		border : function(opts) {
			// Merge defaults, save to local
			opts = this.opts(opts);
			var i, j, k = root.Keyboard;
			
			// Treat as standard grid
			if (opts.elements && opts.elements.length > 0) {
				opts.rows = [];
				var r = 0;
				for (i = 0; i < opts.elements.length; i++) {
					opts.rows[r] = [];
					for (j = 0; j < opts.numPerRow && (i + j) < opts.elements.length; j++) {
						opts.rows[r].push(opts.elements[i + j]);
					}
					i += j - 1;
					r++;
				}
			}
			
			// Only operate on non-empty rows
			if (!opts.rows || opts.rows.length < 1) {
				return this;
			}
			
			if (opts.hasOwnProperty('top')) {
				for (i = 0; i < opts.rows[0].length; i++) {
					setKey(this.map, opts.rows[0][i], k.KEY_UP, opts.top);
				}
			}
			if (opts.hasOwnProperty('left')) {
				for (i = 0; i < opts.rows.length; i++) {
					if (!opts.rows[i].length)
						continue;
					else if (opts.rows[i].length > opts.numPerRow) {
						for (var j=0; j < opts.rows[i].length; j++) {
							if ((j % opts.numPerRow) === 1) {
								setKey(this.map, opts.rows[i][j], k.KEY_LEFT, opts.left);
							}
						}
					} else {
						setKey(this.map, opts.rows[i][0], k.KEY_LEFT, opts.left);
					}
				}
			}
			if (opts.hasOwnProperty('right')) {
				for (i = 0; i < opts.rows.length; i++) {
					if (!opts.rows[i].length)
						continue;
					else if (opts.rows[i].length > opts.numPerRow) {
						for (var j=0; j < opts.rows[i].length; j++) {
							if ((j % opts.numPerRow) === 0) {
								setKey(this.map, opts.rows[i][j], k.KEY_RIGHT, opts.right);
							}
						}
					} else {
						setKey(this.map, opts.rows[i][opts.rows[i].length - 1], k.KEY_RIGHT, opts.right);
					}
				}
			}
			if (opts.hasOwnProperty('bottom')) {
				i = opts.rows[opts.rows.length - 1];
				for (j = 0; j < i.length; j++) {
					setKey(this.map, i[j], k.KEY_DOWN, opts.bottom);
				}
			}
			
			// chain
			return this;
		},
		
		/**
		 * Adds a scrolling function.
		 * @param opts
		 * @returns {am.Map}
		 */
		scroll : function(opts) {
			/*
			 * var defaults = { // EITHER THIS elements: [], // elements organized as
			 * long array numPerPage: 0, // number of elements to assume per page // OR
			 * THIS rows: [], // elements organized into rows rowsPerPage: 1, //
			 * OPTIONAL: // Other options container: null, // REQUIRED: Element to place
			 * the style property pageHeight: 0, // REQUIRED: Number to increment for
			 * each page scrollProperty: 'top', // OPTIONAL: Property to scroll (numeric
			 * only) scrollUnit: 'px', // OPTIONAL: Unit to scroll scrollKey: '__scroll' //
			 * OPTIONAL: Key in this.map to store the scroll function };
			 */
	
			// Merge defaults, save to opts
			opts = this.opts(opts);
			
			var i = 0, j = 0, curMap, id, el, curPage = -1, 
				cachedOffset = null, cachedSize = null, maxCacheValues = 20;
			
			// cache page numbers
			// Treat as grid
			if (opts.elements && opts.elements.length > 1) {
				opts.rows = [ opts.elements ];
				opts.elements = null;
			}
			
			// Do nothing
			if (!opts.rows || opts.rows.length < 1) {
				return this;
			}
			
			if (!opts.offset) {
				opts.offset = 0;
			}
			
			// replace element in map with function call
			for (i=0; i < opts.rows.length; i++) {
				curPage++;
				
				for (j=0; j < opts.rows[i].length; j++) {
					
					el = opts.rows[i][j];
					id = getElementID(el);
					
					// increment the page when we hit the end of the line
					if ((j % opts.numPerPage) === 0) {
						if (maxCacheValues > 0) {
							maxCacheValues--;
							switch (opts.scrollProperty) {
							case 'top':
							case 'marginTop':
								cachedOffset = el.offsetTop;
								if (opts.useSize) cachedSize = el.offsetHeight;
								break;
							case 'bottom':
							case 'marginBottom':
								cachedOffset = el.offsetBottom;
								if (opts.useSize) cachedSize = el.offsetHeight;
								break;
							case 'left':
							case 'marginLeft':
								cachedOffset = el.offsetLeft;
								if (opts.useSize) cachedSize = el.offsetWidth;
								break;
							case 'right':
							case 'marginRight':
								cachedOffset = el.offsetRight;
								if (opts.useSize) cachedSize = el.offsetWidth;
							}
							cachedOffset -= opts.offset;
						} else {
							cachedOffset = null;
							cachedSize = null;
						}
						if (j > 0) {
							curPage++;
						}
					}
				
					if (!this.map.hasOwnProperty(id)) {
						this.map[id] = {};
					}
					
					curMap = this.map[id];
					curMap[ am.mapInstanceKey ] = this;
					curMap[ '_scroll' ] = am.__scroll;
					curMap[ opts.scrollParentKey ] = opts.container;
					curMap[ '_page' ] = curPage;
					curMap[ '_scrollOffset' ] = cachedOffset;
					curMap[ '_scrollSize' ] = cachedSize;
				}
			}//for
			
			if (opts.imagePages) {
				curPage = -1;
				
				var outOfScope, url;
				
				for (i=0; i < opts.imagePages.length; i++) {
					curPage++;
					
					for (j=0; j < opts.imagePages[i].length; j++) {
						
						el = opts.imagePages[i][j];
						outOfScope = (curPage > opts.lastPage + opts.pageThreshold || curPage < opts.lastPage - opts.pageThreshold);
						
						if (j > 0 && (j % opts.numPerRow) === 0) {
							curPage++;
						}
						
						id = getElementID(el);
						
						if (!(id in this.map)) {
							this.map[id] = {};
						}
						
						switch (el.tagName) {
							case 'IMG':
								url = el.src;
								if (!url) {
									url = el.getAttribute('data-image-url');
									if (url) {//} && !outOfScope) {
										el.src = url;
									}
								} else {
									if (outOfScope) {
										el.src = '';
									}
								}
								break;
								
							case 'DIV':
							case 'SPAN':
							case 'B':
							case 'A':
								url = el.getAttribute('data-image-url');
								
								if (!url) {
									url = el.href;
								}
						
								if (outOfScope) {
									if (el.style.backgroundImage !== '') {
										el.style.backgroundImage = '';
									}
								} else {
									if (el.style.backgroundImage !== url) {
										el.style.backgroundImage = url;
									}
								}
								break;
								
							default:
								url = '';
						}//switch
						
						this.map[id]['_bg'] = url;
						
					}
				}
			}
			
			// chain
			return this;
		},
		
		/**
		 * Sets every element in the map with the provided key/value or values.
		 * 
		 * Either of these is required:
		 * elements: array of elements
		 * rows: array of arrays of elements
		 * 
		 * Optional:
		 * key: the key to set
		 * value: the key to set
		 * values: object of keys/values to set 
		 * 
		 * @param object opts Object of options with the above keys set
		 */
		every : function(opts) {
			if ((!opts.key || !opts.value) && !opts.values) {
				return this;
			}
			
			opts = this.opts(opts);
			var id, i, j;
			
			if (opts.elements && opts.elements.length) {
				opts.rows = [ opts.elements ];
			}
			
			if (opts.rows && opts.rows.length) {
				for (i = 0; i < opts.rows.length; i++) {
					for (j = 0; j < opts.rows[i].length; j++) {
						id = getElementID(opts.rows[i][j]);
						if (!this.map[id]) {
							this.map[id] = {};
						}
						if (opts.key) {
							this.map[id][opts.key] = opts.value;
						}
						if (opts.values) {
							for (var v in opts.values) {
								if (opts.values.hasOwnProperty(v)) {
									this.map[id][v] = opts.values[v];
								}
							}
						}
					}
				}
			}
			
			// chain
			return this;
		}
		
	}; //prototype
	
	/**
	 * Performs a scroll event within the context of a View object.
	 * 
	 * Will use the _map key to get the instance of ActionMap that holds the appropriate settings. 
	 * Intended to be used in a View's actionMap, only when the '_map' key is also set.
	 */
	am.__scroll = function() {
		
		var el = this.activeElement,  
			opts, id, curMap, curPage, cachedOffset, cachedSize, parentEl;
		
		if (!el || !el.hasOwnProperty('id')) {
			return;
		}
		
		// Touch the element ONCE
		id = el.id;
		
		// Need an active map
		if (!this.actionMap.hasOwnProperty(id)) {
			return;
		}
		
		// cache values
		curMap = this.actionMap[id];
		// pull out values from map
		opts = curMap[ am.mapInstanceKey ];
		curPage  = curMap[ '_page' ];
		parentEl = curMap[ opts.scrollParentKey ];
		
		// we need to have something to scroll!
		if (typeof parentEl !== 'object') {
			return;
		}
		
		if (opts.imagePages) {
			//am.__paginate.call(opts, curPage, curMap);
		}
		
		// modify property before pushing
		//cachedOffset = curPage * opts.pageHeight;
		cachedOffset = curMap[ '_scrollOffset' ];
		cachedSize = curMap[ '_scrollSize' ];
		
		// build if not there
		if (cachedOffset === null) {
			switch (opts.scrollProperty) {
			case 'top':
			case 'marginTop':
				cachedOffset = el.offsetTop;
				if (opts.useSize) cachedSize = el.offsetHeight;
				break;
			case 'bottom':
			case 'marginBottom':
				cachedOffset = el.offsetBottom;
				if (opts.useSize) cachedSize = el.offsetHeight;
				break;
			case 'left':
			case 'marginLeft':
				cachedOffset = el.offsetLeft;
				if (opts.useSize) cachedSize = el.offsetWidth;
				break;
			case 'right':
			case 'marginRight':
				cachedOffset = el.offsetRight;
				if (opts.useSize) cachedSize = el.offsetWidth;
			}
			cachedOffset -= opts.offset;
			// cache for later
			curMap[ '_scrollOffset' ] = cachedOffset;
			curMap[ '_scrollSize' ] = cachedSize;
		}
	
		// try to keep object within viewport, top-aligned
		if (opts.useSize) {
			if (cachedSize + opts.offset < opts.viewportSize) {
				cachedOffset = Math.max(cachedOffset, cachedOffset + opts.viewportSize - cachedHeight - opts.offset);
			}
		}
		
		// check need to change
		if (opts.lastScrollValue != cachedOffset) {
			opts.lastScrollValue = cachedOffset;
			
			if (!am.useJQScroll) {
				parentEl.style[opts.scrollProperty] = (-cachedOffset) + opts.scrollUnit;
			} else {
				var a = {}, el;
				a[opts.scrollProperty] = (-cachedOffset) + opts.scrollUnit;
				el = $(parentEl);
				el.stop(true);
				el.animate(a, 400, 'swing');
			}
		}
		
	};
	
	/**
	 * Only run after a scroll
	 * @param opts
	 * @returns {am.Map}
	 *
	am.Map.prototype.paginate = function(opts) {
		
		return this;
	};
	
	/**
	 * Perform a paginatation event. Uses <code>this</code> to 
	 * @param view
	 * @param curPage
	 */
	am.__paginate = function(curPage, curMap, id) {
		var change = curPage - this.lastPage;
		if (change > this.pageChangeThreshold || (-change) > this.pageChangeThreshold) {
			var from = Math.min(curPage, this.lastPage), to = Math.max(curPage, this.lastPage), 
				parentEl, parentEls,
				i = Math.max(from - this.pageThreshold -1, 0), iMax = Math.min(to + this.pageThreshold +1, this.imagePages.length -1),
				curImage, j;
				//show, cname = 'scroller-out-of-range'
				//,cnameRegex = new RegExp('\\s*'+cname+'\\s*', 'gi');
			for (; i < curPage - this.pageThreshold; i++) {
				parentEls = this.imagePages[i];
				if (!parentEls) continue;
				for (j = parentEls.length-1; j > -1; j--) {
					parentEl = parentEls[j];
					if (parentEl.src !== '') {
						parentEl.src = '';
					}
				}
			}
			for (; i <= Math.min(curPage + this.pageThreshold, iMax); i++) {
				parentEls = this.imagePages[i];
				if (!parentEls) continue;
				for (j = parentEls.length-1; j > -1; j--) {
					parentEl = parentEls[j];
					curImage = this.map[parentEl.id]['_bg'];
					if (parentEl.src !== curImage) {
						parentEl.src = curImage;
					}
				}
			}
			for (; i <= iMax; i++) {
				parentEls = this.imagePages[i];
				if (!parentEls) continue;
				for (j = parentEls.length-1; j > -1; j--) {
					parentEl = parentEls[j];
					if (parentEl.src !== '') {
						parentEl.src = '';
					}
				}
			}
			/*
			for (; i <= iMax; i++) {
				parentEls = this.imagePages[i];
				
				show = ( curPage - this.pageThreshold <= i && i <= curPage + this.pageThreshold );
				for (var j=parentEls.length-1; j > -1; j--) {
					parentEl = parentEls[j];
					if (show) {
	//					if (parentEl.className.indexOf(cname) > -1) {
	//						parentEl.className = parentEl.className.replace( cnameRegex, ' ' );
	//					}
	//					if (parentEl.style.backgroundImage.length === 0 && parentEl.disabled_bg) {
	//						parentEl.style.backgroundImage = parentEl.disabled_bg;
	//					} 
						parentEl.style.backgroundImage = this.map[parentEl.id]['_bg'];
					}
					else {
	//					if (parentEl.className.indexOf(cname) === -1) {
	//						parentEl.className += ' '+cname;
	//					}
						parentEl.style.backgroundImage = '';
					}
				}
			}*/
			this.lastPage = curPage;
		}
		change = this.lastPage - this.pageThreshold;
		return (change > 0) ? change : 0;
	};
	
	// Private tracking variable
	var uniqueID = 0;
	
	/**
	 * Uses a counter to generate a unique ID. The counter is private, so an ID is gauranteed
	 * to be unique.
	 * 
	 * This uses an integer, so eventually it will overflow. 
	 * Upper limit is 2^53, or 9007199254740992.  Good luck!
	 */
	var generateUniqueID = function() {
		uniqueID++;
		return "genID_" + uniqueID;
	};
	
	/**
	 * If the provided element has an ID already, returns it.  If not, this generates one,
	 * sets it, and returns it.
	 * 
 	 * @param {Object} el
	 */
	var getElementID = function(el) {
		if (typeof el === 'object' && 'id' in el) {
			if (el.id.length > 0) {
				return el.id;
			} else {
				return el.id = generateUniqueID();
			}
		}
		
		return generateUniqueID();
	};
	
	/**
	 * Convenience function. I found myself doing this all the time...
	 * 
	 * @param {Object} map
	 * @param {Object} el
	 * @param {Object} key
	 * @param {Object} value
	 */
	var setKey = function(map, el, key, value) {
		var id = getElementID(el);
		if (!map[id]) {
			map[id] = {};
		}
		map[id][key] = value;
	};
	
})(typeof root !== 'undefined' ? root : window);