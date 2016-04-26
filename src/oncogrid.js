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

var oncogrid = function(params) {
  var _self = this;

  _self.donors = params.donors || [];
  _self.genes = params.genes || [];
  _self.observations = params.observations || [];
  _self.element = params.element || 'body';

  _self.heatMap = params.heatMap || true;

  _self.colorMap = params.colorMap || {
        'missense_variant': '#ff825a',
        'frameshift_variant': '#57dba4',
        'stop_gained': '#af57db',
        'start_lost': '#af57db',
        'stop_lost': '#ffe',
        'initiator_codon_variant': '#af57db',
      };

  _self.width = params.width;
  _self.height = params.height;

};

/**
 * Initializes and creates the main SVG with rows and columns. Does prelim sort on data
 */
oncogrid.prototype.init = function() {
  var _self = this;

  _self.div = d3.select('body').append('div')
      .attr('class', 'tooltip-oncogrid')
      .style('opacity', 0);

  _self.margin = { top: 10, right: 15, bottom: 15, left: 80 };

  _self.numDonors = _self.donors.length;
  _self.numGenes = _self.genes.length;

  _self.cellWidth = _self.width / _self.donors.length;
  _self.cellHeight = _self.height / _self.genes.length;

  _self.x = d3.scale.ordinal()
      .domain(d3.range(_self.numDonors))
      .rangeBands([0, _self.width]);

  _self.y = d3.scale.ordinal()
      .domain(d3.range(_self.numGenes))
      .rangeBands([0, _self.height]);

  _self.svg = d3.select(_self.element).append('svg')
      .attr('width', _self.width + _self.margin.left + _self.margin.right)
      .attr('height', _self.height + _self.margin.top + _self.margin.bottom)
      .style('margin-left', _self.margin.left + 'px')
      .append('g')
      .attr('transform', 'translate(' + _self.margin.left + ',' + _self.margin.top + ')');

  _self.svg.append('rect')
      .attr('class', 'background')
      .attr('width', _self.width)
      .attr('height', _self.height);

  _self.row = _self.svg.selectAll('.row')
      .data(_self.genes)
      .enter().append('g')
      .attr('class', 'row')
      .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

  _self.row.append('line')
      .attr('x2', _self.width);


  _self.column = _self.svg.selectAll('.column')
      .data(_self.donors)
      .enter().append('g')
      .attr('class', 'column')
      .attr('donor', function(d) { return d.donorId; })
      .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

  _self.column.append('line')
      .attr('x1', -_self.width);

  _self.computeGeneScores();
  _self.computeScores();
  _self.sortByScores();
};

oncogrid.prototype.destroy = function() {
  var _self = this;

  d3.selectAll('svg').remove();
  d3.select('#oncogrid-topcharts').select('svg').remove();
  delete _self.svg;
  delete _self.topSVG;
};