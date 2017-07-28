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
var _uniq = require('lodash.uniq');

var OncoTrackGroup;

OncoTrackGroup = function (params, name, rotated, opacityFunc, fillFunc, updateCallback, resizeCallback, isFullscreen) {
    var _self = this;
    _self.emit = params.emit;
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

    _self.isFullscreen = isFullscreen;

    _self.rotated = rotated;
    _self.updateCallback = updateCallback;
    _self.resizeCallback = resizeCallback;
    _self.trackLegendLabel = params.trackLegendLabel;

    _self.opacityFunc = opacityFunc;
    _self.fillFunc = fillFunc;

    _self.drawGridLines = params.grid || false;
    _self.domain = params.domain;
    _self.numDomain = _self.domain.length;

    _self.trackData = [];
    _self.wrapper = d3.select(params.wrapper || 'body');
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

    _self.tracks = _uniq(_self.tracks, 'fieldName');

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

        for (var j = 0, track, value; j < _self.length; j++) {
            track = _self.tracks[j];
            value = domain[track.fieldName];
            var isNullSentinel = value === _self.nullSentinel;
            _self.trackData.push({
                id: domain.id,
                displayId: domain.displayId || (_self.rotated ? domain.symbol : domain.id),
                domainIndex: i,
                value: value,
                displayValue: isNullSentinel ? 'Not Verified' : value,
                notNullSentinel: !isNullSentinel,
                displayName: track.name,
                fieldName: track.fieldName,
                type: track.type,
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
        .attr('y', -11)
        .attr('dy', '.32em')
        .attr('text-anchor', 'end')
        .attr('class', _self.prefix + 'track-group-label')
        .text(_self.name);
    
    _self.legendObject = _self.container.append('svg:foreignObject')
        .attr('width', 20)
        .attr('height', 20);

    _self.legend = _self.legendObject
      .attr('x', 0)
      .attr('y', -22)
      .append("xhtml:div")
      .html(_self.trackLegendLabel);

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
OncoTrackGroup.prototype.render = function () {
    var _self = this;
    _self.rendered = true;
    _self.computeCoordinates();

    _self.cellWidth = _self.width / _self.domain.length;
    _self.renderData();
    _self.legend
        .on('mouseover', function () {
            _self.emit('trackLegendMouseOver', {
                group: _self.name
            });
        })
        .on('mouseout', function() {
            _self.emit('trackLegendMouseOut');
        });

};

/**
 * Updates the track group rendering based on the given domain and range for axis.
 */
OncoTrackGroup.prototype.update = function(domain) {
    var _self = this;

    _self.domain = domain;

    if (_self.domain.length !== _self.numDomain) {
        _self.numDomain = _self.domain.length;
        _self.cellWidth = _self.width / _self.numDomain;
    }

    var map = {};
    for(var i = 0; i < domain.length; i += 1) {
        map[domain[i].id] = i;
    }

    var trackData = [];
    for (var i = 0; i < _self.trackData.length; i += 1) {
        var data = _self.trackData[i];
        var domainIndex = map[data.id];
        if(domainIndex || domainIndex === 0) {
            data.domainIndex = domainIndex;
            trackData.push(data);
        }
    }
    _self.trackData = trackData;

    _self.computeCoordinates();

    _self.container.selectAll('.' + _self.prefix + 'track-data')
        .data(_self.trackData)
        .attr('x', function(d) {
            var domain = _self.domain[d.domainIndex];
            return _self.rotated ? domain.y : domain.x;
        })
        .attr('data-track-data-index', function(d, i) { return i; })
        .attr('width', _self.cellWidth);
};

/**
 * Resizes to the given width.
 */
OncoTrackGroup.prototype.resize = function (width) {
    var _self = this;

    _self.width = width;
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
    if (_self.column) {
        _self.column.remove();
    }


    if (_self.drawGridLines) {
        _self.column = _self.container.selectAll('.' + _self.prefix + 'column')
            .data(_self.domain)
            .enter()
            .append('line')
            .attr('class', _self.prefix + 'column')
            .attr('donor', function (d) { return d.id; })
            .attr('transform', function (d, i) {
                return 'translate(' + (_self.rotated ? d.y : d.x) + ')rotate(-90)';
            })
            .style('pointer-events', 'none')
            .attr('x1', -_self.height);
    }

    // append rows
    if (typeof _self.row !== 'undefined') {
        _self.row.remove();
    }

    _self.row = _self.container.selectAll('.' + _self.prefix + 'row')
        .data(_self.tracks)
        .enter().append('g')
        .attr('class', _self.prefix + 'row')
        .attr('transform', function (d, i) { return 'translate(0,' + _self.y(i) + ')'; });

    if (_self.drawGridLines) {
        _self.row.append('line')
            .style('pointer-events', 'none')
            .attr('x2', _self.width);
    }

    var labels = _self.row.append('text');

    labels.attr('class', _self.prefix + 'track-label ' + _self.prefix + 'label-text-font')
        .on('click', function (d) {
            _self.domain.sort(d.sort(d.fieldName));
            _self.updateCallback(false);
        })
        .transition()
        .attr('x', -6)
        .attr('y', _self.cellHeight / 2)
        .attr('dy', '.32em')
        .attr('text-anchor', 'end')
        .text(function (d, i) {
            return _self.tracks[i].name;
        });

    if(_self.expandable) {
         setTimeout(function() {
             var removeTrackClass = _self.prefix + 'remove-track';
             _self.container.selectAll('.' + removeTrackClass).remove();

            var textLengths = {};
            labels.each(function(d) {
                textLengths[d.name] = this.getComputedTextLength();
            });
            _self.row
                .append('text')
                .attr('class', removeTrackClass)
                .text('-')
                .attr('y', _self.cellHeight / 2)
                .attr('dy', '.32em')
                .on('click', function(d, i) { _self.removeTrack(i); })
                .attr('x', function(d) { return -(textLengths[d.name] + 12 + this.getComputedTextLength()) });
        });
    }

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
                    _self.emit('addTrackClick', {
                        hiddenTracks: _self.collapsedTracks.slice(),
                        addTrack: _self.addTrack.bind(_self),
                    });
                });
        }

        addButton.attr('y', (_self.cellHeight / 2) + (_self.length && _self.cellHeight + _self.y(_self.length - 1)))
    } else {
        addButton.remove();
    }
};

OncoTrackGroup.prototype.setGridLines = function (active) {
    var _self = this;
    if(_self.drawGridLines === active) return;
    _self.drawGridLines = active;
    _self.computeCoordinates();
};

OncoTrackGroup.prototype.renderData = function() {
    var _self = this;

    var selection = _self.container.selectAll('.' + _self.prefix + 'track-data')
        .data(_self.trackData);

    selection.enter()
        .append('rect');


    var yIndexLookup = {};
    for(var i = 0; i < _self.tracks.length; i += 1) {
        yIndexLookup[_self.tracks[i].fieldName] = i;
    }


    _self.container
        .on('click', function (d) {
            var target = d3.event.target;
            var d = _self.trackData[target.dataset.trackDataIndex];
            if (!d) return;
            _self.emit('trackClick', {
                domain: d,
                type: _self.rotated ? 'gene' : 'donor',
            });
        })
        .on('mouseover', function () {
            var target = d3.event.target;
            var d = _self.trackData[target.dataset.trackDataIndex];
            if (!d) return;

            _self.emit('trackMouseOver', {
                domain: d,
                type: _self.rotated ? 'gene' : 'donor',
            });
        })
        .on('mouseout', function () {
            _self.emit('trackMouseOut');
        });


    selection
        .attr('data-track-data-index', function(d, i) { return i; })
        .attr('x', function(d) { 
            var domain = _self.domain[d.domainIndex];
            return _self.rotated ? domain.y : domain.x;
         })
        .attr('y', function(d) { return _self.y(yIndexLookup[d.fieldName]); })
        .attr('width', _self.cellWidth)
        .attr('height', _self.cellHeight)
        .attr('fill', _self.fillFunc)
        .attr('opacity', _self.opacityFunc)
        .attr('class', function (d) {
            return _self.prefix + 'track-data ' + 
                _self.prefix + 'track-' + d.fieldName + ' ' +
                _self.prefix + 'track-' + d.value + ' ' + 
                _self.prefix + d.id + '-cell';
        });


    selection.exit().remove();
};

module.exports = OncoTrackGroup;