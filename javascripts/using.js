//Dep manager. Uses chain & asset.
//usage:
 
//register("fx-progressbar", "/javascripts/vendor/upload/fx-progressbar.js")
//register("upload-swiff", "/javascripts/vendor/upload/upload-swiff.js", "fx-//progressbar")
//register("upload-fancy", "/javascripts/vendor/upload/upload-fancy.js", "upload-swiff")
//register("upload", "/javascripts/vendor/upload/upload-ext.js", "upload-fancy")
 
//using('upload', function() { console.log(FancyUpload2, 'is usable, lol') }
//will load all 4 files in order and then fire a callback. Neato. Also you can even use .chain() on the result of execution.
 
//Note that using() takes both aliases and files name as the first argument, so you could put there unregistered files
//using('/mootools-ext.js', function(){})
 
//Doesnt require any preparation, works on use.

DependencyManager = new Class({
  Implements: [Chain],
  
  initialize: function(doc) {    
    var constructor = this.using.bind(this)
    
    this.manager = this
    this.document = $pick(doc, document)
    if (!this.constructor.aliases) this.constructor.aliases = {}
    if (!this.constructor.dependencies) this.constructor.dependencies = {}
    this.loaded = []

		if (Browser.Engine.trident) constructor.constructor = DependencyManager
    
    return $extend(constructor, this)
  },
  
  using: function() {
    var args = $A(arguments).flatten();
    var callback = args.getLast().run && args.splice(-1, 1)[0]

    this.setup(args, callback)

    return this
  },
  
  setup: function(args, callback) {
		var thread = new Chain
		
    var files = args.map(this.expand.bind(this)).flatten().filter(this.notLoaded.bind(this))

    files.each(function(file) {
      thread.chain(this.load.pass([file, thread], this))
    }, this)
		
    if (callback) thread.chain(function() {
			callback()
		})
		
		thread.callChain()

    return this
  },
  
  notLoaded: function(arg) {
    return !this.loaded.contains(arg)
  },
  
  register: function() {
    var deps  = $A(arguments);
    var alias = deps.shift()
    var file  = deps.shift()
   
    this.constructor.aliases[alias] = file
    this.constructor.dependencies[file] = deps	
    return this
  },
  
  expand: function(file) {
    if (this.constructor.aliases[file]) file = this.constructor.aliases[file] 
    if (!file || file.match(/^[a-z0-9]*$/i)) file = null
    return (this.constructor.dependencies[file] || []).map(this.expand.bind(this)).concat(file).filter($chk)
  },
  
  load: function(file, thread) {
    return Asset.javascript(file + (location.search.indexOf('NOCACHE') > -1 ? ("?" + Math.random()) : ""), {
      onload: function() {
        if (window.console && window.console.info) console.info('Now using', file)
			  this.loaded.push(file)
        thread.callChain()
      }.bind(this),
      document: this.document
    }) 
  }
  
});

(function() {
  
  var setup = function() {
    if (!this.manager) this.manager = new DependencyManager(this.document)
  }

  Window.implement({
    using: function() {
      setup.call(this)
      this.manager.using.apply(this.manager, $A(arguments))
    },
  
    register: function() {
      setup.call(this)
      this.manager.register.apply(this.manager, $A(arguments))
    }
  });
   
})();