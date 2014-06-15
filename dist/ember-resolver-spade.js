// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: Copyright 2013 Stefan Penner and Ember App Kit Contributors
// License:   Licensed under MIT license
//            See https://raw.github.com/stefanpenner/ember-jj-abrams-resolver/master/LICENSE
// ==========================================================================


minispade.register('ember-resolver/container-debug-adapter', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/container-debug-adapter\",\n  [],\n  function() {\n    \"use strict\";\n\n  // Support Ember < 1.5-beta.4\n  // TODO: Remove this after 1.5.0 is released\n  if (typeof Ember.ContainerDebugAdapter === 'undefined') {\n    return null;\n  }\n  /*\n   * This module defines a subclass of Ember.ContainerDebugAdapter that adds two\n   * important features:\n   *\n   *  1) is able provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  var ContainerDebugAdapter = Ember.ContainerDebugAdapter.extend({\n    /**\n      The container of the application being debugged.\n      This property will be injected\n      on creation.\n\n      @property container\n      @default null\n    */\n    // container: null, LIVES IN PARENT\n\n    /**\n      The resolver instance of the application\n      being debugged. This property will be injected\n      on creation.\n\n      @property resolver\n      @default null\n    */\n    // resolver: null,  LIVES IN PARENT\n    /**\n      Returns true if it is possible to catalog a list of available\n      classes in the resolver for a given type.\n\n      @method canCatalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {boolean} whether a list is available for this type.\n    */\n    canCatalogEntriesByType: function(type) {\n      return true;\n    },\n\n    /**\n      Returns the available classes a given type.\n\n      @method catalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {Array} An array of classes.\n    */\n    catalogEntriesByType: function(type) {\n      var entries = requirejs.entries,\n          module,\n          types = Ember.A();\n\n      var makeToString = function(){\n        return this.shortname;\n      };\n\n      for(var key in entries) {\n        if(entries.hasOwnProperty(key) && key.indexOf(type) !== -1)\n        {\n          // // TODO return the name instead of the module itself\n          // module = require(key, null, null, true);\n\n          // if (module && module['default']) { module = module['default']; }\n          // module.shortname = key.split(type +'s/').pop();\n          // module.toString = makeToString;\n\n          // types.push(module);\n          types.push(key.split(type +'s/').pop());\n        }\n      }\n\n      return types;\n    }\n  });\n\n  ContainerDebugAdapter['default'] = ContainerDebugAdapter;\n  return ContainerDebugAdapter;\n});\n\n})();\n//@ sourceURL=ember-resolver/container-debug-adapter");minispade.register('ember-resolver/core', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/resolver\",\n  [],\n  function() {\n    \"use strict\";\n\n    if (typeof requirejs.entries === 'undefined') {\n      requirejs.entries = requirejs._eak_seen;\n    }\n\n  /*\n   * This module defines a subclass of Ember.DefaultResolver that adds two\n   * important features:\n   *\n   *  1) The resolver makes the container aware of es6 modules via the AMD\n   *     output. The loader's _moduleEntries is consulted so that classes can be\n   *     resolved directly via the module loader, without needing a manual\n   *     `import`.\n   *  2) is able provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  function classFactory(klass) {\n    return {\n      create: function (injections) {\n        if (typeof klass.extend === 'function') {\n          return klass.extend(injections);\n        } else {\n          return klass;\n        }\n      }\n    };\n  }\n\n  var underscore = Ember.String.underscore;\n  var classify = Ember.String.classify;\n  var get = Ember.get;\n\n  function parseName(fullName) {\n    /*jshint validthis:true */\n\n    var nameParts = fullName.split(\":\"),\n        type = nameParts[0], fullNameWithoutType = nameParts[1],\n        name = fullNameWithoutType,\n        namespace = get(this, 'namespace'),\n        root = namespace;\n\n    return {\n      fullName: fullName,\n      type: type,\n      fullNameWithoutType: fullNameWithoutType,\n      name: name,\n      root: root,\n      resolveMethodName: \"resolve\" + classify(type)\n    };\n  }\n\n  function chooseModuleName(moduleEntries, moduleName) {\n    var underscoredModuleName = Ember.String.underscore(moduleName);\n\n    if (moduleName !== underscoredModuleName && moduleEntries[moduleName] && moduleEntries[underscoredModuleName]) {\n      throw new TypeError(\"Ambiguous module names: `\" + moduleName + \"` and `\" + underscoredModuleName + \"`\");\n    }\n\n    if (moduleEntries[moduleName]) {\n      return moduleName;\n    } else if (moduleEntries[underscoredModuleName]) {\n      return underscoredModuleName;\n    } else {\n      var parts = moduleName.split('/'),\n          lastPart = parts[parts.length - 1],\n          partializedModuleName;\n\n      parts[parts.length - 1] = lastPart.replace(/^-/, '_');\n      partializedModuleName = parts.join('/');\n\n      if (moduleEntries[partializedModuleName]) {\n        Ember.deprecate('Modules should not contain underscores. ' +\n                        'Attempted to lookup \"'+moduleName+'\" which ' +\n                        'was not found. Please rename \"'+partializedModuleName+'\" '+\n                        'to \"'+moduleName+'\" instead.', false);\n\n        return partializedModuleName;\n      } else {\n        return moduleName;\n      }\n    }\n  }\n\n  function logLookup(found, parsedName, moduleName) {\n    if (Ember.ENV.LOG_MODULE_RESOLVER) {\n      var symbol, padding;\n\n      if (found) { symbol = '[✓]'; }\n      else       { symbol = '[ ]'; }\n\n      if (parsedName.fullName.length > 60) {\n        padding = '.';\n      } else {\n        padding = new Array(60 - parsedName.fullName.length).join('.');\n      }\n\n      Ember.Logger.info(symbol, parsedName.fullName, padding, moduleName);\n    }\n  }\n\n  function resolveRouter(parsedName) {\n    /*jshint validthis:true */\n\n    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, _routers = [], router, prefix;\n\n    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;\n    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;\n    if(typeof prefixes === \"string\") {\n      prefixes = [prefixes];\n    }    \n    if(typeof podPrefixes === \"string\") {\n      podPrefixes = [podPrefixes];\n    }\n\n    moduleEntries = requirejs.entries;\n\n    var pluralizedType = parsedName.type + 's';\n    var name = parsedName.fullNameWithoutType;\n\n    Ember.assert('module prefix must be defined', prefixes);\n    var Router = Ember.Router.extend();\n\n    for(var p = 0; p < podPrefixes.length; p++) {\n      // POD format\n      tmpModuleName = podPrefixes[p] + \"/\" + parsedName.fullNameWithoutType + \"/\" + parsedName.type;\n      if(moduleEntries[tmpModuleName]) {\n        router = require(tmpModuleName, null, null, true /* force sync */);\n        if(router && router[\"default\"]) { router = router[\"default\"];}\n        if(router) { _routers.push(router);}\n      }\n    }\n\n    if(!moduleName && name === 'main') {\n      for(p = 0; p < prefixes.length; p++) {\n        tmpModuleName = prefixes[p] + '/' + parsedName.type;\n        if (moduleEntries[tmpModuleName]) {\n          router = require(tmpModuleName, null, null, true /* force sync */);\n          if(router && router[\"default\"]) { router = router[\"default\"];}\n          if(router) { _routers.push(router);}\n        }\n      }\n    }\n\n    for(p = 0; p < prefixes.length; p++) {\n      tmpModuleName = prefixes[p] + \"/\" + pluralizedType + \"/\" + parsedName.fullNameWithoutType;\n      if(moduleEntries[tmpModuleName]) {\n        router = require(tmpModuleName, null, null, true /* force sync */);\n        if(router && router[\"default\"]) { router = router[\"default\"];}\n        if(router) {\n          _routers.push(router);\n        }\n      }\n    }\n\n    Router.map(function() {\n      for(var r = 0; r < _routers.length; r++) {\n        _routers[r].apply(this);\n      }      \n    });\n\n    return Router;\n  }\n\n  function resolveMenu(parsedName) {\n    /*jshint validthis:true */\n\n    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, _menus = [], menu, prefix;\n\n    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;\n    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;\n    if(typeof prefixes === \"string\") {\n      prefixes = [prefixes];\n    }    \n    if(typeof podPrefixes === \"string\") {\n      podPrefixes = [podPrefixes];\n    }\n\n    moduleEntries = requirejs.entries;\n\n    var pluralizedType = parsedName.type + 's';\n    var name = parsedName.fullNameWithoutType;\n\n    Ember.assert('module prefix must be defined', prefixes);\n\n    for(var p = 0; p < podPrefixes.length; p++) {\n      // POD format\n      tmpModuleName = podPrefixes[p] + \"/\" + parsedName.fullNameWithoutType + \"/\" + parsedName.type;\n      if(moduleEntries[tmpModuleName]) {\n        menu = require(tmpModuleName, null, null, true /* force sync */);\n        if(menu && menu[\"default\"]) { menu = menu[\"default\"];}\n        if(menu) { _menus.push(menu);}\n      }\n    }\n\n    if(!moduleName && name === 'main') {\n      for(p = 0; p < prefixes.length; p++) {\n        tmpModuleName = prefixes[p] + '/' + parsedName.type;\n        if (moduleEntries[tmpModuleName]) {\n          menu = require(tmpModuleName, null, null, true /* force sync */);\n          if(menu && menu[\"default\"]) { menu = menu[\"default\"];}\n          if(menu) { _menus.push(menu);}\n        }\n      }\n    }\n\n    for(p = 0; p < prefixes.length; p++) {\n      tmpModuleName = prefixes[p] + \"/\" + pluralizedType + \"/\" + parsedName.fullNameWithoutType;\n      if(moduleEntries[tmpModuleName]) {\n        menu = require(tmpModuleName, null, null, true /* force sync */);\n        if(menu && menu[\"default\"]) { menu = menu[\"default\"];}\n        if(menu) {\n          _menus.push(menu);\n        }\n      }\n    }\n\n    var Menu = Ember.Object.extend();\n\n    var _result = [];\n    _menus.forEach(function(_m) {\n        _m = _m.create({});\n        _m.get(\"items\").forEach(function(_item) {_result.push(_item);});\n    });\n\n    _result.sort(function(a,b){return a.get(\"sort\") - b.get(\"sort\");});\n\n    Menu.reopen({\n      \"menu-items\": Ember.A(_result)\n    });\n      \n\n    return Menu;\n  }\n\n  function resolveString(parsedName) {\n    /*jshint validthis:true */\n\n    var l, moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, _strs = [], str, prefix;\n\n    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;\n    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;\n    if(typeof prefixes === \"string\") {\n      prefixes = [prefixes];\n    }    \n    if(typeof podPrefixes === \"string\") {\n      podPrefixes = [podPrefixes];\n    }\n\n    moduleEntries = requirejs.entries;\n\n    var pluralizedType = parsedName.type + 's';\n    var name = parsedName.fullNameWithoutType;\n\n    Ember.assert('module prefix must be defined', prefixes);\n\n    for(var p = 0; p < podPrefixes.length; p++) {\n      // POD format\n      tmpModuleName = podPrefixes[p] + \"/\" + parsedName.fullNameWithoutType + \"/\" + parsedName.type;\n      if(moduleEntries[tmpModuleName]) {\n        str = require(tmpModuleName, null, null, true /* force sync */);\n        if(str && str[\"default\"]) { str = str[\"default\"];}\n        if(str) { _strs.push(str);}\n      }\n    }\n\n    if(!moduleName && name === 'main') {\n      for(p = 0; p < prefixes.length; p++) {\n        tmpModuleName = prefixes[p] + '/' + parsedName.type;\n        if (moduleEntries[tmpModuleName]) {\n          str = require(tmpModuleName, null, null, true /* force sync */);\n          if(str && str[\"default\"]) { str = str[\"default\"];}\n          if(str) { _strs.push(str);}\n        }\n      }\n    }\n\n    for(p = 0; p < prefixes.length; p++) {\n      tmpModuleName = prefixes[p] + \"/\" + pluralizedType + \"/\" + parsedName.fullNameWithoutType;\n      if(moduleEntries[tmpModuleName]) {\n        str = require(tmpModuleName, null, null, true /* force sync */);\n        if(str && str[\"default\"]) { str = str[\"default\"];}\n        if(str) {\n          _strs.push(str);\n        }\n      }\n    }\n\n    var str = {};\n\n    var _result = [];\n    _strs.forEach(function(_s) {\n        for(l in _s) {\n          str[l] = str[l] || {};\n          $.extend(str[l],_s[l]);\n        }\n    });\n\n    return str;\n  }\n\n  function resolveOther(parsedName) {\n    /*jshint validthis:true */\n\n    var moduleName, tmpModuleName, prefixes, podPrefixes, moduleEntries, normalizedModuleName, prefix, podPrefix;\n\n    prefixes = this.namespace.modulePrefix || this.namespace.modulePrefixes;\n    podPrefixes = this.namespace.podModulePrefix || this.namespace.podModulePrefixes || prefixes;\n\n    if(typeof prefixes === \"string\") {\n      prefixes = [prefixes];\n    }    \n    if(typeof podPrefixes === \"string\") {\n      podPrefixes = [podPrefixes];\n    }\n\n    moduleEntries = requirejs.entries;    \n\n    Ember.assert('module prefix must be defined', prefixes);\n\n    var pluralizedType = parsedName.type + 's';\n    var name = parsedName.fullNameWithoutType;\n\n    // lookup using POD formatting first\n    for(var p =0; p < podPrefixes.length; p++) {\n      podPrefix = podPrefixes[p];\n      tmpModuleName = podPrefix + '/' + name + '/' + parsedName.type;\n      if (moduleEntries[tmpModuleName]) {\n        moduleName = tmpModuleName;\n        break;\n      }\n    }\n\n    // if not using POD format, use the custom prefix\n    if (this.namespace[parsedName.type + 'Prefix']) {\n      prefixes = [this.namespace[parsedName.type + 'Prefix']];\n    }\n\n    // if router:main or adapter:main look for a module with just the type first\n    if(!moduleName && name === 'main') {\n      for(p = 0; p < prefixes.length; p++) {\n        prefix = prefixes[p];\n        tmpModuleName = prefix + '/' + parsedName.type;\n        if (moduleEntries[tmpModuleName]) {\n          moduleName = prefix + '/' + parsedName.type;\n          break;\n        }\n      }\n    }\n\n    // fallback if not type:main or POD format\n    if (!moduleName) { \n      for(p = 0; p < prefixes.length; p++) {\n        prefix = prefixes[p];\n        moduleName = prefix + '/' +  pluralizedType + '/' + name;\n        normalizedModuleName = chooseModuleName(moduleEntries, moduleName);\n        if(moduleEntries[normalizedModuleName]) {\n          break;\n        }\n      }\n    } else {\n      // allow treat all dashed and all underscored as the same thing\n      // supports components with dashes and other stuff with underscores.\n      normalizedModuleName = chooseModuleName(moduleEntries, moduleName);\n    }\n\n    if (moduleEntries[normalizedModuleName]) {\n      var module = require(normalizedModuleName, null, null, true /* force sync */);\n\n      if (module && module['default']) { module = module['default']; }\n\n      if (module === undefined) {\n        throw new Error(\" Expected to find: '\" + parsedName.fullName + \"' within '\" + normalizedModuleName + \"' but got 'undefined'. Did you forget to `export default` within '\" + normalizedModuleName + \"'?\");\n      }\n\n      if (this.shouldWrapInClassFactory(module, parsedName)) {\n        module = classFactory(module);\n      }\n\n      logLookup(true, parsedName, moduleName);\n      return module;\n    } \n      \n    logLookup(false, parsedName, moduleName);\n    return this._super(parsedName);\n  }\n  // Ember.DefaultResolver docs:\n  //   https://github.com/emberjs/ember.js/blob/master/packages/ember-application/lib/system/resolver.js\n  var Resolver = Ember.DefaultResolver.extend({\n    resolveRouter: resolveRouter,\n    resolveString: resolveString,\n    resolveMenu: resolveMenu,\n    resolveOther: resolveOther,\n    resolveTemplate: resolveOther,\n  /**\n    This method is called via the container's resolver method.\n    It parses the provided `fullName` and then looks up and\n    returns the appropriate template or class.\n\n    @method resolve\n    @param {String} fullName the lookup string\n    @return {Object} the resolved factory\n  */\n  resolve: function(fullName) {\n    var parsedName = this.parseName(fullName),\n        resolveMethodName = parsedName.resolveMethodName;\n\n    if (!(parsedName.name && parsedName.type)) {\n      throw new TypeError(\"Invalid fullName: `\" + fullName + \"`, must be of the form `type:name` \");\n    }\n\n    if (this[resolveMethodName]) {\n      var resolved = this[resolveMethodName](parsedName);\n      if (resolved) { return resolved; }\n    }\n    return this.resolveOther(parsedName);\n  },\n  /**\n    Returns a human-readable description for a fullName. Used by the\n    Application namespace in assertions to describe the\n    precise name of the class that Ember is looking for, rather than\n    container keys.\n\n    @protected\n    @param {String} fullName the lookup string\n    @method lookupDescription\n  */\n  lookupDescription: function(fullName) {\n    var parsedName = this.parseName(fullName);\n\n    if (parsedName.type === 'template') {\n      return \"template at \" + parsedName.fullNameWithoutType.replace(/\\./g, '/');\n    }\n\n    var description = parsedName.root + \".\" + classify(parsedName.name);\n    if (parsedName.type !== 'model') { description += classify(parsedName.type); }\n\n    return description;\n  },\n\n    makeToString: function(factory, fullName) {\n      return '' + this.namespace.modulePrefix + '@' + fullName + ':';\n    },\n    parseName: parseName,\n    shouldWrapInClassFactory: function(module, parsedName){\n      return false;\n    },\n    normalize: function(fullName) {\n      // replace `.` with `/` in order to make nested controllers work in the following cases\n      // 1. `needs: ['posts/post']`\n      // 2. `{{render \"posts/post\"}}`\n      // 3. `this.render('posts/post')` from Route\n      var split = fullName.split(':');\n      if (split.length > 1) {\n        return split[0] + ':' + Ember.String.dasherize(split[1].replace(/\\./g, '/'));\n      } else {\n        return fullName;\n      }\n    }\n  });\n\n  Resolver['default'] = Resolver;\n  return Resolver;\n});\n\ndefine(\"resolver\",\n  [\"ember/resolver\"],\n  function (Resolver) {\n    Ember.deprecate('Importing/requiring Ember Resolver as \"resolver\" is deprecated, please use \"ember/resolver\" instead');\n    return Resolver;\n  });\n\n})();\n//@ sourceURL=ember-resolver/core");minispade.register('ember-resolver/initializers', "(function() {(function() {\n  \"use strict\";\n\n  Ember.Application.initializer({\n    name: 'container-debug-adapter',\n\n    initialize: function(container) {\n      var ContainerDebugAdapter = require('ember/container-debug-adapter');\n      var Resolver = require('ember/resolver');\n\n      container.register('container-debug-adapter:main', ContainerDebugAdapter);\n    }\n  });\n}());\n\n})();\n//@ sourceURL=ember-resolver/initializers");minispade.register('ember-resolver', "(function() {minispade.require('ember-resolver/core');\nminispade.require('ember-resolver/container-debug-adapter');\nminispade.require('ember-resolver/initializers');\n\n})();\n//@ sourceURL=ember-resolver");