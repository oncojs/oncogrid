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

var OncoTrackGroup;

OncoTrackGroup = function (params, name, rotated, opacityFunc, fillFunc, updateCallback, resizeCallback) {
    var _self = this;

    _self.prefix = params.prefix || 'og-';
    _self.expandable = params.expandable;
    _self.name = name;
    _self.cellHeight = params.cellHeight || 20;
    _self.height = 0;
    _self.totalHeight = 0;
    _self.width = params.width;
    _self.tracks = [];
    _self.collapsedTracks = [];
    _self.length = 0;

    _self.nullSentinel =  params.nullSentinel || -777;


    _self.rotated = rotated;
    _self.updateCallback = updateCallback;
    _self.resizeCallback = resizeCallback;
    _self.trackLegend = params.trackLegend;

    _self.clickFunc = params.clickFunc;
    _self.opacityFunc = opacityFunc;
    _self.fillFunc = fillFunc;

    _self.addTrackFunc = params.addTrackFunc || function(tracks, callback) {
        callback(tracks[0]);
    };
    _self.drawGridLines = params.grid || false;
    _self.domain = params.domain;

    _self.trackData = [];
};

/**
 * Method for adding a track to the track group.
 */
OncoTrackGroup.prototype.addTrack = function (tracks) {
    var _self = this;

    tracks = Array.isArray(tracks) ? tracks : [tracks];

    for(var i = 0, track; i < tracks.length; i++) {
        track = tracks[i];

        if(!_self.rendered && track.collapsed && _self.expandable) {
            _self.collapsedTracks.push(track);
        } else {
            _self.tracks.push(track);
        }
    }

    _self.collapsedTracks = _self.collapsedTracks.filter(function(collapsedTrack) {
        return !_self.tracks.some(function(track) {
            return _.isEqual(collapsedTrack, track);
        });
    });

    _self.tracks = _.uniq(_self.tracks, 'fieldName');

    _self.length = _self.tracks.length;
    _self.height = _self.cellHeight * _self.length;
    

    if(_self.rendered) {
        _self.refreshData();
        _self.resizeCallback();
    }
};

/**
 * Method for removing a track from the track group.
 */
OncoTrackGroup.prototype.removeTrack = function(i) {
    var _self = this;

    var removed = _self.tracks.splice(i, 1);
    _self.collapsedTracks = _self.collapsedTracks.concat(removed);
    _self.length = _self.tracks.length;

    _self.refreshData();
    _self.resizeCallback();
};

/**
 * Refreshes the data after adding a new track.
 */
OncoTrackGroup.prototype.refreshData = function () {
    var _self = this;

    _self.trackData = [];
    for (var i = 0, domain; i < _self.domain.length; i++) {
        domain = _self.domain[i];

        for (var j = 0, track; j < _self.length; j++) {
            track = _self.tracks[j]; 

            _self.trackData.push({
                id: domain.id,
                displayId: _self.rotated ? domain.symbol : domain.id,
                value: domain[track.fieldName],
                displayName: track.name,
                fieldName: track.fieldName,
                type: track.type
            });
        }
    }
};

/**
 * Initializes the container for the track groups.
 */
OncoTrackGroup.prototype.init = function (container) {
    var _self = this;

    _self.container = container;

    _self.label = _self.container.append('text')
        .attr('x', -6)
        .attr('y', -7)
        .attr('dy', '.32em')
        .attr('text-anchor', 'end')
        .attr('class', _self.prefix + 'track-group-label')
        .text(_self.name);

    _self.background = _self.container.append('rect')
        .attr('class', 'background')
        .attr('width', _self.width)
        .attr('height', _self.height);

    _self.refreshData();

    _self.totalHeight = _self.height + (_self.collapsedTracks.length ? _self.cellHeight : 0);

};

/**
 * Renders the track group. Takes the x axis range, and the div for tooltips.
 */
OncoTrackGroup.prototype.render = function (x, div) {
    var _self = this;
    _self.rendered = true;
    _self.x = x;
    _self.div = div;
    _self.computeCoordinates();

    _self.cellWidth = _self.width / _self.domain.length;

    _self.renderData();

    _self.label
        .on('mouseover', function () {
            _self.div.transition()
                .duration(200)
                .style('opacity', 0.9);
            _self.div
                .html(function () {return _self.trackLegend;})
                .style('left', (d3.event.pageX + 15) + 'px')
                .style('top', (d3.event.pageY + 30) + 'px');
        })
        .on('mouseout', function() {
            _self.div.transition()
                .duration(500)
                .style('opacity', 0);
        });

};

/**
 * Updates the track group rendering based on the given domain and range for axis.
 */
OncoTrackGroup.prototype.update = function(domain, x) {
    var _self = this;

    _self.domain = domain;
    _self.x = x;

    if (_self.domain.length !== _self.numDomain) {
        _self.numDomain = _self.domain.length;
        _self.cellWidth = _self.width / _self.numDomain;
        _self.computeCoordinates();
    }

    _self.container.selectAll('.' + _self.prefix + 'track-data')
        .transition()
        .attr('x', function (d) { return _self.getX(d); })
        .attr('width', _self.cellWidth);

};

/**
 * Resizes to the given width.
 */
OncoTrackGroup.prototype.resize = function (width, x) {
    var _self = this;

    _self.width = width;
    _self.x = x;
    _self.height = _self.cellHeight * _self.length;
    if(_self.collapsedTracks.length) _self.totalHeight = _self.height + _self.cellHeight;

    _self.cellWidth = _self.width / _self.domain.length;

    _self.background
        .attr('class', 'background')
        .attr('width', _self.width)
        .attr('height', _self.height);

    _self.computeCoordinates();

    _self.totalHeight = _self.height + (_self.collapsedTracks.length ? _self.cellHeight : 0);

    _self.renderData();
};

/**
 * Updates coordinate system
 */
OncoTrackGroup.prototype.computeCoordinates = function () {
    var _self = this;

    _self.y = d3.scale.ordinal()
        .domain(d3.range(_self.length))
        .rangeBands([0, _self.height]);

    // append columns
    _self.column = _self.container.selectAll('.' + _self.prefix + 'column')
        .data(_self.domain);

    var enteringColumns = _self.column.enter()
        .append('g');

    var updatingColumns = _self.column
        .attr('class', _self.prefix + 'column')
        .attr('donor', function (d) { return d.id; })
        .attr('transform', function (d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

    var columnLines = _self.column.selectAll('.' + _self.prefix + 'column-line');

    if (_self.drawGridLines) {
        enteringColumns
            .append('line')
            .attr('class', _self.prefix + 'column-line')

        updatingColumns
            .selectAll('.' + _self.prefix + 'column-line')
            .attr('x1', -_self.height);
    } else {
        updatingColumns
            .selectAll('.' + _self.prefix + 'column-line')
            .remove();
    }

    _self.column.exit().remove();

    // append rows
    _self.row = _self.container.selectAll('.' + _self.prefix + 'row')
        .data(_self.tracks);

    var enteringRows = _self.row.enter()
        .append('g');

    enteringRows
        .append('text')
        .attr('class', _self.prefix + 'track-label ' + _self.prefix + 'label-text-font')
        .on('click', function (d) {
            _self.domain.sort(d.sort(d.fieldName));
            _self.updateCallback(false);
        })
        .transition()
        .attr('x', -6)
        .attr('y', _self.cellHeight / 2)
        .attr('dy', '.32em')
        .attr('text-anchor', 'end')

    var updatingRows = _self.row
        .attr('class', _self.prefix + 'row')
        .attr('transform', function (d, i) { return 'translate(0,' + _self.y(i) + ')'; });

    var labels = updatingRows.selectAll('.' + _self.prefix + 'track-label')
        .text(function (d) { return d.name; });

    if(_self.expandable) {
        enteringRows
            .append('text')
            .attr('class', 'remove-track')
            .text('-')
            .attr('y', _self.cellHeight / 2)
            .attr('dy', '.32em')
            .on('click', function(d, i) { _self.removeTrack(i); });

         setTimeout(function() {
            var textLengths = {};
            labels.each(function(d) {
                textLengths[d.name] = this.getComputedTextLength();
            });

            updatingRows.selectAll('.' + 'remove-track')
                .attr('x', function(d) { return -(textLengths[d.name] + 12 + this.getComputedTextLength()) });
        })
    } else {
        updatingRows.selectAll('.' + 'remove-track').remove();
    }

    if (_self.drawGridLines) {
        enteringRows
            .append('line')
            .attr('class', _self.prefix + 'row-line');

        updatingRows
            .selectAll('.' + _self.prefix + 'row-line')
            .attr('x2', _self.width);
    } else {
        updatingRows
            .selectAll('.' + _self.prefix + 'row-line')
            .remove();
    }

    _self.row.exit().remove();

    // append or remove add track button
    var addButton = _self.container.selectAll('.' + _self.prefix + 'add-track');

    if(_self.collapsedTracks.length && _self.expandable) {
        if(addButton.empty()) {
            addButton = _self.container.append('text')
                .text('+')
                .attr('class', '' + _self.prefix + 'add-track')
                .attr('x', -6)
                .attr('dy', '.32em')
                .attr('text-anchor', 'end')
                .on('click', function() {
                    _self.addTrackFunc(_self.collapsedTracks.slice(), _self.addTrack.bind(_self))
                });
        }

        addButton.attr('y', (_self.cellHeight / 2) + (_self.length && _self.cellHeight + _self.y(_self.length - 1)))
    } else {
        addButton.remove();
    }
};

OncoTrackGroup.prototype.getX = function (obj) {
    var _self = this;

    var index = _self.domain.map(function (d) {
        return d.id;
    });

    return _self.x(index.indexOf(obj.id));
};

OncoTrackGroup.prototype.getY = function (obj) {
    var _self = this;

    var index = _self.tracks.map(function (d) {
        return d.fieldName;
    });

    return _self.y(index.indexOf(obj.fieldName));
};

OncoTrackGroup.prototype.toggleGridLines = function () {
    var _self = this;
    _self.drawGridLines = !_self.drawGridLines;
    _self.computeCoordinates();
};

OncoTrackGroup.prototype.renderData = function(x, div) {
    var _self = this;

    var selection = _self.container.selectAll('.' + _self.prefix + 'track-data')
        .data(_self.trackData);

    selection.enter()
        .append('rect')

    selection
        .attr('x', function (d) { return _self.getX(d); })
        .attr('y', function (d) { return _self.getY(d); })
        .attr('width', _self.cellWidth)
        .attr('height', _self.cellHeight)
        .attr('fill', _self.fillFunc)
        .attr('opacity', _self.opacityFunc)
        .attr('class', function (d) {
            return _self.prefix + 'track-data ' + 
                _self.prefix + 'track-' + d.fieldName + ' ' +
                _self.prefix + 'track-' + d.value + ' ' + 
                _self.prefix + d.id + '-cell';
        })
        .on('click', function (d) { _self.clickFunc(d); })
        .on('mouseover', function (d) {
            _self.div.transition()
                .duration(200)
                .style('opacity', 0.9);
            _self.div.html(function () {
                if (_self.rotated) {
                    return d.displayId + '<br>' + d.displayName + ': ' +
                        (d.value === _self.nullSentinel ? 'Not Verified' : d.value);
                } else {
                    return d.id + '<br>' + d.displayName + ': ' +
                        (d.value === _self.nullSentinel ? 'Not Verified' : d.value);
                }
            })
                .style('left', (d3.event.pageX + 15) + 'px')
                .style('top', (d3.event.pageY + 30) + 'px');
        })
        .on('mouseout', function () {
            _self.div.transition()
                .duration(500)
                .style('opacity', 0);
        });

    selection.exit().remove();
};

module.exports = OncoTrackGroup;