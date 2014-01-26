# Ember JJ-Abrams Resolver

This project is tracking a new resolver based on ES6 semantics that has been extracted from (and used by) the following projects:

* https://github.com/stefanpenner/ember-app-kit
* https://github.com/dockyard/ember-appkit-rails

## Goal

The goal of this project is to come up with a new default resolver for the next major version of `Ember` (2.0).

## Artoo Notes

* Since we load multiple apps via Portkey, when we are resolving we need to look for components across all apps (e.g. app1/controller/foo, app2/controller/foo) and also check in the ```artoo``` common namespace.

* We have also modified the ```resolveRouter()``` to construct the ```App.Router``` object by passing ```this``` to all the apps routers

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