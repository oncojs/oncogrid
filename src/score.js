/**
 * Returns 1 if at least one mutation, 0 otherwise.
 */
oncogrid.prototype.mutationScore = function(donor, gene) {
  var _self = this;

  for (var i = 0; i < _self.observations.length; i++) {
    var obs = _self.observations[i];
    if (obs.donorId === donor && obs.gene === gene) {
      return 1;
    }
  }

  return 0;
};

/**
 * Returns 1 if at least one mutation, 0 otherwise.
 */
oncogrid.prototype.mutationGeneScore = function(donor, gene) {
  var _self = this;

  var retVal = 0;
  for (var i = 0; i < _self.observations.length; i++) {
    var obs = _self.observations[i];
    if (obs.gene === gene && obs.gene === gene) {
      retVal++;
    }
  }

  return retVal;
};

/**
 * Computes scores for donor sorting.
 */
oncogrid.prototype.computeScores = function() {
  var _self = this;

  for (var i = 0; i < _self.donors.length; i++) {
    var donor = _self.donors[i];
    donor.score = 0;
    for (var j = 0; j < _self.genes.length; j++) {
      var gene = _self.genes[j];
      donor.score += (_self.mutationScore(donor.donorId, gene.id) * Math.pow(2, _self.genes.length + 1 - j));
    }
  }

};

oncogrid.prototype.computeGeneScores = function() {
  var _self = this;

  for (var i = 0; i < _self.genes.length; i++) {
    var gene = _self.genes[i];
    gene.score = 0;
    for (var j = 0; j < _self.donors.length; j++) {
      var donor = _self.donors[j];
      gene.score += _self.mutationGeneScore(donor.donorId, gene.id);
    }
  }
};

/**
 * Comparator for scores
 */
oncogrid.prototype.sortScore = function(a, b) {
  if (a.score < b.score) {
    return 1;
  } else if (a.score > b.score) {
    return -1;
  } else {
    return 0;
  }
};

/**
 * Sorts donors by score
 */
oncogrid.prototype.sortByScores = function() {
  var _self = this;

  _self.donors.sort(_self.sortScore);
};

oncogrid.prototype.genesSortbyScores = function() {
  var _self = this;

  _self.genes.sort(_self.sortScore);
};