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

MainGrid = require('./MainGrid');
OncoHistogram = require('./Histogram');

var OncoGrid;

(function (){
  'use strict';

  OncoGrid = function(params) {
    var _self = this;

    _self.donors = params.donors || [];
    _self.genes = params.genes || [];
    _self.observations = params.observations || [];

    _self.computeGeneScores();
    _self.computeScores();
    _self.sortByScores();

    _self.mainGrid = new MainGrid(params, _self.update(_self));

    _self.charts = [];
    _self.charts.push(_self.mainGrid);
  };

  /**
   * Initializes and creates the main SVG with rows and columns. Does prelim sort on data
   */
  OncoGrid.prototype.render = function() {
    var _self = this;

    _self.charts.forEach(function(chart) {
        chart.render();
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
      if (donor.donorId === donorId) {
        return i;
      }
    }

    return -1;
  };

  OncoGrid.prototype.cluster = function() {
    var _self = this;

    _self.computeGeneScores();
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
        removedList.push(donor.donorId);
        d3.selectAll('.' + donor.donorId + '-cell').remove();
        d3.selectAll('.' + donor.donorId + '-bar').remove();
        _self.donors.splice(i, 1);
        i--;
      }
    }

    for (var j = 0; j < _self.observations.length; j++) {
      var obs = _self.observations[j];
      if (_self.donors.indexOf(obs.donorId) >= 0) {
        _self.observations.splice(j, 1);
        j--;
      }
    }

    _self.update(_self)();
  };

  OncoGrid.prototype.removeGenes = function(func) {
    var _self = this;

    var removedList = [];

    // Remove genes from data
    for (var i = 0; i < _self.genes.length; i++) {
      var gene = _self.genes[i];
      if (func(gene)) {
        removedList.push(gene.id);
        d3.selectAll('.' + gene.id + '-cell').remove();
        _self.genes.splice(i, 1);
        i--;
      }
    }

    _self.update(_self)();
  };

  OncoGrid.prototype.sortDonors = function(func) {
    var _self = this;

    _self.donors.sort(func);
    _self.update(_self)();
  };

  OncoGrid.prototype.toggleHeatmap = function() {
    var _self = this;

    _self.mainGrid.toggleHeatmap();
  };

  /**
   * Returns 1 if at least one mutation, 0 otherwise.
   */
  OncoGrid.prototype.mutationScore = function(donor, gene) {
    var _self = this;

    for (var i = 0; i < _self.observations.length; i++) {
      var obs = _self.observations[i];
      if (obs.donorId === donor && obs.gene === gene) {
        return 1;
      }
    }

    return 0;
  };

  /**
   * Returns 1 if at least one mutation, 0 otherwise.
   */
  OncoGrid.prototype.mutationGeneScore = function(donor, gene) {
    var _self = this;

    var retVal = 0;
    for (var i = 0; i < _self.observations.length; i++) {
      var obs = _self.observations[i];
      if (obs.gene === gene && obs.gene === gene) {
        retVal++;
      }
    }

    return retVal;
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
        donor.score += (_self.mutationScore(donor.donorId, gene.id) * Math.pow(2, _self.genes.length + 1 - j));
      }
    }

  };

  OncoGrid.prototype.computeGeneScores = function() {
    var _self = this;

    for (var i = 0; i < _self.genes.length; i++) {
      var gene = _self.genes[i];
      gene.score = 0;
      for (var j = 0; j < _self.donors.length; j++) {
        var donor = _self.donors[j];
        gene.score += _self.mutationGeneScore(donor.donorId, gene.id);
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
      return 0;
    }
  };
}());

module.exports = OncoGrid;