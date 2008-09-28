Tree = {}

Tree.Node = new Class({
  Implements: [new Events, new Options],
  
  children: [],
  elements: {},
  modules: {},
  
  initialize: function(root, model) {
    this.model = model
    this.root = root;
    this.initializeStates();
    
    if (this.model) this.store()
  },
  
  get: function(what) {
    switch(what) {
      case "root": return this.root
      case "node": return this;
      case "roost": return this.elements.roost;
      case "wrapper": return this.elements.wrapper;
      case "self": return this.elements.self;
      default: this.model[what];
    }
  },
  
  getElement: function(what) {
    if (!this.elements) this.elements = {}
    if (!this.elements[what]) this.elements[what] = this.el.getElement();
    return this.elements[what]
  },
  
  set: function(what, value) {
    this.model[what] = value
  },
  
  loadChildren: function(things) {
    if (!things) return
    return things.map(function(thing) {
      return this.appendChild(thing)
    }, this)
  },
  
  swallow: function(what) {
    if ($type(what) == "array") {
      what.each(function(el) {
        this.swallow(el)
      }, this)
    } else {
      this.loadChildren([what])
    }
  },
  
  destruct: function() {
    for (var i in this.elements) {
      this.elements[i].dispose();
    }
  },
  
  appendChild: function(thing) {
    return this.root.$(thing).inject(this);
  },
  
  removeChild: function(node) {
    this.children.remove(node)
    node.remove();
    return node;
  },

  remove: function() {
    this.fireEvent('beforeRemove')
    this.parentNode.children.erase(this);
    this.parentNode.render();
    this.destruct();
    this.fireEvent('afterRemove')
  },
  
  contains: function(node) {
    this.children.contains(node)
  },
  
	getChildren: function(){
		return this.children;
	},
	
	hasChildren: function(){
		return this.children.length ? true : false;
	},
	
	index: function(){
		if( this.isRoot() ) return 0;
		return this.parentNode.children.indexOf(this);
	},
	
	getNext: function(){
		if(this.isLast()) return null;
		return this.parentNode.children[this.index()+1];
	},
	
	getPrevious: function(){
		if( this.isFirst() ) return null;
		return this.parentNode.children[this.index()-1];
	},
	
	getFirst: function(){
		if(!this.hasChildren()) return null;
		return this.children[0];
	},
	
	getLast: function(){
		if(!this.hasChildren()) return null;
		return this.children.getLast();		
	},
	
	getParent: function(){
		return this.parentNode;
	},
	
	isLast: function(){
		if(this.parentNode==null || this.parentNode.children.getLast()==this) return true;
		return false;
	},
	
	isFirst: function(){
		if(this.parentNode==null || this.parentNode.children[0]==this) return true;
		return false;
	},
		
	isRoot: function() {
	  return this.root == this
	},
	
	inject: function(node, where, domNode){
		var parent=this.parentNode;
		var previous=this.getPrevious();
		var type=domNode ? 'copy' : 'move';
		switch(where){
			case 'after':
			case 'before':
				if( node['get'+(where=='after' ? 'Next' : 'Previous')]()==this ) return false;
				if(this.parentNode) this.parentNode.children.erase(this);
				this.parentNode=node.parentNode;
				this.parentNode.children.inject(this, node, where);
				break;
			default:
				if( node.getLast()==this ) return false;
				if(this.parentNode) this.parentNode.children.erase(this);
				node.children.push(this);
				this.parentNode=node;
				if (node.get('wrapper')) node.open();
				break;
		}		
		this.root.fireEvent('structureChange', [this, node, where, type]);
		return this;
	},
	
	render: function() {
	  this.fireEvent('beforeRender')
	  if (!this.elements.wrapper) {
	    this.elements.wrapper = new Element(this.isRoot() ? 'div' : 'li', {'class': 'node'});
	    this.elements.self = new Element('div', {'class': 'self'}).inject(this.elements.wrapper)
    }
	  if (this.model) {
	    if (!this.elements.title) this.elements.title = new Element('span', {'class': 'title'})
	    this.elements.title.store('node', this).store('root', this.root)
	    this.elements.title.set('html', this.model[this.root.options.attribute]).injectTop(this.get('self'))
	  }
	  if (this.is('openable', true) || this.isRoot()) {
	    if (!this.elements.roost) this.elements.roost = new Element('ul', {'class': 'roost'}).injectBottom(this.elements.wrapper)
	    this.elements.roost.store('node', this)
	    this.children.each(function(node) {
	      if (!node.elements.wrapper) node.fireEvent('beforeFirstRender')
	      node.render();
        node.reposition();
	    }, this)
	  }
    this.fireEvent('afterRender');
    return this.elements.wrapper
	},
	
	reposition: function() {
    if (!this.elements.wrapper) return;
	  var p = this.getPrevious()
	  if (p && p.elements.wrapper) return this.elements.wrapper.inject(p.elements.wrapper, 'after')
    p = this.getNext()
	  if (p && p.elements.wrapper) return this.elements.wrapper.inject(p.elements.wrapper, 'before')
	  p = this.getParent()
	  if (p && p.elements.roost) return this.elements.wrapper.inject(p.elements.roost)
	},
	
	getType: function(name) { 
	  return Tree.Node.getType(this, name)    
	},
	
	getUID: function() {
	  if (!this.uid) this.uid = 'node-' + (Math.random() + '').substr(2, 8)
	  return this.uid
	},
	
	getConstant: function(set) {
	  if ($type(set) == 'string') set = Tree[set]
	  return set
	},
	
	recursive: function(fn) {
	  if (!this.hasChildren()) return;
	  this.children.each(function(c) {
	    c.recursive(fn);
      fn.call(c)
	  }, this)
	},
	
	parentusive: function(fn) { //Bear with it
	  var parent = this
	  while ((parent = parent.getParent()) && parent != this.root) {
	    fn.call(parent)
	  }
	},
	
	has: function(node) {
	  var ret = false
	  var that = this;
	  node.parentusive(function(n) { if (this == that) ret = true; })
	  return ret;
	},
	
	is: function(what, def) {
	  return def ? (this.getType()[what] === true) : (this.getType()[what] !== false)
	},
	
	store: function() {
	  var uid = Tree.Node.getUID(this.model);
	  if (!uid) return;
	  this.root.$storage[uid] = this;
	}
})


Array.implement({
	
	inject: function(added, current, where){//inject added after or before current;
		var pos=this.indexOf(current)+(where=='before' ? 0 : 1);
		for(var i=this.length-1;i>=pos;i--){
			this[i+1]=this[i];
		}
		this[pos]=added;
		return this;
	}
	
});


Tree.Node.getType = function(node, name, root) { 
  if (!name && node.type) return node.type
  if (!root) root = node.root
  if (!name) {
    var def
    var old = node.model;
    if (!node.model) node.model = node
    for (var possibility in root.options.types) {
      var fn = root.options.types[possibility]
      if (fn['condition'] && fn['condition'].call(node)) name = possibility
      if (fn['default']) def = possibility
    }
    node.model = old
  	if (!name && def) name = def
  }
  node.type = root.options.types[name] 
  node.type.name = name
  return node.type;     
}

Tree.Node.getUID = function(node) {
  var model = node.model || node
  if (!model || !model.resource || !model.title) return //change title to id eventually
  return model.resource.name + model.title
}


Tree.Types = {
  'folder': {
    'condition': function() { return this.model.resource.name == "Folder"},
    'loadable': true,
    'openable': true
  },

  'file': {
    'condition': function() { return this.model.resource.name != "Folder" },
    'default': true
  },
  
  'song': {
    'condition': function() { return this.model.resource.name == "Song" },
    'class': 'Row',
    'selectable': false,
    'columns': [
      {'width': '25%'},
      {'width': '25%', 'source': 'artist'},
      {'width': '50%', 'html': '&larr; That is a song, and this is html', 'align': 'right'}
    ],
  },
  
  'game': {
    'condition': function() { return this.model.resource.name == "Game" },
    'class': 'Red'
  }
}

Tree.States = {

  'selection': {
    'condition': function() { return this.is('selectable')  },
    'default': function() { return (this.getParent() && this.getParent().isSelected()) || (this.model && this.model.selected) },
    'names': {'unselect': 'unselected', 'select': 'selected'}
  },
  
  'loadability': {
    'condition': function() { return this.is('loadable')},
    'default':function() {return !this.hasChildren()},
    'names': {'lazy': 'lazy', 'busy': 'busy', 'load': 'loaded'}
  },

  'openability': {
    'condition': function() { return this.is('openable', true)},
    'default': function() { return this.model.open == undefined ? this.hasChildren() : this.model.open },
    'names': {'close': 'closed', 'open': 'open'}
  },
  
  'dragability': {
    'condition': function() { return this.is('draggable')},
    'default': function() { return this.model.draggable != false },
    'names': {'undraggable': 'undraggable', 'draggable': 'draggable'}
  },
  
  'manageability': {
    'condition': function() { return this.is('managable')},
    'default': function() { return this.model.managable != false }
  }
}

Tree.Actions = {

  'open': {
    'fn': function() { this.open() },
    'title': 'Open folder',
    'condition': function() { return this.is('openable', true) && this.isClosed()},
  },

  'close': {
    'fn': function() { this.close() },
    'title': 'Close folder',
    'condition': function() { return this.is('openable') && this.isOpen()},
  },

  'destroy': {
    'fn': function() { this.model.destroy() },
    'title': 'Destroy',
    'confirm': 'Are you ultra-sure you want to delete these things?',
    'condition': function() { return this.model.resource.name != 'Song'},
    'mass': true
  }  ,

  'download': {
    'fn': function() { alert('Downloadzz these:' + this.root.serialize()) },
    'title': 'Download',
    'confirm': 'Are you ultra-sure you want to delete these things?',
    'mass': true
  },

  'reload': {
    'fn': function() { this.model.reload() },
    'title': 'Reload'
  }
}

Tree.Row = new Class({
  Extends: Tree.Node,
  
  initialize: function(root, model) {
    var ret = this.parent(root, model);
    this.addEvent('beforeRender', this.renderTable.bind(this));
    this.addEvent('afterRender', this.injectTable.bind(this));
    return ret
  },
  
  renderTable: function() {
    if (!this.elements.table) {
      this.elements.table = new Element('table').setStyle('width', '100%')
      this.elements.row = new Element('tr').inject(this.elements.table)
      this.columns = this.getType().columns.map(this.renderColumn, this)
      this.elements.reself = this.columns[0].getFirst()
    }
  },
  
  get: function(what) {
    if (what == "self") return this.elements.reself;
    return this.parent(what)
  },
  
  injectTable: function() {
    this.elements.table.injectTop(this.elements.self)
  },
  
  renderColumn: function(col, i) {
    var td = new Element('td');
    if (col.width) td.setStyle('width', col.width)
    if (col.align) td.setStyle('text-align', col.align)
    if (col['class']) td.addClass(col['class']);
    td.addClass('column').addClass('column-' + (i + 1))
    td.adopt(new Element('div', {'class': 'column-inside', 'html': col.html || this.model[col.source]}))
    return td.inject(this.elements.row)
  }
})


Tree.Red = new Class({
  Extends: Tree.Node,
  
  initialize: function(root, model) {
    var ret = this.parent(root, model);
    this.addEvent('afterRender', function() {
      this.elements.title.setStyle('color', 'red').set('html', 'Game: ' + this.model[this.root.options.attribute])  
    }.bind(this));
    return ret;
  }
})


Tree.Root = new Class({
  Extends: Tree.Node,
  
  Implements: [new Events, new Options],
  
  options: {
    types:   'Types',
    classes: 'Classes',
    states:  'States',
    actions: 'Actions',
    selection: false,
    draggable: true,
    
    attribute: 'name'
  },
  
  $storage: {},
  
  initialize: function(options) {
    this.setOptions(options);
    ['types', 'classes', 'states', 'actions'].each(function(s) {
      this.options[s] = this.getConstant(this.options[s])
    }, this)
    this.parent(this)
    this.parentNode = null
    this.addEvent('afterRender', function() {this.get('roost').setStyle('padding', [20,0,20,0]) })
    this.initializeActions()
    this.fireEvent('beforeFirstRender')
  },
  
  getType: function() {
    return {name: "root", loadable: false, openable: false, selectable: false, selected: false}
  }, 
  
  $: function(thing) {
    if (thing.model) return thing; 
    var cached = this.$storage[Tree.Node.getUID(thing)]
    if (cached) {
      cached.model = thing
      cached.initializeDefaultStates()
      return cached
    }    
    var kls = Tree.Node.getType(thing, null, this)['class']
    kls = Tree.Node.prototype.getConstant(kls) || Tree.Node
    return new kls(this, thing);
  }
});

Tree.Node.implement({
  initializeStates: function() {
    var states = this.root.options.states
    if (!states) return;
    this.states = {}
    Hash.each(states, function(definition, name) {
      if (!this.constructor.stateful && definition.names) {
        obj = this.constructor.prototype;
        var i = 0;
        Hash.each(definition.names, function(perfect, present) {
          (function(k, name) { //long live JS!!! :/
            obj[present] = function() { this.setState(name, k); this.fireEvent(present); }
            obj['is' + perfect.capitalize()] = function() {return this.getState(name) == k;}
          })(i, name);
          i++;
        }, this);  
        
      }
      if (definition['condition'].call(this)) this.modules[name] = definition
    }, this)
    
    
    this.addEvent('beforeFirstRender', this.initializeModules.bind(this))
    this.addEvent('stateChange', this.setClassNames.bind(this))
    if (!this.isRoot()) this.addEvent('render', this.setClassNames.bind(this))
    if (!this.constructor.stateful) this.constructor.stateful = true;
  },
  
  initializeModules: function() {
    this.initializeDefaultStates(true)
  },
  
  initializeDefaultStates: function(callHooks) {
    for (var name in this.modules) {
      var definition = this.modules[name]
      if (callHooks) {
        var fn = this['initialize' + name.capitalize()]
        if (fn) fn.call(this)
      }
      if (definition['default'] && !this.isRoot()) {
        var result = definition['default'].call(this)
        this.setState(name, result)
        var names = []
        for (var i in definition.names) names.push(i);
      
        if (result == false || result === undefined) result = 0;
        if (result == true) result = 1;
        if (names.length) this[names[result]]();
      }
    }
  },
  
  getState: function(type) {
    return this.states[type] || false
  },
  
  setState: function(type, value) {
    this.states[type] = value
    this.fireEvent('stateChange', [type, value])
  },

	setClassNames: function() {
	  if (this.elements.self) {
	    var c = ['self', this.getType().name, this.isSelected() ? "selected" : "unselected", this.isOpen() ? "open" : "closed"]
	    this.elements.self.className = c.join(" ")
	  }
	}

});


//Selection

Tree.Node.implement({
  initializeSelection: function() {
    this.addEvent('beforeRender', this.renderLabel.bind(this))
    this.addEvent('afterRender', this.renderCheckbox.bind(this))
    if (this.root.options.selection == "dependant") {
      this.addEvent('select', this.fixChildrenSelection.bind(this))
      this.addEvent('unselect', this.fixChildrenSelection.bind(this))
      this.root.addEvent('structureChange', function(node) {
        node.fixChildrenSelection()
      })
    }
  },
  
  fixChildrenSelection: function() {
    var state = this.isSelected();
    
    if (this.hasChildren()) {
      this.recursive(function() { //walk down
        if (this.elements.checkbox) this.elements.checkbox.set('checked', state)
      });
    }
    if (!state) { 
      this.parentusive(function() { //walk up
        if (this.elements.checkbox) this.elements.checkbox.set('checked', state)
      })
    }
  },
  
  renderLabel: function() {
    if (!this.elements.title) this.elements.title = new Element('label', {'class': 'title', 'for': this.getUID()})
  },
  
  getSelected: function() {
    var ret = []
    this.recursive(function() {
      if (this.isSelected() && (!this.getParent() || !this.getParent().isSelected())) ret.push(this)
    })
    return ret
  },
  
  serialize: function() {
    return this.getSelected().map(function(n) {
      return [n.getType().name, n.model.title].join(" ")
    })
  },
  
  renderCheckbox: function() {
    if (this.isRoot()) return;
    if (!this.elements.checkbox) {
      this.elements.checkbox = new Element('input', {'type': 'checkbox', 'id': this.getUID()})
      this.addEvent('select', function() {
        this.elements.checkbox.set('checked', true);
      }, this)
      this.addEvent('unselect', function() {
        this.elements.checkbox.set('checked', false);
      }, this)
      this.elements.checkbox.addEvent('click', function() {
        this.elements.checkbox.get('checked') ? this.select() : this.unselect();
      }.bind(this));
      if (this.isSelected()) {
        this.select()
      }
    }
    this.elements.checkbox.inject(new Element('div', {'class': 'checkbox'}).injectBefore(this.elements.title))
  }
})


//Openability

Tree.Node.implement({
  initializeOpenability: function() {
    this.addEvent('afterRender', this.renderOpener.bind(this))
  },
  
  renderOpener: function() {
    if (!this.elements.opener) {
      this.elements.opener = new Element('b', {'class': 'opener'})
      this.elements.opener.addEvent('mousedown', function(e) {
        e.stop()
        this.isOpen() ? this.close() : this.open();
      }.bind(this))
      this.addEvent('open', function() {
        this.elements.roost.setStyle('display', 'block');
        this.elements.opener.set('html', '&minus;')
      }.bind(this))
      this.addEvent('close', function() {
        this.elements.roost.setStyle('display', 'none');
        this.elements.opener.set('html', '+')
      }.bind(this))
       this.isOpen() ? this.open() : ((this.hasChildren() || this.is('loadable')) && this.close());
    }
    this.elements.opener.injectBefore(this.elements.title)
  }
})


//Sorting

Tree.Node.implement({
  sort: function(fn) {
    this.root.recursive(function() { this.children.sort(fn); this.reposition() })
    this.root.render(); //Man, i love how re-render would just reposition the nodes, not regenerate the whole shit
  },
  
  sortBy: function(field, multiplier) {
     this.sort(function(node1, node2) {
      //Here we try to treat values as numbers rather then strings first
      var v1 = node1.model ? (field == 'name' ? node1.name : node1.model[field]) : 0
      var v2 = node2.model ? (field == 'name' ? node2.name : node2.model[field]) : 0
      return ((v1 > v2) ? 1 : ((v1 < v2) ? -1 : 0)) * multiplier
    });
  }
})

//Loadability
Tree.Node.implement({
  initializeLoadability: function() {
    this.initializeJester()    
    this.model.addEvents({
      'beforeDestroy': this.remove.bind(this)
    })
  },
  
  load: function() {
    this.model.reload();
  },
  
  open: function() {
    this.setState('open', true)
    this.fireEvent('open')
    if (this.is('loadable')) this.load();
  }
});

//Actions
Tree.Node.implement({
  initializeActions: function() {
  }
})

//Rightclick Menu
var Menu = new Class({
  
  Implements: [new Options],
  
  options: {
    'class': 'tooltip',
    preprocess: $arguments[0]
  },
  
  initialize: function(actions, options) {
    this.setOptions(options)
    this.actions = $H(actions);
    this.hide();
  },
  
  addAction: function(action) {
    this.actions.push(action)
  },
  
  getElement: function() {
    if (!this.el) this.el = new Element('ul', {'class': this.options['class'], 'style': 'position:absolute; top:-250px; z-index:25'}).inject(document.body);
    return this.el;
  },
  
  buildItem: function() {
    return (new Element('li').inject(this.getElement())).addEvent('click', this.choose.bind(this))
  },
  
  choose: function(e) {
    e.stop()
    var el = $(e.target)
    var action = this.actions.each(function(a) { 
      if (a.element == el) a.fn.call(this.target)
    }, this);
    this.hide()
  },
  
  show: function(el) {
    if ($type(el) != 'element') {
      if (!el.rightClick) return;
      el.stop()
      el = $(el.target)
      while (!el.retrieve('node')) el = el.getParent()
    }
    this.getElement().position(el.getPosition()).fade('in')
    this.target = this.options.preprocess(el);
    this.actions.each(function(a) {
      if (!a.element) a.element = this.buildItem()
      a.element.setStyle('display', (!a.condition || a.condition.call(this.target)) ? 'block' : 'none').set('html', a.title)
    }, this)
  },
  
  hide: function(e) {    
    e && e.stop()
    this.target = false
    this.getElement().fade('out')
  }
  
})

Tree.Node.implement({
  initializeManageability: function() {
    this.managabilityInitialization = function() {
      this.removeEvent('afterRender', this.managabilityInitialization);
      this.elements.title.getParent().addEvent('mousedown', this.root.menu.show.bind(this.root.menu));
    }.bind(this)
    this.addEvent('afterRender', this.managabilityInitialization);
  }
});

Tree.Root.implement({
  initializeManageability: function() {
    this.menu = new Menu(this.options.actions, {
      preprocess: function(e) { return e.retrieve('node') }
    });
  }
})

//Jester
Tree.Node.implement({
  initializeJester: function() {
    this.model.addEvents({
      'destroy': this.remove.bind(this)
    })
  }
});


//Drag & Drop
Tree.Node.implement({
  claimDraggingAbility: function() {
    if (this.elements.title && !this.root.drag.elements.contains(this.elements.title)) this.root.drag.addItems(this.elements.title);
    if (this.elements.title && !this.root.drag.droppables.contains(this.elements.title)) this.root.drag.addDroppables(this.elements.title)
  }
})

Tree.Root.implement({  
  initializeDragability: function() {
    this.drag = new Tree.DragNDrop('#tree_container', {
      constrain: true,
      container: $('tree_container'),
      clone: true,
			revert: true,
			onAim: this.show.bind(this),
			onMiss: this.hide.bind(this),
      onStart: function(e) { 
      }.bind(this)
    });
    
    this.addEvent('structureChange', function(node, another) {
      this.drag.flush();
      node.addEvent('afterRender', node.claimDraggingAbility.bind(node))
      node.reposition();
      another.reposition()
    }.bind(this))
  },
  
  show: function(el, where) {
    var pos = this.drag.drag.getPosition(el);
    switch(where) {
      case "before":
        pos = ['line', 0, pos.top];
        break
      case "after":
        pos = ['line', 0, pos.bottom]; 
        break
      default:  
        pos = ['arrow', pos.left + el.offsetWidth, pos.top + 2]
    }
    var wrapper = this.get('wrapper');
    pos[1] -= this.drag.drag.getPosition(wrapper).left - 5
    pos[2] -= this.drag.drag.getPosition(wrapper).top + 2
    wrapper.removeClass('line').removeClass('arrow').addClass(pos[0]).setStyle('background-position', pos.slice(1, 3))
  },
  
  hide: function() {
    this.get('wrapper').setStyle('background', 'none')
  }
})



Tree.LightMove = new Class({ 
  Extends: Drag.Move,
  
	checkAgainst: function(el){ //a little bit of caching
	  var pos = this.getPosition(el)
		var now = this.mouse.now;
		return (now.x > pos.left && now.x < pos.right && now.y < pos.bottom && now.y > pos.top);
	},
	
	$positions: {},
	
	getPosition: function(el) {
		var pos = this.$positions[el.uid]
		if (!pos) this.$positions[el.uid] = pos = el.getCoordinates();
		return pos
	}
})

Tree.DragNDrop = new Class({
  Extends: Sortables,
  
  droppables: [],
  
  start: function(event, element){
		if (!this.idle) return;
		this.idle = false;
		this.element = element;
		this.opacity = element.get('opacity');
		this.list = element.getParent();
		this.clone = this.getClone(event, element)
		this.node = element.retrieve('node')
		this.clone.store('node', this.node)
		this.drag = new Tree.LightMove(this.clone, {
			snap: this.options.snap,
			container: this.options.constrain && this.element.retrieve('node').root.get('wrapper'),
			droppables: this.droppables,
			onSnap: function(){
				event.stop();
				this.clone.setStyle('visibility', 'visible');
				this.element.set('opacity', this.options.opacity || 0);
				this.fireEvent('start', [this.element, this.clone]);
			}.bind(this),
			onDrag: this.move.bind(this),
  		onEnter: this.aim.bind(this),
			onLeave: this.forget.bind(this),
			onCancel: this.reset.bind(this),
			onComplete: this.end.bind(this)
		});
		
		this.clone.inject(this.element, 'before');
		this.drag.start(event);
	},
	
	addDroppables: function(){
		Array.flatten(arguments).each(function(d){
			this.droppables.push(d);
			if(this.drag) this.drag.droppables = this.droppables;
		}, this);
		return this;
	},
	
	aim: function(dragging, element) {
  	var current = dragging.retrieve('node');
  	var aimed = element.retrieve('node');
  	if (current.has(aimed) || current == aimed) return this.target = this.where = false;
		this.target = element		
	},
	
	move: function() {
	  if (!this.target) return;
	  var k = (this.drag.mouse.now.y - this.drag.getPosition(this.target).top) / this.target.offsetHeight
	  var old = this.where;
	  if (this.target.retrieve('node').is('openable', true)) {
      this.where = 'inside';
  	  if (k < 0.25) this.where = 'before'
  	  if (k > 0.65 && !this.node.isOpen()) this.where = 'after'
	  } else {
	    this.where = k > 0.5 ? 'after' : 'before'
	  }
	  if (old != this.where) this.fireEvent('aim', [this.target, this.where])
	},
	
	forget: function() {
	  this.fireEvent('miss');
	  this.target = false
	  this.where = false
	},
	
	end: function(){
		this.drag.detach();
  	this.fireEvent('miss');
		this.element.set('opacity', this.opacity);
		if (this.target && this.where) this.element.retrieve('node').inject(this.target.retrieve('node'), this.where)
		if (this.effect){
			var dim = this.element.getStyles('width', 'height');
			var pos = this.clone.computePosition(this.element.getPosition(this.clone.offsetParent));
			this.effect.element = this.clone;
			this.effect.start({
				top: pos.top,
				left: pos.left,
				width: dim.width,
				height: dim.height,
				opacity: 0.25
			}).chain(this.reset.bind(this));
		} else {
			this.reset();
		}
	},
	
	flush: function() {
	  if (this.drag) this.drag.$positions = {}
	},
	
	getClone: function(event, element){
		if (!this.options.clone) return new Element('div').inject(document.body);
		if ($type(this.options.clone) == 'function') return this.options.clone.call(this, event, element, this.list);
		var self = element.getParent('.self')
		return element.clone(true).setStyles({
			'margin': '15px 0 0 20px',
			'position': 'absolute',
			'visibility': 'hidden',
			'width': 200,
			'z-index':250,
		}).inject(this.list).position(self.getPosition(self.getOffsetParent()));
	}
})

