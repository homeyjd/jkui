(function(root) {

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
var v = root.View = function (dom) {
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
	
	// Protected (don't touch!)
	//this.dom				= null; // set above
	this.activeElement 		= null; // the current active item; or null
	this.lastActiveElement 	= null;	// the last item to be deactivated
	this.active 			= false;// boolean, whether currently active, don't set directly
	this.activeClass 		= null;	// private usage; use setActiveClass()
	this.activeClassRegex 	= null;	// private usage; use setActiveClass()
	this.parent 			= null;	// reference to parent View instance
	this.children 			= [];	// array of children
	this.activeSubview 		= null;	// a reference to an active subview (or subview that should be active)
	this.hidden 			= true; // boolean, whether shown, don't set directly
	
	// Set the initial active class
	this.setActiveClass(v.defaults.activeClass);
};

// Global defaults for the class
v.defaults = {
	activeClass: 'active'
};

v.store = {};

v.activeViews = [];
v.lastActiveView = null;

v.register = function(name, value) {
	if (!name) return;
	if (!value) value = this;
	v.store[name] = value;
};

/**
 * Activate a view. Unless hideOthers is explicitly false, this will 
 * also deactivate() all other views.
 * @param {Object} key
 * @param {Object} hideOthers
 */
v.activateView = function(key, keepOthers) {
	var v = key;
	if (!(keepOthers === false)) {
		while (v.activeViews.length > 0) {
			v.deactivateView(m.activeViews[0]);
		}
	}
	// special case
	if (typeof key === 'string' && key in v.store) {
		v = v.views[key];
	}
	v.activate();
	// keep track of it
	v.activeViews.push(v);
	v.lastActiveView = v;
};

/**
 * Deactivates and removes from activeViews.
 * @param {Object} view
 */
v.deactivateView = function(view) {
	view.deactivate();
	var i = v.activeViews.indexOf(view);
	if (i >= 0) {
		v.activeViews.splice(i, 1);
	}
};

/**
 * Activates the last-activated view, if on exists.
 */
v.goBack = function() {
	if (v.lastActiveView) {
		v.lastActiveView.activate();
	}
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
 * 	// constructor
 * }, {
 * 	myMethod : function(arg0, arg1) {},
 * 	myMethod2 : function(arg0) {}
 * });
 * </code>
 * 
 * @param function constructor
 * @param object methods
 */
v.extend = function (constructor, methods) {
	if (typeof constructor !== 'function') {
		return;
	}
	constructor.prototype = new v();
	for (var i in methods) {
		if (methods.hasOwnProperty(i)) {
			constructor.prototype[i] = methods[i];
		}
	}
	if (!constructor.prototype.hasOwnProperty(constructor)) {
		constructor.prototype.constructor = constructor;
	}
	if (!methods.hasOwnProperty('_super')) {
		constructor.prototype._super = v.prototype;
	}
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
	activeClassRegex 	: null,	// private usage, use setActiveClass()
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
			el.className = el.className.replace(this.activeClassRegex, "");
		} else {
			if (this.active) {
				this.active = false;
				if (this.activeViewClass && this.dom) {
					this.dom.className = this.dom.className.replace(new RegExp("\\s*"+this.activeViewClass+"\\s*", "gi"), " ");
				}
			}
			if (this.activeElement !== null) {
				this.lastActiveElement = this.activeElement;
				this.activeElement.className = this.activeElement.className.replace(this.activeClassRegex, " ");
				this.activeElement = null;
			}
			var i = this.children.length;
			while (i--) {
				this.children[i].deactivate();
			}
			if (this.parent && this.parent.activeSubview === this) {
				this.parent.activeSubview = null;
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
			// Ask parent to be active
			if (this.parent) {
				this.parent.activeSubview = this;
				this.parent.activate();
			}
			// steal focus away from parent
			root.Keyboard.activateView(this);
			// add class
			if (this.activeViewClass && this.dom) {
				this.dom.className += this.activeViewClass;
			}
			// then pass to children
			if (!this.activeSubview) {
				// If we don't have a specific subview set active, then use first
				if (this.children.length > 0) {
					this.children[0].activate();
				}
			} else {
				this.activeSubview.activate();
				return;
			}
		}
		
		// if an element isn't provided, use the default
		if (typeof el !== 'object' || el === null || !('className' in el)) {
			if (this.activeSubview) {
				this.activeSubview.activate(el);
			}
			// Activate the last-activated if returning to this view
			else if (this.lastActiveElement) {
				el = this.lastActiveElement;
			}
			// Last attempt to check if anything was set
			else if (this.activeElement) {
				el = this.activeElement;
			}
			else {
				// nothing to activate explicitly, so exit
				if (this.children.length > 0) {
					this.children[0].activate();
				}
				return;
			}
		}
		
		// if we have an element, deactivate it
		if (this.activeElement !== null) {
			if (this.activeElement !== el) {
				// see if theres a registered handle
				//var id = this.activeElement.id
				//if (this.activeElement.id this.actionMap[this.activeElement.id]
				
				this.lastActiveElement = this.activeElement;
				this.activeElement.className = this.activeElement.className.replace(this.activeClassRegex, "");
			}
		}
		
		if (!el) {
			return;
		}
		
		// add a space if need be
		if (el.className.indexOf(this.activeClass) === -1) {
			el.className += " "+this.activeClass;
		}
	
		// set the new
		this.activeElement = el;
		
		// run handlers, if set
		var id = el.id, map;
		if (id in this.actionMap) {
			map = this.actionMap[id];
			// activation handlers
			if (typeof map['_activate'] === 'function') {
				map['_activate'].call(this);
			}
			if (typeof map['_scroll'] === 'function') {
				map['_scroll'].call(this);
			}
			if (typeof map['_paginate'] === 'function') {
				map['_paginate'].call(this);
			}
		}
	},
	
	/**
	 * Sets the class to add/remove when activate()/deactivate() is called.
	 * 
	 * @param string name
	 */
	setActiveClass : function(name) {
		this.activeClass = ""+name;
		this.activeClassRegex = new RegExp("\\s*"+this.activeClass+"\\s*", "gi");
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
		// Quick exit if map is function
		if (typeof this.actionMap === 'function') {
			this.actionMap.call(this, evt);
			return;
		}
		
		var map, code, cur = null;
		
		if (this.activeElement !== null) {
			map = this.actionMap[this.activeElement.id];
			code = evt.keyCode.toString();
		} else {
			map = null;
			code = null;
		}
		
		// Workaround for onclick
		if (evt.type === 'click') {
			map = this.actionMap[ evt.target.id ];
			this.activeElement = evt.target;
			code = '' + root.Keyboard.KEY_ENTER;
		}
		
		// Have an active map to work with?
		if (map) {
			// Treat as array of key options
			if (typeof map === 'object') {
				if (code in map) {
					// Operate on keystroke first
					cur = map[code];
				}
				// check if global key handler exists
				else if(map[ code ]) {
					cur = map[ code ];
				}
			}
			// Treat as simple callback
			else if (typeof map === 'function') {
				cur = map;
			}
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
			if ('id' in cur) {
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
					this.activeSubview = null;
				}
				v.activateView(cur);
				//cur.activate();
			}
			else {
				// what kind of object is this?
			}
		}
		// Can't process, Send event down-stream
		else {
			if (this.activeSubview) {
				this.activeSubview.handleKeyEvent(evt);
			}
			else if (this.children.length) {
				for(var k=0; k<this.children.length; k++) {
					this.children[k].handleKeyEvent(evt);
				}
			}
		}
	}
	
};

})(typeof root !== 'undefined' ? root : window);