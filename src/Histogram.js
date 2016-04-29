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


var OncoHistogram;

(function () {
  'use strict';

  OncoHistogram = function (params, s, rotated) {
    var _self = this;

    console.log(params);
    _self.observations = params.observations;
    _self.svg = s;
    _self.rotated = rotated || false;

    _self.donors = params.donors;
    _self.genes = params.genes;

    _self.domain = _self.rotated ? params.genes : params.donors;

    _self.width = params.width || 500;
    _self.height = params.height || 500;

    _self.histogramHeight = 100;

    _self.margin = params.margin || { top: 30, right: 15, bottom: 15, left: 80 };

    _self.numDomain = _self.domain.length;
    _self.barWidth = _self.width / _self.domain.length;
  };

  OncoHistogram.prototype.render = function(x, div) {
    var _self = this;
    _self.x = x;
    _self.div = div;

    function getLargestCount() {
      var retVal = 1;

      for (var i = 0; i < _self.domain.length; i++) {
        var donor = _self.domain[i];
        retVal = Math.max(retVal, donor.count);
      }

      return retVal;
    }

    var topCount = getLargestCount();

    _self.histogram = _self.svg.append('g')
        .attr('width', function() {
          if (_self.rotated) {
            return _self.height;
          } else {
            return _self.width + _self.margin.left + _self.margin.right;
          }
        })
        .attr('height', _self.histogramHeight)
        .style('margin-left', _self.margin.left + 'px')
        .attr('transform', function() {
          if (_self.rotated) {
             return 'rotate(90)translate(0,-' +  (_self.width) + ')';
          } else {
            return '';
          }
        })
        .append('g')
        .attr('transform', 'translate(0,-'+ (_self.histogramHeight + _self.margin.top/1.61803398875) + ')');

    _self.histogram.selectAll('rect')
        .data(_self.domain)
        .enter()
        .append('rect')
        .on('mouseover', function(d) {
          _self.div.transition()
              .duration(200)
              .style('opacity', 0.9);
          _self.div.html('ID: ' + d.id + '<br/> Count:' + d.count + '<br/>')
              .style('left', (d3.event.pageX + 10) + 'px')
              .style('top', (d3.event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          _self.div.transition()
              .duration(500)
              .style('opacity', 0);
        })
        .transition()
        .attr('class', function(d) { return 'sortable-bar ' + d.id+'-bar' })
        .attr('width', _self.barWidth - 2)
        .attr('height', function(d) { return _self.histogramHeight * d.count/topCount; })
        .attr('x', function(d) { return _self.x(_self.getIndex(_self.domain, d.id)) + 1; })
        .attr('y', function(d) { return _self.histogramHeight - _self.histogramHeight * d.count/topCount; })
        .attr('fill', '#1693C0');
  };

  OncoHistogram.prototype.update = function(domain, x) {
    var _self = this;
    _self.x = x;
    _self.domain = domain;

    _self.histogram.selectAll('rect')
        .transition()
        .attr('x', function(d) { return _self.x(_self.getIndex(_self.domain, d.id)) + 1; });
  };

  OncoHistogram.prototype.getIndex = function(list, id) {
    for (var i = 0; i < list.length; i++) {
      var obj = list[i];
      if (obj.id === id) {
        return i;
      }
    }

    return -1;
  };

}());

module.exports = OncoHistogram;