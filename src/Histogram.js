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

    _self.clickFunc = _self.rotated ? params.geneHistogramClick : params.donorHistogramClick;

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
            _self.div.html( function() {
                if (_self.rotated) {
                    return  d.symbol + '<br/> Count:' + d.count + '<br/>';
                } else {
                    return d.id + '<br/> Count:' + d.count + '<br/>';
                }
            })
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            _self.div.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .on('click', _self.clickFunc)
        .attr('class', function (d) {
            return _self.prefix + 'sortable-bar ' + d.id + '-bar';
        })
        .attr('width', _self.barWidth - (_self.barWidth < 3 ? 0 : 1)) // If bars are small, do not use whitespace.
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
        .attr('width', _self.barWidth - (_self.barWidth < 3 ? 0 : 1)) // If bars are small, do not use whitespace.
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