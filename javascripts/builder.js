(function(){
	var modes = {
		"fully_uncached": {
      prefix: '/javascripts',
      path: '/javascripts/build.json',
			autoloading: true,
			verbosity: 3
		},
		
		"slightly_cached": {
      prefix: '/javascripts',
      path: '/javascripts/build.json',
			autoloading: true,
			cache: true,
			remember: true
		},
		
		"curious_cache": { //can be reset
			prefix: '/javascripts/compiled',
			path: '/javascripts/compiled/scripts.json',
			packer: true,
			loaded: true
		},
		
		"usual_cache": {
			prefix: '/javascripts/compiled',
			path: '/javascripts/compiled/scripts.json',
			packer: true,
			//cache: true,
			loaded: true,
			verbosity: 1
		},
		
		"cached_beyond_all_recognition": {
			prefix: '/javascripts/compiled',
			path: '/javascripts/compiled/scripts.json',
			packer: true,
			cache: true,
			remember: true,
			loaded: true
		}
	};
	
	Environment = {
	  "development": modes["fully_uncached"],
		"debug": modes["fully_uncached"],
	  "staging_for_developers": modes["usual_cache"],
	  "staging": modes["usual_cache"],
	  "dogfood": modes["cached_beyond_all_recognition"],
	  "production": modes["cached_beyond_all_recognition"]
	};
})();

if (location.search.indexOf("DEBUG") > -1) Environment.current = "debug";
else if (location.search.indexOf("STAGE") > -1) Environment.current = "staging";
else Environment.current = {"orwik.local": "development", "miixa.org": "staging", "orwik.org": "dogfood", "orwik.prestage": "staging_for_developers", "orwik.com": "production"}[location.host.match(/[a-z]+\.[a-z]+$/)[0]];

if (window.console) console.log('Loading', Environment.current.toUpperCase(), 'environment...')
Environment.now = Environment[Environment.current];



if (Environment.now.loaded) {  
	//sometimes it takes too much time
	
	var DOMReady = function(func){
		var already = false;

		ready = function () {
			if (!already) {
				func();
				already = true;
			}
		};
		try {//opera, firefox
			document.addEventListener("DOMContentLoaded", ready, false);
		} 
		catch (e) { //ie
			timer = setInterval(function(){
				if (/loaded|complete/.test(document.readyState)) {
					clearInterval(timer);
					ready();
				}
			}, 20);
		}


		window.onload = function(){
			ready();
		};
	};
	new DOMReady (function () {
		if (window.fireEvent) window.fireEvent('domready');
		if (!window.Browser) window.Browser = {};
		Browser.loaded = true;
	});
} else {
	if (!window.Browser) window.Browser = {};
	Browser.loaded = true;
}

(function () {
	var $empty = function(){};

	var extend = function(one, another) {
		for (var i in another) one[i] = another[i];
		return one;
	}

  var $flatten = function (ary) {
    var flat = [];
    for (var i = 0, j = ary.length; i < j; i++) {
      flat = flat.concat((ary[i] && (ary[i].push || ary[i].callee)) ? $flatten(ary[i]) : ary[i]);
    }
    return flat;
  };

  var $splat = function () {
    return $flatten(arguments);
  };

  var JSON = {
    parse: function (text) {
      return eval('(' + text + ')');
    }
  };

  var Request = function (url, onComplete) {
    this.transport = this.getTransport();
    this.onComplete = onComplete;
    this.request(url);
  };

  Request.prototype = {
    request: function (url) {
      this.transport.open("get", url, true);
      var self = this;
      this.transport.onreadystatechange = function () { self.onStateChange.apply(self, arguments); };
      this.transport.send(null);
    },

    getTransport: function () {
    	if (window.XMLHttpRequest) return new XMLHttpRequest();
      else if (window.ActiveXObject) return new ActiveXObject('MSXML2.XMLHTTP');
      else return false;
    },

    onStateChange: function () {
      if (this.transport.readyState == 4 && this.transport.status == 200) {
        var self = this;
        if (this.onComplete) setTimeout(function () {self.onComplete(self.transport);}, 10);
        this.transport.onreadystatechange = function () {};
      }
    }
  };


	(function() {
		
		var isInitialized = function() {
			return !!DM.initialized;
		}
		
		
		var log = function(type) {
			var args = arguments;
			if (type == "info" || type == "error" || type == "warn") {
				var sliced = [];
				for (var i = 1, j = arguments.length; i < j; i++) sliced.push(arguments[i]);
				args = sliced;
			}
			if (window.console && console[type]) console[type].apply(console, args);
		}
		
		var vlog = function(level) {
			return Environment.now.verbosity >= level ? log : $empty;
		}
		
		var bind = function(fn, subj) {
			return function() {
				return fn.apply(subj, arguments);
			}
		}
		
		var trim = function(string, symbol) {
			return string.replace(/^\/|\/$/g, '');
			
			if (!symbol) symbol = "/";
			var from = 0;
			var to = string.length;
			while (string[from] == symbol) from ++;
			while (string[to - 1] == symbol) to --;
			if (from == 0 && to == string.length) return string;
			
			return string.substr(from, to - from);	
		}

		DM = DependencyManager = function(doc) {
			this.document = doc || document;
			this.head = this.document.getElementsByTagName('head')[0];
						
			if (DM.instance) return DM.instance;
			DM.instance = this;
									
			DM.stack = [];

			return this;
		};
		
		DM.Repository = function(object, prefix) {
			this.files = {};
			this.folders = {};
			this.paths = {};
		
			if (object && object.indexOf) object = JSON.parse(object);
			
			this.prefix = prefix ? trim(prefix) : '';
			this.register(object);
			
			return this;
		};
		
		DM.Folder = function(data, path) {
			this.files = [];
			this.path = path;
		};
		DM.Folder.prototype = {
			
			setParent: function(parent) {
				this.parent = parent;
			},
			
			getParent: function(parent) {
				return this.parent || this.repository;
			},
			
			setRepository: function(repository) {
				this.repository = repository;
				return this;
			},
			
			add: function(file) {
				this.files.push(file);
			}
		}
		
		//statuses
		//0 idle
		//1 loading
		//2 loaded
		
		DM.File = function(data, path) {
			this.state = 0;
			this.stack = [];
			this.deps = [];
			this.paths = [];
			
			this.setData(data);
			this.path = trim(path || this.getPath());
		};
		
		DM.File.getPath = function(node, name, prefix) {
			if (node.real) {
				name = node.real;
				prefix = Environment.now.prefix;
			} else if (!prefix) {
				prefix = '';
			}
			return prefix + '/' + name;
		}
		
		DM.File.prototype = {
			
			setData: function(node) {
				this.desc = node.desc;
				this.rule = node.rule;
				if (node.deps) {
					for (var i = 0, j = node.deps.length; i < j; i++) this.addDependency(node.deps[i])
				}
			},
			
			addDependency: function(file) {
				this.deps.push(file);
			},
			
			use: function(callback) {
				if (callback) {
					if (this.isLoaded()) return callback();
					this.chain(callback);
				}
				if (this.isIdle()) this.start();
			},
			
			setRepository: function(repository) {
				this.repository = repository;
				return this;
			},
			
			setFolder: function(folder) {
				folder.add(this);
				this.folder = folder;
			},
			
			chain: function(callback) {
				this.stack.push(callback);
			},
			
			start: function() {
				this.onStateChanged();
				this.next();
			},
			
			next: function() {
				if (this.deps.length == 0) return this.load();
				var next = this.resolve(this.deps.shift())
				if (!next) return this.next();
				next.use(bind(this.next, this));
			},
			
			load: function() {
				return DM.instance.include(this.getURL(), bind(this.onLoad, this));
			},
			
			compact: function() {			
				for (var i = 0, query; query = this.deps[i]; i++) this.resolve(query);
			},
			
			resolve: function(query, bang) {	
				var resolved = this.repository.find(query);
				if (resolved) {
					if (resolved == this) {
						vlog(2)("warn", "Ignoring circular reference to", query);
					} else {
						return resolved;
					}
				}
				if (bang) vlog(2)("warn", "Couldn't resolve", query);				
			},
			
			onLoad: function() {
				this.onStateChanged();
				vlog(1)("info", 'Loaded', this.path);
				var fn;
				while (fn = this.stack.shift()) fn();
			},
						
			getURL: function() {
				return "/" + this.getPrefix() + "/" + this.format();
			},
			
			format: function() {
				var path = this.path + ".js";
				if (this.needsTagging()) path = this.tag(path);
				
				return path;
			},
			
			needsTagging: function() {
				return !Environment.now.cached;
			},
			
			tag: function(path) {
				return path + "?" + this.getTag();
			},
			
			getPrefix: function() {
				return this.repository.getPrefix();
			},
			
			getName: function() {
				if (!this.name) this.name = this.paths[this.paths.length - 1];
				return this.name;
			},
			
			getTag: function() {
				return Math.random(100500);
			},
			
			getPath: function() {
				return DM.File.getPath(this);
			},
			
			isLoaded: function() {
				return this.state == 2;
			},

			isLoading: function() {
				return this.state == 1
			},
			
			isIdle: function() {
				return this.state == 0;
			},
			
			onStateChanged: function() {
				return this.state ++;
			},
			
			log: function() {
				vlog(1)("info", 'Loaded', file.name, file.description)
			},
			
			toPaths: function() {
				if (this.paths.length > 0) return this.paths;
				var bits = this.repository.getPrefix().split('/').concat(this.path.split('/'));
				while (bits.length) {
					bits.shift();	
					var path = bits.join("/");
					if (path.length) this.paths.push(path);
				}
				return this.paths;
			},
			
			toString: function() {
				return this.path + " [" + ['idle', 'loading', 'loaded'][this.state] + "]"
			}
		};
		
		(function() {
			var isFile = function(node) {
				return !!node.desc;
			};

			var isRepository = function(node) {
				return node.real;
			}
			
			var isFolder = function(node) {
				return (typeof node == 'object' && !node.push && !node.indexOf)
			};
	

			DM.Repository.prototype = {
				
				register: function(tree) {
					this.tree = this.walk(tree);
				},
			
				walk: function(tree, prefix) {
					var result = {};
					for (var name in tree) {
						var node = tree[name];
						result[name] = this.convert(node, DM.File.getPath(node, name, prefix));
					}
					return result;
				},
			
				convert: function(node, path) {
					if (isFile(node)) {
						return this.addFile(node, path)
					} else if (isRepository(node)) {
						return this.addRepository(node, path)
					} else if (isFolder(node)) {
						return this.addFolder(node, path);
					}
				},
				
				merge: function(repository, path) {
					for (var i = 0, j = repository.files.length; i < j; i++) {
						this.files.push(repository.files[i]);
					}
					for (var i = 0, j = repository.folders.length; i < j; i++) {
						this.folders.push(repository.folders[i]);
					}
					for (var path in repository.paths) {
						var files = repository.paths[path];
						for (var j = 0, file; file = files[j]; j++) {
							this.addFilePath(path, file);
						}
					}
					return this;
				},
				
				onLookupFailed: function(query) {
					if (this.repository) {
						//if has parent repository, try there
						return this.repository.find(query);
					} else {
						return null
					}
				},
				
				onLookupSucceed: function(query, found) {
					var length = found.length;
					if (length == 1) return found[0];
					for (var i = 0; i < length; i++) {
						
					}
					return found[0];
				},
				
				lookup: function(query) {
					var found = this.paths[query];
					if (found) {
						return this.onLookupSucceed(query, found)
					} else {
						return this.onLookupFailed(query);
					}
				},

				find: function(query) {
					if (query && query.path) {
						return query
					} else {
						return this.lookup(trim(query));
					}
				},
				
				setRepository: function(repository) {
					this.repository = repository;
					return this.compact();
				},
				
				add: function(node) {
					node.setRepository(this)
					return node;
				},
				
				addFile: function(node, path) {
					var file = new DM.File(node, path);
					this.add(file);
					
					if (this._folder) file.setFolder(this._folder); 
					
					this.addFilePaths(file);
					return file;
				},
				
				addRepository: function(node, path) {
					var repository = new DM.Repository(node, path);
					vlog(2)('info', 'Found repository', repository, 'at', path)
					this.merge(this.add(repository));
					return this;
				},
				
				addFolder: function(node, path) {
					var folder = new DM.Folder(node, path);
					
					var old = this._folder;
					this._folder = folder;
					this.walk(node, path);
					this._folder = old;
					
					this.add(folder);
					this.addFolderPath(path, folder)
					return this;
				},
				
				//resolve dependencies in current repository
				compact: function() {
					for (var i = 0, j = this.files.length; i < j; i++) {
						this.files[i].resolve();
					}
					return this;
				},
				
				addFolderPath: function(path, folder) {
					this.folders[trim(path)] = folder;
				},
				
				addFilePath: function(path, file) {
					if (!this.paths[path]) this.paths[path] = [];
					this.paths[path].push(file);
				},
				
				addFilePaths: function(file) {
					for (var paths = file.toPaths(), i = 0, path; path = paths[i]; i++) {
						this.addFilePath(path, file)
					};
				},
				
				getPrefix: function() {
					return this.prefix;
				},
				
				open: function(path) {
					var folder = this.folders[path];
					if (folder) return folder.files;
					return [];
				},
				
				glob: function(path, regexp) {
					var files = this.open(path);
					var filtered = [];
					if (regexp && !regexp.exec) regexp = new RegExp(regexp);
					for (var i = 0, j = files.length; i < j; i++) {
						if (!regexp || files[i].path.match(regexp)) filtered.push(files[i]);
					}
					return filtered;
				}
			};
			
		})();
	
		DM.Queue = function(args, callback) {
			this.stack = args;
			this.callback = callback;
 			if (isInitialized()) { 
        this.next();
      } else { 
        DM.queue(bind(this.next, this));
      }
		};
		
		DM.Queue.prototype = {
	
			chain: function(fn) {
				this.stack.push(fn);
			},
			
			next: function() {
				var name = this.stack.shift();
				var file = DM.find(name);
				if (!file) return vlog(1)("warn", "Couldnt find", name);
				file.use(this.getNextStep());
			},
			
			getNextStep: function() {
				return this.isFinished() ? this.callback : bind(this.next, this);
			},
			
			isFinished: function() {
				return this.stack.length == 0;
			}
		};
		
		

		extend(DM, {
			
			onInitialize: function() {
				DM.initialized = true;
				var fn;
				while (fn = this.stack.shift()) fn();
			},
			
			register: function(repository) {
				this.repository = repository;
				this.onInitialize()
			},
			
			queue: function(fn) {
				this.stack.push(fn)
			},
			
	    fetch: function (url, prefix) {
				this.url = url;
				this.prefix = prefix;
	      new Request(url, this.recieve)
	    },
	
			recieve: function(xhr) {
				return DM.apply(xhr.responseText);
			},
			
			apply: function(text) {
				DM.register(new DM.Repository(text, DM.prefix));
			},
			
			use: function(query, callback) {
				var file = DM.find(query);
				if (file) file.use(callback)
				else callback();
			}
			
		});
		
		var methods = ["find", "open", "glob"];
		for (var i = 0, j = methods.length; i < j; i++) {
			(function(method) {
				DM[method] = function() {
					return DM.repository[method].apply(DM.repository, arguments);
				}
			})(methods[i]);
		}
		

		DM.prototype = {

			include: function (source, callback) {
	      var head = this.head;
	 			var script = this.document.createElement('script');
				extend(script, {
					onload: callback,
					onreadystatechange: function () {
				    var state = this.readyState;
				    if ("loaded" === state || "complete" === state) {
			        script.onreadystatechange = null;
			        callback();
							head.removeChild(script);
				    }
		      },
					src: source,
					type: 'text/javascript'
				});
				
				head.appendChild(script);
	      return script;
	    },
	
			using: function() {
	      var args = $splat(arguments);
	      var callback = (typeof args[args.length - 1] == "function") ? args.pop() : $empty;
				switch(args.length){
				case 0:
					return callback();
				case 1: 
					return DM.use(args[0], callback)
				default:
					return new DM.Queue(args, callback);
				}
			}
			
		};

		//Plugins

		//Autoloading.
		(function(onLoad) {	
			DM.File.prototype.onLoad = function() {
				if (this.extended) {
					if (this.extension) {
						if (this.extension.isLoading()) this.extensions.chain(bind(onLoad, this));
					}				
				} else {
					this.extended = true;
					this.extension = DM.repository.lookup(this.getName() + '.Ext');
					if (this.extension) {
						this.extension.extended = true;
						return this.extension.use(bind(onLoad, this));
					}
				}
				return onLoad.call(this);			
			}
		})(DM.File.prototype.onLoad);
		
		if (Environment.now.packer) {
			$loaded = {};
	    $loaded.push = function(path) {
				var file = DM.find(path);
				if (file) {
					file.status = 2;
					vlog(2)(path, "is unpacked and loaded")
				} else {
					vlog(2)("warn", path, "is thrown as loaded, but can not be found")
				}
				
	    };
	
	
			//Packaging support
			(function(setData) {	
				DM.File.prototype.setData = function(data) {
					setData.apply(this, arguments);
					if (data.packed) this.packed = data.packed;
				}
			})(DM.File.prototype.setData);

			(function(find) {
				DM.Repository.prototype.find = function(query) {
					var found = find.apply(this, arguments);
					if (found && found.packed) {
						vlog(1, found.name, "is found, but is packed");
						return this.find(found.packed)
					}
					return found;
				}
			})(DM.Repository.prototype.find)
		}


		//caching the tree
		(function(fetch) {
			DM.fetch = function(url, prefix) {
				if (Environment.now.cache && window.name.length) {
					this.url = url;
					this.prefix = prefix;
					DM.apply(window.name);
				} else {
					fetch.apply(DM, arguments)
				}
			}
		})(DM.fetch);

		(function(apply) {
			DM.apply = function(text) {
				if (text != window.name) window.name = text;
				apply(text);
			}
		})(DM.apply);


	})();
})();




new DM;
function using() {
  return DM.instance.using.apply(DM.instance, arguments);
};

DM.fetch(Environment.now.path, Environment.now.prefix);

