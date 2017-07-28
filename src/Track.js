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

OncoTrack = function (params, s, rotated, tracks, opacityFunc, fillFunc, updateCallback, offset, resizeCallback, isFullscreen) {
  var _self = this;
  _self.emit = params.emit;
  _self.padding = params.trackPadding || 20;
  _self.offset = offset;
  _self.params = params;
  _self.prefix = params.prefix || 'og-';
  _self.svg = s;
  _self.rotated = rotated || false;
  _self.updateCallback = updateCallback;
  _self.resizeCallback = resizeCallback;
  _self.expandableGroups = params.expandableGroups || [];

  _self.isFullscreen = isFullscreen;

  _self.trackLegendLabel = params.trackLegendLabel;

  _self.margin = params.margin || { top: 30, right: 15, bottom: 15, left: 80 };

  _self.domain = (_self.rotated ? params.genes : params.donors) || [];

  _self.width = (_self.rotated ? params.height : params.width) || 500;

  _self.cellHeight = params.trackHeight || 10;
  _self.numDomain = _self.domain.length;
  _self.cellWidth = _self.width / _self.numDomain;

  _self.availableTracks = tracks || [];
  _self.opacityFunc = opacityFunc;
  _self.fillFunc = fillFunc;
  _self.drawGridLines = params.grid || false;

  _self.nullSentinel = params.nullSentinel || -777;

  _self.parseGroups();
};

/**
 * Parses track groups out of input.
 */
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
        emit: _self.emit,
        cellHeight: _self.cellHeight,
        width: _self.width,
        grid: _self.drawGridLines,
        nullSentinel: _self.nullSentinel,
        domain: _self.domain,
        trackLegendLabel: _self.trackLegendLabel,
        expandable: _self.expandableGroups.indexOf(group) >= 0,
        wrapper: _self.params.wrapper,
      }, group, _self.rotated, _self.opacityFunc, _self.fillFunc, _self.updateCallback, _self.resizeCallback, _self.isFullscreen);
      trackGroup.addTrack(track);
      _self.groupMap[group] = trackGroup;
      _self.groups.push(trackGroup);
    }
  });
};

/**
 * Initializes the track group data and places container for each group in spaced
 * intervals.
 */
OncoTrack.prototype.init = function () {
  var _self = this;
  _self.container = _self.svg.append('g');

  var labelHeight = _self.rotated ? 16.5 : 0;
  _self.height = 0;
  for (var k = 0; k < _self.groups.length; k++) {
    var g = _self.groups[k];
    var trackContainer = _self.container.append('g')
        .attr('transform', 'translate(0,' + _self.height + ')');
    g.init(trackContainer);
    _self.height += Number(g.totalHeight) + _self.padding;
  }

  var translateDown = _self.rotated ? -(_self.offset + _self.height) : (_self.padding + _self.offset);

  _self.container
      .attr('width', _self.width)
      .attr('height', _self.height)
      .attr('class', _self.prefix + 'track')
      .attr('transform', function () {
        return (_self.rotated ? 'rotate(90)' : '') + 'translate(0,' + translateDown + ')'
      });

  _self.height += labelHeight;
};

/** Calls render on all track groups */
OncoTrack.prototype.render = function () {
  var _self = this;

  for (var i = 0; i < _self.groups.length; i++) {
    var g = _self.groups[i];
    g.render();
  }
};

/** Resizes all the track groups */
OncoTrack.prototype.resize = function (width, height, offset) {
  var _self = this;

  _self.offset = offset || _self.offset;
  _self.width = _self.rotated ? height : width;
  _self.height = 0;
  var labelHeight = _self.rotated ? 16.5 : 0;
  
  for (var k = 0; k < _self.groups.length; k++) {
    var g = _self.groups[k];
    g.container.attr('transform', 'translate(0,' + _self.height + ')');
    g.resize(_self.width);
    _self.height += Number(g.totalHeight) + _self.padding;
  }

  var translateDown = _self.rotated ? -(_self.offset + _self.height) : (_self.padding + _self.offset);

  _self.container
      .attr('width', _self.width)
      .attr('height', _self.height)
      .attr('transform', function () {
        return (_self.rotated ? 'rotate(90)' : '') + 'translate(0,' + translateDown + ')'
      });

  _self.height += labelHeight;
};

/**
 * Updates the rendering of the tracks.
 */
OncoTrack.prototype.update = function (domain) {
  var _self = this;

  _self.domain = domain;

  for (var i = 0; i < _self.groups.length; i++) {
    var g = _self.groups[i];
    g.update(domain);
  }
};

OncoTrack.prototype.setGridLines = function (active) {
  var _self = this;

  for (var i = 0; i < _self.groups.length; i++) {
    var g = _self.groups[i];
    g.setGridLines(active);
  }
};

module.exports = OncoTrack;