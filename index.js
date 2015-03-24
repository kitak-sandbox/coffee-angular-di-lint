var CoffeeScript = require('coffee-script');
var fs = require('fs');
var glob = require('glob');
var util = require('util');

var searchAllReferenced = function (component) {
  var args = component.args[component.args.length-1].base.objects;
  var injectedServices = args.splice(0, args.length-2);
  var componentBody = args[args.length-1];
  var referenceTable = injectedServices.reduce(function (memo, injectedService) {
    memo[injectedService.base.value.replace(/'/g, "")] = false;
    return memo;
  }, []);

  componentBody.eachChild(function (node) {
    if (node.constructor.name === "Block") {
      node.traverseChildren(referenceTable, function (node) {
        if (node.constructor.name === "Literal") {
          if (referenceTable[node.value] === false) {
            referenceTable[node.value] = true;
          }
        }
        return true;
      });
    }
  });

  return referenceTable;
};

glob("app/scripts/**/*.coffee", {}, function (err, files) {
  if (err != null) {
    console.error(err);
    return;
  }
  files.forEach(function (file) {
    console.log('---');
    console.log(file);
    var source = fs.readFileSync(file);
    try {
      var nodes = CoffeeScript.nodes(source.toString());

      nodes.traverseChildren(false, function (node) {
        if (node.constructor.name === "Call") {
          var properties = node.variable.properties;
          var componentName = properties[properties.length-1];
          if (['controller', 'factory', 'service', 'directive', 'filter'].indexOf(componentName.name.value) > -1) {
            var component = node;
            var referenceTable = searchAllReferenced(component);
            console.log('  ' + node.args[0].base.value + ':');
            console.log('    ' + util.inspect(referenceTable));
          }
        }
        return true;
      });
    } catch (e) {
      console.error(e);
    }
  });
});
