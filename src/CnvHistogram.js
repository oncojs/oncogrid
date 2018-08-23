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

/**
 * Want to find the maximum value so we can label the axis and scale the bars accordingly.
 * No need to make this function public.
 * @returns {number}
 */
function getLargestCount(domain, cnvLength) {
    var retVal = 1;
    for(var i = 0; i< cnvLength; i++){
        retVal = Math.max(retVal, domain.reduce((acc, d) => acc + d[i].y, 0));
    }
    // console.log("retVal", retVal );
    return retVal;
}

var OncoHistogram = function (params, s, rotated, type) {
    var _self = this;
    // console.log("cnvHist", params);
    var histogramBorderPadding = params.histogramBorderPadding || {};
    _self.lineWidthOffset = histogramBorderPadding.left || 10;
    _self.lineHeightOffset = histogramBorderPadding.bottom || 5;
    _self.padding = 20;
    _self.centerText = -6;
    _self.prefix = params.prefix || 'og-';
    _self.emit = params.emit;
    _self.observations = params.observations;
    _self.svg = s;
    _self.type = type;
    _self.rotated = rotated || false;
    _self.offset = params.offset || 120;
    _self.colors = Object.keys(params.colorMap.cnv).map(d => params.colorMap.cnv[d]) || [];
    _self.margin = params.margin || {top: 30, right: 15, bottom: 15, left: 80};
    _self.width = params.width || 500;
    _self.height = params.height || 500;
    _self.histogramWidth = (_self.rotated ? _self.height : _self.width);
    _self.histogramHeight = 80;
    _self.component = Object.keys(params.colorMap.cnv) || [];
    // console.log("component", _self.component);
    _self.data = (_self.rotated ? params.genes : params.donors) || []
    _self.cnvLength = _self.data.length;
    _self.domain = d3.layout.stack()(
        _self.component.map(function(component) {
            return _self.data.map(function(d) {
                return { x: (_self.rotated ? d.y : d.x), y: +d.cnv[component], cnv: component, displayId: (_self.rotated ? d.symbol : d.displayId) };
            });
          })
        );
    _self.numDomain = _self.domain.length;
    _self.barWidth = (_self.rotated ? _self.height : _self.width) / _self.cnvLength;
    _self.totalHeight = _self.histogramHeight + _self.lineHeightOffset + _self.padding + _self.offset;
    _self.wrapper = d3.select(params.wrapper || 'body');
    var color = d3.scale.ordinal().range(_self.colors);
};

OncoHistogram.prototype.render = function () {
    var _self = this;
    var topCount = getLargestCount(_self.domain, _self.cnvLength);
    _self.topCount = topCount;
    console.log("origin",_self.width + _self.margin.left + _self.margin.right);
    console.log("origin bar", _self.barWidth);
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
        .attr('transform', 'translate(0,-' + (_self.totalHeight + _self.centerText) + ')');

    _self.renderAxis(topCount);

    _self.histogram
        .on('mouseover', function () {
            var str = d3.event.target.dataset.domainIndex;
            if(!str) return; 
            var indexes = str.split(',');
            var domain = _self.domain[parseInt(indexes[0])][parseInt(indexes[1])];
            if(!domain) return;
            console.log("domain", domain);
            _self.emit('cnvHistogramMouseOver', { domain: domain });
        })
        .on('mouseout', function () {
            _self.emit('histogramMouseOut');
        })
        .on('click', function() {
            var target = d3.event.target;
            var domain = _self.domain[target.dataset.domainIndex];
            if(!domain) return;
            _self.emit('histogramClick', {
                type: _self.rotated ? 'gene' : 'donor',
                domain: domain,
            });
        });

    var groups = _self.histogram.selectAll("g.cost")
    .data(_self.domain)
    .enter()
    .append("g")
    .attr("class", "cost")
    .style("fill", function(d, i) { return _self.colors[i]; });
  
    var y = d3.scale.linear()
        .domain([0, d3.max(_self.domain, function(d) {  return d3.max(d, function(d) { return d.y0 + d.y; });  })])
        .range([_self.topCount, 0]);
    // console.log("xinde", _self.topCount)
    var rect = groups.selectAll("rect")
        .data(function(d) { return d; })
        .enter()
        .append("rect")
        .attr('class', function (d) {
            return _self.prefix + 'sortable-bar ' + _self.prefix + d.id + '-bar';
        })
        .attr('data-domain-index', function(d, i) { return [_self.component.indexOf(d.cnv), i]; })
        .attr('x', function (d) {
            // console.log("xxxxx", _self.type, x(d.x));
            return d.x;
            // return _self.rotated ? d.y : d.x;
        })
        .attr("y", function(d) { return _self.histogramHeight - _self.histogramHeight * (d.y0 + d.y) / topCount ; })
        .attr("height", function(d) { return _self.histogramHeight * d.y / topCount; })
        .attr('width', _self.barWidth - (_self.barWidth < 3 ? 0 : 1));
};

OncoHistogram.prototype.update = function (domain) {
    var _self = this;
    _self.domain = domain;
    _self.barWidth = (_self.rotated ? _self.height : _self.width) / _self.cnvLength;

    var topCount = _self.topCount || getLargestCount(_self.domain, _self.cnvLength);

    _self.updateAxis(topCount);
    var groups = _self.histogram.selectAll("g.cost")
    .data(_self.domain)
    .enter()
    .append("g")
    .attr("class", "cost")
    .style("fill", function(d, i) { return _self.colors[i]; });
    var y = d3.scale.linear()
    .domain([0, d3.max(_self.domain, function(d) {  return d3.max(d, function(d) { return d.y0 + d.y; });  })])
    .range([_self.topCount, 0]);
    // console.log("xinde", _self.topCount)
    var rect = groups.selectAll("rect")
        .data(function(d) { return d; })
        .enter()
        .append("rect")
        .attr('class', function (d) {
            return _self.prefix + 'sortable-bar ' + _self.prefix + d.id + '-bar';
        })
        .attr('data-domain-index', function(d, i) { return i; })
        .attr('x', function (d) {
            return d.x;
        })
        .attr("y", function(d) { return _self.histogramHeight - _self.histogramHeight * (d.y0 + d.y) / topCount ; })
        .attr("height", function(d) { return _self.histogramHeight * d.y / topCount; })
        .attr('width', _self.barWidth - (_self.barWidth < 3 ? 0 : 1));
};

OncoHistogram.prototype.resize = function (width, height) {
    var _self = this;

    _self.width = width;
    _self.height = height;

    _self.histogramWidth = (_self.rotated ? _self.height : _self.width);
    console.log("11",_self.width + _self.margin.left + _self.margin.right);
    console.log("bar", _self.barWidth);
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
        .attr('transform', 'translate(0,-' + (_self.totalHeight + _self.centerText) + ')');

    _self.bottomAxis.attr('x2', _self.histogramWidth + 10);
};

/**
 * Draws Axis for Histogram
 * @param topCount Maximum value
 */
OncoHistogram.prototype.renderAxis = function (topCount) {
    var _self = this;

    _self.bottomAxis = _self.histogram.append('line')
        .attr('class', _self.prefix + 'histogram-axis');

    _self.leftAxis = _self.histogram.append('line')
        .attr('class', _self.prefix + 'histogram-axis');

    _self.topText = _self.histogram.append('text')
        .attr('class', _self.prefix + 'label-text-font')
        .attr('dy', '.32em')
        .attr('text-anchor', 'end');

    _self.middleText = _self.histogram.append('text')
        .attr('class', _self.prefix + 'label-text-font')
        .attr('dy', '.32em')
        .attr('text-anchor', 'end');

    _self.leftLabel = _self.histogram.append('text')
        .text("CNV freq.")
        .attr({
            'class': _self.prefix + 'label-text-font',
            'text-anchor': 'middle',
            transform: 'rotate(-90)',
        });

    _self.updateAxis(topCount);
};

OncoHistogram.prototype.updateAxis = function (topCount) {
    var _self = this;

    _self.bottomAxis
        .attr('y1', _self.histogramHeight + _self.lineHeightOffset)
        .attr('y2', _self.histogramHeight + _self.lineHeightOffset)
        .attr('x2', _self.histogramWidth + _self.lineWidthOffset)
        .attr('transform', 'translate(-' + _self.lineHeightOffset + ',0)');

    _self.leftAxis
        .attr('y1', 0)
        .attr('y2', _self.histogramHeight + _self.lineHeightOffset)
        .attr('transform', 'translate(-' + _self.lineHeightOffset + ',0)');

    _self.topText
        .attr('x', _self.centerText)
        .text(topCount);

    // Round to a nice round number and then adjust position accordingly
    var halfInt = parseInt(topCount / 2);
    var secondHeight = _self.histogramHeight - _self.histogramHeight / (topCount / halfInt);
    // console.log('_self.histogramHeight',_self.type, _self.histogramHeight);
    // console.log('topCount',_self.type, topCount);
    // console.log('halfInt',_self.type, halfInt);
    _self.middleText
        .attr('x', _self.centerText)
        .attr('y', secondHeight)
        .text(halfInt);

    _self.leftLabel
        .attr({
            x: -_self.histogramHeight / 2,
            y: -_self.lineHeightOffset - _self.padding,
        });
};

OncoHistogram.prototype.destroy = function() {
    var _self = this;
    _self.histogram.remove();
    _self.container.remove();
};

module.exports = OncoHistogram;