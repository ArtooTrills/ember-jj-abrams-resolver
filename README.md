# Ember JJ-Abrams Resolver [![Build Status](https://travis-ci.org/stefanpenner/ember-jj-abrams-resolver.png?branch=master)](https://travis-ci.org/stefanpenner/ember-jj-abrams-resolver)

This project is tracking a new resolver based on ES6 semantics that has been extracted from (and used by) the following projects:

* https://github.com/stefanpenner/ember-app-kit
* https://github.com/dockyard/ember-appkit-rails

## Goal

The goal of this project is to come up with a new default resolver for the next major version of `Ember` (2.0).

## Artoo Notes

* Since we load multiple apps via Portkey, when we are resolving we need to look for components across all apps (e.g. app1/controller/foo, app2/controller/foo) and also check in the ```artoo``` common namespace.

* We have also modified the ```resolveRouter()``` to construct the ```App.Router``` object by passing ```this``` to all the apps routers

* We have added ```resolveMenu()``` which looks for ```menu.js``` across all modules. It concats an array and sorts it based on the ```sort``` field ascending. This object is used in the IndexRoute of the application to draw the menus.

#### Developer
----------

##### Installation

```
	bower install
	bundle install --deployment
```

##### Testing
```
	bundle exec rake test[all]
```

##### Release
```
	bundle exec rake dist
```
