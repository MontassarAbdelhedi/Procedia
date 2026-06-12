# Test Scenarios

## Simple (1-3 nodes)

1. Text layer in a comp
   `text -> comp`

2. Shape layer in a comp
   `shape -> comp`

3. Null layer in a comp
   `null -> comp`

4. Footage item in a comp
   `footage -> comp`

5. Adjustment layer in a comp
   `adjustment -> comp`

## Moderate (3-5 nodes)

6. Text layer with a fill effect
   `number -> fill`
   `text -> fill -> comp`

7. Text layer with drop shadow
   `text -> drop shadow -> comp`

8. Shape layer with gaussian blur
   `text -> gaussian blur -> comp`

9. Text layer with blending mode
   `text -> blending -> comp`

10. Null parenting a text layer
    `null -> comp`
    `text -> comp`
    (wire parent from null to text)

11. Text layer with color-driven fill
    `color -> fill`
    `text -> fill -> comp`

12. Adjustment layer with gaussian blur over a text layer
    `text -> comp`
    `adjustment -> gaussian blur -> comp`

## Complex (5-7 nodes)

13. Text layer with fill and drop shadow
    `color -> fill`
    `text -> fill -> drop shadow -> comp`

14. Shape layer with fill, blur, and blending
    `color -> fill`
    `shape -> fill -> gaussian blur -> blending -> comp`

15. Text layer with alpha matte from a shape layer
    `shape -> comp`
    `text -> alpha matte -> comp`
    (top: shape, matte: text)

16. Text layer with luma matte from a footage layer
    `footage -> comp`
    `text -> luma matte -> comp`
    (top: footage, matte: text)

17. Null-controlled text layer with effects
    `null -> text`
    `color -> fill`
    `text -> fill -> drop shadow -> comp`
    (parent null to text)

## Advanced (7+ nodes)

18. Multi-layer comp with null parenting and effects
    `null -> shape`
    `color -> fill`
    `shape -> fill -> drop shadow -> comp`
    `text -> comp`
    (parent null to shape)

19. Full composite: shape, text, adjustment, matte
    `shape -> gaussian blur -> blending -> comp`
    `number -> gaussian blur`
    `text -> comp`
    `adjustment -> comp`
    `text -> alpha matte -> comp`
    (top: text, matte: shape-blur)

20. Complex graph with branching, matte, blending, and multiple effects
    `color -> fill-1`
    `color -> fill-2`
    `number -> gaussian blur`
    `null -> text-1`
    `text-1 -> fill-1 -> drop shadow -> blending-a -> comp`
    `text-2 -> fill-2 -> gaussian blur -> blending-b -> comp`
    `text-2 -> luma matte -> comp`
    (parent null to text-1; top: text-2, matte: text-1; blending-a: multiply, blending-b: screen)
