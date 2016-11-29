/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public
 * License v3.0. You should have received a copy of the GNU General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*global d3*/
'use strict';
var cloneDeep = require('lodash.clonedeep');
var MainGrid = require('./MainGrid');

var OncoGrid;


OncoGrid = function(params) {
  var _self = this;
  _self.params = params;
  _self.inputWidth = params.width || 500;
  _self.inputHeight = params.height || 500;
  _self.prefix = params.prefix || 'og-';

  params.wrapper = '.' + _self.prefix + 'container';

  d3.select(params.element || 'body')
    .append('div')
    .attr('class', _self.prefix + 'container')
    .style('position', 'relative');

  _self.initCharts();
};

/**
 * Instantiate charts
 */
OncoGrid.prototype.initCharts = function() {
  var _self = this;

  _self.clonedParams = cloneDeep(_self.params);

  _self.donors = _self.clonedParams.donors || [];
  _self.genes = _self.clonedParams.genes || [];
  _self.observations = _self.clonedParams.observations || [];

  _self.createLookupTable();
  _self.computeDonorCounts();
  _self.computeGeneCounts();
  _self.computeGeneScores();
  _self.genesSortbyScores();
  _self.computeScores();
  _self.sortByScores();

  _self.mainGrid = new MainGrid(_self.clonedParams, _self.lookupTable, _self.update(_self), function() {
    _self.resize(_self.inputWidth, _self.inputHeight, _self.fullscreen);
  });

  _self.heatMapMode = _self.mainGrid.heatMap;
  _self.drawGridLines = _self.mainGrid.drawGridLines;
  _self.crosshairMode = _self.mainGrid.crosshair;

  _self.charts = [];
  _self.charts.push(_self.mainGrid);
};

/**
 * Creates a for constant time checks if an observation exists for a given donor, gene coordinate.
 */
OncoGrid.prototype.createLookupTable = function () {
  var _self = this;
  var lookupTable = {};

  for (var i = 0; i < _self.observations.length; i++) {
    var obs = _self.observations[i];
    var donorId = obs.donorId;
    var geneId = obs.geneId;

    if (lookupTable.hasOwnProperty(donorId)) {
      if (lookupTable[donorId].hasOwnProperty(geneId)) {
        lookupTable[donorId][geneId].push(obs.id);
      } else {
        lookupTable[donorId][geneId] = [obs.id];
      }
    } else {
      lookupTable[donorId] = {};
      lookupTable[donorId][geneId] = [obs.id];
    }

    _self.lookupTable = lookupTable;
  }
};

/**
 * Initializes and creates the main SVG with rows and columns. Does prelim sort on data
 */
OncoGrid.prototype.render = function() {
  var _self = this;

  setTimeout(function () {
    _self.charts.forEach(function(chart) {
        chart.render();
    });
  });
};

/**
 * Updates all charts
 */
OncoGrid.prototype.update = function(scope) {
  var _self = scope;

  return function(donorSort) {
    donorSort = (typeof donorSort === 'undefined' || donorSort === null) ? false: donorSort;

    if (donorSort) {
      _self.computeScores();
      _self.sortByScores();
    }

    _self.charts.forEach(function (chart) {
      chart.update();
    });
  };
};

/**
 * Triggers a resize of OncoGrid to desired width and height.
 */
OncoGrid.prototype.resize = function(width, height, fullscreen) {
  var _self = this;

  _self.fullscreen = fullscreen;
  _self.mainGrid.fullscreen = fullscreen;
  _self.charts.forEach(function (chart) {
    chart.fullscreen = fullscreen;
    chart.resize(Number(width), Number(height));
  });
};

/**
 * Sorts donors by score
 */
OncoGrid.prototype.sortByScores = function() {
  var _self = this;

  _self.donors.sort(_self.sortScore);
};

OncoGrid.prototype.genesSortbyScores = function() {
  var _self = this;

  _self.genes.sort(_self.sortScore);
};

/**
 * Helper for getting donor index position
 */
OncoGrid.prototype.getDonorIndex = function(donors, donorId) {
  for (var i = 0; i < donors.length; i++) {
    var donor = donors[i];
    if (donor.id === donorId) {
      return i;
    }
  }

  return -1;
};

/**
 * Sorts genes by scores and recomputes and sorts donors.
 * Clusters towards top left corner of grid.
 */
OncoGrid.prototype.cluster = function() {
  var _self = this;
  
  _self.genesSortbyScores();
  _self.computeScores();
  _self.sortByScores();
  _self.update(_self)();
};

OncoGrid.prototype.removeDonors = function(func) {
  var _self = this;

  var removedList = [];

  // Remove donors from data
  for (var i = 0; i < _self.donors.length; i++) {
    var donor = _self.donors[i];
    if (func(donor)) {
      removedList.push(donor.id);
      d3.selectAll('.' + _self.prefix + donor.id + '-cell').remove();
      d3.selectAll('.' + _self.prefix + donor.id + '-bar').remove();
      _self.donors.splice(i, 1);
      i--;
    }
  }

  for (var j = 0; j < _self.observations.length; j++) {
    var obs = _self.observations[j];
    if (_self.donors.indexOf(obs.id) >= 0) {
      _self.observations.splice(j, 1);
      j--;
    }
  }

  _self.computeGeneScores();
  _self.update(_self)();
  _self.resize(_self.inputWidth, _self.inputHeight, false);
};

/**
 * Removes genes and updates OncoGrid rendering.
 * @param func function describing the criteria for removing a gene.
 */
OncoGrid.prototype.removeGenes = function(func) {
  var _self = this;

  var removedList = [];

  // Remove genes from data
  for (var i = 0; i < _self.genes.length; i++) {
    var gene = _self.genes[i];
    if (func(gene)) {
      removedList.push(gene.id);
      d3.selectAll('.' + _self.prefix + gene.id + '-cell').remove();
      d3.selectAll('.' + _self.prefix + gene.id + '-bar').remove();
      _self.genes.splice(i, 1);
      i--;
    }
  }

  _self.update(_self)();
  _self.resize(_self.inputWidth, _self.inputHeight, false);
};

/**
 * Sorts donors
 * @param func a comparator function.
 */
OncoGrid.prototype.sortDonors = function(func) {
  var _self = this;

  _self.donors.sort(func);
  _self.update(_self)();
};

/**
 * Sorts genes
 * @param func a comparator function.
 */
OncoGrid.prototype.sortGenes= function(func) {
  var _self = this;

  _self.computeScores();
  _self.sortByScores();
  _self.genes.sort(func);
  _self.update(_self)();
};

/**
 * Toggles oncogrid between heatmap mode and regular mode showing individual consequence types.
 */
OncoGrid.prototype.toggleHeatmap = function() {
  var _self = this;

  _self.heatMapMode = _self.mainGrid.toggleHeatmap();
};

OncoGrid.prototype.toggleGridLines = function() {
  var _self = this;

  _self.drawGridLines = _self.mainGrid.toggleGridLines();
};

OncoGrid.prototype.toggleCrosshair = function() {
  var _self = this;

  _self.crosshairMode = _self.mainGrid.toggleCrosshair();
};

/**
 * Returns 1 if at least one mutation, 0 otherwise.
 */
OncoGrid.prototype.mutationScore = function(donor, gene) {
  var _self = this;

  if (_self.lookupTable.hasOwnProperty(donor) && _self.lookupTable[donor].hasOwnProperty(gene)) {
    return 1;
  } else {
    return 0;
  }
};

/**
 * Returns # of mutations a gene has as it's score
 */
OncoGrid.prototype.mutationGeneScore = function(donor, gene) {
  var _self = this;

  if (_self.lookupTable.hasOwnProperty(donor) && _self.lookupTable[donor].hasOwnProperty(gene)) {
    return _self.lookupTable[donor][gene].length;
  } else {
    return 0;
  }
};

/**
 * Computes scores for donor sorting.
 */
OncoGrid.prototype.computeScores = function() {
  var _self = this;

  for (var i = 0; i < _self.donors.length; i++) {
    var donor = _self.donors[i];
    donor.score = 0;
    for (var j = 0; j < _self.genes.length; j++) {
      var gene = _self.genes[j];
      donor.score += (_self.mutationScore(donor.id, gene.id) * Math.pow(2, _self.genes.length + 1 - j));
    }
  }

};

/**
 * Computes scores for gene sorting.
 */
OncoGrid.prototype.computeGeneScores = function() {
  var _self = this;

  for (var i = 0; i < _self.genes.length; i++) {
    var gene = _self.genes[i];
    gene.score = 0;
    for (var j = 0; j < _self.donors.length; j++) {
      var donor = _self.donors[j];
      gene.score += _self.mutationGeneScore(donor.id, gene.id);
    }
  }
};

/**
 * Computes the number of observations for a given donor.
 */
OncoGrid.prototype.computeDonorCounts = function() {
  var _self = this;

  for (var i = 0; i < _self.donors.length; i++) {
    var donor = _self.donors[i];
    donor.count = 0;

    for (var j = 0; j < _self.observations.length; j++) {
      var obs = _self.observations[j];
        if (donor.id === obs.donorId) {
          donor.count+= 1;
        }
    }

  }
};

/**
 * Computes the number of observations for a given gene.
 */
OncoGrid.prototype.computeGeneCounts = function() {
  var _self = this;

  for (var i = 0; i < _self.genes.length; i++) {
    var gene = _self.genes[i];
    gene.count = 0;

    for (var j = 0; j < _self.observations.length; j++) {
      var obs = _self.observations[j];
      if (gene.id === obs.geneId) {
        gene.count+= 1;
      }
    }

  }
};

/**
 * Comparator for scores
 */
OncoGrid.prototype.sortScore = function(a, b) {
  if (a.score < b.score) {
    return 1;
  } else if (a.score > b.score) {
    return -1;
  } else {
    return a.id >= b.id ? 1: -1;
  }
};

/**
 *  Cleanup function to ensure the svg and any bindings are removed from the dom.
 */
OncoGrid.prototype.destroy = function() {
  var _self = this;

  _self.charts.forEach(function (chart) {
    chart.destroy();
  });
};

OncoGrid.prototype.reload = function() {
  var _self = this;

  _self.destroy();
  _self.initCharts();
  _self.render();
};

module.exports = OncoGrid;
