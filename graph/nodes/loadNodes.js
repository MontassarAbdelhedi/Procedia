/**
 * @file Loads non-effect node definitions and effect node metadata.
 * Effect node definitions (460+) are generated on-demand from metadata stubs
 * via effectNodeFactory instead of loading individual JS files at startup.
 * Metadata stubs are split by category under graph/nodeMetadata/ (22 files).
 */

// Non-effect node files — loaded synchronously at startup (14 files total)
document.write('<script src="graph/nodes/categories/Core/Comp.js"><\/script>');
document.write('<script src="graph/nodes/categories/Core/Footage.js"><\/script>');
document.write('<script src="graph/nodes/categories/Core/Merge.js"><\/script>');
document.write('<script src="graph/nodes/categories/Core/Multimerge.js"><\/script>');
document.write('<script src="graph/nodes/categories/Data/Color.js"><\/script>');
document.write('<script src="graph/nodes/categories/Data/Number.js"><\/script>');
document.write('<script src="graph/nodes/categories/Data/Expression.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Adjustment.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Camera.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Light.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Null.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Shape.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Solid.js"><\/script>');
document.write('<script src="graph/nodes/categories/Layers/Text.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Rectangle.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Ellipse.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Star.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Squircle.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Gear.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Wave.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Flower.js"><\/script>');
document.write('<script src="graph/nodes/categories/Shapes/Polygon.js"><\/script>');
document.write('<script src="graph/nodes/categories/Effects/utility/Blending.js"><\/script>');
document.write('<script src="graph/nodes/categories/TrackMatte/MatteAlpha.js"><\/script>');
document.write('<script src="graph/nodes/categories/TrackMatte/MatteLuma.js"><\/script>');

// Effect node metadata files — loaded synchronously to build NODE_METADATA (22 category files)
document.write('<script src="graph/nodeMetadata/3DChannel.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Audio.js"><\/script>');
document.write('<script src="graph/nodeMetadata/BlurSharpen.js"><\/script>');
document.write('<script src="graph/nodeMetadata/BorisFXMocha.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Channel.js"><\/script>');
document.write('<script src="graph/nodeMetadata/ColorCorrection.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Distort.js"><\/script>');
document.write('<script src="graph/nodeMetadata/ExpressionControls.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Generate.js"><\/script>');
document.write('<script src="graph/nodeMetadata/ImmersiveVideo.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Keying.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Matte.js"><\/script>');
document.write('<script src="graph/nodeMetadata/NoiseGrain.js"><\/script>');
document.write('<script src="graph/nodeMetadata/obsolete.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Perspective.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Simulation.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Stylize.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Text.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Time.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Transition.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Uncategorized.js"><\/script>');
document.write('<script src="graph/nodeMetadata/Utility.js"><\/script>');

// Stubs are now registered directly by each metadata file on load
