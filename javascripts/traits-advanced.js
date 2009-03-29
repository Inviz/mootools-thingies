//This is advanced traiting technique. There is a simplier one in a file called traits.js around.
//It's a way to keep your code clean and organized. Different methods are loaded ad hoc.

//What's the difference? It supports behaviour subclassing.

//Example:

//First, Tabs base class
//register('tabs', 'tabs/tabs.js')

//Second, Tabs.Sliding subclass. Like tabs but content gets slided
//register('tabs-sliding', 'tabs/sliding/sliding.js')
//register('tabs-animated', 'tabs/sliding/traits/tabs-animated.js')

//Third, Tabs.Vertical. Like vertical tabs
//register('tabs-sliding', 'tabs/vertical/vertical.js')
//register('tabs-labelled', 'tabs/vertical/traits/tabs-labelled.js')

//Common traits
//register('tabs-remote', 'tabs/traits/tabs-remote.js')
//register('tabs-historical', 'tabs/traits/tabs-historical.js')


//Tabs.extend(Types)
//Tabs.Behaviour = new Hash({
//	'tabs-sliding': '[type=sliding]', 
//	'tabs-vertical': '[type=vertical]',
//})

//Tabs.Sliding.Behaviour = new Hash({
//	'tabs-animated': '.animated',	
//	'tabs-remote': false
//})

//Tabs.Vertical.Behaviour = new Hash({
//	'tabs-remote': false
//	'tabs-historical': false
//	'tabs-labelled': 'label',
//})


//Simple tabs without subclasses and traits:
//<ul class="tabs"></ul>

//Simple sliding tabs without traits:
//<ul class="tabs" type="sliding"></ul>

//Sliding tabs with ajax
//<ul class="remote tabs" type="sliding"></ul>

//Sliding animated tabs with ajax:
//<ul class="animated remote tabs" type="sliding"></ul>


//Vertical tabs with ajax:
//<ul class="remote tabs" type="vertical"></ul>

//Labelled Vertical tabs with ajax:
//<ul class="remote tabs" type="vertical">
//	<li> <label>Whatever</label></li>
//</ul>


//Labelled Vertical tabs with ajax:
//<ul class="historical remote tabs" type="vertical">
//	<li> <label>Whatever</label></li>
//</ul>


//window.addEvent('domready', function() {
//	$$('.tabs').each(function(el) {
//		using('tabs', function() {
//			Tabs.for(el, other, arguments) //will load all three traits and apply on Tabs class. 
//		})
//	})	
//})

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

Behavioured = {
	behaviourise: function(element) {
		var result = new Hash
		this.Behaviour.each(function(selector, dependency) {
			var name = dependency.replace(/^.+?-/, '')
			if (element.hasClass(name) || (selector && (element.match(selector) || element.getElement(selector)))) result.set(dependency, name)
		}, this)
		return result
	},
	
	Behaviour: new Hash
}

Traits = $merge({
	for: function(element, a,b,c,d) {
		var traits = this.behaviourise(element)
		var chain = new Chain
		
		using(traits.getKeys(), function() {
			var klass = new Class({
				Extends: this,
				Inherits: traits.getValues().map(function(name) { return this.Traits[name.camelCase().capitalize()]}.bind(this))
			})
			var instance = new klass(element, a,b,c,d)
			console.log('Created', instance, 'of', klass, 'for', element, 'traits are', traits.getKeys())
			chain.callChain(instance)
		}.create({bind: this, delay: 10}))
		
		return chain
	},

	Traits: new Hash
}, Behavioured)

Types = $merge({
	for: function(element, a,b,c,d) {
		var candidates = this.behaviourise(element)
		var candidate = candidates.getKeys()[0]
		if (candidate) {
			using(candidate, function() {
				var name = candidates.get(candidate)
				var klass = this[name.camelCase().capitalize()]
				console.log('Chose', klass, ', type is', name)
				klass.for(element, a,b,c,d)
			}.bind(this))
		} else {
			new this(element, a,b,c,d)
		}
	}
}, Behavioured)
