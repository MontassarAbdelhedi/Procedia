/**
 * Conflict factory hub — reassembles conflict factories from sub-modules
 * into the public vcConflictFactory API. Pure JS, no AE/UI/graph-state deps.
 * @module vcConflictFactory
 * @dependencies vcConflictFactoryProperties, vcConflictFactoryStructural, vcConflictFactoryTopology
 */
// versioning/merge/conflictFactory.js
// DEPENDS ON: versioning/merge/conflictFactory/propertyConflicts.js,
//             versioning/merge/conflictFactory/structuralConflicts.js,
//             versioning/merge/conflictFactory/topologyConflicts.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js, versioning/merge/conflictResolver.js

var vcConflictFactory = (function() {

  var prop = vcConflictFactoryProperties;
  var struct = vcConflictFactoryStructural;
  var topo = vcConflictFactoryTopology;

  return {
    propertyConflict: prop.propertyConflict,
    deleteModifyConflict: struct.deleteModifyConflict,
    typeChangeConflict: struct.typeChangeConflict,
    wireEndpointConflict: struct.wireEndpointConflict,
    topologyConflict: topo.topologyConflict,
    layoutConflict: prop.layoutConflict,
    externalReferenceConflict: topo.externalReferenceConflict,
    unknownNodeTypeConflict: topo.unknownNodeTypeConflict
  };

})();
