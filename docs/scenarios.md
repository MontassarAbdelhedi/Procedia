----------------------
drop node directly goes to reserved comp (this way we don't need to check if a node has parked previously)
layer creation is wire driven, not node driven.

example:
text node ----wire 1----> comp node: create a layer
text node ----wire 2----> fill node: fill node has a hosting layer up stream but no comp downstream; fill goes ghost.
text node ----wire 2----> fill node ----wire 3----> comp node: fill node has a hosting layer upstream and a comp node downstream; fill goes alive therefore text node has a new legit path downstream.
result:
text layer (from wire 1)
text layer + fill effect (wire 2+3)

removing wire 1: remove the corresponding AE layer
----------------------



