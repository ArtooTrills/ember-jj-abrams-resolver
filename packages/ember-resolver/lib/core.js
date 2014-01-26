/*globals define registry requirejs */

define("resolver",
  [],
  function() {
    "use strict";
  /*
   * This module defines a subclass of Ember.DefaultResolver that adds two
   * important features:
   *
   *  1) The resolver makes the container aware of es6 modules via the AMD
   *     output. The loader's _seen is consulted so that classes can be
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

  function chooseModuleName(seen, moduleName) {
    var underscoredModuleName = Ember.String.underscore(moduleName);

    if (moduleName !== underscoredModuleName && seen[moduleName] && seen[underscoredModuleName]) {
      throw new TypeError("Ambiguous module names: `" + moduleName + "` and `" + underscoredModuleName + "`");
    }

    if (seen[moduleName]) {
      return moduleName;
    } else if (seen[underscoredModuleName]) {
      return underscoredModuleName;
    } else {
      return moduleName;
    }
  }

  function logLookup(found, parsedName, moduleName) {
    if (Ember.ENV.LOG_MODULE_RESOLVER) {
      var symbol;

      if (found) { symbol = '[✓]'; }
      else       { symbol = '[ ]'; }

      Ember.Logger.info(symbol, parsedName.fullName, new Array(40 - parsedName.fullName.length).join('.'), moduleName);
    }
  }

  function resolveRouter(parsedName) {
    /*jshint validthis:true */

    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleRegistry, _routers = [], router, prefix;

    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;
    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;
    if(typeof prefixes === "string") {
      prefixes = [prefixes];
    }    
    if(typeof podPrefixes === "string") {
      podPrefixes = [podPrefixes];
    }

    moduleRegistry = requirejs._eak_seen;

    var pluralizedType = parsedName.type + 's';
    var name = parsedName.fullNameWithoutType;

    Ember.assert('module prefix must be defined', prefixes);
    var Router = Ember.Router.extend();

    for(var p = 0; p < podPrefixes.length; p++) {
      // POD format
      tmpModuleName = podPrefixes[p] + "/" + parsedName.fullNameWithoutType + "/" + parsedName.type;
      if(moduleRegistry[tmpModuleName]) {
        router = require(tmpModuleName, null, null, true /* force sync */);
        if(router && router["default"]) { router = router["default"];}
        if(router) { _routers.push(router);}
      }
    }

    if(!moduleName && name === 'main') {
      for(p = 0; p < prefixes.length; p++) {
        tmpModuleName = prefixes[p] + '/' + parsedName.type;
        if (moduleRegistry[tmpModuleName]) {
          router = require(tmpModuleName, null, null, true /* force sync */);
          if(router && router["default"]) { router = router["default"];}
          if(router) { _routers.push(router);}
        }
      }
    }

    for(p = 0; p < prefixes.length; p++) {
      tmpModuleName = prefixes[p] + "/" + pluralizedType + "/" + parsedName.fullNameWithoutType;
      if(moduleRegistry[tmpModuleName]) {
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

  function resolveOther(parsedName) {
    /*jshint validthis:true */

    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleRegistry, normalizedModuleName, prefix, podPrefix;

    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;
    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;

    if(typeof prefixes === "string") {
      prefixes = [prefixes];
    }    
    if(typeof podPrefixes === "string") {
      podPrefixes = [podPrefixes];
    }

    moduleRegistry = requirejs._eak_seen;    

    Ember.assert('module prefix must be defined', prefixes);

    var pluralizedType = parsedName.type + 's';
    var name = parsedName.fullNameWithoutType;

    // lookup using POD formatting first
    for(var p =0; p < podPrefixes.length; p++) {
      podPrefix = podPrefixes[p];
      tmpModuleName = podPrefix + '/' + name + '/' + parsedName.type;
      if (moduleRegistry[tmpModuleName]) {
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
        if (moduleRegistry[tmpModuleName]) {
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
        normalizedModuleName = chooseModuleName(moduleRegistry, moduleName);
        if(moduleRegistry[normalizedModuleName]) {
          break;
        }
      }
    } else {
      // allow treat all dashed and all underscored as the same thing
      // supports components with dashes and other stuff with underscores.
      normalizedModuleName = chooseModuleName(moduleRegistry, moduleName);
    }    

    if (moduleRegistry[normalizedModuleName]) {
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
    resolveTemplate: resolveOther,
    resolveOther: resolveOther,
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
