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
'use strict';

var OncoHistogram = require('./Histogram');
var OncoTrack = require('./Track');

var MainGrid;

MainGrid = function (params, func) {
  var _self = this;

  _self.updateCallback = func;
  _self.loadParams(params);
  _self.init();

  // Histograms and tracks.
  _self.donorHistogram = new OncoHistogram(params, _self.svg, false);
  _self.donorTrack =
      new OncoTrack(params, _self.svg, false, params.donorTracks, params.donorOpacityFunc, params.donorFillFunc);
  _self.donorTrack.init();

  _self.geneHistogram = new OncoHistogram(params, _self.svg, true);
  _self.geneTrack =
      new OncoTrack(params, _self.svg, true, params.geneTracks, params.geneOpacityFunc, params.donorFillFunc);
  _self.geneTrack.init();

};

/**
 * Responsible for initializing instance fields of MainGrid from the provided params object.
 * @param params
 */
MainGrid.prototype.loadParams = function (params) {
  var _self = this;

  _self.prefix = params.prefix || 'og-';

  _self.minCellHeight = params.minCellHeight || 8;

  _self.donors = params.donors || [];
  _self.genes = params.genes || [];
  _self.observations = params.observations || [];
  _self.element = params.element || 'body';

  _self.colorMap = params.colorMap || {
        'missense_variant': '#ff825a',
        'frameshift_variant': '#57dba4',
        'stop_gained': '#af57db',
        'start_lost': '#af57db',
        'stop_lost': '#ffe',
        'initiator_codon_variant': '#af57db'
      };

  _self.numDonors = _self.donors.length;
  _self.numGenes = _self.genes.length;

  _self.width = params.width || 500;
  _self.height = params.height || 500;

  _self.cellWidth = _self.width / _self.donors.length;
  _self.cellHeight = _self.height / _self.genes.length;

  if (_self.cellHeight < 10) {
    _self.cellHeight = 10;
    params.height = _self.numGenes * _self.minCellHeight;
    _self.height = params.height;
  }

  _self.margin = params.margin || {top: 30, right: 100, bottom: 15, left: 80};
  _self.heatMap = params.heatMap;
  _self.histogramHeight = 100;

  _self.drawGridLines = false;
  _self.gridClick = params.gridClick;
};

/**
 * Creates main svg element, background, and tooltip.
 */
MainGrid.prototype.init = function() {
  var _self = this;

  _self.div = d3.select(_self.element).append('div')
      .attr('class', _self.prefix + 'tooltip-oncogrid')
      .style('opacity', 0);

  _self.svg = d3.select(_self.element).append('svg')
      .attr('class', _self.prefix + 'maingrid-svg')
      .attr('width', _self.width + _self.margin.left + _self.margin.right + _self.histogramHeight*2)
      .attr('height', _self.height + _self.margin.top + _self.margin.bottom + _self.histogramHeight*2)
      .style('margin-left', _self.margin.left + 'px')
      .append('g')
      .attr('transform', 'translate(' + _self.margin.left + ',' + (_self.margin.top + _self.histogramHeight) + ')');

  _self.svg.append('rect')
      .attr('class', 'background')
      .attr('width', _self.width)
      .attr('height', _self.height);
};

/**
 * Only to be called the first time the OncoGrid is rendered. It creates the rects representing the
 * mutation occurrences.
 */
MainGrid.prototype.render = function() {
  var _self = this;

  _self.computeCoordinates();

  _self.svg.selectAll('.' + _self.prefix + 'maingrid-svg')
      .data(_self.observations).enter()
      .append('rect')
      .on('mouseover', function(d) {
        _self.div.transition()
            .duration(200)
            .style('opacity', 0.9);
        _self.div.html(d.id + '<br/>' + d.geneId + '<br/>' + d.donorId + '<br/>' + d.consequence)
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', function(d) {
        _self.div.transition()
            .duration(500)
            .style('opacity', 0);
      })
      .on('click', function(d) {
        if (typeof _self.gridClick !== 'undefined') {
          _self.gridClick(d);
        }
      })
      .transition()
      .attr('class', function(d) { return _self.prefix+'sortable-rect ' + d.donorId + '-cell ' + d.geneId + '-cell'; })
      .attr('cons', function(d) { return d.consequence; })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); })
      .attr('y', function(d) { return _self.getY(d); })
      .attr('width', _self.cellWidth)
      .attr('height', function(d) { return _self.getHeight(d); })
      .attr('fill', function(d) { return _self.getColor(d); })
      .attr('opacity', function(d) { return _self.getOpacity(d); })
      .attr('stroke-width', 2);

  _self.donorHistogram.render(_self.x, _self.div);
  _self.donorTrack.render(_self.x);

  _self.geneHistogram.render(_self.y, _self.div);
  _self.geneTrack.render(_self.y);
};

/**
 * Render function ensures presentation matches the data. Called after modifying data.
 */
MainGrid.prototype.update = function() {
  var _self = this;

  // Recalculate positions and dimensions of cells only on change in number of elements
  if (_self.numDonors !== _self.donors.length || _self.numGenes !== _self.genes.length) {
    _self.numDonors = _self.donors.length;
    _self.numGenes = _self.genes.length;
    _self.cellWidth = _self.width / _self.numDonors;
    _self.cellHeight = _self.height /  _self.numGenes;
    _self.computeCoordinates();
  }

  _self.row
      .transition()
      .attr('transform', function(d) {
        return 'translate( 0, ' + _self.y(_self.genes.indexOf(d)) + ')';
      });

  _self.svg.selectAll('.' + _self.prefix + 'sortable-rect')
      .transition()
      .attr('width', _self.cellWidth)
      .attr('height', _self.getHeight())
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });

  _self.donorHistogram.update(_self.donors, _self.x);
  _self.donorTrack.update(_self.donors, _self.x);

  _self.geneHistogram.update(_self.genes, _self.y);
  _self.geneTrack.update(_self.genes, _self.y);
};

/**
 * Updates coordinate system and renders the lines of the grid.
 */
MainGrid.prototype.computeCoordinates = function() {
  var _self = this;

  _self.x = d3.scale.ordinal()
      .domain(d3.range(_self.donors.length))
      .rangeBands([0, _self.width]);
  _self.cellWidth = _self.width / _self.donors.length;

  if (typeof _self.column !== 'undefined') {
    _self.column.remove();
  }

  _self.column = _self.svg.selectAll('.' + _self.prefix + 'donor-column')
      .data(_self.donors)
      .enter().append('g')
      .attr('class', _self.prefix + 'donor-column')
      .attr('donor', function(d) { return d.id; })
      .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

  if (_self.drawGridLines) {
    _self.column.append('line')
        .attr('x1', -_self.height);
  }

  _self.y = d3.scale.ordinal()
      .domain(d3.range(_self.genes.length))
      .rangeBands([0, _self.height]);
  _self.cellHeight = _self.height / _self.genes.length;

  if (typeof _self.row !== 'undefined') {
    _self.row.remove();
  }

  _self.row = _self.svg.selectAll('.' + _self.prefix + 'gene-row')
      .data(_self.genes)
      .enter().append('g')
      .attr('class', _self.prefix+'gene-row')
      .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

  if (_self.drawGridLines) {
    _self.row.append('line')
        .attr('x2', _self.width);
  }

  _self.row.append('text')
      .attr('class', function(g) {
        return g.id + '-label ' + _self.prefix +'gene-label ' + _self.prefix + 'label-text-font';
      })
      .transition()
      .attr('x', -8)
      .attr('y', _self.cellHeight / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(function(d, i) {
        return _self.genes[i].symbol;
      });

  _self.defineRowDragBehaviour();
};

/**
 * Defines the row drag behaviour for moving genes and binds it to the row elements.
 */
MainGrid.prototype.defineRowDragBehaviour = function() {
  var _self = this;

  var drag = d3.behavior.drag();
  drag.on('dragstart', function() {
    d3.event.sourceEvent.stopPropagation(); // silence other listeners
  });
  drag.on('drag', function(d) {
    var trans = d3.event.dy;
    var dragged = _self.genes.indexOf(d);
    var selection = d3.select(this);

    selection.attr('transform', function() {
      var transform = d3.transform(d3.select(this).attr('transform'));
      return 'translate( 0, ' + (parseInt(transform.translate[1]) + trans) + ')';
    });

    var newY = d3.transform(d3.select(this).attr('transform')).translate[1];

    _self.row.each(function(f) {
      var curGeneIndex = _self.genes.indexOf(f);
      var curGene, yCoord;
      if (trans > 0 && curGeneIndex > dragged) {
        yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
        if (newY > yCoord) {
          curGene = _self.genes[dragged];
          _self.genes[dragged] = _self.genes[curGeneIndex];
          _self.genes[curGeneIndex] = curGene;
        }
      } else if (trans < 0 && curGeneIndex < dragged) {
        yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
        if (newY < yCoord) {
          curGene = _self.genes[dragged];
          _self.genes[dragged] = _self.genes[curGeneIndex];
          _self.genes[curGeneIndex] = curGene;
        }
      }
    });
  });

  drag.on('dragend', function() {
    _self.updateCallback(true);
  });

  var dragSelection = _self.row.call(drag);
  dragSelection.on('click', function() {
    if (d3.event.defaultPrevented) {
    }
  });

  _self.row.on('mouseover', function() {
    var curElement = this;
    if (typeof curElement.timeout !== 'undefined') {
      clearTimeout(curElement.timeout);
    }

    d3.select(this)
        .select('.' + _self.prefix + 'remove-gene')
        .attr('style', 'display: block');
  });

  _self.row.on('mouseout', function() {
    var curElement = this;
    curElement.timeout = setTimeout(function() {
    d3.select(curElement).select('.' + _self.prefix + 'remove-gene')
        .attr('style', 'display: none');
    }, 500);
  });
};

/**
 * Function that determines the y position of a mutation within a cell
 */
MainGrid.prototype.getY = function(d) {
  var _self = this;

  var pseudo_genes = _self.genes.map(function(g) {
    return g.id;
  });

  if (_self.heatMap === true) {
    return _self.y(pseudo_genes.indexOf(d.geneId));
  }

  var keys = Object.keys(_self.colorMap);
  return  _self.y(pseudo_genes.indexOf(d.geneId)) + (_self.cellHeight / keys.length) *
      (keys.indexOf(d.consequence));
};

/**
 * Returns the color for the given observation.
 * @param d observation.
 */
MainGrid.prototype.getColor = function(d) {
  var _self = this;

  if (_self.heatMap === true) {
    return '#D33682';
  } else {
    return _self.colorMap[d.consequence];
  }
};

/**
 * Returns the desired opacity of observation rects. This changes between heatmap and regular mode.
 * @returns {number}
 */
MainGrid.prototype.getOpacity = function() {
  var _self = this;

  if (_self.heatMap === true) {
    return 0.3;
  } else {
    return 1;
  }
};

/**
 * Returns the height of an observation cell. This changes between heatmap and regular mode.
 * @returns {number}
 */
MainGrid.prototype.getHeight = function() {
  var _self = this;

  if (_self.heatMap === true) {
    return _self.cellHeight;
  } else {
    return _self.cellHeight / Object.keys(_self.colorMap).length;
  }
};

/**
 * Toggles the observation rects between heatmap and regular mode.
 */
MainGrid.prototype.toggleHeatmap = function() {
  var _self = this;

  _self.heatMap = _self.heatMap !== true;

  d3.selectAll('.' + _self.prefix + 'sortable-rect')
      .transition()
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('height', function(d) { return _self.getHeight(d); })
      .attr('fill', function(d) { return _self.getColor(d); })
      .attr('opacity', function(d) { return _self.getOpacity(d); });
};

MainGrid.prototype.toggleGridLines = function() {
  var _self = this;

  if (_self.drawGridLines) {
    _self.drawGridLines = false;
  } else {
    _self.drawGridLines = true;
  }

  _self.computeCoordinates();
};

/**
 * Helper for getting donor index position
 */
MainGrid.prototype.getDonorIndex = function(donors, donorId) {
  for (var i = 0; i < donors.length; i++) {
    var donor = donors[i];
    if (donor.id === donorId) {
      return i;
    }
  }

  return -1;
};

/**
 * Removes all elements corresponding to the given gene and then removes it from the gene list.
 * @param i index of the gene to remove.
 */
MainGrid.prototype.removeGene = function(i) {
  var _self = this;

  var gene = _self.genes[i];
  if (gene) {
    d3.selectAll('.' + gene.id + '-cell').remove();
    d3.selectAll('.' + gene.id + '-bar').remove();
    _self.genes.splice(i, 1);
  }

  _self.updateCallback(true);
};

/**
 * Removes all svg elements for this grid.
 */
MainGrid.prototype.destroy = function() {
  var _self = this;

  d3.select(_self.element).select('.' + _self.prefix +'maingrid-svg').remove();
  d3.select(_self.element).select('.'+ _self.prefix + 'tooltip-oncogrid').remove();
};

module.exports = MainGrid;
