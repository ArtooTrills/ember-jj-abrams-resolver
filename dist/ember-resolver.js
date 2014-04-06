// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: Copyright 2013 Stefan Penner and Ember App Kit Contributors
// License:   Licensed under MIT license
//            See https://raw.github.com/stefanpenner/ember-jj-abrams-resolver/master/LICENSE
// ==========================================================================


 // Version: 0.0.1

(function() {
/*globals define registry requirejs */

define("ember/resolver",
  [],
  function() {
    "use strict";

    if (typeof requirejs.entries === 'undefined') {
      requirejs.entries = requirejs._eak_seen;
    }

  /*
   * This module defines a subclass of Ember.DefaultResolver that adds two
   * important features:
   *
   *  1) The resolver makes the container aware of es6 modules via the AMD
   *     output. The loader's _moduleEntries is consulted so that classes can be
   *     resolved directly via the module loader, without needing a manual
   *     `import`.
   *  2) is able provide injections to classes that implement `extend`
   *     (as is typical with Ember).
   */

  function classFactory(klass) {
    return {
      create: function (injections) {
        if (typeof klass.extend === 'function') {
          return klass.extend(injections);
        } else {
          return klass;
        }
      }
    };
  }

  var underscore = Ember.String.underscore;
  var classify = Ember.String.classify;
  var get = Ember.get;

  function parseName(fullName) {
    /*jshint validthis:true */

    var nameParts = fullName.split(":"),
        type = nameParts[0], fullNameWithoutType = nameParts[1],
        name = fullNameWithoutType,
        namespace = get(this, 'namespace'),
        root = namespace;

    return {
      fullName: fullName,
      type: type,
      fullNameWithoutType: fullNameWithoutType,
      name: name,
      root: root,
      resolveMethodName: "resolve" + classify(type)
    };
  }

  function chooseModuleName(moduleEntries, moduleName) {
    var underscoredModuleName = Ember.String.underscore(moduleName);

    if (moduleName !== underscoredModuleName && moduleEntries[moduleName] && moduleEntries[underscoredModuleName]) {
      throw new TypeError("Ambiguous module names: `" + moduleName + "` and `" + underscoredModuleName + "`");
    }

    if (moduleEntries[moduleName]) {
      return moduleName;
    } else if (moduleEntries[underscoredModuleName]) {
      return underscoredModuleName;
    } else {
      var parts = moduleName.split('/'),
          lastPart = parts[parts.length - 1],
          partializedModuleName;

      parts[parts.length - 1] = lastPart.replace(/^-/, '_');
      partializedModuleName = parts.join('/');

      if (moduleEntries[partializedModuleName]) {
        Ember.deprecate('Modules should not contain underscores. ' +
                        'Attempted to lookup "'+moduleName+'" which ' +
                        'was not found. Please rename "'+partializedModuleName+'" '+
                        'to "'+moduleName+'" instead.', false);

        return partializedModuleName;
      } else {
        return moduleName;
      }
    }
  }

  function logLookup(found, parsedName, moduleName) {
    if (Ember.ENV.LOG_MODULE_RESOLVER) {
      var symbol, padding;

      if (found) { symbol = '[✓]'; }
      else       { symbol = '[ ]'; }

      if (parsedName.fullName.length > 60) {
        padding = '.';
      } else {
        padding = new Array(60 - parsedName.fullName.length).join('.');
      }

      Ember.Logger.info(symbol, parsedName.fullName, padding, moduleName);
    }
  }

  function resolveRouter(parsedName) {
    /*jshint validthis:true */

    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, _routers = [], router, prefix;

    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;
    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;
    if(typeof prefixes === "string") {
      prefixes = [prefixes];
    }    
    if(typeof podPrefixes === "string") {
      podPrefixes = [podPrefixes];
    }

    moduleEntries = requirejs.entries;

    var pluralizedType = parsedName.type + 's';
    var name = parsedName.fullNameWithoutType;

    Ember.assert('module prefix must be defined', prefixes);
    var Router = Ember.Router.extend();

    for(var p = 0; p < podPrefixes.length; p++) {
      // POD format
      tmpModuleName = podPrefixes[p] + "/" + parsedName.fullNameWithoutType + "/" + parsedName.type;
      if(moduleEntries[tmpModuleName]) {
        router = require(tmpModuleName, null, null, true /* force sync */);
        if(router && router["default"]) { router = router["default"];}
        if(router) { _routers.push(router);}
      }
    }

    if(!moduleName && name === 'main') {
      for(p = 0; p < prefixes.length; p++) {
        tmpModuleName = prefixes[p] + '/' + parsedName.type;
        if (moduleEntries[tmpModuleName]) {
          router = require(tmpModuleName, null, null, true /* force sync */);
          if(router && router["default"]) { router = router["default"];}
          if(router) { _routers.push(router);}
        }
      }
    }

    for(p = 0; p < prefixes.length; p++) {
      tmpModuleName = prefixes[p] + "/" + pluralizedType + "/" + parsedName.fullNameWithoutType;
      if(moduleEntries[tmpModuleName]) {
        router = require(tmpModuleName, null, null, true /* force sync */);
        if(router && router["default"]) { router = router["default"];}
        if(router) {
          _routers.push(router);
        }
      }
    }

    Router.map(function() {
      for(var r = 0; r < _routers.length; r++) {
        _routers[r].apply(this);
      }      
    });

    return Router;
  }

  function resolveMenu(parsedName) {
    /*jshint validthis:true */

    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, _menus = [], menu, prefix;

    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;
    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;
    if(typeof prefixes === "string") {
      prefixes = [prefixes];
    }    
    if(typeof podPrefixes === "string") {
      podPrefixes = [podPrefixes];
    }

    moduleEntries = requirejs.entries;

    var pluralizedType = parsedName.type + 's';
    var name = parsedName.fullNameWithoutType;

    Ember.assert('module prefix must be defined', prefixes);

    for(var p = 0; p < podPrefixes.length; p++) {
      // POD format
      tmpModuleName = podPrefixes[p] + "/" + parsedName.fullNameWithoutType + "/" + parsedName.type;
      if(moduleEntries[tmpModuleName]) {
        menu = require(tmpModuleName, null, null, true /* force sync */);
        if(menu && menu["default"]) { menu = menu["default"];}
        if(menu) { _menus.push(menu);}
      }
    }

    if(!moduleName && name === 'main') {
      for(p = 0; p < prefixes.length; p++) {
        tmpModuleName = prefixes[p] + '/' + parsedName.type;
        if (moduleEntries[tmpModuleName]) {
          menu = require(tmpModuleName, null, null, true /* force sync */);
          if(menu && menu["default"]) { menu = menu["default"];}
          if(menu) { _menus.push(menu);}
        }
      }
    }

    for(p = 0; p < prefixes.length; p++) {
      tmpModuleName = prefixes[p] + "/" + pluralizedType + "/" + parsedName.fullNameWithoutType;
      if(moduleEntries[tmpModuleName]) {
        menu = require(tmpModuleName, null, null, true /* force sync */);
        if(menu && menu["default"]) { menu = menu["default"];}
        if(menu) {
          _menus.push(menu);
        }
      }
    }

    var Menu = Ember.Object.extend();

    var _result = [];
    _menus.forEach(function(_m) {
        _m = _m.create({});
        _m.get("items").forEach(function(_item) {_result.push(_item);});
    });

    _result.sort(function(a,b){return a.get("sort") - b.get("sort");});

    Menu.reopen({
      "menu-items": Ember.A(_result)
    });
      

    return Menu;
  }

  function resolveOther(parsedName) {
    /*jshint validthis:true */

    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, normalizedModuleName, prefix, podPrefix;

    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;
    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;

    if(typeof prefixes === "string") {
      prefixes = [prefixes];
    }    
    if(typeof podPrefixes === "string") {
      podPrefixes = [podPrefixes];
    }

    moduleEntries = requirejs.entries;    

    Ember.assert('module prefix must be defined', prefixes);

    var pluralizedType = parsedName.type + 's';
    var name = parsedName.fullNameWithoutType;

    // lookup using POD formatting first
    for(var p =0; p < podPrefixes.length; p++) {
      podPrefix = podPrefixes[p];
      tmpModuleName = podPrefix + '/' + name + '/' + parsedName.type;
      if (moduleEntries[tmpModuleName]) {
        moduleName = tmpModuleName;
        break;
      }
    }

    // if not using POD format, use the custom prefix
    if (this.namespace[parsedName.type + 'Prefix']) {
      prefixes = [this.namespace[parsedName.type + 'Prefix']];
    }

    // if router:main or adapter:main look for a module with just the type first
    if(!moduleName && name === 'main') {
      for(p = 0; p < prefixes.length; p++) {
        prefix = prefixes[p];
        tmpModuleName = prefix + '/' + parsedName.type;
        if (moduleEntries[tmpModuleName]) {
          moduleName = prefix + '/' + parsedName.type;
          break;
        }
      }
    }

    // fallback if not type:main or POD format
    if (!moduleName) { 
      for(p = 0; p < prefixes.length; p++) {
        prefix = prefixes[p];
        moduleName = prefix + '/' +  pluralizedType + '/' + name;
        normalizedModuleName = chooseModuleName(moduleEntries, moduleName);
        if(moduleEntries[normalizedModuleName]) {
          break;
        }
      }
    } else {
      // allow treat all dashed and all underscored as the same thing
      // supports components with dashes and other stuff with underscores.
      normalizedModuleName = chooseModuleName(moduleEntries, moduleName);
    }

    if (moduleEntries[normalizedModuleName]) {
      var module = require(normalizedModuleName, null, null, true /* force sync */);

      if (module && module['default']) { module = module['default']; }

      if (module === undefined) {
        throw new Error(" Expected to find: '" + parsedName.fullName + "' within '" + normalizedModuleName + "' but got 'undefined'. Did you forget to `export default` within '" + normalizedModuleName + "'?");
      }

      if (this.shouldWrapInClassFactory(module, parsedName)) {
        module = classFactory(module);
      }

      logLookup(true, parsedName, moduleName);
      return module;
    } 
      
    logLookup(false, parsedName, moduleName);
    return this._super(parsedName);
  }
  // Ember.DefaultResolver docs:
  //   https://github.com/emberjs/ember.js/blob/master/packages/ember-application/lib/system/resolver.js
  var Resolver = Ember.DefaultResolver.extend({
    resolveRouter: resolveRouter,
    resolveMenu: resolveMenu,
    resolveOther: resolveOther,
    resolveTemplate: resolveOther,
  /**
    This method is called via the container's resolver method.
    It parses the provided `fullName` and then looks up and
    returns the appropriate template or class.

    @method resolve
    @param {String} fullName the lookup string
    @return {Object} the resolved factory
  */
  resolve: function(fullName) {
    var parsedName = this.parseName(fullName),
        resolveMethodName = parsedName.resolveMethodName;

    if (!(parsedName.name && parsedName.type)) {
      throw new TypeError("Invalid fullName: `" + fullName + "`, must be of the form `type:name` ");
    }

    if (this[resolveMethodName]) {
      var resolved = this[resolveMethodName](parsedName);
      if (resolved) { return resolved; }
    }
    return this.resolveOther(parsedName);
  },
  /**
    Returns a human-readable description for a fullName. Used by the
    Application namespace in assertions to describe the
    precise name of the class that Ember is looking for, rather than
    container keys.

    @protected
    @param {String} fullName the lookup string
    @method lookupDescription
  */
  lookupDescription: function(fullName) {
    var parsedName = this.parseName(fullName);

    if (parsedName.type === 'template') {
      return "template at " + parsedName.fullNameWithoutType.replace(/\./g, '/');
    }

    var description = parsedName.root + "." + classify(parsedName.name);
    if (parsedName.type !== 'model') { description += classify(parsedName.type); }

    return description;
  },

    makeToString: function(factory, fullName) {
      return '' + this.namespace.modulePrefix + '@' + fullName + ':';
    },
    parseName: parseName,
    shouldWrapInClassFactory: function(module, parsedName){
      return false;
    },
    normalize: function(fullName) {
      // replace `.` with `/` in order to make nested controllers work in the following cases
      // 1. `needs: ['posts/post']`
      // 2. `{{render "posts/post"}}`
      // 3. `this.render('posts/post')` from Route
      var split = fullName.split(':');
      if (split.length > 1) {
        return split[0] + ':' + Ember.String.dasherize(split[1].replace(/\./g, '/'));
      } else {
        return fullName;
      }
    }
  });

  Resolver['default'] = Resolver;
  return Resolver;
});

define("resolver",
  ["ember/resolver"],
  function (Resolver) {
    Ember.deprecate('Importing/requiring Ember Resolver as "resolver" is deprecated, please use "ember/resolver" instead');
    return Resolver;
  });

})();



(function() {
/*globals define registry requirejs */

define("ember/container-debug-adapter",
  [],
  function() {
    "use strict";

  // Support Ember < 1.5-beta.4
  // TODO: Remove this after 1.5.0 is released
  if (typeof Ember.ContainerDebugAdapter === 'undefined') {
    return null;
  }
  /*
   * This module defines a subclass of Ember.ContainerDebugAdapter that adds two
   * important features:
   *
   *  1) is able provide injections to classes that implement `extend`
   *     (as is typical with Ember).
   */

  var ContainerDebugAdapter = Ember.ContainerDebugAdapter.extend({
    /**
      The container of the application being debugged.
      This property will be injected
      on creation.

      @property container
      @default null
    */
    // container: null, LIVES IN PARENT

    /**
      The resolver instance of the application
      being debugged. This property will be injected
      on creation.

      @property resolver
      @default null
    */
    // resolver: null,  LIVES IN PARENT
    /**
      Returns true if it is possible to catalog a list of available
      classes in the resolver for a given type.

      @method canCatalogEntriesByType
      @param {string} type The type. e.g. "model", "controller", "route"
      @return {boolean} whether a list is available for this type.
    */
    canCatalogEntriesByType: function(type) {
      return true;
    },

    /**
      Returns the available classes a given type.

      @method catalogEntriesByType
      @param {string} type The type. e.g. "model", "controller", "route"
      @return {Array} An array of classes.
    */
    catalogEntriesByType: function(type) {
      var entries = requirejs.entries,
          module,
          types = Ember.A();

      var makeToString = function(){
        return this.shortname;
      };

      for(var key in entries) {
        if(entries.hasOwnProperty(key) && key.indexOf(type) !== -1)
        {
          // // TODO return the name instead of the module itself
          // module = require(key, null, null, true);

          // if (module && module['default']) { module = module['default']; }
          // module.shortname = key.split(type +'s/').pop();
          // module.toString = makeToString;

          // types.push(module);
          types.push(key.split(type +'s/').pop());
        }
      }

      return types;
    }
  });

  ContainerDebugAdapter['default'] = ContainerDebugAdapter;
  return ContainerDebugAdapter;
});

})();



(function() {
(function() {
  "use strict";

  Ember.Application.initializer({
    name: 'container-debug-adapter',

    initialize: function(container) {
      var ContainerDebugAdapter = require('ember/container-debug-adapter');
      var Resolver = require('ember/resolver');

      container.register('container-debug-adapter:main', ContainerDebugAdapter);
    }
  });
}());

})();



(function() {

})();

