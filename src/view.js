/*jslint white: true */
(function(root) {
	'use strict';

	if (typeof window.jkui === 'undefined') {
		window.jkui = {};
	}
	
	// must be able to go up one level
	// Depends on Keyboard for defaults and AssetLoader for default parent

	/**
	 * Encapsulates a single DOM item.
	 *
	 * This constructor can be called with:
	 *  * nothing: this view will not contain a DOM element
	 *  * string: this view will wrap the string into a <div> tag and keep track of it
	 *  * DOM element: this view will hold on to the element and track it
	 *
	 * @param object dom nothing, a string, or a DOM element
	 * @author Jesse Decker
	 */
	var root = window.jkui,
		v = function (dom) {
		
		// Setup root element
		if (typeof dom === 'object') {
			this.dom = dom;
		} else if (typeof dom === 'string') {
			this.dom = document.createElement('div');
			this.dom.innerHTML = dom;
		} else {
			this.dom = null;
		}

		// Public
		this.activeViewClass 	= null;	// if set; will be added when this view becomes active
		this.actionMap 			= {};	// map of what to do
		this.onActivate			= null; // callback


		//TODO
		this.deactivateClearsActive = false;
		//TODO


		// Protected (don't touch!)
		//this.dom				= null; // set above
		this.name				= null; // the global name for this instance; see register()
		this.activeElement 		= null; // the current active item; or null
		this.lastActiveElement 	= null;	// the last item to be deactivated
		this.active 			= false;// boolean, whether currently active, don't set directly
		this.activeClass 		= null;	// class to add/remove from active element
		this.parent 			= null;	// reference to parent View instance
		this.children 			= [];	// array of children
		this.activeSubview 		= null;	// a reference to an active subview (or subview that should be active)
		this.hidden 			= true; // boolean, whether shown, don't set directly

		for (var d in v.defaults) {
			if (v.defaults.hasOwnProperty(d)) {
				this[d] = v.defaults[d];
			}
		}
	};

	// Global defaults for the class
	v.defaults = {
		activeClass: 'active'
	};

	v.store = {};

	v.activeViews = [];

	v.register = function(name, value) {
		if (!name || !value) return;
		v.store[name] = value;

		if (value.dom) {
			value.dom.setAttribute('data-viewKey', name);
		}
	};

	v.findByNode = function (node) {
		var key = node.getAttribute('data-viewKey');
		if (key && v.store.hasOwnProperty(key)) {
			return v.store[key];
		}
		return null;
	} ;

	/**
	 * Activate a view. Unless hideOthers is explicitly false, this will
	 * also deactivate() all other views.
	 * @param {Object} key
	 * @param {Object} hideOthers
	 */
	v.activateView = function(key, keepOthers) {
		var view = key;
		if (keepOthers !== true) {
			while (v.activeViews.length > 0) {
				v.deactivateView(v.activeViews[0]);
			}
		}
		// special case
		if (typeof key === 'string' && key in v.store) {
			view = v.store[key];
		}
		view.activate();
		// keep track of it
		v.activeViews.push(view);
	};

	/**
	 * Deactivates and removes from activeViews.
	 * @param {Object} view
	 */
	v.deactivateView = function(view) {
		view.deactivate();
		var i = v.activeViews.indexOf(view);
		if (i !== -1) {
			v.activeViews.splice(i, 1);
		}
	};

	/**
	 * Activates the last-activated view, if one exists.
	 * @return boolean Whether a previous view was found
	 */
	v.goBack = function() {
		if (v.activeViews.length > 1) {
			var i = v.activeViews.length -1, cur, lastView = v.activeViews.length -2;
			for (; i > -1; i--) {
				cur = v.activeViews[i];
				if (cur.parent === lastView) {
					v.activateParent.call(cur);
					return true;
				}
			}
			v.activateView(lastView);
			return true;
		}
		return false;
	};

	v.activateParent = function() {
		if (!this.parent) {
			log('View.activateParent: View has no parent to return to');
			return false;
		}

		this.deactivate();
		if (this.parent.activeSubview === this) {
			this.parent.activeSubview = null;
		}
		this.parent.active = false;
		this.parent.activate();
		return true;
	};

	v.handleKeyEvent = function(evt) {
		var i = v.activeViews.length -1, code,
			id = null, map = null, cur = null, view = null;

		if (evt.type === 'click') {
			id = evt.target.id;
			code = root.Keyboard.KEY_ENTER;
		} else {
			code = evt.keyCode.toString();
		}

		for (; i > -1; i--) {
			view = v.activeViews[i];

			// set ID if not set yet
			if (id === null) {
				if (view.activeElement === null) {
					continue;
				}
				id = view.activeElement.id;
			}

			if (!view.actionMap.hasOwnProperty(id)) {
				continue;
			}

			map = view.actionMap[id];

			if (!map.hasOwnProperty(code)) {
				continue;
			}

			cur = map[code];
			break;
		}

		if (!cur) {
			return false;
		}

		if (evt.type === 'click') {
			// this is an attempt to get the focus back onto the document
			if (document.activeElement) {
				document.activeElement.blur();
			}
			window.focus();
		}

		if (typeof cur === 'function') {
			view.activate();
			cur.call(view, map);
		}
		else {
			view.activate(cur);
		}

		return true;
	};

	/**
	 * Convenience function for extending a View.
	 *
	 * Note: this function will add a _super parameter to the prototype
	 * that references the parent View prototype. You can use this for
	 * calling parent-class methods.
	 *
	 * Example:
	 * <code>
	 * root.View.extend(function MyCustomView() {
	 *   // constructor
	 * }, {
	 *   myMethod : function(arg0, arg1) {},
	 *   myMethod2 : function(arg0) {}
	 * });
	 * </code>
	 *
	 * @param function constructor
	 * @param object methods
	 */
	v.extend = function (constructor, methods) {
		if (!constructor) {
			constructor = {};
		} else if (!methods) {
			methods = constructor;
			constructor = {};
		}

		constructor.prototype = new v();
		for (var i in methods) {
			if (methods.hasOwnProperty(i)) {
				constructor.prototype[i] = methods[i];
			}
		}
		if (!('constructor' in methods)) {
			constructor.prototype.constructor = v;
		}
		if (!('_super' in methods)) {
			constructor.prototype._super = v.prototype;
		}

		return constructor;
	};

	// Instance properties and methods
	v.prototype = {

		/*
		// Public
		activeViewClass 	: null,	// if set, will be added when this view becomes active
		actionMap 			: {},	// map of what to do
		onActivate			: null, // callback

		// Protected (don't touch!)
		dom					: null,
		activeElement 		: null, // the current active item, or null
		lastActiveElement 	: null,	// the last item to be deactivated
		active 				: false,// boolean, whether currently active, don't set directly
		activeClass 		: null,	// private usage, use setActiveClass()
		parent 				: null,	// reference to parent View instance
		children 			: [],	// array of children
		activeSubview 		: null,	// a reference to an active subview (or subview that should be active)
		hidden 				: true, // boolean, whether shown, don't set directly
		*/

		/**
		 * Registered a view as a subview.
		 *
		 * NOTE: once you do this, you MUST call destroy() on the child or else this
		 * instance may still contain a reference to the object, preventing it from
		 * being de-referenced.
		 *
		 * @param View view
		 */
		addChild : function (view) {
			view.parent = this;
			this.children.push(view);
		},

		/**
		 * Removes a subview. Does NOT activate/deactivate anything.
		 *
		 * @param View view
		 */
		removeChild : function(view) {
			var i = this.children.indexOf(view);
			if (i >= 0) {
				if (this.children[i].parent === this) {
					this.children[i].parent = null;
				}
				this.children.splice(i,1);
			}
		},

		register : function(name) {
			this.name = name;
			v.register(name, this);
		},

		/**
		 * If this has been set as a subview of another parent, removes it from parent.
		 * Also hides this view and nulls out the dom.
		 */
		destroy : function() {
			if (this.parent) {
				if (this.parent instanceof v) {
					this.parent.removeChild(this);
				}
			}
			if (this.children.length) {
				var child;
				while(child = this.children.shift()) {
					if (child.parent === this) {
						child.parent = null;
					}
				}
			}
			// hide
			this.show(false);
			this.active = false;

			// Zero out all references
			this.actionMap = {};
			this.onActivate =
			this.dom =
			this.activeElement =
			this.lastActiveElement =
			this.parent =
			this.activeSubview = null;
		},

		/**
		 * Remove the active class from the provided element, OR from the
		 * currently active element if no explicit element provided.
		 *
		 * @param DOMElement el OPTIONAL: The element to remove the class from; if NULL, tries to remove the active element's active class.
		 */
		deactivate : function (el) {
			if (typeof el === 'object' && 'className' in el) {
				v.removeClass(el, this.activeClass);
			} else {
				if (this.active) {
					this.active = false;
					if (this.activeViewClass && this.dom) {
						//this.dom.className = this.dom.className.replace(new RegExp("\\s*"+this.activeViewClass+"\\s*", "gi"), " ");
						v.removeClass(this.dom, this.activeViewClass);
					}
				}
				if (this.activeElement !== null) {
					this.lastActiveElement = this.activeElement;
					if (this.actionMap.hasOwnProperty(this.activeElement.id)) {
						var map = this.actionMap[this.activeElement.id];
						if (typeof map['_deactivate'] === 'function') {
							map['_deactivate'].call(this, map);
						}
					}
					v.removeClass(this.activeElement, this.activeClass);
					this.activeElement = null;
				}
				var i = this.children.length;
				while (i--) {
					this.children[i].deactivate();
				}
				if (this.parent && this.parent.activeSubview === this) {
					this.parent.activeSubview = null;
				}
				// Remove from global array too
				var index = v.activeViews.indexOf(this);
				if (index !== -1) {
					v.activeViews.slice(index, 1);
				}
			}
		},

		/**
		 * Adds the active class to the provided element, OR if none provided,
		 * it tried the lastActiveElement, otherwise it passes to the activeSubview,
		 * or to the first subview.
		 *
		 * @param DOMElement el OPTIONAL
		 */
		activate : function(el) {
			// keep track of whether this view is active
			if (!this.active) {
				// set immediately cuz this might be called again below
				this.active = true;
				log('View.activate: view is becoming active');
				// Ask parent to be active
				if (this.parent) {
					this.parent.activeSubview = this;
					if (!this.parent.active) {
						this.parent.activate();
					}
					if (this.parent.activeElement) {
						this.parent.lastActiveElement = this.parent.activeElement;
						this.parent.activeElement = null;
						v.removeClass( this.parent.lastActiveElement, this.parent.activeClass );
					}
				}

				// add to global array of actives
				var index = v.activeViews.indexOf(this);
				if (index !== -1) {
					v.activeViews.slice(index, 1);
				}
				v.activeViews.push(this);

				// steal focus away from parent
				root.Keyboard.activateView(this);
				// add class
				if (this.activeViewClass && this.dom) {
					v.addClass(this.dom, this.activeViewClass);
				}

				// then pass to children
				if (this.activeSubview) {
					log('View.activate: view has activeSubview, passing...');
					this.activeSubview.activate();
					return;

				} /*else {
					// If we don't have a specific subview set active, then use first
					if (this.children.length > 0) {
						this.children[0].activate();
					}
					return;
				}/**/

				// if an element isn't provided, use the default
				if (typeof el !== 'object' || el === null || !el.hasOwnProperty('className')) {
					// Activate the last-activated if returning to this view
					if (this.lastActiveElement) {
						el = this.lastActiveElement;
					}
					// Last attempt to check if anything was set
					else if (this.activeElement) {
						el = this.activeElement;
					}
				}

			}

			if (!el) {
				log('View.activate: no element to ack, el='+el);
				return;
			}

			var id, map;

			// if changing elements
			if (this.activeElement !== el) {
				// if previous el, deactivate it
				if (this.activeElement !== null) {
					this.lastActiveElement = this.activeElement;
					id = this.activeElement.id;
					if (this.actionMap.hasOwnProperty(id)) {
						map = this.actionMap[id];
						if (map.hasOwnProperty('_deactivate')) {
							map['_deactivate'].call(this, map);
						}
					}
					v.removeClass(this.activeElement, this.activeClass);
				}

				v.addClass(el, this.activeClass);
			}

			// run handlers, if set
			id = el.id;
			if (id in this.actionMap) {

				// only set if we have a way out
				this.activeElement = el;

				map = this.actionMap[id];
				// activation handlers
				if (typeof map['_activate'] === 'function') {
					map['_activate'].call(this, map);
				}
				if (typeof map['_scroll'] === 'function') {
					map['_scroll'].call(this, map);
				}
				if (typeof map['_paginate'] === 'function') {
					map['_paginate'].call(this, map);
				}
			}
		},

		/**
		 * Call without parameters, or with TRUE, to add this View's DOM element to either the
		 * parent View, or to the AssetLoader.BODY.
		 *
		 * @param boolean b Whether to show or not; if NULL, will be interpreted as TRUE
		 */
		show : function(b) {
			// can't add nothing
			if (!this.dom) { return; }
			// null means show
			if (typeof b === 'undefined') { b = true; }
			// check if status is changing
			if (b === this.hidden) {
				var p;
				// check is sub-class
				if (this.parent) {
					// operate on parent
					p = this.parent;
					// if a View class, then use the dom attribute
					if (p.dom) { p = p.dom; }
				}
				// Treat like a top-level view
				else {
					p = root.AssetLoader.BODY;
				}
				// now insert/remove
				if (b) { p.appendChild(this.dom); /*p.insertBefore(this.dom, p.firstChild); */}
				else { p.removeChild(this.dom); }
				// cache hidden value
				this.hidden = !b;
			}
		},

		/**
		 * Process key event within the scope of this View object.
		 *
		 * This function does not consume the object. Additionally, if an active subview
		 * is set, this function will explicitly pass the event on to it.
		 *
		 * @param Event evt
		 */
		handleKeyEvent : function(evt) {
			var map, code, cur;

			// Quick exit if map is function
			if (typeof this.actionMap === 'function') {
				this.actionMap.call(this, evt);
				return;
			}

			// Workaround for onclick
			if (evt.type === 'click') {
				if (this.actionMap.hasOwnProperty( evt.target.id )) {
					map = this.actionMap[ evt.target.id ];
					code = '' + root.Keyboard.KEY_ENTER;
					// this is an attempt to get the focus back onto the document
					if (document.activeElement) {
						document.activeElement.blur();
					}
					window.focus();
				}
				else {
					// push to global View object
					return v.handleKeyEvent(evt);
				}
			}
			// Normal case
			else if (this.activeElement !== null) {
				map = this.actionMap[this.activeElement.id];
				code = evt.keyCode.toString();
			}
			// View is not active
			else {
				map = null;
				code = null;
			}

			// Have an active map to work with?
			// Treat as array of key options
			if (typeof map === 'object' && map !== null) {
				if (code in map) {
					// Operate on keystroke first
					cur = map[code];
				}
				// check if global key handler exists
				else if (code in this.actionMap) {
					cur = this.actionMap[ code ];
				}
				else {
					cur = null;
				}
			}
			// Treat as simple callback
			else if (typeof map === 'function') {
				cur = map;
			}
			// Maybe we need to tell subview
			else {
				cur = null;
			}


			// Treat as callback
			if (typeof cur === 'function') {
				// call within this scope
				cur.call(this, evt);
			}
			// Treat as something to activate
			// typeof cur === 'object' && cur !== null
			else if (cur) {
				// Treat as element
				if (cur.hasOwnProperty('id')) {
					if (this.actionMap[cur.id]) {
						this.activate(cur);
					} else if (this.parent && this.parent.actionMap[cur.id]) {
						this.deactivate();
						this.parent.activate(cur);
					}
				}
				// Treat as a View object
				else if ('dom' in cur) {
					if (cur === this) {
						if (this.activeSubview) {
							this.activeSubview.deactivate();
						}
						this.activeSubview = null;
					}
					v.activateView(cur);
					//cur.activate();
				}
				else {
					// what kind of object is this?
					return false;
				}
			}
			// Can't process, Send event down-stream
			else {
				if (this.activeSubview) {
					return this.activeSubview.handleKeyEvent(evt);
				}
				else {
					for (var k = this.children.length -1; k > -1; k--) {
						if (this.children[k].handleKeyEvent(evt)) {
							return true;
						}
					}
					return false;
				}
			}

			return true;
		},

		sleep : function() {
			if (!this.dom) return;

			this.domContent = this.dom.innerHTML;

			this.dom.innerHTML = '';

			if (this.dom.parentNode) {
				this.domParent = this.dom.parentNode;
				this.dom.parentNode.removeChild(this.dom);
			}
		},

		wakeup : function() {
			if (!this.dom) return;

			if (!this.domContent) return;

			this.dom.innerHTML = this.domContent;
			this.domContent = null;

			if (this.domParent) {
				this.domParent.appendChild(this.dom);
				this.domParent = null;
			}
		}

	};

	function log(msg) {
		if (typeof root.Log === 'object') root.Log.log(msg);
		else if (typeof console === 'object') console.log(msg);
	}

	// Derived from bonzo.js, by Dustin Diaz - https://github.com/ded/bonzo
	// Edited by Jesse Decker

	function classReg(c) {
		return new RegExp("(?:^|\\s+)" + c + "(?:\\s+|$)");
	}

	// use classList API if available
	var supportClassList = 'classList' in document.body;

	v.hasClass = supportClassList ? function (el, c) {
		return el.classList.contains(c);
	} : function (el, c) {
		return classReg(c).test(el.className);
	};

	v.addClass = supportClassList ? function (el, c) {
		el.classList.add(c);
	} : function (el, c) {
		if ( !hasClass(el, c) ) {
			el.className = el.className + ' ' + c;
		}
	};

	v.removeClass = supportClassList ? function (el, c) {
		el.classList.remove(c);
	} : function (el, c) {
		el.className = el.className.replace(classReg(c), ' ');
	};

	root.View = v;

	if (typeof define === 'function' && define.amd) {
		define( "jkui/view", [], function () { return v; } );
	}
})(window);