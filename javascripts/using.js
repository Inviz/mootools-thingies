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

var DependencyManager = new Class({
  Implements: [Chain],
  
  initialize: function(doc) {    
    var constructor = this.using.bind(this)
    
    this.manager = this
    this.document = $pick(doc, document)
    if (!DependencyManager.aliases) DependencyManager.aliases = {}
    if (!DependencyManager.dependencies) DependencyManager.dependencies = {}
    
    this.loaded = []
    
    return $extend(constructor, this)
  },
  
  using: function() {
    var args = $A(arguments).flatten();
    var callback = args.getLast().run && args.splice(-1)[0]
    var start = !this.$chain.length
    this.setup(args, callback)
    
    if (start) this.callChain()
    return this
  },
  
  setup: function(args, callback) {
    var files = args.map(this.expand.bind(this)).flatten().filter(this.notLoaded.bind(this))
    files.each(function(file) {
      this.chain(this.load.pass(file, this))
    }, this)
      
    if (callback) this.chain(function() {
      this.callChain()
      callback();
    }.bind(this))
    
    return this
  },
  
  notLoaded: function(arg) {
    return !this.loaded.contains(arg)
  },
  
  register: function() {
    var deps  = $A(arguments);
    var alias = deps.shift()
    var file  = deps.shift()
    
    DependencyManager.aliases[alias] = file
    DependencyManager.dependencies[file] = deps
    
    return this
  },
  
  expand: function(file) {
    if (DependencyManager.aliases[file]) file = DependencyManager.aliases[file] 
    if (file.match(/^[a-z0-9]$/i)) {
      console.error(file, 'looks like alias, but it is not registered')
    }
    return (DependencyManager.dependencies[file] || []).map(this.expand.bind(this)).concat(file)
  },
  
  load: function(file) {
    this.loaded.push(file)
    return Asset.javascript(file + "?" + Math.random(), {
      onload: function() {
        console.info('Now using', file)
        this.callChain()
      }.bind(this),
      document: this.document
    }) 
  }
  
});
