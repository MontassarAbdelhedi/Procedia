# Adobe After Effects CS6 Scripting Guide Summary

This document provides a summary of the Adobe After Effects CS6 Scripting Guide, including rules, keywords, how-to guidelines, and an overview of the object model.

## 1. Overview & Rules

### What is Scripting in After Effects?
* A script is a series of commands that automates repetitive tasks, performs complex calculations, or accesses functionality not exposed in the GUI.
* Scripting is distinct from expressions: a script tells the application to *do* something, whereas an expression says that a property *is* something.
* Scripts are based on **ExtendScript**, Adobe's extended version of JavaScript (implements ECMA-262 specification).

### File Extensions
* **.jsx**: Standard ExtendScript file extension (UTF-8 encoded text).
* **.jsxbin**: Binary version of an ExtendScript file (exported from ExtendScript Toolkit).

### Security/Execution Rules
* By default, scripts are not allowed to write files or communicate over a network. To enable this, go to **Preferences > General** and check **Allow Scripts To Write Files And Access Network**.
* Scripting shares a global environment. Variables and functions persist during an After Effects session. Use unique names to avoid conflicts.

---

## 2. How-To Guidelines

### How to Run Scripts
* **From the UI**: Place scripts in the `Scripts` folder and choose them from **File > Scripts**.
* **Manually load**: Choose **File > Scripts > Run Script File...** and select a script.
* **From Command Line**: 
  * Windows: `afterfx.exe -r c:\path\to\script.jsx`
  * Mac OS (AppleScript): `DoScript "alert(\"Hello\")"` or `DoScript file_path`
* **From Window Menu (Panels)**: Scripts placed in `Scripts/ScriptUI Panels` can be docked in the UI. Use `this` to refer to the panel instead of creating a new `Window`.
* **Automatically**: Place scripts in the `Scripts/Startup` or `Scripts/Shutdown` folders to run them when the application starts or quits.

### How to Stop a Running Script
* Press **Esc** or **Cmd+period** (Mac OS).

---

## 3. Keywords, Statements, and Operators

Since ExtendScript is based on JavaScript, it supports standard JS constructs:

* **Statements & Keywords**: `break`, `continue`, `case`, `default`, `do...while`, `false`, `for`, `for...in`, `function`, `if/if...else`, `new`, `null`, `return`, `switch`, `this`, `true`, `undefined`, `var`, `while`, `with`.
* **Operators**: standard math (`+`, `-`, `*`, `/`, `%`), bitwise (`<<`, `>>`, `&`, `|`, `^`), assignment (`=`, `+=`), equality (`==`, `!=`, `<`, `>`), logical (`&&`, `||`, `!`).

---

## 4. The After Effects Object Model

The After Effects object model is hierarchical. Here is the general structure:

* **Application (`app`)**: The global object.
  * **Project**: The currently loaded project.
    * **ItemCollection (`items`)**: Contains compositions, footage, folders.
      * **Item**: Base class for AVItem (CompItem, FootageItem) and FolderItem.
        * **CompItem**: A composition containing layers.
          * **LayerCollection (`layers`)**: Contains layers (AVLayer, CameraLayer, LightLayer, TextLayer, ShapeLayer).
            * **Layer**: Contains properties (Property, PropertyGroup, MaskPropertyGroup).
              * **Property**: Keyframes, values, expressions.
    * **RenderQueue**: The render automation process.
      * **RQItemCollection**: Render Queue Items.
        * **OutputModule**: Settings for rendered files.

### Key Objects & Their Roles:
* **app (Application)**: Access the active project (`app.project`), viewer, settings, and run global methods (`app.purge()`, `app.scheduleTask()`, `app.beginUndoGroup()`).
* **Project**: Access project items (`project.items`), render queue (`project.renderQueue`), time display settings, and methods to import/save (`project.importFile()`, `project.save()`).
* **Item**: Base object for project items. Handles selection, removal, and parent folders.
* **CompItem**: Represents a composition. Gives access to layers, dimensions, duration, frame rate, and work area.
* **FootageItem**: Represents imported media or solids. Access its `mainSource` (FileSource, SolidSource, PlaceholderSource).
* **Layer**: Represents a layer in a comp. Can be moved, duplicated, and gives access to transforms, masks, and effects via `property()` or `propertyGroup()`.
* **Property**: Represents an animatable or static value on a layer. Add keyframes (`addKey()`, `setValueAtTime()`), set expressions (`expression`), or ease values (`KeyframeEase`).

---

## 5. Useful Global Functions
Available anywhere in your script for debugging and time conversions:
* `clearOutput()`: Clears the Info panel.
* `write(text)` / `writeLn(text)`: Writes text to the Info panel.
* `isValid(obj)`: Checks if an AE object still exists.
* `timeToCurrentFormat(time, fps, isDuration)`: Converts seconds to timecode/frames string.
* `currentFormatToTime(formattedTime, fps, isDuration)`: Converts timecode string to seconds.

---

## 6. Practical Examples Mentioned
* **New render locations**: Loops through Render Queue items and changes output paths.
* **Smart import**: Analyzes a folder, determines if files are sequences or stills, and imports them accordingly.
* **Render and e-mail**: Renders the queue and uses the `Socket` object to send an email notification.
* **Convert properties to markers**: Reads keyframe values and creates layer markers with Flash Video cue points.
