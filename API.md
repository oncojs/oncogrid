# OncoGrid Usage and API


## Adding to your project

The OncoGrid library depends on [d3](https://d3js.org) and you will need include it for Oncogrid to function.

```html
    <script src="path/to/d3.min.js"></script>
    <script src="path/to/oncogrid.min.js"></script>
```

or using the un-minified source:
```html
    <script src="path/to/d3.min.js"></script>
    <script src="path/to/oncogrid-debug.js"></script>
```

## Usage

Once d3 and OncoGrid have been added to your page, you can invoke and render the OncoGrid in your Javascript using a
call that looks something like this:
```javascript

var params = {
  element: '#grid-div',
  donors: donors,
  genes: genes,
  observations: observations,
  height: 450,
  width: 600,
  heatMap: true
};

var grid = new OncoGrid(params);
grid.render();
```

The `params` Object passed to OncoGrid is used to pass in both the data and required configuration in addition to any
optional configuration. The full description of the `params` object is as follows:

* Required
  * `element` - `string selector | dom node` - indicating to which DOM element the OncoGrid instance will use.
  * `donors` - `Array` - List of objects representing donors. The only required field for the objects is `id`
  * `genes` - `Array` - List of objects representing genes. The only required field for the objects is `id`
  * `observations` - `Array` - List of objects representing mutations/observations.
  The required fields for these objects are `id`, `geneId`, `donorId`
* Optional
  * `height` - `number` - Sets the height of the OncoGrid. `Default: 500`
  * `width` - `number` - Sets the width of the OncoGrid. `Default: 500`
  * `prefix` - `string` - String prefix to use for all css classes. `Default: 'og-'`
  * `donorTracks` - `Array` - An array of objects describing the tracks to be displayed for donors.
  * `donorOpacityFunc` - `function` - Function describing how to compute the opacity of the a donor track cell.
  * `geneTracks` - `Array` - An array of objects describing the tracks to be displayed for genes.
  * `geneOpacityFunc` - `function` - Function describing how to compute the opacity of the a gene track cell.
  * `gridClick` - `function` - Function for the intended behaviour triggered by clicking on a cell in the main grid.
  * `donorClick` - `function` - Function for the intended behaviour triggered by clicking on a cell in the donor track grid.
  * `geneClick` - `function` - Function for the intended behaviour triggered by clicking on a cell in the gene track grid.
  * `margin` - `object` - Object holding the settings for the margins: `Default: { top: 30, right: 100, bottom: 15, left: 80 }`
  * `heatMap` - `bool` - If true, initial render will be in heatMap mode.
  * `donorFillFunc` - `function` - Function to determine cell fill color for donor track data.
  * `geneFillFunc` - `function` - Function to determine cell fill color for gene track data.
  * `colorMap` - `object` - A mapping from consequence type to colour.
  * `templates` - `object` - An array of string to use as templates. Supported fields are `mainGridCrosshair` and `mainGrid`.
  * `histogramBorderPadding` - `object` - Object holding the settings for the space between border and histogram: `Default: { bottom: 5, left: 10 }`
  * `scaleToFit` - `bool` - If true, the grid will scale to fit parent container: `Default: true`
  * `leftTextWidth` - `number` - The width to set for the text on the left of the grid(should be set to the max text length): `Default: 80`
  * `expandableGroups` - `array` - An array of strings to identify which groups can have tracks added and removed from them.
  * `addTrackFunc` - `function` - For groups in the `expandableGroups` array, this function will be called when adding tracks. It is passed the array of collapsed tracks and a callback. tracks passed to the callback will be added.

### Track Definitions

Example:
```javascript

// How we determine the opacity of a donor track cell.
var donorOpacity = function (d) {
    if (d.type === 'int') {
      return d.value / 100;
    } else if (d.type === 'vital') {
      return 1;
    } else if (d.type === 'sex') {
      return 1;
    } else if (d.type === 'bool') {
      return d.value ? 1 : 0;
    } else {
      return 0;
}
};

// How we will sort the data when an int track is clicked.
var sortInt = function (field) {
    return function (a, b) {
      return b[field] - a[field];
    };
};

var donorTracks = [
    { 'name': 'PCAWG', 'fieldName': 'pcawg', 'type': 'bool', 'sort': sortBool},
    { 'name': 'Age at Diagnosis', 'fieldName': 'age', 'type': 'int', 'sort': sortInt},
    { 'name': 'Vital Status', 'fieldName': 'vitalStatus', 'type': 'vital', 'sort': sortByString},
    { 'name': 'Sex', 'fieldName': 'sex', 'type': 'sex', 'sort': sortByString},
    { 'name': 'CNSM Exists', 'fieldName': 'cnsmExists', 'type': 'bool', 'sort': sortBool},
    { 'name': 'STSM Exists', 'fieldName': 'stsmExists', 'type': 'bool', 'sort': sortBool},
    { 'name': 'SGV Exists', 'fieldName': 'sgvExists', 'type': 'bool', 'sort': sortBool},
    { 'name': 'METH-A Exists', 'fieldName': 'methArrayExists', 'type': 'bool', 'sort': sortBool}
];
```

The definition of a track object is as follows:
* `name` - string - The name and label for the track
* `fieldName` - string - The field of the donor/gene object to read
* `type` - string - The type of the track data, not used by OncoGrid internally, but allows user to group behaviour
for styling and the opacity function passed in for the tracks.
* `sort` - function - The function responsible for sorting
* `group` - string - the name of the group the track belongs to.
* `collapsed` - bool - if true, and the track group is in the `expandableGroups` array, then the track by default will not be shown.


## API

* `render()` - Renders an instantiate OncoGrid configured through the `params` argument in constructor.
* `resize(width, height`) - Resizes and scales oncogrid to new desired width and height for the grid. 
* `cluster()` - Sorts genes based on mutation count and then re-scores donors and resorts them as well.
* `removeDonors(function)` - Removes all donors that evaluate true for the passed function.
* `removeGenes(function)` - Removes all genes that evaluate true for the passed function.
* `toggleHeatmap()` - Toggle between heatMap and regular mode.
* `setHeatmap(boolean)` - Set heatMap mode, accepts `true` or `false`.
* `toggleGridLines()` - Toggle the gridlines that define the cells
* `setGridLines(boolean)` - Set the gridlines, accepts `true` or `false`.
* `toggleCrosshair()` - Toggles the crosshair & resizing mode.
* `setCrosshair(boolean)` - Set the crosshair, accepts `true` or `false`.
* `sortDonors(function)` - Sorts the donors and updates rendering based on the comparator function passed in.
* `sortGenes(function)` - Sorts the genes by provided comparator and then re-scores and re-renders the grid.
* `destroy()` - cleanup function to be called to remove grid and watchers.
