/**
 * @fileoverview Walkthrough step definitions. Each step has a title, description,
 * target element selector, and card position hint.
 * Exports: __wt_steps
 */
// ui/walkthrough/steps.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: ui/walkthrough/render.js

var __wt_steps = [
  {
    title: 'Welcome to Procedia',
    description: 'Procedia is a node-based procedural motion design plugin for After Effects. This quick tour will show you the essentials to get started.',
    target: null,
    cardPos: 'center'
  },
  {
    title: 'Node Palette',
    description: 'The left sidebar contains the node palette. Browse categories or search for nodes, then drag them onto the canvas to start building your graph.',
    target: '#left-bar',
    cardPos: 'right'
  },
  {
    title: 'The Canvas',
    description: 'The canvas is your workspace. Drag nodes to reposition them, scroll to zoom in and out, and hold Space + drag to pan around. The minimap in the bottom-right corner helps you navigate large graphs.',
    target: '#canvas-wrap',
    cardPos: 'center'
  },
  {
    title: 'Connecting Nodes',
    description: 'Connect nodes by dragging from an output port (right side of a node) to an input port (left side). Wires carry data through the chain from left to right. Changes propagate automatically.',
    target: '#canvas-wrap',
    cardPos: 'center'
  },
  {
    title: 'Inspector Panel',
    description: 'Select a node on the canvas to view and edit its properties in the right sidebar. Each node\'s parameters appear here \u2014 adjust values and see results update in real time.',
    target: '#right-bar',
    cardPos: 'left'
  },
  {
    title: 'You\'re Ready!',
    description: 'That covers the basics! Drag a node from the palette onto the canvas to begin. You can replay this tour anytime from the Settings menu.',
    target: null,
    cardPos: 'center'
  }
];
