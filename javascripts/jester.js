// Jester ported to mootools
// Result or syntax may vary
// But the code's much better

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
    if (key == "id" || key.substr(-3, 3) == "_id") return this.integer(value, key)
    if (key.substr(-3, 3) == "_at") return this.datetime(value, key)
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
    defaultParams: {},
    remote: false,
    urls: {
      list: "/:plural",
      show: "/:plural/:id",
      destroy: "/:plural/:id"
    },
    associations: {},
    prefix: "",
    parsers: Jester.Parsers
  },
  
  associations: {},

  initialize: function(name, options) {
    this.name = name
    $extend(this.options, {
      singular: name.toLowerCase(),
      plural: name.toLowerCase().pluralize(),
      name: name
    });
    this.setOptions(options)
    $extend(this.options, {
      singular_xml: this.options.singular.replace(/_/g, "-"),
      plural_xml: this.options.plural.replace(/_/g, "-"),
    })
    
    return new Class({
      Extends:Jester.Model,
      Implements: (this.options.associations) ? this.setAssociations(this.options.associations) : {},
      resource: this
    }).extend(this)
  },
  
  setAssociations: function(associations) {
    var obj = {}
    Hash.each(associations, function(association, name) {
      obj['get' + name.capitalize()] = function() {
        if (!this[name]) return;
        return new Jester.Collection(this[name]);
      }
      this.associations[name] = association
    }, this)
    return obj
  },

	getRequest: function() {
	  return new Request[this.options.format.toUpperCase()]
	},
  
  create: function(a,b) { //Ruby-style Model#create backward compat
    return new this(a,b)
  },
  
  request: function(options, callback) {
	  if (options.route) options.url = this.getURL(options.route, options);
	  var req = this.getRequest();
	  ['success', 'failure', 'start', 'complete'].each(function(e) {
	    var cc = 'on' + e.capitalize()
	    req.addEvent(e, function(data) {
	      if (this[cc]) data = this[cc](data)
        if (options[cc]) options[cc](data)
        if (e == "success") {
          if (callback) callback.concat ? this.fireEvent(callback, data) : this.chain(callback);
          var result = this.create(this.getParser().parse(data), true);
          this.callChain(result)
        }
	    }.bind(this));
	    return req;
	  }, this)
	  req.send(options)
	  
	  return this;
  },
  
  find : function(id, params, callback) {
    if (!callback && $type(params) != "object") {
      callback = params;
      params = null;
    }
    switch (id) {
      case "first": return this.find("all").getFirst();
      case "all": return this.request({method: "get", route: "list", data: params}, callback);
      default: return this.request({method: "get", route: "show", data: params, id: id}, callback);
    }
  },
  
  getParser: function() {
    if (!this.parser) this.parser = new (Jester.Parsers[this.options.format.toUpperCase()])(this)
    return this.parser  
  },
  
  getURL: function(route, thing) {
    return (this.options.prefix + (this.options.urls[route] || route)).replace(/:([a-zA-Z0-9]+)/g, this.interpolation(thing))
  },
  
  interpolation: function(thing) {
    return (function(m, what) {
      return this.interpolate(what, thing)
    }).bind(this)
  },
  
  interpolate: function(what, thing) {
	  switch(what) {
	    case "format":
	      return "." + this.options.format
	    case "singular": 
	    case "plural": 
	      return this.options[what]
	    default: 
	      return !thing ? this.options[what] : (typeof(thing[what]) == "function" ? thing[what]() : thing[what])
	  }
	}
});


Jester.Model = new Class({
  Extends: Hash,
  
  Implements: [new Options, new Events],
  
  initialize: function(attributes, existant_record) {
    this.set(attributes || {})
    this._defaults = attributes
    this._new_record = !existant_record
		return this;
  },
  
  set: function(key, value) {
    if (arguments.length == 2) {
      this.setAttribute(key, value)
    } else {
      for (var k in key) this.setAttribute(k, key[k])
    }
  },
  
  setAttribute: function(name, value) {
    if ($type(value) == "array") {
      var assoc = this.resource.associations[name]
      if (assoc) {
        if ($type(assoc) == "array") {
          var reflection = assoc[0]
          var options = assoc[1] || {}
          if (options.prefix == true) options.prefix = this.resource.getURL("show", this)
          this.resource.associations[name] = new Jester.Resource(reflection, options)
        } 
        this[name] = value.map(function(model) {
          return new (this.resource.associations[name])(model, true)
        }.bind(this))
      }
    } else {
      this[name] = value
    }
  },
  
  request: function(options, callback) {
    this.resource.request($extend(this.getClean(), options), callback)
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
	}
});

Jester.Model.Actions = new Hash({
  save: function() {
	  return {method: "post", route: "show"}
	},
	
	destroy: function() {
	  return {method: "delete", route: "destroy"}
	},
	
	update: function() {
	  return {method: "put", data: this.getAttributes(), route: "show"}
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

Jester.Model.Actions.each(function(k, a) {
  Jester.Model.prototype[a] = function() {
    var args = $A(arguments);
    callback = ($type(args.getLast()) == "function") ? args.pop() : $empty;
    var options = Jester.Model.Actions[a].call(this, args);
    if ($type(options) == "object") {
      this.fireEvent('before' + a.capitalize())
      return this.request(options, function() {
        this.fireEvent('after' + a.capitalize());
      }.bind(this))
    }
    return this
  }
  
  Jester.Collection.prototype[a] = function() {
    var args = $A(arguments);
    callback = ($type(args.getLast()) == "function") ? args.pop() : $empty;
    this.each(function(model) {
      model[a](args)
    })
  }
})

window.Resource = function(name, options) {
  window[name] = new Jester.Resource(name, options)
  return window[name]
}

/*
  Inflector library, contributed graciously to Jester by Ryan Schuft.
  The library in full is a complete port of Rails' Inflector, though Jester only uses its pluralization.
  Its home page can be found at: http://code.google.com/p/inflection-js/
*/

if (!String.prototype.pluralize) String.prototype.pluralize = function(plural) {
  var str=this;
  if(plural)str=plural;
  else {
    var uncountable_words=['equipment','information','rice','money','species','series','fish','sheep','moose'];
    var uncountable=false;
    for(var x=0;!uncountable&&x<uncountable_words.length;x++)uncountable=(uncountable_words[x].toLowerCase()==str.toLowerCase());
    if(!uncountable) {
      var rules=[
        [new RegExp('(m)an$','gi'),'$1en'],
        [new RegExp('(pe)rson$','gi'),'$1ople'],
        [new RegExp('(child)$','gi'),'$1ren'],
        [new RegExp('(ax|test)is$','gi'),'$1es'],
        [new RegExp('(octop|vir)us$','gi'),'$1i'],
        [new RegExp('(alias|status)$','gi'),'$1es'],
        [new RegExp('(bu)s$','gi'),'$1ses'],
        [new RegExp('(buffal|tomat)o$','gi'),'$1oes'],
        [new RegExp('([ti])um$','gi'),'$1a'],
        [new RegExp('sis$','gi'),'ses'],
        [new RegExp('(?:([^f])fe|([lr])f)$','gi'),'$1$2ves'],
        [new RegExp('(hive)$','gi'),'$1s'],
        [new RegExp('([^aeiouy]|qu)y$','gi'),'$1ies'],
        [new RegExp('(x|ch|ss|sh)$','gi'),'$1es'],
        [new RegExp('(matr|vert|ind)ix|ex$','gi'),'$1ices'],
        [new RegExp('([m|l])ouse$','gi'),'$1ice'],
        [new RegExp('^(ox)$','gi'),'$1en'],
        [new RegExp('(quiz)$','gi'),'$1zes'],
        [new RegExp('s$','gi'),'s'],
        [new RegExp('$','gi'),'s']
      ];
      var matched=false;
      for(var x=0;!matched&&x<=rules.length;x++) {
        matched=str.match(rules[x][0]);
        if(matched)str=str.replace(rules[x][0],rules[x][1]);
      }
    }
  }
  return str;
};
