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

var OncoTrackGroup;

OncoTrackGroup = function (params, domain, name, opacityFunc, fillFunc, updateCallback) {
  var _self = this;

  _self.prefix = params.prefix || 'og-';

  _self.name = name;
  _self.cellHeight = params.cellHeight || 20;
  _self.height = 0;
  _self.width = params.width;
  _self.tracks = [];
  _self.length = 0;

  _self.updateCallback = updateCallback;
  _self.clickFunc = params.clickFunc;

  _self.clickFunc = params.clickFunc;
  _self.opacityFunc = opacityFunc;
  _self.fillFunc = fillFunc;

  _self.domain = domain;

  _self.trackData = [];
};

OncoTrackGroup.prototype.addTrack = function (track) {
  var _self = this;

  _self.length = _self.tracks.push(track);
  _self.height += _self.cellHeight;
};

OncoTrackGroup.prototype.refreshData = function () {
  var _self = this;

  for (var i = 0; i < _self.domain.length; i++) {
    for (var j = 0; j < _self.tracks.length; j++) {
      _self.trackData.push({
        id: _self.domain[i].id,
        displayId: _self.rotated ? _self.domain[i].symbol : _self.domain[i].id,
        value: _self.domain[i][_self.tracks[j].fieldName],
        fieldName: _self.tracks[j].fieldName,
        type: _self.tracks[j].type
      });
    }
  }
};

OncoTrackGroup.prototype.init = function (container) {
  var _self = this;

  _self.container = container;

  _self.background = _self.container.append('rect')
    .attr('class', 'background')
    .attr('width', _self.width)
    .attr('height', _self.height);
  
  _self.refreshData();

};

OncoTrackGroup.prototype.render = function (x, div) {
  var _self = this;

  _self.x = x;
  _self.div = div;
  _self.computeCoordinates();

  _self.cellWidth = _self.width / _self.domain.length;

  window.console.log(_self.trackData);
  _self.container.selectAll('.' + _self.prefix + 'track')
    .data(_self.trackData).enter()
    .append('rect')
    .on('mouseover', function (d) {
      _self.div.transition()
        .duration(200)
        .style('opacity', 0.9);
      _self.div.html(function () {
        if (_self.rotated) {
          return d.displayId + '<br>' + d.fieldName + ': ' + d.value;
        } else {
          return d.id + '<br>' + d.fieldName + ': ' + d.value;
        }
      })
        .style('left', (d3.event.pageX + 15) + 'px')
        .style('top', (d3.event.pageY + 30) + 'px');
    })
    .on('mouseout', function (d) {
      _self.div.transition()
        .duration(500)
        .style('opacity', 0);
    })
    .on('click', function (d) {
      _self.clickFunc(d);
    })
    .transition()
    .attr('class', function (d) {
      return _self.prefix + 'track-data' + ' ' + _self.prefix + 'track-' + d.fieldName +
        ' ' + _self.prefix + 'track-' + d.value + ' ' + d.id + '-cell';
    })
    .attr('x', function (d) { return _self.getX(d); })
    .attr('y', function (d) { return _self.getY(d); })
    .attr('width', _self.cellWidth)
    .attr('height', _self.cellHeight)
    .attr('fill', _self.fillFunc)
    .attr('opacity', _self.opacityFunc);
};

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

OncoTrackGroup.prototype.resize = function (width) {
  var _self = this;

  _self.width = width;
  _self.height = _self.cellHeight * _self.tracks.length;

  _self.cellWidth = _self.width / _self.domain.length;

  _self.background
    .attr('class', 'background')
    .attr('width', _self.width)
    .attr('height', _self.height);

  _self.computeCoordinates();
};

/**
 * Updates coordinate system
 */
OncoTrackGroup.prototype.computeCoordinates = function () {
  var _self = this;

  if (typeof _self.column !== 'undefined') {
    _self.column.remove();
  }

  _self.column = _self.container.selectAll('.' + _self.prefix + 'column')
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
    .domain(d3.range(_self.tracks.length))
    .rangeBands([0, _self.height]);

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
      return _self.tracks[i].name;
    });
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

module.exports = OncoTrackGroup;