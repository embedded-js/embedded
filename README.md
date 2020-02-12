## j5e – Johnny Five for Embedded Systems
j5e is a device framework built for ECMA TC-53's IO pattern. j5e's API is based on the [Johnny-Five](https://github.com/rwaldron.johnny-five) API which has been battle tested over quite some time. 

Right now, the only provider that matches the ECMA TC-53 IO pattern is [Moddable's IO module for XS](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/io/io.md) which runs on the ESP 8266, but we should see more soon. 

*This project is very much in a "pre-alpha" state so use at your own risk.*

j5e in action
````js
import Led from "@j5e/led";

(async function() {
  const led = await new Led(14);
  led.blink();
})();
````

New users should check out the [Getting Started](https://github.com/dtex/j5e/blob/master/examples/GETSTARTED.md) guide.

## j5e Anatomy 101
One goal of j5e is write once, run anywhere. We are having to build toward this goal before most TC-53 IO conformant platforms even exist. To this end we've settled on node.js compatability as our primary target, with a build step that will generate distributions for other platforms programmatically. The JS is all the same across platforms, but the project structure has to change in order to work with differeing implementations of ECMAScript Modules (package.json vs manifest.json and inconsistent module resolution schemes).

### It's a Mono-Repo
In order to resolve module paths by ```namespace/modulename``` in node.js (eg ```@j5e/led```), each module needs to be its own package under the ```@j5e``` namespace, which is an npm organization. Rather than having a seperate repo for what could end up being hundreds of modules we're using lerna to manage the different packages. Each module/package is contained in its own directory within ```/packages/```. If you've cloned the repo and need to do some work on it, make sure you run ```lerna bootstrap``` to get all the intradependencies wired up properly and then run ```npm install``` to get all the packages needed for dev.

### Documentation
[Documentation](https://dtex.github.io/j5e/) is handled using [JSDoc](https://jsdoc.app/). Nothing in the ```docs``` folder should be edited directly. It is generated from comments in the code and some md files in the examples folder. To generate new documentation run ```npm run docs```.

### Build Process
Creating new builds for the dist folder is handled with simple node.js script (no task runner). A build script is necessary for every platform except node.js. To generate new dists, jus run ```npm run dist```.