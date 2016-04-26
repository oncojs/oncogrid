/**
 * Helper for getting donor index position
 */
oncogrid.prototype.getDonorIndex = function(donors, donorId) {
  for (var i = 0; i < donors.length; i++) {
    var donor = donors[i];
    if (donor.donorId === donorId) {
      return i;
    }
  }

  return -1;
};

/**
 * Defines the row drag behaviour for moving genes and binds it to the row elements.
 */
oncogrid.prototype.defineRowDragBehaviour = function() {
  var _self = this;

  var drag = d3.behavior.drag();
  drag.on('dragstart', function() {
    d3.event.sourceEvent.stopPropagation(); // silence other listeners
  });
  drag.on('drag', function(d) {
    var trans = d3.event.dy;
    var dragged = _self.genes.indexOf(d);
    var selection = d3.select(this);

    selection.attr('transform', function() {
      var transform = d3.transform(d3.select(this).attr('transform'));
      return 'translate( 0, ' + (parseInt(transform.translate[1]) + trans) + ')';
    });

    var newY = d3.transform(d3.select(this).attr('transform')).translate[1];

    d3.selectAll('.row').each(function(f) {
      var curGeneIndex = _self.genes.indexOf(f);
      var curGene, yCoord;
      if (trans > 0 && curGeneIndex > dragged) {
        yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
        if (newY > yCoord) {
          curGene = _self.genes[dragged];
          _self.genes[dragged] = _self.genes[curGeneIndex];
          _self.genes[curGeneIndex] = curGene;
        }
      } else if (trans < 0 && curGeneIndex < dragged) {
        yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
        if (newY < yCoord) {
          curGene = _self.genes[dragged];
          _self.genes[dragged] = _self.genes[curGeneIndex];
          _self.genes[curGeneIndex] = curGene;
        }
      }
    });

  });

  drag.on('dragend', function() {
    _self.computeScores();
    _self.sortByScores();
    _self.render();
  });

  var dragSelection = d3.selectAll('.row').call(drag);
  dragSelection.on('click', function() {
    if (d3.event.defaultPrevented) {
      return;
    }
  });

};

oncogrid.prototype.cluster = function() {
  var _self = this;

  _self.computeGeneScores();
  _self.genesSortbyScores();
  _self.computeScores();
  _self.sortByScores();
  _self.render();
};

oncogrid.prototype.removeDonors = function(func) {
  var _self = this;

  var removedList = [];

  // Remove donors from data
  for (var i = 0; i < _self.donors.length; i++) {
    var donor = _self.donors[i];
    if (func(donor)) {
      removedList.push(donor.donorId);
      d3.selectAll('.' + donor.donorId + '-cell').remove();
      d3.selectAll('.' + donor.donorId + '-bar').remove();
      _self.donors.splice(i, 1);
      i--;
    }
  }

  for (var j = 0; j < _self.observations.length; j++) {
    var obs = _self.observations[j];
    if (_self.donors.indexOf(obs.donorId) >= 0) {
      _self.observations.splice(j, 1);
      j--;
    }
  }

  _self.x = d3.scale.ordinal()
      .domain(d3.range(_self.donors.length))
      .rangeBands([0, _self.width]);
  _self.cellWidth = _self.width / _self.donors.length;

  _self.column.remove();

  _self.column = _self.svg.selectAll('.column')
      .data(_self.donors)
      .enter().append('g')
      .attr('class', 'column')
      .attr('donor', function(d) { return d.donorId; })
      .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

  _self.column.append('line')
      .attr('x1', -_self.width);

  d3.selectAll('.sortable-rect')
      .transition()
      .attr('width', _self.cellWidth)
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });

  d3.selectAll('.sortable-bar')
      .transition()
      .attr('width', _self.cellWidth - 2)
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; });
};

oncogrid.prototype.removeGenes = function(func) {
  var _self = this;

  var removedList = [];

  // Remove genes from data
  for (var i = 0; i < _self.genes.length; i++) {
    var gene = _self.genes[i];
    if (func(gene)) {
      removedList.push(gene.id);
      d3.selectAll('.' + gene.id + '-cell').remove();
      _self.genes.splice(i, 1);
      i--;
    }
  }

  _self.y = d3.scale.ordinal()
      .domain(d3.range(_self.genes.length))
      .rangeBands([0, _self.height]);
  _self.cellHeight = _self.height / _self.genes.length;

  _self.row.remove();

  _self.row = _self.svg.selectAll('.row')
      .data(_self.genes)
      .enter().append('g')
      .attr('class', 'row')
      .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

  _self.row.append('line')
      .attr('x2', _self.width);

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

  d3.selectAll('.sortable-rect')
      .transition()
      .attr('height', function(d){ return _self.getHeight(d); })
      .attr('y', function(d) {
        return _self.getY(d);
      })
      .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });
};

oncogrid.prototype.sortDonors = function(func) {
  var _self = this;

  _self.donors.sort(func);
  _self.render();
};