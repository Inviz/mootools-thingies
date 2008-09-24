// Jester ported to mootools
// Result or syntax may vary

//The syntax is more JavaScript like.
//And the code is better too.

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

Jester.Parsers = new Hash;
Jester.Parsers.JSON = new Class({
  initialize: function(data) {
    obj = {}
    data.each(function(key, value) {
      if (key == "id") value = this.numeric(value)
      if (key.substr(-3, 3) == "_at") value = this.datetime(value)
      
      obj[key] = value
    })
    return obj
  },
  
  numeric: function(value) {
    var parsed = parseInt(value);
    return (isNaN(parsed)) ? value : parsed
  },
  
  datetime: function(value) {
    var date = Date.parse(value);
    return (date && !isNaN(date)) ? date : value
  },
})

Jester.Resource = new Class({
  Implements: [new Options, new Events],

  options: {
    format: "json",
    defaultParams: {},
    remote: false,
    urls: {
      list: "/:plural/:format",
      show: "/:plural/:id:format",
      destroy: "/:plural/:id:format"
    },
    prefix: "",
    parsers: Jester.Parsers
  },

  initialize: function(name, options) {
    this.name = name
    $extend(this.options, {
      singular: name.toLowerCase(),
      plural: name.toLowerCase().pluralize,
      name: name
    });
    this.setOptions(options)
    this.options.plural =  this.options.singular//.pluralize(options.plural),
    $extend(this.options, {
      singular_xml: this.options.singular.replace(/_/g, "-"),
      plural_xml: this.options.plural.replace(/_/g, "-"),
    })
    
    return new Class({
      Extends:Jester.Model,
      resource: this
    })
  },
  
  getRequest: function() {  
    if (!this.req) this.req = Request[this.options.format.toUpperCase()]
    return this.req;
  },
  
  create: function() { //Ruby-style Model#create backward compat
    return new this(arguments)
  },
  
  find : function(id, params, callback) {
    // allow a params hash to be omitted and a callback function given directly
    if (!callback && typeof(params) == "function") {
      callback = params;
      params = null;
    }
    
    switch(id) {
      case "all":
        return this.request();
      case "first":
        return this.request().getFirst();
      default: 
        if (isNaN(parseInt(id))) return null;
        if (!params) params = {};
        params.id = id;
    }
  },
  
  find_one: function() {
    this.constru
  },
  
  getParser: function() {
    if (!this.parser) this.parser = Parsers[this.options.format.toUpperCase()]  
    return this.parser  
  },
  
  getURL: function(route) {
    return this.options.prefix + this.options.urls[route]
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
      this[key] = value
    } else {
      for (var k in key) this[k] = key[k];
    }
  },
  
  toString: function() {
    return [this.resource.name].join("#")
  },
  
  getClean: function(){
    //Here we overcome JS's inability to have crossbrowser getters & setters
    //I wouldnt use these pseudoprivate _underscore properties otherwise
		var clean = {};
		for (var key in this){
			if (key != "prototype" && key.substr(0, 1) != "_" && !Hash.prototype[key] && !this.constructor.prototype[key]) clean[key] = this[key];
		}
		return clean;
	},
	
	getAttributes: function() {
	  return getClean();
	},
	
	getRequest: function() {
	  return new (this.resource.getRequest())
	},
	
	isNew: function() {
	  return this._new_record
	},
	
	isDirty: function() {
	  return this._defaults == this.getClean();
	},
	
	request: function(options, event) {
	  if (options.route) options.url = this.getURL(options.route);
	  var req = this.getRequest();
	  ['success', 'failure', 'start', 'complete'].each(function(e) {
	    var cc = 'on' + e.capitalize()
	    req.addEvent(e, function(data) {
	      if (this[cc]) data = this[cc](data)
        if (options[cc]) options[cc](data)
        if (e == "success") callback(data);
        if (event) this.fireEvent(event, data)
	    }.bind(this));
	    return req;
	  }, this)
	  req.send(options)
	},
	
	interpolate: function(m, what) {
	  switch(what) {
	    case "format":
	      return "." + this.resource.options.format
	    case "singular": case "plural": 
	      return this.resource.options[what]
	    default: 
	      return typeof(this[what]) == "function" ? this[what]() : this[what];
	  }
	},
	
	onSuccess: function(data) {
	  return new (this.resource.getParser(data))
	},
	
	onFailure: function() {
	  console.log("Achtung")
	},

	getURL: function(scheme) {
	  return this.resource.getURL(scheme).replace(/:([a-zA-Z0-9_-]+)/g, this.interpolate.bind(this))
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
      return this.request(options, 'after' + a.capitalize())
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


new Resource("Post")
var p = new Post({title: "Whatever", body: "Roflcopter", id: 25})

//p.save();






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

/*

This is a Date parsing library by Nicholas Barthelemy, packed to keep jester.js light.
Homepage: https://svn.nbarthelemy.com/date-js/
Compressed using http://dean.edwards.name/packer/.

*/

eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('N.q.F||(N.q.F=t(a){o u.1d().F(a)});O.q.F||(O.q.F=t(a){o\'0\'.1H(a-u.K)+u});O.q.1H||(O.q.1H=t(a){v s=\'\',i=0;2k(i++<a){s+=u}o s});N.q.1j||(N.q.1j=t(){o u.1d().1j()});O.q.1j||(O.q.1j=t(){v n=u,l=n.K,i=-1;2k(i++<l){u.20(i,i+1)==0?n=n.20(1,n.K):i=l}o n});k.1m="2H 2F 2z 2y 2x 2u 2r 3q 3n 3k 3i 3d".1x(" ");k.1o="38 35 2Y 2U 2Q 2O 2M".1x(" ");k.2K="31 28 31 30 31 30 31 31 30 31 30 31".1x(" ");k.1A={2G:"%Y-%m-%d %H:%M:%S",2w:"%Y-%m-%2v%H:%M:%S%T",2s:"%a, %d %b %Y %H:%M:%S %Z",3p:"%d %b %H:%M",3o:"%B %d, %Y %H:%M"};k.3l=-1;k.3j=-2;(t(){v d=k;d["3h"]=1;d["2i"]=1t;d["2h"]=d["2i"]*19;d["2e"]=d["2h"]*19;d["P"]=d["2e"]*24;d["37"]=d["P"]*7;d["34"]=d["P"]*31;d["1q"]=d["P"]*2X;d["2W"]=d["1q"]*10;d["2R"]=d["1q"]*23;d["2P"]=d["1q"]*1t})();k.q.1D||(k.q.1D=t(){o D k(u.1k())});k.q.26||(k.q.26=t(a,b){u.1F(u.1k()+((a||k.P)*(b||1)));o u});k.q.2a||(k.q.2a=t(a,b){u.1F(u.1k()-((a||k.P)*(b||1)));o u});k.q.1Z||(k.q.1Z=t(){u.1Y(0);u.1X(0);u.1U(0);u.1T(0);o u});k.q.1I||(k.q.1I=t(a,b){C(1i a==\'1p\')a=k.1J(a);o 18.2l((u.1k()-a.1k())/(b|k.P))});k.q.1N||(k.q.1N=k.q.1I);k.q.2n||(k.q.2n=t(){d=O(u);o d.1f(-(18.1y(d.K,2)))>3&&d.1f(-(18.1y(d.K,2)))<21?"V":["V","17","16","1a","V"][18.1y(N(d)%10,4)]});k.q.1w||(k.q.1w=t(){v f=(D k(u.1h(),0,1)).1e();o 18.2t((u.1n()+(f>3?f-4:f+3))/7)});k.q.1M=t(){o u.1d().1v(/^.*? ([A-Z]{3}) [0-9]{4}.*$/,"$1").1v(/^.*?\\(([A-Z])[a-z]+ ([A-Z])[a-z]+ ([A-Z])[a-z]+\\)$/,"$1$2$3")};k.q.2p=t(){o(u.1u()>0?"-":"+")+O(18.2l(u.1u()/19)).F(2)+O(u.1u()%19,2,"0").F(2)};k.q.1n||(k.q.1n=t(){o((k.2o(u.1h(),u.1c(),u.1b()+1,0,0,0)-k.2o(u.1h(),0,1,0,0,0))/k.P)});k.q.2m||(k.q.2m=t(){v a=u.1D();a.15(a.1c()+1);a.L(0);o a.1b()});k.2j||(k.2j=t(a,b){a=(a+12)%12;C(k.1K(b)&&a==1)o 29;o k.3g.3f[a]});k.1K||(k.1K=t(a){o(((a%4)==0)&&((a%23)!=0)||((a%3e)==0))});k.q.1B||(k.q.1B=t(c){C(!u.3c())o\'&3b;\';v d=u;C(k.1A[c.2g()])c=k.1A[c.2g()];o c.1v(/\\%([3a])/g,t(a,b){39(b){E\'a\':o k.1l(d.1e()).1f(0,3);E\'A\':o k.1l(d.1e());E\'b\':o k.13(d.1c()).1f(0,3);E\'B\':o k.13(d.1c());E\'c\':o d.1d();E\'d\':o d.1b().F(2);E\'H\':o d.1G().F(2);E\'I\':o((h=d.1G()%12)?h:12).F(2);E\'j\':o d.1n().F(3);E\'m\':o(d.1c()+1).F(2);E\'M\':o d.36().F(2);E\'p\':o d.1G()<12?\'33\':\'32\';E\'S\':o d.2Z().F(2);E\'U\':o d.1w().F(2);E\'W\':R Q("%W 2V 2T 2S 25");E\'w\':o d.1e();E\'x\':o d.1r("%m/%d/%Y");E\'X\':o d.1r("%I:%M%p");E\'y\':o d.1h().1d().1f(2);E\'Y\':o d.1h();E\'T\':o d.2p();E\'Z\':o d.1M()}})});k.q.1r||(k.q.1r=k.q.1B);k.22=k.1J;k.1J=t(a){C(1i a!=\'1p\')o a;C(a.K==0||(/^\\s+$/).1E(a))o;2N(v i=0;i<k.1g.K;i++){v r=k.1g[i].J.2L(a);C(r)o k.1g[i].G(r)}o D k(k.22(a))};k.13||(k.13=t(c){v d=-1;C(1i c==\'2J\'){o k.1m[c.1c()]}2I C(1i c==\'27\'){d=c-1;C(d<0||d>11)R D Q("1s 1C 2b 2q 1W 1V 2d 1 2c 12:"+d);o k.1m[d]}v m=k.1m.1S(t(a,b){C(D 1O("^"+c,"i").1E(a)){d=b;o 1R}o 2f});C(m.K==0)R D Q("1s 1C 1p");C(m.K>1)R D Q("1Q 1C");o k.1m[d]});k.1l||(k.1l=t(c){v d=-1;C(1i c==\'27\'){d=c-1;C(d<0||d>6)R D Q("1s 1z 2b 2q 1W 1V 2d 1 2c 7");o k.1o[d]}v m=k.1o.1S(t(a,b){C(D 1O("^"+c,"i").1E(a)){d=b;o 1R}o 2f});C(m.K==0)R D Q("1s 1z 1p");C(m.K>1)R D Q("1Q 1z");o k.1o[d]});k.1g||(k.1g=[{J:/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})/,G:t(a){v d=D k();d.1L(a[3]);d.L(14(a[2],10));d.15(14(a[1],10)-1);o d}},{J:/(\\d{4})(?:-?(\\d{2})(?:-?(\\d{2})(?:[T ](\\d{2})(?::?(\\d{2})(?::?(\\d{2})(?:\\.(\\d+))?)?)?(?:Z|(?:([-+])(\\d{2})(?::?(\\d{2}))?)?)?)?)?)?/,G:t(a){v b=0;v d=D k(a[1],0,1);C(a[2])d.15(a[2]-1);C(a[3])d.L(a[3]);C(a[4])d.1Y(a[4]);C(a[5])d.1X(a[5]);C(a[6])d.1U(a[6]);C(a[7])d.1T(N("0."+a[7])*1t);C(a[9]){b=(N(a[9])*19)+N(a[10]);b*=((a[8]==\'-\')?1:-1)}b-=d.1u();1P=(N(d)+(b*19*1t));d.1F(N(1P));o d}},{J:/^2E/i,G:t(){o D k()}},{J:/^2D/i,G:t(){v d=D k();d.L(d.1b()+1);o d}},{J:/^2C/i,G:t(){v d=D k();d.L(d.1b()-1);o d}},{J:/^(\\d{1,2})(17|16|1a|V)?$/i,G:t(a){v d=D k();d.L(14(a[1],10));o d}},{J:/^(\\d{1,2})(?:17|16|1a|V)? (\\w+)$/i,G:t(a){v d=D k();d.L(14(a[1],10));d.15(k.13(a[2]));o d}},{J:/^(\\d{1,2})(?:17|16|1a|V)? (\\w+),? (\\d{4})$/i,G:t(a){v d=D k();d.L(14(a[1],10));d.15(k.13(a[2]));d.1L(a[3]);o d}},{J:/^(\\w+) (\\d{1,2})(?:17|16|1a|V)?$/i,G:t(a){v d=D k();d.L(14(a[2],10));d.15(k.13(a[1]));o d}},{J:/^(\\w+) (\\d{1,2})(?:17|16|1a|V)?,? (\\d{4})$/i,G:t(a){v d=D k();d.L(14(a[2],10));d.15(k.13(a[1]));d.1L(a[3]);o d}},{J:/^3m (\\w+)$/i,G:t(a){v d=D k();v b=d.1e();v c=k.1l(a[1]);v e=c-b;C(c<=b){e+=7}d.L(d.1b()+e);o d}},{J:/^2B (\\w+)$/i,G:t(a){R D Q("2A 25 3r");}}]);',62,214,'||||||||||||||||||||Date||||return||prototype|||function|this|var|||||||if|new|case|zf|handler|||re|length|setDate||Number|String|DAY|Error|throw||||th||||||||parseMonth|parseInt|setMonth|nd|st|Math|60|rd|getDate|getMonth|toString|getDay|substr|__PARSE_PATTERNS|getFullYear|typeof|rz|getTime|parseDay|MONTH_NAMES|getDayOfYear|DAY_NAMES|string|YEAR|format|Invalid|1000|getTimezoneOffset|replace|getWeek|split|min|day|FORMATS|strftime|month|clone|test|setTime|getHours|str|diff|parse|isLeapYear|setYear|getTimezone|compare|RegExp|time|Ambiguous|true|findAll|setMilliseconds|setSeconds|be|must|setMinutes|setHours|clearTime|substring||__native_parse|100||yet|increment|number|||decrement|index|and|between|HOUR|false|toLowerCase|MINUTE|SECOND|daysInMonth|while|floor|lastDayOfMonth|getOrdinal|UTC|getGMTOffset|value|July|rfc822|round|June|dT|iso8601|May|April|March|Not|last|yes|tom|tod|February|db|January|else|object|DAYS_PER_MONTH|exec|Saturday|for|Friday|MILLENNIUM|Thursday|CENTURY|supported|not|Wednesday|is|DECADE|365|Tuesday|getSeconds|||PM|AM|MONTH|Monday|getMinutes|WEEK|Sunday|switch|aAbBcdHIjmMpSUWwxXyYTZ|nbsp|valueOf|December|400|DAYS_IN_MONTH|Convensions|MILLISECOND|November|ERA|October|EPOCH|next|September|long|short|August|implemented'.split('|'),0,{}))

