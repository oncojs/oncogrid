(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var OncoHistogram;

OncoHistogram = function (params, s, rotated) {
  var _self = this;

  _self.prefix = params.prefix || 'og-';

  _self.observations = params.observations;
  _self.svg = s;
  _self.rotated = rotated || false;

  _self.domain = (_self.rotated ? params.genes : params.donors) || [];
  _self.margin = params.margin || {top: 30, right: 15, bottom: 15, left: 80};

  _self.width = params.width || 500;
  _self.height = params.height || 500;

  _self.histogramWidth = (_self.rotated ? _self.height : _self.width);
  _self.histogramHeight = 80;

  _self.numDomain = _self.domain.length;
  _self.barWidth = (_self.rotated ? _self.height : _self.width) / _self.domain.length;
};

OncoHistogram.prototype.render = function (x, div) {
  var _self = this;
  _self.x = x;
  _self.div = div;

  /**
   * Want to find the maximum value so we can label the axis and scale the bars accordingly.
   * No need to make this function public.
   * @returns {number}
   */
  function getLargestCount() {
    var retVal = 1;

    for (var i = 0; i < _self.domain.length; i++) {
      var donor = _self.domain[i];
      retVal = Math.max(retVal, donor.count);
    }

    return retVal;
  }

  var topCount = getLargestCount();

  _self.container = _self.svg.append('g')
      .attr('class', _self.prefix + 'histogram')
      .attr('width', function () {
        if (_self.rotated) {
          return _self.height;
        } else {
          return _self.width + _self.margin.left + _self.margin.right;
        }
      })
      .attr('height', _self.histogramHeight)
      .style('margin-left', _self.margin.left + 'px')
      .attr('transform', function () {
        if (_self.rotated) {
          return 'rotate(90)translate(0,-' + (_self.width) + ')';
        } else {
          return '';
        }
      });

  _self.histogram = _self.container.append('g')
      .attr('transform', 'translate(0,-' + (_self.histogramHeight + _self.margin.top / 1.61803398875) + ')');

  _self.renderAxis(topCount);

  _self.histogram.selectAll('rect')
      .data(_self.domain)
      .enter()
      .append('rect')
      .on('mouseover', function (d) {
        _self.div.transition()
            .duration(200)
            .style('opacity', 0.9);
        _self.div.html('ID: ' + d.id + '<br/> Count:' + d.count + '<br/>')
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        _self.div.transition()
            .duration(500)
            .style('opacity', 0);
      })
      .on('click', _self.clickFunc)
      .transition()
      .attr('class', function (d) {
        return _self.prefix + 'sortable-bar ' + d.id + '-bar';
      })
      .attr('width', _self.barWidth - 1)
      .attr('height', function (d) {
        return _self.histogramHeight * d.count / topCount;
      })
      .attr('x', function (d) {
        return _self.x(_self.getIndex(_self.domain, d.id));
      })
      .attr('y', function (d) {
        return _self.histogramHeight - _self.histogramHeight * d.count / topCount;
      })
      .attr('fill', '#1693C0');
};

OncoHistogram.prototype.update = function (domain, x) {
  var _self = this;
  _self.x = x;
  _self.domain = domain;
  _self.barWidth = (_self.rotated ? _self.height : _self.width) / _self.domain.length;

  _self.histogram.selectAll('rect')
      .transition()
      .attr('width', _self.barWidth - 1)
      .attr('x', function (d) {
        return _self.x(_self.getIndex(_self.domain, d.id));
      });
};

OncoHistogram.prototype.resize = function (width, height) {
  var _self = this;

  _self.width = width;
  _self.height = height;

  _self.histogramWidth = (_self.rotated ? _self.height : _self.width);

  _self.container
      .attr('width', function () {
        if (_self.rotated) {
          return _self.height;
        } else {
          return _self.width + _self.margin.left + _self.margin.right;
        }
      })
      .attr('transform', function () {
        if (_self.rotated) {
          return 'rotate(90)translate(0,-' + (_self.width) + ')';
        } else {
          return '';
        }
      });

  _self.histogram
      .attr('transform', 'translate(0,-' + (_self.histogramHeight + _self.margin.top / 1.61803398875) + ')');

  _self.bottomAxis.attr('x2', _self.histogramWidth + 10);
};

/**
 * Draws Axis for Histogram
 * @param topCount Maximum value
 */
OncoHistogram.prototype.renderAxis = function (topCount) {
  var _self = this;

  _self.bottomAxis = _self.histogram.append('line')
      .attr('class', _self.prefix + 'histogram-axis')
      .attr('y1', _self.histogramHeight + 5)
      .attr('y2', _self.histogramHeight + 5)
      .attr('x2', _self.histogramWidth + 10)
      .attr('transform', 'translate(-5,0)');

  _self.histogram.append('line')
      .attr('class', _self.prefix + 'histogram-axis')
      .attr('y1', 0)
      .attr('y2', _self.histogramHeight + 5)
      .attr('transform', 'translate(-5,0)');

  _self.histogram.append('text')
      .attr('class', _self.prefix + 'label-text-font')
      .attr('x', -6)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(topCount);

  // Round to a nice round number and then adjust position accordingly
  var halfInt = parseInt(topCount / 2);
  var secondHeight = _self.histogramHeight - _self.histogramHeight / (topCount / halfInt);

  _self.histogram.append('text')
      .attr('class', _self.prefix + 'label-text-font')
      .attr('x', -6)
      .attr('y', secondHeight)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(halfInt);

  _self.histogram.append('text')
      .attr('class', _self.prefix + 'label-text-font')
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-90)translate(' + secondHeight / -2 + ',-25)')
      .text("Mutation freq.");
};

/**
 * Helper the gets the index of the current id.
 */
OncoHistogram.prototype.getIndex = function (list, id) {
  for (var i = 0; i < list.length; i++) {
    var obj = list[i];
    if (obj.id === id) {
      return i;
    }
  }

  return -1;
};

OncoHistogram.prototype.destroy = function() {
  var _self = this;
  _self.histogram.remove();
  _self.container.remove();
};

module.exports = OncoHistogram;
},{}],2:[function(require,module,exports){
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

MainGrid = function (params, lookupTable, func) {
  var _self = this;

  _self.lookupTable = lookupTable;
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

  _self.margin = params.margin || {top: 30, right: 100, bottom: 15, left: 80};
  _self.heatMap = params.heatMap;
  _self.histogramHeight = 100;

  _self.drawGridLines = false;
  _self.crosshair = false;

  _self.gridClick = params.gridClick;
};

/**
 * Creates main svg element, background, and tooltip.
 */
MainGrid.prototype.init = function () {
  var _self = this;

  _self.div = d3.select(_self.element).append('div')
      .attr('class', _self.prefix + 'tooltip-oncogrid')
      .style('opacity', 0);

  _self.svg = d3.select(_self.element).append('svg')
      .attr('class', _self.prefix + 'maingrid-svg')
      .attr('width', _self.width + _self.margin.left + _self.margin.right + _self.histogramHeight * 2)
      .attr('height', _self.height + _self.margin.top + _self.margin.bottom + _self.histogramHeight * 2)
      .style('margin-left', _self.margin.left + 'px')
      .append('g')
      .attr('transform', 'translate(' + _self.margin.left + ',' + (_self.margin.top + _self.histogramHeight) + ')');

  _self.background = _self.svg.append('rect')
      .attr('class', 'background')
      .attr('width', _self.width)
      .attr('height', _self.height);
};

/**
 * Only to be called the first time the OncoGrid is rendered. It creates the rects representing the
 * mutation occurrences.
 */
MainGrid.prototype.render = function () {
  var _self = this;

  _self.computeCoordinates();

  _self.svg.selectAll('.' + _self.prefix + 'maingrid-svg')
      .data(_self.observations).enter()
      .append('rect')
      .on('mouseover', function (d) {
        _self.div.transition()
            .duration(200)
            .style('opacity', 0.9);
        _self.div.html(d.id + '<br/>' + d.geneId + '<br/>' + d.donorId + '<br/>' + d.consequence)
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', function (d) {
        _self.div.transition()
            .duration(500)
            .style('opacity', 0);
      })
      .on('click', function (d) {
        if (typeof _self.gridClick !== 'undefined') {
          _self.gridClick(d);
        }
      })
      .transition()
      .attr('class', function (d) {
        return _self.prefix + 'sortable-rect ' + d.donorId + '-cell ' + d.geneId + '-cell';
      })
      .attr('cons', function (d) {
        return d.consequence;
      })
      .attr('x', function (d) {
        return _self.x(_self.getDonorIndex(_self.donors, d.donorId));
      })
      .attr('y', function (d) {
        return _self.getY(d);
      })
      .attr('width', _self.cellWidth)
      .attr('height', function (d) {
        return _self.getHeight(d);
      })
      .attr('fill', function (d) {
        return _self.getColor(d);
      })
      .attr('opacity', function (d) {
        return _self.getOpacity(d);
      })
      .attr('stroke-width', 2);

  _self.donorHistogram.render(_self.x, _self.div);
  _self.donorTrack.render(_self.x);

  _self.geneHistogram.render(_self.y, _self.div);
  _self.geneTrack.render(_self.y);

  _self.defineCrosshairBehaviour();
};

/**
 * Render function ensures presentation matches the data. Called after modifying data.
 */
MainGrid.prototype.update = function () {
  var _self = this;

  // Recalculate positions and dimensions of cells only on change in number of elements
  if (_self.numDonors !== _self.donors.length || _self.numGenes !== _self.genes.length) {
    _self.numDonors = _self.donors.length;
    _self.numGenes = _self.genes.length;
    _self.cellWidth = _self.width / _self.numDonors;
    _self.cellHeight = _self.height / _self.numGenes;
    _self.computeCoordinates();
  } else {
    console.log(_self.cellHeight);
    _self.row.selectAll('text').attr('style', function() {
      if (_self.cellHeight < 8) {
        return 'display: none;';
      } else {
        return '';
      }
    });
  }

  _self.row
      .transition()
      .attr('transform', function (d) {
        return 'translate( 0, ' + _self.y(_self.genes.indexOf(d)) + ')';
      });

  _self.svg.selectAll('.' + _self.prefix + 'sortable-rect')
      .transition()
      .attr('width', _self.cellWidth)
      .attr('height', function(d) {return _self.getHeight(d);})
      .attr('y', function (d) {
        return _self.getY(d);
      })
      .attr('x', function (d) {
        return _self.x(_self.getDonorIndex(_self.donors, d.donorId));
      });

  _self.donorHistogram.update(_self.donors, _self.x);
  _self.donorTrack.update(_self.donors, _self.x);

  _self.geneHistogram.update(_self.genes, _self.y);
  _self.geneTrack.update(_self.genes, _self.y);
};

/**
 * Updates coordinate system and renders the lines of the grid.
 */
MainGrid.prototype.computeCoordinates = function () {
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
      .attr('donor', function (d) {
        return d.id;
      })
      .attr('transform', function (d, i) {
        return 'translate(' + _self.x(i) + ')rotate(-90)';
      });

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
      .attr('class', _self.prefix + 'gene-row')
      .attr('transform', function (d, i) {
        return 'translate(0,' + _self.y(i) + ')';
      });

  if (_self.drawGridLines) {
    _self.row.append('line')
        .attr('x2', _self.width);
  }

  _self.row.append('text')
      .attr('class', function (g) {
        return g.id + '-label ' + _self.prefix + 'gene-label ' + _self.prefix + 'label-text-font';
      })
      .transition()
      .attr('x', -8)
      .attr('y', _self.cellHeight / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .attr('style', function() {
        if (_self.cellHeight < 8) {
         return 'display: none;';
        } else {
          return '';
        }
      })
      .text(function (d, i) {
        return _self.genes[i].symbol;
      });

  _self.defineRowDragBehaviour();
};

MainGrid.prototype.resize = function(width, height) {
  var _self = this;

  _self.width = width;
  _self.height = height;

  _self.verticalCross.attr('y2', height);
  _self.horizontalCross.attr('x2', width);

  d3.select('.og-maingrid-svg')
      .attr('width', _self.width + _self.margin.left + _self.margin.right + _self.histogramHeight * 2)
      .attr('height', _self.height + _self.margin.top + _self.margin.bottom + _self.histogramHeight * 2);

  _self.background
      .attr('width', _self.width)
      .attr('height', _self.height);

  _self.cellWidth = _self.width / _self.numDonors;
  _self.cellHeight = _self.height / _self.numGenes;
  _self.computeCoordinates();

  _self.donorHistogram.resize(width, height);
  _self.donorTrack.resize(width, height);

  _self.geneHistogram.resize(width, height);
  _self.geneTrack.resize(width, height);

  _self.update();
};

MainGrid.prototype.defineCrosshairBehaviour = function () {
  var _self = this;

  _self.verticalCross = _self.svg.append('line')
      .attr('class', _self.prefix + 'vertical-cross')
      .attr('y1', 0)
      .attr('y2', _self.height)
      .attr('opacity', 0);

  _self.horizontalCross = _self.svg.append('line')
      .attr('class', _self.prefix + 'horizontal-cross')
      .attr('x1', 0)
      .attr('x2', _self.width)
      .attr('opacity', 0);

  _self.svg
      .on('mouseover', function () {

        if (_self.crosshair) {
          var coord = d3.mouse(this);

          _self.verticalCross.attr('x1', coord[0]).attr('opacity', 1);
          _self.verticalCross.attr('x2', coord[0]).attr('opacity', 1);
          _self.horizontalCross.attr('y1', coord[1]).attr('opacity', 1);
          _self.horizontalCross.attr('y2', coord[1]).attr('opacity', 1);

          var xIndex = _self.rangeToDomain(_self.x, coord[0]);
          var yIndex = _self.rangeToDomain(_self.y, coord[1]);

          _self.div.transition()
              .duration(200)
              .style('opacity', 0.9);
          _self.div.html('Donor: ' + _self.donors[xIndex].id + '</br>' + 'Gene: ' + _self.genes[yIndex].id)
              .style('left', (d3.event.pageX + 10) + 'px')
              .style('top', (d3.event.pageY - 28) + 'px');
        }
      })
      .on('mousemove', function () {

        if (_self.crosshair) {
          var coord = d3.mouse(this);

          _self.verticalCross.attr('x1', coord[0]).attr('opacity', 1);
          _self.verticalCross.attr('x2', coord[0]).attr('opacity', 1);
          _self.horizontalCross.attr('y1', coord[1]).attr('opacity', 1);
          _self.horizontalCross.attr('y2', coord[1]).attr('opacity', 1);

          var xIndex = _self.rangeToDomain(_self.x, coord[0]);
          var yIndex = _self.rangeToDomain(_self.y, coord[1]);

          _self.div.html('Donor: ' + _self.donors[xIndex].id + '</br>' + 'Gene: ' + _self.genes[yIndex].id)
              .style('left', (d3.event.pageX + 10) + 'px')
              .style('top', (d3.event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function () {
        if (_self.crosshair) {
          _self.div.transition()
              .duration(500)
              .style('opacity', 0);


          _self.verticalCross.attr('opacity', 0);
          _self.horizontalCross.attr('opacity', 0);
        }
      });
};

/**
 * Defines the row drag behaviour for moving genes and binds it to the row elements.
 */
MainGrid.prototype.defineRowDragBehaviour = function () {
  var _self = this;

  var drag = d3.behavior.drag();
  drag.on('dragstart', function () {
    d3.event.sourceEvent.stopPropagation(); // silence other listeners
  });
  drag.on('drag', function (d) {
    var trans = d3.event.dy;
    var dragged = _self.genes.indexOf(d);
    var selection = d3.select(this);

    selection.attr('transform', function () {
      var transform = d3.transform(d3.select(this).attr('transform'));
      return 'translate( 0, ' + (parseInt(transform.translate[1]) + trans) + ')';
    });

    var newY = d3.transform(d3.select(this).attr('transform')).translate[1];

    _self.row.each(function (f) {
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

  drag.on('dragend', function () {
    _self.updateCallback(true);
  });

  var dragSelection = _self.row.call(drag);
  dragSelection.on('click', function () {
    if (d3.event.defaultPrevented) {
    }
  });

  _self.row.on('mouseover', function () {
    var curElement = this;
    if (typeof curElement.timeout !== 'undefined') {
      clearTimeout(curElement.timeout);
    }

    d3.select(this)
        .select('.' + _self.prefix + 'remove-gene')
        .attr('style', 'display: block');
  });

  _self.row.on('mouseout', function () {
    var curElement = this;
    curElement.timeout = setTimeout(function () {
      d3.select(curElement).select('.' + _self.prefix + 'remove-gene')
          .attr('style', 'display: none');
    }, 500);
  });
};

/**
 * Function that determines the y position of a mutation within a cell
 */
MainGrid.prototype.getY = function (d) {
  var _self = this;

  var pseudoGenes = _self.genes.map(function (g) {
    return g.id;
  });

  if (_self.heatMap === true) {
    return _self.y(pseudoGenes.indexOf(d.geneId));
  }

  var obsArray = _self.lookupTable[d.donorId][d.geneId];
  return _self.y(pseudoGenes.indexOf(d.geneId)) + (_self.cellHeight / obsArray.length) *
      (obsArray.indexOf(d.id));
};

/**
 * Returns the color for the given observation.
 * @param d observation.
 */
MainGrid.prototype.getColor = function (d) {
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
MainGrid.prototype.getOpacity = function () {
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
MainGrid.prototype.getHeight = function (d) {
  var _self = this;

  if (typeof d !== 'undefined') {
    if (_self.heatMap === true) {
      return _self.cellHeight;
    } else {
      var count = _self.lookupTable[d.donorId][d.geneId].length;
      return _self.cellHeight / count;
    }
  } else {
    return 0;
  }
};

/**
 * Toggles the observation rects between heatmap and regular mode.
 */
MainGrid.prototype.toggleHeatmap = function () {
  var _self = this;

  _self.heatMap = _self.heatMap !== true;

  d3.selectAll('.' + _self.prefix + 'sortable-rect')
      .transition()
      .attr('y', function (d) {
        return _self.getY(d);
      })
      .attr('height', function (d) {
        return _self.getHeight(d);
      })
      .attr('fill', function (d) {
        return _self.getColor(d);
      })
      .attr('opacity', function (d) {
        return _self.getOpacity(d);
      });
};

MainGrid.prototype.toggleGridLines = function () {
  var _self = this;

  if (_self.drawGridLines) {
    _self.drawGridLines = false;
  } else {
    _self.drawGridLines = true;
  }

  _self.geneTrack.toggleGridLines();
  _self.donorTrack.toggleGridLines();

  _self.computeCoordinates();
};

MainGrid.prototype.toggleCrosshair = function () {
  var _self = this;

  if (_self.crosshair) {
    _self.crosshair = false;
  } else {
    _self.crosshair = true;
  }

};

/**
 * Helper for getting donor index position
 */
MainGrid.prototype.getDonorIndex = function (donors, donorId) {
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
MainGrid.prototype.removeGene = function (i) {
  var _self = this;

  var gene = _self.genes[i];
  if (gene) {
    d3.selectAll('.' + gene.id + '-cell').remove();
    d3.selectAll('.' + gene.id + '-bar').remove();
    _self.genes.splice(i, 1);
  }

  _self.updateCallback(true);
};


MainGrid.prototype.rangeToDomain = function(scale, value) {
  return scale.domain()[d3.bisect(scale.range(), value) - 1];
};

/**
 * Removes all svg elements for this grid.
 */
MainGrid.prototype.destroy = function () {
  var _self = this;

  d3.select(_self.element).select('.' + _self.prefix + 'maingrid-svg').remove();
  d3.select(_self.element).select('.' + _self.prefix + 'tooltip-oncogrid').remove();
};

module.exports = MainGrid;

},{"./Histogram":1,"./Track":4}],3:[function(require,module,exports){
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

var MainGrid = require('./MainGrid');

var OncoGrid;


OncoGrid = function(params) {
  var _self = this;

  _self.donors = params.donors || [];
  _self.genes = params.genes || [];
  _self.observations = params.observations || [];

  _self.createLookupTable();
  _self.computeDonorCounts();
  _self.computeGeneCounts();
  _self.computeGeneScores();
  _self.genesSortbyScores();
  _self.computeScores();
  _self.sortByScores();

  _self.mainGrid = new MainGrid(params, _self.lookupTable, _self.update(_self));

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
 * Triggers a resize of OncoGrid to desired width and height.
 */
OncoGrid.prototype.resize = function(width, height) {
  var _self = this;

  _self.charts.forEach(function (chart) {
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
      d3.selectAll('.' + donor.id + '-cell').remove();
      d3.selectAll('.' + donor.id + '-bar').remove();
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
      d3.selectAll('.' + gene.id + '-cell').remove();
      d3.selectAll('.' + gene.id + '-bar').remove();
      _self.genes.splice(i, 1);
      i--;
    }
  }

  _self.update(_self)();
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

  _self.mainGrid.toggleHeatmap();
};

OncoGrid.prototype.toggleGridLines = function() {
  var _self = this;

  _self.mainGrid.toggleGridLines();
};

OncoGrid.prototype.toggleCrosshair = function() {
  var _self = this;

  _self.mainGrid.toggleCrosshair();
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
    return 0;
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

module.exports = OncoGrid;
},{"./MainGrid":2}],4:[function(require,module,exports){
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

var OncoTrack;

OncoTrack = function(params, s, rotated, tracks, opacityFunc, fillFunc) {
  var _self = this;

  _self.prefix = params.prefix || 'og-';

  _self.svg = s;
  _self.rotated = rotated || false;

  _self.margin = params.margin || { top: 30, right: 15, bottom: 15, left: 80 };

  _self.domain = (_self.rotated ? params.genes : params.donors) || [];
  _self.width = (_self.rotated ? params.height : params.width) || 500;

  _self.cellHeight = params.trackHeight || 20;
  _self.numDomain = _self.domain.length;
  _self.cellWidth = _self.width / _self.numDomain;

  _self.availableTracks = tracks || [];
  _self.opacityFunc = opacityFunc;
  _self.fillFunc = fillFunc;

  // TODO: This is awful, needs fixing and cleaning.
  _self.translateDown =
      (_self.rotated ? -1 * (params.width + 150 + _self.availableTracks.length * _self.cellHeight) :
          params.height) || 500;

  _self.height = _self.cellHeight * _self.availableTracks.length;

  _self.drawGridLines = false;
};

OncoTrack.prototype.init = function() {
  var _self = this;

  _self.trackData = [];

  for (var i = 0; i < _self.domain.length; i++) {
    for (var j = 0; j < _self.availableTracks.length; j++) {
      _self.trackData.push({
        id: _self.domain[i].id,
        value: _self.domain[i][_self.availableTracks[j].fieldName],
        fieldName: _self.availableTracks[j].fieldName,
        type: _self.availableTracks[j].type
      });
    }
  }

  _self.container = _self.svg.append('g')
      .attr('width', _self.width)
      .attr('height', _self.height)
      .attr('class', _self.prefix + 'track')
      .attr('transform', function() {
        if (_self.rotated) {
          return 'rotate(90)';
        } else {
          return '';
        }
      });
  _self.track = _self.container.append('g')
      .attr('transform', 'translate(0,'+ (_self.translateDown + _self.margin.top/1.61803398875) + ')');

  _self.background = _self.track.append('rect')
      .attr('class', 'background')
      .attr('width', _self.width)
      .attr('height', _self.height);

};

OncoTrack.prototype.render = function(x) {
  var _self = this;

  _self.x = x;
  _self.computeCoordinates();

  _self.track.selectAll('.' + _self.prefix + 'track')
      .data(_self.trackData).enter()
      .append('rect')
      .transition()
      .attr('class', function(d) {
        return _self.prefix + 'track-data' + ' ' + _self.prefix + 'track-' + d.fieldName +
            ' ' + _self.prefix + 'track-' + d.value + ' ' + d.id + '-cell';
      })
      .attr('x', function(d) { return _self.getX(d); })
      .attr('y', function(d) { return _self.getY(d); })
      .attr('width', _self.cellWidth)
      .attr('height', _self.cellHeight)
      .attr('fill', _self.fillFunc)
      .attr('opacity', _self.opacityFunc);
};

OncoTrack.prototype.resize = function (width, height) {
  var _self = this;

  _self.width = _self.rotated ? height : width;

  _self.cellWidth = _self.width / _self.numDomain;

  _self.height = _self.cellHeight * _self.availableTracks.length;

  _self.translateDown =
      (_self.rotated ? -1 * (width + 150 + _self.availableTracks.length * _self.cellHeight) :
          height) || 500;

  _self.container
      .attr('width', _self.width)
      .attr('height', _self.height);

  _self.track.attr('transform', 'translate(0,'+ (_self.translateDown + _self.margin.top/1.61803398875) + ')');

  _self.background
      .attr('width', _self.width)
      .attr('height', _self.height);

  _self.computeCoordinates();

};

/**
 * Updates the rendering of the tracks.
 */
OncoTrack.prototype.update = function(domain, x) {
  var _self = this;

  _self.domain = domain;
  _self.x = x;

  if (_self.domain.length !== _self.numDomain) {
    _self.numDomain = _self.domain.length;
    _self.computeCoordinates();
    _self.cellWidth  = _self.width / _self.numDomain;
  }

  _self.track.selectAll('.' + _self.prefix + 'track-data')
      .transition()
      .attr('x', function(d) { return _self.getX(d); })
      .attr('width', _self.cellWidth);
};

OncoTrack.prototype.getX = function(obj) {
  var _self = this;

  var index = _self.domain.map(function(d) {
    return d.id;
  });

  return _self.x(index.indexOf(obj.id));
};

OncoTrack.prototype.getY = function(obj) {
  var _self = this;

  var index = _self.availableTracks.map(function(d) {
    return d.fieldName;
  });

  return _self.y(index.indexOf(obj.fieldName));
};

/**
 * Updates coordinate system
 */
OncoTrack.prototype.computeCoordinates = function() {
  var _self = this;

  if (typeof _self.column !== 'undefined') {
    _self.column.remove();
  }

  _self.column = _self.track.selectAll('.' + _self.prefix + 'column')
      .data(_self.domain)
      .enter().append('g')
      .attr('class', _self.prefix + 'column')
      .attr('donor', function(d) { return d.id; })
      .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

  if (_self.drawGridLines) {
    _self.column.append('line')
        .attr('x1', -_self.height);
  }

  _self.y = d3.scale.ordinal()
      .domain(d3.range(_self.availableTracks.length))
      .rangeBands([0, _self.height]);

  if (typeof _self.row !== 'undefined') {
    _self.row.remove();
  }

  _self.row = _self.track.selectAll('.' + _self.prefix + 'row')
      .data(_self.availableTracks)
      .enter().append('g')
      .attr('class', _self.prefix + 'row')
      .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

  if (_self.drawGridLines) {
    _self.row.append('line')
        .attr('x2', _self.width);
  }

  _self.row.append('text')
      .attr('class', _self.prefix + 'gene-label ' + _self.prefix + 'label-text-font')
      .transition()
      .attr('x', -6)
      .attr('y', _self.cellHeight / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(function(d, i) {
        return _self.availableTracks[i].name;
      });
};

OncoTrack.prototype.toggleGridLines = function() {
  var _self = this;

  if (_self.drawGridLines) {
    _self.drawGridLines = false;
  } else {
    _self.drawGridLines = true;
  }

  _self.computeCoordinates();
};

module.exports = OncoTrack;
},{}],5:[function(require,module,exports){
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

"use strict";

window.OncoGrid = require('./OncoGrid');
},{"./OncoGrid":3}]},{},[5])