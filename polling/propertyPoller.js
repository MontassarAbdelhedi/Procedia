/**
 * Property poller entry point — composes affected-node and effector-node
 * polling into a single API consumed by poller.js.
 * Depends on: polling/pollAffected.js, polling/pollEffectors.js
 * Exports: propertyPoller.poll, propertyPoller.pollEffects
 */
// polling/propertyPoller.js
// DEPENDS ON: polling/pollAffected.js, polling/pollEffectors.js
// MUST LOAD BEFORE: polling/poller.js

var propertyPoller = (function() {

  return {
    poll: propertyPollAffected.poll,
    pollEffects: propertyPollEffectors.pollEffects
  };

})();
