# Performance Benchmarks

> Stress test results for the plugin graph engine | Generated 2026-07-11 | `tests/stress.test.js`

---

## Test Methodology

Random mixed networks are generated at sizes 10, 20, 50, 100, and 200 nodes. Each network includes a mix of layers (30%), effects (45%), data nodes (10%), and misc nodes (blending/matte/merge — 15%). All nodes are wired into chain topologies feeding into a single Comp node.

Measurements are taken using `performance.now()` inside the Vitest test runner (jsdom). No AE bridge calls occur — metrics reflect pure JavaScript graph state operations.

---

## Network Generation Performance

| Size | Nodes | Wires | Layers | Effects | Data | Misc | Node(ms) | Wire(ms) | TGraph(ms) | Check(ms) | Layout(ms) | Clear(ms) |
|------|-------|-------|--------|---------|------|------|----------|----------|------------|-----------|------------|-----------|
| 10 | 10 | 11 | 3 | 4 | 1 | 1 | 0.749 | 0.018 | 0.011 | 0.263 | 1.111 | 0.004 |
| 20 | 20 | 23 | 6 | 9 | 2 | 2 | 0.244 | 0.005 | 0.007 | 1.808 | 0.415 | 0.002 |
| 50 | 50 | 65 | 15 | 22 | 5 | 7 | 0.455 | 0.014 | 0.009 | 28.157 | 1.138 | 0.005 |
| 100 | 100 | 132 | 30 | 45 | 10 | 14 | 0.757 | 0.017 | 0.016 | 272.184 | 1.675 | 0.004 |
| 200 | 200 | 252 | 60 | 90 | 20 | 29 | 1.460 | 0.030 | 0.022 | 1855.393 | 4.358 | 0.008 |

### Per-Operation Metrics

| Size | ms/node | ms/wire | ms/tempGraphBuild | ms/allPairsCheck | ms/layout | hasCycle/call(us) |
|------|---------|---------|-------------------|------------------|-----------|-------------------|
| 10 | 0.0749 | 0.0016 | 0.0113 | 0.263 | 1.111 | 0.818 |
| 20 | 0.0122 | 0.0002 | 0.0067 | 1.808 | 0.415 | 1.616 |
| 50 | 0.0091 | 0.0002 | 0.0092 | 28.157 | 1.138 | 3.892 |
| 100 | 0.0076 | 0.0001 | 0.0163 | 272.184 | 1.675 | 8.634 |
| 200 | 0.0073 | 0.0001 | 0.0219 | 1855.393 | 4.358 | 15.364 |

---

## Topology Extremes

Compares the same ~200-node count across different graph shapes. `Check(us)` is a single `hasCycle()` call from the first to the last node in the graph.

| Topology | Nodes | Wires | Layers | Check(us) | Layout(ms) |
|----------|-------|-------|--------|-----------|------------|
| Deep (1 chain x 100 depth) | 102 | 101 | 1 | 8.16 | 0.81 |
| Mid (10 chains x 10 depth) | 111 | 110 | 10 | 7.80 | 0.74 |
| Wide (40 chains x 3 depth) | 161 | 160 | 40 | 11.02 | 2.28 |
| Flat (60 chains x 2 depth) | 181 | 180 | 60 | 11.79 | 3.72 |

Deep chains are cheapest for cycle checking (single-path DFS). Wide/flat graphs with more branching are ~50% slower per check. AutoLayout is slower on wide graphs (more nodes per layer → more crossing reduction work).

---

## hasCycle() Call Cost

Sampled 500 random pairs on a 200-node mixed network (254 wires):

| Metric | Value |
|--------|-------|
| Graph | 200 nodes, 254 wires |
| Pairs sampled | 500 |
| Total time | 24.94 ms |
| Per call | **49.88 µs** |

---

## loadGraph() Performance

| Nodes | Wires | Time |
|-------|-------|------|
| 200 | 252 | 0.071 ms |

Direct map assignment is extremely fast — no iteration overhead per node/wire.

---

## Key Findings

### Operations That Scale Well

- **Node creation** (~0.007 ms/node): Linear O(n). Direct map insertion with lazy tempGraph rebuild.
- **Wire creation** (~0.0001 ms/wire): Near-zero cost. Same pattern as node creation.
- **TempGraph rebuild** (~0.022 ms for 200 nodes): Lazy — only computed on `getTempGraph()`. Stripped clone cost is proportional to total fields.
- **AutoLayout** (~4.4 ms for 200 nodes): Efficient Sugiyama implementation. Layer assignment and crossing reduction use simple heuristics.
- **loadGraph** (~0.07 ms for 200 nodes): Direct map assignment. No per-item processing.
- **Clear** (~0.008 ms): Two map resets.

### Operations That Need Attention

- **All-pairs cycle check** (~1.9 s for 200 nodes): **O(n²) scaling with O(V+E) per check.** This is not a production path (cycle check runs once per wire creation, not for all pairs), but it reveals the underlying DFS cost.
- **Per-wire hasCycle** (15 µs at 200 nodes, 50 µs on dense graphs): Acceptable for interactive use, but would become noticeable at 500+ nodes with many wire operations per frame.
- **AutoLayout wide graphs** (3.7 ms for 181-node flat graph): ~5x slower than deep chains due to more nodes per layer in crossing reduction.

### Topology Sensitivity

| Metric | Best Topology | Worst Topology | Ratio |
|--------|--------------|----------------|-------|
| Cycle check | Deep chain (8 µs) | Flat/wide (12 µs) | 1.5x |
| AutoLayout | Deep chain (0.8 ms) | Flat/wide (3.7 ms) | 4.6x |

---

## Suggestions

### Short Term (Current Release)

1. **Cycle checker: no action needed.** Per-wire cost of 15–50 µs is acceptable for interactive use at current scale.

2. **AutoLayout: batch position writes.** The current implementation calls `graphState.updateNode()` per node (200 calls at 200 nodes), each triggering a tempGraph dirty flag. Replace with a single `batchUpdateNodes()` call after all positions are computed.

3. **TempGraph: keep lazy strategy.** The current dirty-flag + rebuild-on-demand approach is optimal.

### Medium Term (Next Release)

4. **Cycle checker: memoize DFS results.** Cache the reachability matrix for common query patterns. Invalidate on wire add/remove. Reduce O(V+E) per check to O(1) lookups for cached pairs.

5. **Cycle checker: incremental SCC tracking.** Track strongly connected components incrementally as wires are added/removed. Only re-compute when a wire change could create/break a cycle.

6. **AutoLayout: progressive layout for large graphs.** For graphs with 500+ nodes, run layout incrementally — position first N nodes immediately, defer remaining to next frame via rAF.

### Long Term

7. **Web Worker for heavy computation.** Offload cycle checking, autoLayout, and graph export to a background worker for graphs exceeding 500 nodes.

8. **Virtualized node rendering.** For 500+ node graphs, only render visible nodes in the viewport. Requires spatial indexing (quadtree or grid).

---

## Running the Tests

```bash
npm test -- tests/stress.test.js
```

The test outputs formatted result tables to stdout. Individual test names:

- `generates {size}-node mixed network` (5 tests — 10, 20, 50, 100, 200)
- `compares deep vs wide topology at ~200 nodes`
- `measures hasCycle on existing large graph`

---

*Procedia v0.0.4 — Performance Benchmarks — 2026-07-11*
