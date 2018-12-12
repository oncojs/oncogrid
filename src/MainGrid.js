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
var d3 = require('d3');

var OncoHistogram = require('./Histogram');
var OncoTrack = require('./Track');

var MainGrid;

MainGrid = function (params, lookupTable, updateCallback, resizeCallback, x, y) {
    var _self = this;
    _self.emit = params.emit;
    _self.x = x;
    _self.y = y;
    _self.lookupTable = lookupTable;
    _self.updateCallback = updateCallback;
    _self.resizeCallback = resizeCallback;
    _self.loadParams(params);
    _self.createGeneMap();
    _self.init();
    // Histograms and tracks.
    _self.donorHistogram = new OncoHistogram(params, _self.container, false);
    _self.histogramHeight = _self.donorHistogram.totalHeight;
    _self.cnvDonorHistogram = new OncoHistogram(params, _self.container, false, 'cnv');

    _self.donorTrack =
        new OncoTrack(params, _self.container, false, params.donorTracks, params.donorOpacityFunc,
            params.donorFillFunc, updateCallback, _self.height, _self.resizeCallback, _self.isFullscreen);
    _self.donorTrack.init();

    _self.geneHistogram = new OncoHistogram(params, _self.container, true);
    _self.geneTrack =
        new OncoTrack(params, _self.container, true, params.geneTracks, params.geneOpacityFunc,
            params.geneFillFunc, updateCallback, _self.width + (_self.histogramHeight * _self.numTypes), _self.resizeCallback, _self.isFullscreen);
    _self.geneTrack.init();

    _self.cnvGeneHistogram = new OncoHistogram(params, _self.container, true, 'cnv');
};

/**
 * Responsible for initializing instance fields of MainGrid from the provided params object.
 * @param params
 */
MainGrid.prototype.loadParams = function (params) {
    var _self = this;
    _self.scaleToFit = typeof params.scaleToFit === 'boolean' ? params.scaleToFit : true;
    _self.leftTextWidth = params.leftTextWidth || 80;
    _self.prefix = params.prefix || 'og-';

    _self.minCellHeight = params.minCellHeight || 10;
    _self.donors = params.donors || [];
    _self.genes = params.genes || [];
    _self.types = [];
    _self.ssmObservations = params.ssmObservations || [];
    _self.cnvObservations = params.cnvObservations || [];
    _self.observations = _self.cnvObservations.concat(_self.ssmObservations) || [];
    if (_self.cnvObservations.length) { _self.types.push('cnv'); }
    if (_self.ssmObservations.length) { _self.types.push('mutation'); }

    _self.wrapper = d3.select(params.wrapper || 'body');

    _self.colorMap = params.colorMap || {
        'missense_variant': '#ff9b6c',
        'frameshift_variant': '#57dba4',
        'stop_gained': '#af57db',
        'start_lost': '#ff2323',
        'stop_lost': '#d3ec00',
        'initiator_codon_variant': '#5abaff'
    };

    _self.numDonors = _self.donors.length;
    _self.numGenes = _self.genes.length;
    _self.numTypes = _self.types.length;

    _self.fullscreen = false;

    _self.isFullscreen = function () {
        return _self.fullscreen;
    };

    _self.width = params.width || 500;
    _self.height = params.height || 500;
    _self.inputWidth = params.width || 500;
    _self.inputHeight = params.height || 500;

    _self.cellWidth = _self.width / _self.donors.length;

    _self.cellHeight = _self.height / _self.numGenes;

    if (_self.cellHeight < _self.minCellHeight) {
        _self.cellHeight = _self.minCellHeight;
        params.height = _self.numGenes * _self.minCellHeight;
        _self.height = params.height;
    }

    _self.margin = params.margin || { top: 30, right: 100, bottom: 15, left: 80 };
    _self.heatMap = params.heatMap;

    _self.drawGridLines = params.grid || false;
    _self.crosshair = false;
    _self.heatMapColor = params.heatMapColor || '#D33682';
};

/**
 * Creates main svg element, background, and tooltip.
 */
MainGrid.prototype.init = function () {
    var _self = this;

    _self.canvas = _self.wrapper.append('canvas') // forces size of container to prevent default height in IE
        .attr('class', _self.prefix + 'canvas');

    _self.svg = _self.wrapper.append('svg')
        .attr('class', _self.prefix + 'maingrid-svg')
        .attr('id', _self.prefix + 'maingrid-svg')
        .attr('width', '100%')
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0);

    _self.container = _self.svg
        .append('g');

    _self.background = _self.container.append('rect')
        .attr('class', 'background')
        .attr('width', _self.width)
        .attr('height', _self.height);

    _self.gridContainer = _self.container.append('g');
};

/**
 * Only to be called the first time the OncoGrid is rendered. It creates the rects representing the
 * mutation occurrences.
 */
MainGrid.prototype.render = function () {
    var _self = this;

    _self.emit('render:mainGrid:start');
    _self.computeCoordinates();

    _self.svg.on('mouseover', function (d) {
        var target = d3.event.target;
        var coord = d3.mouse(target);

        var xIndex = _self.rangeToDomain(_self.x, coord[0]);
        var yIndex = _self.rangeToDomain(_self.y, coord[1]);

        if (!target.dataset.obsIndex || _self.crosshair) { return; }
        var obsIds = target.dataset.obsIndex.split(' ');
        var obs = _self.observations.filter(function (o) {
          return o.donorId === obsIds[0] && o.geneId === obsIds[1];
        });

        _self.emit('gridMouseOver', {
            observation: obs,
            donor: _self.donors[xIndex],
            gene: _self.genes[yIndex],
        });
    });

    _self.svg.on('mouseout', function () {
        _self.emit('gridMouseOut');
    });

    _self.svg.on('click', function () {
        var obsIds = d3.event.target.dataset.obsIndex && d3.event.target.dataset.obsIndex.split(' ');
        if (!obsIds) { return; }

        var observation = _self.observations.filter(function (o) {
            return o.donorId === obsIds[0] && o.geneId === obsIds[1];
        });
        if (!observation) { return; }
        _self.emit('gridClick', { donorId: obsIds[0], geneId: obsIds[1] });
    });

    _self.container.selectAll('.' + _self.prefix + 'maingrid-svg')
        .data(_self.observations).enter()
        .append('path')
        .attr('data-obs-index', function (d, i) {
            return d.donorId + ' ' + d.geneId;
        })
        .attr('class', function (d) {
            return _self.prefix + 'sortable-rect-' + d.type + ' ' + _self.prefix + d.donorId + '-cell ' + _self.prefix + d.geneId + '-cell';
        })
        .attr('cons', function (d) {
            return _self.getValueByType(d);
        })
        .attr('d', function (d) {
            if (d.type === 'cnv' || _self.heatMap) {
              return _self.getRectangularPath(d);
            }
            return _self.getCircularPath(d);
        })
        .attr('fill', function (d) {
            return _self.getColor(d);
        })
        .attr('opacity', function (d) {
            return _self.getOpacity(d);
        })


    _self.emit('render:mainGrid:end');

    if (_self.cnvObservations.length) {
      _self.emit('render:cnvDonorHistogram:start');
      _self.cnvDonorHistogram.render();
      _self.emit('render:cnvDonorHistogram:end');

      _self.emit('render:cnvGeneHistogram:start');
      _self.cnvGeneHistogram.render();
      _self.emit('render:cnvGeneHistogram:end');
    }

    if (_self.ssmObservations.length) {
      _self.emit('render:donorHistogram:start');
      _self.donorHistogram.render();
      _self.emit('render:donorHistogram:end');

      _self.emit('render:geneHistogram:start');
      _self.geneHistogram.render();
      _self.emit('render:geneHistogram:end');
    }

    _self.emit('render:donorTrack:start');
    _self.donorTrack.render();
    _self.emit('render:donorTrack:end');

    _self.emit('render:geneTrack:start');
    _self.geneTrack.render();
    _self.emit('render:geneTrack:end');

    _self.defineCrosshairBehaviour();

    _self.resizeSvg();
};

/**
 * Render function ensures presentation matches the data. Called after modifying data.
 */
MainGrid.prototype.update = function (x, y) {
    var _self = this;
    _self.createGeneMap();

    _self.x = x;
    _self.y = y;

    // Recalculate positions and dimensions of cells only on change in number of elements
    if (_self.numDonors !== _self.donors.length || _self.numGenes !== _self.genes.length) {
        _self.numDonors = _self.donors.length;
        _self.numGenes = _self.genes.length;
        _self.cellWidth = _self.width / _self.donors.length;
        _self.cellHeight = _self.height / _self.genes.length;
        _self.computeCoordinates();
    } else {
        _self.row.selectAll('text').attr('style', function () {
            if (_self.cellHeight < _self.minCellHeight) {
                return 'display: none;';
            } else {
                return '';
            }
        });
    }

    _self.row
        .transition()
        .attr('transform', function (d) {
            return 'translate( 0, ' + d.y + ')';
        });

    for (var i = 0; i < _self.numTypes; i++) {
        _self.container.selectAll('.' + _self.prefix + 'sortable-rect-' + _self.types[i])
            .transition()
            .attr('d', function (d) {
              if (d.type === 'cnv' || _self.heatMap) {
                return _self.getRectangularPath(d);
              }
              return _self.getCircularPath(d);
            })
    }

    if (_self.ssmObservations.length) {
      _self.donorHistogram.update(_self.donors);
      _self.geneHistogram.update(_self.genes);
    }

    if (_self.cnvObservations.length) {
      _self.cnvDonorHistogram.update(_self.donors);
      _self.cnvGeneHistogram.update(_self.genes);
    }

    _self.donorTrack.update(_self.donors);
    _self.geneTrack.update(_self.genes);
};


/**
 * Updates coordinate system and renders the lines of the grid.
 */
MainGrid.prototype.computeCoordinates = function () {
    var _self = this;

    _self.cellWidth = _self.width / _self.donors.length;

    if (typeof _self.column !== 'undefined') {
        _self.column.remove();
    }

    if (_self.drawGridLines) {
        _self.column = _self.gridContainer.selectAll('.' + _self.prefix + 'donor-column')
            .data(_self.donors)
            .enter()
            .append('line')
            .attr({
                x1: function (d) { return d.x; },
                x2: function (d) { return d.x; },
                y2: _self.height,
                'class': _self.prefix + 'donor-column',
            })
            .style('pointer-events', 'none');
    }

    _self.cellHeight = _self.height / _self.genes.length;

    if (typeof _self.row !== 'undefined') {
        _self.row.remove();
    }

    _self.row = _self.gridContainer.selectAll('.' + _self.prefix + 'gene-row')
        .data(_self.genes)
        .enter().append('g')
        .attr('class', _self.prefix + 'gene-row')
        .attr('transform', function (d) {
            return 'translate(0,' + d.y + ')';
        });

    if (_self.drawGridLines) {
        _self.row.append('line')
            .attr('x2', _self.width)
            .style('pointer-events', 'none');
    }

    _self.row.append('text')
        .attr('class', function (g) {
            return _self.prefix + g.id + '-label ' + _self.prefix + 'gene-label ' + _self.prefix + 'label-text-font';
        })
        .attr('x', -8)
        .attr('y', _self.cellHeight / 2)
        .attr('dy', '.32em')
        .attr('text-anchor', 'end')
        .attr('style', function () {
            if (_self.cellHeight < _self.minCellHeight) {
                return 'display: none;';
            } else {
                return '';
            }
        })
        .text(function (d, i) {
            return _self.genes[i].symbol;
        })

    _self.defineRowDragBehaviour();
};

MainGrid.prototype.resize = function (width, height, x, y) {
    var _self = this;

    _self.createGeneMap();

    _self.x = x;
    _self.y = y;
    _self.width = width;
    _self.height = height;

    _self.cellWidth = _self.width / _self.donors.length;
    _self.cellHeight = _self.height / _self.genes.length;

    if (_self.cellHeight < _self.minCellHeight) {
        _self.cellHeight = _self.minCellHeight;
        _self.height = _self.genes.length * _self.minCellHeight;
    }

    _self.background
        .attr('width', _self.width)
        .attr('height', _self.height);

    _self.computeCoordinates();

    if (_self.ssmObservations.length) {
      _self.donorHistogram.resize(width, _self.height);
      _self.geneHistogram.resize(width, _self.height);
    }

    if (_self.cnvObservations.length) {
      _self.cnvDonorHistogram.resize(width, _self.height);
      _self.cnvGeneHistogram.resize(width, _self.height);
    }

    _self.donorTrack.resize(width, _self.height, _self.height);
    _self.geneTrack.resize(width, _self.height, _self.width + _self.histogramHeight + 120);

    _self.resizeSvg();
    _self.update(_self.x, _self.x);

    _self.verticalCross.attr('y2', _self.height + _self.donorTrack.height);
    _self.horizontalCross.attr('x2', _self.width + (_self.histogramHeight * _self.numTypes) + _self.geneTrack.height);
};

MainGrid.prototype.resizeSvg = function () {
    var _self = this;
    var width = _self.margin.left + _self.leftTextWidth + _self.width + (_self.histogramHeight * _self.numTypes) + _self.geneTrack.height + _self.margin.right;

    var height = _self.margin.top + (_self.histogramHeight * _self.numTypes) + _self.height + _self.donorTrack.height + _self.margin.bottom;

    _self.canvas
        .attr('width', width)
        .attr('height', height);

    if (_self.scaleToFit) {
        _self.canvas.style('width', '100%');
        _self.svg.attr('viewBox', '0 0 ' + width + ' ' + height);
    } else {
        _self.canvas.style('width', width + 'px');
        _self.svg.attr('width', width).attr('height', height);
    }

    _self.container
        .attr('transform', 'translate(' +
            (_self.margin.left + _self.leftTextWidth) + ',' +
            (_self.margin.top + (_self.histogramHeight * _self.numTypes)) +
            ')');
};

MainGrid.prototype.defineCrosshairBehaviour = function () {
    var _self = this;

    var moveCrossHair = function (eventType, target) {
        if (_self.crosshair) {
            var coord = d3.mouse(target);

            _self.verticalCross.attr('x1', coord[0]).attr('opacity', 1);
            _self.verticalCross.attr('x2', coord[0]).attr('opacity', 1);
            _self.horizontalCross.attr('y1', coord[1]).attr('opacity', 1);
            _self.horizontalCross.attr('y2', coord[1]).attr('opacity', 1);

            if (eventType === 'mousemove' && typeof _self.selectionRegion !== 'undefined') {
                _self.changeSelection(coord);
            }

            var xIndex = _self.width < coord[0] ? -1 : _self.rangeToDomain(_self.x, coord[0]);
            var yIndex = _self.height < coord[1] ? -1 : _self.rangeToDomain(_self.y, coord[1]);

            var donor = _self.donors[xIndex];
            var gene = _self.genes[yIndex];

            if (!donor || !gene) { return; }

            _self.emit('gridCrosshairMouseOver', {
                donor: donor,
                gene: gene,
            });
        }
    };

    _self.verticalCross = _self.container.append('line')
        .attr('class', _self.prefix + 'vertical-cross')
        .attr('y1', -_self.histogramHeight)
        .attr('y2', _self.height + _self.donorTrack.height)
        .attr('opacity', 0)
        .attr('style', 'pointer-events: none');

    _self.horizontalCross = _self.container.append('line')
        .attr('class', _self.prefix + 'horizontal-cross')
        .attr('x1', 0)
        .attr('x2', _self.width + _self.histogramHeight + _self.geneTrack.height)
        .attr('opacity', 0)
        .attr('style', 'pointer-events: none');

    _self.container
        .on('mousedown', function () { _self.startSelection(this); })
        .on('mouseover', function () { moveCrossHair('mouseover', this); })
        .on('mousemove', function () { moveCrossHair('mousemove', this); })
        .on('mouseout', function () {
            if (_self.crosshair) {
                _self.verticalCross.attr('opacity', 0);
                _self.horizontalCross.attr('opacity', 0);
                _self.emit('gridCrosshairMouseOut');
            }
        })
        .on('mouseup', function () { _self.finishSelection(); });
};

/**
 * Event behavior when pressing down on the mouse to make a selection
 */
MainGrid.prototype.startSelection = function (e) {
    var _self = this;

    if (_self.crosshair && typeof _self.selectionRegion === 'undefined') {
        d3.event.stopPropagation();
        var coord = d3.mouse(e);

        _self.selectionRegion = _self.container.append('rect')
            .attr('x', coord[0])
            .attr('y', coord[1])
            .attr('width', 1)
            .attr('height', 1)
            .attr('class', _self.prefix + 'selection-region')
            .attr('stroke', 'black')
            .attr('stroke-width', '2')
            .attr('opacity', 0.2);
    }
};

/**
 * Event behavior as you drag selected region around
 */
MainGrid.prototype.changeSelection = function (coord) {
    var _self = this;

    var rect = {
        x: parseInt(_self.selectionRegion.attr('x'), 10),
        y: parseInt(_self.selectionRegion.attr('y'), 10),
        width: parseInt(_self.selectionRegion.attr('width'), 10),
        height: parseInt(_self.selectionRegion.attr('height'), 10)
    };

    var move = {
        x: coord[0] - Number(_self.selectionRegion.attr('x')),
        y: coord[1] - Number(_self.selectionRegion.attr('y'))
    };

    if (move.x < 1 || (move.x * 2 < rect.width)) {
        rect.x = coord[0];
        rect.width -= move.x;
    } else {
        rect.width = move.x;
    }

    if (move.y < 1 || (move.y * 2 < rect.height)) {
        rect.y = coord[1];
        rect.height -= move.y;
    } else {
        rect.height = move.y;
    }

    _self.selectionRegion.attr(rect);
};

/**
 * Event behavior when releasing mouse when finishing with a selection
 */
MainGrid.prototype.finishSelection = function () {
    var _self = this;

    if (_self.crosshair && typeof _self.selectionRegion !== 'undefined') {
        d3.event.stopPropagation();

        var x1 = Number(_self.selectionRegion.attr('x'));
        var x2 = x1 + Number(_self.selectionRegion.attr('width'));

        var y1 = Number(_self.selectionRegion.attr('y'));
        var y2 = y1 + Number(_self.selectionRegion.attr('height'));

        var xStart = _self.rangeToDomain(_self.x, x1);
        var xStop = _self.rangeToDomain(_self.x, x2);

        var yStart = _self.rangeToDomain(_self.y, y1);
        var yStop = _self.rangeToDomain(_self.y, y2);

        _self.sliceDonors(xStart, xStop);
        _self.sliceGenes(yStart, yStop);

        _self.selectionRegion.remove();
        delete _self.selectionRegion;
        _self.updateCallback(true);

        // _self.crosshair = false; // this needs to be updated in frontend state
        // emit event to ui

    }
};

/**
 * Used when resizing grid
 * @param start - start index of the selection
 * @param stop - end index of the selection
 */
MainGrid.prototype.sliceGenes = function (start, stop) {
    var _self = this;

    for (var i = 0; i < _self.genes.length; i++) {
        var gene = _self.genes[i];
        if (i < start || i > stop) {
            d3.selectAll('.' + _self.prefix + gene.id + '-cell').remove();
            d3.selectAll('.' + _self.prefix + gene.id + '-bar').remove();
            _self.genes.splice(i, 1);
            i--; start--; stop--;
        }
    }
};

/**
 * Used when resizing grid
 * @param start - start index of the selection
 * @param stop - end index of the selection
 */
MainGrid.prototype.sliceDonors = function (start, stop) {
    var _self = this;

    for (var i = 0; i < _self.donors.length; i++) {
        var donor = _self.donors[i];
        if (i < start || i > stop) {
            d3.selectAll('.' + _self.prefix + donor.id + '-cell').remove();
            d3.selectAll('.' + _self.prefix + donor.id + '-bar').remove();
            _self.donors.splice(i, 1);
            i--; start--; stop--;
        }
    }
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
    drag.on('drag', function () {
        var trans = d3.event.dy;
        var selection = d3.select(this);

        selection.attr('transform', function () {
            var transform = d3.transform(d3.select(this).attr('transform'));
            return 'translate( 0, ' + (parseInt(transform.translate[1]) + trans) + ')';
        });
    });

    drag.on('dragend', function (d) {
        var coord = d3.mouse(_self.container.node());
        var dragged = _self.genes.indexOf(d);
        var yIndex = _self.rangeToDomain(_self.y, coord[1]);

        _self.genes.splice(dragged, 1);
        _self.genes.splice(yIndex, 0, d);

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

MainGrid.prototype.createGeneMap = function () {
    var _self = this;
    var geneMap = {};
    for (var i = 0; i < _self.genes.length; i += 1) {
        var gene = _self.genes[i];
        geneMap[gene.id] = gene;
    }
    _self.geneMap = geneMap;
};
/**
 * Function that determines the y position of a mutation within a cell
 */
MainGrid.prototype.getY = function (d) {
    var _self = this;

    var y = _self.geneMap[d.geneId].y;

    if (!_self.heatMap && d.type === 'mutation') {
      var yPosition = y + _self.cellHeight/2;
      if (yPosition < 0) {
        return 0;
      }
      return yPosition;
    }
    return y;
};

/**
 * Function that determines the x position of a mutation or cnv within a cell
 */
MainGrid.prototype.getCellX = function (d) {
  var _self = this;

  var x = _self.lookupTable[d.type][d.donorId].x;

  if (!_self.heatMap && d.type === 'mutation') {
    return x + (_self.cellWidth/4);
  }
  return x;
};

/**
 * Returns the color for the given observation.
 * @param d observation.
 */
MainGrid.prototype.getColor = function (d) {
    var _self = this;
    var colorKey = d.type === 'cnv' ? d.cnvChange : d.consequence;
    if (_self.heatMap === true) {
        return _self.heatMapColor;
    } else {
      return _self.colorMap[d.type][colorKey];
    }
};

/**
 * Returns the desired opacity of observation rects. This changes between heatmap and regular mode.
 * @returns {number}
 */
MainGrid.prototype.getOpacity = function (d) {
    var _self = this;

    if (_self.heatMap === true) {
        return 0.25;
    } else {
        return 1;
    }
};

/**
 * Returns the height of an observation cell.
 * @returns {number}
 */
MainGrid.prototype.getHeight = function (d) {
    var _self = this;

    if (typeof d !== 'undefined') {
        if (!_self.heatMap === true && d.type === 'mutation') {
          if (_self.cellWidth > _self.cellHeight) {
            return _self.cellHeight/2;
          }
          return (_self.cellWidth/2);
        } else {
          return _self.cellHeight;
        }
    } else {
        return 0;
    }
};

MainGrid.prototype.getCellWidth = function (d) {
    var _self = this;
    if (_self.heatMap || d.type === 'cnv') {
      return _self.cellWidth;
    }
    if (_self.cellWidth > _self.cellHeight) {
      return _self.cellHeight/4;
    }
    return _self.cellWidth/4;
};

/**
 * Returns the correct observation value based on the data type.
*/
MainGrid.prototype.getValueByType = function (d) {
  var _self = this;
  if (d.type === 'cnv') {
    return d.cnvChange;
  }
  return d.consequence;
};

/**
* Returns circular path based on cell dimensions
*/
MainGrid.prototype.getCircularPath = function (d) {
  var _self = this;
  var x1 = _self.getCellX(d);
  var y1 = _self.getY(d);
  return 'M ' + (x1 + _self.cellWidth/4) + ', ' + y1 + ' m ' + (-1 * _self.getCellWidth(d)) + ', 0 ' + 'a ' + _self.getCellWidth(d) + ', ' + _self.getCellWidth(d) + ' 0 1,0 ' + (2 * _self.getCellWidth(d)) + ',0 a ' + _self.getCellWidth(d) + ',' + _self.getCellWidth(d) + ' 0 1,0 ' + (-1 * (2 *_self.getCellWidth(d))) + ',0';
};

/**
* Returns rectangular path based on cell dimensions
*/
MainGrid.prototype.getRectangularPath = function (d) {
  var _self = this;
  var x1 = _self.getCellX(d);
  var y1 = _self.getY(d);
  return 'M ' + x1 + ' ' + y1 + ' H ' + (x1 + _self.cellWidth) + ' V ' + (y1 + _self.getHeight(d)) + ' H ' + x1 + 'Z';
};

/**
 * set the observation rects between heatmap and regular mode.
 */
MainGrid.prototype.setHeatmap = function (active) {
    var _self = this;
    if (active === _self.heatMap) return _self.heatMap;
    _self.heatMap = active;

    for (var i = 0; i < _self.numTypes; i++) {
      d3.selectAll('.' + _self.prefix + 'sortable-rect-' + _self.types[i])
        .transition()
      .attr('d', function (d) {
        if (d.type === 'cnv' || _self.heatMap) {
            return _self.getRectangularPath(d);
        }
        return _self.getCircularPath(d);
      })
      .attr('fill', function (d) {
          return _self.getColor(d);
      })
      .attr('opacity', function (d) {
          return _self.getOpacity(d);
      })
    }


    return _self.heatMap;
};

MainGrid.prototype.setGridLines = function (active) {
    var _self = this;
    if (_self.drawGridLines === active) return _self.drawGridLines;
    _self.drawGridLines = active;

    _self.geneTrack.setGridLines(_self.drawGridLines);
    _self.donorTrack.setGridLines(_self.drawGridLines);

    _self.computeCoordinates();

    return _self.drawGridLines;
};

MainGrid.prototype.setCrosshair = function (active) {
    var _self = this;
    _self.crosshair = active;

    return _self.crosshair;
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
        d3.selectAll('.' + _self.prefix + gene.id + '-cell').remove();
        d3.selectAll('.' + _self.prefix + gene.id + '-bar').remove();
        _self.genes.splice(i, 1);
    }

    _self.updateCallback(true);
};


MainGrid.prototype.rangeToDomain = function (scale, value) {
    return scale.domain()[d3.bisect(scale.range(), value) - 1];
};


MainGrid.prototype.nullableObsLookup = function (donor, gene) {
    var _self = this;

    if (!donor || typeof donor !== 'object') return null;
    if (!gene || typeof gene !== 'object') return null;

    if (_self.lookupTable.hasOwnProperty(donor.id) && _self.lookupTable[donor.id].hasOwnProperty(gene.id)) {
        return _self.lookupTable[donor.id][gene.id].join(', '); // Table stores arrays and we want to return a string;
    } else {
        return null;
    }
};

/**
 * Removes all svg elements for this grid.
 */
MainGrid.prototype.destroy = function () {
    var _self = this;

    _self.wrapper.select('.' + _self.prefix + 'maingrid-svg').remove();
    _self.wrapper.select('.' + _self.prefix + 'canvas').remove();
};

module.exports = MainGrid;
