/**
 * Repository store — composite module that re-exports all repository
 * sub-modules under a single backward-compatible namespace.
 *
 * All mutations go through the sub-modules loaded under versioning/repository/.
 * @module vcRepositoryStore
 * @dependencies vcRepoCore, vcRepoSnapshots, vcRepoRevisions, vcRepoBranchCRUD,
 *               vcRepoBranchState, vcRepoArtifacts, vcRepoInvariants
 */
// versioning/repositoryStore.js
// DEPENDS ON: versioning/repository/storeCore.js,
//             versioning/repository/snapshots.js,
//             versioning/repository/revisions.js,
//             versioning/repository/branchCRUD.js,
//             versioning/repository/branchState.js,
//             versioning/repository/artifacts.js,
//             versioning/repository/invariants.js
// MUST LOAD BEFORE: versioning/branchService.js

var vcRepositoryStore = (function() {

  return {
    // Init / access (core)
    initRepository: vcRepoCore.initRepository,
    getRepository: vcRepoCore.getRepository,
    setRepository: vcRepoCore.setRepository,
    hasRepository: vcRepoCore.hasRepository,

    // Snapshots
    storeSnapshot: vcRepoSnapshots.storeSnapshot,
    getSnapshot: vcRepoSnapshots.getSnapshot,

    // Revisions
    createRevision: vcRepoRevisions.createRevision,
    getRevision: vcRepoRevisions.getRevision,
    getAllRevisions: vcRepoRevisions.getAllRevisions,

    // Branch CRUD
    createBranch: vcRepoBranchCRUD.createBranch,
    getBranch: vcRepoBranchCRUD.getBranch,
    getAllBranches: vcRepoBranchCRUD.getAllBranches,
    renameBranch: vcRepoBranchCRUD.renameBranch,
    deleteBranch: vcRepoBranchCRUD.deleteBranch,

    // Branch state
    getActiveBranch: vcRepoBranchState.getActiveBranch,
    setActiveBranch: vcRepoBranchState.setActiveBranch,
    updateBranchHead: vcRepoBranchState.updateBranchHead,
    updateBranchWorkingSnapshot: vcRepoBranchState.updateBranchWorkingSnapshot,
    updateBranchBaseRevision: vcRepoBranchState.updateBranchBaseRevision,
    setBranchDirty: vcRepoBranchState.setBranchDirty,
    isBranchDirty: vcRepoBranchState.isBranchDirty,

    // Managed artifacts
    setManagedArtifact: vcRepoArtifacts.setManagedArtifact,
    getManagedArtifact: vcRepoArtifacts.getManagedArtifact,
    getAllManagedArtifacts: vcRepoArtifacts.getAllManagedArtifacts,

    // Invariants
    checkInvariants: vcRepoInvariants.checkInvariants
  };

})();
