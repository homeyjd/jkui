(function(root) {

/**
 * Provides options for loading and saving global things
 */
var a = root.AssetLoader = {},
	doc = document,
	body = doc.body;

// Global options
a.MASK	= null;
a.HEAD	= doc.head;
a.BODY	= doc.createElement('div');

if (typeof body === 'undefined') {
	body = doc.getElementsByTagName('body')[0];
}
if (typeof a.HEAD === 'undefined') {
	a.HEAD = doc.getElementsByTagName('head')[0];
}

a.loadCSS = function(url) {
	var dom = doc.createElement('link');
		dom.type = 'text/css';
		dom.rel = 'stylesheet';
		dom.href = url;
		dom.media = 'screen';
	a.HEAD.appendChild(dom);
};

a.loadHeadJS = function(url) {
	var dom = doc.createElement('script');
		dom.type = 'text/javascript';
		dom.src = url;
	a.HEAD.appendChild(dom);
};

a.loadBodyJS = function(url) {
	var dom = doc.createElement('script');
		dom.type = 'text/javascript';
		dom.src = url;
	body.appendChild(dom);
};

a.hide = function() {
	if (a.MASK !== null) {
		a.MASK.style.display = 'none';
		/*if (maskParent !== null) {
			try { maskParent.removeChild( a.MASK ); }
			catch (e) { Log.log(e); }
		}*/
	}
};

a.show = function(el) {
	if (a.MASK === null) { return; }
	if (typeof el === 'undefined') {
		el = a.BODY;
	}
	if (a.MASK.parentNode !== el) {
		el.appendChild(a.MASK);
	}
	a.MASK.style.display = 'block';
};

})(typeof root !== 'undefined' ? root : window);