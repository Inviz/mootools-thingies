// Jester ported to mootools
// Result or syntax may vary
// But the code's much better

//var Post = new Resource("Post")
//Post.find("all", function(p) {
//  p.title = "All your base are belong to us"
//  p.save
//})

//p = new Post({title: "Hello world"}).save
//p.errors #=> {something}

//Model.prototype.addEvents({ //global callbacks example
//  'start': function() {
//    $('ticker').set('html', 'Loading')
//  },
//  'complete': function() {
//    $('ticker').set('html', 'Loading')
//  }
//})
var Jester = new Hash;
Jester.Parsers = new Class({
  initialize: function(context) {
    this.context = context
    return this
  },
  
  integer: function(value) {
    var parsed = parseInt(value);
    return (isNaN(parsed)) ? value : parsed
  },
  
  datetime: function(value) {
    return new Date(Date.parse(value))
  },
  
  boolean: function(value) {
    return value == "true"
  },

  array: function(children) {
    return children.map(function(c) { return this.parse(c) }.bind(this))
  }, 
  
  object: function(value) {
    var obj = {}
    Hash.each(value, function(val, key) {
      obj[key] = this.parse(val, key)
    }, this)
    return obj
  }
})

Jester.Parsers.JSON = new Class({
  Extends: Jester.Parsers,
  
  parse: function(value, key) {
    if (!key && !value) return []
    var type = $type(value)
    if (type == "object") return this.object(value)
    if (key) {
      //if (key == "id" || key.substr(-3, 3) == "_id") return this.integer(value, key)
      if (key.substr(-3, 3) == "_at") return this.datetime(value, key)
    }
    if (type == "array") return this.array(value, key)
    return value
  }
})

Jester.Parsers.XML = new Class({
  Extends: Jester.Parser,
  
  parse: function(data) {
    obj = {}
    $H(data).each(function(key, value) {
      obj[key] = this[value["@type"]] ? this[value["@type"]](value["#text"]) : value["#text"]
    }, this)
    return obj
  }
})

Jester.Resource = new Class({
  Implements: [new Options, new Events, new Chain],

  options: {
    format: "json",
    urls: {
      list: "/:plural",
      show: "/:plural/:id",
      destroy: "/:plural/:id"
    },
    requestOptions: {
      secure: false
    },
    associations: {}, //{users: ["Person", options]}
    prefix: "", //If prefix is "true" it respects parent association's path
    custom: {}, //Name => method hash or an array of PUT methods
    parsers: Jester.Parsers,
    postprocess: function(data) {
      if ($type(data) != "array" || data.some(function(e) { return e.length != 2})) return data
      return {
        errors: data.map(function(i) { return i.join(" ")})
      }
    }
  },
  
  associations: {},

  initialize: function(name, options) {
    
    this.name = name
    $extend(this.options, {
      singular: name.tableize().singularize(),
      plural: name.tableize().pluralize(),
      name: name
    });
    
    this.setOptions(options)
    $extend(this.options, {
      singular_xml: this.options.singular.replace(/_/g, "-"),
      plural_xml: this.options.plural.replace(/_/g, "-")
    })
    
    this.klass = new Class({
      Extends:Jester.Model
    })
    $extend(this.klass, this)
    $extend(this.klass.prototype, {resource: this})
    $extend(this.klass.prototype, this.setAssociations(this.options.associations))
    $extend(this.klass.prototype, this.setCustomActions(this.options.custom))
    
    return this.klass
  },
  
  setAssociations: function(associations) {
    if (!associations) return
    
    var obj = {}
    Hash.each(associations, function(association, name) {      
      var singular = name.singularize().camelize()
      this['get' + singular] = function(data) {
        return new (this.resource.associations[name])(data, true)
      }
      var reflection = association[0]      
      var options = $extend({prefix: true}, association[1] || {})      
      options.prefix_given = options.prefix
      
      
      if (options.prefix == true) {
        options.prefix = this.locate.bind(this)        
      } else if (options.prefix == false) {
        options.prefix = this.options.prefix
      }
      var assoc = this.associations[name] = new Jester.Resource(reflection, options)
      var klsfd = name.camelize().pluralize()
      var singular = klsfd.singularize()
      obj['get' + singular] = function() {
        if (!this[name]) return;
        return this[name]
      }
			obj['get' + klsfd] = function() {
				return assoc.claim(this)
			}
			obj['get' + klsfd + 'Association'] = function() {
				return assoc.claim(this)
			}
      obj['set' + singular] = function(value, existant) {
        return this[name] = new assoc(value, existant, this)
      }
      obj['set' + klsfd] = function(value, existant) {
        return this[name] = value.map(function(el) {
          return new assoc(el, existant, this)
        }.bind(this))
      }
      obj['new' + singular] = function(data) {
        return new assoc(data, false, this)
      }
      obj['init' + singular] = function(data) {
        return new assoc(data, undefined, this)
      }
    }, this)
    return obj
  },
  
  setCustomActions: function(actions) {
    if (!actions) return
    var custom = {} 
    
    if (actions.instanceOf) { //We assume that array of custom methods is all of PUTs
      arr = [actions].flatten()
      actions = {}
      for (var i = 0, j = actions.length; i < j; i++) actions[arr[i]] = "put" 
    }
    Hash.each(actions, function(value, key) {
      custom[key] = Jester.Model.createCustomAction.call(this, key, value)
    }, this)
    return custom
  },

	getRequest: function() {
	  return new Request[this.options.format.toUpperCase()](this.options.requestOptions)
	},
  
  create: function(a, b) { //Ruby-style Model#create backward compat
    return new (this.klass || this)(a, b)
  },
  
  init: function(a) {
    return this.create(a, true)
  },
	
	claim: function(thing) {
		this.options.prefix = thing.prefix || (this.options.prefix && this.options.prefix.run ? this.options.prefix(thing) : this.options.prefix)
		return this
	},
  
  request: function(options, callback, model) {
	  if (options.route) options.url = this.getFormattedURL(options.route, options);
  	if (options.data && options.data.run) options.data = options.data.call(model)
	  
	  var req = this.getRequest();
	  ['success', 'failure', 'start', 'complete'].each(function(e) {
	    var cc = 'on' + e.capitalize()
	    req.addEvent(e, function(data) {
	      if (this[cc]) data = this[cc](data)
        if (e == "success") {
        	var result = this.handle(data)
          if (callback) callback.concat ? this.fireEvent(callback, data) : (data.length ? callback.apply(window, result) : callback(result))
        }
        if (options[cc]) options[cc](data)
        if (e == "success") this.callChain(result)
	    }.bind(this));
	    return req;
	  }, this)
	  req.send(options)
	  
	  return req;
  },
  
  handle: function(data) {
    data = this.options.postprocess(this.getParser().parse(data))
    return ($type(data) == "array") ? data.map(this.init.bind(this)) : this.init(data);
  },
  
  find: function(id, params, callback) {
    if (!callback && $type(params) != "object") {
      callback = params;
      params = null;
    }
    switch (id) {
      case "first": return this.find("all", callback)
      case "all": return this.request({method: "get", route: "list", data: params}, callback);
      default: return this.request({method: "get", route: "show", data: params, id: id}, callback);
    }
  },
  
  getParser: function() {
    if (!this.parser) this.parser = new (Jester.Parsers[this.options.format.toUpperCase()])(this)
    return this.parser  
  },
  
  getURL: function(route, thing) {
    var prefix = thing.prefix || (this.options.prefix && this.options.prefix.run ? this.options.prefix(thing) : this.options.prefix)
    return Jester.Resource.interpolate((prefix + (this.options.urls[route] || route)), thing, this.options)
  },
  
  locate: function(thing) {
		return this.getURL("show", thing)
  },
   
  getFormattedURL: function(route, thing) {
    return this.format(this.getURL(route, thing))
  },
  
  format: function(string) {
    return string.replace(/(?=\?)|\/?$/, '.' + this.options.format)
  }
});

(function() {
  
  var fill = function (what, thing, opts) {
    switch(what) {
      case "format":
        return "." + opts.format
      case "singular": 
      case "plural": 
        return opts[what]
      default:
        if (!thing) return (opts) ? opts[what] : null
        if (thing.resource) return thing.get(what.replace(/::/g, '.')) 
        return (typeof(thing[what]) == "function" ? thing[what]() : thing[what])
    }
  }
  
  var interpolation = function(thing, opts) {
    return function(m, what) {
      return fill(what, thing, opts)
    }
  }

  Jester.Resource.interpolate = function(str, thing, opts) {
    return str.replace(/:((?:[a-zA-Z0-9]|::)+)/g, interpolation(thing, opts))
  }
  
})()

Jester.Model = new Class({
  Extends: Hash,
  
  Implements: [new Options, new Events],
  
  initialize: function(attributes, existent_record, claiming) {
    this._claiming = claiming
    this._defaults = attributes
    
    this.set(attributes)
    this._new_record = existent_record ? false : !this.get('id')
		return this;
  },
  
  set: function(key, value) {
    if (arguments.length == 2) {
      this.setAttribute(key, value)
    } else {
      switch ($type(key)) {
        case "string": case "number":
          return this.set("id", key)
 					break
        case "element":
           //try to get attribute resource_id
           //else assume that id is formatted like resource_123.
					var id = key.get(this.getPrefix() + "_id")
					if (!id) if (id = key.get('id')) id = id.match(new RegExp('^' + this.getPrefix() + '_' + '(.*)$'))[1]
          if (id) this.set("id", id) 
 					break
				default:
					var complex = []
		      for (var k in key) {
		        if (["array", "object"].contains($type(key[k]))) {
		          complex.push(k)
		        } else {  
		          this.setAttribute(k, key[k])
		        }
		      }
      }
      
      
      if (this._claiming) {
        this.claim(this._claiming)
        delete this._claiming
      }
      
      if (complex && complex.length) complex.each(function(k) {
        this.setAttribute(k, key[k])
      }, this)
    }
    
    return this
  },
  
  get: function(name) {
    var bits = name.split(".")
    var obj = this
    bits.each(function(bit) {
      if (!$defined(obj) || !obj.getAttribute) return obj = null
      obj = obj.getAttribute(bit)
    })
    return obj
  },
  
  setAttribute: function(name, value) {
    if (this['set' + name.camelize()]) value = this['set' + name.camelize()](value)
    this[name] = value
  },  
  
  getAttribute: function(name) {
    if (this['get' + name.camelize()]) return this['get' + name.camelize()]()
    return this[name]
  },
  
  getAssociated: function(name) {
    return this.resource.associations[name]
  },
  
  request: function(options, callback) {
		return this.resource.request($extend(this.getClean(), options), callback, this)
  },
  
  toString: function() {
    return [this.resource.name].join("#")
  },
  
  getClean: function(){
    //Here we overcome JS's inability to have crossbrowser getters & setters
    //I wouldnt use these pseudoprivate _underscore properties otherwise
		var clean = {};
		for (var key in this){
			if (
			  key != "prototype" && 
			  key != "resource" &&
			  key.match(/^[^_$A-Z]/) && //doesnt start with _, $ or capital letter
			  typeof(this[key]) != "function"
			) clean[key] = this[key];
		}
		return clean;
	},
	
	getAttributes: function() {
	  return this.getClean();
	},
	
	isNew: function() {
	  return this._new_record
	},
	
	isDirty: function() {
	  return this._defaults == this.getClean();
	},
	
	onSuccess: function(data) {
		return new (this.resource.getParser(data))
	},
	
	onFailure: function() {
	  console.log("Achtung")
	},
	
	getPrefix: function() {
	  return this.resource.options.singular
	},
	
	getPrefixedClean: function() {
	  var obj = {}
	  var clean = this.getClean()
	  delete clean.prefix
	  obj[this.getPrefix()] = clean
	  
	  return obj
	},
	
	getURL: function(route) {
	  return this.resource.getURL(route || "show", this)
	},
	
	claim: function(what) {
	  this.prefix = (this.resource.options.prefix_given) && this.resource.options.prefix.run ? this.resource.options.prefix(what) : what.prefix
	  return this
	}
});

Jester.Model.Actions = new Hash({
  save: function() {
    if (!this._new_record) return Jester.Model.Actions.update.call(this)
	  return {method: "post", route: "list", data: this.getPrefixedClean, onComplete: this.set.bind(this)}
	},
	
	destroy: function() {
	  return {method: "delete", route: "destroy"}
	},
	
	update: function() {
	  return {method: "put", data: this.getPrefixedClean, route: "show"}
	},
	
	reload: function() {
	  if (!this.id) return this;
  	return {method: "get", route: "show"}
	}
});

Jester.Collection = new Class({
  initialize: function(models) {
    return $extend(models, this)
  }
})

Jester.Model.extend({
  createAction: function(name, options) {
    if (!options) options = {}
    if (!options.action) options.action = Jester.Model.Actions[name]
    
    return function() {
      var args = $A(arguments);
      callback = ($type(args.getLast()) == "function") ? args.pop() : $empty
      $extend(options, options.action.apply(this, args))
      this.fireEvent('before' + name.capitalize())
    
      var req = this.request(options, callback)        
      return req.chain(function(data) {
        this.fireEvent('after' + name.capitalize(), data);
        return req.callChain(data)
      }.bind(this))
      
      return this
    }
  },
  
  createCustomAction: function(name, method, obj) {
    if (!this.options.urls[name]) this.options.urls[name] = "/:plural/:id/" + name
    return Jester.Model.createAction(name, {
      action: function (data) {
        return {
          onComplete: method == "put" ? this.set.bind(this) : $lambda,
          data: data
        }
      },
      route: name, 
      method: method
    })
  }
})

Jester.Collection.extend({
  createAction: function(name) {
    return function() {
      var args = $A(arguments);
      callback = ($type(args.getLast()) == "function") ? args.pop() : $empty;
      this.each(function(model) {
        model[a](args)
      })
    }
  }
})

Jester.Model.Actions.each(function(k, a) {
  Jester.Model.prototype[a] = Jester.Model.createAction(a)
  Jester.Collection.prototype[a] = Jester.Collection.createAction(a)
})

window.Resource = function(name, options) {
  window[name] = new Jester.Resource(name, options)
  return window[name]
}
