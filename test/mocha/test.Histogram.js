/*global chai*/
var expect = chai.expect;

var destroyTester = function (grid) {
  var element = grid.mainGrid.element;

  describe('Cleanup ' + element, function () {
    grid.destroy();

    it('should have no more elements on screen', function () {
      expect(d3.select(element).selectAll('.og-maingrid-svg')[0]).is.empty;
    });
  });
};


var emptyTester = function () {
  describe('Empty Constructor', function () {

    var donors = [{"id": "DO1", "age": 49}, {"id": "DO2", "age": 62}, {"id": "DO3", "age": 59}];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764"},
      {"id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510"},
      {"id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510"},
      {"id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764"}];

    var params = {
      element: '#test5',
      donors: donors,
      genes: genes,
      observations: observations,
      height: 450,
      width: 700
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('Main Grid should have correct dimensions', function () {
      // Width and Height are computer based on input dimensions and margins
      expect(d3.select(element).select('.og-maingrid-svg').attr('width')).to.be.equal('100%');
    });

    it('Two Histograms Present', function() {
      expect(d3.select(element).selectAll('.og-histogram').size()).to.be.equal(2);
    });

  });
};

var simpleTester = function () {
  describe('With Data but Unmatched', function () {

    var donors = [{"id": "DO27811", "age": 49}, {"id": "DO27853", "age": 62}, {
      "id": "DO27827",
      "age": 59
    }];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU47148354", "donorId": "DO7328", "geneId": "ENSG00000257923"},
      {"id": "MU47203364", "donorId": "DO7328", "geneId": "ENSG00000134982"},
      {"id": "MU47148354", "donorId": "DO7328", "geneId": "ENSG00000257923"},
      {"id": "MU47203364", "donorId": "DO7328", "geneId": "ENSG00000134982"}];

    var params = {
      element: '#test6',
      donors: donors,
      genes: genes,
      observations: observations
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('should have two histograms present', function() {
      expect(d3.select(element).selectAll('.og-histogram').size()).to.be.equal(2);
    });

    it('should have a total of 5 rect elements between the two histograms', function() {
      expect(d3.select(element).selectAll('.og-histogram').selectAll('rect').size()).to.be.equal(5);
    });

  });
};

var dataAndConfig = function () {
  describe('With Matching Data and Basic Config', function () {

    var donors = [{"id": "DO1", "age": 49}, {"id": "DO2", "age": 62}, {"id": "DO3", "age": 59}];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764"},
      {"id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510"},
      {"id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510"},
      {"id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764"}];

    var params = {
      element: '#test7',
      donors: donors,
      genes: genes,
      observations: observations,
      height: 450,
      width: 700
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('should have two histograms present', function() {
      expect(d3.select(element).selectAll('.og-histogram').size()).to.be.equal(2);
    });

    it('should have a total of 5 rect elements between the two histograms', function() {
      expect(d3.select(element).selectAll('.og-histogram').selectAll('rect').size()).to.be.equal(5);
    });

    it('Donor Histogram bucket for DO1 should be maximum height.', function() {
      expect(d3.select(element).selectAll('.og-histogram').select('.og-DO1-bar').attr('height')).to.be.equal('80');
    });

    it('Donor Histogram bucket for DO3 should be half of maximum.', function() {
      expect(d3.select(element).selectAll('.og-histogram').select('.og-DO3-bar').attr('height')).to.be.equal('40');
    });

    it('Gene Histogram bucket for ENSG00000141510 should be half of maximum.', function() {
      expect(d3.select(element).selectAll('.og-histogram').select('.og-ENSG00000141510-bar').attr('height')).to.be.equal('80');
    });

    it('Gene Histogram bucket for ENSG00000157764 should be half of maximum.', function() {
      expect(d3.select(element).selectAll('.og-histogram').select('.og-ENSG00000157764-bar').attr('height')).to.be.equal('80');
    });


  });
};

describe('Histograms', function () {
  emptyTester();
  simpleTester();
  dataAndConfig();
});
