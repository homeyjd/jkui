/*jslint white: true */
(function(root) {
	
	/**
	 * Encapsulation class for listening for keyboard and mouse events.
	 */
	var k = root.Keyboard =
	{
		// Key map
		KEY_DOWN	: 40,	// VK_DOWN
		KEY_RIGHT	: 39,	// VK_RIGHT
		KEY_LEFT	: 37,	// VK_LEFT
		KEY_UP		: 38,	// VK_UP
		KEY_RETURN	: 8,	// VK_BACK_SPACE
		KEY_ENTER	: 13,	// VK_ENTER
		KEY_DISPLAY	: 469,
		// Colors
		KEY_GREEN	: 404,
		KEY_RED		: 403,
		KEY_BLUE	: 406,
		KEY_YELLOW	: 502,
		// Playback
		KEY_PLAY	: 415,
		KEY_REWIND	: 412,
		KEY_FF		: 465,
		KEY_STOP	: 413,
		KEY_PAUSE	: 19,
		KEY_NEXT	: 425,
		KEY_PREV	: 463,
		// Numbers
		KEY_ZERO	: 48,
		KEY_ONE		: 49,
		KEY_TWO		: 50,
		KEY_THREE	: 51,
		KEY_FOUR	: 52,
		KEY_FIVE	: 53,
		KEY_SIX		: 54,
		KEY_SEVEN	: 55,
		KEY_EIGHT	: 56,
		KEY_NINE	: 57,
		
		// Current active view
		activeView : null,
		preventDefault : true,
	
		/**
		 * Internal keyhandler.
		 *
		 * Will not handle an event if no activeView has been set.
		 *
		 * @param object event Native window or document event object
		 * @return boolean false if the event has been handled and should not bubble
		 */
		handleKeyEvent : function(evt) {
			if (k.activeView !== null) {
				if (!evt) evt = window.event;
				k.activeView.handleKeyEvent(evt);
				
				// stop event from bubbling
				if (k.preventDefault) {
					evt.preventDefault();
					if (evt.stopPropagation) evt.stopPropagation();
					if (evt.cancelBubble) evt.cancelBubble = true;
				}
				return false;
			}
			return true;
		},
	
		/**
		 * Sets the view passed here to be the lone receiver of keyboard events.
		 *
		 * This function will not accept anything but an object (any type) with
		 * a method <code>handleKeyPress</code>, which will be called with the 
		 * next event.
		 *
		 * Whether a new activeView has been set or not, this function returns
		 * the currently active object. Thereby, one might check if the operation 
		 * completed by checking:
		 * <code>
		 * var myView = { handleKeyPress: function(evt) {} };
		 * var success = myView === Keyboard.activateView(myView);
		 * </code>
		 *
		 * @param object v
		 * @return the currently active object
		 */
		activateView : function(v) {
			if (v && typeof v.handleKeyEvent === 'function') {
				k.activeView = v;
			}
			return k.activeView;
		},
		
		/**
		 * Empty function if you need one.
		 */
		nullListener : function(evt) {
			
		},
		
		/**
		 * Initializes the Manager to listen to the specified events.
		 * 
		 * @param array evts (optional) An array of strings, event types to listen for, will be ['keydown','click'] if ommitted
		 * @param DOMElement el (optional) A DOM element to listen on, will be the global <code>document</code> object if ommitted
		 */
		init : function(evts, el) {
			if (!evts) evts = ['keydown', 'click'];
			if (!el) el = document;
			var i = evts.length;
			// Check which listener type we need
			if (typeof el.addEventListener === 'function') {
				while (i-- > -1) {
					el.addEventListener(evts[i], k.handleKeyEvent, true);
				}
			}
			else if (typeof el.attachEvent === 'function') {
				while (i-- > -1) {
					el.attachEvent(evts[i], k.handleKeyEvent);
				}
			}
		}
	};

})(typeof root !== 'undefined' ? root : window);