'use strict';

/**
 * Only to be called the first time the OncoGrid is rendered. It creates the rects representing the
 * mutation occurrences.
 */
oncogrid.prototype.renderFirst = function() {
  var _self = this;

  _self.row.append('text')
      .attr('class', 'gene-label label-text-font')
      .transition()
      .attr('x', -6)
      .attr('y', _self.cellHeight / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(function(d, i) {
        return _self.genes[i].symbol;
      });

  _self.defineRowDragBehaviour();

  _self.svg.selectAll('svg')
      .data(_self.observations).enter()
      .append('rect')
      .on('mouseover', function(d) {
        _self.div.transition()
            .duration(200)
            .style('opacity', 0.9);
        _self.div.html(d.donorId + '<br/>' + d.gene + '<br/>' + d.id)
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        _self.div.transition()
            .duration(500)
            .style('opacity', 0);
      })
      .on('click', function(d) {
        window.location = '/mutations/' + d.id;
      })
      .transition()
      .attr('class', function(d) { return 'sortable-rect ' + d.donorId + '-cell ' + d.gene + '-cell'; })
      .attr('cons', function(d) { return d.consequence; })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); })
      .attr('y', function(d) { return _self.getY(d); })
      .attr('width', _self.cellWidth)
      .attr('height', function(d) { return _self.getHeight(d); })
      .attr('fill', function(d) { return _self.getColor(d); })
      .attr('opacity', function(d) { return _self.getOpacity(d); })
      .attr('stroke-width', 2);

  _self.renderAgeHistogram();
};

oncogrid.prototype.renderAgeHistogram = function() {
  var _self = this;

  if (_self.topSVG === undefined || _self.topSVG === null) {
    _self.topSVG = d3.select('#oncogrid-topcharts').append('svg')
        .attr('width', _self.width + _self.margin.left + _self.margin.right)
        .attr('height', 100)
        .style('margin-left', _self.margin.left + 'px')
        .append('g')
        .attr('transform', 'translate(' + _self.margin.left + ',' + _self.margin.top + ')');
  }

  _self.topSVG.selectAll('rect')
      .data(_self.donors)
      .enter()
      .append('rect')
      .on('mouseover', function(d) {
        _self.div.transition()
            .duration(200)
            .style('opacity', 0.9);
        _self.div.html('Donor: ' + d.donorId + '<br/> Age:' + d.age + '<br/>')
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        _self.div.transition()
            .duration(500)
            .style('opacity', 0);
      })
      .transition()
      .attr('class', function(d) { return 'sortable-bar ' + d.donorId+'-bar'; })
      .attr('width', _self.cellWidth - 2)
      .attr('height', function(d) { return d.age; })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; })
      .attr('y', function(d) { return 100 - d.age; })
      .attr('fill', '#1693C0');
};

/**
 * Render function ensures presentation matches the data. Called after modifying data.
 */
oncogrid.prototype.render = function() {
  var _self = this;

  d3.selectAll('.row')
      .transition()
      .attr('transform', function(d) {
        return 'translate( 0, ' + _self.y(_self.genes.indexOf(d)) + ')';
      });

  d3.selectAll('.sortable-rect')
      .transition()
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });

  _self.topSVG.selectAll('rect')
      .transition()
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; });
};

/**
 * Function that determines the y position of a mutation within a cell
 */
oncogrid.prototype.getY = function(d) {
  var _self = this;

  var pseudo_genes = _self.genes.map(function(g) {
    return g.id;
  });

  if (_self.heatMap === true) {
    return _self.y(pseudo_genes.indexOf(d.gene));
  }

  var keys = Object.keys(_self.colorMap);
  return  _self.y(pseudo_genes.indexOf(d.gene)) + (_self.cellHeight / keys.length) *
      (keys.indexOf(d.consequence) - 1);
};

oncogrid.prototype.getColor = function(d) {
  var _self = this;


  if (_self.heatMap === true) {
    return '#D33682';
  } else {
    return _self.colorMap[d.consequence];
  }
};

oncogrid.prototype.getOpacity = function() {
  var _self = this;

  if (_self.heatMap === true) {
    return 0.3;
  } else {
    return 1;
  }
};

oncogrid.prototype.getHeight = function() {
  var _self = this;

  if (_self.heatMap === true) {
    return _self.cellHeight;
  } else {
    return _self.cellHeight / Object.keys(_self.colorMap).length;
  }
};

oncogrid.prototype.toggleHeatmap = function() {
  var _self = this;

  if (_self.heatMap === true) {
    _self.heatMap = false;
  } else {
    _self.heatMap = true;
  }

  d3.selectAll('.sortable-rect')
      .transition()
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('height', function(d) { return _self.getHeight(d); })
      .attr('fill', function(d) { return _self.getColor(d); })
      .attr('opacity', function(d) { return _self.getOpacity(d); });
};