//Requires using.js for asynchronous load

//Basically, traits is a way to keep your code clean
//Each trait is a class that is applied on given class 

//You can split your big widget code to smaller classes and load 
//them on-demand (html attributes or depending on content). 
//Load only what you need!

//Real world usage example: http://gist.github.com/86986

//Like multiple extend
Class.Mutators.Inherits = function(self, klasses){
	$splat(klasses).each(function(klass){
		Class.prototyping = klass.prototype;
		var subclass = new klass;
		delete subclass.parent;
		self = Class.inherit(self.prototype || self, subclass)
		delete Class.prototyping;
	});
	return self;
};

//Short example:
//register('tabs', 'tabs.js')
//register('tabs-sliding', 'tabs-sliding.js')
//register('tabs-animated', 'tabs-animated')
//register('tabs-labelled', 'tabs-labelled')

//Tabs.extend(Traits)
//Tabs.Behaviour = new Hash({
//	'tabs-sliding': '[sliding=true]', //match against element
//	'tabs-animated': '',							//rely soloely on class
//	'tabs-labelled': 'label'					//getElement selector
//})

//<div class="tabs animated" sliding="true">
//	<label>Lol</label>
//</div>

//window.addEvent('domready', function() {
//	$$('.tabs').each(function(el) {
//		using('tabs', function() {
//			Tabs.for(el, other, arguments) //will load all three traits and apply on Tabs class. 
//		})
//	})	
//})


Traits = {
	for: function(element, a,b,c,d,e) {
		var traits = new Hash
		this.Behaviour.each(function(selector, dependency) {
			var name = dependency.replace(/^.+?-/, '')
			if (element.hasClass(name) || (selector && (element.match(selector) || element.getElement(selector)))) traits.set(dependency, name)
		}, this)
		using(traits.getKeys(), function() {
			var kls = new Class({
				Extends: this,
				Inherits: traits.getValues().map(function(name) { return this.Traits[name.camelCase().capitalize()]}.bind(this))
			})
			console.log('Created', kls, 'with traits:', traits.getValues())
			element.store('form-class', kls)
			element.store('form', new kls(element, a,b,c,d))
		}.bind(this))
	},
	
	Behaviour: new Hash,
	Traits: new Hash
}