
window.addEvent('domready', function() {

if (console.time) console.time('Setting jester resources')


  new Resource("Song", {prefix: "/accounts/1/projects/1/items"});
  new Resource("Game", {prefix: "/accounts/1/projects/1/items"});
  new Resource("Item", {prefix: "/accounts/1/projects/1/items"});
  new Resource("Folder", {prefix: "/accounts/1/projects/1/items"})
if (console.time) console.timeEnd('Setting jester resources')


if (console.time) console.time('Bulding a tree (~ 20 nodes)')
var Projects = new Tree.Root({'selection': 'dependant', 'draggable': true});
Projects.loadChildren([
  new Folder({title: "Porn"}),
  new Folder({title: "Music"}),
  new Folder({title: "Games"})
])[2].loadChildren([
  new Folder({title: "RTS & SHIT", selected: true}),
  new Folder({title: "Adventure", open: false}),
  new Folder({title: "Quest"})
])[0].loadChildren([
    new Game({title: "Command & Conquer"}),
    new Game({title: "World of Warcraft"}),
    new Game({title: "Spore"})
])[0].getParent().getParent().getPrevious().loadChildren([
    new Song({artist: "Shakira", title: "Whatever"}),
    new Song({artist: "Злой Ой!", title: "Россия"}),
    new Song({artist: "Aphex Twin", title: "4"}),
    new Song({artist: "Shakira", title: "Hips dont lie"})
])
if (console.time) console.timeEnd('Bulding a tree (~ 20 nodes)')

if (console.time) console.time('Rendering a tree')
Projects.render()
Projects.get('wrapper').inject($('tree_container'))
console.timeEnd('Rendering a tree')

if (console.time) console.time('Adding few more nodes')
Projects.loadChildren([new Folder({title: "Fuckup folder", open: false})])[0].loadChildren([new Item({title: "Omg, this sucks"})])
if (console.time) console.timeEnd('Adding few more nodes')

if (console.time) console.time('Adding loadable node')
Projects.loadChildren([new Folder({title: "Remote", open: false, loadable: true})])
if (console.time) console.timeEnd('Adding loadable node')

if (console.time) console.time('Sorting a tree by title')
Projects.sortBy("title", true) 
if (console.time) console.timeEnd('Sorting a tree by title')

if (console.time) console.time('Removing one node')
Projects.children.each(function(n) { if (n.model.title == "Porn") n.remove()})
if (console.time) console.timeEnd('Removing one node')

//The meaning of this is that you may re-request the json 
//representation of the tree so widget will find differences & try to rebuild nodes

if (console.time) console.time('Patch the tree with new json structure')
Projects.loadChildren([new Game({title: "Spore"})])
Projects.render() //apply
if (console.time) console.timeEnd('Patch the tree with new json structure')

});