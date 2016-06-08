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

  _self.cellHeight = params.trackHeight || 25;
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

  _self.track = _self.svg.append('g')
      .attr('width', _self.width)
      .attr('height', _self.height)
      .attr('class', _self.prefix + 'track')
      .attr('transform', function() {
        if (_self.rotated) {
          return 'rotate(90)';
        } else {
          return '';
        }
      })
      .append('g')
      .attr('transform', 'translate(0,'+ (_self.translateDown + _self.margin.top/1.61803398875) + ')');

  _self.track.append('rect')
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

  _self.column.append('line')
      .attr('x1', -_self.width);

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

  _self.row.append('line')
      .attr('x2', _self.width);

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

module.exports = OncoTrack;