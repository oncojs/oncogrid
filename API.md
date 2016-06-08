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
  * `gridClick` - `function` - Function for the intended behaviour triggered by clicking on a cell in the main grid.
  * `margin` - `object` - Object holding the settings for the margins: `Default: { top: 30, right: 100, bottom: 15, left: 80 }`
  * `heatMap` - `bool` - If true, initial render will be in heatMap mode.
  * `donorOpacityFunc` - `function` - Function to determine cell opacity for donor track data.
  * `geneOpacityFunc` - `function` - Function to determine cell opacity for gene track data.
  * `colorMap` - `object` - A mapping from consequence type to colour.


## API

* `render()` - Renders an instantiate OncoGrid configured through the `params` argument in constructor.
* `cluster()` - Sorts genes based on mutation count and then re-scores donors and resorts them as well.
* `removeDonors(function)` - Removes all donors that evaluate true for the passed function.
* `removeGenes(function)` - Removes all genes that evaluate true for the passed function.
* `toggleHeatmap()` - Toggle between heatMap and regular mode.
* `sortDonors(function)` - Sorts the donors and updates rendering based on the comparator function passed in.
* `sortGenes(function)` - Sorts the genes by provided comparator and then re-scores and re-renders the grid.
