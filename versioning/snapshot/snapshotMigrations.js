/**
 * Snapshot migrations — supports forward migration of snapshot schema versions.
 * Each migration is a pure function: oldSnapshot → newSnapshot.
 * Migrations are composed deterministically.
 * @module vcSnapshotMigrations
 * @dependencies vcSnapshotSerializer
 */
// versioning/snapshot/snapshotMigrations.js
// DEPENDS ON: versioning/snapshot/snapshotSerializer.js
// MUST LOAD AFTER: versioning/snapshot/snapshotSerializer.js
// MUST LOAD BEFORE: versioning/repositoryStore.js

var vcSnapshotMigrations = (function() {

  var CURRENT_VERSION = vcSnapshotSchema.CURRENT_GRAPH_SCHEMA_VERSION;

  /**
   * Migration registry: maps from-version to migration function.
   * Each function receives a snapshot and returns a migrated snapshot.
   */
  var _migrations = {};

  /**
   * Migrates a snapshot from one version to another.
   * Composes all migrations between fromVersion and toVersion.
   * @param {Object} snapshot
   * @param {number} fromVersion
   * @param {number} toVersion
   * @returns {{ok: boolean, snapshot: Object|null, error: string|null}}
   */
  function migrate(snapshot, fromVersion, toVersion) {
    if (fromVersion === toVersion) {
      return { ok: true, snapshot: snapshot, error: null };
    }

    if (fromVersion > toVersion) {
      return { ok: false, snapshot: null, error: 'Cannot downgrade snapshot schema' };
    }

    var current = snapshot;
    for (var v = fromVersion; v < toVersion; v++) {
      var migrator = _migrations[v];
      if (!migrator) {
        return {
          ok: false,
          snapshot: null,
          error: 'No migration path from version ' + v + ' to ' + (v + 1)
        };
      }
      try {
        current = migrator(current);
      } catch (e) {
        return {
          ok: false,
          snapshot: null,
          error: 'Migration failed at version ' + v + ': ' + (e.message || String(e))
        };
      }
    }

    return { ok: true, snapshot: current, error: null };
  }

  /**
   * Registers a migration function.
   * @param {number} fromVersion
   * @param {function(Object): Object} migrationFn
   */
  function register(fromVersion, migrationFn) {
    _migrations[fromVersion] = migrationFn;
  }

  /**
   * Migrates and re-validates a snapshot to the current version.
   * @param {Object} snapshot
   * @returns {{ok: boolean, snapshot: Object|null, errors: string[]}}
   */
  function ensureCurrent(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return { ok: false, snapshot: null, errors: ['Invalid snapshot object'] };
    }

    var version = snapshot.graphSchemaVersion || 0;

    if (version === CURRENT_VERSION) {
      var validation = vcSnapshotSerializer.validate(snapshot);
      if (!validation.ok) {
        return { ok: false, snapshot: null, errors: validation.errors };
      }
      return { ok: true, snapshot: snapshot, errors: [] };
    }

    var migrationResult = migrate(snapshot, version, CURRENT_VERSION);
    if (!migrationResult.ok) {
      return { ok: false, snapshot: null, errors: [migrationResult.error] };
    }

    var migratedValidation = vcSnapshotSerializer.validate(migrationResult.snapshot);
    if (!migratedValidation.ok) {
      return { ok: false, snapshot: null, errors: migratedValidation.errors };
    }

    return { ok: true, snapshot: migrationResult.snapshot, errors: [] };
  }

  return {
    CURRENT_VERSION: CURRENT_VERSION,
    migrate: migrate,
    register: register,
    ensureCurrent: ensureCurrent
  };

})();
