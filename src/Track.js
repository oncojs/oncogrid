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

var OncoTrackGroup = require('./TrackGroup');

var OncoTrack;

OncoTrack = function (params, s, rotated, tracks, opacityFunc, fillFunc, updateCallback) {
  var _self = this;

  _self.params = params;
  _self.prefix = params.prefix || 'og-';
  _self.svg = s;
  _self.rotated = rotated || false;
  _self.updateCallback = updateCallback;

  _self.clickFunc = _self.rotated ? params.geneClick : params.donorClick;

  _self.margin = params.margin || { top: 30, right: 15, bottom: 15, left: 80 };

  _self.domain = (_self.rotated ? params.genes : params.donors) || [];
  _self.width = (_self.rotated ? params.height : params.width) || 500;

  _self.cellHeight = params.trackHeight || 20;
  _self.numDomain = _self.domain.length;
  _self.cellWidth = _self.width / _self.numDomain;

  _self.availableTracks = tracks || [];
  _self.opacityFunc = opacityFunc;
  _self.fillFunc = fillFunc;

  _self.parseGroups();

  // TODO: This is awful, needs fixing and cleaning.
  _self.translateDown =
    (_self.rotated ? -1 * (params.width + 150 + _self.availableTracks.length * _self.cellHeight) :
      params.height) || 500;

  _self.drawGridLines = false;
};

OncoTrack.prototype.parseGroups = function () {
  var _self = this;

  _self.groupMap = {}; // Nice for lookups and existence checks
  _self.groups = []; // Nice for direct iteration
  _self.availableTracks.forEach(function (track) {
    var group = track.group || 'Tracks';
    if (_self.groupMap.hasOwnProperty(group)) {
      _self.groupMap[group].addTrack(track);
    } else {
      var trackGroup = new OncoTrackGroup({
        cellHeight: _self.cellHeight,
        width: _self.width,
        clickFunc: _self.clickFunc,
      }, _self.domain, group, _self.opacityFunc, _self.fillFunc, _self.updateCallback);
      trackGroup.addTrack(track);
      _self.groupMap[group] = trackGroup;
      _self.groups.push(trackGroup);
    }
  });
};

OncoTrack.prototype.init = function () {
  var _self = this;

  _self.trackData = [];

  for (var i = 0; i < _self.domain.length; i++) {
    for (var j = 0; j < _self.availableTracks.length; j++) {
      _self.trackData.push({
        id: _self.domain[i].id,
        displayId: _self.rotated ? _self.domain[i].symbol : _self.domain[i].id,
        value: _self.domain[i][_self.availableTracks[j].fieldName],
        fieldName: _self.availableTracks[j].fieldName,
        type: _self.availableTracks[j].type
      });
    }
  }

  _self.height = 0;
  for (var name in _self.groupMap) {
    if (_self.groupMap.hasOwnProperty(name)) {
      var group = _self.groupMap[name];
      _self.height += group.height + 25;
    }
  }

  _self.container = _self.svg.append('g')
    .attr('width', _self.width)
    .attr('height', _self.height)
    .attr('class', _self.prefix + 'track')
    .attr('transform', function () {
      if (_self.rotated) {
        return 'rotate(90)translate(0,' + (_self.translateDown + _self.margin.top / 1.61803398875) + ')';
      } else {
        return 'translate(0,' + (_self.translateDown + _self.margin.top / 1.61803398875) + ')';
      }
    });

  var curTransDown = 0;
  for (var k = 0; k < _self.groups.length; k++) {
    var g = _self.groups[k];
    var trackContainer = _self.container.append('g')
      .attr('transform', 'translate(0,' + curTransDown + ')');
    g.init(trackContainer);
    curTransDown += g.height;
  }
};

OncoTrack.prototype.render = function (x, div) {
  var _self = this;

  for (var i = 0; i < _self.groups.length; i++) {
    var g = _self.groups[i];
    g.render(x,div);
  }
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

  _self.track.attr('transform', 'translate(0,' + (_self.translateDown + _self.margin.top / 1.61803398875) + ')');

  _self.background
    .attr('width', _self.width)
    .attr('height', _self.height);

  _self.computeCoordinates();

};

/**
 * Updates the rendering of the tracks.
 */
OncoTrack.prototype.update = function (domain, x) {
  var _self = this;

  _self.domain = domain;
  _self.x = x;

  if (_self.domain.length !== _self.numDomain) {
    _self.numDomain = _self.domain.length;
    _self.cellWidth = _self.width / _self.numDomain;
    _self.computeCoordinates();
  }

  _self.track.selectAll('.' + _self.prefix + 'track-data')
    .transition()
    .attr('x', function (d) { return _self.getX(d); })
    .attr('width', _self.cellWidth);
};

OncoTrack.prototype.getX = function (obj) {
  var _self = this;

  var index = _self.domain.map(function (d) {
    return d.id;
  });

  return _self.x(index.indexOf(obj.id));
};

OncoTrack.prototype.getY = function (obj) {
  var _self = this;

  var index = _self.availableTracks.map(function (d) {
    return d.fieldName;
  });

  return _self.y(index.indexOf(obj.fieldName));
};

/**
 * Updates coordinate system
 */
OncoTrack.prototype.computeCoordinates = function () {
  var _self = this;

  if (typeof _self.column !== 'undefined') {
    _self.column.remove();
  }

  _self.column = _self.track.selectAll('.' + _self.prefix + 'column')
    .data(_self.domain)
    .enter().append('g')
    .attr('class', _self.prefix + 'column')
    .attr('donor', function (d) { return d.id; })
    .attr('transform', function (d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

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
    .attr('transform', function (d, i) { return 'translate(0,' + _self.y(i) + ')'; });

  if (_self.drawGridLines) {
    _self.row.append('line')
      .attr('x2', _self.width);
  }

  _self.row.append('text')
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
    .text(function (d, i) {
      return _self.availableTracks[i].name;
    });
};

OncoTrack.prototype.toggleGridLines = function () {
  var _self = this;

  if (_self.drawGridLines) {
    _self.drawGridLines = false;
  } else {
    _self.drawGridLines = true;
  }

  _self.computeCoordinates();
};

module.exports = OncoTrack;