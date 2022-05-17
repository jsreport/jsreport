# reap

Removed ms package vulnerability from https://github.com/visionmedia/reap

The original reap module's repo is not available. It seems to be deleted. But it has a vulnerability with its dependency ms. Vulnerability -> https://nodesecurity.io/advisories/46 The vulnerability in ms package was patched in versions > 7.0.0 but since the original repo is deleted I am upgrading ms and creating this new repository so that the packages dependent on reap are not affected.
