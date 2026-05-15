# TASK — Split File: [FILENAME]
## Plain-Script File Splitting Protocol

---

## Prerequisites

Before touching any file, read:
1. `CLAUDE.md` — especially SKILL 11 (Plain-Script File Splitting)
2. The file you are about to split — read it in full before planning the split

---

## What You Are Splitting

**File to split:** `[PATH/TO/FILE.js]`
**Reason:** [Too large / Mixed responsibilities — describe in one sentence]
**Into:** [list the two or three new files and their single responsibility each]

Example:
- `graph/canvasRenderer.js` (220 lines, mixes node drawing + wire drawing)
  → `graph/nodeRenderer.js` — draws nodes only
  → `graph/wireRenderer.js` — draws wires only

---

## Tasks — Execute in order. Stop and verify after each.

---

### TASK 1 — Read the file and declare the split boundary

Read `[PATH/TO/FILE.js]` in full.

State in plain language:
- What functions go into File A and why
- What functions go into File B and why
- Which file depends on the other (or are they independent?)
- What does `index.html` currently look like for this file's `<script>` tag?

Do not write any code yet. Wait for confirmation of the split boundary.

**Verification checklist:**
- [ ] Split boundary declared in plain language
- [ ] Dependency direction between new files is explicit
- [ ] No code written yet

---

### TASK 2 — Create File A

Create the first new file with:
- Dependency header comment at the top (`DEPENDS ON:` / `MUST LOAD BEFORE:`)
- All functions that belong to its responsibility domain
- No functions that belong to File B

Do not modify `index.html` yet.
Do not delete the original file yet.

**Verification checklist:**
- [ ] File A exists at the correct path
- [ ] Dependency header is present and accurate
- [ ] Only functions belonging to File A's domain are in it
- [ ] No syntax errors
- [ ] Original file untouched

---

### TASK 3 — Create File B

Same as Task 2 for the second file.

**Verification checklist:**
- [ ] File B exists at the correct path
- [ ] Dependency header is present and accurate
- [ ] Only functions belonging to File B's domain are in it
- [ ] No syntax errors
- [ ] Original file still untouched

---

### TASK 4 — Update `index.html`

Replace the original file's `<script>` tag with the two new tags in the correct dependency order.

Rules:
- File A loads before File B if B depends on A
- If independent, load in alphabetical order
- Do not change any other `<script>` tags — touch only the one being replaced

**Verification checklist:**
- [ ] Original `<script src="...originalFile.js">` tag removed
- [ ] File A `<script>` tag added in the correct position
- [ ] File B `<script>` tag added after File A (if B depends on A)
- [ ] No other `<script>` tags changed
- [ ] Load order matches the `DEPENDS ON` / `MUST LOAD BEFORE` headers in both files

---

### TASK 5 — Delete the original file

Delete `[PATH/TO/ORIGINAL-FILE.js]`.

Do not rename it, do not comment it out, do not leave it in the repo.

**Verification checklist:**
- [ ] Original file deleted from disk
- [ ] No remaining references to the original filename anywhere in the codebase (search for it)

---

### TASK 6 — Verify the panel loads

Open the CEP panel in After Effects. Open the browser dev tools console.

**Verification checklist:**
- [ ] Panel loads without console errors ← MOST IMPORTANT
- [ ] All functionality that existed before the split still works
- [ ] No `undefined` references to functions that lived in the original file
- [ ] No `undefined` references to functions between File A and File B

---

## What NOT to Do

- Do not split by line count alone — split by responsibility domain
- Do not leave the original file in the repo after splitting
- Do not skip updating `index.html` — a missing script tag produces a silent `undefined`
- Do not move functions between files and modify them at the same time — split first, modify after in a separate task
- Do not add new functionality during a split — a split is structural only

---

## After the Split is Verified

Update `PROCEDIA-V2-TASKS.md` to mark this split as complete.
Then return to the feature task that prompted the split (if any).
